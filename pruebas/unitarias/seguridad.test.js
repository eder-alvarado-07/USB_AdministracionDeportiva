// Hash de contraseñas y lectura de secretos, sin base de datos (RNF-01)
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const { hashClave, verificarClave, claveAleatoria } = require(path.join(RAIZ, 'backend', 'utils', 'claves'));

test('CP-UNI-010 [RNF-01] scrypt verifica la clave correcta y rechaza la incorrecta', async () => {
  const u = await hashClave('Clave.Segura1');
  assert.match(u.password_hash, /^scrypt\$/);
  assert.equal(u.salt.length, 32);
  assert.deepEqual(await verificarClave('Clave.Segura1', u), { valida: true, rehacer: false });
  assert.equal((await verificarClave('Clave.segura1', u)).valida, false);
  assert.equal((await verificarClave('', u)).valida, false);
});

test('CP-UNI-011 [RNF-01] Un hash antiguo (HMAC-SHA256) es válido y pide actualizarse', async () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const u = { salt, password_hash: crypto.createHmac('sha256', salt).update('Vieja.1').digest('hex') };
  assert.deepEqual(await verificarClave('Vieja.1', u), { valida: true, rehacer: true });
  assert.deepEqual(await verificarClave('Otra.1', u), { valida: false, rehacer: false });
  assert.equal((await verificarClave('x', { salt, password_hash: '' })).valida, false, 'hash vacío nunca es válido');
});

test('CP-UNI-012 [RNF-01] Las claves aleatorias iniciales son distintas y de largo suficiente', () => {
  const claves = new Set(Array.from({ length: 50 }, claveAleatoria));
  assert.equal(claves.size, 50);
  for (const c of claves) assert.ok(c.length >= 12, c);
});

// Ejecuta secretos.js en un proceso aparte, desde una carpeta sin .env
function cargarSecretos(env) {
  const r = spawnSync(process.execPath, ['-e', `const s = require(${JSON.stringify(path.join(RAIZ, 'backend', 'config', 'secretos.js'))}); console.log(JSON.stringify(s))`], {
    cwd: os.tmpdir(), encoding: 'utf8',
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_PATH: path.join(RAIZ, 'node_modules'), ...env },
  });
  return { codigo: r.status, salida: r.stdout, errores: r.stderr };
}

test('CP-UNI-013 [RNF-01] En producción el servidor no arranca sin secretos JWT válidos', () => {
  assert.notEqual(cargarSecretos({ NODE_ENV: 'production' }).codigo, 0, 'sin secretos');
  assert.notEqual(cargarSecretos({ NODE_ENV: 'production', JWT_SECRET: 'corto', JWT_REFRESH_SECRET: 'corto' }).codigo, 0, 'secretos cortos');
  assert.notEqual(cargarSecretos({ NODE_ENV: 'production', JWT_SECRET: 'dtdeportivo_jwt_default_secret_key', JWT_REFRESH_SECRET: 'dtdeportivo_refresh_default_secret_key' }).codigo, 0, 'secretos antiguos');
  const igual = 'a'.repeat(40);
  assert.notEqual(cargarSecretos({ NODE_ENV: 'production', JWT_SECRET: igual, JWT_REFRESH_SECRET: igual }).codigo, 0, 'secretos iguales');
  const ok = cargarSecretos({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40) });
  assert.equal(ok.codigo, 0, ok.errores);
});

test('CP-UNI-014 [RNF-01] En desarrollo, sin secretos se usa uno temporal aleatorio y se avisa', () => {
  const a = cargarSecretos({ NODE_ENV: 'development' });
  const b = cargarSecretos({ NODE_ENV: 'development' });
  assert.equal(a.codigo, 0, a.errores);
  assert.match(a.errores, /no está configurado/);
  const sa = JSON.parse(a.salida.trim().split('\n').pop());
  const sb = JSON.parse(b.salida.trim().split('\n').pop());
  assert.ok(sa.JWT_SECRET.length >= 64);
  assert.notEqual(sa.JWT_SECRET, sb.JWT_SECRET, 'cambia en cada arranque');
  assert.notEqual(sa.JWT_SECRET, sa.JWT_REFRESH_SECRET);
  assert.ok(!/default/.test(sa.JWT_SECRET));
});
