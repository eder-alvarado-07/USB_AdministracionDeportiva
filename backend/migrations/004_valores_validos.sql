-- v1.4: rangos válidos para los valores numéricos (DEF-017: se aceptaban goles, edad y peso negativos).
-- Para bases existentes. Ejecutar después de 003_dorsal.sql. Se puede repetir sin problema.
-- NOT VALID: las filas nuevas o modificadas deben cumplir la regla; las que ya existían no bloquean la migración.
-- Para revisar si quedaron filas antiguas fuera de rango:  ALTER TABLE <tabla> VALIDATE CONSTRAINT <nombre>;
BEGIN;
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
COMMIT;
