# Catálogo de requisitos — Administración Deportiva

Versión de referencia: **v1.3** (10 de octubre de 2026). Responsable: Carlos Gamboa.

Este catálogo es la base de la trazabilidad: cada caso de prueba se asocia a uno o más requisitos, y la métrica de funcionalidad se calcula sobre esta lista. Se construyó a partir de lo que la aplicación hace hoy (rutas de la API y pantallas), no de documentación anterior.

Prioridad: **A** = imprescindible para el uso del sistema, **M** = importante, **B** = deseable.

## Roles

| Rol | Descripción |
|---|---|
| Administrador | Gestiona usuarios, deportes y toda la información. |
| Head coach | Supervisa a sus entrenadores asociados y a los deportistas de ellos. |
| Entrenador | Gestiona a sus deportistas, entrenamientos, asistencia, partidos y estadísticas. |
| Personal de salud | Gestiona lesiones, controles médicos, historias clínicas y antropometría. |
| Deportista | Consulta su propia información. |

## Requisitos funcionales

| ID | Requisito | Roles | Prioridad |
|---|---|---|---|
| RF-01 | Iniciar sesión con usuario o correo y contraseña; rechazar credenciales incorrectas con un mensaje claro; mantener la sesión con token renovable y permitir cerrarla. | Todos | A |
| RF-02 | Cambiar la propia contraseña validando la actual. | Todos | M |
| RF-03 | Gestionar usuarios: crear, editar, desactivar, restablecer contraseña, asignar rol y crear en lote desde CSV. | Administrador | A |
| RF-04 | Restringir menú, páginas y operaciones de la API según el rol. | Todos | A |
| RF-05 | Mostrar a cada rol solo los datos que le corresponden: el deportista los suyos, el entrenador los de sus deportistas y el head coach los de sus entrenadores. | Todos | A |
| RF-06 | Gestionar deportes (crear y eliminar, solo el administrador) y filtrar la información por deporte en toda la aplicación (también entrenamientos, partidos, salud y usuarios). El entrenador, el head coach y el deportista ven solo sus deportes; el administrador puede asignar el deporte de cada entrenador. | Administrador, entrenador | M |
| RF-07 | Gestionar equipos: crear, editar, cargar escudo, eliminar, ver nómina y asignar o desvincular deportistas. | Administrador, entrenador (consulta: head coach, salud) | M |
| RF-08 | Gestionar deportistas: crear, editar, eliminar, subir foto, ver ficha, buscar, filtrar e importar desde CSV. | Administrador, entrenador | A |
| RF-09 | Asignar, cambiar y quitar el dorsal (0 a 99) de un deportista, sin repetirlo dentro de un equipo, y mostrarlo junto al nombre en todo el sistema. | Administrador, entrenador | M |
| RF-10 | Gestionar entrenamientos (fecha, tipo y descripción). | Administrador, entrenador | A |
| RF-11 | Registrar la asistencia de los deportistas a cada entrenamiento. | Administrador, entrenador | A |
| RF-12 | Gestionar partidos (fecha, rival, tipo y resultado). | Administrador, entrenador | M |
| RF-13 | Registrar estadísticas por deportista y partido (anotaciones, asistencias, minutos). | Administrador, entrenador | M |
| RF-14 | Registrar y editar lesiones (personal de salud y administrador) y consultarlas según el rol. | Salud, administrador (consulta: todos según RF-05) | A |
| RF-15 | Gestionar historias clínicas, controles médicos con aptitud deportiva, seguimiento de lesiones y notificaciones. | Salud, administrador (deportista: consulta propia) | A |
| RF-16 | Registrar evaluaciones físicas de rugby y calcular puntajes normalizados. | Administrador, entrenador, salud | M |
| RF-17 | Registrar mediciones antropométricas ISAK y calcular automáticamente % de grasa, masas corporales y somatotipo, con su somatocarta. | Salud, administrador | A |
| RF-18 | Mostrar en el inicio el próximo partido, la disponibilidad del plantel, los avisos para revisar, la agenda de la semana, la asistencia reciente y los máximos anotadores, según el rol. | Todos | A |
| RF-19 | Mostrar al head coach el panel de supervisión con sus entrenadores y los deportistas de ellos. | Head coach | M |
| RF-20 | Armar y publicar la convocatoria de cada partido (titulares y suplentes), avisar a los convocados dentro de la app, recibir su confirmación hasta el día del partido y guardar el registro de cada cambio y respuesta. | Entrenador, administrador; consulta: todos | A |
| RF-21 | Enviar avisos del entrenador (o del administrador) a un equipo o a todos sus deportistas, con aviso en la campanita y registro en el inicio. | Entrenador, administrador; reciben: deportistas | M |
| RF-22 | Recordar automáticamente las actividades del día siguiente, las convocatorias sin responder y los controles médicos próximos, y permitir agregar entrenamientos y partidos al calendario del dispositivo. | Todos | M |
| RF-23 | Mostrar reconocimientos del plantel: asistencia perfecta del mes, máximo anotador y máximo asistidor de la temporada. | Todos | B |

## Requisitos no funcionales

| ID | Requisito | Característica ISO 9126 | Prioridad |
|---|---|---|---|
| RNF-01 | Las contraseñas se guardan con hash y sal; el acceso a la API exige token válido; las entradas no permiten inyección SQL. | Funcionalidad (seguridad de acceso) | A |
| RNF-02 | Los datos de salud solo los ven el personal autorizado y el propio deportista, en línea con la Ley 1581 de 2012 de protección de datos personales. | Funcionalidad (seguridad de acceso) | A |
| RNF-03 | Las entradas inválidas se rechazan con un mensaje claro y nunca dejan el sistema en un estado incorrecto. | Fiabilidad (tolerancia a fallos) | A |
| RNF-04 | Funciona en celular (360 a 430 px de ancho) y en computador (1024 px o más) sin desplazamiento horizontal de la página. | Portabilidad (adaptabilidad) | A |
| RNF-05 | Funciona en los motores de navegador Chromium (Chrome, Edge), Firefox y WebKit (Safari). | Portabilidad (adaptabilidad) | M |
| RNF-06 | Los botones y enlaces miden al menos 44 px para uso táctil; los textos cumplen contraste AA; el foco del teclado es visible. | Usabilidad (operabilidad) | M |
| RNF-07 | La interfaz sigue la identidad institucional de Unisimón descrita en `docs/diseno/DESIGN.md`. | Usabilidad (atractivo) | M |
| RNF-08 | Las operaciones comunes de la API responden en menos de 500 ms y la pantalla de inicio carga en menos de 3 s. | Eficiencia (comportamiento temporal) | M |
| RNF-09 | El sistema se instala desde cero siguiendo el README con Node.js y PostgreSQL. | Portabilidad (instalabilidad) | M |
| RNF-10 | Todo cambio entra por Pull Request, queda en `CHANGELOG.md` y conserva las pruebas automáticas en verde. | Mantenibilidad (estabilidad) | M |
