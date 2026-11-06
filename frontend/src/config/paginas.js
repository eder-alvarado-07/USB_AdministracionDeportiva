// Páginas de cada ruta, cargadas por partes (v1.5, DEF-025).
// El inicio va en el paquete principal (es la primera pantalla); los demás módulos se descargan
// al abrirlos, o antes: precargar() se llama cuando el usuario muestra intención de ir a uno
// (pasa el mouse, enfoca o toca la opción del menú), así el cambio de pantalla se siente inmediato.
import { lazy } from 'react'
import Dashboard from '../pages/Dashboard'

const CARGADORES = {
  '/head-coach': () => import('../pages/HeadCoach'),
  '/equipos': () => import('../pages/Equipos'),
  '/jugadores': () => import('../pages/Jugadores'),
  '/entrenamientos': () => import('../pages/Entrenamientos'),
  '/asistencia': () => import('../pages/Asistencia'),
  '/partidos': () => import('../pages/Partidos'),
  '/estadisticas': () => import('../pages/EstadisticasJugador'),
  '/lesiones': () => import('../pages/Lesiones'),
  '/salud': () => import('../pages/Salud'),
  '/evaluaciones': () => import('../pages/Evaluaciones'),
  '/antropometria': () => import('../pages/Antropometria'),
  '/usuarios': () => import('../pages/Usuarios'),
}

// Una sola descarga por módulo; si falla (sin conexión), se puede volver a intentar
const enCurso = {}
function cargar(ruta) {
  if (!enCurso[ruta]) {
    enCurso[ruta] = CARGADORES[ruta]().catch((e) => { delete enCurso[ruta]; throw e })
  }
  return enCurso[ruta]
}

export function precargar(ruta) {
  if (CARGADORES[ruta]) cargar(ruta).catch(() => { /* se reintenta al abrir la página */ })
}

// Props para un enlace del menú: precarga su módulo ante la intención de abrirlo
export const intencion = (ruta) => ({
  onMouseEnter: () => precargar(ruta),
  onFocus: () => precargar(ruta),
  onTouchStart: () => precargar(ruta),
})

export const PAGINAS = {
  '/': Dashboard,
  ...Object.fromEntries(Object.keys(CARGADORES).map(ruta => [ruta, lazy(() => cargar(ruta))])),
}
