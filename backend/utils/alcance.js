// Qué deportistas puede ver cada rol (la misma regla que Deportistas, Lesiones e Inicio):
//   deportista → solo él mismo · entrenador → los suyos · head coach → los de sus entrenadores
//   administrador y personal de salud → todos
// Protege datos personales y de salud (Ley 1581 de 2012). v1.5.2.

// Condición SQL sobre la tabla jugadores (alias `j` por defecto), o null si el rol ve a todos.
function condicionAlcance(usuario, params, alias = 'j') {
  if (usuario?.rol === 'jugador') {
    params.push(usuario.jugador_id || 0);
    return `${alias}.id = $${params.length}`;
  }
  if (usuario?.rol === 'entrenador') {
    params.push(usuario.id);
    return `${alias}.entrenador_id = $${params.length}`;
  }
  if (usuario?.rol === 'head_coach') {
    params.push(usuario.id);
    return `${alias}.entrenador_id IN (SELECT id FROM usuarios WHERE head_coach_id = $${params.length})`;
  }
  return null;
}

// ¿Puede este usuario ver a este deportista?
async function puedeVerJugador(db, usuario, jugadorId) {
  const params = [jugadorId];
  const cond = condicionAlcance(usuario, params);
  const { rows } = await db.query(`SELECT 1 FROM jugadores j WHERE j.id = $1${cond ? ` AND ${cond}` : ''}`, params);
  return rows.length > 0;
}

// Agenda por equipo (v1.7): un entrenamiento o partido sin equipo es general y lo ven todos;
// con equipo, lo ven quienes tienen deportistas de ese equipo en su alcance (el deportista, el de su propio equipo).
// `columna` es la columna equipo_id de la actividad (por ejemplo 'e.equipo_id'). Devuelve null si el rol ve todo.
function condicionEquipos(usuario, params, columna) {
  const sub = [];
  const cond = condicionAlcance(usuario, sub, 'jx');
  if (!cond) return null;
  // Renumera los parámetros de la subconsulta para encadenarlos con los de la consulta principal
  let texto = cond;
  sub.forEach((valor, i) => { params.push(valor); texto = texto.replace(`$${i + 1}`, `$${params.length}`); });
  return `(${columna} IS NULL OR ${columna} IN (SELECT jx.equipo_id FROM jugadores jx WHERE ${texto} AND jx.equipo_id IS NOT NULL))`;
}

// ¿Puede este usuario asignar actividades a este equipo? (administrador: cualquiera; entrenador: equipos de sus deportistas)
// v2.0: también los equipos del deporte asignado al entrenador (por ejemplo, una categoría nueva de rugby
// que aún no tiene deportistas). Un equipo de otro deporte nunca.
async function puedeUsarEquipo(db, usuario, equipoId) {
  if (!equipoId) return true;
  const params = [equipoId];
  const cond = condicionAlcance(usuario, params, 'j');
  if (!cond) return true;
  params.push(usuario.id);
  const { rows } = await db.query(`
    SELECT 1 FROM jugadores j WHERE j.equipo_id = $1 AND ${cond}
    UNION ALL
    SELECT 1 FROM equipos eq JOIN usuarios u ON u.id = $${params.length}
      WHERE eq.id = $1 AND u.disciplina_id IS NOT NULL AND eq.disciplina_id = u.disciplina_id
    LIMIT 1`, params);
  return rows.length > 0;
}

// Deportes que puede ver cada rol (v1.9): administrador y personal de salud, todos los de la universidad;
// entrenador, el deporte que tiene asignado y los de sus deportistas; head coach, los de sus entrenadores;
// deportista, el suyo. `columna` es el id del deporte (por ejemplo 'd.id'). Devuelve null si el rol ve todos.
function condicionDisciplinas(usuario, params, columna) {
  if (!usuario || ['administrador', 'personal_salud'].includes(usuario.rol)) return null;
  if (usuario.rol === 'jugador') {
    params.push(usuario.jugador_id || 0);
    return `${columna} IN (SELECT COALESCE(jx.disciplina_id, eqx.disciplina_id) FROM jugadores jx
      LEFT JOIN equipos eqx ON eqx.id = jx.equipo_id WHERE jx.id = $${params.length})`;
  }
  params.push(usuario.id);
  const yo = `$${params.length}`;
  // Los entrenadores cuyo deporte cuenta: él mismo, o los del head coach
  const entrenadores = usuario.rol === 'head_coach' ? `SELECT id FROM usuarios WHERE head_coach_id = ${yo}` : `SELECT ${yo}::int`;
  return `${columna} IN (
      SELECT disciplina_id FROM usuarios WHERE (id = ${yo} OR id IN (${entrenadores})) AND disciplina_id IS NOT NULL
      UNION SELECT COALESCE(jx.disciplina_id, eqx.disciplina_id) FROM jugadores jx LEFT JOIN equipos eqx ON eqx.id = jx.equipo_id
        WHERE jx.entrenador_id IN (${entrenadores}) AND COALESCE(jx.disciplina_id, eqx.disciplina_id) IS NOT NULL)`;
}

module.exports = { condicionAlcance, puedeVerJugador, condicionEquipos, puedeUsarEquipo, condicionDisciplinas };
