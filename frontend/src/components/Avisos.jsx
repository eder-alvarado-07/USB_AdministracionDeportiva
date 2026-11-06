// Campanita de avisos de la cabecera (v1.6): convocatorias y cambios, para cualquier rol.
// Revisa si hay avisos nuevos al cambiar de pantalla y cada minuto.
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Modal from './Modal'
import api from '../services/api'
import { EstadoVacio, EstadoError, Esqueleto } from './EstadoVista'

const hace = (fecha) => {
  const min = Math.round((Date.now() - new Date(fecha).getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

// Ícono de cada tipo de aviso
const ICONOS = { convocatoria: 'fa-clipboard-list', comunicado: 'fa-bullhorn', recordatorio: 'fa-clock' }

export default function Avisos() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [abierto, setAbierto] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const cargar = useCallback(() => {
    api.get('/notificaciones').then(r => { setDatos(r.data); setError('') }).catch(e => setError(e.message))
  }, [])
  useEffect(() => { cargar() }, [cargar, location.pathname])
  useEffect(() => { const t = setInterval(cargar, 60000); return () => clearInterval(t) }, [cargar])

  const sinLeer = datos?.sin_leer || 0
  const abrirAviso = async (a) => {
    if (!a.leida) await api.patch(`/notificaciones/${a.id}/leida`).catch(() => {})
    setAbierto(false)
    cargar()
    if (a.enlace) navigate(a.enlace)
  }
  const leerTodo = async () => { await api.patch('/notificaciones/leidas').catch(() => {}); cargar() }

  return (
    <>
      <button type="button" className="cabecera-avisos" onClick={() => { setAbierto(true); cargar() }}
        aria-label={sinLeer ? `Avisos: ${sinLeer} sin leer` : 'Avisos'} title="Avisos">
        <i className="fa-solid fa-bell" aria-hidden="true"></i>
        {sinLeer > 0 && <span className="cabecera-avisos-numero" aria-hidden="true">{sinLeer > 9 ? '9+' : sinLeer}</span>}
      </button>
      {abierto && (
        <Modal title="Avisos" onClose={() => setAbierto(false)}
          footer={sinLeer > 0 ? <button type="button" className="btn btn-secondary" onClick={leerTodo}>Marcar todo como leído</button> : null}>
          {error ? <EstadoError compacto mensaje={error} onReintentar={cargar} />
            : !datos ? <Esqueleto tipo="panel" filas={4} etiqueta="Cargando avisos…" />
            : datos.avisos.length === 0 ? <EstadoVacio compacto icono="fa-bell" titulo="No tienes avisos" descripcion="Aquí llegan las convocatorias, los avisos del entrenador y los recordatorios." />
            : (
              <ul className="avisos-lista">
                {datos.avisos.map(a => (
                  <li key={a.id}>
                    <button type="button" className={a.leida ? '' : 'sin-leer'} onClick={() => abrirAviso(a)}>
                      <i className={`fa-solid ${ICONOS[a.tipo] || 'fa-bell'} avisos-icono`} aria-hidden="true"></i>
                      <span className="avisos-titulo">{a.titulo}</span>
                      <span className="avisos-mensaje">{a.mensaje}</span>
                      <span className="avisos-hora">{hace(a.created_at)}{!a.leida && <span className="avisos-nuevo">· Nuevo</span>}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </Modal>
      )}
    </>
  )
}
