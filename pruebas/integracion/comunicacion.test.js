// Avisos del entrenador, recordatorios automáticos y reconocimientos (v1.7: RF-21, RF-22, RF-23)
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, sql } = require('../utilidades/api');

const T = {};
let equipoDemo, usuarioJugador, jugadorId, partidoManana;

test.before(async () => {
  await iniciar();
  ({ rows: [{ id: equipoDemo }] } = await sql(`SELECT id FROM equipos WHERE nombre = 'Unisimón Rugby (demo)'`));
  ({ rows: [{ id: usuarioJugador, jugador_id: jugadorId }] } = await sql(`SELECT id, jugador_id FROM usuarios WHERE email = 'jugador@dtdeportivo.com'`));
  // La cuenta de deportista debe pertenecer al equipo de demostración
  const { rows: [j] } = await sql('SELECT equipo_id FROM jugadores WHERE id = $1', [jugadorId]);
  assert.equal(j.equipo_id, equipoDemo, 'jugador@ pertenece al plantel de demostración');
  for (const rol of ['administrador', 'entrenador', 'entrenador2', 'jugador']) T[rol] = await token(rol);
  ({ rows: [{ id: partidoManana }] } = await sql(`SELECT id FROM partidos WHERE fecha = CURRENT_DATE + 1 AND rival = 'Deportivo Sur'`));
  await sql('DELETE FROM notificaciones WHERE usuario_id = $1', [usuarioJugador]);
});
test.after(async () => {
  await sql(`DELETE FROM comunicados WHERE titulo LIKE 'ZZ%'`);
  await sql(`DELETE FROM entrenamientos WHERE tipo LIKE 'ZZ recordatorio%'`);
  await sql(`DELETE FROM controles_medicos WHERE tipo = 'ZZ recordatorio'`);
  await sql('DELETE FROM convocatorias WHERE partido_id = $1', [partidoManana]);
  await sql(`DELETE FROM notificaciones WHERE clave IS NOT NULL OR tipo = 'comunicado'`);
  await cerrar(__filename);
});

const avisos = async (t) => (await llamar('GET', '/api/notificaciones', t)).datos.avisos;

test('CP-COM-001 [RF-21] El entrenador envía un aviso a su equipo y le llega a cada deportista', async () => {
  const r = await llamar('POST', '/api/comunicados', T.entrenador, { titulo: 'ZZ Cambio de cancha', mensaje: 'Mañana entrenamos en la cancha sintética.', equipo_id: equipoDemo });
  assert.equal(r.status, 201, JSON.stringify(r.datos));
  assert.ok(r.datos.destinatarios >= 1);
  const lista = (await llamar('GET', '/api/comunicados', T.jugador)).datos;
  assert.ok(lista.some(c => c.titulo === 'ZZ Cambio de cancha' && c.autor === 'Cesar DT'), 'el deportista lo ve en el inicio');
  assert.ok((await avisos(T.jugador)).some(a => a.titulo === 'Aviso del entrenador: ZZ Cambio de cancha'), 'y en la campanita');
  assert.ok(!(await llamar('GET', '/api/comunicados', T.entrenador2)).datos.some(c => c.titulo === 'ZZ Cambio de cancha'), 'otro entrenador no lo ve');
});

test('CP-COM-002 [RF-21] Solo se escribe a equipos propios, con título y mensaje, y solo el autor lo borra', async () => {
  assert.equal((await llamar('POST', '/api/comunicados', T.entrenador2, { titulo: 'ZZ Ajeno', mensaje: 'x', equipo_id: equipoDemo })).status, 403);
  assert.equal((await llamar('POST', '/api/comunicados', T.entrenador, { titulo: '', mensaje: 'x' })).status, 400);
  assert.equal((await llamar('POST', '/api/comunicados', T.jugador, { titulo: 'ZZ', mensaje: 'x' })).status, 403);
  const c = await llamar('POST', '/api/comunicados', T.entrenador, { titulo: 'ZZ Para borrar', mensaje: 'x' });
  assert.equal(c.status, 201);
  assert.equal((await llamar('DELETE', `/api/comunicados/${c.datos.id}`, T.entrenador2)).status, 404);
  assert.equal((await llamar('DELETE', `/api/comunicados/${c.datos.id}`, T.entrenador)).status, 200);
});

