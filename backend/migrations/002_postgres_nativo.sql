-- v1.2: PostgreSQL nativo.
-- Para bases creadas con versiones anteriores. Ejecutar después de 001_roles_y_salud.sql.
-- Agrega las columnas que antes se creaban en tiempo de ejecución desde los controladores.
BEGIN;
ALTER TABLE equipos   ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE equipos   ADD COLUMN IF NOT EXISTS disciplina_id INT REFERENCES disciplinas(id) ON DELETE SET NULL;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS genero VARCHAR(20) CHECK (genero IN ('masculino','femenino'));
ALTER TABLE jugadores ALTER COLUMN foto_url TYPE TEXT;
CREATE INDEX IF NOT EXISTS idx_jugadores_equipo      ON jugadores(equipo_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_disciplina  ON jugadores(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_lesiones_jugador      ON lesiones(jugador_id);
CREATE INDEX IF NOT EXISTS idx_antropometria_jugador ON antropometria(jugador_id, fecha DESC);
COMMIT;
