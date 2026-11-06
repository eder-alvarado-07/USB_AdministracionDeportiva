-- v1.7: avisos del entrenador al equipo y recordatorios automáticos.
-- Para bases existentes. Ejecutar después de 006_agenda_equipos.sql. Se puede repetir sin problema.
BEGIN;

-- Avisos que el entrenador (o el administrador) envía a un equipo o a todos sus deportistas
CREATE TABLE IF NOT EXISTS comunicados (
  id         SERIAL PRIMARY KEY,
  autor_id   INT REFERENCES usuarios(id) ON DELETE SET NULL,
  equipo_id  INT REFERENCES equipos(id) ON DELETE SET NULL,
  titulo     VARCHAR(120) NOT NULL,
  mensaje    TEXT NOT NULL,
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A quién le llegó cada aviso (se calcula al enviarlo)
CREATE TABLE IF NOT EXISTS comunicado_destinatarios (
  comunicado_id INT NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  usuario_id    INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (comunicado_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_comunicado_destinatarios_usuario ON comunicado_destinatarios(usuario_id);

-- Los recordatorios automáticos llevan una clave para no repetirse (por ejemplo, rec-ent-15)
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS clave VARCHAR(120);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notificaciones_clave ON notificaciones(usuario_id, clave);

COMMIT;
