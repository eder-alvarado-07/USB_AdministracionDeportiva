// Avisos del entrenador y reconocimientos en el inicio, en celular (v1.7: RF-21, RF-23)
const { test, expect } = require('@playwright/test');
const { entrar, paginaEn, desborde } = require('./ayuda');

test.describe.configure({ mode: 'serial' });

test('CP-UI-COM-001 [RF-21] El entrenador envía un aviso al equipo desde el inicio', async ({ browser }) => {
  const page = await paginaEn(browser, 'celular');
  await entrar(page, 'entrenador');
  await page.goto('/');
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Avisos del equipo' }) });
  await panel.getByRole('button', { name: 'Enviar aviso' }).click();
  const hoja = page.locator('.modal-box').first();
  const equipo = hoja.getByLabel('Para');
  const valor = await equipo.locator('option', { hasText: 'Unisimón Rugby (demo)' }).getAttribute('value');
  await equipo.selectOption(valor);
  await hoja.getByLabel('Título').fill('Cambio de cancha');
  await hoja.getByLabel('Mensaje').fill('Mañana entrenamos en la cancha sintética a las 5:30 p. m.');
  await hoja.getByRole('button', { name: 'Enviar aviso' }).click();
  await expect(page.getByText(/Aviso enviado a \d+ persona/)).toBeVisible();
  await expect(panel.locator('.ini-com li').first()).toContainText('Cambio de cancha');
  await expect(panel.locator('.ini-com-meta').first()).toContainText('Enviado por ti hoy · para Unisimón Rugby (demo)');
  expect(await desborde(page)).toBeLessThanOrEqual(1);
  await page.context().close();
});

test('CP-UI-COM-002 [RF-21] El deportista ve el aviso en el inicio y en la campanita, sin desbordes en celular', async ({ browser }) => {
  const page = await paginaEn(browser, 'celular');
  await entrar(page, 'jugador');
  await page.goto('/');
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Avisos del equipo' }) });
  await expect(panel.locator('.ini-com li').first()).toContainText('Mañana entrenamos en la cancha sintética');
  await expect(panel.getByRole('button', { name: 'Enviar aviso' })).toHaveCount(0);
  await page.locator('.cabecera-avisos').click();
  await expect(page.locator('.avisos-lista button', { hasText: 'Aviso del entrenador: Cambio de cancha' })).toBeVisible();
  // DEF-030: al abrir los avisos reaparecía el círculo de iniciales y la página se desbordaba 27 px en celular
  expect(await desborde(page)).toBeLessThanOrEqual(1);
  await expect(page.locator('.cabecera-foto')).toBeHidden();
  await page.context().close();
});

test('CP-UI-RCN-001 [RF-23] El entrenador ve los reconocimientos del plantel', async ({ browser }) => {
  const page = await paginaEn(browser, 'celular');
  await entrar(page, 'entrenador');
  await page.goto('/');
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Reconocimientos' }) });
  await expect(panel.locator('.ini-rcn li', { hasText: 'Máximo anotador de la temporada' })).toBeVisible();
  expect(await desborde(page)).toBeLessThanOrEqual(1);
  await page.context().close();
});
