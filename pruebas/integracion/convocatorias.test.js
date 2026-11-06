// Convocatoria de partidos (v1.6): armado por el entrenador, publicación, avisos, respuestas y registro (RF-20)
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, sql } = require('../utilidades/api');

const T = {};
let partido;        // próximo partido del plantel de demostración
let propio;         // deportista vinculado a la cuenta jugador@
let otros;          // otros deportistas de Cesar
let usuarioJugador; // id de la cuenta jugador@
let usuarioCesar;   // id de la cuenta del entrenador

test.before(async () => {
  await iniciar();
  for (const rol of ['administrador', 'entrenador', 'entrenador2', 'jugador', 'head_coach']) T[rol] = await token(rol);
  const inicio = await llamar('GET', '/api/dashboard/inicio', T.entrenador);
  partido = inicio.datos.proximo_partido;
  const { rows: [u] } = await sql(`SELECT id, jugador_id FROM usuarios WHERE email = 'jugador@dtdeportivo.com'`);
  usuarioJugador = u.id;
  // La cuenta de deportista debe pertenecer al plantel de Cesar para estas pruebas
  const { rows: [c] } = await sql(`SELECT id FROM usuarios WHERE email = 'cesar_dt@dtdeportivo.com'`);
  usuarioCesar = c.id;
  const { rows: plantel } = await sql('SELECT id FROM jugadores WHERE entrenador_id = $1 ORDER BY dorsal NULLS LAST, id', [usuarioCesar]);
  propio = u.jugador_id && plantel.some(p => p.id === u.jugador_id) ? u.jugador_id : plantel[0].id;
  await sql('UPDATE usuarios SET jugador_id = $1 WHERE id = $2', [propio, usuarioJugador]);
  T.jugador = await token('jugador');
  otros = plantel.map(p => p.id).filter(id => id !== propio).slice(0, 3);
  await sql('DELETE FROM notificaciones WHERE usuario_id IN ($1, $2)', [usuarioJugador, usuarioCesar]);
});
test.after(async () => {
  await sql('DELETE FROM convocatorias WHERE partido_id = $1', [partido.id]);
  await cerrar(__filename);
});

// Los recordatorios automáticos (v1.7) se prueban en comunicacion.test.js; aquí solo cuentan los avisos de la convocatoria
const avisos = async (t) => {
  const propios = (await llamar('GET', '/api/notificaciones', t)).datos.avisos.filter(a => a.tipo !== 'recordatorio');
  return { avisos: propios, sin_leer: propios.filter(a => !a.leida).length };
};
const guardar = (t, cuerpo) => llamar('PUT', `/api/convocatorias/partido/${partido.id}`, t, cuerpo);

test('CP-CNV-001 [RF-20] El entrenador guarda un borrador que solo ve el cuerpo técnico', async () => {
  const r = await guardar(T.entrenador, {
    hora_presentacion: '13:30', lugar: 'Cancha principal',
    convocados: [{ jugador_id: propio, rol: 'titular' }, { jugador_id: otros[0], rol: 'titular' }, { jugador_id: otros[1], rol: 'suplente' }],
  });
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  assert.equal(r.datos.convocatoria.publicada, false);
  assert.deepEqual(r.datos.convocatoria.resumen, { total: 3, titulares: 2, suplentes: 1, confirmados: 0, no_pueden: 0, pendientes: 3 });
  assert.equal((await llamar('GET', `/api/convocatorias/partido/${partido.id}`, T.jugador)).datos.convocatoria, null, 'el deportista no ve el borrador');
  assert.equal((await llamar('GET', `/api/convocatorias/partido/${partido.id}`, T.head_coach)).datos.convocatoria.convocados.length, 3, 'el head coach sí');
  assert.equal((await avisos(T.jugador)).sin_leer, 0, 'un borrador no envía avisos');
});

