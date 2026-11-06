# Plan de pruebas — Administración Deportiva

| | |
|---|---|
| Identificador | PP-AD-01 |
| Versión del plan | 1.0 (10 de octubre de 2026) |
| Software | Administración Deportiva, a partir de la v1.3 |
| Responsable | Carlos Gamboa (líder de desarrollo y calidad) |
| Referencias | `00_requisitos.md`, `01_caracteristicas.md`, `02_metricas.md`, ISO/IEC 9126, estructura basada en IEEE 829 |

## 1. Objetivo

Comprobar que el software cumple los requisitos del catálogo y las características de calidad priorizadas según la ISO/IEC 9126, y obtener en cada versión los datos que alimentan las métricas definidas.

## 2. Alcance

**Dentro del alcance:**
- Los 13 módulos de la aplicación (inicio, supervisión, equipos, deportistas, entrenamientos, asistencia, partidos, estadísticas, lesiones, salud, evaluaciones, antropometría y usuarios) y el inicio de sesión.
- La API del backend (73 rutas) y la base de datos PostgreSQL.
- Los cálculos: antropometría y somatotipo, puntajes de evaluaciones, disponibilidad del plantel y asistencia.
- Los 5 roles y sus permisos.
- Celular y computador, y los tres motores de navegador principales.

**Fuera del alcance (por ahora):**
- Pruebas de carga con muchos usuarios simultáneos: el sistema lo usan los equipos de una sola sede.
- Pruebas de penetración profesionales.
- La infraestructura de Railway, que se incorpora al plan cuando se llegue al despliegue.

## 3. Tipos de prueba

| Tipo | Qué verifica | Herramienta | Automatizada | Requisitos y métricas |
|---|---|---|---|---|
| Unitaria | Funciones aisladas: motor antropométrico, formato de fechas y de dorsal | `node:test` | Sí | RF-17 · M-F3 |
| Integración (API) | Cada ruta con la base de datos real: datos, validaciones, permisos | `node:test` + PostgreSQL de pruebas | Sí | RF-01 a RF-19 · M-F2, M-F4, M-F5, M-R3, M-E1 |
| Sistema (extremo a extremo) | Flujos completos en el navegador como lo haría cada rol | Playwright | Sí | RF-04, RF-05, RF-09, RF-18 · M-F2, M-P1 |
| Regresión | Que nada que funcionaba deje de funcionar | Suite completa | Sí, en cada PR | RNF-10 · M-R2, M-M2 |
| Seguridad de acceso | Rutas y pantallas prohibidas por rol, inyección SQL, tokens | `node:test` + Playwright | Sí | RF-04, RF-05, RNF-01, RNF-02 · M-F4, M-F5 |
| Compatibilidad y adaptabilidad | Sin desbordes en 360, 390, 768 y 1440 px; Chromium, Firefox y WebKit | Playwright | Sí | RNF-04, RNF-05 · M-P1, M-P2 |
| Accesibilidad | Contraste, etiquetas, foco y tamaño táctil | Playwright + axe-core | Sí | RNF-06 · M-U4, M-U5 |
| Rendimiento básico | Tiempos de respuesta y de carga, tamaño de descarga | `node:test` + Playwright + build | Sí | RNF-08 · M-E1, M-E2, M-E3 |
| Migración | Que una base de una versión anterior se actualice sin perder datos | `node:test` | Sí | M-P4 |
| Usabilidad con usuarios | Éxito, tiempo y satisfacción en tareas reales | Observación + cuestionario SUS | No | M-U1, M-U2, M-U3 |
| Instalación | Que un integrante instale el proyecto desde el README | Observación | No | RNF-09 · M-P3 |

## 4. Entorno de pruebas

| Elemento | Detalle |
|---|---|
| Sistema operativo | Windows 11 (equipos del grupo). Se pueden agregar macOS y Linux si algún integrante los usa. |
| Node.js | 18 o superior (verificado con 24) |
| Base de datos | PostgreSQL 17, en una **base exclusiva para pruebas** (`dt_deportivo_pruebas`) que se borra y se recrea en cada ejecución. Nunca se prueba sobre la base de desarrollo ni la de producción. |
| Datos de prueba | Usuarios del `seed` y plantel de demostración (`datos_demo.js`), con fechas relativas al día de ejecución |
| Navegadores | Chromium, Firefox y WebKit instalados por Playwright |
| Dispositivos simulados | Celular 360 × 800 y 390 × 844, tableta 768 × 1024, computador 1440 × 900 |

## 5. Responsables

