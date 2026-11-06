const db = require('../config/db');

const { responderError } = require('../utils/errores');
const { condicionAlcance, puedeVerJugador } = require('../utils/alcance');
const { buscar } = require('../utils/agenda');

// v2.0 (DEF-041): la columna `asistencia` es BOOLEAN. El frontend enviaba 1/0 y comparaba con `=== 1`,
// así que lo guardado nunca se veía como "Presente". Ahora el valor siempre se normaliza a true/false
// y cada deportista tiene un solo registro por entrenamiento (índice único + upsert).
const aBooleano = (v) => v === true || v === 1 || v === '1' || v === 'true';

exports.getAll = async (req, res) => {
  try {
    const { entrenamiento_id } = req.query;
    let query = `
      SELECT ae.*, j.nombre AS jugador_nombre, j.dorsal AS jugador_dorsal, e.tipo AS entrenamiento_tipo, e.fecha
      FROM asistencia_entrenamiento ae
      JOIN jugadores j ON ae.jugador_id = j.id
      JOIN entrenamientos e ON ae.entrenamiento_id = e.id
    `;
    const params = [];
    const condiciones = [];
    if (entrenamiento_id) {
      params.push(entrenamiento_id);
      condiciones.push(`ae.entrenamiento_id = $${params.length}`);
    }
    // Cada rol ve solo la asistencia de los deportistas de su alcance (DEF-027)
    const alcance = condicionAlcance(req.usuario, params);
    if (alcance) condiciones.push(alcance);
    if (condiciones.length) query += ` WHERE ${condiciones.join(' AND ')}`;
    query += ' ORDER BY e.fecha DESC, j.nombre ASC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    responderError(res, err);
  }
};

// Guarda (crea o actualiza) la asistencia de un deportista en un entrenamiento
async function guardar(cliente, jugadorId, entrenamientoId, valor) {
  const { rows } = await cliente.query(
    `INSERT INTO asistencia_entrenamiento (jugador_id, entrenamiento_id, asistencia) VALUES ($1, $2, $3)
     ON CONFLICT (jugador_id, entrenamiento_id) DO UPDATE SET asistencia = EXCLUDED.asistencia
     RETURNING id, jugador_id, entrenamiento_id, asistencia`,
    [jugadorId, entrenamientoId, valor]
  );
  return rows[0];
}

// POST /api/asistencia  { jugador_id, entrenamiento_id, asistencia }
exports.create = async (req, res) => {
  const { jugador_id, entrenamiento_id } = req.body;
  if (!jugador_id || !entrenamiento_id) return res.status(400).json({ error: 'jugador_id y entrenamiento_id son obligatorios' });
  try {
    if (!(await buscar('entrenamientos', req.usuario, entrenamiento_id))) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado o fuera de tu alcance.' });
    }
    if (!(await puedeVerJugador(db, req.usuario, jugador_id))) {
      return res.status(403).json({ error: 'Solo puedes tomar asistencia a tus deportistas.' });
    }
    const registro = await guardar(db, jugador_id, entrenamiento_id, aBooleano(req.body.asistencia));
    res.status(201).json(registro);
  } catch (err) {
    responderError(res, err);
  }
};

// PUT /api/asistencia/lote  { entrenamiento_id, jugadores: [id…], asistencia }
// "Todos presentes" / "Todos ausentes" en una sola petición y una sola transacción
exports.lote = async (req, res) => {
  const { entrenamiento_id, jugadores } = req.body;
  if (!entrenamiento_id || !Array.isArray(jugadores) || jugadores.length === 0) {
    return res.status(400).json({ error: 'Indica el entrenamiento y los deportistas.' });
  }
  const valor = aBooleano(req.body.asistencia);
  const cliente = await db.connect();
  try {
    if (!(await buscar('entrenamientos', req.usuario, entrenamiento_id, cliente))) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado o fuera de tu alcance.' });
    }
    // Solo los deportistas del alcance del usuario
    const params = [jugadores.map(Number).filter(Number.isInteger)];
    const cond = condicionAlcance(req.usuario, params);
    const { rows: permitidos } = await cliente.query(
      `SELECT j.id FROM jugadores j WHERE j.id = ANY($1::int[])${cond ? ` AND ${cond}` : ''}`, params);
    await cliente.query('BEGIN');
    const registros = [];
    for (const { id } of permitidos) registros.push(await guardar(cliente, id, entrenamiento_id, valor));
    await cliente.query('COMMIT');
    res.json({ actualizados: registros.length, registros });
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    responderError(res, err);
  } finally {
    cliente.release();
  }
};

exports.update = async (req, res) => {
  try {
    const params = [aBooleano(req.body.asistencia), req.params.id];
    const cond = condicionAlcance(req.usuario, params);
    const { rows } = await db.query(
      `UPDATE asistencia_entrenamiento ae SET asistencia = $1 FROM jugadores j
       WHERE ae.id = $2 AND j.id = ae.jugador_id${cond ? ` AND ${cond}` : ''}
       RETURNING ae.id, ae.jugador_id, ae.entrenamiento_id, ae.asistencia`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    responderError(res, err);
  }
};

exports.remove = async (req, res) => {
  try {
    const params = [req.params.id];
    const cond = condicionAlcance(req.usuario, params);
    await db.query(
      `DELETE FROM asistencia_entrenamiento ae USING jugadores j
       WHERE ae.id = $1 AND j.id = ae.jugador_id${cond ? ` AND ${cond}` : ''}`, params);
    res.json({ message: 'Registro eliminado' });
  } catch (err) {
    responderError(res, err);
  }
};
