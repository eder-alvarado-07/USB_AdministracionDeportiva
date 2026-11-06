// Funcionalidad de cada módulo: lectura, alta, edición y baja (RF-03 a RF-17)
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, sql } = require('../utilidades/api');

const PRE = 'ZZ prueba ';   // prefijo para identificar y limpiar los datos creados
const T = {};
const cerca = (a, b, n) => assert.ok(Math.abs(Number(a) - b) <= 0.1, `${n}: obtenido ${a}, esperado ${b} ± 0,1`);

test.before(async () => {
  await iniciar();
  for (const rol of ['administrador', 'entrenador', 'salud']) T[rol] = await token(rol);
  // v2.0: el entrenador siempre elige el equipo de la actividad (las generales son solo del administrador)
  ;({ rows: [{ id: T.equipo }] } = await sql(`SELECT id FROM equipos WHERE nombre = 'Unisimón Rugby (demo)'`));
});
test.after(async () => {
  await sql(`DELETE FROM jugadores WHERE nombre LIKE $1`, [PRE + '%']);
  await sql(`DELETE FROM equipos WHERE nombre LIKE $1`, [PRE + '%']);
  await sql(`DELETE FROM entrenamientos WHERE tipo LIKE $1`, [PRE + '%']);
  await sql(`DELETE FROM partidos WHERE rival LIKE $1`, [PRE + '%']);
  await sql(`DELETE FROM disciplinas WHERE nombre LIKE $1`, [PRE + '%']);
  await sql(`DELETE FROM usuarios WHERE email LIKE 'zz.prueba%'`);
  await cerrar(__filename);
});

async function jugadorDePrueba(extra = {}) {
  const r = await llamar('POST', '/api/jugadores', T.administrador, { nombre: `${PRE}Jugador ${Date.now()}`, genero: 'masculino', ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.datos));
  return r.datos.id;
}

test('CP-MOD-001 [RF-18] Todos los módulos responden a la lectura (administrador)', async () => {
  const rutas = ['/api/equipos', '/api/disciplinas', '/api/jugadores', '/api/entrenamientos', '/api/asistencia',
    '/api/lesiones', '/api/evaluaciones', '/api/partidos', '/api/estadisticas', '/api/dashboard', '/api/dashboard/inicio',
    '/api/usuarios', '/api/settings/team', '/api/salud/historias', '/api/salud/controles',
    '/api/salud/seguimientos-lesiones', '/api/salud/notificaciones', '/api/head-coach/resumen'];
  for (const ruta of rutas) {
    const r = await llamar('GET', ruta, T.administrador);
    assert.equal(r.status, 200, `${ruta}: ${r.status} ${JSON.stringify(r.datos)?.slice(0, 120)}`);
  }
});

test('CP-MOD-002 [RF-03] Usuarios: crear, editar, restablecer y desactivar', async () => {
  const email = `zz.prueba.${Date.now()}@test.com`;
  const c = await llamar('POST', '/api/usuarios', T.administrador, { nombre: 'ZZ Usuario', email, password: 'Prueba123!', rol: 'entrenador' });
  assert.equal(c.status, 201);
  const e = await llamar('PUT', `/api/usuarios/${c.datos.id}`, T.administrador, { nombre: 'ZZ Usuario Editado', email, rol: 'personal_salud', activo: true });
  assert.equal(e.status, 200);
  const r = await llamar('PUT', `/api/usuarios/${c.datos.id}/reset`, T.administrador, { password: 'Otra123!' });
  assert.equal(r.status, 200);
  assert.equal((await llamar('POST', '/api/auth/login', null, { email, password: 'Otra123!' })).status, 200, 'entra con la clave restablecida');
  assert.equal((await llamar('DELETE', `/api/usuarios/${c.datos.id}`, T.administrador)).status, 200);
  assert.equal((await llamar('POST', '/api/auth/login', null, { email, password: 'Otra123!' })).status, 401, 'desactivado no entra');
});

test('CP-MOD-003 [RF-06] Deportes: crear y eliminar', async () => {
  const c = await llamar('POST', '/api/disciplinas', T.administrador, { nombre: `${PRE}Voleibol` });
  assert.equal(c.status, 201);
  assert.equal((await llamar('DELETE', `/api/disciplinas/${c.datos.id}`, T.administrador)).status, 200);
});

