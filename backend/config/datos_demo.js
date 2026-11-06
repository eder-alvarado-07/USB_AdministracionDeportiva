// Datos de demostración para desarrollo local: un plantel de rugby completo con dorsales,
// lesiones, controles médicos, entrenamientos con asistencia y el próximo partido.
// Las fechas se calculan desde hoy, así el inicio siempre se ve con información actual.
//   npm run demo        (después de npm run db:init y npm run seed)
// Es seguro ejecutarlo varias veces: si el equipo de demostración ya existe, no hace nada.
// No usar con usuarios reales. En Railway se carga solo si DATOS_DEMO=1 (versión para el tester).
const pool = require('./db');
const { crearUsuario, informar } = require('./seed');

const EQUIPO = 'Unisimón Rugby (demo)';
const JUGADORES = [
  [1, 'Andrés Torres', 'Pilar'], [2, 'Pedro Ramírez', 'Hooker'], [3, 'Carlos Méndez', 'Pilar'],
  [4, 'Luis García', 'Segunda línea'], [5, 'Miguel Flores', 'Segunda línea'], [6, 'Jhon Pabón', 'Ala'],
  [7, 'Andrés Contreras', 'Ala'], [8, 'Kevin Villamizar', 'Octavo'], [9, 'Sebastián Peñaranda', 'Medio scrum'],
  [10, 'Daniel Rincón', 'Apertura'], [11, 'Brayan Jaimes', 'Wing'], [12, 'Felipe Ortega', 'Centro'],
  [13, 'Santiago Sandoval', 'Centro'], [14, 'Julián Duarte', 'Wing'], [15, 'Mateo Carrillo', 'Fullback'],
  [16, 'Óscar Bautista', 'Hooker'], [17, 'Camilo Quintero', 'Pilar'], [18, 'Diego Suárez', 'Segunda línea'],
  [19, 'Nicolás Galvis', 'Ala'], [20, 'Juan Rojas', 'Medio scrum'], [21, 'Samuel Parada', 'Apertura'],
  [22, 'Esteban Mora', 'Centro'], [23, 'Tomás Ibarra', 'Wing'],
];

// Head coach de prueba asociado al entrenador. Su clave sigue las mismas reglas que seed.js.
async function asegurarHeadCoach(client) {
  const usuario = { nombre: 'Head Coach Demo', email: 'headcoach@dtdeportivo.com', rol: 'head_coach' };
  informar(usuario, await crearUsuario(client, usuario));
  const { rows: [hc] } = await client.query(
    `UPDATE usuarios SET rol = 'head_coach' WHERE email = $1 RETURNING id`, [usuario.email]);
  await client.query(
    `UPDATE usuarios SET head_coach_id = $1
     WHERE id = (SELECT id FROM usuarios WHERE rol = 'entrenador' ORDER BY id LIMIT 1)`, [hc.id]);
}

