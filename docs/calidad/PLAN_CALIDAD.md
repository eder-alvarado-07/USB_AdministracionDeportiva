# Plan de calidad y pruebas — Administración Deportiva

Estado: **en marcha desde v1.3.1** (10 de octubre de 2026). Las partes 1, 2 y 3 están hechas; las partes 4, 5 y 6 se actualizan en cada Pull Request. Línea base: `informes/v1.3.1.md`.

## Norma de referencia

Se trabaja con la **ISO/IEC 9126**, como lo exige el docente.

Existe una versión más actual, la ISO/IEC 25010, que reemplazó a la 9126 y agrega seguridad y compatibilidad como características propias. **No se usa en este proyecto**, aunque se puede mencionar en la justificación como contexto.

## Qué se debe entregar

| # | Parte | Contenido |
|---|---|---|
| 1 | Características de calidad | Las seis características de la ISO 9126, sus factores (subcaracterísticas) y la justificación de cuáles son relevantes para este software y por qué. |
| 2 | Métricas e indicadores | Para cada característica elegida: métrica cuantificable, fórmula de cálculo, valor esperado o criterio de aceptación, e indicador para visualizar el resultado. |
| 3 | Plan de pruebas | Documento formal: alcance, módulos y funciones a evaluar, tipos de prueba, responsables, recursos, herramientas, criterios de entrada y salida, y criterios para aprobar o rechazar. |
| 4 | Casos de prueba | Cada caso con identificador, nombre, requisito relacionado, precondiciones, datos de entrada, pasos, resultado esperado, resultado obtenido, estado (aprobado o fallido) y evidencias. |
| 5 | Informe de ejecución | Pruebas diseñadas y ejecutadas, aprobadas y fallidas, porcentaje de aprobación, defectos encontrados, evidencias, conclusiones y recomendaciones. |
| 6 | Documentación en el repositorio | Todo lo anterior en esta carpeta (`docs/calidad/`), más el registro de defectos y los tableros de GitHub Projects actualizados. |

### Características de la ISO/IEC 9126

| Característica | Qué evalúa | Ejemplo de métrica |
|---|---|---|
| Funcionalidad | Si el software cumple las funciones requeridas | % de requisitos funcionales aprobados |
| Fiabilidad | Si funciona correctamente y mantiene su estabilidad | % de pruebas ejecutadas sin fallos |
| Usabilidad | Si es fácil de aprender y usar | % de usuarios que completan una tarea correctamente |
| Eficiencia | Si aprovecha bien el tiempo y los recursos | Tiempo promedio de respuesta |
| Mantenibilidad | Si es fácil de corregir, modificar y actualizar | Tiempo promedio para corregir un defecto |
| Portabilidad | Si se adapta a distintos entornos | % de entornos compatibles verificados (navegadores, celular y computador) |

## Cuándo se hace cada parte

| Momento | Partes | Qué se hace |
|---|---|---|
| **Una sola vez, al iniciar** | 1, 2 y 3 | Definir características, métricas y plan de pruebas. Son el marco y casi no cambian entre versiones. |
| **En cada cambio (cada Pull Request)** | 4, 5 y 6 en pequeño | Agregar o actualizar los casos de prueba de lo que se modificó, ejecutarlos, anotar resultados y defectos, y mover el tablero. |
| **Al cierre del proyecto** | 5 completo | Consolidar el informe general con todas las ejecuciones acumuladas y calcular los indicadores finales. |

Así no hay que reconstruir al final qué se probó en cada versión, y las evidencias quedan guardadas desde el principio.

### Lista de verificación para cada Pull Request

- [ ] Casos de prueba nuevos o actualizados para lo que cambió.
- [ ] Pruebas ejecutadas, con resultado anotado en el informe de esa versión.
- [ ] Defectos encontrados registrados (y su corrección, si se hizo).
- [ ] Evidencias guardadas (capturas, salida de las pruebas).
- [ ] Tablero de GitHub Projects actualizado.
- [ ] Entrada en `CHANGELOG.md`.

## Estado de cada parte

| # | Parte | Dónde está | Estado |
|---|---|---|---|
| — | Requisitos | `00_requisitos.md` | Hecho (RF-01 a RF-19, RNF-01 a RNF-10) |
| 1 | Características de calidad | `01_caracteristicas.md` | Hecho |
| 2 | Métricas e indicadores | `02_metricas.md` | Hecho (26 métricas, índice global con meta ≥ 85) |
| 3 | Plan de pruebas | `03_plan_de_pruebas.md` | Hecho (PP-AD-01) |
| 4 | Casos de prueba | `casos/catalogo.md` (automáticos, generado) y `casos/manuales.md` | 118 automáticos y 7 manuales pendientes de ejecutar |
| 5 | Informe de ejecución | `informes/` | v1.3.1 (línea base): 92,6 %, índice 67 · v1.4: 100 %, índice 72 · v1.5: 100 %, índice 100 (22 de 26 métricas; faltan las manuales) |
| 6 | Repositorio y tableros | esta carpeta, `defectos.md`, [tablero de GitHub Projects](https://github.com/users/cgdev0/projects/1) | Hecho: cada defecto y prueba manual es un issue en el tablero |

Las pruebas que antes vivían fuera del repositorio ya están en `pruebas/` (ver `pruebas/README.md`). Cualquier integrante puede repetirlas con `npm test`.

## Estructura de esta carpeta

```
docs/calidad/
├── PLAN_CALIDAD.md            ← este archivo
├── 00_requisitos.md           ← requisitos funcionales y no funcionales
├── 01_caracteristicas.md      ← características ISO 9126, factores y justificación
├── 02_metricas.md             ← matriz de características, factores, métricas y criterios
├── 03_plan_de_pruebas.md      ← plan de pruebas formal
├── casos/                     ← catálogo generado y casos manuales
├── informes/                  ← un informe de ejecución por versión, sus conclusiones y evidencias
└── defectos.md                ← registro de defectos
```
