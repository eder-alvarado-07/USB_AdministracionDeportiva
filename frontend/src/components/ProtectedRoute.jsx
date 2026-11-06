import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace />

  if (roles && roles.length > 0 && !roles.includes(usuario.rol) && usuario.rol !== 'administrador') {
    return <Navigate to="/" replace />
  }

  return children
}
