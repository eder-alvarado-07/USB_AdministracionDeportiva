// Métricas propias de cada deporte (v2.1). Fuente única: el servidor valida con ellas lo que se guarda y la
// pantalla de Estadísticas las pide en GET /api/estadisticas/metricas para dibujar formularios, tablas y totales.
//
// Cada deporte define:
//   metricas  → lo que se registra por partido o competencia (enteros ≥ 0). `max` es un tope razonable por registro.
//   derivadas → totales calculados como suma ponderada de otras métricas (por ejemplo, puntos de rugby).
//   principal → la métrica que se copia a la columna antigua `goles` (inicio, máximo anotador).
//   asistencia→ la métrica que se copia a la columna antigua `asistencias` (máximo asistidor), si existe.
//   La métrica `minutos` (si existe) se copia a `minutos_jugados`.
// "Partidos jugados" se calcula siempre: es el número de registros del deportista.
// El deporte se reconoce por su nombre sin tildes ni mayúsculas, así funciona con los que cree el administrador.

const m = (clave, etiqueta, corto, max = 999) => ({ clave, etiqueta, corto, max });

const PERFILES = {
  futbol: {
    nombre: 'Fútbol', principal: 'goles', asistencia: 'asistencias',
    metricas: [m('goles', 'Goles', 'G', 30), m('asistencias', 'Asistencias', 'A', 30),
      m('tarjetas_amarillas', 'Tarjetas amarillas', 'TA', 2), m('tarjetas_rojas', 'Tarjetas rojas', 'TR', 1),
      m('minutos', 'Minutos jugados', 'Min', 600)],
  },
  futsal: {
    nombre: 'Fútbol sala', principal: 'goles', asistencia: 'asistencias',
    metricas: [m('goles', 'Goles', 'G', 40), m('asistencias', 'Asistencias', 'A', 40),
      m('tarjetas_amarillas', 'Tarjetas amarillas', 'TA', 2), m('tarjetas_rojas', 'Tarjetas rojas', 'TR', 1),
      m('minutos', 'Minutos jugados', 'Min', 600)],
  },
  baloncesto: {
    nombre: 'Baloncesto', principal: 'puntos', asistencia: 'asistencias',
    metricas: [m('puntos', 'Puntos', 'PTS', 150), m('rebotes', 'Rebotes', 'REB', 60), m('asistencias', 'Asistencias', 'AST', 50),
      m('robos', 'Robos', 'ROB', 30), m('faltas', 'Faltas personales', 'FP', 6), m('minutos', 'Minutos jugados', 'Min', 600)],
  },
  rugby: {
    nombre: 'Rugby', principal: 'tries', asistencia: 'pases_try',
    metricas: [m('tries', 'Tries', 'T', 20), m('conversiones', 'Conversiones', 'C', 30), m('penales', 'Penales convertidos', 'P', 20),
      m('drops', 'Drops', 'D', 10), m('pases_try', 'Pases de try', 'PT', 20), m('tackles', 'Tackles', 'TK', 60),
      m('minutos', 'Minutos jugados', 'Min', 600)],
    derivadas: [{ clave: 'puntos', etiqueta: 'Puntos', corto: 'PTS', pesos: { tries: 5, conversiones: 2, penales: 3, drops: 3 } }],
  },
  voleibol: {
    nombre: 'Voleibol', principal: 'puntos',
    metricas: [m('puntos', 'Puntos', 'PTS', 60), m('aces', 'Saques directos (aces)', 'ACE', 30), m('bloqueos', 'Bloqueos', 'BLQ', 30),
      m('recepciones', 'Recepciones', 'REC', 100), m('errores_saque', 'Errores de saque', 'ES', 30), m('sets', 'Sets jugados', 'SJ', 5)],
  },
  beisbol: {
    nombre: 'Béisbol', principal: 'carreras', asistencia: 'impulsadas',
    metricas: [m('carreras', 'Carreras anotadas', 'C', 20), m('hits', 'Hits', 'H', 20), m('impulsadas', 'Carreras impulsadas', 'CI', 20),
      m('jonrones', 'Jonrones', 'HR', 10), m('ponches', 'Ponches', 'K', 30), m('bases_por_bolas', 'Bases por bolas', 'BB', 20)],
  },
  softbol: {
    nombre: 'Sóftbol', principal: 'carreras', asistencia: 'impulsadas',
    metricas: [m('carreras', 'Carreras anotadas', 'C', 20), m('hits', 'Hits', 'H', 20), m('impulsadas', 'Carreras impulsadas', 'CI', 20),
      m('jonrones', 'Jonrones', 'HR', 10), m('ponches', 'Ponches', 'K', 30)],
  },
  natacion: {
    nombre: 'Natación', principal: 'oro',
    metricas: [m('pruebas', 'Pruebas nadadas', 'PR', 20), m('oro', 'Medallas de oro', 'ORO', 20), m('plata', 'Medallas de plata', 'PLA', 20),
      m('bronce', 'Medallas de bronce', 'BRO', 20), m('finales', 'Finales alcanzadas', 'FIN', 20), m('marcas_personales', 'Mejores marcas personales', 'MMP', 20)],
    derivadas: [{ clave: 'medallas', etiqueta: 'Medallas', corto: 'MED', pesos: { oro: 1, plata: 1, bronce: 1 } }],
  },
  atletismo: {
    nombre: 'Atletismo', principal: 'oro',
    metricas: [m('pruebas', 'Pruebas disputadas', 'PR', 20), m('oro', 'Medallas de oro', 'ORO', 20), m('plata', 'Medallas de plata', 'PLA', 20),
      m('bronce', 'Medallas de bronce', 'BRO', 20), m('finales', 'Finales alcanzadas', 'FIN', 20), m('marcas_personales', 'Mejores marcas personales', 'MMP', 20)],
    derivadas: [{ clave: 'medallas', etiqueta: 'Medallas', corto: 'MED', pesos: { oro: 1, plata: 1, bronce: 1 } }],
  },
  tenis: {
    nombre: 'Tenis', principal: 'sets_ganados',
    metricas: [m('partidos_ganados', 'Partidos ganados', 'PG', 10), m('sets_ganados', 'Sets ganados', 'SG', 15), m('juegos_ganados', 'Juegos ganados', 'JG', 100),
      m('aces', 'Aces', 'ACE', 50), m('dobles_faltas', 'Dobles faltas', 'DF', 50)],
  },
  ajedrez: {
    nombre: 'Ajedrez', principal: 'victorias',
    metricas: [m('victorias', 'Victorias', 'V', 20), m('tablas', 'Tablas', 'T', 20), m('derrotas', 'Derrotas', 'D', 20)],
  },
  balonmano: {
    nombre: 'Balonmano', principal: 'goles', asistencia: 'asistencias',
    metricas: [m('goles', 'Goles', 'G', 30), m('asistencias', 'Asistencias', 'A', 30), m('paradas', 'Paradas (porteros)', 'PAR', 60),
      m('exclusiones', 'Exclusiones de 2 min', 'EXC', 3), m('minutos', 'Minutos jugados', 'Min', 600)],
  },
  hockey: {
    nombre: 'Hockey', principal: 'goles', asistencia: 'asistencias',
    metricas: [m('goles', 'Goles', 'G', 20), m('asistencias', 'Asistencias', 'A', 20), m('tarjetas_verdes', 'Tarjetas verdes', 'TV', 3),
      m('tarjetas_amarillas', 'Tarjetas amarillas', 'TA', 3), m('minutos', 'Minutos jugados', 'Min', 600)],
  },
}