test('CP-CNV-002 [RF-20] Al publicar, los convocados reciben el aviso y ven la plantilla', async () => {
  const r = await guardar(T.entrenador, {
    hora_presentacion: '13:30', lugar: 'Cancha principal', publicar: true,
    convocados: [{ jugador_id: propio, rol: 'titular' }, { jugador_id: otros[0], rol: 'titular' }, { jugador_id: otros[1], rol: 'suplente' }],
  });
  assert.equal(r.datos.convocatoria.publicada, true);
  const a = await avisos(T.jugador);
  assert.equal(a.sin_leer, 1);
  assert.match(a.avisos[0].titulo, /Fuiste convocado/);
  assert.match(a.avisos[0].mensaje, /titular/);
  assert.equal(a.avisos[0].enlace, `/partidos?convocatoria=${partido.id}`);
  const vista = (await llamar('GET', `/api/convocatorias/partido/${partido.id}`, T.jugador)).datos.convocatoria;
  assert.equal(vista.convocados.length, 3);
  assert.equal(vista.mia.rol, 'titular');
  assert.equal(vista.mia.confirmacion, 'pendiente');
  assert.ok(vista.convocados.every(c => c.confirmacion === undefined), 'el deportista no ve las respuestas de los demás');
  assert.equal(vista.resumen, null);
});

test('CP-CNV-003 [RF-05] Otro entrenador no ve el partido de otro equipo ni puede tocar su convocatoria', async () => {
  // Desde v1.7 el partido pertenece al equipo de Cesar: para otro entrenador no existe
  assert.equal((await guardar(T.entrenador2, { convocados: [{ jugador_id: otros[2], rol: 'titular' }] })).status, 404);
  assert.equal((await guardar(T.entrenador2, { convocados: [] })).status, 404);
  assert.equal((await llamar('GET', `/api/convocatorias/partido/${partido.id}`, T.entrenador2)).status, 404);
  const r = await llamar('GET', `/api/convocatorias/partido/${partido.id}`, T.entrenador);
  assert.equal(r.datos.convocatoria.convocados.length, 3, 'los convocados de Cesar siguen intactos');
});

test('CP-CNV-004 [RF-20] El deportista confirma o avisa que no puede, y el entrenador se entera', async () => {
  const ok = await llamar('POST', `/api/convocatorias/partido/${partido.id}/respuesta`, T.jugador, { respuesta: 'confirmado' });
  assert.equal(ok.status, 200);
  assert.equal(ok.datos.convocatoria.mia.confirmacion, 'confirmado');
  let tecnico = (await llamar('GET', `/api/convocatorias/partido/${partido.id}`, T.entrenador)).datos.convocatoria;
  assert.equal(tecnico.resumen.confirmados, 1);

  const no = await llamar('POST', `/api/convocatorias/partido/${partido.id}/respuesta`, T.jugador, { respuesta: 'no_puede', motivo: 'Examen parcial' });
  assert.equal(no.datos.convocatoria.mia.confirmacion, 'no_puede');
  tecnico = (await llamar('GET', `/api/convocatorias/partido/${partido.id}`, T.entrenador)).datos.convocatoria;
  assert.equal(tecnico.resumen.no_pueden, 1);
  assert.equal(tecnico.convocados.find(c => c.jugador_id === propio).motivo, 'Examen parcial');
  const a = await avisos(T.entrenador);
  assert.match(a.avisos[0].titulo, /no puede ir/);
  assert.match(a.avisos[0].mensaje, /Examen parcial/);
  assert.equal((await llamar('POST', `/api/convocatorias/partido/${partido.id}/respuesta`, T.jugador, { respuesta: 'quizas' })).status, 400);
  assert.equal((await llamar('POST', `/api/convocatorias/partido/${partido.id}/respuesta`, T.entrenador, { respuesta: 'confirmado' })).status, 403);
});

test('CP-CNV-005 [RF-20] Editar la convocatoria publicada avisa a los afectados', async () => {
  await llamar('PATCH', '/api/notificaciones/leidas', T.jugador);
  // Pasa a suplente: aviso de cambio de rol
  await guardar(T.entrenador, { hora_presentacion: '13:30', lugar: 'Cancha principal',
    convocados: [{ jugador_id: propio, rol: 'suplente' }, { jugador_id: otros[0], rol: 'titular' }, { jugador_id: otros[1], rol: 'suplente' }] });
  let a = await avisos(T.jugador);
  assert.equal(a.sin_leer, 1);
  assert.match(a.avisos[0].mensaje, /suplente/);
  // Lo retiran: aviso y ya no puede responder
  await guardar(T.entrenador, { hora_presentacion: '13:30', lugar: 'Cancha principal',
    convocados: [{ jugador_id: otros[0], rol: 'titular' }, { jugador_id: otros[1], rol: 'suplente' }] });
  a = await avisos(T.jugador);
  assert.match(a.avisos[0].mensaje, /Ya no estás en la convocatoria/);
  assert.equal((await llamar('POST', `/api/convocatorias/partido/${partido.id}/respuesta`, T.jugador, { respuesta: 'confirmado' })).status, 404);
  // Lo vuelven a convocar
  await guardar(T.entrenador, { hora_presentacion: '14:00', lugar: 'Cancha principal',
    convocados: [{ jugador_id: propio, rol: 'titular' }, { jugador_id: otros[0], rol: 'titular' }, { jugador_id: otros[1], rol: 'suplente' }] });
  a = await avisos(T.jugador);
  assert.match(a.avisos[0].titulo, /Fuiste convocado/);
});

