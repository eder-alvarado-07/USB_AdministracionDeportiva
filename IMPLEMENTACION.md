# IMPLEMENTACION.md — Estado del frontend y hoja de ruta de Administración Deportiva

## 1. Base revisada

Esta documentación se actualiza sobre la versión `DTdeportivo_roles_personalizados_v2(2).zip`. Se describen los módulos que están presentes en el frontend y se separa la existencia de una pantalla de la verificación de su funcionamiento integral.

## 2. Módulos presentes en el frontend

| Módulo | Archivo |
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

El contexto de autenticación está en `frontend/src/context/AuthContext.jsx`, el menú por rol en `frontend/src/components/Navbar.jsx` y las rutas en `frontend/src/App.jsx`.

## 3. Roles contemplados

El código del frontend reconoce los roles `administrador`, `head_coach`, `entrenador`, `personal_salud` y `jugador`. `Navbar.jsx` filtra los elementos del menú por rol y `App.jsx` utiliza rutas protegidas; no obstante, las listas de acceso del menú y las rutas no son completamente equivalentes en todos los módulos. Deben unificarse y probarse antes de considerar el control de acceso terminado.

En desarrollo, `AuthContext.jsx` contiene cuentas de demostración. Los tokens `demo:*` simulan la sesión en el frontend y **no constituyen prueba de autorización válida en la API**. No deben utilizarse como autenticación de producción.

## 4. Estado de avance

### Identificado en el código
- Páginas React para los módulos listados en la sección 2.
- Menú lateral que muestra opciones según el rol.
- Ruta específica `/head-coach`.
- Contexto de autenticación con roles y modo demo de desarrollo.
- Formularios y llamadas al cliente HTTP en distintos módulos.
- Código de cálculo antropométrico en `frontend/src/utils/anthropometry.js`.

### Pendiente de validar
- Que cada formulario guarde correctamente a través del backend.
- Que los datos permanezcan después de recargar o reiniciar la aplicación.
- Que los endpoints comprueben el rol y la propiedad/asignación del registro.
- Que un jugador solamente consulte su propia antropometría, salud, asistencia, evaluaciones y estadísticas cuando corresponda.
- Que las cuentas creadas desde Usuarios se vinculen correctamente con el perfil deportivo del jugador.
- Que el entrenador vea únicamente los deportistas que tiene asignados.
- Que el Head Coach vea solamente la información de los entrenadores asociados.
- Que el personal de salud tenga acceso a la información clínica necesaria y que otros roles no puedan consultar datos clínicos restringidos.
- Que la aplicación compile con `npm run build` y pase pruebas funcionales.

## 5. Prioridades recomendadas

1. **Acceso y privacidad:** comparar las reglas del menú, las rutas de `App.jsx`, los middleware y los controladores backend.
2. **Cuenta de jugador:** comprobar la relación entre `usuarios.jugador_id` y el perfil deportivo.
3. **Antropometría:** limitar la consulta a los registros propios para el rol `jugador`, tanto en frontend como en backend.
4. **Asignación deportiva:** verificar filtros de entrenador y Head Coach en jugadores, entrenamientos, partidos, asistencia y estadísticas.
5. **Salud:** revisar permisos de historia clínica, lesiones, controles y notificaciones.
6. **Persistencia:** probar crear/leer/editar/eliminar según corresponda y confirmar el resultado tras recargar.
7. **Regresión:** ejecutar `npm run build` y probar cada rol en una sesión separada.

## 6. Matriz de pruebas funcionales

| Prueba | Resultado esperado | Estado |
|---|---|---|
| Iniciar sesión por rol | Se identifica el rol correcto | Pendiente de prueba |
| Abrir una ruta no autorizada | Acceso denegado o redirección | Pendiente de prueba |
| Jugador consulta antropometría | Solo aparecen datos propios | Pendiente de prueba |
| Jugador intenta cambiar el ID consultado | Backend rechaza la petición ajena | Pendiente de prueba |
| Administrador crea cuenta de jugador | Cuenta vinculada al perfil deportivo correcto | Pendiente de prueba |
| Entrenador consulta jugadores | Solo ve deportistas asignados | Pendiente de prueba |
| Personal de salud consulta historia clínica | Acceso permitido según autorización | Pendiente de prueba |
| Crear un registro y recargar | El registro sigue disponible si se guardó correctamente | Pendiente de prueba |
| Compilar frontend | `npm run build` termina sin errores | Pendiente de prueba |

## 7. Base de datos y despliegue

Desde la v1.2 el único almacenamiento es PostgreSQL. Una base nueva se crea con `npm run db:init` (`backend/config/database.sql`); una base existente se actualiza con los scripts de `backend/migrations/` en orden. No ejecutar migraciones en producción sin respaldo.

Las cuentas demo del frontend sirven únicamente para revisar la interfaz en modo desarrollo. Para comprobar persistencia y seguridad se requieren cuentas y datos de prueba conectados al backend y al almacenamiento realmente utilizado.

## 8. Criterio para declarar una función terminada

Una función se considerará terminada cuando:
1. La interfaz permita realizar la operación prevista.
2. La API valide autenticación, rol y propiedad/asignación del registro.
3. La operación guarde o consulte el dato esperado.
4. El resultado se compruebe después de recargar.
5. Se prueben tanto el acceso permitido como el intento de acceso no autorizado.
6. Se actualice esta documentación con el resultado de las pruebas reales.
