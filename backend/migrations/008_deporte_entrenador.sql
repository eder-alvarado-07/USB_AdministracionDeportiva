-- v1.9: cada entrenador (y head coach) puede tener un deporte asignado.
-- Con él, el selector de deporte muestra solo su deporte y no los de toda la universidad.
-- Si no tiene deporte asignado, se usa el de sus deportistas (los planteles existentes siguen igual).
BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS disciplina_id INT REFERENCES disciplinas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_disciplina ON usuarios(disciplina_id);

COMMIT;
