// Encabezado de cada módulo (v2.0): antetítulo (deporte o contexto), título en letra de marcador,
// descripción y acciones. El ícono del módulo va de fondo, como el escudo en una camiseta.
export default function EncabezadoPagina({ icono, antetitulo, titulo, descripcion, acciones, children }) {
  return (
    <header className="encabezado">
      {icono && <i className={`fa-solid ${icono} encabezado-fondo`} aria-hidden="true"></i>}
      <div className="encabezado-texto">
        {antetitulo && <p className="encabezado-ante">{antetitulo}</p>}
        <h1>{titulo}</h1>
        {descripcion && <p className="encabezado-desc">{descripcion}</p>}
        {children}
      </div>
      {acciones && <div className="encabezado-acciones">{acciones}</div>}
    </header>
  )
}
