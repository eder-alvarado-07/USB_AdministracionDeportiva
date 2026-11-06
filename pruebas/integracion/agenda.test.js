// Agenda por equipo (v1.7): cada entrenamiento y partido pertenece a un equipo, con hora y lugar (RF-10, RF-12, RF-05)
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, sql } = require('../utilidades/api');

const T = {};
let equipoDemo;

test.before(async () => {
  await iniciar();
  for (const rol of ['administrador', 'entrenador', 'entrenador2', 'jugador', 'head_coach', 'salud']) T[rol] = await token(rol);
  ({ rows: [{ id: equipoDemo }] } = await sql(`SELECT id FROM equipos WHERE nombre = 'Unisimón Rugby (demo)'`));
});
test.after(async () => {
  await sql(`DELETE FROM entrenamientos WHERE tipo LIKE 'ZZ agenda%'`);
  await sql(`DELETE FROM partidos WHERE rival LIKE 'ZZ agenda%'`);
  await cerrar(__filename);
});

const ve = async (t, ruta, campo, valor) => (await llamar('GET', ruta, t)).datos.some(x => x[campo] === valor);

test('CP-AGE-001 [RF-10] Un entrenamiento del equipo lo ven solo quienes tienen ese equipo en su alcance', async () => {
  const c = await llamar('POST', '/api/entrenamientos', T.entrenador, {
    fecha: '2026-12-01', tipo: 'ZZ agenda equipo', descripcion: 'x', equipo_id: equipoDemo, hora: '17:30', lugar: 'Cancha sintética' });
  assert.equal(c.status, 201, JSON.stringify(c.datos));
  assert.equal(c.datos.hora, '17:30');
  for (const rol of ['entrenador', 'jugador', 'head_coach', 'administrador', 'salud']) {
    assert.equal(await ve(T[rol], '/api/entrenamientos', 'tipo', 'ZZ agenda equipo'), true, `${rol} debe verlo`);
  }
  assert.equal(await ve(T.entrenador2, '/api/entrenamientos', 'tipo', 'ZZ agenda equipo'), false, 'otro entrenador no lo ve');
  assert.equal((await llamar('GET', `/api/entrenamientos/${c.datos.id}`, T.entrenador2)).status, 404);
  assert.equal((await llamar('DELETE', `/api/entrenamientos/${c.datos.id}`, T.entrenador2)).status, 404, 'ni lo puede borrar');
});

test('CP-AGE-002 [RF-10] Una actividad sin equipo es general y la ven todos', async () => {
  const c = await llamar('POST', '/api/entrenamientos', T.administrador, { fecha: '2026-12-02', tipo: 'ZZ agenda general' });
  assert.equal(c.status, 201);
  for (const rol of ['entrenador', 'entrenador2', 'jugador', 'head_coach']) {
    assert.equal(await ve(T[rol], '/api/entrenamientos', 'tipo', 'ZZ agenda general'), true, rol);
  }
});

test('CP-AGE-003 [RF-05] Un entrenador solo asigna equipos donde tiene deportistas', async () => {
  const r = await llamar('POST', '/api/partidos', T.entrenador2, { fecha: '2026-12-05', rival: 'ZZ agenda ajeno', tipo: 'amistoso', equipo_id: equipoDemo });
  assert.equal(r.status, 403);
  assert.match(r.datos.error, /equipos de tu deporte/);
  const bien = await llamar('POST', '/api/partidos', T.entrenador, { fecha: '2026-12-05', rival: 'ZZ agenda propio', tipo: 'amistoso', equipo_id: equipoDemo, hora: '15:00', lugar: 'Estadio' });
  assert.equal(bien.status, 201);
  assert.equal(await ve(T.entrenador2, '/api/partidos', 'rival', 'ZZ agenda propio'), false);
  assert.equal(await ve(T.jugador, '/api/partidos', 'rival', 'ZZ agenda propio'), true);
});

test('CP-AGE-004 [RNF-03] Hora con formato inválido devuelve 400', async () => {
  const r = await llamar('POST', '/api/entrenamientos', T.entrenador, { fecha: '2026-12-03', tipo: 'ZZ agenda hora', hora: '25:99' });
  assert.equal(r.status, 400);
  assert.match(r.datos.error, /HH:MM/);
});

test('CP-AGE-005 [RF-10] Editar sin enviar equipo, hora ni lugar los conserva', async () => {
  const c = await llamar('POST', '/api/entrenamientos', T.entrenador, { fecha: '2026-12-04', tipo: 'ZZ agenda editar', equipo_id: equipoDemo, hora: '06:00', lugar: 'Gimnasio' });
  const u = await llamar('PUT', `/api/entrenamientos/${c.datos.id}`, T.entrenador, { fecha: '2026-12-04', tipo: 'ZZ agenda editado', descripcion: 'cambio' });
  assert.equal(u.status, 200);
  const e = (await llamar('GET', `/api/entrenamientos/${c.datos.id}`, T.entrenador)).datos;
  assert.deepEqual([e.equipo_id, e.hora, e.lugar, e.equipo_nombre], [equipoDemo, '06:00', 'Gimnasio', 'Unisimón Rugby (demo)']);
});

test('CP-AGE-006 [RF-18] "Esta semana" muestra lugar y hora, y otro entrenador no ve la agenda del equipo', async () => {
  const semana = (await llamar('GET', '/api/dashboard/inicio', T.entrenador)).datos.semana;
  const tactica = semana.find(s => s.titulo.startsWith('Táctica'));
  assert.ok(tactica, 'el entrenamiento de la demostración está en la semana');
  assert.equal(tactica.detalle, 'Cancha sintética · 17:30');
  const ajena = (await llamar('GET', '/api/dashboard/inicio', T.entrenador2)).datos;
  assert.ok(!ajena.semana.some(s => s.titulo.startsWith('Táctica')), 'otro entrenador no ve la agenda del plantel de Cesar');
  assert.notEqual(ajena.proximo_partido?.rival, 'Deportivo Sur', 'ni su próximo partido');
});