async function run() {
  const client = await pool.connect();
  try {
    await asegurarHeadCoach(client);
    const { rows: existe } = await client.query('SELECT id FROM equipos WHERE nombre = $1', [EQUIPO]);
    if (existe.length) { console.log('ℹ️  El plantel de demostración ya existe; solo se verificó el head coach de prueba.'); return; }

    await client.query('BEGIN');
    const { rows: [rugby] } = await client.query(
      `INSERT INTO disciplinas (nombre) VALUES ('Rugby') ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`);
    const { rows: [equipo] } = await client.query(
      `INSERT INTO equipos (nombre, categoria, disciplina_id) VALUES ($1, 'Primera', $2) RETURNING id`, [EQUIPO, rugby.id]);
    const { rows: entrenador } = await client.query(`SELECT id FROM usuarios WHERE rol = 'entrenador' ORDER BY id LIMIT 1`);
    const { rows: salud } = await client.query(`SELECT id FROM usuarios WHERE rol = 'personal_salud' ORDER BY id LIMIT 1`);
    const entrenadorId = entrenador[0]?.id || null;
    const saludId = salud[0]?.id || null;

    const ids = {};
    for (const [dorsal, nombre, posicion] of JUGADORES) {
      const { rows: [j] } = await client.query(
        `INSERT INTO jugadores (nombre, edad, posicion, dorsal, equipo_id, disciplina_id, entrenador_id, genero)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'masculino') RETURNING id`,
        [nombre, 19 + (dorsal % 9), posicion, dorsal, equipo.id, rugby.id, entrenadorId]);
      ids[dorsal] = j.id;
    }

    // Lesiones activas (con seguimiento y retorno estimado)
    const lesiones = [[2, 'Esguince de tobillo', 9, 10], [14, 'Desgarro de isquiotibial', 15, 6], [22, 'Contusión de hombro', 4, 12]];
    for (const [dorsal, tipo, haceDias, retornoEnDias] of lesiones) {
      const { rows: [l] } = await client.query(
        `INSERT INTO lesiones (jugador_id, tipo, descripcion, fecha_inicio) VALUES ($1, $2, 'Registrada en entrenamiento', CURRENT_DATE - $3::int) RETURNING id`,
        [ids[dorsal], tipo, haceDias]);
      await client.query(
        `INSERT INTO seguimiento_lesiones (lesion_id, gravedad, evolucion, fecha_seguimiento, fecha_retorno_estimada, estado, profesional_id)
         VALUES ($1, 'moderada', 'Evolución favorable', CURRENT_DATE - 1, CURRENT_DATE + $2::int, 'en_recuperacion', $3)`,
        [l.id, retornoEnDias, saludId]);
    }

    // Controles médicos: dos con restricciones, uno vencido, el resto apto
    for (const [dorsal] of JUGADORES) {
      let aptitud = 'apto', restricciones = null, proxima = 'CURRENT_DATE + 60';
      if (dorsal === 7) { aptitud = 'apto_restricciones'; restricciones = 'Sin contacto en el scrum por 5 días'; }
      if (dorsal === 18) { aptitud = 'apto_restricciones'; restricciones = 'Máximo 40 minutos de juego'; }
      if (dorsal === 10) proxima = 'CURRENT_DATE - 3';
      await client.query(
        `INSERT INTO controles_medicos (jugador_id, fecha, proxima_fecha, tipo, aptitud, restricciones, profesional_id)
         VALUES ($1, CURRENT_DATE - 20, ${proxima}, 'Control precompetitivo', $2, $3, $4)`,
        [ids[dorsal], aptitud, restricciones, saludId]);
    }

    // Entrenamientos pasados con asistencia
    const pasados = [[8, 'Resistencia', 21], [6, 'Fuerza', 20], [3, 'Táctica', 18], [1, 'Resistencia', 22]];
    for (const [haceDias, tipo, presentes] of pasados) {
      const { rows: [e] } = await client.query(
        `INSERT INTO entrenamientos (fecha, tipo, descripcion, equipo_id, hora, lugar)
         VALUES (CURRENT_DATE - $1::int, $2, 'Sesión del plantel de rugby', $3, '17:30', 'Cancha sintética') RETURNING id`,
        [haceDias, tipo, equipo.id]);
      for (const [dorsal] of JUGADORES) {
        await client.query(
          'INSERT INTO asistencia_entrenamiento (jugador_id, entrenamiento_id, asistencia) VALUES ($1, $2, $3)',
          [ids[dorsal], e.id, dorsal <= presentes]);
      }
    }

    // Próximos días: partido y entrenamientos
    await client.query(`INSERT INTO partidos (fecha, rival, tipo, equipo_id, hora, lugar)
      VALUES (CURRENT_DATE + 1, 'Deportivo Sur', 'liga', $1, '15:00', 'Estadio General Santander')`, [equipo.id]);
    await client.query(`INSERT INTO entrenamientos (fecha, tipo, descripcion, equipo_id, hora, lugar) VALUES
      (CURRENT_DATE + 2, 'Fuerza y recuperación', 'Trabajo de fuerza y movilidad', $1, '06:00', 'Gimnasio'),
      (CURRENT_DATE + 4, 'Táctica: salidas y line-out', 'Salidas de juego y line-out', $1, '17:30', 'Cancha sintética'),
      (CURRENT_DATE + 6, 'Resistencia', 'Intervalos de resistencia', $1, '17:30', 'Pista atlética')`, [equipo.id]);

    // Estadísticas de anotación
    // v2.1: con las métricas propias del rugby (tries, conversiones, penales, pases de try, tackles, minutos)
    for (const [dorsal, tries, conv, pen, pases, tackles] of [
      [10, 1, 6, 3, 2, 5], [11, 3, 0, 0, 1, 4], [15, 2, 0, 0, 1, 6], [9, 1, 0, 0, 3, 7], [12, 1, 0, 0, 1, 9],
      [10, 0, 3, 2, 2, 4], [11, 2, 0, 0, 0, 3], [6, 0, 0, 0, 0, 14], [7, 1, 0, 0, 0, 12], [2, 0, 0, 0, 0, 11]]) {
      const metricas = { tries, conversiones: conv, penales: pen, drops: 0, pases_try: pases, tackles, minutos: 80 };
      await client.query(
        `INSERT INTO estadisticas_jugador (jugador_id, goles, asistencias, minutos_jugados, metricas) VALUES ($1, $2, $3, 80, $4)`,
        [ids[dorsal], tries, pases, metricas]);
    }

    // El usuario jugador de prueba queda vinculado al #9
    await client.query(`UPDATE usuarios SET jugador_id = $1 WHERE email = 'jugador@dtdeportivo.com'`, [ids[9]]);

    await client.query('COMMIT');
    console.log(`✅  Datos de demostración creados: ${JUGADORES.length} jugadores en "${EQUIPO}".`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('❌ ', err.message); process.exitCode = 1; });
