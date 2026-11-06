const db = require('../config/db');

const { responderError } = require('../utils/errores');
const { condicionAlcance } = require('../utils/alcance');
exports.getAll = async (req, res) => {
  try {
    // Cada rol ve solo las evaluaciones de los deportistas de su alcance (DEF-028)
    const params = [];
    const alcance = condicionAlcance(req.usuario, params);
    const { rows } = await db.query(`
      SELECT e.*, j.nombre AS jugador_nombre, j.dorsal AS jugador_dorsal
      FROM evaluaciones_rugby e
      JOIN jugadores j ON e.jugador_id = j.id
      ${alcance ? `WHERE ${alcance}` : ''}
      ORDER BY e.fecha DESC
    `, params);
    res.json(rows);
  } catch (err) {
    responderError(res, err);
  }
};

// Columnas que se pueden escribir en evaluaciones_rugby.
// Cualquier otra clave del body se descarta (evita errores e inyección SQL en los nombres de columna).
const COLUMNAS = [
  'jugador_id', 'fecha', 'sprint_30m', 'salto_vertical', 'resistencia_yoyo',
  'peso', 'estatura', 'porcentaje_grasa', 'masa_muscular', 'imc',
  'score_velocidad', 'score_potencia', 'score_resistencia', 'score_grasa', 'score_musculo', 'score_general',
];

const soloColumnas = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => COLUMNAS.includes(k)));

exports.create = async (req, res) => {
  const data = soloColumnas(req.body);

  const refs = {
    sprint:  { best: 3.8,  worst: 5.5  },
    salto:   { best: 70,   worst: 20   },
    yoyo:    { best: 2200, worst: 400  },
    grasa:   { best: 8,    worst: 25   },
    musculo: { best: 50,   worst: 25   },
  };

  const norm = (val, best, worst) => {
    if (!val) return 0;
    const score = ((Number(val) - worst) / (best - worst)) * 100;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const score_velocidad  = norm(data.sprint_30m,       refs.sprint.best,  refs.sprint.worst);
  const score_potencia   = norm(data.salto_vertical,    refs.salto.best,   refs.salto.worst);
  const score_resistencia= norm(data.resistencia_yoyo,  refs.yoyo.best,    refs.yoyo.worst);
  const score_grasa      = norm(data.porcentaje_grasa,  refs.grasa.best,   refs.grasa.worst);
  const score_musculo    = norm(data.masa_muscular,     refs.musculo.best, refs.musculo.worst);
  const score_general    = Math.round((score_velocidad + score_potencia + score_resistencia + score_grasa + score_musculo) / 5);

  const fields = { ...data, score_velocidad, score_potencia, score_resistencia, score_grasa, score_musculo, score_general };
  for (const k in fields) if (fields[k] === '') fields[k] = null;

  try {
    const keys   = Object.keys(fields);
    const vals   = Object.values(fields);
    const params = keys.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await db.query(
      `INSERT INTO evaluaciones_rugby (${keys.join(', ')}) VALUES (${params}) RETURNING id`,
      vals
    );
    res.status(201).json({ id: rows[0].id, ...fields });
  } catch (err) {
    responderError(res, err);
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM evaluaciones_rugby WHERE id = $1', [req.params.id]);
    res.json({ message: 'Evaluación eliminada' });
  } catch (err) {
    responderError(res, err);
  }
};
