const express = require('express');
const path    = require('path');
require('dotenv').config();

async function startServer() {
  // La API (rutas, seguridad y manejo de errores) vive en api/index.js
  const app = require('./api/index');
  const PORT = Number(process.env.PORT) || 3000;

  // Frontend integration (Vite dev server or static build)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = require('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.join(__dirname, 'frontend'),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    // Los archivos de /assets llevan un hash en el nombre: el navegador puede guardarlos un año sin volver a pedirlos.
    // index.html, sw.js y el manifiesto se revalidan siempre para que cada versión nueva llegue de inmediato.
    app.use('/assets', express.static(path.join(distPath, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // HOST=127.0.0.1 limita el servidor a este equipo (útil para pruebas locales)
  const HOST = process.env.HOST || '0.0.0.0';
  const servidor = app.listen(PORT, HOST, () => {
    console.log(`🚀 Administración Deportiva corriendo en http://${HOST}:${PORT}`);
  });

  // Apagado ordenado: Railway (y Ctrl+C) envían una señal antes de detener el proceso. Se dejan de aceptar
  // conexiones, se terminan las peticiones en curso y se cierra la base; si tarda más de 10 s, se sale igual.
  const apagar = (senal) => {
    console.log(`${senal} recibido: cerrando el servidor…`);
    setTimeout(() => process.exit(0), 10000).unref();
    servidor.close(() => {
      require('./backend/config/db').end().catch(() => {}).finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', () => apagar('SIGTERM'));
  process.once('SIGINT', () => apagar('SIGINT'));
}

startServer().catch(err => {
  console.error('❌ Error al iniciar el servidor:', err.message);
  process.exit(1);
});
