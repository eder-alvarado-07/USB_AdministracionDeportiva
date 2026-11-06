// Ayudante para las pruebas de API: levanta la app contra la base de pruebas,
// hace peticiones, inicia sesión y cronometra cada respuesta (métrica M-E1).
const fs = require('fs');
const path = require('path');
const { ENV_PRUEBAS, RAIZ } = require('./bd');

// La app y su conexión deben cargarse DESPUÉS de fijar el entorno de pruebas.
Object.assign(process.env, ENV_PRUEBAS);
const app = require(path.join(RAIZ, 'api', 'index.js'));
const pool = require(path.join(RAIZ, 'backend', 'config', 'db.js'));

const CUENTAS = require('./cuentas');

const tiempos = [];
let servidor = null;
let base = '';

async function iniciar() {
  await new Promise(resolve => { servidor = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${servidor.address().port}`;
}

async function cerrar(nombreArchivo) {
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  await pool.end();
  if (nombreArchivo && tiempos.length) {
    const dir = path.join(RAIZ, 'pruebas', 'resultados');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `tiempos-${path.basename(nombreArchivo, '.test.js')}.json`), JSON.stringify(tiempos));
  }
}

async function llamar(metodo, ruta, token, cuerpo) {
  const inicio = performance.now();
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  const ms = performance.now() - inicio;
  tiempos.push({ metodo, ruta: ruta.replace(/\/\d+/g, '/:id').split('?')[0], status: res.status, ms: Math.round(ms * 10) / 10 });
  let datos = null;
  try { datos = await res.json(); } catch { /* respuesta sin cuerpo JSON */ }
  return { status: res.status, datos };
}

// Envío multipart (archivos), por ejemplo la carga de usuarios por CSV
async function llamarFormulario(ruta, token, formulario) {
  const res = await fetch(base + ruta, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formulario });
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo JSON */ }
  return { status: res.status, datos };
}

// Petición sin procesar: cuerpo tal cual (por ejemplo, JSON mal formado) y acceso a las cabeceras
async function llamarCrudo(metodo, ruta, { headers = {}, body } = {}) {
  const res = await fetch(base + ruta, { method: metodo, headers, body });
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo JSON */ }
  return { status: res.status, datos, headers: res.headers };
}

async function token(rol) {
  const [email, password] = CUENTAS[rol];
  const r = await llamar('POST', '/api/auth/login', null, { email, password });
  if (r.status !== 200) throw new Error(`No se pudo iniciar sesión como ${rol}: ${r.status}`);
  return r.datos.access_token;
}

// Consulta directa a la base de pruebas (para verificar efectos y limpiar)
const sql = (texto, params) => pool.query(texto, params);

module.exports = { iniciar, cerrar, llamar, llamarFormulario, llamarCrudo, token, sql, CUENTAS };
