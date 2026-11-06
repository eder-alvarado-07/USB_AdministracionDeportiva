// Fuente única de la navegación: pestañas (PC), menú inferior y hoja "Más" (celular).
// `corto` es la etiqueta del menú inferior, donde el espacio es limitado.

export const MODULOS = [
  { ruta: '/',               etiqueta: 'Inicio',            corto: 'Inicio',       icono: 'fa-solid fa-house',
    roles: ['administrador', 'head_coach', 'entrenador', 'personal_salud', 'jugador'] },
  { ruta: '/head-coach',     etiqueta: 'Supervisión',       corto: 'Supervisión',  icono: 'fa-solid fa-binoculars',
    roles: ['head_coach'] },
  { ruta: '/equipos',        etiqueta: 'Equipos',           corto: 'Equipos',      icono: 'fa-solid fa-shield-halved',
    roles: ['administrador', 'head_coach', 'entrenador'] },
  { ruta: '/jugadores',      etiqueta: 'Deportistas',       corto: 'Deportistas',  icono: 'fa-solid fa-users',
    roles: ['administrador', 'head_coach', 'entrenador', 'personal_salud'] },
  { ruta: '/entrenamientos', etiqueta: 'Entrenamientos',    corto: 'Entrenos',     icono: 'fa-solid fa-stopwatch',
    roles: ['administrador', 'head_coach', 'entrenador', 'jugador'] },
  { ruta: '/asistencia',     etiqueta: 'Asistencia',        corto: 'Asistencia',   icono: 'fa-solid fa-clipboard-check',
    roles: ['administrador', 'head_coach', 'entrenador', 'jugador'] },
  { ruta: '/partidos',       etiqueta: 'Partidos',          corto: 'Partidos',     icono: 'fa-solid fa-trophy',
    roles: ['administrador', 'head_coach', 'entrenador', 'jugador'] },
  { ruta: '/estadisticas',   etiqueta: 'Estadísticas',      corto: 'Estadísticas', icono: 'fa-solid fa-chart-column',
    roles: ['administrador', 'head_coach', 'entrenador', 'jugador'],
    etiquetaPorRol: { jugador: 'Mis estadísticas' } },
  { ruta: '/lesiones',       etiqueta: 'Lesiones',          corto: 'Lesiones',     icono: 'fa-solid fa-kit-medical',
    roles: ['administrador', 'head_coach', 'entrenador', 'personal_salud', 'jugador'] },
  { ruta: '/salud',          etiqueta: 'Salud y controles', corto: 'Salud',        icono: 'fa-solid fa-stethoscope',
    roles: ['administrador', 'personal_salud', 'jugador'] },
  { ruta: '/evaluaciones',   etiqueta: 'Evaluaciones',      corto: 'Evaluaciones', icono: 'fa-solid fa-clipboard-list',
    roles: ['administrador', 'head_coach', 'entrenador', 'personal_salud', 'jugador'] },
  { ruta: '/antropometria',  etiqueta: 'Antropometría',     corto: 'Medidas',      icono: 'fa-solid fa-ruler-combined',
    roles: ['administrador', 'personal_salud', 'jugador'] },
  { ruta: '/usuarios',       etiqueta: 'Usuarios',          corto: 'Usuarios',     icono: 'fa-solid fa-user-gear',
    roles: ['administrador'] },
]

// Las 4 secciones del menú inferior para cada rol; el resto va en "Más".
export const MENU_INFERIOR = {
  administrador:  ['/', '/jugadores', '/asistencia', '/lesiones'],
  head_coach:     ['/', '/head-coach', '/jugadores', '/partidos'],
  entrenador:     ['/', '/jugadores', '/entrenamientos', '/asistencia'],
  personal_salud: ['/', '/lesiones', '/salud', '/antropometria'],
  jugador:        ['/', '/entrenamientos', '/salud', '/estadisticas'],
}

export const ROLES = {
  administrador:  'Administrador',
  head_coach:     'Head coach',
  entrenador:     'Entrenador',
  personal_salud: 'Personal de salud',
  jugador:        'Deportista',
}

export function modulosDelRol(rol) {
  return MODULOS
    .filter(m => m.roles.includes(rol))
    .map(m => ({ ...m, etiqueta: m.etiquetaPorRol?.[rol] || m.etiqueta }))
}

export function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '?'
}

// Secciones del menú lateral (v2.0): el juego, el cuidado del deportista y la administración
export const GRUPOS = [
  { titulo: 'Competencia', rutas: ['/', '/head-coach', '/equipos', '/jugadores', '/entrenamientos', '/asistencia', '/partidos', '/estadisticas'] },
  { titulo: 'Salud y rendimiento', rutas: ['/lesiones', '/salud', '/evaluaciones', '/antropometria'] },
  { titulo: 'Gestión', rutas: ['/usuarios'] },
]
