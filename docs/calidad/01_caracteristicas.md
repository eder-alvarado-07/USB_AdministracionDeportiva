# Características de calidad — ISO/IEC 9126

Versión de referencia: **v1.3**. Responsable: Carlos Gamboa.

## 1. Norma utilizada

Se usa la **ISO/IEC 9126**, como lo exige el docente. La norma tiene cuatro partes:

| Parte | Contenido | Uso en este proyecto |
|---|---|---|
| 9126-1 | Modelo de calidad: 6 características y sus subcaracterísticas | Base de este documento |
| 9126-2 | Métricas externas (el software en ejecución) | La mayoría de las métricas de `02_metricas.md` |
| 9126-3 | Métricas internas (código, diseño) | Métricas de mantenibilidad |
| 9126-4 | Calidad en uso (efectividad, productividad, satisfacción) | Pruebas de usabilidad con usuarios |

La ISO/IEC 25010 reemplazó a la 9126 y agrega seguridad y compatibilidad como características propias. En este proyecto esos aspectos se tratan dentro de la 9126: la seguridad como *seguridad de acceso* (Funcionalidad) y la compatibilidad como *adaptabilidad* (Portabilidad).

## 2. Contexto que guía la selección

- **Quién la usa y dónde:** entrenadores, personal de salud y deportistas desde el **celular**, muchas veces en la cancha; administradores desde el computador.
- **Qué datos maneja:** información de salud de los deportistas (lesiones, controles médicos, historias clínicas), protegida por la **Ley 1581 de 2012**.
- **Para qué se usa:** decisiones diarias del cuerpo técnico, como quién está disponible para jugar o quién no asistió.
- **Quién la desarrolla:** un equipo universitario de 5 personas que rota y trabaja por versiones, con integrantes que deben poder retomar el código.
- **Dónde se desplegará:** un servicio en la nube (Railway), además de los equipos locales del grupo.

## 3. Características, factores y relevancia

Relevancia: **Alta** = se evalúa en cada versión; **Media** = se evalúa en las versiones que la afectan; **Baja** = se documenta, pero no tiene métrica propia.

### 3.1 Funcionalidad — relevancia ALTA

Capacidad del software de proporcionar las funciones que satisfacen las necesidades declaradas.

| Subcaracterística (factor) | ¿Se evalúa? | Justificación |
|---|---|---|
| Adecuación | Sí | Cada módulo debe cubrir lo que el cuerpo técnico necesita (catálogo RF-01 a RF-19). |
| Exactitud | Sí | Los cálculos antropométricos, los puntajes de evaluación y los conteos de disponibilidad y asistencia deben dar resultados correctos: de ellos dependen decisiones deportivas y de salud. |
| Interoperabilidad | Parcial | La importación de usuarios y deportistas por CSV debe aceptar los archivos de la plantilla. No hay integración con otros sistemas. |
| Seguridad de acceso | Sí, prioritaria | Maneja datos de salud. Cada rol debe ver y modificar solo lo que le corresponde, y la API debe rechazar accesos sin permiso e intentos de inyección. |
| Cumplimiento funcional | Sí | Ley 1581 de 2012 sobre datos personales sensibles. |

### 3.2 Fiabilidad — relevancia ALTA

Capacidad de mantener su nivel de prestaciones en las condiciones establecidas.

| Subcaracterística (factor) | ¿Se evalúa? | Justificación |
|---|---|---|
| Madurez | Sí | Se mide con los defectos encontrados por versión: el sistema debe tener cada vez menos fallos. |
| Tolerancia a fallos | Sí | Entradas inválidas (dorsal repetido, campos vacíos, archivos CSV con errores) deben rechazarse con un mensaje claro, sin errores internos ni datos corruptos. |
| Capacidad de recuperación | Sí | Si el servidor o la base no responden, la aplicación debe avisar y permitir reintentar, sin perder la sesión. Las migraciones permiten reconstruir la base. |
| Cumplimiento de fiabilidad | No | No hay una norma de fiabilidad aplicable. |

