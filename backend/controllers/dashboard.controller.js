const db = require('../config/db');

const { responderError } = require('../utils/errores');
exports.getSummary = async (req, res) => {
  try {
    const { disciplina_id } = req.query;
    const filterSport = disciplina_id && disciplina_id !== 'todos' ? parseInt(disciplina_id, 10) : null;

    let r1Query = 'SELECT COUNT(*) AS total FROM jugadores';
    let r1Params = [];
    if (filterSport) {
      r1Query += ' WHERE disciplina_id = $1';
      r1Params = [filterSport];
    }
    const { rows: [r1] } = await db.query(r1Query, r1Params);

    let r2Query = `
      SELECT COUNT(l.id) AS total
      FROM lesiones l
      JOIN jugadores j ON l.jugador_id = j.id
      WHERE l.fecha_fin IS NULL
    `;
    let r2Params = [];
    if (filterSport) {
      r2Query += ' AND j.disciplina_id = $1';
      r2Params = [filterSport];
    }
    const { rows: [r2] } = await db.query(r2Query, r2Params);

    const { rows: [r3] } = await db.query('SELECT COUNT(*) AS total FROM partidos');
    const { rows: [r4] } = await db.query('SELECT COUNT(*) AS total FROM entrenamientos');

    const { rows: ultimos_entrenamientos } = await db.query(
      'SELECT * FROM entrenamientos ORDER BY fecha DESC LIMIT 5'
    );
    const { rows: proximos_partidos } = await db.query(
      "SELECT * FROM partidos WHERE fecha >= CURRENT_DATE ORDER BY fecha ASC LIMIT 5"
    );

    let topQuery = `
      SELECT j.nombre, j.dorsal, j.disciplina_id, d.nombre AS disciplina_nombre,
             SUM(es.goles) AS total_anotaciones, SUM(es.asistencias) AS total_asistencias
      FROM estadisticas_jugador es
      JOIN jugadores j ON es.jugador_id = j.id
      LEFT JOIN disciplinas d ON j.disciplina_id = d.id
    `;
    let topParams = [];
    if (filterSport) {
      topQuery += ' WHERE j.disciplina_id = $1';
      topParams = [filterSport];
    }
    topQuery += `
      GROUP BY es.jugador_id, j.nombre, j.dorsal, j.disciplina_id, d.nombre
      ORDER BY total_anotaciones DESC, total_asistencias DESC
      LIMIT 5
    `;
    const { rows: top_anotadores } = await db.query(topQuery, topParams);

    res.json({
      total_jugadores:      Number(r1?.total || 0),
      lesiones_activas:     Number(r2?.total || 0),
      total_partidos:       Number(r3?.total || 0),
      total_entrenamientos: Number(r4?.total || 0),
      ultimos_entrenamientos,
      proximos_partidos,
      top_anotadores,
    });
  } catch (err) {
    responderError(res, err);
  }
};
