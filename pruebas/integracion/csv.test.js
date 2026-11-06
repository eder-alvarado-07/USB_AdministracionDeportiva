// Importación por CSV (interoperabilidad, métrica M-F6; RF-03, RF-08, RF-09)
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, llamarFormulario, token, sql } = require('../utilidades/api');

let A;
test.before(async () => { await iniciar(); A = await token('administrador'); });
test.after(async () => {
  await sql(`DELETE FROM jugadores WHERE nombre LIKE 'ZZ csv%'`);
  await sql(`DELETE FROM equipos WHERE nombre = 'ZZ CSV Equipo'`);
  await sql(`DELETE FROM disciplinas WHERE nombre = 'ZZ CSV Deporte'`);
  await sql(`DELETE FROM usuarios WHERE email LIKE 'zz.csv%'`);
  await cerrar(__filename);
});

test('CP-CSV-001 [RF-08] Importa las filas válidas y reporta las inválidas', async () => {
  const r = await llamar('POST', '/api/jugadores/bulk', A, { deportistas: [
    { nombre: 'ZZ csv Uno', edad: '21', posicion: 'Ala', deporte: 'ZZ CSV Deporte', equipo: 'ZZ CSV Equipo' },
    { nombre: 'ZZ csv Dos', edad: '22', deporte: 'ZZ CSV Deporte', equipo: 'ZZ CSV Equipo' },
    { nombre: 'ZZ csv Tres', peso: '70.5', altura: '1.75' },
    { nombre: '', edad: '30' },
  ] });
  assert.equal(r.status, 201);
  assert.equal(r.datos.total, 3, 'las 3 filas válidas');
  assert.equal(r.datos.errores.length, 1, 'la fila sin nombre se reporta');
  const { rows } = await sql(`SELECT COUNT(*)::int AS n FROM jugadores j JOIN equipos e ON e.id = j.equipo_id WHERE e.nombre = 'ZZ CSV Equipo'`);
  assert.equal(rows[0].n, 2, 'el equipo se crea por nombre y agrupa a sus jugadores');
});

test('CP-CSV-002 [RF-09] Dorsal repetido o inválido: se importa sin dorsal y se avisa', async () => {
  const r = await llamar('POST', '/api/jugadores/bulk', A, { deportistas: [
    { nombre: 'ZZ csv Cinco', equipo: 'ZZ CSV Equipo', dorsal: '5' },
    { nombre: 'ZZ csv Cinco bis', equipo: 'ZZ CSV Equipo', dorsal: '5' },
    { nombre: 'ZZ csv Letra', equipo: 'ZZ CSV Equipo', dorsal: 'abc' },
  ] });
  assert.equal(r.status, 201);
  assert.equal(r.datos.total, 3);
  assert.equal(r.datos.avisos.length, 2);
  const { rows } = await sql(`SELECT nombre, dorsal FROM jugadores WHERE nombre IN ('ZZ csv Cinco', 'ZZ csv Cinco bis') ORDER BY nombre`);
  assert.deepEqual(rows.map(x => x.dorsal), [5, null]);
});

test('CP-CSV-003 [RF-03] Carga de usuarios por CSV: crea los válidos y reporta errores', async () => {
  const csv = [
    'nombre,email,password,rol',
    'ZZ Csv Entrenador,zz.csv.ent@test.com,Clave123!,entrenador',
    'ZZ Csv Salud,zz.csv.salud@test.com,Clave123!,personal_salud',
    'ZZ Csv Malo,zz.csv.malo@test.com,Clave123!,superusuario',
    'ZZ Csv Incompleto,,Clave123!,jugador',
  ].join('\n');
  const form = new FormData();
  form.append('archivo', new Blob([csv], { type: 'text/csv' }), 'usuarios.csv');
  const r = await llamarFormulario('/api/usuarios/csv', A, form);
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  assert.equal(r.datos.creados, 2);
  assert.equal(r.datos.errores.length, 2, 'rol inválido y fila incompleta');
});
