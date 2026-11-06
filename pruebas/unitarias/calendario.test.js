// Archivo de calendario (.ics) y enlace de Google Calendar para entrenamientos y partidos (v1.7, RF-10)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const RAIZ = path.resolve(__dirname, '..', '..');
const cargar = () => import(pathToFileURL(path.join(RAIZ, 'frontend/src/utils/calendario.js')).href);

test('CP-UNI-015 [RF-10] El .ics lleva hora local de Colombia, duración, lugar y recordatorio', async () => {
  const { textoICS } = await cargar();
  const t = textoICS({ id: 'e-1', titulo: 'Táctica: salidas, line-out', fecha: '2026-10-14', hora: '17:30', minutos: 90, lugar: 'Cancha sintética' });
  assert.match(t, /DTSTART;TZID=America\/Bogota:20261014T173000/);
  assert.match(t, /DTEND;TZID=America\/Bogota:20261014T190000/);
  assert.ok(t.includes('SUMMARY:Táctica: salidas' + String.fromCharCode(92) + ', line-out'), 'las comas se escapan con barra invertida');
  assert.match(t, /LOCATION:Cancha sintética/);
  assert.match(t, /TRIGGER:-PT2H/, 'recordatorio 2 horas antes');
  assert.ok(t.includes('\r\n'), 'saltos de línea del estándar iCalendar');
});

test('CP-UNI-016 [RF-10] Sin hora es un evento de todo el día; Google Calendar recibe las mismas fechas', async () => {
  const { textoICS, enlaceGoogle } = await cargar();
  const t = textoICS({ titulo: 'Partido', fecha: '2026-12-31' });
  assert.match(t, /DTSTART;VALUE=DATE:20261231/);
  assert.match(t, /DTEND;VALUE=DATE:20270101/, 'termina al día siguiente, aunque cambie de año');
  const g = new URL(enlaceGoogle({ titulo: 'Unisimón vs. Deportivo Sur', fecha: '2026-10-11', hora: '15:00', minutos: 150, lugar: 'Estadio' }));
  assert.equal(g.searchParams.get('dates'), '20261011T150000/20261011T173000');
  assert.equal(g.searchParams.get('ctz'), 'America/Bogota');
  assert.equal(g.searchParams.get('location'), 'Estadio');
});
