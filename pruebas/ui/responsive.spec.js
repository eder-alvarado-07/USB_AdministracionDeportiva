// Tablas anchas en celular y tableta (v1.5 fase 5B, opción B): columnas clave sin desplazamiento lateral (RNF-04)
const { test, expect } = require('@playwright/test');
const { entrar, paginaEn } = require('./ayuda');

const anchoTabla = (page) => page.locator('table').first().evaluate(t => ({ tabla: t.scrollWidth, visible: t.parentElement.clientWidth }));

for (const ancho of ['celular360', 'celular', 'tableta']) {
  test(`CP-UI-RES-00${{ celular360: 1, celular: 2, tableta: 3 }[ancho]} [RNF-04] Deportistas y Estadísticas caben sin deslizar de lado (${ancho})`, async ({ browser }) => {
    const page = await paginaEn(browser, ancho);
    await entrar(page, 'administrador');
    for (const ruta of ['/jugadores', '/estadisticas']) {
      await page.goto(ruta);
      await expect(page.locator('table tbody tr').first()).toBeVisible();
      const { tabla, visible } = await anchoTabla(page);
      expect(tabla, `${ruta}: la tabla mide ${tabla} px en ${visible} px`).toBeLessThanOrEqual(visible + 1);
    }
    await page.context().close();
  });
}

test('CP-UI-RES-004 [RF-08] En celular, editar y eliminar un deportista están en su ficha', async ({ browser }) => {
  const page = await paginaEn(browser, 'celular');
  await entrar(page, 'administrador');
  await page.goto('/jugadores');
  const fila = page.locator('table tbody tr').first();
  await expect(fila.locator('.sub-movil')).toBeVisible();
  await expect(fila.getByRole('button', { name: /^Editar a / })).toBeHidden();
  await fila.getByRole('button', { name: /^Ficha de / }).click();
  const modal = page.locator('.modal-box, .modal').first();
  await expect(modal.getByRole('button', { name: 'Editar' })).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Eliminar' })).toBeVisible();
  await modal.getByRole('button', { name: 'Editar' }).click();
  await expect(page.locator('.modal-box, .modal').first()).toContainText(/Editar|Deportista/);
  await page.context().close();
});
