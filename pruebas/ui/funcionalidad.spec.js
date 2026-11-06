// Flujos de uso en el navegador: inicio de sesión, navegación, inicio y dorsal (RF-01, RF-02, RF-04, RF-06, RF-09, RF-18)
const { test, expect } = require('@playwright/test');
const { ANCHOS, entrar, entrarPorFormulario, CUENTAS } = require('./ayuda');

test.describe('Inicio de sesión', () => {
  test('CP-UI-LOG-001 [RF-01] Inicio de sesión por formulario lleva al inicio con el nombre del usuario @compat', async ({ page }) => {
    for (const ancho of ['celular', 'pc']) {
      await page.setViewportSize(ANCHOS[ancho]);
      await page.context().clearCookies();
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await entrarPorFormulario(page, 'entrenador');
      await expect(page.locator('.ini-banner')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Mi sesión' })).toBeVisible();
    }
  });

  test('CP-UI-LOG-002 [RF-01] Credenciales incorrectas muestran un aviso en la página', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', CUENTAS.salud[0]);
    await page.fill('#password', 'incorrecta');
    await page.click('button[type=submit]');
    await expect(page.getByRole('alert')).toContainText('no coinciden');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('CP-UI-LOG-003 [RF-01] Cerrar sesión vuelve al login y protege las páginas', async ({ page }) => {
    await page.setViewportSize(ANCHOS.pc);
    await entrarPorFormulario(page, 'salud');
    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/lesiones');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Navegación', () => {
  test('CP-UI-NAV-001 [RF-04] Hoja "Más" en celular: módulos del rol, cierra con Escape y navega', async ({ page }) => {
    await page.setViewportSize(ANCHOS.celular);
    await entrar(page, 'entrenador');
    await page.goto('/');
    await page.locator('.menu-inferior button').click();
    const opciones = await page.locator('.hoja-lista a').allInnerTexts();
    expect(opciones.map(t => t.trim())).toEqual(['Equipos', 'Partidos', 'Estadísticas', 'Lesiones', 'Evaluaciones']);
    await page.keyboard.press('Escape');
    await expect(page.locator('.hoja')).toHaveCount(0);
    await page.locator('.menu-inferior button').click();
    await page.locator('.hoja-lista a', { hasText: 'Partidos' }).click();
    await expect(page).toHaveURL(/\/partidos$/);
    await expect(page.locator('.hoja')).toHaveCount(0);
  });

  // v1.9: el entrenador solo ve su deporte (CP-UI-OBS-004); el filtro entre deportes lo usa el administrador
  test('CP-UI-NAV-002 [RF-06] El selector de deporte filtra el inicio', async ({ page }) => {
    await page.setViewportSize(ANCHOS.pc);
    await entrar(page, 'administrador');
    await page.goto('/');
    const selector = page.locator('#deporte-lateral');
    await selector.selectOption({ label: 'Rugby' });
    await expect(page.getByRole('heading', { name: /Disponibilidad del plantel: Rugby/ })).toBeVisible();
    await selector.selectOption({ label: 'Atletismo' });
    await expect(page.getByText(/No hay deportistas en Atletismo/)).toBeVisible();
    await selector.selectOption({ label: 'Todos los deportes' });
  });
});

test.describe('Inicio y sesión', () => {
  test('CP-UI-INI-001 [RF-18] El inicio del entrenador muestra el plantel con sus 23 dorsales y el resumen', async ({ page }) => {
    await page.setViewportSize(ANCHOS.celular);
    await entrar(page, 'entrenador');
    await page.goto('/');
    await expect(page.locator('.ini-plantel .ini-dorsal')).toHaveCount(23);
    await expect(page.locator('.panel-contador').first()).toHaveText('20 de 23');
    await expect(page.locator('.ini-dorsal.no_disponible')).toHaveCount(3);
    await expect(page.locator('.ini-dorsal.restringido')).toHaveCount(2);
  });

  test('CP-UI-SES-001 [RF-02] Cambiar contraseña valida la confirmación y la contraseña actual', async ({ page }) => {
    await page.setViewportSize(ANCHOS.celular);
    await entrar(page, 'entrenador');
    await page.goto('/');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await page.fill('#clave-actual', 'cualquiera');
    await page.fill('#clave-nueva', 'Nueva123!');
    await page.fill('#clave-confirmar', 'Distinta123!');
    await page.locator('.modal-box').getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.locator('.modal-box').getByRole('alert')).toContainText('no coincide');
    await page.fill('#clave-confirmar', 'Nueva123!');
    await page.locator('.modal-box').getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.locator('.modal-box').getByRole('alert')).toContainText('incorrecta');
  });
});

test.describe('Dorsal', () => {
  for (const ancho of ['celular', 'pc']) {
    test(`CP-UI-DOR-00${ancho === 'celular' ? 1 : 2} [RF-09] Cambiar el dorsal con un clic en la tabla (${ancho})`, async ({ page }) => {
      await page.setViewportSize(ANCHOS[ancho]);
      await entrar(page, 'entrenador');
      await page.goto('/jugadores');
      const boton = () => page.getByRole('button', { name: /^Dorsal de Daniel Rincón/ });
      const campo = () => page.getByLabel('Dorsal de Daniel Rincón');

      await boton().click(); await campo().fill('99'); await campo().press('Enter');
      await expect(page.getByText('Daniel Rincón ahora usa el 99')).toHaveCount(1);
      await expect(boton()).toHaveText('99');

      await boton().click(); await campo().fill('9'); await campo().press('Enter');
      await expect(page.getByText(/ya lo usa Sebastián Peñaranda/)).toBeVisible();
      await campo().press('Escape');
      await expect(boton()).toHaveText('99');

      await boton().click(); await campo().fill('10'); await campo().press('Enter');
      await expect(boton()).toHaveText('10');
      await page.reload();
      await expect(boton()).toHaveText('10');

      await page.getByPlaceholder('Buscar por nombre, dorsal, posición o equipo').fill('#10');
      await expect(page.locator('table tbody tr')).toHaveCount(1);
    });
  }
});

test('CP-UI-INI-002 [RF-18] Tocar un número del plantel muestra el inicio de ese deportista', async ({ browser }) => {
  const { paginaEn } = require('./ayuda');
  const page = await paginaEn(browser, 'celular');
  await entrar(page, 'entrenador');
  await page.goto('/');
  const lesionado = page.locator('.ini-plantel button.ini-dorsal.no_disponible').first();
  await lesionado.click();
  const hoja = page.locator('.modal-box, .modal').first();
  await expect(hoja.getByText('Así ve su inicio este deportista')).toBeVisible();
  await expect(hoja.getByRole('heading', { name: 'Mi estado' })).toBeVisible();
  await expect(hoja.getByText('No disponible')).toBeVisible();
  await expect(hoja.getByRole('heading', { name: 'Mi asistencia' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.context().close();
});

test('CP-UI-AGE-001 [RF-10] El entrenador programa un entrenamiento con equipo, hora y lugar', async ({ browser }) => {
  const { paginaEn } = require('./ayuda');
  const page = await paginaEn(browser, 'celular');
  await entrar(page, 'entrenador');
  await page.goto('/entrenamientos');
  await page.getByRole('button', { name: /Nuevo entrenamiento/i }).click();
  const hoja = page.locator('.modal-box, .modal').first();
  await hoja.locator('input[name="fecha"]').fill('2026-12-10');
  await hoja.locator('select[name="tipo"]').selectOption('Táctica');
  const opcion = hoja.getByLabel('Equipo').locator('option', { hasText: 'Unisimón Rugby (demo)' });
  await expect(opcion).toHaveCount(1);
  await hoja.getByLabel('Equipo').selectOption(await opcion.getAttribute('value'));
  await hoja.getByLabel('Hora').fill('17:30');
  await hoja.getByLabel('Lugar').fill('Cancha UI prueba');
  await hoja.getByRole('button', { name: 'Crear' }).click();
  // v2.0: los entrenamientos se ven como lista de sesiones con equipo, lugar y hora
  const sesion = page.locator('.lista-sesiones li', { hasText: 'Cancha UI prueba' }).first();
  await expect(sesion).toContainText('Unisimón Rugby (demo)');
  await expect(sesion).toContainText('17:30');
  // El botón de cerrar de los modales tiene nombre para lectores de pantalla
  await page.getByRole('button', { name: /Nuevo entrenamiento/i }).click();
  await expect(page.getByRole('button', { name: 'Cerrar' })).toBeVisible();
  await page.context().close();
});
