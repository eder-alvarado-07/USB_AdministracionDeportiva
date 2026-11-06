# Catálogo de casos de prueba

Generado automáticamente por `npm run test:reporte` el 2026-10-12 (versión v1.9). No editar a mano: los casos se definen en `pruebas/` y su detalle (precondiciones, datos, pasos y resultado esperado) está en el código de cada prueba, bajo el identificador indicado.

Casos manuales (usabilidad e instalación): ver `casos/manuales.md`.

| ID | Caso | Requisitos | Tipo | Característica ISO 9126 | Archivo | Navegadores | Último resultado |
|---|---|---|---|---|---|---|---|
| CP-AGE-001 | Un entrenamiento del equipo lo ven solo quienes tienen ese equipo en su alcance | RF-10 | Otro | — | `pruebas/integracion/agenda.test.js` | — | ✔ Aprobado |
| CP-AGE-002 | Una actividad sin equipo es general y la ven todos | RF-10 | Otro | — | `pruebas/integracion/agenda.test.js` | — | ✔ Aprobado |
| CP-AGE-003 | Un entrenador solo asigna equipos donde tiene deportistas | RF-05 | Otro | — | `pruebas/integracion/agenda.test.js` | — | ✔ Aprobado |
| CP-AGE-004 | Hora con formato inválido devuelve 400 | RNF-03 | Otro | — | `pruebas/integracion/agenda.test.js` | — | ✔ Aprobado |
| CP-AGE-005 | Editar sin enviar equipo, hora ni lugar los conserva | RF-10 | Otro | — | `pruebas/integracion/agenda.test.js` | — | ✔ Aprobado |
| CP-AGE-006 | "Esta semana" muestra lugar y hora, y otro entrenador no ve la agenda del equipo | RF-18 | Otro | — | `pruebas/integracion/agenda.test.js` | — | ✔ Aprobado |
| CP-AUT-001 | Inicio de sesión válido devuelve tokens y el rol | RF-01 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/autenticacion.test.js` | — | ✔ Aprobado |
| CP-AUT-002 | Contraseña incorrecta devuelve 401 con mensaje | RF-01 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/autenticacion.test.js` | — | ✔ Aprobado |
| CP-AUT-003 | Usuario inexistente devuelve 401 (sin revelar si existe) | RF-01 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/autenticacion.test.js` | — | ✔ Aprobado |
| CP-AUT-004 | Campos vacíos devuelven 400 | RF-01 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/autenticacion.test.js` | — | ✔ Aprobado |
| CP-AUT-005 | /auth/me devuelve el usuario de la sesión | RF-01 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/autenticacion.test.js` | — | ✔ Aprobado |
| CP-AUT-006 | Rutas protegidas sin token devuelven 401 | RNF-01 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/autenticacion.test.js` | — | ✔ Aprobado |
| CP-AUT-007 | Token alterado devuelve 401 | RNF-01 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/autenticacion.test.js` | — | ✔ Aprobado |
| CP-AUT-008 | El token de refresco genera un nuevo token de acceso | RF-01 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/autenticacion.test.js` | — | ✔ Aprobado |
| CP-AUT-009 | Cambiar contraseña exige la actual y permite volver a entrar | RF-02 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/autenticacion.test.js` | — | ✔ Aprobado |
| CP-CNV-001 | El entrenador guarda un borrador que solo ve el cuerpo técnico | RF-20 | Otro | — | `pruebas/integracion/convocatorias.test.js` | — | ✔ Aprobado |
| CP-CNV-002 | Al publicar, los convocados reciben el aviso y ven la plantilla | RF-20 | Otro | — | `pruebas/integracion/convocatorias.test.js` | — | ✔ Aprobado |
| CP-CNV-003 | Otro entrenador no ve el partido de otro equipo ni puede tocar su convocatoria | RF-05 | Otro | — | `pruebas/integracion/convocatorias.test.js` | — | ✔ Aprobado |
| CP-CNV-004 | El deportista confirma o avisa que no puede, y el entrenador se entera | RF-20 | Otro | — | `pruebas/integracion/convocatorias.test.js` | — | ✔ Aprobado |
| CP-CNV-005 | Editar la convocatoria publicada avisa a los afectados | RF-20 | Otro | — | `pruebas/integracion/convocatorias.test.js` | — | ✔ Aprobado |
| CP-CNV-006 | No se puede responder una convocatoria de un partido que ya pasó | RF-20 | Otro | — | `pruebas/integracion/convocatorias.test.js` | — | ✔ Aprobado |
| CP-CNV-007 | El registro digital guarda cada acción con quién la hizo | RF-20 | Otro | — | `pruebas/integracion/convocatorias.test.js` | — | ✔ Aprobado |
| CP-CNV-008 | El inicio muestra la convocatoria: la propia al deportista y el resumen al entrenador | RF-18 | Otro | — | `pruebas/integracion/convocatorias.test.js` | — | ✔ Aprobado |
| CP-CNV-009 | Los avisos se marcan como leídos y nadie ve los de otro | RF-20 | Otro | — | `pruebas/integracion/convocatorias.test.js` | — | ✔ Aprobado |
| CP-CNV-010 | Guardar sin hora ni lugar no borra los que ya estaban | RF-20 | Otro | — | `pruebas/integracion/convocatorias.test.js` | — | ✔ Aprobado |
| CP-COM-001 | El entrenador envía un aviso a su equipo y le llega a cada deportista | RF-21 | Otro | — | `pruebas/integracion/comunicacion.test.js` | — | ✔ Aprobado |
| CP-COM-002 | Solo se escribe a equipos propios, con título y mensaje, y solo el autor lo borra | RF-21 | Otro | — | `pruebas/integracion/comunicacion.test.js` | — | ✔ Aprobado |
| CP-CSV-001 | Importa las filas válidas y reporta las inválidas | RF-08 | Integración | Funcionalidad · Interoperabilidad | `pruebas/integracion/csv.test.js` | — | ✔ Aprobado |
| CP-CSV-002 | Dorsal repetido o inválido: se importa sin dorsal y se avisa | RF-09 | Integración | Funcionalidad · Interoperabilidad | `pruebas/integracion/csv.test.js` | — | ✔ Aprobado |
| CP-CSV-003 | Carga de usuarios por CSV: crea los válidos y reporta errores | RF-03 | Integración | Funcionalidad · Interoperabilidad | `pruebas/integracion/csv.test.js` | — | ✔ Aprobado |
| CP-DOR-001 | Crear un deportista con dorsal | RF-09 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/dorsal.test.js` | — | ✔ Aprobado |
| CP-DOR-002 | Un dorsal repetido en el mismo equipo devuelve 409 con el nombre de quien lo usa | RF-09 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/dorsal.test.js` | — | ✔ Aprobado |
| CP-DOR-003 | Sin equipo se puede repetir el número | RF-09 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/dorsal.test.js` | — | ✔ Aprobado |
| CP-DOR-004 | Dorsal fuera de rango devuelve 400 | RF-09 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/dorsal.test.js` | — | ✔ Aprobado |
| CP-DOR-005 | Cambio rápido: ocupado (409), cambiar y quitar | RF-09 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/dorsal.test.js` | — | ✔ Aprobado |
| CP-DOR-006 | Quitar el equipo conserva dorsal y entrenador (defecto DEF-002 corregido) | RF-09 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/dorsal.test.js` | — | ✔ Aprobado |
| CP-DOR-007 | Volver a un equipo donde el número ya está ocupado devuelve 409 | RF-09 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/dorsal.test.js` | — | ✔ Aprobado |
| CP-DOR-008 | El dorsal viaja con el nombre en otros módulos | RF-09 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/dorsal.test.js` | — | ✔ Aprobado |
| CP-INI-001 | Disponibilidad del entrenador: 18 disponibles, 2 con restricciones y 3 no disponibles | RF-18 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-INI-002 | Cada jugador tiene un estado coherente con su motivo | RF-18 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-INI-003 | Próximo partido y agenda de los próximos 7 días | RF-18 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-INI-004 | Asistencia: 4 sesiones con conteos del plantel | RF-18 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-INI-005 | Avisos para revisar: lesiones y restricciones del plantel | RF-18 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-INI-006 | Solo salud y administración ven controles vencidos y antropometría pendiente | RNF-02 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-INI-007 | El head coach ve el plantel de sus entrenadores | RF-05 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-INI-008 | El jugador solo se ve a sí mismo | RF-05 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-INI-009 | Máximos anotadores ordenados por anotaciones | RF-18 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-INI-010 | El personal ve el inicio de un deportista de su alcance, como lo ve ese deportista | RF-18 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-INI-011 | Nadie ve la vista de un deportista fuera de su alcance | RF-05 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/inicio.test.js` | — | ✔ Aprobado |
| CP-MIG-001 | database.sql crea el esquema completo en una base vacía y se puede repetir | RNF-09 | Migración | Portabilidad · Instalabilidad y reemplazo | `pruebas/integracion/migraciones.test.js` | — | ✔ Aprobado |
| CP-MIG-002 | Una base de la versión original se migra sin perder datos | RNF-09 | Migración | Portabilidad · Instalabilidad y reemplazo | `pruebas/integracion/migraciones.test.js` | — | ✔ Aprobado |
| CP-MOD-001 | Todos los módulos responden a la lectura (administrador) | RF-18 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-002 | Usuarios: crear, editar, restablecer y desactivar | RF-03 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-003 | Deportes: crear y eliminar | RF-06 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-004 | Equipos: crear, ver nómina, editar y eliminar | RF-07 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-005 | Deportistas: crear, ver ficha, editar parcialmente y eliminar | RF-08 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-006 | Entrenamientos: crear, editar y eliminar | RF-10 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-007 | Asistencia: registrar y corregir | RF-11 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-008 | Partidos: crear con resultado, editar y eliminar | RF-12 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-009 | Estadísticas: registrar, consultar por jugador y eliminar | RF-13 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-010 | Lesiones: el personal de salud registra, edita y da de alta | RF-14 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-011 | Salud: historia clínica, control médico y seguimiento de lesión | RF-15 | Integración | Funcionalidad · Adecuación | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-012 | Evaluación de rugby: puntajes normalizados exactos | RF-16 | Integración | Funcionalidad · Exactitud | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-MOD-013 | Antropometría: el backend guarda cálculos exactos | RF-17 | Integración | Funcionalidad · Exactitud | `pruebas/integracion/modulos.test.js` | — | ✔ Aprobado |
| CP-OBS-001 | Cada rol ve solo sus deportes en el selector | RF-06 | Otro | — | `pruebas/integracion/observaciones.test.js` | — | ✔ Aprobado |
| CP-OBS-002 | El administrador asigna el deporte a un entrenador | RF-03 | Otro | — | `pruebas/integracion/observaciones.test.js` | — | ✔ Aprobado |
| CP-OBS-003 | Solo el administrador crea y elimina deportes | RF-06 | Otro | — | `pruebas/integracion/observaciones.test.js` | — | ✔ Aprobado |
| CP-OBS-004 | El personal de salud no ve estadísticas deportivas | RF-04 | Otro | — | `pruebas/integracion/observaciones.test.js` | — | ✔ Aprobado |
| CP-OBS-005 | Entrenamientos, partidos y controles traen el deporte para filtrar | RF-06 | Otro | — | `pruebas/integracion/observaciones.test.js` | — | ✔ Aprobado |
| CP-OBS-006 | Los controles médicos: el deportista solo los suyos; head coach y entrenador no entran | RF-05 | Otro | — | `pruebas/integracion/observaciones.test.js` | — | ✔ Aprobado |
| CP-OBS-007 | DEF-032: editar un usuario sin enviar el vínculo no lo borra | RF-03 | Otro | — | `pruebas/integracion/observaciones.test.js` | — | ✔ Aprobado |
| CP-PER-001 | Solo el administrador gestiona usuarios | RF-04 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-002 | El jugador solo ve sus lesiones y no puede abrir las ajenas | RF-05 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-003 | Jugador y entrenador no pueden registrar lesiones | RF-14 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-004 | El entrenador solo ve a sus deportistas | RF-05 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-005 | El entrenador no puede modificar deportistas de otro entrenador | RF-05 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-006 | Historias clínicas: solo salud y administrador | RNF-02 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-007 | El jugador solo ve sus propios controles médicos | RNF-02 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-008 | Panel del head coach: solo head coach (y administrador) | RF-19 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-009 | El head coach consulta equipos pero no los modifica | RF-07 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-010 | La asistencia solo muestra los deportistas del alcance de cada rol | RNF-02 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-011 | Las evaluaciones físicas solo las ve quien tiene al deportista en su alcance | RNF-02 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-PER-012 | Las medidas antropométricas de un deportista no se ven fuera de su alcance | RNF-02 | Integración | Funcionalidad · Seguridad de acceso | `pruebas/integracion/permisos.test.js` | — | ✔ Aprobado |
| CP-RCN-001 | Reconocimientos: el entrenador ve a los líderes; el deportista solo los suyos | RF-23 | Otro | — | `pruebas/integracion/comunicacion.test.js` | — | ✔ Aprobado |
| CP-REC-001 | El deportista recibe un recordatorio del entrenamiento de mañana, una sola vez | RF-22 | Otro | — | `pruebas/integracion/comunicacion.test.js` | — | ✔ Aprobado |
| CP-REC-002 | Convocatoria sin responder: recordatorio al deportista y al entrenador | RF-22 | Otro | — | `pruebas/integracion/comunicacion.test.js` | — | ✔ Aprobado |
| CP-REC-003 | Control médico próximo: recordatorio al deportista | RF-22 | Otro | — | `pruebas/integracion/comunicacion.test.js` | — | ✔ Aprobado |
| CP-SEG-001 | Inyección en el inicio de sesión no da acceso | RNF-01 | Seguridad | Funcionalidad · Seguridad de acceso | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-002 | Inyección en filtros de búsqueda no altera la consulta | RNF-01 | Seguridad | Funcionalidad · Seguridad de acceso | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-003 | Nombres de columna en el cuerpo no se inyectan (lista blanca) | RNF-01 | Seguridad | Funcionalidad · Seguridad de acceso | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-004 | Campos obligatorios faltantes devuelven 400 | RNF-03 | Robustez | Fiabilidad · Tolerancia a fallos | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-005 | Recurso inexistente devuelve 404 | RNF-03 | Robustez | Fiabilidad · Tolerancia a fallos | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-006 | Identificador no numérico en la URL | RNF-03 | Robustez | Fiabilidad · Tolerancia a fallos | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-007 | Filtro de deporte no numérico | RNF-03 | Robustez | Fiabilidad · Tolerancia a fallos | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-008 | Fecha con formato inválido | RNF-03 | Robustez | Fiabilidad · Tolerancia a fallos | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-009 | Tipo de partido fuera de la lista (liga o amistoso) | RNF-03 | Robustez | Fiabilidad · Tolerancia a fallos | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-010 | Referencia a un jugador inexistente | RNF-03 | Robustez | Fiabilidad · Tolerancia a fallos | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-011 | Valores numéricos imposibles (negativos) | RNF-03 | Robustez | Fiabilidad · Tolerancia a fallos | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-012 | Correo de usuario repetido | RNF-03 | Robustez | Fiabilidad · Tolerancia a fallos | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-013 | Un error interno no expone detalles de la base de datos | RNF-01 | Seguridad | Funcionalidad · Seguridad de acceso | `pruebas/integracion/robustez.test.js` | — | ✔ Aprobado |
| CP-SEG-014 | Las contraseñas nuevas se guardan con scrypt y sal propia | RNF-01 | Seguridad | Funcionalidad · Seguridad de acceso | `pruebas/integracion/seguridad.test.js` | — | ✔ Aprobado |
| CP-SEG-015 | Un usuario con hash antiguo entra y su hash se actualiza a scrypt | RNF-01 | Seguridad | Funcionalidad · Seguridad de acceso | `pruebas/integracion/seguridad.test.js` | — | ✔ Aprobado |
| CP-SEG-016 | Cinco intentos fallidos bloquean temporalmente el inicio de sesión | RNF-01 | Seguridad | Funcionalidad · Seguridad de acceso | `pruebas/integracion/seguridad.test.js` | — | ✔ Aprobado |
| CP-SEG-017 | Un cuerpo JSON mal formado devuelve 400 con mensaje | RNF-03 | Robustez | Fiabilidad · Tolerancia a fallos | `pruebas/integracion/seguridad.test.js` | — | ✔ Aprobado |
| CP-SEG-018 | La API envía cabeceras de seguridad y no revela la tecnología | RNF-01 | Seguridad | Funcionalidad · Seguridad de acceso | `pruebas/integracion/seguridad.test.js` | — | ✔ Aprobado |
| CP-SEG-019 | El código no contiene contraseñas ni secretos por defecto | RNF-01 | Seguridad | Funcionalidad · Seguridad de acceso | `pruebas/integracion/seguridad.test.js` | — | ✔ Aprobado |
| CP-SEG-020 | Un token firmado con el secreto por defecto antiguo es rechazado | RNF-01 | Seguridad | Funcionalidad · Seguridad de acceso | `pruebas/integracion/seguridad.test.js` | — | ✔ Aprobado |
| CP-UI-AGE-001 | El entrenador programa un entrenamiento con equipo, hora y lugar | RF-10 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium | ✔ Aprobado |
| CP-UI-CNV-001 | El entrenador arma y publica la convocatoria desde el inicio | RF-20 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/convocatoria.spec.js` | chromium | ✔ Aprobado |
| CP-UI-CNV-002 | El deportista recibe el aviso, abre la convocatoria y confirma | RF-20 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/convocatoria.spec.js` | chromium | ✔ Aprobado |
| CP-UI-CNV-003 | El entrenador ve la confirmación y el registro de cambios | RF-20 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/convocatoria.spec.js` | chromium | ✔ Aprobado |
| CP-UI-COM-001 | El entrenador envía un aviso al equipo desde el inicio | RF-21 | Compatibilidad | Portabilidad · Adaptabilidad | `pruebas/ui/comunicacion.spec.js` | chromium, chromium, firefox, webkit | ✔ Aprobado |
| CP-UI-COM-002 | El deportista ve el aviso en el inicio y en la campanita, sin desbordes en celular | RF-21 | Compatibilidad | Portabilidad · Adaptabilidad | `pruebas/ui/comunicacion.spec.js` | chromium | ✔ Aprobado |
| CP-UI-DOR-001 | Cambiar el dorsal con un clic en la tabla (celular) | RF-09 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium | ✔ Aprobado |
| CP-UI-DOR-002 | Cambiar el dorsal con un clic en la tabla (pc) | RF-09 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium | ✔ Aprobado |
| CP-UI-EST-001 | Sin servidor se explica el error y Reintentar recupera la pantalla | RNF-03 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/estados.spec.js` | chromium | ✔ Aprobado |
| CP-UI-EST-002 | Mientras carga se ve la forma del contenido y ninguna cifra falsa | RNF-06 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/estados.spec.js` | chromium | ✔ Aprobado |
| CP-UI-EST-003 | Un filtro sin resultados ofrece limpiarlo y vuelve a mostrar los datos | RF-08 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/estados.spec.js` | chromium | ✔ Aprobado |
| CP-UI-EST-004 | La interfaz no usa emojis | RNF-07 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/estados.spec.js` | chromium | ✔ Aprobado |
| CP-UI-EST-005 | Si la descarga de un módulo falla, se explica y se ofrece reintentar | RNF-08 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/estados.spec.js` | chromium | ✔ Aprobado |
| CP-UI-INI-001 | El inicio del entrenador muestra el plantel con sus 23 dorsales y el resumen | RF-18 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium | ✔ Aprobado |
| CP-UI-INI-002 | Tocar un número del plantel muestra el inicio de ese deportista | RF-18 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium | ✔ Aprobado |
| CP-UI-LOG-001 | Inicio de sesión por formulario lleva al inicio con el nombre del usuario | RF-01 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium, firefox, webkit | ✔ Aprobado |
| CP-UI-LOG-002 | Credenciales incorrectas muestran un aviso en la página | RF-01 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium | ✔ Aprobado |
| CP-UI-LOG-003 | Cerrar sesión vuelve al login y protege las páginas | RF-01 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium | ✔ Aprobado |
| CP-UI-MED-001 | Medición de accesibilidad con axe-core en celular | RNF-06 | Medición | Usabilidad / Eficiencia / Fiabilidad | `pruebas/ui/mediciones.spec.js` | chromium | ✔ Aprobado |
| CP-UI-MED-002 | Medición de objetivos táctiles de 44 px en celular | RNF-06 | Medición | Usabilidad / Eficiencia / Fiabilidad | `pruebas/ui/mediciones.spec.js` | chromium | ✔ Aprobado |
| CP-UI-MED-003 | Medición de carga del inicio en celular con red 4G simulada | RNF-08 | Medición | Usabilidad / Eficiencia / Fiabilidad | `pruebas/ui/mediciones.spec.js` | chromium | ✔ Aprobado |
| CP-UI-MED-004 | Medición de aviso cuando el servidor no responde | RNF-03 | Medición | Usabilidad / Eficiencia / Fiabilidad | `pruebas/ui/mediciones.spec.js` | chromium | ✔ Aprobado |
| CP-UI-MOV-001 | Con movimiento reducido la hoja "Más" aparece con un fundido, sin desplazarse | RNF-06 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/movimiento.spec.js` | chromium | ✔ Aprobado |
| CP-UI-MOV-002 | Sin preferencia, la hoja "Más" sube desde abajo con la curva de hoja | RNF-06 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/movimiento.spec.js` | chromium | ✔ Aprobado |
| CP-UI-MOV-003 | Los chips de deporte indican cuál está activo y cambian el filtro | RF-06 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/movimiento.spec.js` | chromium | ✔ Aprobado |
| CP-UI-NAV-001 | Hoja "Más" en celular: módulos del rol, cierra con Escape y navega | RF-04 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium | ✔ Aprobado |
| CP-UI-NAV-002 | El selector de deporte filtra el inicio | RF-06 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium | ✔ Aprobado |
| CP-UI-OBS-001 | Con la sesión abierta, Atrás no muestra el formulario de inicio de sesión | RF-01 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/observaciones.spec.js` | chromium | ✔ Aprobado |
| CP-UI-OBS-002 | El ojo muestra y oculta la contraseña nueva | RF-02 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/observaciones.spec.js` | chromium | ✔ Aprobado |
| CP-UI-OBS-003 | En celular se ve el rol arriba y Mi sesión va debajo del próximo partido | RF-18 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/observaciones.spec.js` | chromium | ✔ Aprobado |
| CP-UI-OBS-004 | El entrenador ve su deporte fijo y no puede crear deportes | RF-06 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/observaciones.spec.js` | chromium | ✔ Aprobado |
| CP-UI-OBS-005 | El personal de salud no tiene Estadísticas | RF-04 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/observaciones.spec.js` | chromium | ✔ Aprobado |
| CP-UI-RCN-001 | El entrenador ve los reconocimientos del plantel | RF-23 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/comunicacion.spec.js` | chromium | ✔ Aprobado |
| CP-UI-REC-001 | Recorrido de administrador: 13 módulos en 4 anchos | RF-04, RF-05 | Sistema | Funcionalidad · Seguridad de acceso / Portabilidad · Adaptabilidad | `pruebas/ui/recorrido.spec.js` | chromium | ✔ Aprobado |
| CP-UI-REC-002 | Recorrido de head_coach: 13 módulos en 4 anchos | RF-04, RF-05 | Sistema | Funcionalidad · Seguridad de acceso / Portabilidad · Adaptabilidad | `pruebas/ui/recorrido.spec.js` | chromium | ✔ Aprobado |
| CP-UI-REC-003 | Recorrido de entrenador: 13 módulos en 4 anchos | RF-04, RF-05 | Sistema | Funcionalidad · Seguridad de acceso / Portabilidad · Adaptabilidad | `pruebas/ui/recorrido.spec.js` | chromium | ✔ Aprobado |
| CP-UI-REC-004 | Recorrido de personal_salud: 13 módulos en 4 anchos | RF-04, RF-05 | Sistema | Funcionalidad · Seguridad de acceso / Portabilidad · Adaptabilidad | `pruebas/ui/recorrido.spec.js` | chromium | ✔ Aprobado |
| CP-UI-REC-005 | Recorrido de jugador: 13 módulos en 4 anchos | RF-04, RF-05 | Sistema | Funcionalidad · Seguridad de acceso / Portabilidad · Adaptabilidad | `pruebas/ui/recorrido.spec.js` | chromium | ✔ Aprobado |
| CP-UI-RES-001 | Deportistas y Estadísticas caben sin deslizar de lado (celular360) | RNF-04 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/responsive.spec.js` | chromium | ✔ Aprobado |
| CP-UI-RES-002 | Deportistas y Estadísticas caben sin deslizar de lado (celular) | RNF-04 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/responsive.spec.js` | chromium | ✔ Aprobado |
| CP-UI-RES-003 | Deportistas y Estadísticas caben sin deslizar de lado (tableta) | RNF-04 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/responsive.spec.js` | chromium | ✔ Aprobado |
| CP-UI-RES-004 | En celular, editar y eliminar un deportista están en su ficha | RF-08 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/responsive.spec.js` | chromium | ✔ Aprobado |
| CP-UI-SES-001 | Cambiar contraseña valida la confirmación y la contraseña actual | RF-02 | Sistema | Funcionalidad · Adecuación | `pruebas/ui/funcionalidad.spec.js` | chromium | ✔ Aprobado |
| CP-UNI-001 | IMC = peso / estatura² | RF-17 | Unitaria | Funcionalidad · Exactitud | `pruebas/unitarias/calculos.test.js` | — | ✔ Aprobado |
| CP-UNI-002 | % de grasa en hombre (Yuhasz, 6 pliegues) | RF-17 | Unitaria | Funcionalidad · Exactitud | `pruebas/unitarias/calculos.test.js` | — | ✔ Aprobado |
| CP-UNI-003 | % de grasa en mujer (Yuhasz, 6 pliegues) | RF-17 | Unitaria | Funcionalidad · Exactitud | `pruebas/unitarias/calculos.test.js` | — | ✔ Aprobado |
| CP-UNI-004 | Fraccionamiento en 4 componentes (Rocha, Würch, Matiegka) | RF-17 | Unitaria | Funcionalidad · Exactitud | `pruebas/unitarias/calculos.test.js` | — | ✔ Aprobado |
| CP-UNI-005 | Somatotipo Heath-Carter y coordenadas de la somatocarta | RF-17 | Unitaria | Funcionalidad · Exactitud | `pruebas/unitarias/calculos.test.js` | — | ✔ Aprobado |
| CP-UNI-006 | Estatura en centímetros da el mismo resultado que en metros | RF-17 | Unitaria | Funcionalidad · Exactitud | `pruebas/unitarias/calculos.test.js` | — | ✔ Aprobado |
| CP-UNI-007 | Sin datos no falla y devuelve valores vacíos | RF-17 | Unitaria | Funcionalidad · Exactitud | `pruebas/unitarias/calculos.test.js` | — | ✔ Aprobado |
| CP-UNI-008 | Formato "#dorsal nombre" y orden por dorsal | RF-09 | Unitaria | Funcionalidad · Adecuación | `pruebas/unitarias/calculos.test.js` | — | ✔ Aprobado |
| CP-UNI-009 | Fechas en español sin desfase de zona horaria | RF-18 | Unitaria | Funcionalidad · Adecuación | `pruebas/unitarias/calculos.test.js` | — | ✔ Aprobado |
| CP-UNI-010 | scrypt verifica la clave correcta y rechaza la incorrecta | RNF-01 | Unitaria | Funcionalidad · Seguridad de acceso | `pruebas/unitarias/seguridad.test.js` | — | ✔ Aprobado |
| CP-UNI-011 | Un hash antiguo (HMAC-SHA256) es válido y pide actualizarse | RNF-01 | Unitaria | Funcionalidad · Seguridad de acceso | `pruebas/unitarias/seguridad.test.js` | — | ✔ Aprobado |
| CP-UNI-012 | Las claves aleatorias iniciales son distintas y de largo suficiente | RNF-01 | Unitaria | Funcionalidad · Seguridad de acceso | `pruebas/unitarias/seguridad.test.js` | — | ✔ Aprobado |
| CP-UNI-013 | En producción el servidor no arranca sin secretos JWT válidos | RNF-01 | Unitaria | Funcionalidad · Seguridad de acceso | `pruebas/unitarias/seguridad.test.js` | — | ✔ Aprobado |
| CP-UNI-014 | En desarrollo, sin secretos se usa uno temporal aleatorio y se avisa | RNF-01 | Unitaria | Funcionalidad · Seguridad de acceso | `pruebas/unitarias/seguridad.test.js` | — | ✔ Aprobado |
| CP-UNI-015 | El .ics lleva hora local de Colombia, duración, lugar y recordatorio | RF-10 | Unitaria | Funcionalidad · Seguridad de acceso | `pruebas/unitarias/calendario.test.js` | — | ✔ Aprobado |
| CP-UNI-016 | Sin hora es un evento de todo el día; Google Calendar recibe las mismas fechas | RF-10 | Unitaria | Funcionalidad · Seguridad de acceso | `pruebas/unitarias/calendario.test.js` | — | ✔ Aprobado |
