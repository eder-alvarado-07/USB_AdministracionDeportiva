# Métricas e indicadores de calidad

Versión de referencia: **v1.3**. Responsable: Carlos Gamboa. Basado en `01_caracteristicas.md` (ISO/IEC 9126-2, 9126-3 y 9126-4).

## 1. Cómo leer esta matriz

- **Semáforo:** 🟢 cumple la meta · 🟡 aceptable, con plan de mejora · 🔴 no cumple, bloquea la versión si la métrica es de prioridad alta.
- **Instrumento:** *auto* = lo calcula la suite de `pruebas/` al ejecutarse; *manual* = lo registra una persona siguiendo el procedimiento indicado.
- **Frecuencia:** *PR* = en cada Pull Request; *versión* = al cerrar cada versión; *cierre* = al final del proyecto.

## 2. Matriz de características, factores y métricas

### Funcionalidad (prioridad alta)

| ID | Factor | Métrica | Fórmula | 🟢 | 🟡 | Instrumento | Frecuencia |
|---|---|---|---|---|---|---|---|
| M-F1 | Adecuación | Cobertura funcional | RF con al menos un caso aprobado ÷ total de RF × 100 | ≥ 90 % | 75–89 % | auto: catálogo de casos | versión |
| M-F2 | Adecuación | Casos funcionales aprobados | casos funcionales aprobados ÷ ejecutados × 100 | ≥ 95 % | 85–94 % | auto | PR |
| M-F3 | Exactitud | Exactitud de cálculos | cálculos dentro de la tolerancia (±0,1) ÷ cálculos verificados × 100, frente a un cálculo de referencia | 100 % | ≥ 95 % | auto | PR |
| M-F4 | Seguridad de acceso | Control de acceso por rol | intentos sin permiso rechazados ÷ intentos probados × 100 | 100 % | (no hay) | auto | PR |
| M-F5 | Seguridad de acceso | Resistencia a inyección | intentos de inyección bloqueados ÷ intentos probados × 100 | 100 % | (no hay) | auto | PR |
| M-F6 | Interoperabilidad | Importación CSV correcta | filas válidas importadas bien ÷ filas válidas del archivo × 100 (las inválidas deben reportarse) | 100 % | ≥ 95 % | auto | versión |

### Fiabilidad (prioridad alta)

| ID | Factor | Métrica | Fórmula | 🟢 | 🟡 | Instrumento | Frecuencia |
|---|---|---|---|---|---|---|---|
| M-R1 | Madurez | Densidad de defectos | defectos abiertos al cierre de la versión ÷ 13 módulos | ≤ 1 y en descenso | 1–2 | auto: `defectos.md` | versión |
| M-R2 | Madurez | Pruebas automáticas en verde | pruebas que pasan ÷ total de pruebas × 100 | 100 % para fusionar | (no hay) | auto | PR |
| M-R3 | Tolerancia a fallos | Manejo de entradas inválidas | entradas inválidas rechazadas con 4xx y mensaje, sin error 500 ÷ entradas inválidas probadas × 100 | 100 % | ≥ 90 % | auto | PR |
| M-R4 | Recuperación | Aviso ante caída del servidor | pantallas que muestran aviso y permiten reintentar sin el servidor ÷ pantallas probadas × 100 | ≥ 90 % | 70–89 % | auto | versión |

### Usabilidad (prioridad alta)

| ID | Factor | Métrica | Fórmula | 🟢 | 🟡 | Instrumento | Frecuencia |
|---|---|---|---|---|---|---|---|
| M-U1 | Entendido y aprendido | Éxito de tareas sin ayuda | participantes que completan la tarea sin ayuda ÷ participantes × 100 | ≥ 80 % | 60–79 % | manual: prueba con 5 usuarios (sección 4) | versión |
| M-U2 | Operado | Tiempo por tarea clave | promedio en segundos de: tomar asistencia de 23 jugadores, cambiar un dorsal, registrar una lesión | ≤ 120 s, 10 s, 60 s | hasta 1,5 veces la meta | manual: prueba con usuarios | versión |
| M-U3 | Atracción | Satisfacción (escala SUS) | puntaje promedio del cuestionario SUS (0 a 100) | ≥ 80 | 68–79 | manual: cuestionario SUS | versión |
| M-U4 | Operado | Objetivos táctiles adecuados | elementos interactivos de 44 px o más de alto ÷ elementos interactivos visibles en celular × 100 | ≥ 95 % | 80–94 % | auto | versión |
| M-U5 | Operado y atracción | Accesibilidad sin problemas graves | pantallas sin violaciones *serious* ni *critical* según axe-core ÷ pantallas revisadas × 100 | 100 % | ≥ 80 % | auto | versión |

### Eficiencia (prioridad media)

