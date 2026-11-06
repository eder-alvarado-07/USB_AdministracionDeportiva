// Frena los intentos de adivinar contraseñas: tras 5 fallos seguidos para la misma cuenta
// desde la misma dirección, el inicio de sesión queda bloqueado 15 minutos (responde 429).
// Se guarda en memoria: se reinicia con el servidor y no se comparte entre instancias.
const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const fallos = new Map(); // clave → { cantidad, desde }

const claveDe = (req) => `${req.ip}|${String((req.body && req.body.email) || '').trim().toLowerCase()}`;

function vigente(clave) {
  const r = fallos.get(clave);
  if (r && Date.now() - r.desde > VENTANA_MS) { fallos.delete(clave); return null; }
  return r;
}

exports.limitarLogin = (req, res, next) => {
  const r = vigente(claveDe(req));
  if (r && r.cantidad >= MAX_FALLOS) {
    const segundos = Math.ceil((r.desde + VENTANA_MS - Date.now()) / 1000);
    res.set('Retry-After', String(segundos));
    return res.status(429).json({ error: `Demasiados intentos fallidos. Espera ${Math.ceil(segundos / 60)} minutos e intenta de nuevo.` });
  }
  next();
};

exports.registrarFallo = (req) => {
  const clave = claveDe(req);
  const r = vigente(clave) || { cantidad: 0, desde: Date.now() };
  r.cantidad += 1;
  fallos.set(clave, r);
  // Evita que el mapa crezca sin límite con correos inventados
  if (fallos.size > 10000) for (const k of fallos.keys()) { if (!vigente(k)) fallos.delete(k); }
};

exports.limpiarFallos = (req) => fallos.delete(claveDe(req));
