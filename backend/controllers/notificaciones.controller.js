// Avisos dentro de la app para cualquier rol (campanita de la cabecera). v1.6.
const db = require('../config/db');
const { responderError } = require('../utils/errores');
const { generarRecordatorios } = require('../utils/recordatorios');

// GET /api/notificaciones → los últimos 50 avisos del usuario y cuántos no ha leído
exports.listar = async (req, res) => {
  try {
    // Recordatorios automáticos (v1.7): se crean al consultar, sin duplicarse; si fallan, los avisos igual se muestran
    await generarRecordatorios(db, req.usuario).catch(err => console.error('[recordatorios]', err.message));
    const { rows } = await db.query(
      `SELECT id, titulo, mensaje, tipo, enlace, leida, created_at FROM notificaciones
       WHERE usuario_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50`, [req.usuario.id]);
    const { rows: [c] } = await db.query('SELECT COUNT(*)::int AS n FROM notificaciones WHERE usuario_id = $1 AND NOT leida', [req.usuario.id]);
    res.json({ avisos: rows, sin_leer: c.n });
  } catch (err) { responderError(res, err); }
};

// PATCH /api/notificaciones/:id/leida
exports.marcarLeida = async (req, res) => {
  try {
    const { rowCount } = await db.query('UPDATE notificaciones SET leida = true WHERE id = $1 AND usuario_id = $2', [req.params.id, req.usuario.id]);
    if (!rowCount) return res.status(404).json({ error: 'Aviso no encontrado' });
    res.json({ ok: true });
  } catch (err) { responderError(res, err); }
};

// PATCH /api/notificaciones/leidas → marca todos como leídos
exports.marcarTodas = async (req, res) => {
  try {
    await db.query('UPDATE notificaciones SET leida = true WHERE usuario_id = $1 AND NOT leida', [req.usuario.id]);
    res.json({ ok: true });
  } catch (err) { responderError(res, err); }
};
