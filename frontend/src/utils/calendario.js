// Agregar entrenamientos y partidos al calendario del celular o del computador (v1.7).
// evento = { id, titulo, fecha: 'AAAA-MM-DD', hora: 'HH:MM' | null, minutos, lugar, descripcion }
// Sin hora se agrega como evento de todo el día. La hora se guarda como hora local (Colombia).

const dos = (n) => String(n).padStart(2, '0')
const compacta = (fecha) => fecha.replaceAll('-', '')

function inicioYFin(e) {
  if (!e.hora) {
    const [a, m, d] = e.fecha.split('-').map(Number)
    const sig = new Date(a, m - 1, d + 1)
    return { todoElDia: true, inicio: compacta(e.fecha), fin: `${sig.getFullYear()}${dos(sig.getMonth() + 1)}${dos(sig.getDate())}` }
  }
  const [a, m, d] = e.fecha.split('-').map(Number)
  const [h, mi] = e.hora.split(':').map(Number)
  const ini = new Date(a, m - 1, d, h, mi)
  const fin = new Date(ini.getTime() + (e.minutos || 90) * 60000)
  const f = (x) => `${x.getFullYear()}${dos(x.getMonth() + 1)}${dos(x.getDate())}T${dos(x.getHours())}${dos(x.getMinutes())}00`
  return { todoElDia: false, inicio: f(ini), fin: f(fin) }
}

// Texto seguro para iCalendar (comas, punto y coma, saltos de línea)
const ics = (t = '') => String(t).replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n')

export function textoICS(e) {
  const { todoElDia, inicio, fin } = inicioYFin(e)
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const fechaProp = (nombre, valor) => todoElDia ? `${nombre};VALUE=DATE:${valor}` : `${nombre};TZID=America/Bogota:${valor}`
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Unisimon//Administracion Deportiva//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id || inicio}-${compacta(e.fecha)}@administracion-deportiva.unisimon`,
    `DTSTAMP:${ahora}`,
    fechaProp('DTSTART', inicio),
    fechaProp('DTEND', fin),
    `SUMMARY:${ics(e.titulo)}`,
    e.lugar ? `LOCATION:${ics(e.lugar)}` : null,
    e.descripcion ? `DESCRIPTION:${ics(e.descripcion)}` : null,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${ics(e.titulo)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

// Descarga el .ics: el celular o el computador ofrece agregarlo a su calendario (iPhone, Outlook, Android)
export function descargarICS(e) {
  const blob = new Blob([textoICS(e)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${e.titulo.replace(/[^\p{L}\p{N} ]/gu, '').trim().replace(/\s+/g, '-').toLowerCase() || 'evento'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// Enlace para agregarlo directamente en Google Calendar
export function enlaceGoogle(e) {
  const { inicio, fin } = inicioYFin(e)
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.titulo, dates: `${inicio}/${fin}`, ctz: 'America/Bogota' })
  if (e.lugar) p.set('location', e.lugar)
  if (e.descripcion) p.set('details', e.descripcion)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}
