# Historial de versiones

Registro de cambios y autoría de cada versión del sistema.
Cada versión está marcada con una etiqueta (tag) en el repositorio.

## v2.1 — Estadísticas por deporte y usuario admin1

**Etiqueta:** `v2.1` · Base de datos: `backend/migrations/010_metricas_y_admin.sql` (incluida en `database.sql`; Railway la aplica al desplegar).

- Estadísticas propias de cada deporte (`backend/config/metricas_deportes.js`): fútbol (goles, asistencias, tarjetas amarillas y rojas, minutos), fútbol sala, baloncesto (puntos, rebotes, asistencias, robos, faltas), rugby (tries, conversiones, penales, drops, pases de try, tackles; puntos calculados), voleibol (puntos, aces, bloqueos, recepciones, errores de saque, sets), béisbol y sóftbol (carreras, hits, impulsadas, jonrones, ponches), natación y atletismo (pruebas, medallas, finales, marcas personales), tenis, ajedrez, balonmano y hockey. "Partidos jugados" se calcula solo. Un deporte nuevo usa un perfil general.
- Pantalla Estadísticas: todos los deportes aparecen al entrar y se eligen con un toque; cada uno muestra sus totales, líderes ordenables por métrica, gráfica y registros, y el formulario pide solo las métricas de ese deporte.
- Se guardan en la columna nueva `estadisticas_jugador.metricas` (JSONB). Las columnas goles / asistencias / minutos_jugados se siguen llenando, así el inicio y los reconocimientos no cambian. Los registros anteriores se muestran con las métricas de su deporte sin modificarlos.
- El servidor valida cada métrica (entero ≥ 0 con tope razonable) y solo deja registrar estadísticas de deportistas del propio alcance.
- El administrador inicial pasa de `robinson_meza` a **`admin1`** (`admin1@dtdeportivo.com`). Conserva id, datos y contraseña. Inicia sesión con `admin1` o con el correo.
- En celular, el nombre y el rol vuelven a verse en la barra superior (observación de la v1.9).
- Documento `Inventario_usuarios_AdministracionDeportiva.pdf` con las cuentas definidas en el código, roles y permisos.

## v2.0 — Errores en ejecución y nuevo diseño "Cancha"

**Etiqueta:** `v2.0` · Base de datos: `backend/migrations/009_correcciones_v2.sql` (también incluida en `database.sql`, se aplica sola al desplegar en Railway).

Errores corregidos (documento "Errores en ejecución")
- DEF-040 · Las fechas se guardaban y mostraban un día antes (12 oct → 11 oct): `pg` ahora devuelve las columnas DATE como texto y todas las pantallas usan `utils/fechas.js`.
- DEF-041 · Asistencia: marcar "Presente" no quedaba a la vista (la columna es booleana y la pantalla comparaba con `=== 1`). Además, un solo registro por deportista y sesión (índice único + upsert) y "Todos presentes/ausentes" en una sola petición.
- DEF-042 · El entrenador podía crear entrenamientos y partidos "Generales (todos los equipos)", que les aparecían a otros deportes. Ahora solo el administrador; el entrenador elige entre los equipos de su deporte (también validado en el servidor).
- DEF-043 · Un usuario desactivado no se podía volver a activar: nueva pestaña "Inactivos" y botón "Reactivar".
- DEF-044 · "Todos mis deportistas" en los avisos del entrenador llega solo a sus deportistas de su deporte, y la opción lo dice ("Todos mis deportistas de Rugby").
- El deportista ve solo su propia antropometría ("Mi antropometría"), sin selector de compañeros.

Mejoras
- Resultado según el deporte: marcador (fútbol, rugby, baloncesto), sets (voleibol) y tiempo/marca + puesto (natación, atletismo). Tipos de evento: liga, torneo, amistoso y competencia.
- Posiciones propias de cada deporte (`config/deportes.js`).
- Categorías por deporte administrables (Inicio → Deportes y categorías, y al crear un equipo). Tabla `categorias`, `equipos.categoria_id`.
- Al crear un deportista en Usuarios se crea también su ficha: deporte, equipo, posición, género, entrenador y fecha de nacimiento. La edad se calcula y se actualiza sola.
- Equipos: filtro desplegable por deporte y categoría (pensado para celular).
- Convocatoria: "Confirmaron / Sin responder / No pueden" son botones que filtran.
- Panel del Head Coach: tarjetas por entrenador que filtran sus deportistas.
- El entrenador de un solo deporte ya no ve el selector de deporte en Deportistas.

