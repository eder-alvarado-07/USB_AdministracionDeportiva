// Trabajador de servicio mínimo (v1.7): permite instalar la app en Android y escritorio.
// No guarda nada en caché a propósito: así nunca se sirve una versión vieja después de publicar cambios.
// (Las notificaciones push llegarán aquí cuando el sistema esté publicado con HTTPS.)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* el navegador atiende cada petición normalmente */ });
