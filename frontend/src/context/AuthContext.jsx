import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

// Cuentas de demostración para desarrollo local únicamente.
// No se usan en producción y no sustituyen la autenticación real del backend.
const DEMO_USERS = [
  { id: 9001, nombre: 'Administrador Demo', email: 'admin@dtdeportivo.com', password: 'Admin123!', rol: 'administrador', jugador_id: null },
  { id: 9002, nombre: 'Head Coach Demo', email: 'headcoach@dtdeportivo.com', password: 'HeadCoach123!', rol: 'head_coach', jugador_id: null },
  { id: 9003, nombre: 'Entrenador Demo', email: 'entrenador@dtdeportivo.com', password: 'Coach123!', rol: 'entrenador', jugador_id: null },
  { id: 9004, nombre: 'Personal de Salud Demo', email: 'salud@dtdeportivo.com', password: 'Salud123!', rol: 'personal_salud', jugador_id: null },
  { id: 9005, nombre: 'Deportista Demo', email: 'jugador@dtdeportivo.com', password: 'Jugador123!', rol: 'jugador', jugador_id: 1 },
]

const isDemoToken = () => localStorage.getItem('access_token')?.startsWith('demo:')

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUsuario(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { setCargando(false); return }

    if (isDemoToken() && import.meta.env.DEV) {
      const demoId = Number(localStorage.getItem('access_token').split(':')[1])
      setUsuario(DEMO_USERS.find(u => u.id === demoId) || null)
      setCargando(false)
      return
    }

    api.get('/auth/me')
      .then(r => setUsuario(r.data))
      .catch(() => logout())
      .finally(() => setCargando(false))
  }, [logout])

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      setUsuario(data.usuario)
      return data.usuario
    } catch (error) {
      // Fallback exclusivo de Vite en desarrollo, para poder revisar cada rol
      // solo cuando el backend no responde (sin respuesta o error 5xx).
      // Un 401 (credenciales inválidas) nunca abre una sesión demo.
      const backendCaido = !error.status || error.status >= 500
      if (import.meta.env.DEV && backendCaido) {
        const term = String(email || '').trim().toLowerCase()
        const demoUser = DEMO_USERS.find(u =>
          (u.email.toLowerCase() === term || u.email.split('@')[0] === term) && u.password === password
        )
        if (demoUser) {
          const usuarioDemo = { id: demoUser.id, nombre: demoUser.nombre, email: demoUser.email, rol: demoUser.rol, jugador_id: demoUser.jugador_id, modo_demo: true }
          localStorage.setItem('access_token', `demo:${demoUser.id}`)
          localStorage.removeItem('refresh_token')
          setUsuario(usuarioDemo)
          return usuarioDemo
        }
      }
      throw error
    }
  }

  const tienePermiso = (rolesPermitidos) => {
    if (!usuario) return false
    if (usuario.rol === 'administrador') return true
    return rolesPermitidos.includes(usuario.rol)
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, tienePermiso }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
