// Ejecuta las pruebas unitarias y de integración contra la base de pruebas.
//   npm run test:api
// 1. Recrea la base dt_deportivo_pruebas (esquema + usuarios + plantel de demostración).
// 2. Corre los archivos de uno en uno (comparten la base) con el corredor nativo de Node.
// 3. Guarda el resultado en pruebas/resultados/api.xml (formato JUnit) para el informe.
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { prepararBaseDePruebas, BD_PRUEBAS, RAIZ } = require('./utilidades/bd');

(async () => {
  const resultados = path.join(RAIZ, 'pruebas', 'resultados');
  fs.mkdirSync(resultados, { recursive: true });
  for (const f of fs.readdirSync(resultados)) if (f.startsWith('tiempos-')) fs.rmSync(path.join(resultados, f));

  process.stdout.write(`Preparando la base ${BD_PRUEBAS}… `);
  await prepararBaseDePruebas();
  console.log('lista.\n');

  const r = spawnSync(process.execPath, [
    '--test', '--test-concurrency=1',
    '--test-reporter=spec', '--test-reporter-destination=stdout',
    '--test-reporter=junit', `--test-reporter-destination=${path.join('pruebas', 'resultados', 'api.xml')}`,
    'pruebas/unitarias/*.test.js', 'pruebas/integracion/*.test.js',
  ], { cwd: RAIZ, stdio: 'inherit' });
  process.exitCode = r.status ?? 1;
})().catch(err => { console.error('❌ ', err.message); process.exitCode = 1; });
