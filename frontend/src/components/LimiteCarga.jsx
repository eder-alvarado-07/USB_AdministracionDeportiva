// Envuelve cada página cargada por partes (v1.5, fase 3).
// Mientras llega el módulo muestra un esqueleto dentro de la estructura (menú y cabecera no desaparecen);
// si la descarga falla (sin conexión o versión nueva publicada), explica el problema y permite reintentar.
import { Component, Suspense } from 'react'
import { Esqueleto, EstadoError } from './EstadoVista'

class CapturaError extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card">
        <EstadoError
          titulo="No se pudo abrir esta sección"
          mensaje="Revisa tu conexión. Si el problema sigue, recarga la página: puede haber una versión nueva del sistema."
          onReintentar={() => window.location.reload()}
        />
      </div>
    )
  }
}

export default function LimiteCarga({ children }) {
  return (
    <CapturaError>
      <Suspense fallback={<div className="card" style={{ padding: 0 }}><Esqueleto tipo="panel" filas={8} etiqueta="Abriendo la sección…" /></div>}>
        {children}
      </Suspense>
    </CapturaError>
  )
}
