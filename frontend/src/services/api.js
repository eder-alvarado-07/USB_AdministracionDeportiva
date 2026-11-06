import axios from 'axios'

// En desarrollo: /api (proxy de Vite → localhost:3001)
// En producción: /_/backend/api (ruta de Vercel hacia el backend)
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Adjunta el token en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Manejo de errores + refresco automático de token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    // Un 401 del propio login significa credenciales incorrectas: no se intenta refrescar
    const esLogin = original?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !original._retry && !esLogin) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('access_token',  data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    // Sin respuesta (servidor apagado, sin internet o tiempo agotado): mensaje claro en español
    const msg = error.response?.data?.error
      || (!error.response ? 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' : error.message)
      || 'Error de conexión'
    const err = new Error(msg)
    err.status = error.response?.status
    return Promise.reject(err)
  }
)

export default api
