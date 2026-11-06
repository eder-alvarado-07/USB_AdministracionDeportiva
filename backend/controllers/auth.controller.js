const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/secretos');
const { hashClave, verificarClave, simularVerificacion } = require('../utils/claves');
const { responderError } = require('../utils/errores');
const { registrarFallo, limpiarFallos } = require('../middleware/limite');

function generarTokens(usuario) {
  const payload = { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre, jugador_id: usuario.jugador_id || null };
  const access  = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  const refresh = jwt.sign({ id: usuario.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { access, refresh };
}

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Usuario / Email y contraseña requeridos' });
  if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Usuario y contraseña deben ser texto' });

  try {
    const rawInput = email.trim();
    const term = rawInput.toLowerCase();
    const termClean = term.replace(/[\s_.-]+/g, '');
    const defaultEmail = term.includes('@') ? term : `${term.replace(/\s+/g, '_')}@dtdeportivo.com`;

    const { rows } = await db.query(
      `SELECT * FROM usuarios 
       WHERE (
         LOWER(email) = $1
         OR LOWER(email) = $2
         OR LOWER(nombre) = $1
         OR REGEXP_REPLACE(LOWER(email), '[\\s_.-]+', '', 'g') = $3
         OR REGEXP_REPLACE(LOWER(nombre), '[\\s_.-]+', '', 'g') = $3
       ) AND activo = true`,
      [term, defaultEmail, termClean]
    );
    if (!rows.length) {
      await simularVerificacion(password);
      registrarFallo(req);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = rows[0];
    const { valida, rehacer } = await verificarClave(password, usuario);
    if (!valida) {
      registrarFallo(req);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    limpiarFallos(req);
    // Migración transparente de hashes antiguos (HMAC-SHA256) a scrypt
    if (rehacer) {
      const nuevo = await hashClave(password);
      await db.query('UPDATE usuarios SET password_hash=$1, salt=$2 WHERE id=$3', [nuevo.password_hash, nuevo.salt, usuario.id]);
    }

    const { access, refresh } = generarTokens(usuario);

    res.json({
      access_token:  access,
      refresh_token: refresh,
      usuario: {
        id:          usuario.id,
        nombre:      usuario.nombre,
        email:       usuario.email,
        rol:         usuario.rol,
        jugador_id:  usuario.jugador_id,
        primer_login: usuario.primer_login,
      },
    });
  } catch (err) {
    responderError(res, err);
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token requerido' });
  try {
    const decoded = jwt.verify(refresh_token, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
    const { rows } = await db.query('SELECT * FROM usuarios WHERE id = $1 AND activo = true', [decoded.id]);
    if (!rows.length) return res.status(401).json({ error: 'Usuario no encontrado' });
    const { access, refresh } = generarTokens(rows[0]);
    res.json({ access_token: access, refresh_token: refresh });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nombre, email, rol, jugador_id, primer_login, created_at FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    responderError(res, err);
  }
};

// PUT /api/auth/cambiar-password
exports.cambiarPassword = async (req, res) => {
  const { password_actual, password_nuevo } = req.body;
  if (!password_actual || !password_nuevo) return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
  if (password_nuevo.length < 6) return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 6 caracteres' });

  try {
    const { rows } = await db.query('SELECT * FROM usuarios WHERE id = $1', [req.usuario.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const usuario = rows[0];
    if (!(await verificarClave(password_actual, usuario)).valida) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const { password_hash: newHash, salt } = await hashClave(password_nuevo);

    await db.query(
      'UPDATE usuarios SET password_hash=$1, salt=$2, primer_login=false WHERE id=$3',
      [newHash, salt, req.usuario.id]
    );
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};