Diseño
- Nuevo sistema visual "Cancha": menú lateral verde noche con líneas de cancha, tipografía de marcador (Barlow Condensed), tableros de cifras, color e ícono por deporte, fixture de partidos con marcador, asistencia con fichas tipo camiseta, portada deportiva en el inicio de sesión y banner de próximo partido con cuenta regresiva.

## v1.9 — Observaciones del tester (primera entrega)

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.9`

Correcciones a partir de las primeras pruebas de Alejandro Guevara en PC y celular.

Acceso por deporte y por rol
- El entrenador, el head coach y el deportista ven solo sus deportes, no los de toda la universidad. Con un solo deporte, la cabecera lo muestra fijo, sin lista.
- El administrador puede asignar el deporte de cada entrenador o head coach en Usuarios. Si no tiene, se usa el deporte de sus deportistas.
- Solo el administrador crea y elimina deportes (antes también el entrenador).
- El personal de salud ya no ve Estadísticas ni los máximos anotadores y reconocimientos del inicio.

Filtro por deporte donde faltaba
- Entrenamientos y Partidos: muestran las actividades del deporte elegido más las generales (sin equipo).
- Salud y controles: controles, historias clínicas y listas de deportistas.
- Usuarios: nueva columna Deporte y filtro por el deporte de la cabecera, junto al filtro por rol.

Inicio de sesión y contraseñas
- DEF-031: con la sesión abierta, el botón Atrás ya no muestra el formulario de inicio de sesión; si se llega al login con sesión, va directo al inicio.
- Botón del ojo para ver la contraseña en Cambiar contraseña y en los formularios de Usuarios.

Celular
- El nombre y el rol se ven arriba, debajo de la cabecera.
- Mi sesión va justo debajo del próximo partido.

Además
- DEF-032: editar un usuario desde Usuarios ya no borra su vínculo con el perfil de deportista.

Datos: migración `008_deporte_entrenador.sql` (deporte asignado en usuarios). Railway la aplica sola al arrancar.

Pruebas: CP-OBS-001 a 007 (API) y CP-UI-OBS-001 a 005 (navegador). CP-UI-NAV-002 pasa a usar el administrador.

## v1.8.2 — Apagado limpio en Railway y lista para el tester

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.8.2`

- Railway enviaba un correo de "crash" en cada despliegue: al apagar la versión anterior con SIGTERM, npm lo reportaba como "command failed". Ahora la app arranca directamente con Node (`backend/config/iniciar_railway.js`) y el servidor cierra ordenadamente (termina las peticiones en curso, cierra la base y sale con código 0).
- `docs/calidad/casos/lista-tester.html`: lista de 60 pruebas manuales por rol (PC, celular o ambos), con casillas que se guardan en el navegador, formulario de fallas (rol, dispositivo, pantalla, pasos, resultado, gravedad y captura) e informe descargable.

## v1.8.1 — Lista de avisos y desborde en celular

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.8.1`

- Lista de avisos de la campanita sin la franja de color al borde: filas con separador y el ícono del tipo de aviso (convocatoria, aviso del entrenador, recordatorio); los no leídos van en negrita con el ícono en verde y la marca "Nuevo".
- DEF-030: en celular, al abrir la campanita la página se desbordaba 27 px y el botón de cerrar quedaba cortado.

## v1.8 — Publicación en Railway

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.8`

El sistema queda publicado con HTTPS en https://app-production-d293.up.railway.app (versión de pruebas, con el plantel de demostración), para que el tester y el equipo lo usen desde cualquier celular.

