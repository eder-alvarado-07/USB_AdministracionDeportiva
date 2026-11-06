// Fechas en español a partir de 'YYYY-MM-DD' (o ISO), sin desfases por zona horaria.
// v2.0 (DEF-040): todas las pantallas usan estas funciones. `new Date('2026-10-12')` se interpreta como
// medianoche UTC y en Colombia (UTC-5) se mostraba el 11 de octubre.

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function aFecha(valor) {
  if (!valor) return null
  if (valor instanceof Date) return valor
  const [a, m, d] = String(valor).slice(0, 10).split('-').map(Number)
  if (!a || !m || !d) return null
  return new Date(a, m - 1, d)
}

// 'YYYY-MM-DD' de hoy en la hora local (no en UTC)
export function hoyISO() {
  const f = new Date()
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

// "domingo 11 de octubre"
export function fechaLarga(valor) {
  const f = aFecha(valor)
  return f ? `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}` : ''
}

// "11 de octubre"
export function fechaCorta(valor) {
  const f = aFecha(valor)
  return f ? `${f.getDate()} de ${MESES[f.getMonth()]}` : ''
}

// "12 oct 2026"
export function fechaTabla(valor) {
  const f = aFecha(valor)
  return f ? `${String(f.getDate()).padStart(2, '0')} ${MESES_CORTOS[f.getMonth()]} ${f.getFullYear()}` : '—'
}

// "lun, 12 oct 2026"
export function fechaConDia(valor) {
  const f = aFecha(valor)
  return f ? `${DIAS_CORTOS[f.getDay()]}, ${fechaTabla(f)}` : '—'
}

export function mesCorto(valor) {
  const f = aFecha(valor)
  return f ? MESES_CORTOS[f.getMonth()] : ''
}

export function diaCorto(valor) {
  const f = aFecha(valor)
  return f ? DIAS_CORTOS[f.getDay()] : ''
}

export function numeroDia(valor) {
  const f = aFecha(valor)
  return f ? f.getDate() : ''
}

// Edad cumplida a partir de la fecha de nacimiento
export function edadDesde(valor) {
  const f = aFecha(valor)
  if (!f) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - f.getFullYear()
  if (hoy.getMonth() < f.getMonth() || (hoy.getMonth() === f.getMonth() && hoy.getDate() < f.getDate())) edad--
  return edad
}

// "hoy", "mañana" o "domingo 11 de octubre"
export function fechaRelativa(valor) {
  const f = aFecha(valor)
  if (!f) return ''
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const dias = Math.round((f - hoy) / 86400000)
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  return fechaLarga(f)
}

// Días que faltan (negativo si ya pasó)
export function diasHasta(valor) {
  const f = aFecha(valor)
  if (!f) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return Math.round((f - hoy) / 86400000)
}

export function capitalizar(texto = '') {
  return texto ? texto[0].toUpperCase() + texto.slice(1) : ''
}