### 3.3 Usabilidad — relevancia ALTA

Capacidad de ser entendido, aprendido, usado y resultar atractivo para el usuario.

| Subcaracterística (factor) | ¿Se evalúa? | Justificación |
|---|---|---|
| Capacidad para ser entendido | Sí | Un entrenador debe entender en segundos quién puede jugar, sin capacitación. |
| Capacidad para ser aprendido | Sí | Los usuarios no son técnicos, y el personal y los deportistas cambian cada semestre. |
| Capacidad para ser operado | Sí, prioritaria | Uso con una mano en el celular, en exteriores: objetivos táctiles grandes, contraste alto y navegación inferior. |
| Capacidad de atracción | Sí | Debe reconocerse como herramienta institucional de Unisimón (RNF-07). |
| Cumplimiento de usabilidad | Parcial | Se toman como guía las pautas de accesibilidad WCAG (contraste AA, foco visible). |

### 3.4 Eficiencia — relevancia MEDIA

Relación entre el nivel de desempeño y la cantidad de recursos usados.

| Subcaracterística (factor) | ¿Se evalúa? | Justificación |
|---|---|---|
| Comportamiento temporal | Sí | Respuestas rápidas en el celular, con conexiones móviles a veces lentas en la cancha. |
| Utilización de recursos | Sí | El tamaño de la aplicación que se descarga afecta el consumo de datos móviles. |
| Cumplimiento de eficiencia | No | No hay requisitos normativos de rendimiento. |

La relevancia es media porque el volumen de usuarios es bajo (los equipos de una sede), así que la carga no es un riesgo principal.

### 3.5 Mantenibilidad — relevancia MEDIA

Capacidad de ser modificado: correcciones, mejoras o adaptaciones.

| Subcaracterística (factor) | ¿Se evalúa? | Justificación |
|---|---|---|
| Capacidad para ser analizado | Sí | Diagnosticar defectos rápido: código organizado por módulo y defectos registrados con su causa. |
| Capacidad para ser cambiado | Sí | El sistema evoluciona por versiones (v1.1 a v1.3 y siguientes) y lo modifican varias personas. |
| Estabilidad | Sí | Un cambio no debe romper lo que ya funcionaba: pruebas de regresión en cada Pull Request. |
| Capacidad para ser probado | Sí | Pruebas automáticas que cualquier integrante puede ejecutar. |
| Cumplimiento de mantenibilidad | Parcial | Convenciones del proyecto: Pull Request por cambio, `CHANGELOG.md`, sistema de diseño. |

### 3.6 Portabilidad — relevancia MEDIA

Capacidad de ser transferido de un entorno a otro.

| Subcaracterística (factor) | ¿Se evalúa? | Justificación |
|---|---|---|
| Adaptabilidad | Sí, prioritaria | Debe funcionar en celular y en computador, y en los navegadores principales (RNF-04, RNF-05). |
| Instalabilidad | Sí | Cada integrante instala el proyecto en su equipo, y se desplegará en Railway (RNF-09). |
| Coexistencia | No | No comparte recursos con otros sistemas. |
| Capacidad para reemplazar | Parcial | Reemplaza al sistema DTdeportivo original: las migraciones convierten una base de la versión anterior sin perder datos. |
| Cumplimiento de portabilidad | No | No aplica. |

## 4. Resumen de prioridades

| Prioridad | Características | Motivo principal |
|---|---|---|
| Alta | Funcionalidad, Fiabilidad, Usabilidad | Datos de salud, decisiones deportivas diarias, uso en celular por personas no técnicas. |
| Media | Mantenibilidad, Portabilidad | Equipo que rota y trabaja por versiones; despliegue en la nube y en varios dispositivos. |
| Media | Eficiencia | Conexiones móviles, pero con baja carga de usuarios. |

Las métricas de cada factor seleccionado están en `02_metricas.md`.
