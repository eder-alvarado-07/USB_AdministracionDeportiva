// Solo la API (sin frontend). Para el sistema completo usar server.js de la raíz.
const app = require('../api/index');

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀  API corriendo en http://${HOST}:${PORT}`);
});

module.exports = app;