test('CP-REC-001 [RF-22] El deportista recibe un recordatorio del entrenamiento de mañana, una sola vez', async () => {
  await llamar('POST', '/api/entrenamientos', T.administrador, { fecha: fechaManana(), tipo: 'ZZ recordatorio táctica', equipo_id: equipoDemo, hora: '17:30', lugar: 'Cancha sintética' });
  const a = await avisos(T.jugador);
  const rec = a.filter(x => x.titulo === 'Mañana tienes entrenamiento: ZZ recordatorio táctica');
  assert.equal(rec.length, 1);
  assert.equal(rec[0].mensaje, 'A las 5:30 p. m. en Cancha sintética.');
  await avisos(T.jugador);
  const otra = (await avisos(T.jugador)).filter(x => x.titulo === 'Mañana tienes entrenamiento: ZZ recordatorio táctica');
  assert.equal(otra.length, 1, 'no se duplica al consultar de nuevo');
  assert.ok(!(await avisos(T.entrenador2)).some(x => x.titulo.includes('ZZ recordatorio táctica')), 'otro equipo no lo recibe');
});

test('CP-REC-002 [RF-22] Convocatoria sin responder: recordatorio al deportista y al entrenador', async () => {
  const r = await llamar('PUT', `/api/convocatorias/partido/${partidoManana}`, T.entrenador, { publicar: true, convocados: [{ jugador_id: jugadorId, rol: 'titular' }] });
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  assert.ok(!(await avisos(T.jugador)).some(x => x.titulo.startsWith('Confirma tu convocatoria')), 'recién publicada no se repite el aviso');
  await sql(`UPDATE convocatorias SET publicada_en = NOW() - INTERVAL '4 hours' WHERE partido_id = $1`, [partidoManana]);
  assert.ok((await avisos(T.jugador)).some(x => x.titulo === 'Confirma tu convocatoria: Unisimón vs. Deportivo Sur'));
  assert.ok((await avisos(T.entrenador)).some(x => x.titulo === '1 convocados aún no responden'));
});

test('CP-REC-003 [RF-22] Control médico próximo: recordatorio al deportista', async () => {
  await sql(`INSERT INTO controles_medicos (jugador_id, fecha, proxima_fecha, tipo, aptitud) VALUES ($1, CURRENT_DATE, CURRENT_DATE + 2, 'ZZ recordatorio', 'apto')`, [jugadorId]);
  assert.ok((await avisos(T.jugador)).some(x => x.titulo === 'Tienes pendiente un control médico'));
});

test('CP-RCN-001 [RF-23] Reconocimientos: el entrenador ve a los líderes; el deportista solo los suyos', async () => {
  const e = (await llamar('GET', '/api/dashboard/inicio', T.entrenador)).datos.reconocimientos;
  const anotador = e.find(r => r.tipo === 'goles');
  assert.ok(anotador, 'hay máximo anotador');
  const { rows: [top] } = await sql(`SELECT j.id FROM estadisticas_jugador es JOIN jugadores j ON j.id = es.jugador_id
    WHERE j.equipo_id = $1 GROUP BY j.id ORDER BY SUM(es.goles) DESC, MIN(j.nombre) LIMIT 1`, [equipoDemo]);
  assert.equal(anotador.jugadores[0].id, top.id);
  const j = (await llamar('GET', '/api/dashboard/inicio', T.jugador)).datos.reconocimientos;
  assert.ok(j.every(r => r.jugadores.every(x => x.id === jugadorId)), 'el deportista solo ve reconocimientos propios');
});

function fechaManana() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
