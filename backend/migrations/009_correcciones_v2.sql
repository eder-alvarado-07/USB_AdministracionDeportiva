-- v2.0: asistencia sin duplicados, resultados por deporte y categorías por deporte.
-- Para bases existentes. Ejecutar después de 008_deporte_entrenador.sql. Se puede repetir sin problema.
BEGIN;
-- Asistencia: un solo registro por deportista y entrenamiento (antes se podían duplicar)
DELETE FROM asistencia_entrenamiento a USING asistencia_entrenamiento b
  WHERE a.jugador_id = b.jugador_id AND a.entrenamiento_id = b.entrenamiento_id AND a.id < b.id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_asistencia_jugador_entrenamiento
  ON asistencia_entrenamiento(jugador_id, entrenamiento_id);

-- Partidos: el resultado depende del deporte (marcador, tiempo, marca o puesto)
ALTER TABLE partidos ALTER COLUMN resultado TYPE VARCHAR(80);
ALTER TABLE partidos DROP CONSTRAINT IF EXISTS partidos_tipo_check;
ALTER TABLE partidos ALTER COLUMN tipo TYPE VARCHAR(20);
ALTER TABLE partidos ADD CONSTRAINT partidos_tipo_check CHECK (tipo IN ('liga','amistoso','torneo','competencia'));

-- Categorías que maneja cada deporte (las define el administrador)
CREATE TABLE IF NOT EXISTS categorias (
  id            SERIAL PRIMARY KEY,
  disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
  nombre        VARCHAR(60) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (disciplina_id, nombre)
);
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL;
COMMIT;
