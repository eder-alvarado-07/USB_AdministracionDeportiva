# Sistema de diseño — Administración Deportiva

v1.3. Autor: Carlos Gamboa. Estado: **aprobado y aplicado** a la app (login, estructura, inicio y paleta en todos los módulos).

Prototipo: `docs/diseno/prototipo/login.html` y `dashboard.html` (abrir en el navegador; `login.html?error` muestra el estado de error). Capturas en `docs/diseno/capturas/`.

## 1. El encargo

| | |
|---|---|
| **Qué es** | Herramienta interna para gestionar los equipos deportivos de la Universidad Simón Bolívar, sede Cúcuta: plantel, entrenamientos, asistencia, partidos, salud y antropometría. |
| **Quién la usa** | Entrenadores, personal de salud y jugadores **desde el celular**; administradores y head coach **desde el computador**. |
| **Regla principal** | **Debe verse como parte de las plataformas oficiales de Unisimón** (portal estudiantil y unisimon.edu.co): misma tipografía, mismos verdes, misma estructura. Solo se moderniza lo que hoy funciona mal. |

## 2. De dónde sale cada decisión

Medido directamente en las plataformas (CSS publicado y capturas por píxel):

| Elemento | Origen |
|---|---|
| Tipografía **Roboto** | Fuente cargada por unisimon.edu.co (`fonts.googleapis.com/css?family=Roboto`). El portal usa la fuente por defecto de Bootstrap, que se ve igual de sobria. |
| Íconos **Font Awesome** | Los usan el portal (FA 5) y el sitio web (FA 6). |
| Verdes `#088732`, `#218D45`, `#148E40` | Encabezados de panel, botones y títulos del portal. |
| Verde noche `#00470A` | Banner/carrusel del portal. |
| Franja naranja + banda verde segmentada | Debajo del header del portal. |
| Naranja `#F0AD4E` | Botón destacado del portal ("Actualizar datos"). |
| Alertas y estados | Paleta Bootstrap que usa el portal (`#DFF0D8`, `#FCF8E3`, `#F2DEDE`, `#D9EDF7`). |
| Footer negro `#000` con líneas `#252525` | Portal y login. |
| Logos oficiales | Horizontal y apilado publicados por el portal; monograma U en `#09843B`. |

## 3. Tokens

### Color

| Token | Hex | Uso |
|---|---|---|
| `--verde-panel` | `#088732` | Encabezados de panel, pestaña activa, menú inferior activo. |
| `--verde-boton` | `#218D45` | Botón principal ("Iniciar sesión"), estado disponible. |
| `--verde-texto` | `#148E40` | Títulos verdes ("Iniciar sesión") y enlaces. |
| `--verde-noche` | `#00470A` | Banners con el logo en blanco. |
| `--verde-logo` | `#09843B` | Logo sobre fondo blanco. |
| `--naranja` | `#F0AD4E` | Una sola acción destacada por pantalla ("Tomar asistencia", "Ver partido"). |
| `--fondo` | `#EEEEEE` | Fondo de página (como el portal). |
| `--texto` | `#333333` | Texto principal. |
| `--borde` / `--pestana` / `--pestana-activa` | `#DDDDDD` / `#F8F8F8` / `#E7E7E7` | Bordes, barra de pestañas y pestaña activa. |
| `--negro` | `#000000` | Footer. |
| Estados | ok `#DFF0D8/#3C763D`, aviso `#FCF8E3/#8A6D3B`, error `#F2DEDE/#A94442`, info `#D9EDF7/#31708F` | Disponible, con restricciones, lesionado/error, información. Siempre con ícono. |

### Tipografía

**Roboto** 300/400/500/700 en toda la app. Títulos de panel 18 px bold blanco; texto 15 px; "Bienvenido" 24 px light (como el portal); nombre del sistema en mayúsculas con espaciado, igual que "SISTEMA DE INFORMACIÓN". Números con `tabular-nums`.

### Forma y profundidad

