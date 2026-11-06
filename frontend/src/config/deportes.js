// Perfil de cada deporte (v2.0): ícono, color, posiciones y cómo se registra el resultado de una competencia.
// Se reconoce el deporte por su nombre (sin tildes ni mayúsculas), así funciona con los deportes que cree el
// administrador. Un deporte que no esté aquí usa el perfil GENERICO.

const quitarTildes = (t = '') => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// formato del resultado:
//   marcador → "2 - 1" (goles, puntos, tries…)   sets → "3 - 1" en sets
//   tiempo   → marca de tiempo y puesto          marca → distancia/altura y puesto
export const PERFILES = {
  futbol: {
    nombre: 'Fútbol', icono: 'fa-futbol', color: '#16A34A', formato: 'marcador', unidad: 'goles', evento: 'Partido',
    posiciones: ['Portero', 'Defensa central', 'Lateral derecho', 'Lateral izquierdo', 'Mediocampista defensivo',
      'Mediocampista central', 'Mediocampista ofensivo', 'Extremo derecho', 'Extremo izquierdo', 'Delantero centro'],
  },
  futsal: {
    nombre: 'Fútbol sala', icono: 'fa-futbol', color: '#0EA5E9', formato: 'marcador', unidad: 'goles', evento: 'Partido',
    posiciones: ['Portero', 'Cierre', 'Ala derecha', 'Ala izquierda', 'Pívot', 'Universal'],
  },
  rugby: {
    nombre: 'Rugby', icono: 'fa-football', color: '#B45309', formato: 'marcador', unidad: 'puntos', evento: 'Partido',
    posiciones: ['Pilar izquierdo', 'Hooker', 'Pilar derecho', 'Segunda línea', 'Ala', 'Octavo', 'Medio scrum',
      'Apertura', 'Centro', 'Wing', 'Fullback'],
  },
  baloncesto: {
    nombre: 'Baloncesto', icono: 'fa-basketball', color: '#EA580C', formato: 'marcador', unidad: 'puntos', evento: 'Partido',
    posiciones: ['Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot'],
  },
  voleibol: {
    nombre: 'Voleibol', icono: 'fa-volleyball', color: '#7C3AED', formato: 'sets', unidad: 'sets', evento: 'Partido',
    posiciones: ['Armador', 'Opuesto', 'Punta receptor', 'Central', 'Líbero'],
  },
  natacion: {
    nombre: 'Natación', icono: 'fa-person-swimming', color: '#0284C7', formato: 'tiempo', unidad: 'tiempo', evento: 'Competencia',
    posiciones: ['Libre', 'Espalda', 'Pecho', 'Mariposa', 'Combinado (estilos)', 'Fondo', 'Velocista', 'Relevos'],
  },
  atletismo: {
    nombre: 'Atletismo', icono: 'fa-person-running', color: '#DC2626', formato: 'tiempo', unidad: 'tiempo / marca', evento: 'Competencia',
    posiciones: ['Velocidad (100–400 m)', 'Medio fondo (800–1500 m)', 'Fondo (5000 m+)', 'Vallas', 'Relevos',
      'Salto largo', 'Salto triple', 'Salto alto', 'Salto con garrocha', 'Lanzamiento de bala', 'Lanzamiento de disco',
      'Lanzamiento de jabalina', 'Marcha', 'Pruebas combinadas'],
  },
  tenis: {
    nombre: 'Tenis', icono: 'fa-table-tennis-paddle-ball', color: '#65A30D', formato: 'sets', unidad: 'sets', evento: 'Partido',
    posiciones: ['Singles', 'Dobles', 'Singles y dobles'],
  },
  ajedrez: {
    nombre: 'Ajedrez', icono: 'fa-chess-knight', color: '#334155', formato: 'marcador', unidad: 'puntos', evento: 'Torneo',
    posiciones: ['Tablero 1', 'Tablero 2', 'Tablero 3', 'Tablero 4', 'Suplente'],
  },
  beisbol: {
    nombre: 'Béisbol', icono: 'fa-baseball-bat-ball', color: '#9F1239', formato: 'marcador', unidad: 'carreras', evento: 'Partido',
    posiciones: ['Lanzador (pitcher)', 'Receptor (catcher)', 'Primera base', 'Segunda base', 'Tercera base', 'Campocorto',
      'Jardinero izquierdo', 'Jardinero central', 'Jardinero derecho', 'Bateador designado'],
  },
  softbol: {
    nombre: 'Sóftbol', icono: 'fa-baseball', color: '#BE185D', formato: 'marcador', unidad: 'carreras', evento: 'Partido',
    posiciones: ['Lanzador', 'Receptor', 'Primera base', 'Segunda base', 'Tercera base', 'Campocorto', 'Jardinero'],
  },
  balonmano: {
    nombre: 'Balonmano', icono: 'fa-hands-holding-circle', color: '#0F766E', formato: 'marcador', unidad: 'goles', evento: 'Partido',
    posiciones: ['Portero', 'Central', 'Lateral izquierdo', 'Lateral derecho', 'Extremo izquierdo', 'Extremo derecho', 'Pivote'],
  },
  hockey: {
    nombre: 'Hockey', icono: 'fa-hockey-puck', color: '#1E3A8A', formato: 'marcador', unidad: 'goles', evento: 'Partido',
    posiciones: ['Arquero', 'Defensor', 'Volante', 'Delantero'],
  },
}