test('CP-MOD-004 [RF-07] Equipos: crear, ver nómina, editar y eliminar', async () => {
  const c = await llamar('POST', '/api/equipos', T.administrador, { nombre: `${PRE}Equipo`, categoria: 'Sub-20' });
  assert.equal(c.status, 201);
  const j = await jugadorDePrueba({ equipo_id: c.datos.id });
  const detalle = await llamar('GET', `/api/equipos/${c.datos.id}`, T.administrador);
  assert.equal(detalle.status, 200);
  assert.ok(JSON.stringify(detalle.datos).includes(String(j)), 'la nómina incluye al jugador');
  assert.equal((await llamar('PUT', `/api/equipos/${c.datos.id}`, T.administrador, { nombre: `${PRE}Equipo B`, categoria: 'Sub-21' })).status, 200);
  assert.equal((await llamar('DELETE', `/api/equipos/${c.datos.id}`, T.administrador)).status, 200);
  const { rows: [fila] } = await sql('SELECT equipo_id FROM jugadores WHERE id = $1', [j]);
  assert.equal(fila.equipo_id, null, 'el jugador queda sin equipo al eliminarlo');
});

test('CP-MOD-005 [RF-08] Deportistas: crear, ver ficha, editar parcialmente y eliminar', async () => {
  const id = await jugadorDePrueba({ edad: 20, posicion: 'Ala' });
  const ficha = await llamar('GET', `/api/jugadores/${id}`, T.administrador);
  assert.equal(ficha.status, 200);
  assert.ok('ultima_antropometria' in ficha.datos && 'ultima_evaluacion' in ficha.datos);
  assert.equal((await llamar('PUT', `/api/jugadores/${id}`, T.administrador, { posicion: 'Centro' })).status, 200);
  const { rows: [fila] } = await sql('SELECT posicion, edad FROM jugadores WHERE id = $1', [id]);
  assert.equal(fila.posicion, 'Centro');
  assert.equal(fila.edad, 20, 'la edición parcial no borra los demás campos');
  assert.equal((await llamar('DELETE', `/api/jugadores/${id}`, T.administrador)).status, 200);
});

test('CP-MOD-006 [RF-10] Entrenamientos: crear, editar y eliminar', async () => {
  const c = await llamar('POST', '/api/entrenamientos', T.entrenador, { fecha: '2026-11-02', tipo: `${PRE}Fuerza`, descripcion: 'Gimnasio', equipo_id: T.equipo });
  assert.equal(c.status, 201);
  assert.equal((await llamar('PUT', `/api/entrenamientos/${c.datos.id}`, T.entrenador, { fecha: '2026-11-03', tipo: `${PRE}Fuerza`, descripcion: 'Cambio' })).status, 200);
  assert.equal((await llamar('DELETE', `/api/entrenamientos/${c.datos.id}`, T.entrenador)).status, 200);
});

test('CP-MOD-007 [RF-11] Asistencia: registrar y corregir', async () => {
  const e = await llamar('POST', '/api/entrenamientos', T.entrenador, { fecha: '2026-11-04', tipo: `${PRE}Táctica`, equipo_id: T.equipo });
  // v2.0: el entrenador solo toma asistencia a sus propios deportistas
  const j = (await llamar('GET', '/api/jugadores', T.entrenador)).datos[0].id;
  const a = await llamar('POST', '/api/asistencia', T.entrenador, { jugador_id: j, entrenamiento_id: e.datos.id, asistencia: true });
  assert.equal(a.status, 201);
  assert.equal((await llamar('PUT', `/api/asistencia/${a.datos.id}`, T.entrenador, { asistencia: false })).status, 200);
  const { rows: [fila] } = await sql('SELECT asistencia FROM asistencia_entrenamiento WHERE id = $1', [a.datos.id]);
  assert.equal(fila.asistencia, false);
});

test('CP-MOD-008 [RF-12] Partidos: crear con resultado, editar y eliminar', async () => {
  const c = await llamar('POST', '/api/partidos', T.entrenador, { fecha: '2026-11-08', rival: `${PRE}Rival`, tipo: 'amistoso', equipo_id: T.equipo });
  assert.equal(c.status, 201);
  assert.equal((await llamar('PUT', `/api/partidos/${c.datos.id}`, T.entrenador, { fecha: '2026-11-08', rival: `${PRE}Rival`, tipo: 'amistoso', resultado: '21-14' })).status, 200);
  assert.equal((await llamar('DELETE', `/api/partidos/${c.datos.id}`, T.entrenador)).status, 200);
});

