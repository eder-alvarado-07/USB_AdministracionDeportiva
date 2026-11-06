// Se ejecuta al iniciar cada despliegue en Railway, antes de arrancar el servidor (iniciar_railway.js).
// Railway no ejecutó el preDeployCommand de railway.json, por eso la preparación va en el arranque.
//   1. Crea o actualiza el esquema con database.sql (idempotente: no borra datos).
//   2. Crea los usuarios base si no existen (con la clave de SEED_CLAVE_INICIAL).
//   3. Si DATOS_DEMO=1, carga el plantel de demostración una sola vez (para el tester).
//   npm run railway:preparar   (solo la preparación, sin arrancar el servidor)
const path = require('path');
const { spawnSync } = require('child_process');

const pasos = [['Esquema', 'init_db.js'], ['Usuarios base', 'seed.js']];
if (process.env.DATOS_DEMO === '1') pasos.push(['Plantel de demostración', 'datos_demo.js']);

for (const [nombre, archivo] of pasos) {
  console.log(`\n▶ ${nombre}`);
  const r = spawnSync(process.execPath, [path.join(__dirname, archivo)], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`❌  Falló el paso "${nombre}". El servidor no arranca, el health check falla y Railway mantiene la versión anterior.`);
    process.exit(r.status || 1);
  }
}
console.log('\n✅  Base de datos lista.');
