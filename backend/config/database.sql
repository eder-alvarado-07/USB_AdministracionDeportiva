-- ============================================================
-- SCHEMA PostgreSQL - Sistema de Gestión Deportiva
-- Crea la base completa desde cero. Es idempotente: se puede
-- ejecutar varias veces sin duplicar tablas ni datos semilla.
--   psql "$DATABASE_URL" -f backend/config/database.sql
-- Para bases existentes usar los scripts de backend/migrations/.
-- ============================================================

-- -------------------------------------------------------
-- 1. DISCIPLINAS DEPORTIVAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS disciplinas (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 2. EQUIPOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipos (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  categoria     VARCHAR(50),
  descripcion   TEXT,
  logo_url      TEXT,
  disciplina_id INT REFERENCES disciplinas(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 3. JUGADORES
--    entrenador_id se agrega después de crear usuarios
--    (usuarios y jugadores se referencian mutuamente).
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS jugadores (
  id                   SERIAL PRIMARY KEY,
  nombre               VARCHAR(100) NOT NULL,
  edad                 INT,
  fecha_nacimiento     DATE,
  genero               VARCHAR(20) CHECK (genero IN ('masculino','femenino')),
  dorsal               SMALLINT CHECK (dorsal BETWEEN 0 AND 99),
  posicion             VARCHAR(50),
  peso                 DECIMAL(5,2),
  altura               DECIMAL(4,2),
  foto_url             TEXT,
  objetivos_deportivos TEXT,
  equipo_id            INT REFERENCES equipos(id) ON DELETE SET NULL,
  disciplina_id        INT REFERENCES disciplinas(id) ON DELETE SET NULL,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 4. USUARIOS (auth)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  salt           VARCHAR(64) NOT NULL,
  rol            VARCHAR(20) NOT NULL CONSTRAINT usuarios_rol_check
                 CHECK (rol IN ('administrador','head_coach','entrenador','personal_salud','jugador')),
  jugador_id     INT REFERENCES jugadores(id) ON DELETE SET NULL,
  head_coach_id  INT REFERENCES usuarios(id) ON DELETE SET NULL,
  activo         BOOLEAN DEFAULT TRUE,
  primer_login   BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS
  entrenador_id INT REFERENCES usuarios(id) ON DELETE SET NULL;

-- -------------------------------------------------------
-- 5. ENTRENAMIENTOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrenamientos (
  id           SERIAL PRIMARY KEY,
  fecha        DATE NOT NULL,
  tipo         VARCHAR(80) NOT NULL,
  descripcion  TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 6. ASISTENCIA A ENTRENAMIENTOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS asistencia_entrenamiento (
  id                SERIAL PRIMARY KEY,
  jugador_id        INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  entrenamiento_id  INT NOT NULL REFERENCES entrenamientos(id) ON DELETE CASCADE,
  asistencia        BOOLEAN DEFAULT FALSE
);

-- -------------------------------------------------------
-- 7. LESIONES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesiones (
  id           SERIAL PRIMARY KEY,
  jugador_id   INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo         VARCHAR(100),
  descripcion  TEXT,
  fecha_inicio DATE,
  fecha_fin    DATE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 8. EVALUACIONES FÍSICAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluaciones (
  id           SERIAL PRIMARY KEY,
  jugador_id   INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo         VARCHAR(10) NOT NULL CHECK (tipo IN ('inicial','final')),
  velocidad    DECIMAL(5,2),
  resistencia  DECIMAL(5,2),
  fuerza       DECIMAL(5,2),
  fecha        DATE NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 9. PARTIDOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidos (
  id         SERIAL PRIMARY KEY,
  fecha      DATE NOT NULL,
  rival      VARCHAR(100) NOT NULL,
  tipo       VARCHAR(10) NOT NULL CHECK (tipo IN ('liga','amistoso')),
  resultado  VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 10. ESTADÍSTICAS POR JUGADOR
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS estadisticas_jugador (
  id               SERIAL PRIMARY KEY,
  jugador_id       INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  partido_id       INT REFERENCES partidos(id) ON DELETE SET NULL,
  goles            INT DEFAULT 0,
  asistencias      INT DEFAULT 0,
  minutos_jugados  INT DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 11. ANTROPOMETRÍA
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS antropometria (
  id                        SERIAL PRIMARY KEY,
  jugador_id                INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha                     DATE NOT NULL,
  peso                      DECIMAL(5,2),
  estatura                  DECIMAL(4,2),
  imc                       DECIMAL(4,2),
  pliegue_biceps            DECIMAL(4,1),
  pliegue_triceps           DECIMAL(4,1),
  pliegue_subescapular      DECIMAL(4,1),
  pliegue_suprailiaco       DECIMAL(4,1),
  pliegue_supraespinal      DECIMAL(4,1),
  pliegue_abdominal         DECIMAL(4,1),
  pliegue_muslo_anterior    DECIMAL(4,1),
  pliegue_pierna_medial     DECIMAL(4,1),
  perimetro_brazo_relajado  DECIMAL(4,1),
  perimetro_brazo_contraido DECIMAL(4,1),
  perimetro_muslo_medio     DECIMAL(4,1),
  perimetro_pierna          DECIMAL(4,1),
  diametro_humero           DECIMAL(4,1),
  diametro_muneca           DECIMAL(4,1),
  diametro_femur            DECIMAL(4,1),
  porcentaje_grasa          DECIMAL(4,2),
  masa_muscular_esqueletica DECIMAL(5,2),
  masa_mineral_osea         DECIMAL(5,2),
  sumatoria_pliegues        DECIMAL(5,1),
  posicion_rugby            VARCHAR(50),
  categoria                 VARCHAR(50),
  grupo                     VARCHAR(50),
  endomorfia                DECIMAL(4,2),
  mesomorfia                DECIMAL(4,2),
  ectomorfia                DECIMAL(4,2),
  x_somatocarta             DECIMAL(5,2),
  y_somatocarta             DECIMAL(5,2),
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 12. EVALUACIONES RUGBY
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluaciones_rugby (
  id                 SERIAL PRIMARY KEY,
  jugador_id         INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha              DATE NOT NULL,
  sprint_30m         DECIMAL(5,2),
  salto_vertical     DECIMAL(5,2),
  resistencia_yoyo   INT,
  peso               DECIMAL(5,2),
  estatura           DECIMAL(4,2),
  porcentaje_grasa   DECIMAL(4,2),
  masa_muscular      DECIMAL(5,2),
  imc                DECIMAL(4,2),
  score_velocidad    INT,
  score_potencia     INT,
  score_resistencia  INT,
  score_grasa        INT,
  score_musculo      INT,
  score_general      INT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 13. SALUD: HISTORIAS CLÍNICAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS historias_clinicas (
  id                  SERIAL PRIMARY KEY,
  jugador_id          INT NOT NULL UNIQUE REFERENCES jugadores(id) ON DELETE CASCADE,
  antecedentes        TEXT,
  alergias            TEXT,
  medicamentos        TEXT,
  cirugias            TEXT,
  enfermedades        TEXT,
  historial_deportivo TEXT,
  observaciones       TEXT,
  actualizado_por     INT REFERENCES usuarios(id) ON DELETE SET NULL,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 14. SALUD: CONTROLES MÉDICOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS controles_medicos (
  id             SERIAL PRIMARY KEY,
  jugador_id     INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  proxima_fecha  DATE,
  tipo           VARCHAR(100) NOT NULL,
  resultado      TEXT,
  restricciones  TEXT,
  aptitud        VARCHAR(40) NOT NULL DEFAULT 'pendiente'
                 CHECK (aptitud IN ('apto','apto_restricciones','no_apto_temporal','pendiente')),
  profesional_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 15. SALUD: SEGUIMIENTO DE LESIONES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS seguimiento_lesiones (
  id                     SERIAL PRIMARY KEY,
  lesion_id              INT NOT NULL REFERENCES lesiones(id) ON DELETE CASCADE,
  zona_corporal          VARCHAR(100),
  gravedad               VARCHAR(30),
  diagnostico            TEXT,
  tratamiento            TEXT,
  evolucion              TEXT,
  fecha_seguimiento      DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_retorno_estimada DATE,
  fecha_retorno_real     DATE,
  estado                 VARCHAR(40) NOT NULL DEFAULT 'activa'
                         CHECK (estado IN ('activa','en_recuperacion','alta')),
  profesional_id         INT REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 16. NOTIFICACIONES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones (
  id         SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo     VARCHAR(150) NOT NULL,
  mensaje    TEXT NOT NULL,
  tipo       VARCHAR(40) NOT NULL DEFAULT 'general',
  leida      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- ÍNDICES
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jugadores_equipo        ON jugadores(equipo_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_disciplina    ON jugadores(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_entrenador    ON jugadores(entrenador_id);
-- Un dorsal no se repite dentro del mismo equipo (los jugadores sin equipo no compiten por número)
CREATE UNIQUE INDEX IF NOT EXISTS uq_jugadores_equipo_dorsal ON jugadores(equipo_id, dorsal)
  WHERE equipo_id IS NOT NULL AND dorsal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_headcoach      ON usuarios(head_coach_id);
CREATE INDEX IF NOT EXISTS idx_lesiones_jugador        ON lesiones(jugador_id);
CREATE INDEX IF NOT EXISTS idx_antropometria_jugador   ON antropometria(jugador_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_controles_jugador_fecha ON controles_medicos(jugador_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_seguimiento_lesion_fecha ON seguimiento_lesiones(lesion_id, fecha_seguimiento DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario  ON notificaciones(usuario_id, leida, created_at DESC);

-- -------------------------------------------------------
-- DATOS SEMILLA (solo si las tablas están vacías)
-- Los usuarios se crean con: npm run seed (backend/config/seed.js)
-- -------------------------------------------------------
INSERT INTO disciplinas (nombre) VALUES
  ('Fútbol'), ('Rugby'), ('Atletismo'), ('Natación'), ('Baloncesto')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO equipos (nombre, categoria)
SELECT * FROM (VALUES
  ('Los Cóndores', 'Primera División'),
  ('Club Rugby Norte', 'Segunda División')
) AS v(nombre, categoria)
WHERE NOT EXISTS (SELECT 1 FROM equipos);

INSERT INTO jugadores (nombre, edad, posicion, peso, altura, dorsal, equipo_id)
SELECT v.nombre, v.edad, v.posicion, v.peso, v.altura, v.dorsal, (SELECT MIN(id) FROM equipos)
FROM (VALUES
  ('Carlos Méndez',   22, 'Delantero',  72.5, 1.78,  9),
  ('Luis García',     25, 'Mediocampo', 68.0, 1.75,  8),
  ('Pedro Ramírez',   19, 'Defensa',    80.0, 1.82,  4),
  ('Andrés Torres',   28, 'Portero',    85.0, 1.88,  1),
  ('Miguel Flores',   21, 'Delantero',  70.0, 1.76, 11)
) AS v(nombre, edad, posicion, peso, altura, dorsal)
WHERE NOT EXISTS (SELECT 1 FROM jugadores);

INSERT INTO entrenamientos (fecha, tipo, descripcion)
SELECT * FROM (VALUES
  (DATE '2026-03-25', 'Resistencia', 'Carrera continua 45 min + circuito'),
  (DATE '2026-03-27', 'Fuerza',      'Pesas y ejercicios funcionales'),
  (DATE '2026-03-29', 'Táctica',     'Prácticas de posicionamiento y pressing')
) AS v(fecha, tipo, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM entrenamientos);

INSERT INTO partidos (fecha, rival, tipo, resultado)
SELECT * FROM (VALUES
  (DATE '2026-03-15', 'Club Atlético Norte', 'liga',     '2-1'),
  (DATE '2026-03-22', 'Deportivo Sur',       'liga',     '0-0'),
  (DATE '2026-04-05', 'FC Estrella',         'amistoso', NULL)
) AS v(fecha, rival, tipo, resultado)
WHERE NOT EXISTS (SELECT 1 FROM partidos);

-- -------------------------------------------------------
-- RANGOS VÁLIDOS (v1.4, igual que migrations/004_valores_validos.sql)
-- -------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('jugadores', 'chk_jugadores_edad', 'edad BETWEEN 0 AND 100'),
    ('jugadores', 'chk_jugadores_peso', 'peso > 0 AND peso < 300'),
    ('jugadores', 'chk_jugadores_altura', 'altura > 0 AND altura < 3'),
    ('estadisticas_jugador', 'chk_estadisticas_valores',
      'COALESCE(goles, 0) >= 0 AND COALESCE(asistencias, 0) >= 0 AND COALESCE(minutos_jugados, 0) >= 0'),
    ('evaluaciones', 'chk_evaluaciones_valores',
      'COALESCE(velocidad, 0) >= 0 AND COALESCE(resistencia, 0) >= 0 AND COALESCE(fuerza, 0) >= 0'),
    ('antropometria', 'chk_antropometria_valores',
      '(peso IS NULL OR peso > 0) AND (estatura IS NULL OR estatura > 0)
       AND LEAST(COALESCE(pliegue_biceps, 0), COALESCE(pliegue_triceps, 0), COALESCE(pliegue_subescapular, 0),
                 COALESCE(pliegue_suprailiaco, 0), COALESCE(pliegue_supraespinal, 0), COALESCE(pliegue_abdominal, 0),
                 COALESCE(pliegue_muslo_anterior, 0), COALESCE(pliegue_pierna_medial, 0),
                 COALESCE(perimetro_brazo_relajado, 0), COALESCE(perimetro_brazo_contraido, 0),
                 COALESCE(perimetro_muslo_medio, 0), COALESCE(perimetro_pierna, 0),
                 COALESCE(diametro_humero, 0), COALESCE(diametro_muneca, 0), COALESCE(diametro_femur, 0)) >= 0'),
    ('evaluaciones_rugby', 'chk_evaluaciones_rugby_valores',
      'LEAST(COALESCE(sprint_30m, 0), COALESCE(salto_vertical, 0), COALESCE(resistencia_yoyo, 0),
             COALESCE(peso, 0), COALESCE(estatura, 0)) >= 0')
  ) AS t(tabla, nombre, regla)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.nombre) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s) NOT VALID', r.tabla, r.nombre, r.regla);
    END IF;
  END LOOP;
END $$;

-- -------------------------------------------------------
-- CONVOCATORIAS (v1.6, igual que migrations/005_convocatorias.sql)
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- AGENDA POR EQUIPO (v1.7, igual que migrations/006_agenda_equipos.sql)
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- AVISOS DEL ENTRENADOR Y RECORDATORIOS (v1.7, igual que migrations/007_comunicados_recordatorios.sql)
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- DEPORTE DEL ENTRENADOR (v1.9, igual que migrations/008_deporte_entrenador.sql)
-- -------------------------------------------------------
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS disciplina_id INT REFERENCES disciplinas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_disciplina ON usuarios(disciplina_id);

-- -------------------------------------------------------
-- v2.0 (igual que migrations/009_correcciones_v2.sql)
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- v2.1 (igual que migrations/010_metricas_y_admin.sql)
-- -------------------------------------------------------
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
