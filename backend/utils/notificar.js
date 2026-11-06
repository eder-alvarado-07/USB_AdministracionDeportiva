// Crea avisos dentro de la app (campanita de la cabecera). v1.6.
// Se llama con el cliente de una transacción para que el aviso y el cambio que lo origina queden juntos.

// A usuarios concretos
async function notificarUsuarios(cliente, usuarioIds, { titulo, mensaje, tipo = 'general', enlace = null }) {
  const ids = [...new Set(usuarioIds.filter(Boolean))];
  for (const id of ids) {
    await cliente.query(
      'INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, enlace) VALUES ($1, $2, $3, $4, $5)',
      [id, titulo, mensaje, tipo, enlace]
    );
  }
  return ids.length;
}

// A los deportistas que tienen cuenta (usuarios.jugador_id); los que no tienen cuenta no reciben aviso
async function notificarDeportistas(cliente, jugadorIds, aviso) {
  if (!jugadorIds.length) return 0;
  const { rows } = await cliente.query(
    'SELECT id FROM usuarios WHERE jugador_id = ANY($1::int[]) AND activo = true', [jugadorIds]);
  return notificarUsuarios(cliente, rows.map(r => r.id), aviso);
}

module.exports = { notificarUsuarios, notificarDeportistas };
