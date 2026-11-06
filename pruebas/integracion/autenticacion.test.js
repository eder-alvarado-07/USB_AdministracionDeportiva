// Autenticación y sesión (RF-01, RF-02, RNF-01)
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, cerrar, llamar, token, CUENTAS } = require('../utilidades/api');

test.before(iniciar);
test.after(() => cerrar(__filename));

test('CP-AUT-001 [RF-01] Inicio de sesión válido devuelve tokens y el rol', async () => {
  const [email, password] = CUENTAS.administrador;
  const r = await llamar('POST', '/api/auth/login', null, { email, password });
  assert.equal(r.status, 200);
  assert.ok(r.datos.access_token && r.datos.refresh_token);
  assert.equal(r.datos.usuario.rol, 'administrador');
  assert.equal(r.datos.usuario.password_hash, undefined, 'nunca se devuelve el hash');
});

test('CP-AUT-002 [RF-01] Contraseña incorrecta devuelve 401 con mensaje', async () => {
  const r = await llamar('POST', '/api/auth/login', null, { email: CUENTAS.salud[0], password: 'incorrecta' });
  assert.equal(r.status, 401);
  assert.ok(r.datos.error);
});

test('CP-AUT-003 [RF-01] Usuario inexistente devuelve 401 (sin revelar si existe)', async () => {
  const r = await llamar('POST', '/api/auth/login', null, { email: 'nadie@test.com', password: 'x' });
  assert.equal(r.status, 401);
});

test('CP-AUT-004 [RF-01] Campos vacíos devuelven 400', async () => {
  const r = await llamar('POST', '/api/auth/login', null, { email: '', password: '' });
  assert.equal(r.status, 400);
});

test('CP-AUT-005 [RF-01] /auth/me devuelve el usuario de la sesión', async () => {
  const t = await token('entrenador');
  const r = await llamar('GET', '/api/auth/me', t);
  assert.equal(r.status, 200);
  assert.equal(r.datos.rol, 'entrenador');
});

test('CP-AUT-006 [RNF-01] Rutas protegidas sin token devuelven 401', async () => {
  for (const ruta of ['/api/jugadores', '/api/lesiones', '/api/usuarios', '/api/dashboard/inicio', '/api/salud/controles']) {
    const r = await llamar('GET', ruta);
    assert.equal(r.status, 401, `${ruta} sin token`);
  }
});

test('CP-AUT-007 [RNF-01] Token alterado devuelve 401', async () => {
  const t = await token('administrador');
  const r = await llamar('GET', '/api/usuarios', t.slice(0, -4) + 'abcd');
  assert.equal(r.status, 401);
});

test('CP-AUT-008 [RF-01] El token de refresco genera un nuevo token de acceso', async () => {
  const [email, password] = CUENTAS.salud;
  const login = await llamar('POST', '/api/auth/login', null, { email, password });
  const r = await llamar('POST', '/api/auth/refresh', null, { refresh_token: login.datos.refresh_token });
  assert.equal(r.status, 200);
  assert.ok(r.datos.access_token);
});

test('CP-AUT-009 [RF-02] Cambiar contraseña exige la actual y permite volver a entrar', async () => {
  const [email, password] = CUENTAS.entrenador2;
  const t = await token('entrenador2');
  const mal = await llamar('PUT', '/api/auth/cambiar-password', t, { password_actual: 'mala', password_nuevo: 'Nueva123!' });
  assert.equal(mal.status, 401, 'contraseña actual incorrecta');
  const corta = await llamar('PUT', '/api/auth/cambiar-password', t, { password_actual: password, password_nuevo: '123' });
  assert.equal(corta.status, 400, 'nueva demasiado corta');
  const ok = await llamar('PUT', '/api/auth/cambiar-password', t, { password_actual: password, password_nuevo: 'Nueva123!' });
  assert.equal(ok.status, 200);
  const entra = await llamar('POST', '/api/auth/login', null, { email, password: 'Nueva123!' });
  assert.equal(entra.status, 200, 'entra con la nueva');
  // Se deja como estaba para las demás pruebas
  await llamar('PUT', '/api/auth/cambiar-password', entra.datos.access_token, { password_actual: 'Nueva123!', password_nuevo: password });
});
