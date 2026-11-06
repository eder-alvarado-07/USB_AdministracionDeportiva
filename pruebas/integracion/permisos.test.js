// Seguridad de acceso: qué puede ver y hacer cada rol (RF-04, RF-05, RNF-02)
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, sql } = require('../utilidades/api');

const T = {};
let lesionAjena;      // lesión de un jugador que no es el del usuario jugador
let lesionPropia;     // lesión del jugador vinculado al usuario jugador

test.before(async () => {
  await iniciar();
  for (const rol of ['administrador', 'head_coach', 'entrenador', 'salud', 'jugador']) T[rol] = await token(rol);
  const { rows: [jug] } = await sql(`SELECT jugador_id FROM usuarios WHERE email = 'jugador@dtdeportivo.com'`);
  const { rows: [propia] } = await sql(
    `INSERT INTO lesiones (jugador_id, tipo, fecha_inicio) VALUES ($1, 'Prueba permisos', CURRENT_DATE) RETURNING id`, [jug.jugador_id]);
  lesionPropia = propia.id;
  const { rows: [ajena] } = await sql(`SELECT l.id FROM lesiones l WHERE l.jugador_id <> $1 LIMIT 1`, [jug.jugador_id]);
  lesionAjena = ajena.id;
});
test.after(async () => {
  await sql(`DELETE FROM lesiones WHERE tipo = 'Prueba permisos'`);
  await cerrar(__filename);
});

test('CP-PER-001 [RF-04] Solo el administrador gestiona usuarios', async () => {
  assert.equal((await llamar('GET', '/api/usuarios', T.administrador)).status, 200);
  for (const rol of ['head_coach', 'entrenador', 'salud', 'jugador']) {
    assert.equal((await llamar('GET', '/api/usuarios', T[rol])).status, 403, `${rol} no ve usuarios`);
  }
});

test('CP-PER-002 [RF-05] El jugador solo ve sus lesiones y no puede abrir las ajenas', async () => {
  const lista = await llamar('GET', '/api/lesiones', T.jugador);
  const { rows: [jug] } = await sql(`SELECT jugador_id FROM usuarios WHERE email = 'jugador@dtdeportivo.com'`);
  assert.equal(lista.status, 200);
  assert.ok(lista.datos.length > 0 && lista.datos.every(l => l.jugador_id === jug.jugador_id));
  assert.equal((await llamar('GET', `/api/lesiones/${lesionAjena}`, T.jugador)).status, 404, 'lesión ajena');
  assert.equal((await llamar('GET', `/api/lesiones/${lesionPropia}`, T.jugador)).status, 200, 'lesión propia');
});

test('CP-PER-003 [RF-14] Jugador y entrenador no pueden registrar lesiones', async () => {
  for (const rol of ['jugador', 'entrenador']) {
    const r = await llamar('POST', '/api/lesiones', T[rol], { jugador_id: 1, fecha_inicio: '2026-10-01' });
    assert.equal(r.status, 403, rol);
  }
});

test('CP-PER-004 [RF-05] El entrenador solo ve a sus deportistas', async () => {
  const r = await llamar('GET', '/api/jugadores', T.entrenador);
  const { rows: [ent] } = await sql(`SELECT id FROM usuarios WHERE email = 'cesar_dt@dtdeportivo.com'`);
  assert.equal(r.status, 200);
  assert.ok(r.datos.length === 23 && r.datos.every(j => j.entrenador_id === ent.id), `ve ${r.datos.length}`);
});

test('CP-PER-005 [RF-05] El entrenador no puede modificar deportistas de otro entrenador', async () => {
  const { rows: [ajeno] } = await sql(`SELECT id FROM jugadores WHERE entrenador_id IS NULL LIMIT 1`);
  const r = await llamar('PUT', `/api/jugadores/${ajeno.id}`, T.entrenador, { posicion: 'Hackeado' });
  assert.equal(r.status, 403);
});

test('CP-PER-006 [RNF-02] Historias clínicas: solo salud y administrador', async () => {
  assert.equal((await llamar('GET', '/api/salud/historias', T.salud)).status, 200);
  for (const rol of ['entrenador', 'head_coach', 'jugador']) {
    assert.equal((await llamar('GET', '/api/salud/historias', T[rol])).status, 403, rol);
  }
});

test('CP-PER-007 [RNF-02] El jugador solo ve sus propios controles médicos', async () => {
  const r = await llamar('GET', '/api/salud/controles', T.jugador);
  const { rows: [jug] } = await sql(`SELECT jugador_id FROM usuarios WHERE email = 'jugador@dtdeportivo.com'`);
  assert.equal(r.status, 200);
  assert.ok(r.datos.every(c => c.jugador_id === jug.jugador_id));
});

