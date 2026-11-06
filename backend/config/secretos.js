// Secretos para firmar los tokens JWT (DEF-019). Nunca hay valores por defecto en el código:
// - En producción, si faltan, son cortos o iguales entre sí, el servidor no arranca.
// - En desarrollo y pruebas se genera uno aleatorio por proceso y se avisa en la consola
//   (las sesiones se cierran cada vez que se reinicia el servidor).
// Para generar uno:  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
const crypto = require('crypto');
require('dotenv').config();

const LARGO_MINIMO = 32;
// Valores que estuvieron escritos en el código hasta v1.3: se rechazan siempre
const ANTIGUOS = ['dtdeportivo_jwt_default_secret_key', 'dtdeportivo_refresh_default_secret_key'];

function leer(nombre) {
  const valor = process.env[nombre] || '';
  if (valor.length >= LARGO_MINIMO && !ANTIGUOS.includes(valor)) return valor;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Falta la variable ${nombre} o tiene menos de ${LARGO_MINIMO} caracteres. Configúrala antes de iniciar el servidor.`);
  }
  console.warn(`⚠️  ${nombre} no está configurado: se usa uno temporal. Configúralo en .env para que las sesiones sobrevivan a un reinicio.`);
  return crypto.randomBytes(48).toString('hex');
}

const JWT_SECRET = leer('JWT_SECRET');
const JWT_REFRESH_SECRET = leer('JWT_REFRESH_SECRET');
if (JWT_SECRET === JWT_REFRESH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET y JWT_REFRESH_SECRET deben ser distintos.');
}

module.exports = { JWT_SECRET, JWT_REFRESH_SECRET };
