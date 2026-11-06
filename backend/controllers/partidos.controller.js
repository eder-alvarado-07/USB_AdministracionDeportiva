const db = require('../config/db');

const { responderError } = require('../utils/errores');
const { camposAgenda, listar, buscar } = require('../utils/agenda');

// v1.7: cada usuario ve los partidos generales y los de los equipos de su alcance
exports.getAll = async (req, res) => {
  try {
    res.json(await listar('partidos', req.usuario));
  } catch (err) {
    responderError(res, err);
  }
};

exports.getOne = async (req, res) => {
  try {
    const p = await buscar('partidos', req.usuario, req.params.id);
    if (!p) return res.status(404).json({ error: 'Partido no encontrado' });
    res.json(p);
  } catch (err) {
    responderError(res, err);
  }
};

exports.create = async (req, res) => {
  const { fecha, rival, tipo, resultado } = req.body;
  if (!fecha || !rival || !tipo) return res.status(400).json({ error: 'Fecha, rival y tipo son obligatorios' });
  try {
    const a = await camposAgenda(req.usuario, req.body);
    if (a.error) return res.status(a.status || 400).json({ error: a.error });
    const { rows } = await db.query(
      'INSERT INTO partidos (fecha, rival, tipo, resultado, equipo_id, hora, lugar) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [fecha, rival, tipo, resultado || null, a.equipo_id, a.hora, a.lugar]
    );
    res.status(201).json({ id: rows[0].id, fecha, rival, tipo, resultado, equipo_id: a.equipo_id, hora: a.hora, lugar: a.lugar });
  } catch (err) {
    responderError(res, err);
  }
};

exports.update = async (req, res) => {
  const { fecha, rival, tipo, resultado } = req.body;
  try {
    const actual = await buscar('partidos', req.usuario, req.params.id);
    if (!actual) return res.status(404).json({ error: 'Partido no encontrado' });
    // Equipo, hora y lugar se conservan si no vienen en la petición
    const a = await camposAgenda(req.usuario, {
      equipo_id: 'equipo_id' in req.body ? req.body.equipo_id : actual.equipo_id,
      hora: 'hora' in req.body ? req.body.hora : actual.hora,
      lugar: 'lugar' in req.body ? req.body.lugar : actual.lugar,
    });
    if (a.error) return res.status(a.status || 400).json({ error: a.error });
    await db.query(
      'UPDATE partidos SET fecha=$1, rival=$2, tipo=$3, resultado=$4, equipo_id=$5, hora=$6, lugar=$7 WHERE id=$8',
      [fecha, rival, tipo, resultado || null, a.equipo_id, a.hora, a.lugar, req.params.id]
    );
    res.json({ message: 'Partido actualizado correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};

exports.remove = async (req, res) => {
  try {
    if (!(await buscar('partidos', req.usuario, req.params.id))) return res.status(404).json({ error: 'Partido no encontrado' });
    await db.query('DELETE FROM partidos WHERE id = $1', [req.params.id]);
    res.json({ message: 'Partido eliminado correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};
