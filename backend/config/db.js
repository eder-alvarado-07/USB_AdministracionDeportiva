const { Pool, types } = require('pg');
require('dotenv').config();

// v2.0 (DEF-040): las columnas DATE se devuelven como texto 'YYYY-MM-DD'. Antes `pg` las convertía en una
// fecha a medianoche UTC y el navegador en Colombia (UTC-5) mostraba el día anterior (12 oct → 11 oct).
types.setTypeParser(1082, (valor) => valor);

// Conexión nativa a PostgreSQL. Orden de prioridad:
//   1. DATABASE_URL  (Neon, Render, Railway, etc.)
//   2. SQL_HOST + SQL_USER + SQL_DB_NAME  (Cloud SQL)
//   3. DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME  (PostgreSQL local)
function crearPool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      // DB_SSL=false para conexiones por red privada que no usan SSL
      ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });
  }

  if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
    return new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 10000,
    });
  }

  return new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'dt_deportivo',
    connectionTimeoutMillis: 5000,
  });
}

// Un solo pool por proceso (también se reutiliza entre invocaciones serverless).
const pool = crearPool();

pool.on('error', (err) => {
  console.error('⚠️ Error en pool PostgreSQL:', err.message);
});

module.exports = pool;
