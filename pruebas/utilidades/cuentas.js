// Cuentas de prueba (creadas por backend/config/seed.js y datos_demo.js en la base de pruebas,
// todas con la clave CLAVE_PRUEBAS que se pasa como SEED_CLAVE_INICIAL)
const { CLAVE_PRUEBAS } = require('./bd');

module.exports = {
  administrador: ['admin1@dtdeportivo.com', CLAVE_PRUEBAS],
  head_coach:    ['headcoach@dtdeportivo.com', CLAVE_PRUEBAS],
  entrenador:    ['cesar_dt@dtdeportivo.com', CLAVE_PRUEBAS],
  entrenador2:   ['juan_moreno@dtdeportivo.com', CLAVE_PRUEBAS],
  salud:         ['salud@dtdeportivo.com', CLAVE_PRUEBAS],
  jugador:       ['jugador@dtdeportivo.com', CLAVE_PRUEBAS],
};
