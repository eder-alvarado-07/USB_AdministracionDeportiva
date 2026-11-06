// Pruebas de navegador (sistema, adaptabilidad, compatibilidad, accesibilidad y rendimiento).
//   npm run test:ui
// Levanta su propio servidor (build de producción) en 127.0.0.1:3100 contra la base de pruebas.
const { defineConfig } = require('@playwright/test');
const { ENV_PRUEBAS } = require('./pruebas/utilidades/bd');

const PUERTO = 3100;

module.exports = defineConfig({
  testDir: './pruebas/ui',
  outputDir: './pruebas/resultados/ui-artefactos',
  globalSetup: require.resolve('./pruebas/ui/preparar.js'),
  fullyParallel: false,
  workers: 1,                      // las pruebas comparten la misma base de datos
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 8_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: 'pruebas/resultados/ui.json' }],
    ['html', { outputFolder: 'pruebas/resultados/ui-html', open: 'never' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite build && node server.js',
    url: `http://127.0.0.1:${PUERTO}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { ...ENV_PRUEBAS, HOST: '127.0.0.1', PORT: String(PUERTO), NODE_ENV: 'production' },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' }, grep: /@compat/ },
    { name: 'webkit', use: { browserName: 'webkit' }, grep: /@compat/ },
  ],
});
