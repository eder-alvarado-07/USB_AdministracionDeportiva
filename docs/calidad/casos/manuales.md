# Casos de prueba manuales

Casos que necesitan personas y no se pueden automatizar. Alimentan las métricas M-U1, M-U2, M-U3 (usabilidad) y M-P3 (instalación). El procedimiento general está en `02_metricas.md`, sección 4.

Cómo registrar una ejecución: completar las columnas *Resultado obtenido*, *Estado* y *Evidencia* de cada caso y guardar las hojas o capturas en `informes/evidencias/<versión>/manuales/`.

## Lista para el tester

`lista-tester.html` (en esta carpeta) recorre el sistema por rol con 60 pruebas marcadas como PC, celular o ambos. Las marcas y las fallas se guardan en el navegador del tester; el informe descargado se registra en `defectos.md` (una fila por falla confirmada).

## Prueba con usuarios

**Precondiciones comunes:** base con datos de demostración (`npm run demo`), celular del participante con el sistema abierto en la pantalla de inicio de sesión, cuenta asignada según el perfil y cronómetro. No se explica el sistema antes de empezar; si el participante pide ayuda, la tarea cuenta como "con ayuda".

| ID | Caso | Requisitos | Participantes | Datos de entrada | Pasos | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-MAN-USU-001 | Iniciar sesión por primera vez | RF-01 | 5 | Correo y contraseña de la cuenta asignada | 1. Abrir el sistema. 2. Escribir las credenciales. 3. Entrar. | Llega al inicio sin ayuda en ≤ 60 s. | | Pendiente | |
| CP-MAN-USU-002 | Ver quién puede jugar el próximo partido | RF-18 | 5 | Cuenta `cesar_dt` (entrenador) | 1. Desde el inicio, encontrar el próximo partido. 2. Decir cuántos y cuáles jugadores no están disponibles. | Responde "20 de 23" y nombra a los 3 no disponibles en ≤ 60 s. | | Pendiente | |
| CP-MAN-USU-003 | Tomar asistencia de un entrenamiento | RF-11 | 5 | Entrenamiento de hoy del plantel demo | 1. Ir a Asistencia. 2. Elegir el entrenamiento. 3. Marcar a los 23 jugadores. 4. Guardar. | Asistencia guardada sin ayuda en ≤ 120 s (meta M-U2). | | Pendiente | |
| CP-MAN-USU-004 | Cambiar el dorsal de un jugador | RF-09 | 5 | Cambiar a Daniel Rincón al número 99 | 1. Ir a Deportistas. 2. Encontrar al jugador. 3. Cambiar su dorsal. | Dorsal cambiado sin ayuda en ≤ 10 s una vez en la tabla (meta M-U2). | | Pendiente | |
| CP-MAN-USU-005 | Registrar una lesión | RF-14 | Perfiles de salud o administrador | Esguince de tobillo, hoy, gravedad leve | 1. Ir a Lesiones. 2. Crear la lesión. 3. Guardar. | Lesión guardada y visible en la lista en ≤ 60 s (meta M-U2). | | Pendiente | |
| CP-MAN-USU-006 | Cuestionario de satisfacción SUS | RNF-07 | 5 | Cuestionario SUS de 10 preguntas | 1. Al terminar las tareas, el participante llena el cuestionario. | Puntaje promedio ≥ 80 (meta M-U3). | | Pendiente | |

**Registro por participante** (una fila por persona y tarea):

| Participante | Perfil | Tarea | Sin ayuda (sí/no) | Tiempo (s) | Observaciones |
|---|---|---|---|---|---|
| | | | | | |

## Instalación desde cero

| ID | Caso | Requisitos | Precondiciones | Datos de entrada | Pasos | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-MAN-INS-001 | Instalar el sistema siguiendo solo el README | RNF-09 | Equipo sin el proyecto, con Node.js y PostgreSQL disponibles para instalar; integrante que nunca lo haya instalado | Repositorio de GitHub | 1. Clonar. 2. Seguir el README paso a paso sin preguntar. 3. Anotar cada paso que no pudo completar solo y la hora de inicio y fin. | Sistema funcionando con datos de prueba, 100 % de los pasos sin ayuda, en ≤ 30 min (meta M-P3). | | Pendiente | |
