const db = require('../config/db');

const { responderError } = require('../utils/errores');
const { condicionDisciplinas } = require('../utils/alcance');

// GET /api/disciplinas → los deportes que el usuario puede ver (v1.9: el entrenador y el deportista, solo los suyos)
exports.getAll = async (req, res) => {
  try {
    const params = [];
    const cond = condicionDisciplinas(req.usuario, params, 'd.id');
    const { rows } = await db.query(`
      SELECT d.*, COUNT(j.id)::int AS total_jugadores
      FROM disciplinas d
      LEFT JOIN jugadores j ON j.disciplina_id = d.id
      ${cond ? `WHERE ${cond}` : ''}
      GROUP BY d.id
      ORDER BY d.nombre ASC
    `, params);
    res.json(rows);
  } catch (err) {
    responderError(res, err);
  }
};

exports.create = async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const { rows } = await db.query(
      'INSERT INTO disciplinas (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id, nombre',
      [nombre.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    responderError(res, err);
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    // Disassociate athletes if assigned to this discipline
    await db.query('UPDATE jugadores SET disciplina_id = NULL WHERE disciplina_id = $1', [id]);
    const { rowCount } = await db.query('DELETE FROM disciplinas WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Disciplina no encontrada' });
    res.json({ message: 'Disciplina eliminada correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};

// ── Categorías de cada deporte (v2.0) ──────────────────────────────
// GET /api/disciplinas/categorias → categorías de los deportes que el usuario puede ver
exports.categorias = async (req, res) => {
  try {
    const params = [];
    const cond = condicionDisciplinas(req.usuario, params, 'c.disciplina_id');
    const { rows } = await db.query(`
      SELECT c.id, c.nombre, c.disciplina_id, COUNT(e.id)::int AS total_equipos
      FROM categorias c LEFT JOIN equipos e ON e.categoria_id = c.id
      ${cond ? `WHERE ${cond}` : ''}
      GROUP BY c.id ORDER BY c.disciplina_id, c.nombre`, params);
    res.json(rows);
  } catch (err) { responderError(res, err); }
};

// POST /api/disciplinas/:id/categorias  { nombre }
exports.crearCategoria = async (req, res) => {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!nombre) return res.status(400).json({ error: 'Escribe el nombre de la categoría.' });
  if (nombre.length > 60) return res.status(400).json({ error: 'El nombre puede tener hasta 60 caracteres.' });
  try {
    const { rows } = await db.query(
      `INSERT INTO categorias (disciplina_id, nombre) VALUES ($1, $2)
       ON CONFLICT (disciplina_id, nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id, nombre, disciplina_id`,
      [req.params.id, nombre]);
    res.status(201).json({ ...rows[0], total_equipos: 0 });
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'Deporte no encontrado' });
    responderError(res, err);
  }
};

// DELETE /api/disciplinas/categorias/:id
exports.eliminarCategoria = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM categorias WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ ok: true });
  } catch (err) { responderError(res, err); }
};