Radio 4 px (Bootstrap). Paneles con sombra y borde inferior gris, como el portal: `0 1px 3px rgba(0,0,0,.14), 0 4px 0 -1px #D2D2D2`. Banners verdes con degradados radiales sutiles para dar profundidad. Áreas táctiles mínimas de 44 px.

### Interacción (v1.5)

| Estado | Regla |
|---|---|
| Hover | Solo con mouse: toda regla `:hover` va dentro de `@media (hover: hover) and (pointer: fine)`, para que en pantallas táctiles no quede "pegada" después de tocar. Nada esencial (información o acciones) puede depender del hover. |
| Presionado | Botones, botones de ícono y opciones de menú ceden un poco al presionar (`transform: scale(0.97)`). Reemplaza el destello gris del toque (`-webkit-tap-highlight-color: transparent`). |
| Foco de teclado | Anillo naranja de 2 px rodeado de uno casi negro (`:focus-visible`). El negro asegura contraste sobre blanco, gris y verde; el naranja conserva la identidad. Los campos de formulario usan su propio borde verde con halo. |
| Deshabilitado | Opacidad 0,6 (botones) o 0,45 (íconos) y cursor `not-allowed`. Los botones de guardar muestran "Guardando…" mientras esperan. |
| Táctil | Con `@media (pointer: coarse)`: botones, íconos, selectores y campos de al menos 44 px, y campos con letra de 16 px (evita el zoom automático de iOS). En computador se conserva la densidad del portal. Nunca se bloquea el zoom. |

### Estados de cada pantalla (v1.5)

Componente único: `frontend/src/components/EstadoVista.jsx`. Cada pantalla distingue, en este orden:

| Caso | Componente | Contenido |
|---|---|---|
| Cargando | `Esqueleto` (tabla, tarjetas o panel) | La forma del contenido que viene, para que nada salte. Aparece tras 150 ms (una carga rápida no parpadea) y pulsa suave. Ningún contador ni cifra mientras carga. |
| Error | `EstadoError` | Ícono de advertencia en rojo claro, "No se pudo cargar la información", el motivo y el botón **Reintentar**. Nunca se presenta como "no hay datos". |
| Sin datos | `EstadoVacio` | Ícono de Font Awesome en círculo verde claro, título ("Aún no hay…"), por qué está vacío y qué pasará al llenarlo, y la acción real si el rol puede hacerla. |
| Filtro sin resultados | `EstadoSinResultados` | "Ningún resultado con estos filtros" y un botón para limpiar el filtro o volver a todos los deportes. |

Dentro de paneles y fichas se usa la variante `compacto`. Nunca emojis.

### Tablas anchas (v1.5)

Las tablas con muchas columnas usan `className="tabla-movil"`. En celular (menos de 720 px) solo quedan las columnas clave; las demás llevan `col-sec` y se resumen en una línea `sub-movil` bajo el nombre o se consultan en la ficha. Las columnas de consulta ocasional llevan además `col-ter` y se ocultan por debajo de 1280 px. Las acciones secundarias (`acc-sec`) se mueven al pie de la ficha. Ninguna información queda sin una vía de acceso.

### Movimiento (v1.5)

Tokens en `index.css`: `--dur-rapida` 120 ms (hover y presionado), `--dur-media` 200 ms (entradas de hojas, modales y menús), `--dur-lenta` 280 ms (cambios grandes); `--curva-salida` `cubic-bezier(0.23, 1, 0.32, 1)` para entradas y respuestas, `--curva-movimiento` `cubic-bezier(0.77, 0, 0.175, 1)` para algo que cambia de lugar.

`--curva-hoja` `cubic-bezier(0.32, 0.72, 0, 1)` para hojas que suben desde abajo (hoja "Más" y modales en celular, 300 ms).