test('CP-CNV-006 [RF-20] No se puede responder una convocatoria de un partido que ya pasó', async () => {
  const { rows: [viejo] } = await sql(`INSERT INTO partidos (fecha, rival, tipo) VALUES (CURRENT_DATE - 2, 'ZZ Pasado', 'amistoso') RETURNING id`);
  const r = await llamar('PUT', `/api/convocatorias/partido/${viejo.id}`, T.entrenador, { publicar: true, convocados: [{ jugador_id: propio, rol: 'titular' }] });
  assert.equal(r.datos.convocatoria.se_puede_responder, false);
  const resp = await llamar('POST', `/api/convocatorias/partido/${viejo.id}/respuesta`, T.jugador, { respuesta: 'confirmado' });
  assert.equal(resp.status, 400);
  assert.match(resp.datos.error, /ya pasó/);
  await sql('DELETE FROM partidos WHERE id = $1', [viejo.id]);
});

test('CP-CNV-007 [RF-20] El registro digital guarda cada acción con quién la hizo', async () => {
  const r = await llamar('GET', `/api/convocatorias/partido/${partido.id}/historial`, T.entrenador);
  assert.equal(r.status, 200);
  const acciones = r.datos.map(h => h.accion);
  for (const a of ['publicada', 'agregado', 'retirado', 'cambio_rol', 'confirmo', 'no_puede', 'editada']) assert.ok(acciones.includes(a), `falta "${a}"`);
  assert.ok(r.datos.every(h => h.usuario), 'cada acción tiene autor');
  assert.equal((await llamar('GET', `/api/convocatorias/partido/${partido.id}/historial`, T.jugador)).status, 403, 'el deportista no ve el registro');
});

test('CP-CNV-008 [RF-18] El inicio muestra la convocatoria: la propia al deportista y el resumen al entrenador', async () => {
  const j = (await llamar('GET', '/api/dashboard/inicio', T.jugador)).datos.convocatoria;
  assert.equal(j.partido_id, partido.id);
  assert.equal(j.rol, 'titular');
  const e = (await llamar('GET', '/api/dashboard/inicio', T.entrenador)).datos.convocatoria;
  assert.equal(e.publicada, true);
  assert.equal(e.total, 3);
});

test('CP-CNV-009 [RF-20] Los avisos se marcan como leídos y nadie ve los de otro', async () => {
  const a = await avisos(T.jugador);
  assert.ok(a.sin_leer >= 1);
  assert.equal((await llamar('PATCH', `/api/notificaciones/${a.avisos[0].id}/leida`, T.entrenador)).status, 404, 'no puede marcar avisos ajenos');
  assert.equal((await llamar('PATCH', `/api/notificaciones/${a.avisos[0].id}/leida`, T.jugador)).status, 200);
  await llamar('PATCH', '/api/notificaciones/leidas', T.jugador);
  assert.equal((await avisos(T.jugador)).sin_leer, 0);
});

test('CP-CNV-010 [RF-20] Guardar sin hora ni lugar no borra los que ya estaban', async () => {
  await guardar(T.administrador, { convocados: [{ jugador_id: propio, rol: 'titular' }, { jugador_id: otros[0], rol: 'titular' }, { jugador_id: otros[1], rol: 'suplente' }] });
  const r = (await llamar('GET', `/api/convocatorias/partido/${partido.id}`, T.entrenador)).datos.convocatoria;
  assert.equal(r.hora_presentacion, '14:00');
  assert.equal(r.lugar, 'Cancha principal');
});
