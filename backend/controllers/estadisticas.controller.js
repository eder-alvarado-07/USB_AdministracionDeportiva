const db = require('../config/db');

const { responderError } = require('../utils/errores');
const { condicionAlcance, condicionDisciplinas, puedeVerJugador } = require('../utils/alcance');
const { perfilDeporte, limpiarMetricas, columnasLegado, desdeLegado, PERFILES, GENERICO } = require('../config/metricas_deportes');

// v2.1: cada deporte tiene sus propias métricas (config/metricas_deportes.js), guardadas en `metricas` (JSONB).
// Las columnas antiguas goles / asistencias / minutos_jugados se siguen llenando para el inicio y los reconocimientos.
// Un registro anterior a v2.1 (sin `metricas`) se muestra con las métricas de su deporte a partir de esas columnas.

const DEPORTE_JUGADOR = `COALESCE(j.disciplina_id, eq.disciplina_id)`;

function conMetricas(fila) {
  const perfil = perfilDeporte(fila.disciplina_nombre);
  const guardadas = fila.metricas && Object.keys(fila.metricas).length ? fila.metricas : null;
  return { ...fila, deporte_clave: perfil.clave, metricas: guardadas || desdeLegado(perfil, fila) };
}

// GET /api/estadisticas/metricas → deportes que el usuario puede ver, cada uno con sus métricas
exports.metricas = async (req, res) => {
  try {
    const params = [];
    const cond = condicionDisciplinas(req.usuario, params, 'd.id');
    const alcance = condicionAlcance(req.usuario, params, 'j');
    const { rows } = await db.query(`
      SELECT d.id, d.nombre,
        (SELECT COUNT(*)::int FROM jugadores j LEFT JOIN equipos eq ON eq.id = j.equipo_id
          WHERE ${DEPORTE_JUGADOR} = d.id${alcance ? ` AND ${alcance}` : ''}) AS total_jugadores,
        (SELECT COUNT(*)::int FROM estadisticas_jugador es JOIN jugadores j ON j.id = es.jugador_id
          LEFT JOIN equipos eq ON eq.id = j.equipo_id
          WHERE ${DEPORTE_JUGADOR} = d.id${alcance ? ` AND ${alcance}` : ''}) AS total_registros
      FROM disciplinas d ${cond ? `WHERE ${cond}` : ''} ORDER BY d.nombre`, params);
    res.json({
      deportes: rows.map(d => ({ ...d, perfil: perfilDeporte(d.nombre) })),
      // Catálogo completo, para que la pantalla muestre qué mide cada deporte aunque aún no exista en la universidad
      catalogo: Object.entries(PERFILES).map(([clave, p]) => ({ clave, nombre: p.nombre, metricas: p.metricas, derivadas: p.derivadas || [] })),
      generico: GENERICO,
    });
  } catch (err) {
    responderError(res, err);
  }
};

// GET /api/estadisticas?disciplina_id=  (cada rol ve solo los deportistas de su alcance)
exports.getAll = async (req, res) => {
  try {
    const params = [];
    const condiciones = [];
    const alcance = condicionAlcance(req.usuario, params, 'j');
    if (alcance) condiciones.push(alcance);
    if (req.query.disciplina_id && req.query.disciplina_id !== 'todos') {
      params.push(req.query.disciplina_id);
      condiciones.push(`${DEPORTE_JUGADOR} = $${params.length}`);
    }
    const { rows } = await db.query(`
      SELECT es.*, j.nombre AS jugador_nombre, j.dorsal AS jugador_dorsal, j.posicion AS jugador_posicion, j.foto_url AS jugador_foto,
             ${DEPORTE_JUGADOR} AS disciplina_id, d.nombre AS disciplina_nombre,
             p.rival, p.fecha AS partido_fecha, p.tipo AS partido_tipo
      FROM estadisticas_jugador es
      JOIN jugadores j ON es.jugador_id = j.id
      LEFT JOIN equipos eq ON eq.id = j.equipo_id
      LEFT JOIN disciplinas d ON d.id = ${DEPORTE_JUGADOR}
      LEFT JOIN partidos p ON es.partido_id = p.id
      ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
      ORDER BY COALESCE(p.fecha, es.created_at::date) DESC, es.id DESC`, params);
    res.json(rows.map(conMetricas));
  } catch (err) {
    responderError(res, err);
  }
};

