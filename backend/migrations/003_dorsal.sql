-- v1.3: número de camiseta (dorsal) de cada jugador.
-- Para bases existentes. Ejecutar después de 002_postgres_nativo.sql.
BEGIN;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS dorsal SMALLINT CHECK (dorsal BETWEEN 0 AND 99);
-- Un dorsal no se repite dentro del mismo equipo
CREATE UNIQUE INDEX IF NOT EXISTS uq_jugadores_equipo_dorsal ON jugadores(equipo_id, dorsal)
  WHERE equipo_id IS NOT NULL AND dorsal IS NOT NULL;
COMMIT;