Despliegue
- `railway.json`: Railway compila el frontend, arranca con `npm run railway:iniciar` (prepara la base y luego inicia el servidor) y verifica `/api/health` antes de dirigir el tráfico a la versión nueva.
- La preparación es idempotente: crea o actualiza el esquema, crea las cuentas base y, con `DATOS_DEMO=1`, carga el plantel de demostración una sola vez. Si falla, Railway mantiene la versión anterior.
- Railway no ejecutó el `preDeployCommand` en el primer despliegue (la base quedó sin tablas); por eso la preparación pasó al arranque.
- Detrás del proxy de Railway el freno de intentos de login funciona por usuario y se reconoce HTTPS. Fotos y logos se guardan en un volumen (`UPLOADS_DIR=/data/uploads`).
- Cada fusión en `main` despliega una versión nueva sin perder los datos.

Pendiente: Railway reemplazará `railway.json` por su formato nuevo (`.railway/railway.ts`) el 2026-12-01; hay que migrarlo antes.

## v1.7 — Agenda por equipo, avisos del entrenador, recordatorios y app instalable

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.7`

Funciones para que el plantel use la app a diario, antes de publicarla en Railway.

Agenda por equipo
- Cada entrenamiento y partido puede tener equipo, hora y lugar. Sin equipo es general y la ven todos; con equipo la ven solo quienes tienen ese equipo a su cargo y sus deportistas.
- El administrador asigna cualquier equipo; el entrenador, solo los equipos donde tiene deportistas (el servidor aplica la misma regla).
- "Esta semana" en el inicio muestra el lugar y la hora de cada actividad.

Avisos del entrenador
- Panel "Avisos del equipo" en el inicio: el entrenador escribe a un equipo o a todos sus deportistas; el administrador, a un equipo o a todo el sistema.
- Cada destinatario recibe el aviso en la campanita y lo ve en su inicio. El autor (o el administrador) puede eliminarlo.

Recordatorios automáticos
- Al deportista: entrenamientos y partidos del día siguiente con hora y lugar, convocatoria sin responder (3 horas después de publicada, para no repetir el aviso) y control médico próximo o vencido.
- Al entrenador: partido de mañana sin convocatoria publicada o con convocados que aún no responden.
- Se generan al abrir la app, sin tareas programadas, y nunca se repiten. Cuando el sistema esté publicado con HTTPS podrán enviarse como notificación push.

Reconocimientos
- Panel sobrio en el inicio: asistencia perfecta del mes (mínimo 3 sesiones), máximo anotador y máximo asistidor de la temporada. El deportista solo ve los reconocimientos propios.

Agregar al calendario e instalar como app
- Cada actividad de "Esta semana" y la convocatoria se pueden agregar al calendario del celular (archivo .ics, con recordatorio 2 horas antes) o a Google Calendar.
- La app se puede instalar: en Android y PC con el botón "Instalar la app"; en iPhone, desde Safari con Compartir → Agregar a pantalla de inicio (el panel "Mi sesión" muestra los pasos).

Velocidad
- El servidor envía los archivos comprimidos y el navegador guarda un año los que no cambian: en celular con 4G lento el inicio carga en 1,9 s (antes 3,0 s).

Datos: migraciones `006_agenda_equipos.sql` (equipo, hora y lugar en entrenamientos y partidos) y `007_comunicados_recordatorios.sql` (comunicados, destinatarios y clave única de recordatorios). Nuevos requisitos RF-21, RF-22 y RF-23.

Pruebas: CP-AGE-001 a 006, CP-COM-001 a 002, CP-REC-001 a 003, CP-RCN-001, CP-UNI-015 y 016 (API y unitarias, 116 de 116); CP-UI-AGE-001, CP-UI-COM-001 y 002, CP-UI-RCN-001 (navegador, 43 de 43).

## v1.6 — Convocatoria de partidos y avisos

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.6`

Para que el plantel use la app: la convocatoria oficial de cada partido se publica en el sistema.