exports.getByJugador = async (req, res) => {
  try {
    if (!(await puedeVerJugador(db, req.usuario, req.params.jugador_id))) {
      return res.status(404).json({ error: 'Deportista no encontrado o fuera de tu alcance.' });
    }
    const { rows } = await db.query(`
      SELECT es.*, d.nombre AS disciplina_nombre, p.rival, p.fecha AS partido_fecha, p.tipo AS partido_tipo
      FROM estadisticas_jugador es
      JOIN jugadores j ON j.id = es.jugador_id
      LEFT JOIN equipos eq ON eq.id = j.equipo_id
      LEFT JOIN disciplinas d ON d.id = ${DEPORTE_JUGADOR}
      LEFT JOIN partidos p ON es.partido_id = p.id
      WHERE es.jugador_id = $1
      ORDER BY p.fecha DESC NULLS LAST, es.id DESC`, [req.params.jugador_id]);
    res.json(rows.map(conMetricas));
  } catch (err) {
    responderError(res, err);
  }
};

// Deporte del deportista y validación de las métricas según ese deporte
async function prepararRegistro(req) {
  const { jugador_id } = req.body;
  if (!jugador_id) return { status: 400, error: 'Elige el deportista.' };
  if (!(await puedeVerJugador(db, req.usuario, jugador_id))) {
    return { status: 403, error: 'Solo puedes registrar estadísticas de tus deportistas.' };
  }
  const { rows: [j] } = await db.query(`
    SELECT d.nombre AS disciplina_nombre FROM jugadores j LEFT JOIN equipos eq ON eq.id = j.equipo_id
    LEFT JOIN disciplinas d ON d.id = ${DEPORTE_JUGADOR} WHERE j.id = $1`, [jugador_id]);
  const perfil = perfilDeporte(j?.disciplina_nombre);
  // Compatibilidad: un cliente antiguo que solo envía goles / asistencias / minutos_jugados
  const entrada = req.body.metricas && typeof req.body.metricas === 'object'
    ? req.body.metricas
    : desdeLegado(perfil, req.body);
  const { error, metricas } = limpiarMetricas(perfil, entrada);
  if (error) return { status: 400, error };
  return { perfil, metricas, legado: columnasLegado(perfil, metricas) };
}

exports.create = async (req, res) => {
  try {
    const r = await prepararRegistro(req);
    if (r.error) return res.status(r.status).json({ error: r.error });
    const { rows } = await db.query(
      `INSERT INTO estadisticas_jugador (jugador_id, partido_id, goles, asistencias, minutos_jugados, metricas)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [req.body.jugador_id, req.body.partido_id || null, r.legado.goles, r.legado.asistencias, r.legado.minutos_jugados, r.metricas]
    );
    res.status(201).json({ id: rows[0].id, jugador_id: req.body.jugador_id, partido_id: req.body.partido_id || null, metricas: r.metricas, ...r.legado });
  } catch (err) {
    responderError(res, err);
  }
};

exports.update = async (req, res) => {
  try {
    const { rows: [actual] } = await db.query('SELECT jugador_id FROM estadisticas_jugador WHERE id = $1', [req.params.id]);
    if (!actual || !(await puedeVerJugador(db, req.usuario, actual.jugador_id))) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    const r = await prepararRegistro(req);
    if (r.error) return res.status(r.status).json({ error: r.error });
    await db.query(
      `UPDATE estadisticas_jugador SET jugador_id=$1, partido_id=$2, goles=$3, asistencias=$4, minutos_jugados=$5, metricas=$6 WHERE id=$7`,
      [req.body.jugador_id, req.body.partido_id || null, r.legado.goles, r.legado.asistencias, r.legado.minutos_jugados, r.metricas, req.params.id]
    );
    res.json({ message: 'Estadística actualizada correctamente', metricas: r.metricas });
  } catch (err) {
    responderError(res, err);
  }
};

exports.remove = async (req, res) => {
  try {
    const params = [req.params.id];
    const cond = condicionAlcance(req.usuario, params, 'j');
    const { rowCount } = await db.query(
      `DELETE FROM estadisticas_jugador es USING jugadores j
       WHERE es.id = $1 AND j.id = es.jugador_id${cond ? ` AND ${cond}` : ''}`, params);
    if (!rowCount) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ message: 'Estadística eliminada correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};
