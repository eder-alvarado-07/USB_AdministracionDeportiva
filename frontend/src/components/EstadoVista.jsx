// Estados de una vista (v1.5): cargando, vacío, sin resultados y error.
// Cada pantalla distingue los cuatro casos en este orden:
//   cargando           → <Esqueleto />            (forma del contenido, sin cifras falsas)
//   error              → <EstadoError />          (qué pasó + Reintentar)
//   sin datos          → <EstadoVacio />          (por qué no hay nada + la acción real, si existe)
//   filtro sin datos   → <EstadoSinResultados />  (los datos existen, el filtro no encontró nada)
// Íconos: Font Awesome (nunca emojis). Ver docs/diseno/DESIGN.md, sección Estados.
import { Link } from 'react-router-dom'

const repetir = (n) => Array.from({ length: n }, (_, i) => i)

export function Esqueleto({ tipo = 'tabla', filas = 5, columnas = 4, etiqueta = 'Cargando información…' }) {
  return (
    <div className={`esqueleto esqueleto-${tipo}`} role="status" aria-live="polite">
      <span className="sr-only">{etiqueta}</span>
      {tipo === 'tabla' && (
        <div aria-hidden="true">
          <div className="esqueleto-fila esqueleto-cabecera">
            {repetir(columnas).map(c => <span key={c} className="esqueleto-barra corta" />)}
          </div>
          {repetir(filas).map(f => (
            <div key={f} className="esqueleto-fila">
              {repetir(columnas).map(c => <span key={c} className={`esqueleto-barra ${c === 0 ? 'larga' : ''}`} />)}
            </div>
          ))}
        </div>
      )}
      {tipo === 'tarjetas' && (
        <div className="esqueleto-rejilla" aria-hidden="true">
          {repetir(filas).map(f => (
            <div key={f} className="esqueleto-tarjeta">
              <span className="esqueleto-barra larga" />
              <span className="esqueleto-barra" />
              <span className="esqueleto-barra corta" />
            </div>
          ))}
        </div>
      )}
      {tipo === 'panel' && (
        <div className="esqueleto-panel" aria-hidden="true">
          {repetir(filas).map(f => <span key={f} className={`esqueleto-barra ${f % 3 === 0 ? 'larga' : f % 3 === 1 ? '' : 'corta'}`} />)}
        </div>
      )}
    </div>
  )
}

function Accion({ accion }) {
  if (!accion) return null
  const contenido = <>{accion.icono && <i className={`fa-solid ${accion.icono}`} aria-hidden="true" />}{accion.texto}</>
  const clase = `btn ${accion.secundaria ? 'btn-secondary' : 'btn-primary'}`
  return accion.a
    ? <Link className={clase} to={accion.a}>{contenido}</Link>
    : <button type="button" className={clase} onClick={accion.onClick}>{contenido}</button>
}

export function EstadoVacio({ icono = 'fa-folder-open', titulo, descripcion, accion, accionSecundaria, compacto = false }) {
  return (
    <div className={`estado-vista ${compacto ? 'compacto' : ''}`}>
      <span className="estado-vista-icono" aria-hidden="true"><i className={`fa-solid ${icono}`} /></span>
      <p className="estado-vista-titulo">{titulo}</p>
      {descripcion && <p className="estado-vista-texto">{descripcion}</p>}
      {(accion || accionSecundaria) && (
        <div className="estado-vista-acciones">
          <Accion accion={accion} />
          <Accion accion={accionSecundaria && { ...accionSecundaria, secundaria: true }} />
        </div>
      )}
    </div>
  )
}

export function EstadoSinResultados({ descripcion = 'Prueba con otro texto o quita los filtros para ver todos los registros.', onLimpiar, textoLimpiar = 'Limpiar filtros', compacto = false }) {
  return (
    <EstadoVacio
      icono="fa-filter-circle-xmark"
      titulo="Ningún resultado con estos filtros"
      descripcion={descripcion}
      accion={onLimpiar ? { texto: textoLimpiar, icono: 'fa-xmark', onClick: onLimpiar, secundaria: true } : null}
      compacto={compacto}
    />
  )
}

export function EstadoError({ mensaje, onReintentar, titulo = 'No se pudo cargar la información', compacto = false }) {
  return (
    <div className={`estado-vista estado-error ${compacto ? 'compacto' : ''}`} role="alert">
      <span className="estado-vista-icono" aria-hidden="true"><i className="fa-solid fa-triangle-exclamation" /></span>
      <p className="estado-vista-titulo">{titulo}</p>
      <p className="estado-vista-texto">{mensaje || 'Revisa tu conexión e inténtalo de nuevo.'}</p>
      {onReintentar && (
        <button type="button" className="btn btn-secondary" onClick={onReintentar}>
          <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  )
}
