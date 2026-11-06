const db     = require('../config/db');
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');

const { responderError } = require('../utils/errores');
const { condicionDisciplinas, condicionAlcance } = require('../utils/alcance');
const { UPLOADS_DIR } = require('../config/archivos');
// Configuración de Multer para imágenes de equipos (logos/escudos)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(Object.assign(new Error('Formato de imagen no permitido (use PNG, JPG, WEBP o SVG)'), { status: 400 }));
  },
});

exports.uploadMiddleware = upload.single('logo');

exports.uploadLogo = async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo de imagen' });
  try {
    let logo_url;
    // Intentar almacenar en disco si el sistema de archivos es de escritura
    try {
      const uploadsDir = path.join(UPLOADS_DIR, 'teams');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
      const filename = `team-${id || Date.now()}-${Date.now()}${ext}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      logo_url = `/uploads/teams/${filename}`;
    } catch (diskErr) {
      // En entornos Serverless/Vercel (sistema de archivos de solo lectura), almacenar como Data URI Base64
      logo_url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    await db.query('UPDATE equipos SET logo_url = $1 WHERE id = $2', [logo_url, id]);
    res.json({ logo_url, message: 'Imagen del equipo actualizada correctamente' });
  } catch (err) {
    console.error('Error al actualizar escudo del equipo:', err);
    responderError(res, err);
  }
};

// GET /api/equipos
// v2.0: el entrenador y el head coach ven solo los equipos de su deporte (o donde tienen deportistas);
// cada equipo trae su categoría del catálogo del deporte.
exports.getAll = async (req, res) => {
  try {
    const { disciplina_id } = req.query;
    const params = [];
    const condiciones = [];
    if (disciplina_id && disciplina_id !== 'todos') {
      params.push(disciplina_id);
      condiciones.push(`e.disciplina_id = $${params.length}`);
    }
    if (['entrenador', 'head_coach'].includes(req.usuario?.rol)) {
      const deportes = condicionDisciplinas(req.usuario, params, 'e.disciplina_id');
      const sub = condicionAlcance(req.usuario, params, 'jx');
      condiciones.push(`(${deportes} OR e.id IN (SELECT jx.equipo_id FROM jugadores jx WHERE ${sub}))`);
    }
    const { rows } = await db.query(`
      SELECT e.*, d.nombre AS disciplina_nombre, c.nombre AS categoria_nombre,
             COUNT(j.id)::int AS total_jugadores
      FROM equipos e
      LEFT JOIN disciplinas d ON e.disciplina_id = d.id
      LEFT JOIN categorias c ON c.id = e.categoria_id
      LEFT JOIN jugadores j ON j.equipo_id = e.id
      ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
      GROUP BY e.id, d.nombre, c.nombre ORDER BY d.nombre NULLS LAST, e.nombre ASC`, params);
    res.json(rows);
  } catch (err) {
    responderError(res, err);
  }
};

// La categoría elegida del catálogo también se copia al texto `categoria` (compatibilidad con pantallas anteriores)
async function datosEquipo(body, usuario) {
  let disciplinaId = body.disciplina_id || null;
  if (usuario?.rol === 'entrenador') {
    const { rows } = await db.query('SELECT disciplina_id FROM usuarios WHERE id = $1', [usuario.id]);
    if (rows[0]?.disciplina_id) disciplinaId = rows[0].disciplina_id;
  }
  let categoriaId = body.categoria_id ? Number(body.categoria_id) : null;
  let categoria = body.categoria || null;
  if (categoriaId) {
    const { rows } = await db.query('SELECT nombre, disciplina_id FROM categorias WHERE id = $1', [categoriaId]);
    if (!rows.length || (disciplinaId && String(rows[0].disciplina_id) !== String(disciplinaId))) {
      return { error: 'La categoría no corresponde al deporte del equipo.' };
    }
    categoria = rows[0].nombre;
  }
  return { disciplinaId, categoriaId, categoria };
}

// GET /api/equipos/:id
exports.getOne = async (req, res) => {
  try {
    const { rows: teamRows } = await db.query(
      `SELECT e.*, d.nombre AS disciplina_nombre
       FROM equipos e
       LEFT JOIN disciplinas d ON e.disciplina_id = d.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!teamRows.length) return res.status(404).json({ error: 'Equipo no encontrado' });

    const equipo = teamRows[0];

    // Obtener los deportistas asignados a este equipo
    const { rows: jugadores } = await db.query(
      `SELECT j.id, j.nombre, j.dorsal, j.posicion, COALESCE(date_part('year', age(j.fecha_nacimiento))::int, j.edad) AS edad, j.peso, j.altura, j.foto_url, j.disciplina_id,
              d.nombre AS disciplina_nombre
       FROM jugadores j
       LEFT JOIN disciplinas d ON j.disciplina_id = d.id
       WHERE j.equipo_id = $1
       ORDER BY j.nombre ASC`,
      [req.params.id]
    );

    equipo.jugadores = jugadores;
    equipo.total_jugadores = jugadores.length;

    res.json(equipo);
  } catch (err) {
    responderError(res, err);
  }
};

// POST /api/equipos
exports.create = async (req, res) => {
  const { nombre, descripcion, logo_url } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre del equipo es obligatorio' });
  try {
    const d = await datosEquipo(req.body, req.usuario);
    if (d.error) return res.status(400).json({ error: d.error });
    const { categoria, disciplinaId: disciplina_id } = d;
    const { rows } = await db.query(
      `INSERT INTO equipos (nombre, categoria, descripcion, disciplina_id, logo_url, categoria_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [nombre.trim(), categoria || null, descripcion || null, disciplina_id || null, logo_url || null, d.categoriaId]
    );
    const nuevoId = rows[0].id;
    res.status(201).json({
      id: nuevoId,
      nombre,
      categoria,
      descripcion,
      disciplina_id,
      logo_url,
      message: 'Equipo creado exitosamente'
    });
  } catch (err) {
    responderError(res, err);
  }
};

// PUT /api/equipos/:id
exports.update = async (req, res) => {
  const { nombre, descripcion, logo_url } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre del equipo es obligatorio' });
  try {
    const d = await datosEquipo(req.body, req.usuario);
    if (d.error) return res.status(400).json({ error: d.error });
    const { rowCount } = await db.query(
      `UPDATE equipos 
       SET nombre=$1, categoria=$2, descripcion=$3, disciplina_id=$4, logo_url=COALESCE($5, logo_url), categoria_id=$6
       WHERE id=$7`,
      [nombre.trim(), d.categoria || null, descripcion || null, d.disciplinaId || null, logo_url || null, d.categoriaId, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Equipo actualizado correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};

// DELETE /api/equipos/:id
exports.remove = async (req, res) => {
  try {
    // Desvincular jugadores antes de eliminar
    await db.query('UPDATE jugadores SET equipo_id = NULL WHERE equipo_id = $1', [req.params.id]);
    const { rowCount } = await db.query('DELETE FROM equipos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Equipo eliminado correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};

