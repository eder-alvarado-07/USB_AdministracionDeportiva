// Arranque en Railway (startCommand de railway.json): prepara la base y luego inicia el servidor en el
// mismo proceso de Node, sin pasar por npm. Así, cuando Railway apaga la versión anterior con SIGTERM,
// el servidor cierra limpio (código 0) en lugar de que npm lo reporte como "command failed" (crash).
const path = require('path');
const { spawnSync } = require('child_process');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const r = spawnSync(process.execPath, [path.join(__dirname, 'preparar_despliegue.js')], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status || 1);

require('../../server');
