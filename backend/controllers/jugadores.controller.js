const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');
const multer = require('multer');

const { responderError } = require('../utils/errores');
const { UPLOADS_DIR } = require('../config/archivos');
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(Object.assign(new Error('Formato no permitido'), { status: 400 }));
  },
});

exports.uploadMiddleware = upload.single('foto');

exports.uploadPhoto = async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  try {
    let foto_url;
    try {
      const dir = path.join(UPLOADS_DIR, 'players');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
      const filename = `player-${id || Date.now()}${ext}`;
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      foto_url = `/uploads/players/${filename}`;
    } catch (diskErr) {
      foto_url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    await db.query('UPDATE jugadores SET foto_url = $1 WHERE id = $2', [foto_url, id]);
    res.json({ foto_url });
  } catch (err) {
    console.error('Error al actualizar foto del jugador:', err);
    responderError(res, err);
  }
};

// GET /api/jugadores
exports.getAll = async (req, res) => {
  try {
    const { disciplina_id, equipo_id, entrenador_id, posicion, edad_min, edad_max } = req.query;

    // Si es jugador, solo devuelve su propio registro
    if (req.usuario?.rol === 'jugador') {
      const { rows } = await db.query(
        `SELECT j.*, COALESCE(date_part('year', age(j.fecha_nacimiento))::int, j.edad) AS edad, eq.nombre AS equipo_nombre, d.nombre AS disciplina_nombre
         FROM jugadores j
         LEFT JOIN equipos eq ON j.equipo_id = eq.id
         LEFT JOIN disciplinas d ON j.disciplina_id = d.id
         WHERE j.id = $1`,
        [req.usuario.jugador_id]
      );
      return res.json(rows);
    }

    let query = `
      SELECT j.*, COALESCE(date_part('year', age(j.fecha_nacimiento))::int, j.edad) AS edad, eq.nombre AS equipo_nombre, d.nombre AS disciplina_nombre, u.nombre AS entrenador_nombre
      FROM jugadores j
      LEFT JOIN equipos eq ON j.equipo_id = eq.id
      LEFT JOIN disciplinas d ON j.disciplina_id = d.id
      LEFT JOIN usuarios u ON u.id = j.entrenador_id
    `;
    const params = [];
    const conditions = [];

    // Los entrenadores solo consultan deportistas asignados a ellos.
    if (req.usuario?.rol === 'entrenador') {
      params.push(req.usuario.id);
      conditions.push(`j.entrenador_id = $${params.length}`);
    }
    // Head Coach consulta únicamente los deportistas de sus entrenadores asociados.
    if (req.usuario?.rol === 'head_coach') {
      params.push(req.usuario.id);
      conditions.push(`j.entrenador_id IN (SELECT id FROM usuarios WHERE head_coach_id = $${params.length})`);
    }
    if (disciplina_id && disciplina_id !== 'todos') { params.push(disciplina_id); conditions.push(`j.disciplina_id = $${params.length}`); }
    if (equipo_id && equipo_id !== 'todos') { params.push(equipo_id); conditions.push(`j.equipo_id = $${params.length}`); }
    if (entrenador_id && ['administrador','personal_salud','head_coach'].includes(req.usuario?.rol)) { params.push(entrenador_id); conditions.push(`j.entrenador_id = $${params.length}`); }
    if (posicion) { params.push(`%${posicion}%`); conditions.push(`j.posicion ILIKE $${params.length}`); }
    if (edad_min !== undefined && edad_min !== '') { params.push(Number(edad_min)); conditions.push(`COALESCE(date_part('year', age(j.fecha_nacimiento))::int, j.edad) >= $${params.length}`); }
    if (edad_max !== undefined && edad_max !== '') { params.push(Number(edad_max)); conditions.push(`COALESCE(date_part('year', age(j.fecha_nacimiento))::int, j.edad) <= $${params.length}`); }
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;

    query += ` ORDER BY j.nombre ASC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    responderError(res, err);
  }
};

// GET /api/jugadores/:id
exports.getOne = async (req, res) => {
  try {
    const { rows: playerRows } = await db.query(
      `SELECT j.*, COALESCE(date_part('year', age(j.fecha_nacimiento))::int, j.edad) AS edad, eq.nombre AS equipo_nombre, d.nombre AS disciplina_nombre
       FROM jugadores j
       LEFT JOIN equipos eq ON j.equipo_id = eq.id
       LEFT JOIN disciplinas d ON j.disciplina_id = d.id
       WHERE j.id = $1`,
      [req.params.id]
    );
    if (!playerRows.length) return res.status(404).json({ error: 'Jugador no encontrado' });

    const player = playerRows[0];
    if (req.usuario?.rol === 'jugador' && Number(player.id) !== Number(req.usuario.jugador_id)) {
      return res.status(403).json({ error: 'Solo puedes consultar tu propio perfil' });
    }
    if (req.usuario?.rol === 'entrenador' && Number(player.entrenador_id) !== Number(req.usuario.id)) {
      return res.status(403).json({ error: 'Solo puedes consultar deportistas asignados a ti' });
    }
    if (req.usuario?.rol === 'head_coach') {
      const { rows: linked } = await db.query('SELECT id FROM usuarios WHERE id=$1 AND head_coach_id=$2', [player.entrenador_id, req.usuario.id]);
      if (!linked.length) return res.status(403).json({ error: 'Este deportista no pertenece a tus entrenadores asociados' });
    }

    const { rows: antroRows } = await db.query(
      'SELECT * FROM antropometria WHERE jugador_id = $1 ORDER BY fecha DESC LIMIT 1',
      [req.params.id]
    );
    player.ultima_antropometria = antroRows[0] || null;

    const { rows: evalRows } = await db.query(
      'SELECT * FROM evaluaciones_rugby WHERE jugador_id = $1 ORDER BY fecha DESC LIMIT 1',
      [req.params.id]
    );
    player.ultima_evaluacion = evalRows[0] || null;

    res.json(player);
  } catch (err) {
    responderError(res, err);
  }
};

// ── Dorsal (número de camiseta) ───────────────────────────
// Valor permitido: entero de 0 a 99, o vacío para quitarlo.
function normalizarDorsal(valor) {
  if (valor === undefined || valor === null || valor === '') return { ok: true, valor: null };
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0 || n > 99) {
    return { ok: false, error: 'El dorsal debe ser un número entero entre 0 y 99' };
  }
  return { ok: true, valor: n };
}

// Si PostgreSQL rechaza el dorsal por estar ocupado en el equipo, responde 409 con quién lo tiene.
async function responderDorsalOcupado(err, res, { dorsal, equipo_id }) {
  if (err.code !== '23505' || !String(err.constraint || '').includes('dorsal')) return false;
  let quien = 'otro jugador';
  if (equipo_id && dorsal !== null && dorsal !== undefined) {
    const { rows } = await db.query(
      'SELECT nombre FROM jugadores WHERE equipo_id = $1 AND dorsal = $2 LIMIT 1', [equipo_id, dorsal]
    );
    if (rows.length) quien = rows[0].nombre;
  }
  res.status(409).json({ error: `El dorsal ${dorsal} ya lo usa ${quien} en este equipo. Elige otro número.` });
  return true;
}

// Entrenador y head coach solo modifican deportistas que les pertenecen.
async function verificarPermisoEscritura(req, jugadorId, accion = 'modificar') {
  const { rows } = await db.query('SELECT id, entrenador_id, equipo_id, dorsal FROM jugadores WHERE id = $1', [jugadorId]);
  if (!rows.length) return { status: 404, error: 'Jugador no encontrado' };
  const jugador = rows[0];
  const rol = req.usuario?.rol;
  if (rol === 'jugador') return { status: 403, error: `No tienes permiso para ${accion} este deportista` };
  if (rol === 'entrenador' && Number(jugador.entrenador_id) !== Number(req.usuario.id)) {
    return { status: 403, error: `No tienes permiso para ${accion} este deportista` };
  }
  if (rol === 'head_coach') {
    const { rows: linked } = await db.query('SELECT id FROM usuarios WHERE id = $1 AND head_coach_id = $2', [jugador.entrenador_id, req.usuario.id]);
    if (!linked.length) return { status: 403, error: 'Este deportista no pertenece a tus entrenadores asociados' };
  }
  return { jugador };
}

// POST /api/jugadores
exports.create = async (req, res) => {
  const { nombre, posicion, peso, altura, equipo_id, disciplina_id } = req.body;
  let { edad } = req.body;
  const fecha_nacimiento = req.body.fecha_nacimiento ? String(req.body.fecha_nacimiento).slice(0, 10) : null;
  if (fecha_nacimiento && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento) || fecha_nacimiento > new Date().toISOString().slice(0, 10))) {
    return res.status(400).json({ error: 'La fecha de nacimiento no es válida.' });
  }
  if (fecha_nacimiento) edad = null;
  const genero = ['masculino', 'femenino'].includes(req.body.genero) ? req.body.genero : null;
  const entrenador_id = req.usuario?.rol === 'entrenador' ? req.usuario.id : (req.body.entrenador_id || null);
  if (!nombre || !String(nombre).trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const dorsal = normalizarDorsal(req.body.dorsal);
  if (!dorsal.ok) return res.status(400).json({ error: dorsal.error });

  try {
    const { rows } = await db.query(
      `INSERT INTO jugadores (nombre, edad, posicion, peso, altura, equipo_id, disciplina_id, entrenador_id, dorsal, fecha_nacimiento, genero)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [String(nombre).trim(), edad || null, posicion || null, peso || null, altura || null,
       equipo_id || null, disciplina_id || null, entrenador_id, dorsal.valor, fecha_nacimiento, genero]
    );
    res.status(201).json({ id: rows[0].id, nombre, edad, posicion, peso, altura, equipo_id, disciplina_id, dorsal: dorsal.valor });
  } catch (err) {
    if (await responderDorsalOcupado(err, res, { dorsal: dorsal.valor, equipo_id })) return;
    responderError(res, err);
  }
};

