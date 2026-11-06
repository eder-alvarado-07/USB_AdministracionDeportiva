// Mediciones para las métricas de calidad (no bloquean: registran el valor para el informe).
//   M-U4 objetivos táctiles · M-U5 accesibilidad (axe-core) · M-E2 carga en 4G · M-R4 aviso sin servidor
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { ANCHOS, entrar, guardarMetrica } = require('./ayuda');

// Pantallas principales por rol que se miden
const PANTALLAS = [
  ['administrador', ['/', '/jugadores', '/equipos', '/lesiones', '/usuarios', '/antropometria']],
  ['entrenador', ['/', '/asistencia', '/entrenamientos', '/partidos']],
  ['salud', ['/', '/salud', '/evaluaciones']],
  ['jugador', ['/', '/estadisticas']],
];

test('CP-UI-MED-001 [RNF-06] Medición de accesibilidad con axe-core en celular', async ({ browser }) => {
  const filas = [];
  // Pantalla de inicio de sesión (sin sesión)
  {
    const contexto = await browser.newContext({ viewport: ANCHOS.celular });
    const page = await contexto.newPage();
    await page.goto('/login');
    const r = await new AxeBuilder({ page }).analyze();
    filas.push(resumenAxe('anónimo', '/login', r));
    await contexto.close();
  }
  for (const [rol, rutas] of PANTALLAS) {
    const contexto = await browser.newContext({ viewport: ANCHOS.celular });
    const page = await contexto.newPage();
    await entrar(page, rol);
    for (const ruta of rutas) {
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');
      const r = await new AxeBuilder({ page }).analyze();
      filas.push(resumenAxe(rol, ruta, r));
    }
    await contexto.close();
  }
  guardarMetrica('accesibilidad', filas);
  expect(filas.length).toBeGreaterThan(0);
});

function resumenAxe(rol, ruta, r) {
  const graves = r.violations.filter(v => ['serious', 'critical'].includes(v.impact));
  return {
    rol, ruta,
    graves: graves.length,
    violaciones: r.violations.map(v => ({ regla: v.id, impacto: v.impact, elementos: v.nodes.length, ayuda: v.help })),
  };
}

test('CP-UI-MED-002 [RNF-06] Medición de objetivos táctiles de 44 px en celular', async ({ browser }) => {
  const filas = [];
  for (const [rol, rutas] of PANTALLAS) {
    // Se mide como un celular real: pantalla táctil (los tamaños de 44 px aplican con pointer: coarse)
    const page = await browser.newPage({ viewport: ANCHOS.celular, hasTouch: true });
    await entrar(page, rol);
    for (const ruta of rutas) {
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');
      const m = await page.evaluate(() => {
        const visibles = [...document.querySelectorAll('a, button, input:not([type=hidden]), select, textarea, [role=button]')]
          .filter(e => {
            const r = e.getBoundingClientRect();
            const s = getComputedStyle(e);
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('p');
          });
        const pequenos = visibles.filter(e => e.getBoundingClientRect().height < 44);
        return {
          total: visibles.length,
          adecuados: visibles.length - pequenos.length,
          ejemplos: pequenos.slice(0, 5).map(e => `${e.tagName.toLowerCase()} ${Math.round(e.getBoundingClientRect().height)}px "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30)}"`),
        };
      });
      filas.push({ rol, ruta, ...m });
    }
    await page.close();
  }
  guardarMetrica('objetivos-tactiles', filas);
  expect(filas.length).toBeGreaterThan(0);
});

test('CP-UI-MED-003 [RNF-08] Medición de carga del inicio en celular con red 4G simulada', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'La simulación de red usa el protocolo de Chromium');
  const muestras = [];
  for (let i = 0; i < 3; i++) {
    const contexto = await browser.newContext({ viewport: ANCHOS.celular });
    const page = await contexto.newPage();
    await entrar(page, 'entrenador');
    const cdp = await contexto.newCDPSession(page);
    await cdp.send('Network.enable');
    // Perfil "4G lento" de Lighthouse: 150 ms de latencia, 1,6 Mbps de bajada, 750 kbps de subida
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
    });
    if (i > 0) await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
    const inicio = Date.now();
    await page.goto('/');
    await page.locator('.ini-plantel .ini-dorsal').first().waitFor({ timeout: 60_000 });
    muestras.push({ intento: i + 1, cache: i > 0, segundos: (Date.now() - inicio) / 1000 });
    await contexto.close();
  }
  guardarMetrica('carga-4g', muestras);
  expect(muestras.length).toBe(3);
});

test('CP-UI-MED-004 [RNF-03] Medición de aviso cuando el servidor no responde', async ({ browser }) => {
  const rutas = ['/', '/jugadores', '/entrenamientos', '/asistencia', '/partidos', '/estadisticas', '/lesiones', '/evaluaciones', '/equipos'];
  const filas = [];
  for (const ruta of rutas) {
    const page = await browser.newPage({ viewport: ANCHOS.celular });
    await entrar(page, 'administrador');
    // La sesión responde, pero todos los datos fallan como si el servidor estuviera caído
    await page.route('**/api/**', route => {
      const url = route.request().url();
      if (url.includes('/api/auth/me') || url.includes('/api/disciplinas')) return route.continue();
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Servicio no disponible' }) });
    });
    await page.goto(ruta);
    await page.waitForTimeout(2500);
    const resultado = await page.evaluate(() => {
      const texto = document.body.innerText;
      const aviso = /no se pudo|error|no disponible|reintentar|intenta de nuevo|conexión/i.test(texto) ||
        !!document.querySelector('.alerta-error, [role=alert], [role=status]');
      const reintentar = [...document.querySelectorAll('button')].some(b => /reintentar|intentar de nuevo|recargar/i.test(b.innerText));
      return { aviso, reintentar };
    });
    filas.push({ ruta, ...resultado, ok: resultado.aviso && resultado.reintentar });
    await page.close();
  }
  guardarMetrica('caida-servidor', filas);
  expect(filas.length).toBe(rutas.length);
});

test('CP-UI-COM-001 [RNF-05] Deportistas y lesiones se ven bien en celular y computador @compat', async ({ page }) => {
  await entrar(page, 'administrador');
  for (const ancho of ['celular', 'pc']) {
    await page.setViewportSize(ANCHOS[ancho]);
    for (const ruta of ['/jugadores', '/lesiones']) {
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('table').first()).toBeVisible();
      const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(desborde, `${ruta} en ${ancho}`).toBeLessThanOrEqual(0);
    }
  }
});
