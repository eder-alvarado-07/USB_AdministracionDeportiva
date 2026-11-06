-- v2.1: métricas por deporte y usuario administrador admin1.
-- Para bases existentes. Ejecutar después de 009_correcciones_v2.sql. Se puede repetir sin problema.
BEGIN;
-- Métricas propias de cada deporte (goles y tarjetas en fútbol, tries y tackles en rugby, rebotes en baloncesto…).
-- Los registros anteriores quedan con '{}' y se muestran a partir de goles / asistencias / minutos_jugados.
ALTER TABLE estadisticas_jugador ADD COLUMN IF NOT EXISTS metricas JSONB NOT NULL DEFAULT '{}'::jsonb;

-- El administrador inicial pasa de robinson_meza a admin1 (usuario formal). Conserva su contraseña, su id y sus datos.
-- Solo si todavía no existe admin1, para que se pueda repetir sin error.
UPDATE usuarios
   SET email = 'admin1@dtdeportivo.com',
       nombre = CASE WHEN nombre = 'Robinson Meza' THEN 'Administrador' ELSE nombre END
 WHERE email = 'robinson_meza@dtdeportivo.com'
   AND NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin1@dtdeportivo.com');
COMMIT;