test('CP-PER-008 [RF-19] Panel del head coach: solo head coach (y administrador)', async () => {
  const r = await llamar('GET', '/api/head-coach/resumen', T.head_coach);
  assert.equal(r.status, 200);
  assert.equal(r.datos.entrenadores.length, 1);
  assert.equal(r.datos.jugadores.length, 23);
  assert.equal((await llamar('GET', '/api/head-coach/resumen', T.entrenador)).status, 403);
});

test('CP-PER-009 [RF-07] El head coach consulta equipos pero no los modifica', async () => {
  assert.equal((await llamar('GET', '/api/equipos', T.head_coach)).status, 200);
  assert.equal((await llamar('POST', '/api/equipos', T.head_coach, { nombre: 'No debería' })).status, 403);
});

// ── Privacidad de datos de rendimiento y salud (v1.5.2: DEF-027 a DEF-029) ──
const datosDe = async () => {
  const { rows: [propio] } = await sql(`SELECT jugador_id AS id FROM usuarios WHERE email = 'jugador@dtdeportivo.com'`);
  const { rows: [deCesar] } = await sql(`SELECT j.id FROM jugadores j JOIN usuarios u ON u.id = j.entrenador_id
    WHERE u.email = 'cesar_dt@dtdeportivo.com' AND j.id <> $1 ORDER BY j.id LIMIT 1`, [propio.id || 0]);
  return { propio: propio.id, deCesar: deCesar.id };
};

test('CP-PER-010 [RNF-02] La asistencia solo muestra los deportistas del alcance de cada rol', async () => {
  const { propio } = await datosDe();
  const r = await llamar('GET', '/api/asistencia', T.jugador);
  assert.equal(r.status, 200);
  assert.ok(r.datos.every(a => a.jugador_id === propio), 'el deportista solo ve su propia asistencia');
  const ent2 = await llamar('GET', '/api/asistencia', await token('entrenador2'));
  const { rows } = await sql(`SELECT j.id FROM jugadores j JOIN usuarios u ON u.id = j.entrenador_id WHERE u.email = 'juan_moreno@dtdeportivo.com'`);
  const suyos = new Set(rows.map(x => x.id));
  assert.ok(ent2.datos.every(a => suyos.has(a.jugador_id)), 'otro entrenador no ve la asistencia del plantel de Cesar');
  const admin = await llamar('GET', '/api/asistencia', T.administrador);
  assert.ok(admin.datos.length >= r.datos.length, 'el administrador ve todo');
});

test('CP-PER-011 [RNF-02] Las evaluaciones físicas solo las ve quien tiene al deportista en su alcance', async () => {
  const { deCesar } = await datosDe();
  const c = await llamar('POST', '/api/evaluaciones', T.administrador, { jugador_id: deCesar, fecha: '2026-10-01', sprint_30m: 4.4, peso: 80 });
  assert.equal(c.status, 201, JSON.stringify(c.datos));
  const ve = async (t) => (await llamar('GET', '/api/evaluaciones', t)).datos.some(e => e.jugador_id === deCesar);
  assert.equal(await ve(T.entrenador), true, 'su entrenador la ve');
  assert.equal(await ve(T.salud), true, 'salud la ve');
  assert.equal(await ve(T.jugador), false, 'otro deportista no la ve');
  assert.equal(await ve(await token('entrenador2')), false, 'otro entrenador no la ve');
  await sql('DELETE FROM evaluaciones_rugby WHERE jugador_id = $1 AND fecha = $2', [deCesar, '2026-10-01']);
});

test('CP-PER-012 [RNF-02] Las medidas antropométricas de un deportista no se ven fuera de su alcance', async () => {
  const { deCesar, propio } = await datosDe();
  assert.equal((await llamar('GET', `/api/antropometria/jugador/${deCesar}`, T.entrenador)).status, 200, 'su entrenador');
  assert.equal((await llamar('GET', `/api/antropometria/jugador/${deCesar}`, T.salud)).status, 200, 'salud');
  assert.equal((await llamar('GET', `/api/antropometria/jugador/${deCesar}`, T.jugador)).status, 404, 'otro deportista');
  assert.equal((await llamar('GET', `/api/antropometria/jugador/${deCesar}`, await token('entrenador2'))).status, 404, 'otro entrenador');
  if (propio) assert.equal((await llamar('GET', `/api/antropometria/jugador/${propio}`, T.jugador)).status, 200, 'el deportista ve las suyas');
});
