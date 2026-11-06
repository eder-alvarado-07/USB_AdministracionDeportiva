-- v1.6: convocatoria oficial de cada partido, respuestas de los deportistas y registro de cambios.
-- Para bases existentes. Ejecutar después de 004_valores_validos.sql. Se puede repetir sin problema.
BEGIN;

-- Una convocatoria por partido. Mientras no se publica, solo la ve el cuerpo técnico.
CREATE TABLE IF NOT EXISTS convocatorias (
  id                SERIAL PRIMARY KEY,
  partido_id        INT NOT NULL UNIQUE REFERENCES partidos(id) ON DELETE CASCADE,
  hora_presentacion VARCHAR(5),
  lugar             VARCHAR(150),
  notas             TEXT,
  publicada         BOOLEAN NOT NULL DEFAULT FALSE,
  publicada_en      TIMESTAMP,
  creada_por        INT REFERENCES usuarios(id) ON DELETE SET NULL,
  actualizada_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_convocatorias_hora CHECK (hora_presentacion IS NULL OR hora_presentacion ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

-- Cada deportista convocado, como titular o suplente, con su respuesta.
CREATE TABLE IF NOT EXISTS convocados (
  id               SERIAL PRIMARY KEY,
  convocatoria_id  INT NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
  jugador_id       INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  rol              VARCHAR(10) NOT NULL DEFAULT 'titular',
  confirmacion     VARCHAR(12) NOT NULL DEFAULT 'pendiente',
  respondido_en    TIMESTAMP,
  motivo           TEXT,
  CONSTRAINT convocados_unico UNIQUE (convocatoria_id, jugador_id),
  CONSTRAINT chk_convocados_rol CHECK (rol IN ('titular', 'suplente')),
  CONSTRAINT chk_convocados_confirmacion CHECK (confirmacion IN ('pendiente', 'confirmado', 'no_puede'))
);

-- Registro digital: cada acción sobre la convocatoria, quién la hizo y cuándo.
CREATE TABLE IF NOT EXISTS convocatoria_historial (
  id               SERIAL PRIMARY KEY,
  convocatoria_id  INT NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
  usuario_id       INT REFERENCES usuarios(id) ON DELETE SET NULL,
  jugador_id       INT REFERENCES jugadores(id) ON DELETE SET NULL,
  accion           VARCHAR(20) NOT NULL,
  detalle          TEXT,
  creado_en        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_convocados_jugador ON convocados(jugador_id);
CREATE INDEX IF NOT EXISTS idx_historial_convocatoria ON convocatoria_historial(convocatoria_id, creado_en);

-- Los avisos pueden llevar a una pantalla concreta (por ejemplo, la convocatoria de un partido)
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS enlace VARCHAR(200);

COMMIT;
