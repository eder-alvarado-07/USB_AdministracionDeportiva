// Crea el esquema completo ejecutando database.sql (idempotente).
//   npm run db:init
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅  Esquema creado / actualizado desde database.sql');
}

run()
  .catch(err => { console.error('❌  Error al crear el esquema:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
