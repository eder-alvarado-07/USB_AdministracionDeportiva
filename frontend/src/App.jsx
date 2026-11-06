import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DeporteProvider } from './context/DeporteContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/Estructura'
import { MODULOS } from './config/navegacion'
import Login from './pages/Login'
import LimiteCarga from './components/LimiteCarga'
import { PAGINAS } from './config/paginas'

// Cada ruta usa los roles definidos en config/navegacion.js: el menú y el acceso
// a las páginas salen de la misma fuente y no pueden contradecirse.
// Las páginas se cargan por partes (config/paginas.js).

export default function App() {
  return (
    <AuthProvider>
      <DeporteProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          {MODULOS.map(({ ruta, roles }) => {
            const Pagina = PAGINAS[ruta]
            return (
              <Route key={ruta} path={ruta} element={
                <ProtectedRoute roles={roles}>
                  <AppLayout><LimiteCarga key={ruta}><Pagina /></LimiteCarga></AppLayout>
                </ProtectedRoute>
              } />
            )
          })}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DeporteProvider>
    </AuthProvider>
  )
}
