// Observaciones del tester, primera entrega (v1.9): botón Atrás, ojo en contraseñas, rol en la cabecera del celular,
// Mi sesión arriba en celular, deporte fijo del entrenador y salud sin estadísticas
const { test, expect } = require('@playwright/test');
const { entrar, entrarPorFormulario, paginaEn, desborde } = require('./ayuda');

const panel = (page, titulo) => page.locator('section', { has: page.getByRole('heading', { name: titulo, exact: true }) });

test('CP-UI-OBS-001 [RF-01] Con la sesión abierta, Atrás no muestra el formulario de inicio de sesión', async ({ browser }) => {
  const page = await paginaEn(browser, 'pc');
  await entrarPorFormulario(page, 'entrenador');
  await expect(page.locator('.cabecera-avisos')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#password')).toHaveCount(0);
  // Si llega al login con la sesión abierta, va directo al inicio
  await page.goto('/login');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.cabecera-avisos')).toBeVisible();
  await page.context().close();
});

test('CP-UI-OBS-002 [RF-02] El ojo muestra y oculta la contraseña nueva', async ({ browser }) => {
  const page = await paginaEn(browser, 'pc');
  await entrar(page, 'entrenador');
  await page.goto('/');
  await panel(page, 'Mi sesión').getByRole('button', { name: 'Cambiar contraseña' }).click();
  const hoja = page.locator('.modal-box');
  await hoja.getByLabel('Contraseña nueva', { exact: true }).fill('Prueba.123');
  await expect(hoja.locator('#clave-nueva')).toHaveAttribute('type', 'password');
  await hoja.getByRole('button', { name: 'Mostrar contraseña' }).nth(1).click();
  await expect(hoja.locator('#clave-nueva')).toHaveAttribute('type', 'text');
  await hoja.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await expect(hoja.locator('#clave-nueva')).toHaveAttribute('type', 'password');
  await page.context().close();
});

test('CP-UI-OBS-003 [RF-18] En celular se ve el rol arriba y Mi sesión va debajo del próximo partido', async ({ browser }) => {
  const page = await paginaEn(browser, 'celular');
  await entrar(page, 'administrador');
  await page.goto('/');
  await expect(page.locator('.cabecera-sesion-movil')).toContainText('Administrador');
  const yPartido = (await page.locator('.ini-banner').boundingBox()).y;
  const ySesion = (await panel(page, 'Mi sesión').boundingBox()).y;
  const yPlantel = (await panel(page, 'Disponibilidad del plantel').boundingBox()).y;
  expect(ySesion).toBeGreaterThan(yPartido);
  expect(ySesion).toBeLessThan(yPlantel);
  expect(await desborde(page)).toBeLessThanOrEqual(1);
  await page.context().close();
});

test('CP-UI-OBS-004 [RF-06] El entrenador ve su deporte fijo y no puede crear deportes', async ({ browser }) => {
  const page = await paginaEn(browser, 'pc');
  await entrar(page, 'entrenador');
  await page.goto('/jugadores');
  await expect(page.locator('.lateral .deporte-activo.fijo')).toContainText('Rugby');
  await expect(page.locator('#deporte-lateral')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nuevo deporte' })).toHaveCount(0);
  await page.context().close();
});

test('CP-UI-OBS-005 [RF-04] El personal de salud no tiene Estadísticas', async ({ browser }) => {
  const page = await paginaEn(browser, 'pc');
  await entrar(page, 'salud');
  await page.goto('/');
  await expect(page.locator('.lateral-nav a', { hasText: 'Lesiones' })).toBeVisible();
  await expect(page.locator('.lateral-nav a', { hasText: 'Estadísticas' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Máximos anotadores' })).toHaveCount(0);
  await page.goto('/estadisticas');
  await expect(page).toHaveURL(/\/$/);
  await page.context().close();
});
