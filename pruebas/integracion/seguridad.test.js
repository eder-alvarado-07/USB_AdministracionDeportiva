// Seguridad de acceso de v1.4 (RNF-01; métricas M-F4 y M-F5):
// hash de contraseñas, secretos JWT, intentos fallidos, cabeceras y datos sensibles en el código.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { iniciar, cerrar, llamar, llamarCrudo, token, sql } = require('../utilidades/api');
const { RAIZ } = require('../utilidades/bd');
const jwt = require(path.join(RAIZ, 'node_modules', 'jsonwebtoken'));

let A;
test.before(async () => { await iniciar(); A = await token('administrador'); });
test.after(async () => {
  await sql(`DELETE FROM usuarios WHERE email LIKE 'zz.seg.%'`);
  await cerrar(__filename);
});

test('CP-SEG-014 [RNF-01] Las contraseñas nuevas se guardan con scrypt y sal propia', async () => {
  const datos = { nombre: 'ZZ Seg', password: 'Segura.2026', rol: 'personal_salud' };
  const a = await llamar('POST', '/api/usuarios', A, { ...datos, email: 'zz.seg.a@test.com' });
  const b = await llamar('POST', '/api/usuarios', A, { ...datos, email: 'zz.seg.b@test.com' });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  const { rows } = await sql(`SELECT password_hash, salt FROM usuarios WHERE email IN ('zz.seg.a@test.com', 'zz.seg.b@test.com')`);
  for (const u of rows) assert.match(u.password_hash, /^scrypt\$16384\$8\$1\$[0-9a-f]{128}$/);
  assert.notEqual(rows[0].password_hash, rows[1].password_hash, 'la misma clave produce hashes distintos');
  assert.equal((await llamar('POST', '/api/auth/login', null, { email: 'zz.seg.a@test.com', password: 'Segura.2026' })).status, 200);
});

test('CP-SEG-015 [RNF-01] Un usuario con hash antiguo entra y su hash se actualiza a scrypt', async () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const antiguo = crypto.createHmac('sha256', salt).update('Antigua.2026').digest('hex');
  await sql(`INSERT INTO usuarios (nombre, email, password_hash, salt, rol) VALUES ('ZZ Antiguo', 'zz.seg.antiguo@test.com', $1, $2, 'jugador')`, [antiguo, salt]);

  assert.equal((await llamar('POST', '/api/auth/login', null, { email: 'zz.seg.antiguo@test.com', password: 'Otra' })).status, 401);
  assert.equal((await llamar('POST', '/api/auth/login', null, { email: 'zz.seg.antiguo@test.com', password: 'Antigua.2026' })).status, 200);
  const { rows: [u] } = await sql(`SELECT password_hash FROM usuarios WHERE email = 'zz.seg.antiguo@test.com'`);
  assert.match(u.password_hash, /^scrypt\$/);
  assert.equal((await llamar('POST', '/api/auth/login', null, { email: 'zz.seg.antiguo@test.com', password: 'Antigua.2026' })).status, 200, 'sigue entrando con el hash nuevo');
});

test('CP-SEG-016 [RNF-01] Cinco intentos fallidos bloquean temporalmente el inicio de sesión', async () => {
  const email = 'zz.seg.fuerza.bruta@test.com';
  for (let i = 1; i <= 5; i++) {
    assert.equal((await llamar('POST', '/api/auth/login', null, { email, password: `intento${i}` })).status, 401, `intento ${i}`);
  }
  const r = await llamarCrudo('POST', '/api/auth/login', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'otra' }) });
  assert.equal(r.status, 429);
  assert.match(r.datos.error, /Demasiados intentos/);
  assert.ok(Number(r.headers.get('retry-after')) > 0, 'indica cuándo reintentar');
  assert.equal((await llamar('POST', '/api/auth/login', null, { email: 'salud@dtdeportivo.com', password: require('../utilidades/bd').CLAVE_PRUEBAS })).status, 200, 'las demás cuentas no se bloquean');
});

test('CP-SEG-017 [RNF-03] Un cuerpo JSON mal formado devuelve 400 con mensaje', async () => {
  const r = await llamarCrudo('POST', '/api/jugadores', {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${A}` }, body: '{"nombre": "ZZ",',
  });
  assert.equal(r.status, 400);
  assert.match(r.datos.error, /JSON/);
});

test('CP-SEG-018 [RNF-01] La API envía cabeceras de seguridad y no revela la tecnología', async () => {
  const r = await llamarCrudo('GET', '/api/health');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.ok(r.headers.get('referrer-policy'));
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('CP-SEG-019 [RNF-01] El código no contiene contraseñas ni secretos por defecto', () => {
  const archivos = [];
  const recorrer = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, f.name);
      if (f.isDirectory() && !['node_modules', 'uploads'].includes(f.name)) recorrer(ruta);
      else if (/\.(js|sql)$/.test(f.name)) archivos.push(ruta);
    }
  };
  recorrer(path.join(RAIZ, 'backend'));
  recorrer(path.join(RAIZ, 'api'));
  archivos.push(path.join(RAIZ, 'server.js'));
  for (const ruta of archivos) {
    const texto = fs.readFileSync(ruta, 'utf8');
    const nombre = path.relative(RAIZ, ruta);
    assert.doesNotMatch(texto, /password\s*:\s*['"][^'"]+['"]/, `${nombre}: contraseña escrita en el código`);
    assert.doesNotMatch(texto, /JWT_(REFRESH_)?SECRET\s*\|\|\s*['"]/, `${nombre}: secreto JWT con valor por defecto`);
  }
  assert.ok(!fs.existsSync(path.join(RAIZ, 'backend', 'config', 'seed_cloudsql.js')), 'seed_cloudsql.js eliminado');
});

test('CP-SEG-020 [RNF-01] Un token firmado con el secreto por defecto antiguo es rechazado', async () => {
  const falso = jwt.sign({ id: 1, email: 'admin1@dtdeportivo.com', rol: 'administrador' }, 'dtdeportivo_jwt_default_secret_key');
  assert.equal((await llamar('GET', '/api/usuarios', falso)).status, 401);
  const refresco = jwt.sign({ id: 1 }, 'dtdeportivo_refresh_default_secret_key');
  assert.equal((await llamar('POST', '/api/auth/refresh', null, { refresh_token: refresco })).status, 401);
  const sinFirma = jwt.sign({ id: 1, rol: 'administrador' }, null, { algorithm: 'none' });
  assert.equal((await llamar('GET', '/api/usuarios', sinFirma)).status, 401, 'token sin firma (alg none)');
});