Reglas: animar solo `transform` y `opacity`; nada animado en acciones que se repiten muchas veces (escribir, navegar con teclado); nunca aparecer desde `scale(0)`; con `prefers-reduced-motion: reduce` no hay transiciones ni animaciones, salvo un fundido de 150 ms en modales y hojas para que su aparición se entienda. Las gráficas de Recharts animan 350 ms (no 1,5 s) y se apagan con movimiento reducido (`utils/movimiento.js`). No se animan las pestañas, el menú ni la navegación con teclado (se usan decenas de veces al día), ni las tarjetas que no son clicables. Criterio tomado de la skill `emil-design-eng` (Emil Kowalski).

## 4. Estructura

### Computador (≥ 1024 px): igual al portal

```
┌──────────────────────────────────────────────────────────────┐
│ [LOGO UNISIMÓN] │ ADMINISTRACIÓN DEPORTIVA   Bienvenido (CD) CÉSAR │  header blanco
│▄▄▄▄▄▄▄▄▄▄▄ franja naranja + banda verde segmentada ▄▄▄▄▄▄▄▄▄▄▄│
│ Inicio │ Equipos │ Deportistas │ Entrenamientos │ …            │  pestañas
├─────────────────────────────────────────┬────────────────────┤
│ Banner verde noche: próximo partido     │ Mi sesión          │
│ [Disponibilidad del plantel] ▀ verde    │ (datos + botones)  │
│ [Asistencia] ▀ verde                    │ [Para revisar]     │
│                                         │ [Esta semana]      │
├─────────────────────────────────────────┴────────────────────┤
│ FOOTER NEGRO: logo apilado · Administración Deportiva · Portales │
└──────────────────────────────────────────────────────────────┘
```

### Celular (≤ 1023 px)

Header blanco compacto (logo + nombre del sistema + foto), franja, contenido en una columna (banner, disponibilidad, para revisar, esta semana, asistencia, mi sesión), footer negro y **menú inferior fijo** con 5 secciones por rol.

## 5. Qué se moderniza respecto al portal

| En el portal | En Administración Deportiva |
|---|---|
| 13 pestañas en fila, imposibles en celular | Pestañas en PC; menú inferior de 5 secciones en celular. |
| Guirnaldas de temporada sobre los encabezados | Encabezados verdes limpios. |
| Etiquetas de colores sin significado | Cada color es un estado y va con ícono. |
| "Ooooops" en estados vacíos | Mensajes que dicen qué pasó y qué hacer. |
| Bajo contraste en pestañas inactivas | Contraste AA en todo. |
| Página fija de escritorio | Diseño responsive verificado a 390 px y 1440 px. |

## Ideas para más adelante

- **Fotos reales de fondo con desenfoque** (jugadores, canchas o sedes de entrenamiento de la sede Cúcuta) en el banner del próximo partido y en el login, con una capa verde noche `#00470A` encima para mantener el contraste del texto blanco. Requiere fotos propias o con permiso de uso; nada de fotos de stock.

## 6. Historial de decisiones

| Versión | Dirección | Resultado |
|---|---|---|
| 1 | Reinterpretación propia: Zilla Slab + Fira Sans, fondo blanco minimalista, solo una franja fina como guiño a la marca. | **Rechazada** por Carlos: no se parecía a las plataformas de la universidad (otra tipografía, otros colores, sin footer negro, demasiado plana). |
| 2 | Lenguaje visual de Unisimón medido en sus plataformas, modernizado. | **Aprobada** por Carlos y aplicada en la v1.3. |
| v1.5 | Estados de interacción por capacidad del dispositivo (mouse o táctil), tokens de movimiento y foco de dos tonos. Sin emojis en la interfaz: solo íconos de Font Awesome. | Aprobada por Carlos (fase 1 de v1.5). |

## 7. Calidad mínima (se verifica con Playwright en 360, 390, 768 y 1440 px; celular y tableta con emulación táctil)

Sin scroll horizontal · objetivos táctiles ≥ 44 px · foco visible con teclado · `prefers-reduced-motion` respetado · contraste AA · estados de carga, vacío y error en cada módulo.
