// Crea los usuarios base. Ejecutar después de database.sql:
//   npm run db:init   (crea el esquema)  →  npm run seed
// Las contraseñas no se escriben en el código (DEF-020):
//   - Si SEED_CLAVE_INICIAL está en .env, todos los usuarios nuevos reciben esa clave.
//   - Si no, cada uno recibe una clave aleatoria que se muestra una sola vez en la consola.
// Los usuarios que ya existen no se modifican (no se pisan contraseñas cambiadas).
const pool = require('./db');
const { hashClave, claveAleatoria } = require('../utils/claves');

const USUARIOS_BASE = [
  // v2.1: el administrador inicial es admin1 (antes robinson_meza). Inicia sesión con "admin1" o con el correo.
  { nombre: 'Administrador',  email: 'admin1@dtdeportivo.com',        rol: 'administrador'  },
  { nombre: 'Cesar DT',       email: 'cesar_dt@dtdeportivo.com',      rol: 'entrenador'     },
  { nombre: 'Juan Moreno',    email: 'juan_moreno@dtdeportivo.com',   rol: 'entrenador'     },
  { nombre: 'Personal Salud', email: 'salud@dtdeportivo.com',         rol: 'personal_salud' },
  { nombre: 'Jugador Demo',   email: 'jugador@dtdeportivo.com',       rol: 'jugador'        },
];

// Crea un usuario si no existe. Devuelve la clave asignada, o null si ya existía.
async function crearUsuario(client, { nombre, email, rol }) {
  const clave = process.env.SEED_CLAVE_INICIAL || claveAleatoria();
  const { password_hash, salt } = await hashClave(clave);
  const { rowCount } = await client.query(
    `INSERT INTO usuarios (nombre, email, password_hash, salt, rol, primer_login)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (email) DO NOTHING`,
    [nombre, email, password_hash, salt, rol]
  );
  return rowCount ? clave : null;
}

function informar(usuario, clave) {
  if (clave === null) console.log(`ℹ️  ${usuario.rol}: ${usuario.email} ya existía (sin cambios)`);
  else if (process.env.SEED_CLAVE_INICIAL) console.log(`✅  ${usuario.rol}: ${usuario.email} (clave de SEED_CLAVE_INICIAL)`);
  else console.log(`✅  ${usuario.rol}: ${usuario.email} → ${clave}   (anótala: no se vuelve a mostrar)`);
}

async function run() {
  const client = await pool.connect();
  try {
    for (const u of USUARIOS_BASE) informar(u, await crearUsuario(client, u));
    console.log('\n🎉  Seed completado. Cada usuario debe cambiar su clave al entrar (Inicio → Mi sesión).');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) run().catch(err => { console.error(err.message); process.exit(1); });

module.exports = { crearUsuario, informar };
