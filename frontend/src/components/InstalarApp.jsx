// Sugerencia para instalar la app en el celular (v1.7).
// En Android y en computador el navegador ofrece instalarla (evento beforeinstallprompt) y basta un botón.
// En iPhone no existe ese evento: se explica el paso "Compartir → Agregar a pantalla de inicio".
import { useEffect, useState } from 'react'

const enApp = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const esIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

let pedidoGuardado = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoGuardado = e })
}

export default function InstalarApp() {
  const [pedido, setPedido] = useState(pedidoGuardado)
  const [instalada, setInstalada] = useState(enApp())

  useEffect(() => {
    const guardar = (e) => { e.preventDefault(); pedidoGuardado = e; setPedido(e) }
    const listo = () => { setInstalada(true); setPedido(null) }
    window.addEventListener('beforeinstallprompt', guardar)
    window.addEventListener('appinstalled', listo)
    return () => { window.removeEventListener('beforeinstallprompt', guardar); window.removeEventListener('appinstalled', listo) }
  }, [])

  if (instalada) return null

  if (pedido) {
    const instalar = async () => { pedido.prompt(); await pedido.userChoice.catch(() => {}); pedidoGuardado = null; setPedido(null) }
    return (
      <button type="button" className="btn btn-secondary btn-bloque" onClick={instalar}>
        <i className="fa-solid fa-mobile-screen-button" aria-hidden="true"></i> Instalar la app en este dispositivo
      </button>
    )
  }

  if (esIOS()) {
    return (
      <p className="instalar-ios">
        <i className="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>
        <span>Para tenerla como app en tu iPhone: toca <b>Compartir</b> <i className="fa-solid fa-arrow-up-from-bracket" aria-label="(ícono de compartir)"></i> y elige <b>Agregar a pantalla de inicio</b>.</span>
      </p>
    )
  }
  return null
}

// Registra el trabajador de servicio solo en producción y con HTTPS o localhost (requisito del navegador)
export function registrarTrabajador() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}