Convocatoria
- El entrenador arma la convocatoria desde el partido o desde el inicio: elige titulares y suplentes entre sus deportistas, viendo el estado médico de cada uno (disponible, con restricciones o no disponible), y agrega hora, lugar e indicaciones.
- Mientras es borrador solo la ve el cuerpo técnico. Al publicarla, la plantilla queda visible en el partido y cada convocado recibe un aviso.
- Es editable después de publicada: quien entra, sale o cambia de titular a suplente recibe un aviso, y si cambia la hora o el lugar se avisa a todos.
- Cada convocado confirma o avisa que no puede (con motivo) hasta el día del partido. El entrenador ve las respuestas y recibe un aviso cuando alguien no puede ir.
- Registro digital: cada acción (publicar, convocar, retirar, cambiar rol, confirmar, no poder ir) queda guardada con quién la hizo y cuándo.
- Botón para compartir la convocatoria por WhatsApp con el enlace a la app.

Avisos
- Campanita en la cabecera para todos los roles, con el número de avisos sin leer; cada aviso lleva directo a la convocatoria.
- Por primera vez el sistema genera avisos (antes la tabla existía pero nada los creaba).

Datos: migración `005_convocatorias.sql` (convocatorias, convocados, convocatoria_historial y enlace en notificaciones). Nuevo requisito RF-20.

Pruebas: CP-CNV-001 a CP-CNV-010 (API) y CP-UI-CNV-001 a 003 (navegador, de punta a punta en celular).

## v1.5.2 — Privacidad de los datos de los deportistas

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.5.2`

Corrige tres fallas de privacidad encontradas al escribir la guía del sistema (datos protegidos por la Ley 1581 de 2012):
- **Asistencia (DEF-027):** cada rol ve solo la asistencia de los deportistas de su alcance; antes un deportista veía la de todo el plantel.
- **Evaluaciones físicas (DEF-028):** se filtran por rol; antes la API las devolvía todas a cualquier usuario.
- **Antropometría (DEF-029):** las medidas de un deportista solo las ve quien puede ver a ese deportista; si no, la API responde "no encontrado".

La regla de alcance (deportista → él mismo, entrenador → los suyos, head coach → los de sus entrenadores, administrador y salud → todos) queda en un solo lugar: `backend/utils/alcance.js`.

Pruebas: CP-PER-010 a CP-PER-012. API 92 de 92, navegador 36 de 36.

## v1.5.1 — Vista del deportista desde el inicio

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.5.1`

- En el plantel del inicio, cada número es un botón: al tocarlo se abre el inicio tal como lo ve ese deportista en su cuenta (su estado, retorno estimado y su asistencia).
- La API acepta `GET /api/dashboard/inicio?jugador_id=N` para el personal. Solo funciona con deportistas a los que ese rol ya tiene acceso (si no, responde 404); un deportista no puede ver la vista de otro.
- Pruebas: CP-INI-010, CP-INI-011 y CP-UI-INI-002.

## v1.5 — Pulido y experiencia de usuario

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.5`

Integra el pulido planificado (DEF-022 a DEF-026) con una mejora de la experiencia en celular y computador. Se entregó en 6 fases (PR #24 a #28).

Accesibilidad y contraste
- Colores con contraste AA: verde de botón `#1E7F3E`, verde de texto `#107233`, naranja con texto oscuro. El verde del logo y de los paneles no cambia.
- Botones de ícono con nombre para lectores de pantalla, selectores con etiqueta, tablas recorribles con el teclado y foco visible sobre cualquier fondo.
- En pantallas táctiles, todos los controles miden al menos 44 px y los campos usan letra de 16 px (evita el zoom de iOS).

Estados de cada pantalla
- Mientras carga se ve la forma del contenido, sin cifras falsas.
- Si el servidor falla, se explica el problema y hay un botón Reintentar en todas las pantallas.
- Estados vacíos con explicación y la acción que corresponde; "sin resultados del filtro" se distingue de "no hay datos".
- Sin emojis en la interfaz: solo íconos de Font Awesome.

Rendimiento
- Cada módulo se descarga al abrirlo y se precarga al pasar el mouse o tocar el menú. El inicio carga en 2,8 s con 4G lento (antes 5,7 s).

Movimiento e interacción
- El hover solo existe con mouse (ya no se queda pegado en el celular); los botones responden al presionar.
- La hoja "Más" y los modales en celular suben desde abajo; las gráficas animan en 250 ms; pulso breve al guardar un dorsal.
- Se respeta la preferencia de movimiento reducido. Revisión estricta con la skill `review-animations`: aprobada.

