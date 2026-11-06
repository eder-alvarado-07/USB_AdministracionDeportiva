# Administración Deportiva

Plataforma web para la gestión deportiva de la Universidad Simón Bolívar, sede Cúcuta (antes llamada DTdeportivo).

Diseño alineado con las plataformas oficiales de Unisimón y pensado para celular y computador: ver `docs/diseno/DESIGN.md`. Historial de versiones y autores en `CHANGELOG.md`.

> **Estado documentado:** esta guía describe lo que se identifica en el código de la versión entregada. La existencia de una pantalla no demuestra por sí sola que la operación esté integrada con la base de datos ni que sus permisos hayan sido probados de extremo a extremo.

## Tecnologías identificadas

- **Frontend:** React 18, Vite, React Router, Axios, Recharts y Lucide.
- **Backend:** Node.js/Express, controladores y rutas bajo `backend/`.
- **Datos:** PostgreSQL nativo (driver `pg`). Funciona con PostgreSQL local, Neon o Cloud SQL. Desde la v1.2 no se usa Firebase.
- **Acceso:** el frontend incluye contexto de autenticación y un menú que filtra opciones por rol. En modo desarrollo también contiene cuentas de demostración; estas no sustituyen una autenticación real ni prueban los permisos del backend.

## Módulos visibles en el frontend

| Módulo/página | Archivo |
|---|---|
| Inicio / Dashboard | `frontend/src/pages/Dashboard.jsx` |
| Equipos | `frontend/src/pages/Equipos.jsx` |
| Deportistas | `frontend/src/pages/Jugadores.jsx` |
| Entrenamientos | `frontend/src/pages/Entrenamientos.jsx` |
| Asistencia | `frontend/src/pages/Asistencia.jsx` |
| Lesiones | `frontend/src/pages/Lesiones.jsx` |
| Salud y controles | `frontend/src/pages/Salud.jsx` |
| Evaluaciones | `frontend/src/pages/Evaluaciones.jsx` |
| Partidos | `frontend/src/pages/Partidos.jsx` |
| Estadísticas | `frontend/src/pages/EstadisticasJugador.jsx` |
| Antropometría | `frontend/src/pages/Antropometria.jsx` |
| Usuarios | `frontend/src/pages/Usuarios.jsx` |
| Panel Head Coach | `frontend/src/pages/HeadCoach.jsx` |

## Roles contemplados

El frontend reconoce los roles `administrador`, `head_coach`, `entrenador`, `personal_salud` y `jugador`.

- **Administrador:** acceso administrativo y a la pantalla de Usuarios.
- **Head Coach:** panel de supervisión y vistas deportivas que aparecen habilitadas en el menú.
- **Entrenador:** vistas relacionadas con equipos y gestión deportiva.
- **Personal de salud:** vistas de salud, lesiones y evaluaciones que aparecen habilitadas.
- **Jugador:** vistas de consulta deportiva y personal habilitadas por el menú.

**Advertencia de seguridad:** el menú y las rutas protegidas del frontend no bastan para garantizar privacidad. Deben validarse también los permisos y filtros en el backend para cada endpoint, especialmente para datos médicos, antropometría, estadísticas y asistencia. La matriz definitiva de permisos debe actualizarse después de probar cada rol.

## Base de datos (PostgreSQL)

1. Crear una base vacía, por ejemplo `dt_deportivo`.
2. Copiar `.env.example` a `.env` y completar `DATABASE_URL` **o** las variables `DB_*`.
3. Generar dos secretos distintos para `JWT_SECRET` y `JWT_REFRESH_SECRET` (mínimo 32 caracteres; en producción el servidor no arranca sin ellos):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

4. Crear el esquema y los usuarios base:

```bash
npm install
npm run db:init   # ejecuta backend/config/database.sql
npm run seed      # crea los usuarios base y muestra su clave inicial una sola vez
npm run demo      # opcional: plantel de rugby de ejemplo con dorsales, lesiones, asistencia y próximo partido
npm run dev       # API + frontend en http://localhost:3000
```

Las contraseñas no están en el código. `npm run seed` asigna a cada usuario nuevo una clave aleatoria y la muestra en la consola, o usa `SEED_CLAVE_INICIAL` si está definida en `.env`. Los usuarios que ya existen no se modifican.

