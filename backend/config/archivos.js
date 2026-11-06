// Carpeta de archivos subidos (fotos de deportistas y logos). En Railway apunta a un volumen
// (UPLOADS_DIR=/data/uploads) para que los archivos no se pierdan en cada despliegue.
const path = require('path');
require('dotenv').config();

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');

module.exports = { UPLOADS_DIR };