Responsive
- Deportistas y Estadísticas caben en celular y tableta sin deslizar de lado: columnas clave y el resto en la ficha.
- La ficha del deportista ofrece Editar y Eliminar.

Pruebas: 118 casos, 100 % aprobados; índice de calidad 100 en las 22 métricas medidas (faltan las 4 manuales). Informe: `docs/calidad/informes/v1.5.md`. Registro para auditoría: `docs/calidad/informes/v1.5-registro.md`.

## v1.4 — Seguridad

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.4`

Corrige los 7 defectos de seguridad y robustez de la línea base (DEF-015 a DEF-021).

Contraseñas y sesiones
- Contraseñas con hash `scrypt` y sal propia (antes, una sola ronda de HMAC-SHA256). Los usuarios existentes no tienen que hacer nada: su hash se actualiza la primera vez que inician sesión.
- Secretos JWT sin valores por defecto en el código: en producción el servidor no arranca si faltan, son cortos o son iguales entre sí. Los tokens deben estar firmados con HS256.
- Tras 5 intentos fallidos para la misma cuenta, el inicio de sesión se bloquea 15 minutos.
- Un correo inexistente tarda lo mismo en responder que uno existente (no revela qué cuentas hay).

Datos de ejemplo sin contraseñas en el código
- `npm run seed` y `npm run demo` asignan una clave aleatoria (se muestra una sola vez) o la de `SEED_CLAVE_INICIAL`, y ya no sobrescriben usuarios existentes.
- Eliminado `seed_cloudsql.js` (obsoleto desde v1.2 y con contraseñas reales).

Errores claros y sin detalles internos
- Identificadores, filtros, fechas, valores de lista y referencias inválidas responden 400 con un mensaje para el usuario (antes, error 500).
- Los errores inesperados muestran un mensaje genérico; el detalle queda solo en la consola del servidor.
- Rangos válidos en la base (migración `004_valores_validos.sql`): edad, peso, altura, goles, asistencias, minutos y medidas no pueden ser negativos.
- Un cuerpo JSON mal formado responde 400.

Otros
- Cabeceras de seguridad (`nosniff`, `X-Frame-Options`, `Referrer-Policy`) y sin `X-Powered-By`.
- CORS limitado: mismo origen en producción, o los dominios de `FRONTEND_URL`.
- La configuración de la API está en un solo lugar (`api/index.js`); `server.js` y `backend/server.js` la reutilizan.

Pruebas: 106 casos (12 nuevos), 100 % aprobados. Informe: `docs/calidad/informes/v1.4.md`.

## v1.3.1 — Marco de calidad y pruebas

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.3.1`

No cambia el funcionamiento del sistema: agrega cómo se evalúa su calidad.

Plan de calidad (ISO/IEC 9126) en `docs/calidad/`
- Requisitos del sistema (RF-01 a RF-19, RNF-01 a RNF-10).
- Características y subcaracterísticas relevantes, con su justificación.
- 26 métricas con fórmula, umbrales e instrumento, e índice de calidad global (meta ≥ 85).
- Plan de pruebas PP-AD-01: alcance, tipos de prueba, entorno, responsables y criterios de aceptación.
- Registro de defectos (26 registrados: 14 cerrados y 12 abiertos, programados para v1.4 y v1.5).

Pruebas automáticas en `pruebas/`
- 94 casos: unitarias, integración de la API contra PostgreSQL, robustez, seguridad, migraciones y navegador (Chromium, Firefox y WebKit).
- Recorrido de los 5 roles por los 13 módulos en 4 anchos de pantalla, accesibilidad con axe-core, objetivos táctiles, carga en 4G y caída del servidor.
- Base de pruebas aparte (`dt_deportivo_pruebas`): no tocan los datos de desarrollo.
- `npm test`, `npm run test:api`, `npm run test:ui` y `npm run test:reporte`, que genera el catálogo de casos y el informe con las métricas.

