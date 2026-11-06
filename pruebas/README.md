# Pruebas automáticas

Implementan el plan de pruebas PP-AD-01 (`docs/calidad/03_plan_de_pruebas.md`). Cada caso lleva en su título un identificador (`CP-…`) y los requisitos que verifica (`[RF-09]`). Esos datos son los que usa el catálogo de casos.

## Requisitos

- Node.js 20 o superior y PostgreSQL 17 corriendo localmente, con el usuario y la contraseña de tu `.env`.
- Una sola vez, los navegadores de Playwright: `npx playwright install`.

Las pruebas **no tocan tu base de desarrollo**. Cada ejecución borra y vuelve a crear la base `dt_deportivo_pruebas`, con el esquema, los usuarios de `seed.js` y el plantel de `npm run demo`. Se niegan a correr si `NODE_ENV=production`.

## Comandos

| Comando | Qué hace | Tiempo aprox. |
|---|---|---|
| `npm run test:api` | Pruebas unitarias e integración de la API (`unitarias/`, `integracion/`) | 30 s |
| `npm run test:ui` | Pruebas en navegador (`ui/`): compila el frontend, levanta el servidor en el puerto 3100 y prueba en Chromium; los casos `@compat` también en Firefox y WebKit | 5 min |
| `npm test` | Las dos anteriores | 6 min |
| `npm run test:reporte -- v1.4` | Con los resultados de la última ejecución, regenera `docs/calidad/casos/catalogo.md` y escribe `docs/calidad/informes/v1.4.md` con las métricas | 2 s |

Para correr un solo archivo o un solo caso:

```bash
node --test pruebas/integracion/dorsal.test.js      # necesita la base ya preparada por test:api
npx playwright test -g "CP-UI-DOR"                   # por identificador
npx playwright test --project=chromium --headed      # viendo el navegador
```

## Carpetas

```
pruebas/
├── utilidades/      base de pruebas, cuentas y cliente de la API
├── unitarias/       cálculos y utilidades sin base de datos (CP-UNI)
├── integracion/     API contra PostgreSQL (CP-AUT, PER, MOD, DOR, INI, SEG, CSV, MIG)
├── ui/              navegador con Playwright (CP-UI-…), incluye mediciones de accesibilidad y rendimiento
├── ejecutar-api.js  prepara la base y ejecuta las pruebas de API
├── reporte.js       genera catálogo e informe
└── resultados/      salida de cada ejecución (no se sube a git)
```

## Defectos conocidos

Un caso que reproduce un defecto abierto se marca con `{ todo: 'DEF-015' }`. Se ejecuta y aparece en el informe como "falla conocida", pero no rompe `npm test`. Al corregir el defecto hay que quitar la marca y cerrarlo en `docs/calidad/defectos.md`.

## En cada Pull Request

1. Agregar o actualizar los casos de lo que cambió.
2. Ejecutar `npm test`: no debe haber fallos nuevos.
3. Registrar en `docs/calidad/defectos.md` los defectos encontrados.
4. Al cerrar una versión, ejecutar `npm run test:reporte -- <versión>` y agregar las conclusiones en `docs/calidad/informes/<versión>-conclusiones.md`.
