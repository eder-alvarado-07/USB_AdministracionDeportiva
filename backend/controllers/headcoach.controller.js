const db = require('../config/db');

const { responderError } = require('../utils/errores');
const { condicionEquipos } = require('../utils/alcance');
// v2.0: cada entrenador trae su deporte y su número de deportistas, y cada deportista su entrenador_id,
// para que el panel pueda filtrar los deportistas de cada entrenador. Los partidos son los del alcance.
exports.resumen = async (req, res) => {
  try {
    const pp = [];
    const cond = condicionEquipos(req.usuario, pp, 'p.equipo_id');
    const [entrenadores, jugadores, equipos, partidos] = await Promise.all([
      db.query(`SELECT u.id, u.nombre, u.email, d.nombre AS disciplina_nombre,
          (SELECT COUNT(*)::int FROM jugadores j WHERE j.entrenador_id = u.id) AS total_jugadores
        FROM usuarios u LEFT JOIN disciplinas d ON d.id = u.disciplina_id
        WHERE u.rol='entrenador' AND u.head_coach_id=$1 ORDER BY u.nombre`, [req.usuario.id]),
      db.query(`SELECT j.id, j.nombre, j.dorsal, j.posicion, j.foto_url, j.entrenador_id, j.equipo_id,
          COALESCE(date_part('year', age(j.fecha_nacimiento))::int, j.edad) AS edad, e.nombre AS equipo_nombre,
          u.nombre AS entrenador_nombre, d.nombre AS disciplina_nombre
        FROM jugadores j JOIN usuarios u ON u.id=j.entrenador_id
        LEFT JOIN equipos e ON e.id=j.equipo_id
        LEFT JOIN disciplinas d ON d.id = COALESCE(j.disciplina_id, e.disciplina_id)
        WHERE u.head_coach_id=$1 ORDER BY j.nombre`, [req.usuario.id]),
      db.query("SELECT COUNT(DISTINCT j.equipo_id)::int AS total FROM jugadores j JOIN usuarios u ON u.id=j.entrenador_id WHERE u.head_coach_id=$1", [req.usuario.id]),
      db.query(`SELECT COUNT(*)::int AS total FROM partidos p WHERE p.fecha >= CURRENT_DATE${cond ? ` AND ${cond}` : ''}`, pp)
    ]);
    res.json({ entrenadores: entrenadores.rows, jugadores: jugadores.rows, total_equipos: equipos.rows[0]?.total || 0, proximos_partidos: partidos.rows[0]?.total || 0 });
  } catch (err) { responderError(res, err); }
};
exports.entrenadores = async (req, res) => {
  try { const { rows } = await db.query("SELECT id,nombre,email FROM usuarios WHERE rol='entrenador' AND head_coach_id=$1 ORDER BY nombre", [req.usuario.id]); res.json(rows); }
  catch (err) { responderError(res, err); }
};
exports.jugadores = async (req, res) => {
  try { const { rows } = await db.query(`SELECT j.*, COALESCE(date_part('year', age(j.fecha_nacimiento))::int, j.edad) AS edad, e.nombre AS equipo_nombre, u.nombre AS entrenador_nombre FROM jugadores j JOIN usuarios u ON u.id=j.entrenador_id LEFT JOIN equipos e ON e.id=j.equipo_id WHERE u.head_coach_id=$1 ORDER BY j.nombre`, [req.usuario.id]); res.json(rows); }
  catch (err) { responderError(res, err); }
};