Línea base (informe `docs/calidad/informes/v1.3.1.md`)
- 92,6 % de aprobación (87 de 94; los 7 restantes son defectos conocidos).
- Índice global 67 de 100: funcionalidad y mantenibilidad en 100; usabilidad y fiabilidad son las prioridades.

Otros
- El servidor acepta la variable `PORT`.

## v1.3 — Administración Deportiva con identidad Unisimón

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.3`

Identidad y diseño
- Nuevo nombre: Administración Deportiva (antes DTdeportivo).
- Diseño alineado con las plataformas de Unisimón: Roboto, Font Awesome, logos oficiales, franja de marca, paneles con encabezado verde, footer negro. Sistema documentado en `docs/diseno/DESIGN.md`.
- Login rehecho como el del portal estudiantil.
- Pestañas en computador y menú inferior con hoja "Más" en celular (antes, en celular no había forma de navegar).
- Inicio nuevo con datos reales: próximo partido, disponibilidad del plantel por dorsal, para revisar, agenda de la semana, asistencia, máximos anotadores, mi sesión (con cambio de contraseña) y gestión de deportes.
- Todos los módulos adoptan la paleta nueva; colores del tema oscuro corregidos (puntos de la somatocarta y textos de gráficas que quedaban invisibles).

Dorsal (número de camiseta)
- Columna `dorsal` (0 a 99), única por equipo; migración `003_dorsal.sql`.
- Se edita en la ficha, con un clic en la tabla de Deportistas y por CSV; aparece como "#7 Nombre" en todos los módulos.

Correcciones
- Asignar o quitar un equipo ya no borra el dorsal ni el entrenador del jugador (actualización parcial).
- El deporte por defecto es "Todos los deportes" (antes se elegía el primero y podía ocultar un plantel).
- Menú y permisos de las páginas salen de la misma configuración; el head coach puede consultar equipos.
- La búsqueda de Deportistas ya no ignora los filtros avanzados y permite buscar por dorsal.
- Un login con credenciales incorrectas ya no intenta refrescar la sesión.

Para el equipo
- `npm run demo` carga un plantel de ejemplo con fechas relativas a hoy.
- `HOST=127.0.0.1 npm run dev` limita el servidor a la propia computadora.

## v1.2 — PostgreSQL nativo

**Autor:** Carlos Gamboa · **Etiqueta:** `v1.2`

- Se elimina Firebase y el adaptador que traducía SQL a Firestore; el backend usa solo PostgreSQL con el driver `pg`.
- Se eliminan la configuración de Firebase con la API key expuesta y las reglas de Firestore abiertas.
- Esquema `database.sql` completo y ordenado, con todas las columnas que usa el código.
- Migraciones para bases existentes en `backend/migrations/`.
- Seguridad: antropometría y evaluaciones aceptan solo columnas válidas (antes era posible la inyección SQL).
- Comandos `npm run db:init` y `npm run seed`.

## v1.1 — Head Coach, Salud y filtros

**Autor:** Eder · **Correcciones:** Carlos Gamboa · **Etiqueta:** `v1.1`

Aporte de Eder:
- Rol Head Coach con panel de supervisión.
- Módulo de Salud: historias clínicas, controles médicos, seguimiento de lesiones y notificaciones.
- Asignación de entrenador por jugador y filtros en Deportistas.
- Visibilidad por rol en jugadores, lesiones y estadísticas.
- Migración SQL para roles y salud.
- Accesos de demostración en el login para desarrollo local.

Correcciones de Carlos:
- Rutas de Head Coach y Salud registradas en todos los servidores (antes daban 404 en Vercel).
- El login de demostración solo actúa si el backend no responde.
- Cada rol ve sus propias lesiones y no puede abrir las ajenas.

> El commit del aporte figura con autor Carlos Gamboa porque se integró desde su equipo; el trabajo de la v0.1 es de Eder.

## v1.0 — Versión original

**Autores:** grupo del proyecto · **Etiqueta:** `v1-original`

- Versión inicial de DTdeportivo: equipos, jugadores, entrenamientos, asistencia, partidos, estadísticas, lesiones, evaluaciones físicas y antropometría ISAK.
