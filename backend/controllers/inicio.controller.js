const db = require('../config/db');

const { responderError } = require('../utils/errores');
const { condicionEquipos } = require('../utils/alcance');
// Restringe los jugadores visibles según el rol (mismas reglas que /api/jugadores)
// y el deporte elegido. Devuelve condiciones SQL sobre el alias `j`.
function alcanceJugadores(usuario, disciplinaId, params) {
  const cond = [];
  if (usuario.rol === 'jugador') {
    params.push(usuario.jugador_id || 0);
    cond.push(`j.id = $${params.length}`);
  } else if (usuario.rol === 'entrenador') {
    params.push(usuario.id);
    cond.push(`j.entrenador_id = $${params.length}`);
  } else if (usuario.rol === 'head_coach') {
    params.push(usuario.id);
    cond.push(`j.entrenador_id IN (SELECT id FROM usuarios WHERE head_coach_id = $${params.length})`);
  }
  if (disciplinaId) {
    params.push(disciplinaId);
    cond.push(`j.disciplina_id = $${params.length}`);
  }
  return cond.length ? cond.join(' AND ') : 'TRUE';
}

function estadoDe(fila) {
  if (fila.lesion_id) return 'no_disponible';
  if (fila.aptitud === 'no_apto_temporal') return 'no_disponible';
  if (fila.aptitud === 'apto_restricciones') return 'restringido';
  return 'disponible';
}

