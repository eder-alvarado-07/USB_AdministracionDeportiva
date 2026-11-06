const db = require('../config/db');

const { responderError } = require('../utils/errores');
// Restringe las lesiones visibles según el rol: el jugador ve las propias,
// el entrenador las de sus deportistas y el head coach las de sus entrenadores.
function filtroPorRol(usuario, params) {
  if (usuario?.rol === 'jugador') {
    params.push(usuario.jugador_id);
    return `l.jugador_id = $${params.length}`;
  }
  if (usuario?.rol === 'entrenador') {
    params.push(usuario.id);
    return `j.entrenador_id = $${params.length}`;
  }
  if (usuario?.rol === 'head_coach') {
    params.push(usuario.id);
    return `j.entrenador_id IN (SELECT id FROM usuarios WHERE head_coach_id = $${params.length})`;
  }
  return null;
}

exports.getAll = async (req, res) => {
  try {
    if (req.usuario?.rol === 'jugador' && !req.usuario.jugador_id) return res.json([]);
    let query = `SELECT l.*, j.nombre AS jugador_nombre, j.dorsal AS jugador_dorsal FROM lesiones l JOIN jugadores j ON l.jugador_id = j.id`;
    const params = [];
    const filtro = filtroPorRol(req.usuario, params);
    if (filtro) query += ` WHERE ${filtro}`;
    query += ' ORDER BY l.fecha_inicio DESC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    responderError(res, err);
  }
};

exports.getOne = async (req, res) => {
  try {
    if (req.usuario?.rol === 'jugador' && !req.usuario.jugador_id) {
      return res.status(404).json({ error: 'Lesión no encontrada' });
    }
    const params = [req.params.id];
    let query = `SELECT l.*, j.nombre AS jugador_nombre, j.dorsal AS jugador_dorsal FROM lesiones l JOIN jugadores j ON l.jugador_id = j.id WHERE l.id = $1`;
    const filtro = filtroPorRol(req.usuario, params);
    if (filtro) query += ` AND ${filtro}`;
    const { rows } = await db.query(query, params);
    if (!rows.length) return res.status(404).json({ error: 'Lesión no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    responderError(res, err);
  }
};

exports.create = async (req, res) => {
  const { jugador_id, tipo, descripcion, fecha_inicio, fecha_fin } = req.body;
  if (!jugador_id || !fecha_inicio) return res.status(400).json({ error: 'jugador_id y fecha_inicio son obligatorios' });
  try {
    const { rows } = await db.query(
      'INSERT INTO lesiones (jugador_id, tipo, descripcion, fecha_inicio, fecha_fin) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [jugador_id, tipo, descripcion, fecha_inicio, fecha_fin || null]
    );
    res.status(201).json({ id: rows[0].id, jugador_id, tipo, descripcion, fecha_inicio, fecha_fin });
  } catch (err) {
    responderError(res, err);
  }
};

exports.update = async (req, res) => {
  const { jugador_id, tipo, descripcion, fecha_inicio, fecha_fin } = req.body;
  try {
    const { rowCount } = await db.query(
      'UPDATE lesiones SET jugador_id=$1, tipo=$2, descripcion=$3, fecha_inicio=$4, fecha_fin=$5 WHERE id=$6',
      [jugador_id, tipo, descripcion, fecha_inicio, fecha_fin || null, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Lesión no encontrada' });
    res.json({ message: 'Lesión actualizada correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM lesiones WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Lesión no encontrada' });
    res.json({ message: 'Lesión eliminada correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};
