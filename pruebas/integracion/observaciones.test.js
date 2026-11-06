// Observaciones del tester, primera entrega (v1.9): cada rol ve solo su deporte, el personal de salud no ve
// estadísticas, filtros por deporte en agenda, salud y usuarios, y editar un usuario no borra su vínculo (DEF-032)
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, sql } = require('../utilidades/api');

const T = {};
let rugby, futbol, usuarioJuan, usuarioJugador, jugadorId;

test.before(async () => {
  await iniciar();
  for (const rol of ['administrador', 'head_coach', 'entrenador', 'entrenador2', 'salud', 'jugador']) T[rol] = await token(rol);
  ({ rows: [{ id: rugby }] } = await sql(`SELECT disciplina_id AS id FROM equipos WHERE nombre = 'Unisimón Rugby (demo)'`));
  ({ rows: [{ id: futbol }] } = await sql(`INSERT INTO disciplinas (nombre) VALUES ('ZZ Fútbol') ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`));
  ({ rows: [{ id: usuarioJuan }] } = await sql(`SELECT id FROM usuarios WHERE email = 'juan_moreno@dtdeportivo.com'`));
  ({ rows: [{ id: usuarioJugador, jugador_id: jugadorId }] } = await sql(`SELECT id, jugador_id FROM usuarios WHERE email = 'jugador@dtdeportivo.com'`));
  await sql('UPDATE usuarios SET disciplina_id = NULL WHERE id = $1', [usuarioJuan]);
});
test.after(async () => {
  await sql('UPDATE usuarios SET disciplina_id = NULL WHERE id = $1', [usuarioJuan]);
  await sql(`DELETE FROM disciplinas WHERE nombre = 'ZZ Fútbol'`);
  await cerrar(__filename);
});

const deportes = async (t) => (await llamar('GET', '/api/disciplinas', t)).datos.map(d => d.id);

test('CP-OBS-001 [RF-06] Cada rol ve solo sus deportes en el selector', async () => {
  const todos = await deportes(T.administrador);
  assert.ok(todos.includes(rugby) && todos.includes(futbol), 'el administrador ve todos los deportes');
  assert.ok((await deportes(T.salud)).includes(futbol), 'el personal de salud atiende a todos los deportes');
  assert.deepEqual(await deportes(T.entrenador), [rugby], 'el entrenador de rugby solo ve rugby');
  assert.deepEqual(await deportes(T.jugador), [rugby], 'el deportista solo ve su deporte');
  assert.deepEqual(await deportes(T.head_coach), [rugby], 'el head coach ve los deportes de sus entrenadores');
  assert.deepEqual(await deportes(T.entrenador2), [], 'un entrenador sin deporte ni deportistas no ve ninguno');
});

test('CP-OBS-002 [RF-03] El administrador asigna el deporte a un entrenador', async () => {
  const r = await llamar('PUT', `/api/usuarios/${usuarioJuan}`, T.administrador,
    { nombre: 'Juan Moreno', email: 'juan_moreno@dtdeportivo.com', rol: 'entrenador', activo: true, disciplina_id: futbol });
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  assert.deepEqual(await deportes(T.entrenador2), [futbol]);
  const lista = (await llamar('GET', '/api/usuarios', T.administrador)).datos;
  const juan = lista.find(u => u.id === usuarioJuan);
  assert.equal(juan.disciplina_id, futbol);
  assert.deepEqual(juan.disciplinas, [futbol]);
  assert.ok(lista.find(u => u.email === 'cesar_dt@dtdeportivo.com').disciplinas.includes(rugby), 'Cesar queda en rugby por sus deportistas');
  assert.deepEqual(lista.find(u => u.id === usuarioJugador).disciplinas, [rugby]);
  // Un rol sin deporte asignado (salud) no lo guarda aunque venga en la petición
  const s = lista.find(u => u.email === 'salud@dtdeportivo.com');
  await llamar('PUT', `/api/usuarios/${s.id}`, T.administrador, { nombre: s.nombre, email: s.email, rol: 'personal_salud', activo: true, disciplina_id: futbol });
  const { rows: [salud] } = await sql('SELECT disciplina_id FROM usuarios WHERE id = $1', [s.id]);
  assert.equal(salud.disciplina_id, null);
});

test('CP-OBS-003 [RF-06] Solo el administrador crea y elimina deportes', async () => {
  assert.equal((await llamar('POST', '/api/disciplinas', T.entrenador, { nombre: 'ZZ Voleibol' })).status, 403);
  assert.equal((await llamar('DELETE', `/api/disciplinas/${futbol}`, T.entrenador)).status, 403);
});

test('CP-OBS-004 [RF-04] El personal de salud no ve estadísticas deportivas', async () => {
  assert.equal((await llamar('GET', '/api/estadisticas', T.salud)).status, 403);
  assert.equal((await llamar('GET', `/api/estadisticas/jugador/${jugadorId}`, T.salud)).status, 403);
  const inicio = (await llamar('GET', '/api/dashboard/inicio', T.salud)).datos;
  assert.deepEqual(inicio.anotadores, []);
  assert.deepEqual(inicio.reconocimientos, []);
  assert.equal((await llamar('GET', '/api/estadisticas', T.entrenador)).status, 200, 'el entrenador sí');
});

test('CP-OBS-005 [RF-06] Entrenamientos, partidos y controles traen el deporte para filtrar', async () => {
  const ent = (await llamar('GET', '/api/entrenamientos', T.administrador)).datos;
  assert.ok(ent.some(e => e.equipo_id && e.disciplina_id === rugby), 'los entrenamientos del equipo demo son de rugby');
  const par = (await llamar('GET', '/api/partidos', T.administrador)).datos;
  assert.ok(par.some(p => p.equipo_id && p.disciplina_id === rugby));
  const ctl = (await llamar('GET', '/api/salud/controles', T.administrador)).datos;
  assert.ok(ctl.length && ctl.every(c => 'disciplina_id' in c));
});

test('CP-OBS-006 [RF-05] Los controles médicos: el deportista solo los suyos; head coach y entrenador no entran', async () => {
  assert.equal((await llamar('GET', '/api/salud/controles', T.head_coach)).status, 403);
  assert.equal((await llamar('GET', '/api/salud/controles', T.entrenador)).status, 403);
  const propios = (await llamar('GET', '/api/salud/controles', T.jugador)).datos;
  assert.ok(propios.every(c => c.jugador_id === jugadorId));
});

test('CP-OBS-007 [RF-03] DEF-032: editar un usuario sin enviar el vínculo no lo borra', async () => {
  const r = await llamar('PUT', `/api/usuarios/${usuarioJugador}`, T.administrador,
    { nombre: 'Jugador Demo', email: 'jugador@dtdeportivo.com', rol: 'jugador', activo: true });
  assert.equal(r.status, 200);
  const { rows: [u] } = await sql('SELECT jugador_id FROM usuarios WHERE id = $1', [usuarioJugador]);
  assert.equal(u.jugador_id, jugadorId, 'sigue vinculado a su perfil de deportista');
});
