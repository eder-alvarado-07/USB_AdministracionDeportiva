// Convocatoria oficial de cada partido (v1.6).
// El entrenador elige titulares y suplentes entre sus deportistas y la publica; los convocados reciben un aviso
// y confirman hasta el día del partido. Cada acción queda en convocatoria_historial (registro digital).
const db = require('../config/db');
const { responderError } = require('../utils/errores');
const { condicionAlcance } = require('../utils/alcance');
const { notificarDeportistas, notificarUsuarios } = require('../utils/notificar');
const { buscar } = require('../utils/agenda');

const CUERPO_TECNICO = ['administrador', 'entrenador', 'head_coach'];
const ROLES_CONVOCADO = ['titular', 'suplente'];

const fechaLegible = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const enlacePartido = (partidoId) => `/partidos?convocatoria=${partidoId}`;

// El partido, solo si el usuario puede verlo (v1.7: partidos por equipo)
async function cargarPartido(cliente, id, usuario) {
  const p = await buscar('partidos', usuario, id, cliente);
  if (!p) return null;
  const f = p.fecha instanceof Date ? p.fecha : new Date(p.fecha);
  const fecha = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  return { id: p.id, fecha, rival: p.rival, tipo: p.tipo, hora: p.hora, lugar: p.lugar };
}

