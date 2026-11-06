const pool = require('../config/db');

const { responderError } = require('../utils/errores');
const { puedeVerJugador } = require('../utils/alcance');
const calculateAnthropometry = (data, genero = 'masculino') => {
  const {
    peso, estatura,
    pliegue_biceps, pliegue_triceps, pliegue_subescapular, pliegue_suprailiaco,
    pliegue_supraespinal, pliegue_abdominal, pliegue_muslo_anterior, pliegue_pierna_medial,
    perimetro_brazo_contraido, perimetro_brazo_relajado, perimetro_pierna,
    diametro_humero, diametro_femur,
  } = data;

  const numPeso = Number(peso) || 0;
  const numEstatura = Number(estatura) || 0;
  const estaturaCm = numEstatura > 3 ? numEstatura : numEstatura * 100;
  const estaturaM = numEstatura > 3 ? numEstatura / 100 : numEstatura;

  // 1. IMC
  const imc = (numPeso > 0 && estaturaM > 0) ? Number((numPeso / Math.pow(estaturaM, 2)).toFixed(2)) : (data.imc ? Number(data.imc) : null);

  // 2. Pliegues
  const pt = Number(pliegue_triceps || 0);
  const pse = Number(pliegue_subescapular || 0);
  const psp = Number(pliegue_supraespinal || 0);
  const pb = Number(pliegue_biceps || 0);
  const psi = Number(pliegue_suprailiaco || 0);
  const pab = Number(pliegue_abdominal || 0);
  const pma = Number(pliegue_muslo_anterior || 0);
  const ppm = Number(pliegue_pierna_medial || 0);

  const sum3 = pt + pse + psp;
  const sum6 = pt + pse + psp + pab + pma + ppm;
  const sumAll = pb + pt + pse + psi + psp + pab + pma + ppm;

  // 3. Somatotipo Heath-Carter
  let endo = 0, meso = 0, ecto = 0, xSomato = 0, ySomato = 0;
  if (numPeso > 0 && estaturaCm > 0) {
    if (sum3 > 0) {
      const sum3Corrected = sum3 * (170.18 / estaturaCm);
      endo = -0.7182 + (0.1451 * sum3Corrected) - (0.00068 * sum3Corrected ** 2) + (0.0000014 * sum3Corrected ** 3);
    }
    const brazoCorr = (Number(perimetro_brazo_contraido || perimetro_brazo_relajado || 0)) - (pt / 10);
    const piernaCorr = (Number(perimetro_pierna || 0)) - (ppm / 10);
    const dHum = Number(diametro_humero || 6.8);
    const dFem = Number(diametro_femur || 9.5);

    meso = (0.858 * dHum) + (0.601 * dFem) + (0.188 * brazoCorr) + (0.161 * piernaCorr) - (0.131 * estaturaCm) + 4.5;

    const HWR = estaturaCm / Math.pow(numPeso, 1 / 3);
    ecto = HWR >= 40.75 ? (0.732 * HWR) - 28.58 : HWR > 38.25 ? (0.463 * HWR) - 17.63 : 0.1;

    endo = Math.max(0.1, Number(endo.toFixed(2)));
    meso = Math.max(0.1, Number(meso.toFixed(2)));
    ecto = Math.max(0.1, Number(ecto.toFixed(2)));
    xSomato = Number((ecto - endo).toFixed(2));
    ySomato = Number(((2 * meso) - (endo + ecto)).toFixed(2));
  }

  // 4. % Grasa Corporal
  let calcGrasa = data.porcentaje_grasa ? Number(data.porcentaje_grasa) : null;
  const isFemale = genero === 'femenino' || genero === 'f';
  if (!calcGrasa) {
    if (sum6 > 0 && pt > 0 && pse > 0 && pab > 0) {
      calcGrasa = isFemale ? (0.1548 * sum6) + 3.580 : (0.1051 * sum6) + 2.585;
    } else if ((pt + pse + (psp || psi) + pab) > 0 && pt > 0 && pab > 0) {
      calcGrasa = 5.783 + (0.153 * (pt + pse + (psp || psi) + pab));
    } else if (sum3 > 0 && pt > 0 && pse > 0) {
      calcGrasa = (0.153 * sum3) + 5.5;
    }
  }
  if (calcGrasa) {
    calcGrasa = Number(Math.max(3.0, Math.min(55.0, calcGrasa)).toFixed(1));
  }

  // 5. Masa Ósea (kg)
  let calcOsea = data.masa_mineral_osea ? Number(data.masa_mineral_osea) : null;
  if (!calcOsea && numPeso > 0) {
    const dh = Number(diametro_humero || 0);
    const df = Number(diametro_femur || 0);
    if (estaturaM > 0 && dh > 0 && df > 0) {
      calcOsea = 3.02 * Math.pow(Math.pow(estaturaM, 2) * (dh / 100) * (df / 100) * 400, 0.712);
    } else {
      calcOsea = numPeso * 0.145;
    }
    calcOsea = Number(calcOsea.toFixed(2));
  }

  // 6. Masa Residual y Masa Muscular Esquelética (kg)
  let calcMusculo = data.masa_muscular_esqueletica ? Number(data.masa_muscular_esqueletica) : null;
  if (!calcMusculo && numPeso > 0 && calcGrasa && calcOsea) {
    const masaGrasaKg = (numPeso * calcGrasa) / 100;
    const masaResidual = numPeso * (isFemale ? 0.209 : 0.240);
    const masaMusc = numPeso - (masaGrasaKg + calcOsea + masaResidual);
    calcMusculo = Number(Math.max(10, masaMusc).toFixed(2));
  }

  return {
    imc: imc || data.imc || null,
    porcentaje_grasa: calcGrasa || data.porcentaje_grasa || null,
    masa_mineral_osea: calcOsea || data.masa_mineral_osea || null,
    masa_muscular_esqueletica: calcMusculo || data.masa_muscular_esqueletica || null,
    endomorfia: endo,
    mesomorfia: meso,
    ectomorfia: ecto,
    x_somatocarta: xSomato,
    y_somatocarta: ySomato,
    sumatoria_pliegues: Number(sumAll.toFixed(1)),
  };
};