test('CP-MOD-009 [RF-13] Estadísticas: registrar, consultar por jugador y eliminar', async () => {
  const j = await jugadorDePrueba();
  const c = await llamar('POST', '/api/estadisticas', T.administrador, { jugador_id: j, goles: 2, asistencias: 1, minutos_jugados: 80 });
  assert.equal(c.status, 201);
  const por = await llamar('GET', `/api/estadisticas/jugador/${j}`, T.administrador);
  assert.equal(por.status, 200);
  assert.equal((await llamar('DELETE', `/api/estadisticas/${c.datos.id}`, T.administrador)).status, 200);
});

test('CP-MOD-010 [RF-14] Lesiones: el personal de salud registra, edita y da de alta', async () => {
  const j = await jugadorDePrueba();
  const c = await llamar('POST', '/api/lesiones', T.salud, { jugador_id: j, tipo: 'Esguince', fecha_inicio: '2026-10-01' });
  assert.equal(c.status, 201);
  const alta = await llamar('PUT', `/api/lesiones/${c.datos.id}`, T.salud, { jugador_id: j, tipo: 'Esguince', fecha_inicio: '2026-10-01', fecha_fin: '2026-10-09' });
  assert.equal(alta.status, 200);
  assert.equal((await llamar('DELETE', `/api/lesiones/${c.datos.id}`, T.salud)).status, 200);
});

test('CP-MOD-011 [RF-15] Salud: historia clínica, control médico y seguimiento de lesión', async () => {
  const j = await jugadorDePrueba();
  const h = await llamar('POST', '/api/salud/historias', T.salud, { jugador_id: j, alergias: 'Penicilina' });
  assert.equal(h.status, 200);
  const h2 = await llamar('POST', '/api/salud/historias', T.salud, { jugador_id: j, alergias: 'Ninguna' });
  assert.equal(h2.datos.id, h.datos.id, 'la historia se actualiza, no se duplica');
  const c = await llamar('POST', '/api/salud/controles', T.salud, { jugador_id: j, tipo: 'Precompetitivo', aptitud: 'apto_restricciones', restricciones: 'Sin contacto' });
  assert.equal(c.status, 201);
  const l = await llamar('POST', '/api/lesiones', T.salud, { jugador_id: j, tipo: 'Desgarro', fecha_inicio: '2026-10-05' });
  const s = await llamar('POST', '/api/salud/seguimientos-lesiones', T.salud, { lesion_id: l.datos.id, gravedad: 'leve', estado: 'en_recuperacion' });
  assert.equal(s.status, 201);
});

test('CP-MOD-012 [RF-16] Evaluación de rugby: puntajes normalizados exactos', async () => {
  const j = await jugadorDePrueba();
  const r = await llamar('POST', '/api/evaluaciones', T.administrador, {
    jugador_id: j, fecha: '2026-10-10', sprint_30m: 4.2, salto_vertical: 55, resistencia_yoyo: 1600, porcentaje_grasa: 12, masa_muscular: 40,
  });
  assert.equal(r.status, 201);
  // Escala 0-100 entre peor y mejor referencia: sprint 76, salto 70, yo-yo 67, grasa 76, músculo 60, general 70
  assert.deepEqual(
    [r.datos.score_velocidad, r.datos.score_potencia, r.datos.score_resistencia, r.datos.score_grasa, r.datos.score_musculo, r.datos.score_general],
    [76, 70, 67, 76, 60, 70]);
});

test('CP-MOD-013 [RF-17] Antropometría: el backend guarda cálculos exactos', async () => {
  const j = await jugadorDePrueba();
  const r = await llamar('POST', '/api/antropometria', T.salud, {
    jugador_id: j, fecha: '2026-10-10', peso: 80, estatura: 1.80,
    pliegue_biceps: 4.5, pliegue_triceps: 8, pliegue_subescapular: 9.5, pliegue_suprailiaco: 11,
    pliegue_supraespinal: 7.5, pliegue_abdominal: 12, pliegue_muslo_anterior: 10.5, pliegue_pierna_medial: 7,
    perimetro_brazo_contraido: 35, perimetro_pierna: 37.5, diametro_humero: 6.8, diametro_femur: 9.6,
  });
  assert.equal(r.status, 201, JSON.stringify(r.datos));
  const { rows: [g] } = await sql('SELECT * FROM antropometria WHERE id = $1', [r.datos.id]);
  cerca(g.imc, 24.69, 'IMC');
  cerca(g.porcentaje_grasa, 8.3, '% grasa (Yuhasz, hombre)');
  cerca(g.masa_mineral_osea, 13.81, 'masa ósea (Rocha)');
  cerca(g.endomorfia, 2.35, 'endomorfia');
  cerca(g.mesomorfia, 4.88, 'mesomorfia');
  cerca(g.ectomorfia, 2.0, 'ectomorfia');
});
