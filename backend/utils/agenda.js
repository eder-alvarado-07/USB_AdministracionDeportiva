// Operaciones comunes de entrenamientos y partidos por equipo (v1.7): listar, ver, validar y comprobar permisos.
const db = require('../config/db');
const { condicionEquipos, puedeUsarEquipo } = require('./alcance');

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Lee equipo, hora y lugar del cuerpo y los valida. Devuelve { error } o { equipo_id, hora, lugar }.
async function camposAgenda(usuario, cuerpo) {
  const equipo_id = cuerpo.equipo_id === '' || cuerpo.equipo_id === undefined || cuerpo.equipo_id === null ? null : Number(cuerpo.equipo_id);
  if (equipo_id !== null && (!Number.isInteger(equipo_id) || equipo_id < 1)) return { error: 'El equipo indicado no es válido.' };
  const hora = typeof cuerpo.hora === 'string' && cuerpo.hora.trim() ? cuerpo.hora.trim() : null;
  if (hora && !HORA.test(hora)) return { error: 'La hora debe tener el formato HH:MM.' };
  const lugar = typeof cuerpo.lugar === 'string' && cuerpo.lugar.trim() ? cuerpo.lugar.trim() : null;
  // v2.0 (DEF-042): solo el administrador crea actividades generales (para todos los equipos). Un entrenador
  // debe elegir uno de sus equipos; si no, su entrenamiento le aparecía también a los equipos de otros deportes.
  if (equipo_id === null && usuario?.rol !== 'administrador') return { error: 'Elige el equipo para esta actividad.' };
  if (!(await puedeUsarEquipo(db, usuario, equipo_id))) return { error: 'Solo puedes asignar equipos de tu deporte.', status: 403 };
  return { equipo_id, hora, lugar };
}

// Lista de una tabla de agenda ('entrenamientos' o 'partidos') visible para el usuario, con el nombre del equipo
async function listar(tabla, usuario, extra = '') {
  const params = [];
  const cond = condicionEquipos(usuario, params, 'a.equipo_id');
  const { rows } = await db.query(`
    SELECT a.*, eq.nombre AS equipo_nombre, eq.disciplina_id, dd.nombre AS disciplina_nombre FROM ${tabla} a
    LEFT JOIN equipos eq ON eq.id = a.equipo_id LEFT JOIN disciplinas dd ON dd.id = eq.disciplina_id
    ${cond ? `WHERE ${cond}` : ''} ${extra} ORDER BY a.fecha DESC, a.hora NULLS LAST, a.id DESC`, params);
  return rows;
}

// Una actividad si el usuario puede verla; null si no existe o está fuera de su alcance
async function buscar(tabla, usuario, id, cliente = db) {
  const params = [id];
  const cond = condicionEquipos(usuario, params, 'a.equipo_id');
  const { rows } = await cliente.query(`
    SELECT a.*, eq.nombre AS equipo_nombre, eq.disciplina_id, dd.nombre AS disciplina_nombre FROM ${tabla} a
    LEFT JOIN equipos eq ON eq.id = a.equipo_id LEFT JOIN disciplinas dd ON dd.id = eq.disciplina_id
    WHERE a.id = $1${cond ? ` AND ${cond}` : ''}`, params);
  return rows[0] || null;
}

module.exports = { camposAgenda, listar, buscar };
