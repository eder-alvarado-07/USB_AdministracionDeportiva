// Recordatorios automáticos (v1.7). Se generan cuando el usuario abre la app (la campanita consulta cada minuto),
// sin tareas programadas: cada recordatorio tiene una clave única y no se repite.
// Cuando el sistema esté publicado con HTTPS, estos mismos recordatorios podrán enviarse como notificación push.
const { condicionEquipos } = require('./alcance');

const horaLegible = (h) => {
  if (!h) return null;
  const [hh, mm] = h.split(':').map(Number);
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
};
const cuandoDonde = (a) => [a.hora && `a las ${horaLegible(a.hora)}`, a.lugar && `en ${a.lugar}`].filter(Boolean).join(' ');

async function crear(cliente, usuarioId, clave, aviso) {
  await cliente.query(
    `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, enlace, clave)
     VALUES ($1, $2, $3, 'recordatorio', $4, $5) ON CONFLICT (usuario_id, clave) DO NOTHING`,
    [usuarioId, aviso.titulo, aviso.mensaje, aviso.enlace || null, clave]);
}

async function generarRecordatorios(cliente, usuario) {
  if (usuario.rol === 'jugador' && usuario.jugador_id) {
    const vista = { rol: 'jugador', jugador_id: usuario.jugador_id };
    // Entrenamientos y partidos de mañana de su equipo (o generales)
    for (const [tabla, nombre] of [['entrenamientos', 'ent'], ['partidos', 'par']]) {
      const params = [];
      const cond = condicionEquipos(vista, params, 'a.equipo_id');
      const { rows } = await cliente.query(
        `SELECT a.* FROM ${tabla} a WHERE a.fecha = CURRENT_DATE + 1${cond ? ` AND ${cond}` : ''}`, params);
      for (const a of rows) {
        const titulo = tabla === 'partidos' ? `Mañana juegas: Unisimón vs. ${a.rival}` : `Mañana tienes entrenamiento: ${a.tipo}`;
        const detalle = cuandoDonde(a);
        await crear(cliente, usuario.id, `rec-${nombre}-${a.id}`, {
          titulo, mensaje: detalle ? `${detalle.charAt(0).toUpperCase()}${detalle.slice(1)}.` : 'Revisa la agenda de la semana en el inicio.',
          enlace: tabla === 'partidos' ? '/partidos' : '/entrenamientos',
        });
      }
    }
    // Convocatoria sin responder para un partido de hoy, mañana o pasado (3 horas después de publicada,
    // para no repetir el aviso de "Fuiste convocado")
    const { rows: pend } = await cliente.query(`
      SELECT p.id, p.rival FROM convocados c JOIN convocatorias v ON v.id = c.convocatoria_id JOIN partidos p ON p.id = v.partido_id
      WHERE c.jugador_id = $1 AND v.publicada AND c.confirmacion = 'pendiente' AND p.fecha BETWEEN CURRENT_DATE AND CURRENT_DATE + 2
        AND v.publicada_en <= NOW() - INTERVAL '3 hours'`,
      [usuario.jugador_id]);
    for (const p of pend) {
      await crear(cliente, usuario.id, `rec-conv-${p.id}`, {
        titulo: `Confirma tu convocatoria: Unisimón vs. ${p.rival}`,
        mensaje: 'Tu entrenador está esperando tu respuesta. Confirma o avisa si no puedes ir.', enlace: `/partidos?convocatoria=${p.id}`,
      });
    }
    // Control médico que vence en los próximos 3 días (o ya vencido)
    const { rows: [ctl] } = await cliente.query(`
      SELECT id, proxima_fecha::text AS fecha FROM controles_medicos
      WHERE jugador_id = $1 AND proxima_fecha IS NOT NULL AND proxima_fecha <= CURRENT_DATE + 3
      ORDER BY fecha DESC, id DESC LIMIT 1`, [usuario.jugador_id]);
    if (ctl) {
      await crear(cliente, usuario.id, `rec-ctl-${ctl.id}`, {
        titulo: 'Tienes pendiente un control médico',
        mensaje: `Tu próximo control médico es el ${ctl.fecha.split('-').reverse().join('/')}. Coordina la cita con el personal de salud.`, enlace: '/salud',
      });
    }
  }

  if (usuario.rol === 'entrenador' || usuario.rol === 'administrador') {
    // Partido de mañana sin convocatoria publicada, o con convocados que aún no responden 3 horas después de publicarla
    const params = [];
    const cond = condicionEquipos(usuario, params, 'p.equipo_id');
    const { rows } = await cliente.query(`
      SELECT p.id, p.rival, v.publicada, v.publicada_en <= NOW() - INTERVAL '3 hours' AS hace_rato,
             COUNT(c.id) FILTER (WHERE c.confirmacion = 'pendiente')::int AS pendientes
      FROM partidos p LEFT JOIN convocatorias v ON v.partido_id = p.id LEFT JOIN convocados c ON c.convocatoria_id = v.id
      WHERE p.fecha = CURRENT_DATE + 1${cond ? ` AND ${cond}` : ''}
      GROUP BY p.id, v.publicada, v.publicada_en`, params);
    for (const p of rows) {
      if (!p.publicada) {
        await crear(cliente, usuario.id, `rec-sinconv-${p.id}`, {
          titulo: `Mañana juegan vs. ${p.rival} y no hay convocatoria`,
          mensaje: 'Publica la convocatoria para que los deportistas confirmen.', enlace: `/partidos?convocatoria=${p.id}`,
        });
      } else if (p.hace_rato && p.pendientes > 0) {
        await crear(cliente, usuario.id, `rec-pend-${p.id}`, {
          titulo: `${p.pendientes} convocados aún no responden`,
          mensaje: `El partido contra ${p.rival} es mañana. Pídeles que confirmen en la app.`, enlace: `/partidos?convocatoria=${p.id}`,
        });
      }
    }
  }
}

module.exports = { generarRecordatorios, horaLegible };
