// Convocatoria de punta a punta en celular (v1.6): el entrenador la publica y el deportista convocado la confirma (RF-20)
const { test, expect } = require('@playwright/test');
const { entrar, paginaEn } = require('./ayuda');

test.describe.configure({ mode: 'serial' });

test('CP-UI-CNV-001 [RF-20] El entrenador arma y publica la convocatoria desde el inicio', async ({ browser }) => {
  const page = await paginaEn(browser, 'celular');
  await entrar(page, 'entrenador');
  await page.goto('/');
  await page.getByRole('button', { name: /Armar convocatoria|Seguir convocatoria|Ver convocatoria/ }).click();
  const hoja = page.locator('.modal-box, .modal').first();
  await expect(hoja.locator('.convocatoria-lista li').first()).toBeVisible();
  // Se ve el estado médico de cada deportista para no convocar a alguien no apto
  await expect(hoja.locator('.convocatoria-lista .badge-red').first()).toBeVisible();
  await hoja.getByLabel('Hora de presentación').fill('13:30');
  await hoja.getByLabel('Lugar').fill('Cancha principal');
  const fila = (nombre) => hoja.locator('.convocatoria-lista li', { hasText: nombre });
  await fila('Daniel Rincón').getByRole('button', { name: 'Titular' }).click();
  await fila('Sebastián Peñaranda').getByRole('button', { name: 'Titular' }).click();
  await fila('Mateo Carrillo').getByRole('button', { name: 'Suplente' }).click();
  await expect(hoja.locator('.convocatoria-cuenta')).toContainText('2 titulares · 1 suplentes');
  await hoja.getByRole('button', { name: /Publicar convocatoria/ }).click();
  await expect(page.getByText('Convocatoria publicada')).toBeVisible();
  await expect(hoja.locator('.convocatoria-resumen')).toContainText('3 sin responder');
  await expect(hoja.getByRole('link', { name: /Compartir por WhatsApp/ })).toHaveAttribute('href', /wa\.me/);
  await page.context().close();
});

test('CP-UI-CNV-002 [RF-20] El deportista recibe el aviso, abre la convocatoria y confirma', async ({ browser }) => {
  const page = await paginaEn(browser, 'celular');
  await entrar(page, 'jugador');
  await page.goto('/');
  await expect(page.locator('.ini-convocado')).toContainText('Estás convocado como titular');
  const campana = page.locator('.cabecera-avisos');
  await expect(campana.locator('.cabecera-avisos-numero')).toBeVisible();
  await campana.click();
  await page.locator('.avisos-lista button', { hasText: 'Fuiste convocado' }).first().click();
  await expect(page).toHaveURL(/\/partidos/);
  const hoja = page.locator('.modal-box, .modal').first();
  await expect(hoja.locator('.convocatoria-mia')).toContainText('Estás convocado como titular');
  await expect(hoja.locator('.convocatoria-grupo').first()).toContainText('Daniel Rincón');
  await hoja.getByRole('button', { name: 'Confirmo' }).click();
  await expect(page.getByText('Asistencia confirmada')).toBeVisible();
  await expect(hoja.getByRole('button', { name: 'Confirmado' })).toBeDisabled();
  await page.context().close();
});

test('CP-UI-CNV-003 [RF-20] El entrenador ve la confirmación y el registro de cambios', async ({ browser }) => {
  const page = await paginaEn(browser, 'pc');
  await entrar(page, 'entrenador');
  await page.goto('/');
  await expect(page.locator('.ini-banner-convocatoria')).toContainText('1 confirmaron');
  await page.getByRole('button', { name: 'Ver convocatoria' }).click();
  const hoja = page.locator('.modal-box, .modal').first();
  // Quien confirmó aparece con su respuesta junto al nombre, y el nombre se lee (no es blanco sobre blanco)
  const confirmado = hoja.locator('.convocatoria-lista li', { hasText: 'Confirmó' })
  await expect(confirmado).toHaveCount(1);
  const color = await confirmado.locator('.convocatoria-nombre').evaluate(e => getComputedStyle(e).color);
  expect(color).not.toBe('rgb(255, 255, 255)');
  await hoja.getByRole('button', { name: /Ver registro de cambios/ }).click();
  await expect(hoja.locator('.convocatoria-registro')).toContainText('confirmó su asistencia');
  await expect(hoja.locator('.convocatoria-registro')).toContainText('publicó la convocatoria');
  await page.context().close();
});
