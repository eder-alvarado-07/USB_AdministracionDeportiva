// Prepara la base exclusiva de pruebas: la borra, la recrea con database.sql,
// carga los usuarios del seed y el plantel de demostración.
// Nunca toca la base de desarrollo: siempre usa BD_PRUEBAS con las credenciales DB_* del .env.
const path = require('path');
const { execFileSync } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
require(path.join(RAIZ, 'node_modules', 'dotenv')).config({ path: path.join(RAIZ, '.env') });
const { Client } = require(path.join(RAIZ, 'node_modules', 'pg'));

const crypto = require('crypto');
const BD_PRUEBAS = 'dt_deportivo_pruebas';
// Clave de todas las cuentas creadas por seed.js y datos_demo.js en la base de pruebas
const CLAVE_PRUEBAS = 'Pruebas.2026!';

// Variables de entorno que fuerzan la conexión a la base de pruebas
// (DATABASE_URL y SQL_HOST vacíos para que db.js use DB_* locales).
const ENV_PRUEBAS = {
  ...process.env,
  DATABASE_URL: '',
  SQL_HOST: '',
  DB_NAME: BD_PRUEBAS,
  NODE_ENV: 'test',
  // Secretos propios de cada ejecución: las pruebas no dependen del .env ni de valores fijos
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  JWT_REFRESH_SECRET: crypto.randomBytes(48).toString('hex'),
  SEED_CLAVE_INICIAL: CLAVE_PRUEBAS,
};

function credenciales(database) {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database,
  };
}

function ejecutar(script) {
  execFileSync(process.execPath, [path.join(RAIZ, script)], { env: ENV_PRUEBAS, cwd: RAIZ, stdio: 'pipe' });
}

async function prepararBaseDePruebas({ conDemo = true } = {}) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Las pruebas no se ejecutan con NODE_ENV=production.');
  }
  const admin = new Client(credenciales('postgres'));
  try {
    await admin.connect();
  } catch (err) {
    throw new Error(`No se pudo conectar a PostgreSQL con DB_HOST/DB_USER/DB_PASSWORD del .env: ${err.message}`);
  }
  await admin.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [BD_PRUEBAS]);
  await admin.query(`DROP DATABASE IF EXISTS ${BD_PRUEBAS}`);
  await admin.query(`CREATE DATABASE ${BD_PRUEBAS} ENCODING 'UTF8'`);
  await admin.end();

  ejecutar('backend/config/init_db.js');
  ejecutar('backend/config/seed.js');
  if (conDemo) ejecutar('backend/config/datos_demo.js');
}

module.exports = { CLAVE_PRUEBAS, prepararBaseDePruebas, ENV_PRUEBAS, BD_PRUEBAS, credenciales, RAIZ };

// Uso directo: node pruebas/utilidades/bd.js
if (require.main === module) {
  prepararBaseDePruebas()
    .then(() => console.log(`✅  Base ${BD_PRUEBAS} lista (esquema, usuarios y datos de demostración).`))
    .catch(err => { console.error('❌ ', err.message); process.exitCode = 1; });
}