export const GENERICO = {
  nombre: 'Deporte', icono: 'fa-medal', color: '#0B8A3E', formato: 'marcador', unidad: 'puntos', evento: 'Partido', posiciones: [],
}

const ALIAS = { 'futbol sala': 'futsal', 'microfutbol': 'futsal', 'basquetbol': 'baloncesto', 'basketball': 'baloncesto',
  'voleibol de playa': 'voleibol', 'tenis de mesa': 'tenis', 'ping pong': 'tenis',
  baseball: 'beisbol', softball: 'softbol', handball: 'balonmano', voley: 'voleibol' }

// Perfil a partir del nombre del deporte ("Natación", "natacion", "Fútbol sala"…)
export function perfilDeporte(nombre) {
  if (!nombre) return GENERICO
  const clave = quitarTildes(nombre)
  if (PERFILES[clave]) return PERFILES[clave]
  if (ALIAS[clave]) return PERFILES[ALIAS[clave]]
  const parcial = Object.keys(PERFILES).find(k => clave.includes(k))
  return parcial ? PERFILES[parcial] : { ...GENERICO, nombre }
}

// Tipos de evento según el deporte: en natación y atletismo no hay "liga/amistoso" sino competencias y torneos
export function tiposEvento(perfil) {
  if (['tiempo', 'marca'].includes(perfil.formato)) {
    return [{ valor: 'competencia', texto: 'Competencia' }, { valor: 'torneo', texto: 'Torneo / campeonato' }, { valor: 'amistoso', texto: 'Control / amistoso' }]
  }
  return [{ valor: 'liga', texto: 'Liga' }, { valor: 'torneo', texto: 'Torneo' }, { valor: 'amistoso', texto: 'Amistoso' }]
}

export const TEXTO_TIPO = { liga: 'Liga', amistoso: 'Amistoso', torneo: 'Torneo', competencia: 'Competencia' }

// ── Resultado ──────────────────────────────────────────────
// Se guarda como texto legible: "2-1" (marcador/sets) o "1:02.35 · 2.º puesto" (tiempo/marca).
export function leerResultado(texto, perfil) {
  const vacio = { propio: '', rival: '', marca: '', puesto: '' }
  if (!texto) return vacio
  if (['marcador', 'sets'].includes(perfil.formato)) {
    const m = String(texto).match(/^\s*(\d+)\s*[-–:]\s*(\d+)/)
    return m ? { ...vacio, propio: m[1], rival: m[2] } : vacio
  }
  const [marca = '', resto = ''] = String(texto).split('·').map(s => s.trim())
  const p = resto.match(/(\d+)/)
  return { ...vacio, marca, puesto: p ? p[1] : '' }
}

export function escribirResultado(r, perfil) {
  if (['marcador', 'sets'].includes(perfil.formato)) {
    return r.propio !== '' && r.rival !== '' ? `${Number(r.propio)}-${Number(r.rival)}` : ''
  }
  const partes = [r.marca?.trim(), r.puesto ? `${Number(r.puesto)}.º puesto` : ''].filter(Boolean)
  return partes.join(' · ')
}

// Victoria, empate o derrota (solo para marcador y sets)
export function desenlace(texto, perfil) {
  if (!['marcador', 'sets'].includes(perfil.formato)) {
    const { puesto } = leerResultado(texto, perfil)
    if (!puesto) return null
    return Number(puesto) <= 3 ? 'podio' : 'participacion'
  }
  const { propio, rival } = leerResultado(texto, perfil)
  if (propio === '' || rival === '') return null
  return Number(propio) > Number(rival) ? 'victoria' : Number(propio) < Number(rival) ? 'derrota' : 'empate'
}

export const TEXTO_DESENLACE = {
  victoria: { texto: 'Victoria', clase: 'badge-green' },
  derrota: { texto: 'Derrota', clase: 'badge-red' },
  empate: { texto: 'Empate', clase: 'badge-blue' },
  podio: { texto: 'Podio', clase: 'badge-orange' },
  participacion: { texto: 'Participación', clase: 'badge-blue' },
}

// Ayuda del campo de marca según el deporte
export function ayudaMarca(perfil) {
  if (perfil.formato === 'marca') return 'Ej. 6,45 m'
  if (perfil.nombre === 'Atletismo') return 'Ej. 10.85 s, 4:05.3 o 6,45 m'
  return 'Ej. 1:02.35 (min:seg.cent)'
}
