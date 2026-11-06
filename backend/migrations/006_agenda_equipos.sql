-- v1.7: cada entrenamiento y partido pertenece a un equipo y tiene hora y lugar propios.
-- Para bases existentes. Ejecutar después de 005_convocatorias.sql. Se puede repetir sin problema.
-- Los registros anteriores quedan sin equipo ("generales") y los siguen viendo todos.
BEGIN;
ALTER TABLE entrenamientos ADD COLUMN IF NOT EXISTS equipo_id INT REFERENCES equipos(id) ON DELETE SET NULL;
ALTER TABLE entrenamientos ADD COLUMN IF NOT EXISTS hora VARCHAR(5);
ALTER TABLE entrenamientos ADD COLUMN IF NOT EXISTS lugar VARCHAR(150);
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS equipo_id INT REFERENCES equipos(id) ON DELETE SET NULL;
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS hora VARCHAR(5);
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS lugar VARCHAR(150);
CREATE INDEX IF NOT EXISTS idx_entrenamientos_equipo ON entrenamientos(equipo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_partidos_equipo ON partidos(equipo_id, fecha);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_entrenamientos_hora') THEN
    ALTER TABLE entrenamientos ADD CONSTRAINT chk_entrenamientos_hora
      CHECK (hora IS NULL OR hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_partidos_hora') THEN
    ALTER TABLE partidos ADD CONSTRAINT chk_partidos_hora
      CHECK (hora IS NULL OR hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
END $$;
COMMIT;
