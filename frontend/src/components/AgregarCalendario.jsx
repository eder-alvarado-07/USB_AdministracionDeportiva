// Botón para agregar un entrenamiento o partido al calendario (v1.7). Abre dos opciones:
// archivo .ics (iPhone, Outlook, Android) o Google Calendar.
import { useEffect, useRef, useState } from 'react'
import { descargarICS, enlaceGoogle } from '../utils/calendario'

export default function AgregarCalendario({ evento, compacto = false }) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef(null)
  useEffect(() => {
    if (!abierto) return undefined
    const cerrar = (e) => { if (!caja.current?.contains(e.target)) setAbierto(false) }
    const escape = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('pointerdown', cerrar)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', cerrar); document.removeEventListener('keydown', escape) }
  }, [abierto])

  return (
    <div className="agregar-calendario" ref={caja}>
      <button type="button" className={`btn btn-secondary ${compacto ? 'btn-sm btn-solo-icono' : 'btn-sm'}`} aria-expanded={abierto}
        aria-label={`Agregar al calendario: ${evento.titulo}`} title="Agregar al calendario" onClick={() => setAbierto(v => !v)}>
        <i className="fa-regular fa-calendar-plus" aria-hidden="true"></i>{!compacto && ' Agregar al calendario'}
      </button>
      {abierto && (
        <div className="agregar-calendario-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { descargarICS(evento); setAbierto(false) }}>
            <i className="fa-brands fa-apple" aria-hidden="true"></i> iPhone, Outlook u otro (.ics)
          </button>
          <a role="menuitem" href={enlaceGoogle(evento)} target="_blank" rel="noreferrer" onClick={() => setAbierto(false)}>
            <i className="fa-brands fa-google" aria-hidden="true"></i> Google Calendar
          </a>
        </div>
      )}
    </div>
  )
}
