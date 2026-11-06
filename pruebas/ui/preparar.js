// Antes de las pruebas de navegador: base de pruebas limpia con el plantel de demostración.
const { prepararBaseDePruebas } = require('../utilidades/bd');

module.exports = async () => {
  await prepararBaseDePruebas();
};
