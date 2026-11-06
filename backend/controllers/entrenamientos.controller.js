const db = require('../config/db');

const { responderError } = require('../utils/errores');
const { camposAgenda, listar, buscar } = require('../utils/agenda');

// v1.7: cada usuario ve los entrenamientos generales y los de los equipos de su alcance
exports.getAll = async (req, res) => {
  try {
    res.json(await listar('entrenamientos', req.usuario));
  } catch (err) {
    responderError(res, err);
  }
};

exports.getOne = async (req, res) => {
  try {
    const e = await buscar('entrenamientos', req.usuario, req.params.id);
    if (!e) return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    res.json(e);
  } catch (err) {
    responderError(res, err);
  }
};

exports.create = async (req, res) => {
  const { fecha, tipo, descripcion } = req.body;
  if (!fecha || !tipo) return res.status(400).json({ error: 'Fecha y tipo son obligatorios' });
  try {
    const a = await camposAgenda(req.usuario, req.body);
    if (a.error) return res.status(a.status || 400).json({ error: a.error });
    const { rows } = await db.query(
      'INSERT INTO entrenamientos (fecha, tipo, descripcion, equipo_id, hora, lugar) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [fecha, tipo, descripcion, a.equipo_id, a.hora, a.lugar]
    );
    res.status(201).json({ id: rows[0].id, fecha, tipo, descripcion, equipo_id: a.equipo_id, hora: a.hora, lugar: a.lugar });
  } catch (err) {
    responderError(res, err);
  }
};

exports.update = async (req, res) => {
  const { fecha, tipo, descripcion } = req.body;
  try {
    const actual = await buscar('entrenamientos', req.usuario, req.params.id);
    if (!actual) return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    // Equipo, hora y lugar se conservan si no vienen en la petición
    const a = await camposAgenda(req.usuario, {
      equipo_id: 'equipo_id' in req.body ? req.body.equipo_id : actual.equipo_id,
      hora: 'hora' in req.body ? req.body.hora : actual.hora,
      lugar: 'lugar' in req.body ? req.body.lugar : actual.lugar,
    });
    if (a.error) return res.status(a.status || 400).json({ error: a.error });
    await db.query(
      'UPDATE entrenamientos SET fecha=$1, tipo=$2, descripcion=$3, equipo_id=$4, hora=$5, lugar=$6 WHERE id=$7',
      [fecha, tipo, descripcion, a.equipo_id, a.hora, a.lugar, req.params.id]
    );
    res.json({ message: 'Entrenamiento actualizado correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};

exports.remove = async (req, res) => {
  try {
    if (!(await buscar('entrenamientos', req.usuario, req.params.id))) return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    await db.query('DELETE FROM entrenamientos WHERE id = $1', [req.params.id]);
    res.json({ message: 'Entrenamiento eliminado correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};