// Columnas que se pueden escribir en la tabla antropometria.
// Cualquier otra clave del body se descarta (evita errores e inyección SQL en los nombres de columna).
const COLUMNAS = [
  'jugador_id', 'fecha', 'peso', 'estatura', 'imc',
  'pliegue_biceps', 'pliegue_triceps', 'pliegue_subescapular', 'pliegue_suprailiaco',
  'pliegue_supraespinal', 'pliegue_abdominal', 'pliegue_muslo_anterior', 'pliegue_pierna_medial',
  'perimetro_brazo_relajado', 'perimetro_brazo_contraido', 'perimetro_muslo_medio', 'perimetro_pierna',
  'diametro_humero', 'diametro_muneca', 'diametro_femur',
  'porcentaje_grasa', 'masa_muscular_esqueletica', 'masa_mineral_osea', 'sumatoria_pliegues',
  'posicion_rugby', 'categoria', 'grupo',
  'endomorfia', 'mesomorfia', 'ectomorfia', 'x_somatocarta', 'y_somatocarta',
];

const soloColumnas = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => COLUMNAS.includes(k)));

const generoDelJugador = async (jugadorId) => {
  if (!jugadorId) return 'masculino';
  const { rows } = await pool.query('SELECT genero FROM jugadores WHERE id = $1', [jugadorId]);
  return rows[0]?.genero || 'masculino';
};

const getAntropometriaByJugador = async (req, res) => {
  try {
    // Solo quien puede ver al deportista accede a sus medidas (DEF-029)
    if (!(await puedeVerJugador(pool, req.usuario, req.params.id))) {
      return res.status(404).json({ error: 'Deportista no encontrado o fuera de tu alcance.' });
    }
    const { rows } = await pool.query(
      'SELECT * FROM antropometria WHERE jugador_id = $1 ORDER BY fecha DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    responderError(res, err);
  }
};

const createAntropometria = async (req, res) => {
  try {
    const data = soloColumnas(req.body);
    for (const key in data) if (data[key] === '') data[key] = null;

    const genero = await generoDelJugador(data.jugador_id);
    const calculated = calculateAnthropometry(data, genero);
    const fields = soloColumnas({ ...data, ...calculated });
    const keys   = Object.keys(fields);
    const vals   = Object.values(fields);
    const params = keys.map((_, i) => `$${i + 1}`).join(', ');

    const { rows } = await pool.query(
      `INSERT INTO antropometria (${keys.join(', ')}) VALUES (${params}) RETURNING id`,
      vals
    );
    res.status(201).json({ id: rows[0].id, ...fields });
  } catch (err) {
    responderError(res, err);
  }
};

const updateAntropometria = async (req, res) => {
  try {
    const data = soloColumnas(req.body);
    for (const key in data) if (data[key] === '') data[key] = null;

    const genero = await generoDelJugador(data.jugador_id);
    const calculated = calculateAnthropometry(data, genero);
    const fields = soloColumnas({ ...data, ...calculated });
    const keys   = Object.keys(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const vals = [...Object.values(fields), req.params.id];

    await pool.query(
      `UPDATE antropometria SET ${setClause} WHERE id = $${vals.length}`,
      vals
    );
    res.json({ message: 'Registro actualizado correctamente', ...fields });
  } catch (err) {
    responderError(res, err);
  }
};

const deleteAntropometria = async (req, res) => {
  try {
    await pool.query('DELETE FROM antropometria WHERE id = $1', [req.params.id]);
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (err) {
    responderError(res, err);
  }
};

module.exports = { getAntropometriaByJugador, createAntropometria, updateAntropometria, deleteAntropometria };
