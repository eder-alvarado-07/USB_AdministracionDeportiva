// v2.1: estadísticas propias de cada deporte y usuario administrador admin1
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, sql } = require('../utilidades/api');
const { perfilDeporte, claveDeporte, limpiarMetricas } = require('../../backend/config/metricas_deportes');

const T = {};
const creados = [];

test.before(async () => {
  await iniciar();
  for (const rol of ['administrador', 'entrenador', 'entrenador2', 'jugador']) T[rol] = await token(rol);
});
test.after(async () => {
  if (creados.length) await sql('DELETE FROM estadisticas_jugador WHERE id = ANY($1::int[])', [creados]);
  await sql(`DELETE FROM jugadores WHERE nombre LIKE 'ZZ v21%'`);
  await cerrar(__filename);
});

test('CP-V21-001 Cada deporte tiene métricas propias y distintas', () => {
  const claves = (n) => perfilDeporte(n).metricas.map(m => m.clave)
  assert.deepEqual(claves('Fútbol'), ['goles', 'asistencias', 'tarjetas_amarillas', 'tarjetas_rojas', 'minutos']);
  assert.ok(claves('Baloncesto').includes('rebotes') && claves('Baloncesto').includes('faltas'));
  assert.ok(claves('Rugby').includes('tries') && claves('Rugby').includes('tackles'));
  assert.ok(claves('Voleibol').includes('bloqueos') && claves('Voleibol').includes('recepciones'));
  assert.ok(claves('Béisbol').includes('hits') && claves('Béisbol').includes('ponches'));
  assert.ok(claves('Natación').includes('oro'));
  assert.notDeepEqual(claves('Fútbol'), claves('Rugby'));
  assert.equal(claveDeporte('Fútbol sala'), 'futsal');
  assert.equal(claveDeporte('BALONCESTO'), 'baloncesto');
  assert.equal(claveDeporte('Deporte nuevo'), 'generico');
  assert.match(limpiarMetricas(perfilDeporte('Fútbol'), { goles: 'x' }).error, /Goles/);
  assert.match(limpiarMetricas(perfilDeporte('Fútbol'), { tarjetas_rojas: 3 }).error, /máximo/);
});

test('CP-V21-002 El catálogo de métricas llega por API con los deportes visibles', async () => {
  const r = await llamar('GET', '/api/estadisticas/metricas', T.administrador);
  assert.equal(r.status, 200);
  const futbol = r.datos.deportes.find(d => d.nombre === 'Fútbol');
  assert.ok(futbol, 'el administrador ve todos los deportes');
  assert.equal(futbol.perfil.clave, 'futbol');
  assert.ok(r.datos.catalogo.some(c => c.clave === 'beisbol'));
  const e = await llamar('GET', '/api/estadisticas/metricas', T.entrenador);
  assert.ok(e.datos.deportes.every(d => d.nombre === 'Rugby'), 'el entrenador de rugby solo ve rugby');
});

test('CP-V21-003 Se guardan solo las métricas del deporte del deportista, con totales derivados', async () => {
  const propio = (await llamar('GET', '/api/jugadores', T.entrenador)).datos[0].id;
  const c = await llamar('POST', '/api/estadisticas', T.entrenador, {
    jugador_id: propio, metricas: { tries: 2, conversiones: 1, tackles: 9, minutos: 80, goles: 50 } });
  assert.equal(c.status, 201, JSON.stringify(c.datos));
  creados.push(c.datos.id);
  assert.equal(c.datos.metricas.tries, 2);
  assert.equal(c.datos.metricas.goles, undefined, 'una métrica de otro deporte se descarta');
  assert.equal(c.datos.goles, 2, 'la columna antigua guarda la métrica principal (tries)');
  const malo = await llamar('POST', '/api/estadisticas', T.entrenador, { jugador_id: propio, metricas: { tackles: -3 } });
  assert.equal(malo.status, 400);
  const ajeno = await llamar('POST', '/api/estadisticas', T.entrenador2, { jugador_id: propio, metricas: { tries: 1 } });
  assert.equal(ajeno.status, 403, 'otro entrenador no registra estadísticas de deportistas ajenos');
});

test('CP-V21-004 Un registro antiguo se ve con las métricas de su deporte', async () => {
  const { rows: [{ id: futbol }] } = await sql(`SELECT id FROM disciplinas WHERE nombre = 'Fútbol'`);
  const { rows: [j] } = await sql(`INSERT INTO jugadores (nombre, disciplina_id) VALUES ('ZZ v21 futbolista', $1) RETURNING id`, [futbol]);
  const { rows: [r] } = await sql(`INSERT INTO estadisticas_jugador (jugador_id, goles, asistencias, minutos_jugados) VALUES ($1, 3, 2, 90) RETURNING id`, [j.id]);
  creados.push(r.id);
  const lista = (await llamar('GET', `/api/estadisticas/jugador/${j.id}`, T.administrador)).datos;
  assert.deepEqual(lista[0].metricas, { goles: 3, asistencias: 2, tarjetas_amarillas: 0, tarjetas_rojas: 0, minutos: 90 });
});

test('CP-V21-005 El administrador es admin1 y entra con el usuario corto o con el correo', async () => {
  for (const email of ['admin1', 'admin1@dtdeportivo.com']) {
    const r = await llamar('POST', '/api/auth/login', null, { email, password: require('../utilidades/cuentas').administrador[1] });
    assert.equal(r.status, 200, email);
    assert.equal(r.datos.usuario.rol, 'administrador');
  }
  const viejo = await llamar('POST', '/api/auth/login', null, { email: 'robinson_meza@dtdeportivo.com', password: require('../utilidades/cuentas').administrador[1] });
  assert.equal(viejo.status, 401);
  const { rows } = await sql(`SELECT COUNT(*)::int AS n FROM usuarios WHERE rol = 'administrador'`);
  assert.equal(rows[0].n, 1, 'no se duplica el administrador');
});
