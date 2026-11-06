import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const CUENTAS_DEMO = [
  ['Administrador', 'admin@dtdeportivo.com', 'Admin123!'],
  ['Head coach', 'headcoach@dtdeportivo.com', 'HeadCoach123!'],
  ['Entrenador', 'entrenador@dtdeportivo.com', 'Coach123!'],
  ['Personal de salud', 'salud@dtdeportivo.com', 'Salud123!'],
  ['Deportista', 'jugador@dtdeportivo.com', 'Jugador123!'],
]

export default function Login() {
  const { login, usuario, cargando: cargandoSesion } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [cargando, setCargando] = useState(false)
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState('')

  const cambiar = (campo) => (e) => { setForm(f => ({ ...f, [campo]: e.target.value })); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.password) {
      setError('Escribe tu usuario o correo y tu contraseña.')
      return
    }
    setCargando(true)
    try {
      const usuario = await login(form.email, form.password)
      toast.success(`Bienvenido, ${usuario.nombre}`)
      // replace: el login no queda en el historial, así Atrás no muestra el formulario con la sesión abierta
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.status === 401
        ? 'El usuario o la contraseña no coinciden. Revisa los datos e intenta de nuevo.'
        : err.message || 'No se pudo iniciar sesión. Intenta de nuevo en unos minutos.')
    } finally {
      setCargando(false)
    }
  }


  // Con la sesión abierta, volver al login (por ejemplo con el botón Atrás) lleva directo al inicio
  if (!cargandoSesion && usuario) return <Navigate to="/" replace />
  return (
    <div className="login-escena">
      {/* Portada: la cancha de noche, con los deportes de la universidad */}
      <section className="login-portada" aria-label="Deportes Unisimón">
        <div className="login-cancha" aria-hidden="true">
          <svg viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice">
            <g fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="40" y="40" width="520" height="820" rx="4" />
              <line x1="40" y1="450" x2="560" y2="450" />
              <circle cx="300" cy="450" r="90" />
              <circle cx="300" cy="450" r="4" fill="currentColor" />
              <rect x="160" y="40" width="280" height="140" />
              <rect x="230" y="40" width="140" height="56" />
              <path d="M240 180 A70 70 0 0 0 360 180" />
              <rect x="160" y="720" width="280" height="140" />
              <rect x="230" y="804" width="140" height="56" />
              <path d="M240 720 A70 70 0 0 1 360 720" />
            </g>
          </svg>
        </div>
        <div className="login-portada-in">
          <img className="login-logo" src="/brand/logo-horizontal-blanco.png" alt="Universidad Simón Bolívar" />
          <div className="login-lema">
            <p className="login-ante">Administración Deportiva · Sede Cúcuta</p>
            <h2>Cada entrenamiento <em>cuenta.</em></h2>
            <p>Plantel, asistencia, partidos, salud y rendimiento de los equipos de la universidad, en un solo lugar.</p>
          </div>
          <ul className="login-deportes" aria-label="Deportes">
            {[['fa-futbol', 'Fútbol'], ['fa-football', 'Rugby'], ['fa-basketball', 'Baloncesto'], ['fa-volleyball', 'Voleibol'],
              ['fa-person-swimming', 'Natación'], ['fa-person-running', 'Atletismo']].map(([i, n]) => (
              <li key={n}><i className={`fa-solid ${i}`} aria-hidden="true"></i><span>{n}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <main className="login-panel">
        <div className="login-tarjeta">
          <img className="login-monograma" src="/brand/monograma-u-verde-256.png" alt="" />
          <h1>Entra a la cancha</h1>
          <p className="login-sub">Inicia sesión con tu usuario institucional.</p>

          {error && (
            <div className="alerta alerta-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Usuario o correo</label>
              <div className="login-control">
                <span className="login-icono-izq" aria-hidden="true"><i className="fa-solid fa-user"></i></span>
                <input id="email" type="text" value={form.email} onChange={cambiar('email')}
                  autoComplete="username" autoFocus aria-invalid={error ? 'true' : undefined} placeholder="nombre@dtdeportivo.com" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="login-control">
                <span className="login-icono-izq" aria-hidden="true"><i className="fa-solid fa-lock"></i></span>
                <input id="password" type={verClave ? 'text' : 'password'} value={form.password} onChange={cambiar('password')}
                  autoComplete="current-password" aria-invalid={error ? 'true' : undefined} />
                <button type="button" className="login-icono" onClick={() => setVerClave(v => !v)}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <i className={verClave ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-bloque login-boton" disabled={cargando}>
              {cargando ? 'Iniciando sesión…' : <>Iniciar sesión <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></>}
            </button>
          </form>

          <p className="login-ayuda">¿Olvidaste tu contraseña? Pídele al administrador que la restablezca.</p>

          {import.meta.env.DEV && (
            <details className="login-demo">
              <summary>Accesos de demostración (solo en modo local)</summary>
              <p>Cargan los datos en el formulario. Funcionan sin backend para revisar la interfaz de cada rol.</p>
              <ul>
                {CUENTAS_DEMO.map(([rol, email, password]) => (
                  <li key={rol}>
                    <button type="button" onClick={() => { setForm({ email, password }); setError('') }}>
                      <b>{rol}</b><span>{email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <p className="login-pie">© Universidad Simón Bolívar {new Date().getFullYear()} · Vigilada MinEducación · Uso interno</p>
      </main>
    </div>
  )
}