// POST /api/jugadores/bulk
// Importación masiva desde CSV
exports.bulkCreate = async (req, res) => {
  const { deportistas } = req.body;
  if (!Array.isArray(deportistas) || deportistas.length === 0) {
    return res.status(400).json({ error: 'Se requiere una lista de deportistas' });
  }

  try {
    const client = await db.connect();
    const inserted = [];
    const errors = [];
    const avisos = [];

    try {
      await client.query('BEGIN');

      for (let i = 0; i < deportistas.length; i++) {
        const item = deportistas[i];
        const nombre = item.nombre ? item.nombre.trim() : '';
        if (!nombre) {
          errors.push({ fila: i + 1, error: 'Nombre vacío' });
          continue;
        }

        let disciplina_id = item.disciplina_id || null;
        // Si viene nombre de deporte o disciplina por texto, buscarla o crearla
        if (!disciplina_id && item.deporte) {
          const depName = item.deporte.trim();
          const { rows: dRows } = await client.query('SELECT id FROM disciplinas WHERE LOWER(nombre) = LOWER($1)', [depName]);
          if (dRows.length > 0) {
            disciplina_id = dRows[0].id;
          } else {
            const { rows: newD } = await client.query('INSERT INTO disciplinas (nombre) VALUES ($1) RETURNING id', [depName]);
            disciplina_id = newD[0].id;
          }
        }

        let equipo_id = item.equipo_id || null;
        if (!equipo_id && item.equipo) {
          const eqName = item.equipo.trim();
          const { rows: eRows } = await client.query('SELECT id FROM equipos WHERE LOWER(nombre) = LOWER($1)', [eqName]);
          if (eRows.length > 0) {
            equipo_id = eRows[0].id;
          } else {
            const { rows: newE } = await client.query('INSERT INTO equipos (nombre) VALUES ($1) RETURNING id', [eqName]);
            equipo_id = newE[0].id;
          }
        }

        const edad = item.edad ? parseInt(item.edad, 10) : null;
        const peso = item.peso ? parseFloat(item.peso) : null;
        const altura = item.altura ? parseFloat(item.altura) : null;
        const posicion = item.posicion ? item.posicion.trim() : null;

        // Dorsal opcional: si es inválido o ya está ocupado en el equipo, se importa sin dorsal y se avisa
        let { ok, valor: dorsal } = normalizarDorsal(item.dorsal);
        if (!ok) {
          avisos.push({ fila: i + 1, aviso: `Dorsal "${item.dorsal}" no válido (0 a 99): ${nombre} se importó sin dorsal` });
          dorsal = null;
        } else if (dorsal !== null && equipo_id) {
          const { rows: ocupado } = await client.query(
            'SELECT nombre FROM jugadores WHERE equipo_id = $1 AND dorsal = $2 LIMIT 1', [equipo_id, dorsal]
          );
          if (ocupado.length) {
            avisos.push({ fila: i + 1, aviso: `El dorsal ${dorsal} ya lo usa ${ocupado[0].nombre}: ${nombre} se importó sin dorsal` });
            dorsal = null;
          }
        }

        const { rows } = await client.query(
          `INSERT INTO jugadores (nombre, edad, posicion, peso, altura, equipo_id, disciplina_id, dorsal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [nombre, isNaN(edad) ? null : edad, posicion, isNaN(peso) ? null : peso, isNaN(altura) ? null : altura, equipo_id, disciplina_id, dorsal]
        );

        inserted.push({ id: rows[0].id, nombre, posicion, disciplina_id, equipo_id, dorsal });
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.status(201).json({
      message: `Se importaron ${inserted.length} deportistas correctamente`,
      total: inserted.length,
      insertados: inserted,
      errores: errors,
      avisos,
    });
  } catch (err) {
    responderError(res, err);
  }
};

// PUT /api/jugadores/:id
// Actualización parcial: solo se modifican los campos presentes en el body.
// Así, asignar un equipo desde otra pantalla no borra el dorsal ni el entrenador.
exports.update = async (req, res) => {
  const permitidos = ['nombre', 'edad', 'fecha_nacimiento', 'genero', 'posicion', 'peso', 'altura', 'equipo_id', 'disciplina_id', 'entrenador_id', 'dorsal'];
  const presente = (campo) => Object.prototype.hasOwnProperty.call(req.body, campo);
  const vacioANull = (v) => (v === '' || v === undefined ? null : v);

  try {
    const permiso = await verificarPermisoEscritura(req, req.params.id);
    if (permiso.error) return res.status(permiso.status).json({ error: permiso.error });

    const cambios = {};
    for (const campo of permitidos) if (presente(campo)) cambios[campo] = vacioANull(req.body[campo]);

    if ('nombre' in cambios && !String(cambios.nombre || '').trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if ('nombre' in cambios) cambios.nombre = String(cambios.nombre).trim();
    // Un entrenador no puede reasignar sus deportistas a otro entrenador
    if (req.usuario?.rol === 'entrenador') delete cambios.entrenador_id;
    // v2.0: con fecha de nacimiento, la edad se calcula sola cada vez que se consulta
    if ('fecha_nacimiento' in cambios && cambios.fecha_nacimiento) {
      const f = String(cambios.fecha_nacimiento).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || f > new Date().toISOString().slice(0, 10)) {
        return res.status(400).json({ error: 'La fecha de nacimiento no es válida.' });
      }
      cambios.fecha_nacimiento = f;
      delete cambios.edad;
    }
    if ('genero' in cambios && cambios.genero && !['masculino', 'femenino'].includes(cambios.genero)) delete cambios.genero;
    if ('dorsal' in cambios) {
      const dorsal = normalizarDorsal(cambios.dorsal);
      if (!dorsal.ok) return res.status(400).json({ error: dorsal.error });
      cambios.dorsal = dorsal.valor;
    }

    const campos = Object.keys(cambios);
    if (!campos.length) return res.status(400).json({ error: 'No hay cambios para guardar' });

    const set = campos.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const valores = [...campos.map(c => cambios[c]), req.params.id];
    try {
      await db.query(`UPDATE jugadores SET ${set} WHERE id = $${valores.length}`, valores);
    } catch (err) {
      const equipo_id = 'equipo_id' in cambios ? cambios.equipo_id : permiso.jugador.equipo_id;
      const dorsal = 'dorsal' in cambios ? cambios.dorsal : permiso.jugador.dorsal;
      if (await responderDorsalOcupado(err, res, { dorsal, equipo_id })) return;
      throw err;
    }
    res.json({ message: 'Jugador actualizado correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};

// PATCH /api/jugadores/:id/dorsal
// Cambio rápido del número de camiseta (edición en línea desde la tabla).
exports.updateDorsal = async (req, res) => {
  const dorsal = normalizarDorsal(req.body.dorsal);
  if (!dorsal.ok) return res.status(400).json({ error: dorsal.error });
  try {
    const permiso = await verificarPermisoEscritura(req, req.params.id);
    if (permiso.error) return res.status(permiso.status).json({ error: permiso.error });
    try {
      await db.query('UPDATE jugadores SET dorsal = $1 WHERE id = $2', [dorsal.valor, req.params.id]);
    } catch (err) {
      if (await responderDorsalOcupado(err, res, { dorsal: dorsal.valor, equipo_id: permiso.jugador.equipo_id })) return;
      throw err;
    }
    res.json({ id: Number(req.params.id), dorsal: dorsal.valor, message: dorsal.valor === null ? 'Dorsal quitado' : `Dorsal cambiado a ${dorsal.valor}` });
  } catch (err) {
    responderError(res, err);
  }
};

// DELETE /api/jugadores/:id
exports.remove = async (req, res) => {
  try {
    const permiso = await verificarPermisoEscritura(req, req.params.id, 'eliminar');
    if (permiso.error) return res.status(permiso.status).json({ error: permiso.error });
    const { rowCount } = await db.query('DELETE FROM jugadores WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Jugador no encontrado' });
    res.json({ message: 'Jugador eliminado correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};