// GET /api/dashboard/inicio?disciplina_id=&jugador_id=
// Todo lo que muestra la pantalla de inicio en una sola llamada.
// Con jugador_id, el personal (no los deportistas) obtiene el inicio tal como lo ve ese deportista,
// solo si está dentro de su alcance; los permisos de salud siguen siendo los de quien consulta.
exports.getInicio = async (req, res) => {
  const usuario = req.usuario;
  let disciplinaId = req.query.disciplina_id && req.query.disciplina_id !== 'todos'
    ? parseInt(req.query.disciplina_id, 10) || null
    : null;
  const veSalud = ['administrador', 'personal_salud', 'jugador'].includes(usuario.rol);

  try {
    // Alcance de los datos: el propio usuario o, en la vista de un deportista, solo ese deportista
    let vista = usuario;
    if (req.query.jugador_id !== undefined && usuario.rol !== 'jugador') {
      const id = Number(req.query.jugador_id);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'El deportista indicado no es válido.' });
      const p0 = [];
      const cond = alcanceJugadores(usuario, null, p0);
      p0.push(id);
      const { rows } = await db.query(`SELECT j.id FROM jugadores j WHERE ${cond} AND j.id = $${p0.length}`, p0);
      if (!rows.length) return res.status(404).json({ error: 'Deportista no encontrado o fuera de tu alcance.' });
      vista = { rol: 'jugador', jugador_id: id };
      disciplinaId = null;
    }

    // 1. Plantel con su estado
    const p1 = [];
    const { rows: plantelFilas } = await db.query(`
      SELECT j.id, j.nombre, j.dorsal, j.posicion, j.foto_url,
             les.id AS lesion_id, les.tipo AS lesion_tipo, les.fecha_inicio::text AS lesion_inicio,
             (CURRENT_DATE - les.fecha_inicio) AS dias_lesion,
             seg.fecha_retorno_estimada::text AS retorno_estimado,
             ctl.aptitud, ctl.restricciones, ctl.proxima_fecha::text AS proximo_control,
             (ctl.proxima_fecha < CURRENT_DATE) AS control_vencido
      FROM jugadores j
      LEFT JOIN LATERAL (
        SELECT l.id, l.tipo, l.fecha_inicio FROM lesiones l
        WHERE l.jugador_id = j.id AND l.fecha_inicio <= CURRENT_DATE
          AND (l.fecha_fin IS NULL OR l.fecha_fin >= CURRENT_DATE)
        ORDER BY l.fecha_inicio DESC, l.id DESC LIMIT 1
      ) les ON TRUE
      LEFT JOIN LATERAL (
        SELECT s.fecha_retorno_estimada FROM seguimiento_lesiones s
        WHERE s.lesion_id = les.id ORDER BY s.fecha_seguimiento DESC, s.id DESC LIMIT 1
      ) seg ON TRUE
      LEFT JOIN LATERAL (
        SELECT c.aptitud, c.restricciones, c.proxima_fecha FROM controles_medicos c
        WHERE c.jugador_id = j.id ORDER BY c.fecha DESC, c.id DESC LIMIT 1
      ) ctl ON TRUE
      WHERE ${alcanceJugadores(vista, disciplinaId, p1)}
      ORDER BY j.dorsal NULLS LAST, j.nombre`, p1);

    const plantel = plantelFilas.map(f => ({
      id: f.id, nombre: f.nombre, dorsal: f.dorsal, posicion: f.posicion, foto_url: f.foto_url,
      estado: estadoDe(f),
      motivo: f.lesion_id ? `Lesión: ${f.lesion_tipo || 'sin tipo registrado'}`
        : f.aptitud === 'no_apto_temporal' ? 'No apto temporalmente'
        : f.aptitud === 'apto_restricciones' ? (f.restricciones || 'Apto con restricciones') : null,
    }));
    const resumen = {
      total: plantel.length,
      disponibles: plantel.filter(j => j.estado === 'disponible').length,
      restringidos: plantel.filter(j => j.estado === 'restringido').length,
      no_disponibles: plantel.filter(j => j.estado === 'no_disponible').length,
    };

    // 2. Para revisar
    const revisar = [];
    for (const f of plantelFilas) {
      if (f.lesion_id) {
        revisar.push({
          tipo: 'lesion', jugador_id: f.id, nombre: f.nombre, dorsal: f.dorsal,
          dias: Number(f.dias_lesion), lesion: f.lesion_tipo, retorno_estimado: f.retorno_estimado,
        });
      } else if (f.aptitud === 'apto_restricciones') {
        revisar.push({ tipo: 'restriccion', jugador_id: f.id, nombre: f.nombre, dorsal: f.dorsal, restricciones: f.restricciones });
      } else if (f.aptitud === 'no_apto_temporal') {
        revisar.push({ tipo: 'no_apto', jugador_id: f.id, nombre: f.nombre, dorsal: f.dorsal });
      }
      if (veSalud && f.control_vencido) {
        revisar.push({ tipo: 'control_vencido', jugador_id: f.id, nombre: f.nombre, dorsal: f.dorsal, fecha: f.proximo_control });
      }
    }
    if (vista === usuario && ['administrador', 'personal_salud'].includes(usuario.rol) && plantel.length) {
      const p2 = [];
      const { rows: [sinAntro] } = await db.query(`
        SELECT COUNT(*)::int AS total FROM jugadores j
        WHERE ${alcanceJugadores(vista, disciplinaId, p2)}
          AND NOT EXISTS (
            SELECT 1 FROM antropometria a WHERE a.jugador_id = j.id
              AND a.fecha >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                       CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN 1 ELSE 7 END, 1)
          )`, p2);
      if (sinAntro.total > 0) revisar.push({ tipo: 'antropometria', total: sinAntro.total });
    }

    // 3. Próximo partido y agenda de los próximos 7 días (v1.7: solo las actividades generales y las de su equipo)
    const agenda = (alias) => { const pa = []; const c = condicionEquipos(vista, pa, `${alias}.equipo_id`); return { pa, c: c ? ` AND ${c}` : '' }; };
    const q1 = agenda('p');
    const { rows: [proximo] } = await db.query(
      `SELECT p.id, p.fecha::text AS fecha, p.rival, p.tipo, p.resultado, p.hora, p.lugar, eq.nombre AS equipo_nombre,
              d.nombre AS disciplina_nombre FROM partidos p
       LEFT JOIN equipos eq ON eq.id = p.equipo_id LEFT JOIN disciplinas d ON d.id = eq.disciplina_id
       WHERE p.fecha >= CURRENT_DATE${q1.c} ORDER BY p.fecha ASC, p.hora NULLS LAST, p.id ASC LIMIT 1`, q1.pa);
    const q2 = agenda('p');
    const { rows: partidos } = await db.query(
      `SELECT p.id, p.fecha::text AS fecha, p.rival, p.tipo, p.hora, p.lugar FROM partidos p
       WHERE p.fecha BETWEEN CURRENT_DATE AND CURRENT_DATE + 6${q2.c} ORDER BY p.fecha, p.hora NULLS LAST, p.id`, q2.pa);
    const q3 = agenda('e');
    const { rows: entrenos } = await db.query(
      `SELECT e.id, e.fecha::text AS fecha, e.tipo, e.descripcion, e.hora, e.lugar FROM entrenamientos e
       WHERE e.fecha BETWEEN CURRENT_DATE AND CURRENT_DATE + 6${q3.c} ORDER BY e.fecha, e.hora NULLS LAST, e.id`, q3.pa);
    const cuandoDonde = (a) => [a.lugar, a.hora].filter(Boolean).join(' · ') || null;
    const semana = [
      ...partidos.map(p => ({ clase: 'partido', id: p.id, fecha: p.fecha, hora: p.hora, lugar: p.lugar, titulo: `Unisimón vs. ${p.rival}`, etiqueta: ({ liga: 'Liga', amistoso: 'Amistoso', torneo: 'Torneo', competencia: 'Competencia' })[p.tipo] || p.tipo, detalle: cuandoDonde(p) })),
      ...entrenos.map(e => ({ clase: 'entrenamiento', id: e.id, fecha: e.fecha, hora: e.hora, lugar: e.lugar, titulo: e.tipo, detalle: cuandoDonde(e) || e.descripcion })),
    ].sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora || '99').localeCompare(b.hora || '99') || (a.clase === 'partido' ? -1 : 1));

    // 4. Asistencia de las últimas 4 sesiones (solo jugadores del alcance)
    const p3 = [];
    const alcance3 = alcanceJugadores(vista, disciplinaId, p3);
    const { rows: asistencia } = await db.query(`
      SELECT e.id, e.fecha::text AS fecha, e.tipo,
             COUNT(ae.id) FILTER (WHERE ae.asistencia)::int AS presentes,
             COUNT(ae.id)::int AS registrados
      FROM entrenamientos e
      LEFT JOIN asistencia_entrenamiento ae ON ae.entrenamiento_id = e.id
        AND ae.jugador_id IN (SELECT j.id FROM jugadores j WHERE ${alcance3})
      WHERE e.fecha <= CURRENT_DATE${(() => { const c = condicionEquipos(vista, p3, 'e.equipo_id'); return c ? ` AND ${c}` : ''; })()}
      GROUP BY e.id ORDER BY e.fecha DESC, e.id DESC LIMIT 4`, p3);

    // 5. Máximos anotadores
    const p4 = [];
    const { rows: anotadores } = await db.query(`
      SELECT j.id, j.nombre, j.dorsal,
             COALESCE(SUM(es.goles), 0)::int AS anotaciones,
             COALESCE(SUM(es.asistencias), 0)::int AS asistencias
      FROM estadisticas_jugador es JOIN jugadores j ON j.id = es.jugador_id
      WHERE ${alcanceJugadores(vista, disciplinaId, p4)}
      GROUP BY j.id, j.nombre, j.dorsal
      HAVING COALESCE(SUM(es.goles), 0) + COALESCE(SUM(es.asistencias), 0) > 0
      ORDER BY anotaciones DESC, asistencias DESC, j.nombre LIMIT 5`, p4);

    // 6. Convocatoria (v1.6)
    let convocatoria = null;
    if (vista.rol === 'jugador') {
      const { rows: [mia] } = await db.query(`
        SELECT p.id AS partido_id, p.fecha::text AS fecha, p.rival, p.tipo, v.hora_presentacion, v.lugar,
               c.rol, c.confirmacion, c.motivo
        FROM convocados c JOIN convocatorias v ON v.id = c.convocatoria_id JOIN partidos p ON p.id = v.partido_id
        WHERE c.jugador_id = $1 AND v.publicada AND p.fecha >= CURRENT_DATE
        ORDER BY p.fecha ASC LIMIT 1`, [vista.jugador_id || 0]);
      convocatoria = mia || null;
    } else if (proximo) {
      const { rows: [r] } = await db.query(`
        SELECT v.publicada, COUNT(c.id)::int AS total,
               COUNT(c.id) FILTER (WHERE c.confirmacion = 'confirmado')::int AS confirmados,
               COUNT(c.id) FILTER (WHERE c.confirmacion = 'no_puede')::int AS no_pueden,
               COUNT(c.id) FILTER (WHERE c.confirmacion = 'pendiente')::int AS pendientes
        FROM convocatorias v LEFT JOIN convocados c ON c.convocatoria_id = v.id
        WHERE v.partido_id = $1 GROUP BY v.id`, [proximo.id]);
      convocatoria = r ? { partido_id: proximo.id, ...r } : { partido_id: proximo.id, publicada: false, total: 0 };
    }

    // 7. Reconocimientos (v1.7): sobrios y calculados con los datos que ya existen (las tres consultas en paralelo)
    const esDeportista = vista.rol === 'jugador';
    const asistenciaPerfecta = async () => {
      const pR = [];
      const alcR = alcanceJugadores(vista, disciplinaId, pR);
      const { rows: perfectos } = await db.query(`
        SELECT j.id, j.nombre, j.dorsal, COUNT(*)::int AS sesiones
        FROM asistencia_entrenamiento ae
        JOIN entrenamientos e ON e.id = ae.entrenamiento_id
        JOIN jugadores j ON j.id = ae.jugador_id
        WHERE ${alcR} AND e.fecha >= date_trunc('month', CURRENT_DATE) AND e.fecha <= CURRENT_DATE
        GROUP BY j.id, j.nombre, j.dorsal
        HAVING COUNT(*) >= 3 AND BOOL_AND(ae.asistencia)
        ORDER BY j.dorsal NULLS LAST, j.nombre`, pR);
      return perfectos.length
        ? { tipo: 'asistencia', titulo: 'Asistencia perfecta del mes', icono: 'fa-calendar-check', total: perfectos.length, jugadores: perfectos.slice(0, 8) }
        : null;
    };
    // Líderes de la temporada: para el deportista se comparan contra su equipo y solo se muestran si es él
    const lider = async (columna, titulo, icono, unidad) => {
      const pL = [];
      let alcL;
      if (esDeportista) {
        pL.push(vista.jugador_id || 0);
        alcL = `j.equipo_id = (SELECT equipo_id FROM jugadores WHERE id = $${pL.length})`;
      } else {
        alcL = alcanceJugadores(vista, disciplinaId, pL);
      }
      const { rows: [l] } = await db.query(`
        SELECT j.id, j.nombre, j.dorsal, SUM(es.${columna})::int AS total
        FROM estadisticas_jugador es
        JOIN jugadores j ON j.id = es.jugador_id
        LEFT JOIN partidos p ON p.id = es.partido_id
        WHERE ${alcL} AND COALESCE(p.fecha, es.created_at::date) >= date_trunc('year', CURRENT_DATE)
        GROUP BY j.id, j.nombre, j.dorsal
        HAVING SUM(es.${columna}) > 0
        ORDER BY total DESC, j.nombre LIMIT 1`, pL);
      return l && (!esDeportista || l.id === vista.jugador_id)
        ? { tipo: columna, titulo, icono, total: 1, jugadores: [l], detalle: `${l.total} ${unidad}` }
        : null;
    };
    const reconocimientos = (await Promise.all([
      asistenciaPerfecta(),
      lider('goles', 'Máximo anotador de la temporada', 'fa-medal', 'goles o puntos'),
      lider('asistencias', 'Máximo asistidor de la temporada', 'fa-handshake', 'asistencias'),
    ])).filter(Boolean);

    // Las estadísticas deportivas no son del campo del personal de salud (v1.9)
    const esSalud = vista.rol === 'personal_salud';
    res.json({ proximo_partido: proximo || null, plantel, resumen, revisar, semana, asistencia,
      anotadores: esSalud ? [] : anotadores, convocatoria, reconocimientos: esSalud ? [] : reconocimientos });
  } catch (err) {
    responderError(res, err);
  }
};
