// Dorsal: asignación, unicidad por equipo, cambio rápido y conservación (RF-09)
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, sql } = require('../utilidades/api');

const PRE = 'ZZ dorsal ';
let A, equipo, entrenador;

test.before(async () => {
  await iniciar();
  A = await token('administrador');
  equipo = (await llamar('POST', '/api/equipos', A, { nombre: `${PRE}Equipo` })).datos.id;
  entrenador = (await llamar('POST', '/api/usuarios', A, { nombre: 'ZZ Ent Dorsal', email: 'zz.dorsal@test.com', password: 'Prueba123!', rol: 'entrenador' })).datos.id;
});
test.after(async () => {
  await sql(`DELETE FROM jugadores WHERE nombre LIKE $1`, [PRE + '%']);
  await sql(`DELETE FROM equipos WHERE nombre LIKE $1`, [PRE + '%']);
  await sql(`DELETE FROM usuarios WHERE email = 'zz.dorsal@test.com'`);
  await cerrar(__filename);
});

const crear = (nombre, extra) => llamar('POST', '/api/jugadores', A, { nombre: PRE + nombre, ...extra });

test('CP-DOR-001 [RF-09] Crear un deportista con dorsal', async () => {
  const r = await crear('Uno', { equipo_id: equipo, dorsal: 10, entrenador_id: entrenador });
  assert.equal(r.status, 201);
  assert.equal(r.datos.dorsal, 10);
});

test('CP-DOR-002 [RF-09] Un dorsal repetido en el mismo equipo devuelve 409 con el nombre de quien lo usa', async () => {
  const r = await crear('Dos', { equipo_id: equipo, dorsal: 10 });
  assert.equal(r.status, 409);
  assert.match(r.datos.error, /ZZ dorsal Uno/);
});

test('CP-DOR-003 [RF-09] Sin equipo se puede repetir el número', async () => {
  assert.equal((await crear('Libre', { dorsal: 10 })).status, 201);
});

test('CP-DOR-004 [RF-09] Dorsal fuera de rango devuelve 400', async () => {
  for (const dorsal of [150, -1, 'abc', 7.5]) {
    assert.equal((await crear('Malo', { dorsal })).status, 400, `dorsal ${dorsal}`);
  }
});

test('CP-DOR-005 [RF-09] Cambio rápido: ocupado (409), cambiar y quitar', async () => {
  const j = (await crear('Tres', { equipo_id: equipo, dorsal: 7 })).datos.id;
  assert.equal((await llamar('PATCH', `/api/jugadores/${j}/dorsal`, A, { dorsal: 10 })).status, 409);
  const cambio = await llamar('PATCH', `/api/jugadores/${j}/dorsal`, A, { dorsal: 23 });
  assert.equal(cambio.status, 200);
  assert.equal(cambio.datos.dorsal, 23);
  const quitar = await llamar('PATCH', `/api/jugadores/${j}/dorsal`, A, { dorsal: '' });
  assert.equal(quitar.datos.dorsal, null);
});

test('CP-DOR-006 [RF-09] Quitar el equipo conserva dorsal y entrenador (defecto DEF-002 corregido)', async () => {
  const { rows: [uno] } = await sql(`SELECT id FROM jugadores WHERE nombre = $1`, [PRE + 'Uno']);
  const r = await llamar('PUT', `/api/jugadores/${uno.id}`, A, { nombre: PRE + 'Uno', edad: 20, equipo_id: null });
  assert.equal(r.status, 200);
  const { rows: [fila] } = await sql('SELECT dorsal, entrenador_id, equipo_id FROM jugadores WHERE id = $1', [uno.id]);
  assert.deepEqual([fila.dorsal, fila.entrenador_id, fila.equipo_id], [10, entrenador, null]);
});

test('CP-DOR-007 [RF-09] Volver a un equipo donde el número ya está ocupado devuelve 409', async () => {
  const { rows: [libre] } = await sql(`SELECT id FROM jugadores WHERE nombre = $1`, [PRE + 'Libre']);
  assert.equal((await llamar('PUT', `/api/jugadores/${libre.id}`, A, { equipo_id: equipo })).status, 200, 'el 10 quedó libre');
  const { rows: [uno] } = await sql(`SELECT id FROM jugadores WHERE nombre = $1`, [PRE + 'Uno']);
  const r = await llamar('PUT', `/api/jugadores/${uno.id}`, A, { equipo_id: equipo });
  assert.equal(r.status, 409);
});

test('CP-DOR-008 [RF-09] El dorsal viaja con el nombre en otros módulos', async () => {
  const { rows: [uno] } = await sql(`SELECT id FROM jugadores WHERE nombre = $1`, [PRE + 'Uno']);
  await llamar('POST', '/api/lesiones', A, { jugador_id: uno.id, tipo: 'Prueba dorsal', fecha_inicio: '2026-10-01' });
  const lesion = (await llamar('GET', '/api/lesiones', A)).datos.find(l => l.jugador_id === uno.id);
  assert.equal(lesion.jugador_dorsal, 10);
});
