// Estados de cada pantalla (v1.5 fase 2): cargando, error con reintentar, vacío y sin resultados (RNF-03, RNF-06)
const { test, expect } = require('@playwright/test');
const { ANCHOS, entrar } = require('./ayuda');

const pasa = (url) => /\/api\/(auth|disciplinas|settings)/.test(url);

test('CP-UI-EST-001 [RNF-03] Sin servidor se explica el error y Reintentar recupera la pantalla', async ({ page }) => {
  await page.setViewportSize(ANCHOS.celular);
  await entrar(page, 'administrador');
  let caido = true;
  await page.route('**/api/**', route => (caido && !pasa(route.request().url()))
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Servicio no disponible' }) })
    : route.continue());
  await page.goto('/lesiones');
  const alerta = page.getByRole('alert').filter({ hasText: 'No se pudo cargar la información' });
  await expect(alerta).toBeVisible();
  await expect(page.getByText(/0 registros/)).toHaveCount(0);
  await expect(page.getByText('Aún no hay lesiones registradas')).toHaveCount(0);

  caido = false;
  await alerta.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.locator('table')).toBeVisible();
  await expect(alerta).toHaveCount(0);
});

test('CP-UI-EST-002 [RNF-06] Mientras carga se ve la forma del contenido y ninguna cifra falsa', async ({ page }) => {
  await page.setViewportSize(ANCHOS.celular);
  await entrar(page, 'administrador');
  await page.route('**/api/**', async route => {
    if (!pasa(route.request().url())) await new Promise(r => setTimeout(r, 2500));
    route.continue();
  });
  for (const [ruta, falsas] of [['/jugadores', /Mostrando 0|\(0\)/], ['/lesiones', /0 registros/], ['/partidos', /0 partidos/]]) {
    await page.goto(ruta);
    await expect(page.locator('.esqueleto').first()).toBeVisible();
    await expect(page.getByRole('status').first()).toBeAttached();
    expect(await page.locator('body').innerText(), `${ruta} no muestra cifras mientras carga`).not.toMatch(falsas);
    await expect(page.locator('.esqueleto')).toHaveCount(0, { timeout: 10_000 });
  }
});

test('CP-UI-EST-003 [RF-08] Un filtro sin resultados ofrece limpiarlo y vuelve a mostrar los datos', async ({ page }) => {
  await page.setViewportSize(ANCHOS.pc);
  await entrar(page, 'administrador');
  await page.goto('/jugadores');
  await page.getByPlaceholder('Buscar por nombre, dorsal, posición o equipo').fill('zzzz-no-existe');
  await expect(page.getByText('Ningún resultado con estos filtros')).toBeVisible();
  await page.getByRole('button', { name: 'Ver todos los deportistas' }).click();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await expect(page.getByPlaceholder('Buscar por nombre, dorsal, posición o equipo')).toHaveValue('');
});

test('CP-UI-EST-004 [RNF-07] La interfaz no usa emojis', async ({ page }) => {
  await page.setViewportSize(ANCHOS.pc);
  await entrar(page, 'administrador');
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{FE0F}]/u;
  for (const ruta of ['/', '/jugadores', '/equipos', '/asistencia', '/estadisticas', '/lesiones', '/usuarios', '/antropometria']) {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');
    const texto = await page.evaluate(() => document.body.innerText + [...document.querySelectorAll('option')].map(o => o.textContent).join(' '));
    expect(texto.match(emoji), `${ruta} sin emojis`).toBeNull();
  }
});

test('CP-UI-EST-005 [RNF-08] Si la descarga de un módulo falla, se explica y se ofrece reintentar', async ({ page }) => {
  await page.setViewportSize(ANCHOS.pc);
  await entrar(page, 'administrador');
  await page.goto('/');
  await expect(page.locator('.ini-banner')).toBeVisible();
  // El módulo de Lesiones se descarga aparte (carga por partes): se simula que esa descarga falla
  await page.route(/\/assets\/Lesiones-[^/]+\.js$/, route => route.abort());
  await page.locator('.lateral-nav a', { hasText: 'Lesiones' }).click();
  const alerta = page.getByRole('alert').filter({ hasText: 'No se pudo abrir esta sección' });
  await expect(alerta).toBeVisible();
  await expect(alerta.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(page.locator('.lateral-nav')).toBeVisible(); // el menú sigue disponible
});