// Convocatoria completa de un partido, adaptada a quien la pide
async function armarRespuesta(cliente, partido, usuario) {
  const { rows: [conv] } = await cliente.query('SELECT * FROM convocatorias WHERE partido_id = $1', [partido.id]);
  const esTecnico = CUERPO_TECNICO.includes(usuario.rol);
  if (!conv) return { partido, convocatoria: null };
  if (!conv.publicada && !esTecnico) return { partido, convocatoria: null };

  const { rows: lista } = await cliente.query(`
    SELECT c.jugador_id, c.rol, c.confirmacion, c.respondido_en, c.motivo,
           j.nombre, j.dorsal, j.posicion, j.entrenador_id
    FROM convocados c JOIN jugadores j ON j.id = c.jugador_id
    WHERE c.convocatoria_id = $1
    ORDER BY c.rol = 'suplente', j.dorsal NULLS LAST, j.nombre`, [conv.id]);

  const convocados = lista.map(c => ({
    jugador_id: c.jugador_id, nombre: c.nombre, dorsal: c.dorsal, posicion: c.posicion, rol: c.rol,
    // Las respuestas de cada uno solo las ve el cuerpo técnico; el deportista ve la suya en `mia`
    ...(esTecnico ? { confirmacion: c.confirmacion, respondido_en: c.respondido_en, motivo: c.motivo } : {}),
  }));
  const propia = usuario.rol === 'jugador' ? lista.find(c => c.jugador_id === usuario.jugador_id) : null;

  return {
    partido,
    convocatoria: {
      id: conv.id, publicada: conv.publicada, publicada_en: conv.publicada_en,
      hora_presentacion: conv.hora_presentacion, lugar: conv.lugar, notas: conv.notas,
      actualizada_en: conv.actualizada_en,
      se_puede_responder: partido.fecha >= hoyISO(),
      convocados,
      resumen: esTecnico ? {
        total: lista.length,
        titulares: lista.filter(c => c.rol === 'titular').length,
        suplentes: lista.filter(c => c.rol === 'suplente').length,
        confirmados: lista.filter(c => c.confirmacion === 'confirmado').length,
        no_pueden: lista.filter(c => c.confirmacion === 'no_puede').length,
        pendientes: lista.filter(c => c.confirmacion === 'pendiente').length,
      } : null,
      mia: propia ? { rol: propia.rol, confirmacion: propia.confirmacion, respondido_en: propia.respondido_en, motivo: propia.motivo } : null,
    },
  };
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// GET /api/convocatorias/partido/:id
exports.ver = async (req, res) => {
  try {
    const partido = await cargarPartido(db, req.params.id, req.usuario);
    if (!partido) return res.status(404).json({ error: 'Partido no encontrado' });
    res.json(await armarRespuesta(db, partido, req.usuario));
  } catch (err) { responderError(res, err); }
};

// PUT /api/convocatorias/partido/:id   { hora_presentacion, lugar, notas, convocados: [{ jugador_id, rol }], publicar }
exports.guardar = async (req, res) => {
  const cuerpo = req.body || {};
  const { convocados = [], publicar = false } = cuerpo;
  // Hora, lugar y notas solo cambian si vienen en la petición (otro entrenador que guarda no los borra)
  const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const hora_presentacion = 'hora_presentacion' in cuerpo ? texto(cuerpo.hora_presentacion) : undefined;
  const lugar = 'lugar' in cuerpo ? texto(cuerpo.lugar) : undefined;
  const notas = 'notas' in cuerpo ? texto(cuerpo.notas) : undefined;
  if (!Array.isArray(convocados)) return res.status(400).json({ error: 'La lista de convocados no es válida.' });
  const nuevos = new Map();
  for (const c of convocados) {
    const id = Number(c?.jugador_id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Hay un deportista no válido en la convocatoria.' });
    if (!ROLES_CONVOCADO.includes(c.rol)) return res.status(400).json({ error: 'Cada convocado debe ser titular o suplente.' });
    if (nuevos.has(id)) return res.status(400).json({ error: 'Un deportista aparece dos veces en la convocatoria.' });
    nuevos.set(id, c.rol);
  }
  if (hora_presentacion && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora_presentacion)) {
    return res.status(400).json({ error: 'La hora de presentación debe tener el formato HH:MM.' });
  }

  const cliente = await db.connect();
  try {
    await cliente.query('BEGIN');
    const partido = await cargarPartido(cliente, req.params.id, req.usuario);
    if (!partido) { await cliente.query('ROLLBACK'); return res.status(404).json({ error: 'Partido no encontrado' }); }

    // El entrenador solo convoca y retira a sus propios deportistas
    const pAlc = [];
    const alcance = condicionAlcance(req.usuario, pAlc);
    if (alcance && nuevos.size) {
      pAlc.push([...nuevos.keys()]);
      const { rows } = await cliente.query(`SELECT j.id FROM jugadores j WHERE ${alcance} AND j.id = ANY($${pAlc.length}::int[])`, pAlc);
      if (rows.length !== nuevos.size) {
        await cliente.query('ROLLBACK');
        return res.status(403).json({ error: 'Solo puedes convocar a deportistas de tu plantel.' });
      }
    }

    // Crear o actualizar la convocatoria
    const { rows: [previa] } = await cliente.query('SELECT * FROM convocatorias WHERE partido_id = $1 FOR UPDATE', [partido.id]);
    let conv = previa;
    const final = {
      hora: hora_presentacion !== undefined ? hora_presentacion : (previa?.hora_presentacion ?? null),
      lugar: lugar !== undefined ? lugar : (previa?.lugar ?? null),
      notas: notas !== undefined ? notas : (previa?.notas ?? null),
    };
    if (!conv) {
      ({ rows: [conv] } = await cliente.query(
        `INSERT INTO convocatorias (partido_id, hora_presentacion, lugar, notas, creada_por)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [partido.id, final.hora, final.lugar, final.notas, req.usuario.id]));
    } else {
      await cliente.query(
        'UPDATE convocatorias SET hora_presentacion = $1, lugar = $2, notas = $3, actualizada_en = NOW() WHERE id = $4',
        [final.hora, final.lugar, final.notas, conv.id]);
    }

    // Diferencias con lo que había, solo sobre los deportistas que este usuario administra
    const pEx = [conv.id];
    const alcEx = condicionAlcance(req.usuario, pEx);
    const { rows: existentes } = await cliente.query(`
      SELECT c.jugador_id, c.rol, j.nombre FROM convocados c JOIN jugadores j ON j.id = c.jugador_id
      WHERE c.convocatoria_id = $1${alcEx ? ` AND ${alcEx}` : ''}`, pEx);
    const antes = new Map(existentes.map(e => [e.jugador_id, e]));
    const agregados = [...nuevos.keys()].filter(id => !antes.has(id));
    const retirados = [...antes.keys()].filter(id => !nuevos.has(id));
    const cambiados = [...nuevos.entries()].filter(([id, rol]) => antes.has(id) && antes.get(id).rol !== rol).map(([id]) => id);

    const registrar = (accion, jugadorId = null, detalle = null) => cliente.query(
      'INSERT INTO convocatoria_historial (convocatoria_id, usuario_id, jugador_id, accion, detalle) VALUES ($1, $2, $3, $4, $5)',
      [conv.id, req.usuario.id, jugadorId, accion, detalle]);

    if (retirados.length) await cliente.query('DELETE FROM convocados WHERE convocatoria_id = $1 AND jugador_id = ANY($2::int[])', [conv.id, retirados]);
    for (const id of agregados) {
      await cliente.query('INSERT INTO convocados (convocatoria_id, jugador_id, rol) VALUES ($1, $2, $3)', [conv.id, id, nuevos.get(id)]);
      await registrar('agregado', id, nuevos.get(id));
    }
    for (const id of retirados) await registrar('retirado', id, antes.get(id).rol);
    for (const id of cambiados) {
      await cliente.query('UPDATE convocados SET rol = $1 WHERE convocatoria_id = $2 AND jugador_id = $3', [nuevos.get(id), conv.id, id]);
      await registrar('cambio_rol', id, `${antes.get(id).rol} → ${nuevos.get(id)}`);
    }
    const cambioLogistica = previa && (previa.hora_presentacion !== final.hora || previa.lugar !== final.lugar);
    if (cambioLogistica) await registrar('editada', null, `Presentación: ${final.hora || 'sin hora'} · ${final.lugar || 'sin lugar'}`);

    // Publicación y avisos
    const recienPublicada = publicar && !conv.publicada;
    if (recienPublicada) {
      await cliente.query('UPDATE convocatorias SET publicada = true, publicada_en = NOW() WHERE id = $1', [conv.id]);
      await registrar('publicada', null, `${nuevos.size} convocados`);
    }
    const publicadaAhora = conv.publicada || recienPublicada;
    const titulo = `Unisimón vs. ${partido.rival}`;
    const cuando = `${fechaLegible(partido.fecha)}${final.hora ? `, preséntate a las ${final.hora}` : ''}${final.lugar ? ` en ${final.lugar}` : ''}`;
    const enlace = enlacePartido(partido.id);
    if (publicadaAhora) {
      const { rows: todos } = await cliente.query('SELECT jugador_id, rol FROM convocados WHERE convocatoria_id = $1', [conv.id]);
      const aConvocar = recienPublicada ? todos : todos.filter(t => agregados.includes(t.jugador_id));
      for (const rol of ROLES_CONVOCADO) {
        const ids = aConvocar.filter(t => t.rol === rol).map(t => t.jugador_id);
        await notificarDeportistas(cliente, ids, {
          titulo: `Fuiste convocado: ${titulo}`, tipo: 'convocatoria', enlace,
          mensaje: `Estás convocado como ${rol} para el ${cuando}. Confirma tu asistencia en la app.`,
        });
      }
      if (!recienPublicada) {
        await notificarDeportistas(cliente, retirados, {
          titulo: `Cambio en la convocatoria: ${titulo}`, tipo: 'convocatoria', enlace,
          mensaje: 'Ya no estás en la convocatoria de este partido.',
        });
        for (const id of cambiados) {
          await notificarDeportistas(cliente, [id], {
            titulo: `Cambio en la convocatoria: ${titulo}`, tipo: 'convocatoria', enlace,
            mensaje: `Ahora estás convocado como ${nuevos.get(id)}.`,
          });
        }
        if (cambioLogistica) {
          const siguen = todos.map(t => t.jugador_id).filter(id => !agregados.includes(id));
          await notificarDeportistas(cliente, siguen, {
            titulo: `Cambio en la convocatoria: ${titulo}`, tipo: 'convocatoria', enlace,
            mensaje: `Nueva presentación: ${cuando}.`,
          });
        }
      }
    }

    await cliente.query('COMMIT');
    res.json(await armarRespuesta(db, partido, req.usuario));
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    responderError(res, err);
  } finally {
    cliente.release();
  }
};

// POST /api/convocatorias/partido/:id/respuesta   { respuesta: 'confirmado' | 'no_puede', motivo }
exports.responder = async (req, res) => {
  const { respuesta, motivo = null } = req.body || {};
  if (req.usuario.rol !== 'jugador') return res.status(403).json({ error: 'Solo el deportista convocado puede responder.' });
  if (!['confirmado', 'no_puede'].includes(respuesta)) return res.status(400).json({ error: 'La respuesta debe ser "confirmado" o "no_puede".' });

  const cliente = await db.connect();
  try {
    await cliente.query('BEGIN');
    const partido = await cargarPartido(cliente, req.params.id, req.usuario);
    const { rows: [fila] } = partido ? await cliente.query(`
      SELECT c.id, c.confirmacion, v.id AS convocatoria_id, v.creada_por, j.nombre
      FROM convocatorias v JOIN convocados c ON c.convocatoria_id = v.id JOIN jugadores j ON j.id = c.jugador_id
      WHERE v.partido_id = $1 AND v.publicada AND c.jugador_id = $2`, [partido.id, req.usuario.jugador_id || 0]) : { rows: [] };
    if (!fila) { await cliente.query('ROLLBACK'); return res.status(404).json({ error: 'No estás convocado para este partido.' }); }
    if (partido.fecha < hoyISO()) { await cliente.query('ROLLBACK'); return res.status(400).json({ error: 'El partido ya pasó; ya no se puede responder la convocatoria.' }); }

    await cliente.query(
      'UPDATE convocados SET confirmacion = $1, respondido_en = NOW(), motivo = $2 WHERE id = $3',
      [respuesta, respuesta === 'no_puede' ? (motivo || null) : null, fila.id]);
    await cliente.query(
      'INSERT INTO convocatoria_historial (convocatoria_id, usuario_id, jugador_id, accion, detalle) VALUES ($1, $2, $3, $4, $5)',
      [fila.convocatoria_id, req.usuario.id, req.usuario.jugador_id, respuesta === 'confirmado' ? 'confirmo' : 'no_puede', motivo || null]);
    // El entrenador se entera de inmediato cuando alguien no puede ir
    if (respuesta === 'no_puede') {
      await notificarUsuarios(cliente, [fila.creada_por], {
        titulo: `${fila.nombre} no puede ir: Unisimón vs. ${partido.rival}`, tipo: 'convocatoria', enlace: enlacePartido(partido.id),
        mensaje: motivo ? `Motivo: ${motivo}` : 'No indicó un motivo.',
      });
    }
    await cliente.query('COMMIT');
    res.json(await armarRespuesta(db, partido, req.usuario));
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    responderError(res, err);
  } finally {
    cliente.release();
  }
};

// GET /api/convocatorias/partido/:id/historial   (cuerpo técnico)
exports.historial = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT h.accion, h.detalle, h.creado_en, u.nombre AS usuario, j.nombre AS jugador, j.dorsal
      FROM convocatoria_historial h
      JOIN convocatorias v ON v.id = h.convocatoria_id
      LEFT JOIN usuarios u ON u.id = h.usuario_id
      LEFT JOIN jugadores j ON j.id = h.jugador_id
      WHERE v.partido_id = $1
      ORDER BY h.creado_en DESC, h.id DESC`, [req.params.id]);
    res.json(rows);
  } catch (err) { responderError(res, err); }
};
