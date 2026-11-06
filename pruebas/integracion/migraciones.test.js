// Instalación del esquema y migración desde la versión original (RNF-09, métrica M-P4)
// Usa bases temporales propias, distintas de la base de pruebas principal.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { credenciales, RAIZ } = require('../utilidades/bd');
const { Client } = require(path.join(RAIZ, 'node_modules', 'pg'));

const BD_LIMPIA = 'dt_deportivo_pruebas_limpia';
const BD_V1 = 'dt_deportivo_pruebas_v1';

async function recrear(nombre) {
  const c = new Client(credenciales('postgres'));
  await c.connect();
  await c.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [nombre]);
  await c.query(`DROP DATABASE IF EXISTS ${nombre}`);
  if (nombre) await c.query(`CREATE DATABASE ${nombre}`);
  await c.end();
}
async function borrar(nombre) {
  const c = new Client(credenciales('postgres'));
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS ${nombre}`);
  await c.end();
}
async function conectar(nombre) {
  const c = new Client(credenciales(nombre));
  await c.connect();
  return c;
}
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test.after(async () => { await borrar(BD_LIMPIA); await borrar(BD_V1); });

test('CP-MIG-001 [RNF-09] database.sql crea el esquema completo en una base vacía y se puede repetir', async () => {
  await recrear(BD_LIMPIA);
  const c = await conectar(BD_LIMPIA);
  await c.query(leer('backend/config/database.sql'));
  await c.query(leer('backend/config/database.sql'));
  const { rows: [t] } = await c.query(`SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`);
  const { rows: [j] } = await c.query('SELECT COUNT(*)::int AS n FROM jugadores');
  await c.end();
  assert.equal(t.n, 22, 'tablas creadas (v2.0: categorias)');
  assert.equal(j.n, 5, 'las semillas no se duplican al repetir');
});

test('CP-MIG-002 [RNF-09] Una base de la versión original se migra sin perder datos', async () => {
  await recrear(BD_V1);
  const c = await conectar(BD_V1);
  // Esquema de la versión original tal como está en el repositorio (etiqueta v1-original).
  // Tenía un error de orden (equipos referencia a disciplinas antes de crearla): se crea disciplinas primero.
  const esquemaV1 = execSync('git show v1-original:backend/config/database.sql', { cwd: RAIZ, encoding: 'utf8' });
  await c.query('CREATE TABLE disciplinas (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
  await c.query(esquemaV1);
  const { rows: [antes] } = await c.query('SELECT (SELECT COUNT(*) FROM jugadores)::int AS jugadores, (SELECT COUNT(*) FROM partidos)::int AS partidos');

  // Todas las migraciones, en orden; se aplican dos veces para comprobar que se pueden repetir
  const migraciones = fs.readdirSync(path.join(RAIZ, 'backend', 'migrations')).filter(f => f.endsWith('.sql')).sort();
  for (const vuelta of [1, 2]) for (const m of migraciones) await c.query(leer(`backend/migrations/${m}`));
  const { rows: [despues] } = await c.query('SELECT (SELECT COUNT(*) FROM jugadores)::int AS jugadores, (SELECT COUNT(*) FROM partidos)::int AS partidos');
  const { rows: cols } = await c.query(`SELECT table_name || '.' || column_name AS c FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name IN ('dorsal', 'genero', 'entrenador_id', 'head_coach_id', 'logo_url')`);
  const { rows: [t] } = await c.query(`SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`);
  const { rows: [r] } = await c.query(`SELECT COUNT(*)::int AS n FROM pg_constraint WHERE conname LIKE 'chk\_%'`);
  await c.end();

  assert.deepEqual(despues, antes, 'se conservan todas las filas');
  assert.equal(r.n, 12, 'rangos válidos de las migraciones 004 a 006');
  assert.deepEqual(cols.map(x => x.c).sort(),
    ['equipos.logo_url', 'jugadores.dorsal', 'jugadores.entrenador_id', 'jugadores.genero', 'usuarios.head_coach_id']);
  assert.equal(t.n, 21, 'queda con las mismas tablas que una instalación nueva');
});