| Rol | Persona | Tareas |
|---|---|---|
| Líder de calidad | Carlos Gamboa | Mantener el plan y las métricas, revisar cada Pull Request, consolidar informes. |
| Desarrollador del cambio | Quien abre el Pull Request | Escribir o actualizar los casos de lo que cambió, ejecutar la suite y adjuntar el resultado. |
| Probadores de usabilidad | Por asignar entre los integrantes del grupo | Coordinar la prueba con usuarios de cada versión. |
| Responsable de instalación | Un integrante distinto en cada versión | Ejecutar la prueba de instalación desde cero. |

## 6. Criterios

### 6.1 Entrada (para empezar a probar una versión)
- El proyecto compila (`npm run build`) y el servidor arranca.
- La base de pruebas se puede crear con `database.sql` y las migraciones.
- El cambio está en una rama con su Pull Request abierto y descrito.

### 6.2 Aprobación o rechazo de un caso
- **Aprobado:** el resultado obtenido coincide con el esperado.
- **Fallido:** el resultado difiere. Se registra un defecto en `defectos.md`.
- **Bloqueado:** no se pudo ejecutar, por ejemplo por falla del entorno. Se anota la causa y se reintenta.

### 6.3 Salida (para fusionar un Pull Request o cerrar una versión)
- El 100 % de las pruebas automáticas pasan (M-R2) y no hay regresiones (M-M2).
- No queda ningún defecto de severidad crítica o alta abierto.
- Las métricas de prioridad alta están en verde, o en amarillo con un plan de mejora anotado.
- El informe de la versión está en `informes/` y el tablero está actualizado.

### 6.4 Suspensión y reanudación
Se suspenden las pruebas si el build falla, si la base de pruebas no se puede crear o si más del 30 % de los casos quedan bloqueados. Se reanudan cuando se corrige la causa, ejecutando la suite completa desde el inicio.

## 7. Gestión de defectos

| Severidad | Definición | Ejemplo |
|---|---|---|
| Crítica | Pérdida de datos, acceso indebido a datos de salud o el sistema no se puede usar | Un deportista puede abrir lesiones de otros |
| Alta | Una función principal no funciona o da resultados incorrectos | Asignar equipo borra el entrenador del jugador |
| Media | La función opera con errores menores o hay un problema de uso importante | Una pantalla se sale del borde en el celular |
| Baja | Detalle visual o de texto | Un mensaje con mayúsculas inconsistentes |

Flujo: **detectado → registrado en `defectos.md` (y en el tablero) → corregido en un Pull Request → verificado con un caso de prueba → cerrado.** Todo defecto corregido deja un caso de prueba automatizado que evita que vuelva a aparecer.

## 8. Entregables

| Entregable | Ubicación |
|---|---|
| Plan de pruebas | Este archivo |
| Casos de prueba | `casos/` (catálogo y detalle por módulo) |
| Pruebas automatizadas | `pruebas/` en la raíz del repositorio |
| Informe de ejecución por versión | `informes/` |
| Registro de defectos | `defectos.md` |
| Tablero de seguimiento | GitHub Projects del repositorio |

## 9. Cronograma

Sigue la hoja de ruta acordada:

| Versión | Contenido | Pruebas destacadas |
|---|---|---|
| v1.3.1 | Marco de calidad y pruebas en el repositorio | Línea base de todas las métricas automáticas |
| v1.4 | Seguridad | Seguridad de acceso, contraseñas, tokens, validaciones |
| v1.5 | Pulido de los módulos por dentro | Adaptabilidad, accesibilidad y primera prueba con usuarios |
| v1.6 | Despliegue en Railway | Instalación, configuración y humo en el entorno publicado |

En cada versión: casos nuevos, suite completa, informe y tablero. Al cierre del proyecto: informe final consolidado.

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Algún integrante no tiene PostgreSQL instalado | Instrucciones en `pruebas/README.md`. Más adelante, base de pruebas en la nube. |
| Pruebas que dependen de la fecha (por ejemplo "partido mañana") | Los datos de prueba se generan relativos al día de ejecución. |
| Falta de tiempo del equipo para la prueba con usuarios | Planificarla con una semana de anticipación; mínimo 5 participantes. |
| Resultados distintos entre equipos | La base de pruebas se recrea desde cero en cada ejecución. |

## 11. Cómo ejecutar

Ver `pruebas/README.md`. Resumen:

```bash
npm run test:api     # unitarias + integración contra PostgreSQL de pruebas
npm run test:ui      # navegador (Playwright), levanta su propio servidor
npm test             # todo
```
