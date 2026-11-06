-- DTdeportivo: migración incremental para roles, asignaciones y seguimiento de salud.
-- Ejecutar en PostgreSQL/Neon después de respaldar la base de datos.
BEGIN;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS head_coach_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS entrenador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS objetivos_deportivos TEXT;

-- Actualizar restricción de roles sin depender del nombre de la constraint existente.
DO $$ DECLARE c RECORD; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='usuarios'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%rol%' LOOP
    EXECUTE format('ALTER TABLE usuarios DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('administrador','head_coach','entrenador','personal_salud','jugador'));

CREATE TABLE IF NOT EXISTS historias_clinicas (
  id SERIAL PRIMARY KEY,
  jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  antecedentes TEXT,
  alergias TEXT,
  medicamentos TEXT,
  cirugias TEXT,
  enfermedades TEXT,
  historial_deportivo TEXT,
  observaciones TEXT,
  actualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(jugador_id)
);
CREATE TABLE IF NOT EXISTS controles_medicos (
  id SERIAL PRIMARY KEY,
  jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  proxima_fecha DATE,
  tipo VARCHAR(100) NOT NULL,
  resultado TEXT,
  restricciones TEXT,
  aptitud VARCHAR(40) NOT NULL DEFAULT 'pendiente' CHECK (aptitud IN ('apto','apto_restricciones','no_apto_temporal','pendiente')),
  profesional_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS seguimiento_lesiones (
  id SERIAL PRIMARY KEY,
  lesion_id INTEGER NOT NULL REFERENCES lesiones(id) ON DELETE CASCADE,
  zona_corporal VARCHAR(100),
  gravedad VARCHAR(30),
  diagnostico TEXT,
  tratamiento TEXT,
  evolucion TEXT,
  fecha_seguimiento DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_retorno_estimada DATE,
  fecha_retorno_real DATE,
  estado VARCHAR(40) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','en_recuperacion','alta')),
  profesional_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(40) NOT NULL DEFAULT 'general',
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_jugadores_entrenador ON jugadores(entrenador_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_headcoach ON usuarios(head_coach_id);
CREATE INDEX IF NOT EXISTS idx_controles_jugador_fecha ON controles_medicos(jugador_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_seguimiento_lesion_fecha ON seguimiento_lesiones(lesion_id, fecha_seguimiento DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id, leida, created_at DESC);
COMMIT;
