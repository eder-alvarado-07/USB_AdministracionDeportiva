// Microinteracciones (v1.5 fase 4): movimiento reducido, hover solo con mouse y estados de los chips (RNF-06)
const { test, expect } = require('@playwright/test');
const { ANCHOS, entrar } = require('./ayuda');

test('CP-UI-MOV-001 [RNF-06] Con movimiento reducido la hoja "Más" aparece con un fundido, sin desplazarse', async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: ANCHOS.celular, hasTouch: true, reducedMotion: 'reduce' });
  const page = await contexto.newPage();
  await entrar(page, 'entrenador');
  await page.goto('/');
  await page.locator('.menu-inferior button').click();
  const animacion = await page.locator('.hoja').evaluate(el => getComputedStyle(el).animationName);
  expect(animacion).toBe('fadeIn');
  const transicionBoton = await page.locator('.btn').first().evaluate(el => getComputedStyle(el).transitionDuration);
  expect(transicionBoton).toBe('0s');
  await contexto.close();
});

test('CP-UI-MOV-002 [RNF-06] Sin preferencia, la hoja "Más" sube desde abajo con la curva de hoja', async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: ANCHOS.celular, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await contexto.newPage();
  await entrar(page, 'entrenador');
  await page.goto('/');
  await page.locator('.menu-inferior button').click();
  const { nombre, duracion } = await page.locator('.hoja').evaluate(el => ({ nombre: getComputedStyle(el).animationName, duracion: getComputedStyle(el).animationDuration }));
  expect(nombre).toBe('subirHoja');
  expect(parseFloat(duracion)).toBeLessThanOrEqual(0.3);
  await contexto.close();
});

test('CP-UI-MOV-003 [RF-06] Los chips de deporte indican cuál está activo y cambian el filtro', async ({ page }) => {
  await page.setViewportSize(ANCHOS.pc);
  await entrar(page, 'administrador');
  await page.goto('/jugadores');
  const todos = page.locator('.chip-deporte-filtro', { hasText: 'Todos' });
  const rugby = page.locator('.chip-deporte-filtro', { hasText: 'Rugby' });
  await expect(todos).toHaveAttribute('aria-pressed', 'true');
  await rugby.click();
  await expect(rugby).toHaveAttribute('aria-pressed', 'true');
  await expect(todos).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.encabezado-ante')).toHaveText('Rugby');
  await expect(page.locator('.barra-total')).toContainText(/\d+ deportistas/);
  await todos.click();
});
