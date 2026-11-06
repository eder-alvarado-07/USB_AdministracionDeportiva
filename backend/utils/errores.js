// Traduce los errores a respuestas HTTP sin exponer detalles internos (DEF-015, DEF-016, DEF-018).
// Los errores de datos de PostgreSQL se responden con 400/409 y un mensaje para el usuario;
// cualquier otro error se registra en la consola del servidor y se responde con un 500 genérico.

// Mensajes de las restricciones CHECK con nombre (database.sql y migración 004)
const RESTRICCIONES = {
  chk_jugadores_edad: 'La edad debe estar entre 0 y 100 años.',
  chk_jugadores_peso: 'El peso debe ser mayor que 0 y menor que 300 kg.',
  chk_jugadores_altura: 'La altura debe ser mayor que 0 y menor que 3 m.',
  chk_estadisticas_valores: 'Goles, asistencias y minutos no pueden ser negativos.',
  chk_evaluaciones_valores: 'Velocidad, resistencia y fuerza no pueden ser negativas.',
  chk_antropometria_valores: 'Las medidas antropométricas no pueden ser negativas y el peso y la estatura deben ser mayores que 0.',
  chk_evaluaciones_rugby_valores: 'Las pruebas físicas no pueden tener valores negativos.',
  partidos_tipo_check: 'El tipo de partido debe ser "liga" o "amistoso".',
  evaluaciones_tipo_check: 'El tipo de evaluación debe ser "inicial" o "final".',
  usuarios_rol_check: 'El rol no es válido.',
  jugadores_genero_check: 'El género debe ser "masculino" o "femenino".',
  jugadores_dorsal_check: 'El dorsal debe estar entre 0 y 99.',
  chk_convocatorias_hora: 'La hora de presentación debe tener el formato HH:MM.',
  chk_entrenamientos_hora: 'La hora debe tener el formato HH:MM.',
  chk_partidos_hora: 'La hora debe tener el formato HH:MM.',
  chk_convocados_rol: 'Cada convocado debe ser titular o suplente.',
  chk_convocados_confirmacion: 'La respuesta debe ser confirmado o no puede.',
};

const POR_CODIGO = {
  '22P02': [400, 'Uno de los valores no tiene el formato esperado (por ejemplo, se esperaba un número).'],
  '22007': [400, 'La fecha no es válida. Usa el formato AAAA-MM-DD.'],
  '22008': [400, 'La fecha no es válida. Usa el formato AAAA-MM-DD.'],
  '22003': [400, 'Un valor numérico está fuera del rango permitido.'],
  '22001': [400, 'Un texto supera la longitud máxima permitida.'],
  '23502': [400, 'Falta un dato obligatorio.'],
  '23503': [400, 'El registro relacionado no existe (por ejemplo, el jugador, equipo o entrenamiento indicado).'],
  '23505': [409, 'Ya existe un registro con esos datos.'],
  '23514': [400, 'Uno de los valores no está permitido.'],
};

const MENSAJE_500 = 'Ocurrió un error interno. Intenta de nuevo y, si se repite, avisa al administrador.';

function responderError(res, err) {
  const conocido = POR_CODIGO[err && err.code];
  if (conocido) {
    let [status, mensaje] = conocido;
    if (err.code === '23514' && RESTRICCIONES[err.constraint]) mensaje = RESTRICCIONES[err.constraint];
    if (err.code === '23502' && err.column) mensaje = `Falta un dato obligatorio: ${err.column}.`;
    // Al eliminar, la llave foránea se viola porque otros registros dependen del que se borra
    if (err.code === '23503' && res.req && res.req.method === 'DELETE') {
      status = 409;
      mensaje = 'No se puede eliminar porque hay otros registros que dependen de este.';
    }
    return res.status(status).json({ error: mensaje });
  }
  const req = res.req || {};
  console.error(`[500] ${req.method || ''} ${req.originalUrl || ''}`, err);
  return res.status(500).json({ error: MENSAJE_500 });
}

// Último middleware de la API: cuerpo JSON inválido, archivos demasiado grandes y errores no capturados
function manejadorFinal(err, _req, res, next) {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande.' });
  if (err.name === 'MulterError') return res.status(400).json({ error: 'El archivo no es válido o supera el tamaño permitido.' });
  // Errores propios con estado 4xx y mensaje pensado para el usuario (por ejemplo, formato de imagen)
  if (err.status >= 400 && err.status < 500 && !err.type) return res.status(err.status).json({ error: err.message });
  return responderError(res, err);
}

// Rechaza identificadores de ruta que no sean enteros positivos antes de llegar a la base
function validarId(req, res, next, valor) {
  if (!/^[1-9]\d{0,9}$/.test(valor) || Number(valor) > 2147483647) {
    return res.status(400).json({ error: 'El identificador debe ser un número entero positivo.' });
  }
  next();
}

module.exports = { responderError, manejadorFinal, validarId, MENSAJE_500 };
