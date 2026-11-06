// Utilidades compartidas por las pruebas de navegador.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const CUENTAS = require('../utilidades/cuentas');

const RAIZ = path.resolve(__dirname, '..', '..');
const DIR_METRICAS = path.join(RAIZ, 'pruebas', 'resultados', 'ui-metricas');

const ANCHOS = {
  celular360: { width: 360, height: 800 },
  celular: { width: 390, height: 844 },
  tableta: { width: 768, height: 1024 },
  pc: { width: 1440, height: 900 },
};

// Celulares y tabletas se emulan con pantalla táctil (pointer: coarse), como en un dispositivo real;
// el computador, con mouse. Así se prueban los tamaños táctiles y el hover solo con mouse.
const esTactil = (ancho) => ancho !== 'pc';
async function paginaEn(browser, ancho) {
  const contexto = await browser.newContext({ viewport: ANCHOS[ancho], hasTouch: esTactil(ancho) });
  return contexto.newPage();
}

// Configuración de navegación de la app (fuente única de módulos y roles)
async function modulos() {
  const { MODULOS } = await import(pathToFileURL(path.join(RAIZ, 'frontend/src/config/navegacion.js')).href);
  return MODULOS;
}

// Inicia sesión rápido (por API) y deja la sesión guardada para la página.
async function entrar(page, rol) {
  const [email, password] = CUENTAS[rol];
  const r = await page.request.post('/api/auth/login', { data: { email, password } });
  if (!r.ok()) throw new Error(`No se pudo iniciar sesión como ${rol}: ${r.status()}`);
  const { access_token, refresh_token } = await r.json();
  await page.addInitScript(([a, b]) => {
    localStorage.setItem('access_token', a);
    localStorage.setItem('refresh_token', b);
    localStorage.setItem('dt_selected_sport_id', 'todos');
  }, [access_token, refresh_token]);
}

// Inicia sesión por el formulario, como lo haría una persona.
async function entrarPorFormulario(page, rol) {
  const [email, password] = CUENTAS[rol];
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForURL('**/');
}

// Registra errores de consola y respuestas 4xx/5xx mientras se navega.
function vigilar(page) {
  const problemas = [];
  page.on('console', m => { if (m.type() === 'error') problemas.push(`consola: ${m.text().slice(0, 140)}`); });
  page.on('pageerror', e => problemas.push(`js: ${String(e).slice(0, 140)}`));
  page.on('response', r => {
    if (r.status() >= 400 && r.url().includes('/api/')) problemas.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });
  return problemas;
}

async function desborde(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

function guardarMetrica(nombre, datos) {
  fs.mkdirSync(DIR_METRICAS, { recursive: true });
  fs.writeFileSync(path.join(DIR_METRICAS, `${nombre}.json`), JSON.stringify(datos, null, 2));
}

module.exports = { esTactil, paginaEn, ANCHOS, modulos, entrar, entrarPorFormulario, vigilar, desborde, guardarMetrica, CUENTAS };
