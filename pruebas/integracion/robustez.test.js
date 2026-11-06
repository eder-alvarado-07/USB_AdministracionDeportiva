// Tolerancia a fallos y resistencia a inyección (RNF-01, RNF-03; métricas M-R3 y M-F5)
// Una entrada inválida debe rechazarse con 4xx y un mensaje, nunca con un error 500.
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, sql } = require('../utilidades/api');

let A;
test.before(async () => { await iniciar(); A = await token('administrador'); });
test.after(async () => {
  await sql(`DELETE FROM jugadores WHERE nombre LIKE 'ZZ robustez%'`);
  await sql(`DELETE FROM antropometria WHERE categoria = 'ZZ robustez'`);
  await cerrar(__filename);
});

const rechaza = (r, contexto) => {
  assert.ok(r.status >= 400 && r.status < 500, `${contexto}: esperaba 4xx y llegó ${r.status} ${JSON.stringify(r.datos)?.slice(0, 120)}`);
  assert.ok(r.datos?.error, `${contexto}: debe explicar el error`);
};

// ── Inyección SQL ─────────────────────────────────────────────
test('CP-SEG-001 [RNF-01] Inyección en el inicio de sesión no da acceso', async () => {
  for (const email of ["' OR '1'='1", "admin@dtdeportivo.com' --", "x' UNION SELECT * FROM usuarios --"]) {
    const r = await llamar('POST', '/api/auth/login', null, { email, password: "' OR '1'='1" });
    assert.equal(r.status, 401, email);
  }
});

test('CP-SEG-002 [RNF-01] Inyección en filtros de búsqueda no altera la consulta', async () => {
  const r = await llamar('GET', `/api/jugadores?posicion=${encodeURIComponent("' OR 1=1 --")}`, A);
  assert.equal(r.status, 200);
  assert.equal(r.datos.length, 0, 'el texto se busca literalmente');
});

test('CP-SEG-003 [RNF-01] Nombres de columna en el cuerpo no se inyectan (lista blanca)', async () => {
  const { rows: [j] } = await sql('SELECT id FROM jugadores LIMIT 1');
  const r = await llamar('POST', '/api/antropometria', A, {
    jugador_id: j.id, fecha: '2026-10-10', peso: 70, categoria: 'ZZ robustez',
    'id) VALUES (1); DROP TABLE jugadores; --': 'x', campo_inexistente: 'x',
  });
  assert.equal(r.status, 201);
  const { rows } = await sql('SELECT COUNT(*)::int AS n FROM jugadores');
  assert.ok(rows[0].n > 0, 'la tabla jugadores sigue existiendo');
});

// ── Entradas inválidas que se manejan bien ─────────────────────
test('CP-SEG-004 [RNF-03] Campos obligatorios faltantes devuelven 400', async () => {
  rechaza(await llamar('POST', '/api/jugadores', A, {}), 'jugador sin nombre');
  rechaza(await llamar('POST', '/api/entrenamientos', A, { tipo: 'Sin fecha' }), 'entrenamiento sin fecha');
  rechaza(await llamar('POST', '/api/partidos', A, { rival: 'Sin fecha ni tipo' }), 'partido incompleto');
  rechaza(await llamar('POST', '/api/lesiones', A, { tipo: 'Sin jugador' }), 'lesión sin jugador');
  rechaza(await llamar('POST', '/api/asistencia', A, { asistencia: true }), 'asistencia sin jugador');
  rechaza(await llamar('POST', '/api/usuarios', A, { nombre: 'Sin correo' }), 'usuario incompleto');
  rechaza(await llamar('POST', '/api/usuarios', A, { nombre: 'X', email: 'x@x.com', password: 'Prueba123!', rol: 'superusuario' }), 'rol inválido');
});

test('CP-SEG-005 [RNF-03] Recurso inexistente devuelve 404', async () => {
  for (const ruta of ['/api/jugadores/999999', '/api/lesiones/999999', '/api/entrenamientos/999999', '/api/partidos/999999']) {
    assert.equal((await llamar('GET', ruta, A)).status, 404, ruta);
  }
});

// ── Entradas inválidas que hasta v1.3 terminaban en error 500 (DEF-015 a DEF-018, corregidos en v1.4) ──
test('CP-SEG-006 [RNF-03] Identificador no numérico en la URL', async () => {
  rechaza(await llamar('GET', '/api/jugadores/abc', A), 'GET /api/jugadores/abc');
});

test('CP-SEG-007 [RNF-03] Filtro de deporte no numérico', async () => {
  rechaza(await llamar('GET', '/api/jugadores?disciplina_id=1%20OR%201%3D1', A), 'disciplina_id no numérico');
});

test('CP-SEG-008 [RNF-03] Fecha con formato inválido', async () => {
  rechaza(await llamar('POST', '/api/entrenamientos', A, { fecha: 'mañana', tipo: 'ZZ' }), 'fecha inválida');
});

test('CP-SEG-009 [RNF-03] Tipo de partido fuera de la lista (liga o amistoso)', async () => {
  rechaza(await llamar('POST', '/api/partidos', A, { fecha: '2026-11-01', rival: 'ZZ', tipo: 'final' }), 'tipo de partido');
});

test('CP-SEG-010 [RNF-03] Referencia a un jugador inexistente', async () => {
  rechaza(await llamar('POST', '/api/lesiones', A, { jugador_id: 999999, fecha_inicio: '2026-10-01' }), 'lesión de jugador inexistente');
  rechaza(await llamar('POST', '/api/asistencia', A, { jugador_id: 999999, entrenamiento_id: 1 }), 'asistencia de jugador inexistente');
});

test('CP-SEG-011 [RNF-03] Valores numéricos imposibles (negativos)', async () => {
  const { rows: [j] } = await sql('SELECT id FROM jugadores LIMIT 1');
  rechaza(await llamar('POST', '/api/estadisticas', A, { jugador_id: j.id, goles: -5 }), 'goles negativos');
  rechaza(await llamar('POST', '/api/jugadores', A, { nombre: 'ZZ robustez', edad: -3, peso: -70 }), 'edad y peso negativos');
});

test('CP-SEG-012 [RNF-03] Correo de usuario repetido', async () => {
  rechaza(await llamar('POST', '/api/usuarios', A, { nombre: 'Repetido', email: 'salud@dtdeportivo.com', password: 'Prueba123!', rol: 'jugador' }), 'correo repetido');
});

test('CP-SEG-013 [RNF-01] Un error interno no expone detalles de la base de datos', async () => {
  const r = await llamar('GET', '/api/jugadores/abc', A);
  const mensaje = JSON.stringify(r.datos || {});
  assert.ok(!/sintaxis|relación|viola|restricción|llave foránea|syntax|constraint|relation/i.test(mensaje),
    `el mensaje revela detalles internos: ${mensaje.slice(0, 120)}`);
});