const GENERICO = {
  nombre: 'General', principal: 'puntos', asistencia: 'asistencias',
  metricas: [m('puntos', 'Puntos / anotaciones', 'PTS', 200), m('asistencias', 'Asistencias', 'A', 100), m('minutos', 'Minutos jugados', 'Min', 600)],
}

const ALIAS = {
  'futbol sala': 'futsal', microfutbol: 'futsal', basquetbol: 'baloncesto', basketball: 'baloncesto', basket: 'baloncesto',
  voley: 'voleibol', volleyball: 'voleibol', 'voleibol de playa': 'voleibol', baseball: 'beisbol', softball: 'softbol',
  'tenis de mesa': 'tenis', handball: 'balonmano',
}

const normalizar = (t = '') => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Clave del perfil a partir del nombre del deporte ("Fútbol sala" → futsal, "Natación" → natacion)
function claveDeporte(nombre) {
  const n = normalizar(nombre)
  if (!n) return 'generico'
  if (PERFILES[n]) return n
  if (ALIAS[n]) return ALIAS[n]
  // Primero los nombres más largos ("futbol sala" antes que "futbol")
  const alias = Object.keys(ALIAS).sort((a, b) => b.length - a.length).find(k => n.includes(k))
  if (alias) return ALIAS[alias]
  const parcial = Object.keys(PERFILES).find(k => n.includes(k))
  return parcial || 'generico'
}

function perfilDeporte(nombre) {
  const clave = claveDeporte(nombre)
  const p = PERFILES[clave] || GENERICO
  return { clave, ...p, nombre: clave === 'generico' ? (nombre || GENERICO.nombre) : p.nombre, derivadas: p.derivadas || [] }
}

// Valida y limpia las métricas recibidas: solo las del deporte, enteros entre 0 y su tope
function limpiarMetricas(perfil, entrada = {}) {
  const limpio = {}
  for (const { clave, etiqueta, max } of perfil.metricas) {
    const v = entrada?.[clave]
    if (v === undefined || v === null || v === '') { limpio[clave] = 0; continue }
    const n = Number(v)
    if (!Number.isInteger(n) || n < 0) return { error: `${etiqueta}: debe ser un número entero mayor o igual a 0.` }
    if (n > max) return { error: `${etiqueta}: el valor ${n} supera el máximo razonable por registro (${max}).` }
    limpio[clave] = n
  }
  return { metricas: limpio }
}

// Valores para las columnas antiguas (las usan el inicio y los reconocimientos)
function columnasLegado(perfil, metricas) {
  return {
    goles: metricas[perfil.principal] || 0,
    asistencias: perfil.asistencia ? metricas[perfil.asistencia] || 0 : 0,
    minutos_jugados: metricas.minutos || 0,
  }
}

// Un registro antiguo (solo goles, asistencias y minutos) visto con las métricas de su deporte
function desdeLegado(perfil, fila) {
  const metricas = Object.fromEntries(perfil.metricas.map(x => [x.clave, 0]))
  if (perfil.principal in metricas) metricas[perfil.principal] = Number(fila.goles) || 0
  if (perfil.asistencia && perfil.asistencia in metricas) metricas[perfil.asistencia] = Number(fila.asistencias) || 0
  if ('minutos' in metricas) metricas.minutos = Number(fila.minutos_jugados) || 0
  return metricas
}

module.exports = { PERFILES, GENERICO, claveDeporte, perfilDeporte, limpiarMetricas, columnasLegado, desdeLegado, normalizar }
