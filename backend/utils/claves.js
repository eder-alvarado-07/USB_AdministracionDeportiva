// Hash de contraseñas con scrypt (DEF-021): lento a propósito y con sal aleatoria por usuario.
// Formato guardado en usuarios.password_hash:  scrypt$N$r$p$<hash hex>   (la sal va en usuarios.salt)
// Los hashes antiguos (una ronda de HMAC-SHA256) siguen siendo válidos para iniciar sesión
// y se reemplazan por scrypt la primera vez que el usuario entra.
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const PARAMETROS = { N: 16384, r: 8, p: 1 }; // unos 16 MB de memoria por cálculo
const LARGO = 64;

async function hashClave(clave) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(String(clave), salt, LARGO, PARAMETROS);
  const { N, r, p } = PARAMETROS;
  return { password_hash: `scrypt$${N}$${r}$${p}$${hash.toString('hex')}`, salt };
}

function iguales(a, b) {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

// Devuelve { valida, rehacer }: rehacer indica que el hash es antiguo y conviene reemplazarlo
async function verificarClave(clave, usuario) {
  const guardado = usuario.password_hash || '';
  if (guardado.startsWith('scrypt$')) {
    const [, N, r, p, hash] = guardado.split('$');
    const calculado = await scrypt(String(clave), usuario.salt, hash.length / 2, { N: +N, r: +r, p: +p });
    const valida = iguales(calculado.toString('hex'), hash);
    const rehacer = valida && (+N !== PARAMETROS.N || +r !== PARAMETROS.r || +p !== PARAMETROS.p);
    return { valida, rehacer };
  }
  const antiguo = crypto.createHmac('sha256', usuario.salt).update(String(clave)).digest('hex');
  const valida = iguales(antiguo, guardado);
  return { valida, rehacer: valida };
}

// Para que un correo inexistente tarde lo mismo que uno existente (no revela qué cuentas existen)
const SAL_FICTICIA = crypto.randomBytes(16).toString('hex');
async function simularVerificacion(clave) {
  await scrypt(String(clave || ''), SAL_FICTICIA, LARGO, PARAMETROS);
}

// Clave inicial aleatoria y legible para usuarios creados por los scripts
function claveAleatoria() {
  return crypto.randomBytes(9).toString('base64').replace(/[+/]/g, 'x') + '.9';
}

module.exports = { hashClave, verificarClave, simularVerificacion, claveAleatoria };
