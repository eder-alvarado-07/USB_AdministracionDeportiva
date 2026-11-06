// v2.0: errores reportados en el documento "Errores en ejecución" (DEF-040 a DEF-044)
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, sql } = require('../utilidades/api');

const T = {};
let equipoDemo, entrenamiento, jugadorPropio;

test.before(async () => {
  await iniciar();
  for (const rol of ['administrador', 'entrenador', 'entrenador2', 'jugador']) T[rol] = await token(rol);
  ({ rows: [{ id: equipoDemo }] } = await sql(`SELECT id FROM equipos WHERE nombre = 'Unisimón Rugby (demo)'`));
  const e = await llamar('POST', '/api/entrenamientos', T.entrenador, { fecha: '2026-12-10', tipo: 'ZZ v2 sesión', equipo_id: equipoDemo });
  entrenamiento = e.datos.id;
  jugadorPropio = (await llamar('GET', '/api/jugadores', T.entrenador)).datos[0].id;
});
test.after(async () => {
  await sql(`DELETE FROM entrenamientos WHERE tipo LIKE 'ZZ v2%'`);
  await sql(`DELETE FROM partidos WHERE rival LIKE 'ZZ v2%'`);
  await sql(`DELETE FROM usuarios WHERE email LIKE 'zzv2%'`);
  await sql(`DELETE FROM jugadores WHERE nombre LIKE 'ZZ v2%'`);
  await cerrar(__filename);
});

test('CP-V2-001 DEF-040 La fecha de un partido se devuelve tal como se guardó (sin desfase de zona horaria)', async () => {
  const c = await llamar('POST', '/api/partidos', T.administrador, { fecha: '2026-10-12', rival: 'ZZ v2 fecha', tipo: 'liga', equipo_id: equipoDemo });
  assert.equal(c.status, 201);
  const p = (await llamar('GET', `/api/partidos/${c.datos.id}`, T.administrador)).datos;
  assert.equal(p.fecha, '2026-10-12');
});

test('CP-V2-002 DEF-041 La asistencia se guarda como verdadero/falso y no se duplica', async () => {
  for (const valor of [1, true, false, true]) {
    const r = await llamar('POST', '/api/asistencia', T.entrenador, { jugador_id: jugadorPropio, entrenamiento_id: entrenamiento, asistencia: valor });
    assert.equal(r.status, 201);
  }
  const lista = (await llamar('GET', `/api/asistencia?entrenamiento_id=${entrenamiento}`, T.entrenador)).datos
    .filter(a => a.jugador_id === jugadorPropio);
  assert.equal(lista.length, 1, 'un solo registro');
  assert.equal(lista[0].asistencia, true);
  const lote = await llamar('PUT', '/api/asistencia/lote', T.entrenador, { entrenamiento_id: entrenamiento, jugadores: [jugadorPropio], asistencia: false });
  assert.equal(lote.datos.actualizados, 1);
  const ajeno = await llamar('POST', '/api/asistencia', T.entrenador2, { jugador_id: jugadorPropio, entrenamiento_id: entrenamiento, asistencia: true });
  assert.ok([403, 404].includes(ajeno.status), 'otro entrenador no marca deportistas ajenos');
});

test('CP-V2-003 DEF-042 Solo el administrador crea actividades generales', async () => {
  const r = await llamar('POST', '/api/entrenamientos', T.entrenador, { fecha: '2026-12-11', tipo: 'ZZ v2 general' });
  assert.equal(r.status, 400);
  assert.match(r.datos.error, /Elige el equipo/);
  const a = await llamar('POST', '/api/entrenamientos', T.administrador, { fecha: '2026-12-11', tipo: 'ZZ v2 general' });
  assert.equal(a.status, 201);
});

test('CP-V2-004 DEF-043 Un usuario desactivado se puede reactivar y vuelve a entrar', async () => {
  const c = await llamar('POST', '/api/usuarios', T.administrador, { nombre: 'ZZ v2 salud', email: 'zzv2salud@x.com', password: 'Prueba123*', rol: 'personal_salud' });
  assert.equal(c.status, 201);
  await llamar('DELETE', `/api/usuarios/${c.datos.id}`, T.administrador);
  assert.equal((await llamar('POST', '/api/auth/login', null, { email: 'zzv2salud@x.com', password: 'Prueba123*' })).status, 401);
  assert.equal((await llamar('PATCH', `/api/usuarios/${c.datos.id}/activar`, T.administrador)).status, 200);
  assert.equal((await llamar('POST', '/api/auth/login', null, { email: 'zzv2salud@x.com', password: 'Prueba123*' })).status, 200);
});

test('CP-V2-005 Crear un deportista desde Usuarios crea su ficha con deporte y edad calculada', async () => {
  const { rows: [{ id: rugby }] } = await sql(`SELECT id FROM disciplinas WHERE nombre = 'Rugby'`);
  const c = await llamar('POST', '/api/usuarios', T.administrador, {
    nombre: 'ZZ v2 deportista', email: 'zzv2dep@x.com', password: 'Prueba123*', rol: 'jugador',
    ficha: { disciplina_id: rugby, equipo_id: equipoDemo, fecha_nacimiento: '2004-03-15', posicion: 'Ala' } });
  assert.equal(c.status, 201, JSON.stringify(c.datos));
  assert.ok(c.datos.jugador_id);
  const j = (await llamar('GET', `/api/jugadores/${c.datos.jugador_id}`, T.administrador)).datos;
  assert.equal(j.disciplina_id, rugby);
  assert.equal(j.fecha_nacimiento, '2004-03-15');
  assert.ok(j.edad >= 22);
  const sinDeporte = await llamar('POST', '/api/usuarios', T.administrador, { nombre: 'ZZ v2 x', email: 'zzv2x@x.com', password: 'Prueba123*', rol: 'jugador', ficha: {} });
  assert.equal(sinDeporte.status, 400);
});

test('CP-V2-006 Categorías por deporte: solo el administrador las crea', async () => {
  const { rows: [{ id: rugby }] } = await sql(`SELECT id FROM disciplinas WHERE nombre = 'Rugby'`);
  assert.equal((await llamar('POST', `/api/disciplinas/${rugby}/categorias`, T.entrenador, { nombre: 'ZZ v2 cat' })).status, 403);
  const c = await llamar('POST', `/api/disciplinas/${rugby}/categorias`, T.administrador, { nombre: 'ZZ v2 cat' });
  assert.equal(c.status, 201);
  assert.ok((await llamar('GET', '/api/disciplinas/categorias', T.administrador)).datos.some(x => x.nombre === 'ZZ v2 cat'));
  assert.equal((await llamar('DELETE', `/api/disciplinas/categorias/${c.datos.id}`, T.administrador)).status, 200);
});