**Base existente de una versión anterior:** después de hacer un respaldo, ejecutar en orden los scripts de `backend/migrations/` que falten (`001_roles_y_salud.sql` a `010_metricas_y_admin.sql`; en Railway, `database.sql` ya los aplica al desplegar). Los usuarios existentes siguen entrando con su clave de siempre; su contraseña se protege con el hash nuevo la primera vez que inician sesión.

## Ejecutar el frontend en desarrollo

Requisito: instalar Node.js.

Desde una terminal:

```bash
cd frontend
npm install
npm run dev
```

Abrir la dirección `Local` que indique Vite en la terminal. Si los puertos habituales están ocupados, Vite puede seleccionar otro puerto.

Este comando inicia el **frontend**. No garantiza por sí solo que el backend ni la base de datos estén funcionando. Si la interfaz muestra errores de red o HTTP, verificar el proceso del servidor, la configuración de API y la base de datos antes de concluir que los registros se guardan.

## Publicar en Railway

El repositorio trae `railway.json`: Railway compila el frontend (`npm run build`) y arranca con `node backend/config/iniciar_railway.js`, que primero prepara la base (`npm run railway:preparar`) y luego inicia el servidor en el mismo proceso (sin npm, para que el apagado de cada versión anterior no se reporte como crash); Railway verifica `/api/health` antes de dirigir el tráfico a la versión nueva.

1. En Railway, crear un proyecto con dos servicios: **PostgreSQL** y la aplicación desde este repositorio de GitHub (rama `main`).
2. En la aplicación, agregar un **volumen** montado en `/data` (fotos de deportistas y logos).
3. Variables de la aplicación:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia al servicio de PostgreSQL) |
| `JWT_SECRET` y `JWT_REFRESH_SECRET` | dos valores distintos de al menos 32 caracteres (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `SEED_CLAVE_INICIAL` | clave inicial de las cuentas base; cada usuario la cambia en Inicio → Mi sesión |
| `UPLOADS_DIR` | `/data/uploads` |
| `DATOS_DEMO` | `1` solo en la versión de pruebas (carga el plantel de demostración una vez) |

4. En **Settings → Networking**, generar un dominio público. Railway entrega HTTPS, necesario para instalar la app en el celular.

Cada vez que se fusiona un cambio en `main`, Railway vuelve a desplegar. El esquema se actualiza solo (`database.sql` es idempotente) y los datos existentes se conservan. Si la preparación de la base falla, el servidor no arranca, el health check no pasa y la versión anterior sigue en línea.

## Archivos de documentación y configuración

- `DOCUMENTACION.html`: documentación visual general del sistema.
- `IMPLEMENTACION.md`: estado de las funcionalidades, limitaciones y tareas de validación.
- `.env.example`: ejemplo de variables de entorno; revisar antes de iniciar el backend.
- `backend/config/database.sql`: esquema completo de PostgreSQL (crea la base desde cero).
- `backend/migrations/`: scripts para actualizar bases creadas con versiones anteriores.
- `docs/calidad/`: plan de calidad (ISO/IEC 9126), casos de prueba, defectos e informes.
- `pruebas/`: pruebas automáticas de la API y del navegador.
- `backend/`: rutas, controladores, middleware, configuración y migraciones del backend.

## Pruebas y calidad

El proyecto se evalúa con la norma ISO/IEC 9126. El marco completo está en `docs/calidad/`: requisitos, características, métricas, plan de pruebas, catálogo de casos, registro de defectos e informes por versión.

```bash
npx playwright install   # solo la primera vez
npm test                 # API (unitarias e integración) y navegador; usa una base aparte, dt_deportivo_pruebas
npm run test:reporte -- v1.4   # regenera el catálogo y escribe el informe de esa versión
```

Detalle de los comandos y de cómo agregar casos: `pruebas/README.md`. Último informe: `docs/calidad/informes/v1.7.md`.

## Alcance de esta versión

Este documento se actualiza para reflejar la estructura del frontend actual. No afirma que todas las funciones estén terminadas, que los roles estén completamente protegidos o que la persistencia se haya verificado con una base de datos real.