| ID | Factor | Métrica | Fórmula | 🟢 | 🟡 | Instrumento | Frecuencia |
|---|---|---|---|---|---|---|---|
| M-E1 | Comportamiento temporal | Tiempo de respuesta de la API | percentil 95 del tiempo de respuesta de las rutas de lectura en la suite (local) | ≤ 500 ms | 501–1000 ms | auto | PR |
| M-E2 | Comportamiento temporal | Carga del inicio en celular | segundos desde abrir el inicio hasta ver el contenido, con red móvil 4G simulada | ≤ 3 s | 3–5 s | auto | versión |
| M-E3 | Utilización de recursos | Tamaño de descarga | KB comprimidos (gzip) de JavaScript y CSS propios del build | ≤ 300 KB | 301–450 KB | auto | versión |

### Mantenibilidad (prioridad media)

| ID | Factor | Métrica | Fórmula | 🟢 | 🟡 | Instrumento | Frecuencia |
|---|---|---|---|---|---|---|---|
| M-M1 | Analizado | Tiempo medio de corrección | promedio de (fecha de corrección − fecha de detección) de los defectos cerrados | ≤ 3 días | 4–7 días | auto: `defectos.md` | versión |
| M-M2 | Estabilidad | Regresiones | pruebas que pasaban en la versión anterior y fallan tras el cambio | 0 | (no hay) | auto | PR |
| M-M3 | Probado | Módulos con pruebas automáticas | módulos con al menos un caso automatizado ÷ 13 módulos × 100 | ≥ 80 % | 60–79 % | auto: catálogo de casos | versión |
| M-M4 | Cambiado | Trazabilidad de cambios | versiones publicadas (etiquetas de git) con entrada en `CHANGELOG.md` ÷ versiones publicadas × 100 | 100 % | ≥ 90 % | auto: git y `CHANGELOG.md` | versión |

### Portabilidad (prioridad media)

| ID | Factor | Métrica | Fórmula | 🟢 | 🟡 | Instrumento | Frecuencia |
|---|---|---|---|---|---|---|---|
| M-P1 | Adaptabilidad | Pantallas sin desborde | combinaciones (pantalla × rol × ancho) sin desplazamiento horizontal ÷ combinaciones probadas × 100 | 100 % | ≥ 95 % | auto | PR |
| M-P2 | Adaptabilidad | Navegadores compatibles | motores en los que pasa el recorrido ÷ 3 (Chromium, Firefox, WebKit) | 3 de 3 | 2 de 3 | auto | versión |
| M-P3 | Instalabilidad | Instalación desde cero | pasos del README completados sin ayuda ÷ pasos × 100, y tiempo total | 100 % y ≤ 30 min | ≥ 80 % o ≤ 60 min | manual: un integrante instala en un equipo limpio | versión |
| M-P4 | Capacidad para reemplazar | Migración sin pérdida | base de una versión anterior migrada con todas sus filas conservadas (sí o no) | sí | (no hay) | auto | versión con migraciones |

## 3. Indicadores

### 3.1 Semáforo por característica

Puntaje de una característica = (métricas 🟢 × 1 + métricas 🟡 × 0,5) ÷ métricas medidas × 100.

### 3.2 Índice de calidad global

Promedio ponderado de los puntajes por característica, con pesos según la prioridad definida en `01_caracteristicas.md`:

| Característica | Peso |
|---|---|
| Funcionalidad | 25 % |
| Fiabilidad | 20 % |
| Usabilidad | 20 % |
| Mantenibilidad | 15 % |
| Portabilidad | 10 % |
| Eficiencia | 10 % |

Índice global = Σ (puntaje de la característica × peso). Meta del proyecto: **≥ 85**.

Los valores se publican en cada informe de `informes/` y su evolución se muestra en el tablero del repositorio.

## 4. Procedimientos manuales

**Prueba con usuarios (M-U1, M-U2, M-U3).** Cinco participantes: idealmente un entrenador, una persona del área de salud, un deportista y dos estudiantes ajenos al proyecto. Cada uno hace, en su celular y sin explicación previa, cinco tareas:

1. Iniciar sesión.
2. Ver quién puede jugar el próximo partido.
3. Tomar asistencia de un entrenamiento.
4. Cambiar el dorsal de un jugador.
5. Registrar una lesión (solo el perfil de salud o administrador).

Se registran el éxito sin ayuda y el tiempo de cada tarea. Al final cada participante llena el cuestionario SUS de 10 preguntas.

**Instalación desde cero (M-P3).** Un integrante que no haya instalado el proyecto sigue el README en un equipo sin el proyecto. Se anotan los pasos que pudo completar solo y el tiempo total.

**Registro de defectos (M-R1, M-M1).** Cada defecto se anota en `defectos.md` con su fecha de detección, severidad, módulo, versión y fecha de corrección.
