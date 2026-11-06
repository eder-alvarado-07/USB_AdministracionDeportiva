const db = require('../config/db');
const { responderError } = require('../utils/errores');
const { condicionAlcance } = require('../utils/alcance');
const puedeVerSaludCompleta = rol => ['administrador','personal_salud'].includes(rol);

exports.getHistorias = async (req,res) => {
  if (!puedeVerSaludCompleta(req.usuario.rol)) return res.status(403).json({error:'Solo el personal de salud autorizado puede consultar historias clínicas'});
  try { const {rows}=await db.query(`SELECT h.*,j.nombre AS jugador_nombre,j.dorsal AS jugador_dorsal,j.disciplina_id FROM historias_clinicas h JOIN jugadores j ON j.id=h.jugador_id ORDER BY j.nombre`); res.json(rows); }
  catch(e){responderError(res, e);}
};
exports.saveHistoria = async (req,res) => {
  if (!puedeVerSaludCompleta(req.usuario.rol)) return res.status(403).json({error:'Solo el personal de salud autorizado puede modificar historias clínicas'});
  const {jugador_id,antecedentes,alergias,medicamentos,cirugias,enfermedades,historial_deportivo,observaciones}=req.body;
  if(!jugador_id) return res.status(400).json({error:'El deportista es obligatorio'});
  try { const {rows}=await db.query(`INSERT INTO historias_clinicas (jugador_id,antecedentes,alergias,medicamentos,cirugias,enfermedades,historial_deportivo,observaciones,actualizado_por,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)
    ON CONFLICT(jugador_id) DO UPDATE SET antecedentes=EXCLUDED.antecedentes,alergias=EXCLUDED.alergias,medicamentos=EXCLUDED.medicamentos,cirugias=EXCLUDED.cirugias,enfermedades=EXCLUDED.enfermedades,historial_deportivo=EXCLUDED.historial_deportivo,observaciones=EXCLUDED.observaciones,actualizado_por=EXCLUDED.actualizado_por,updated_at=CURRENT_TIMESTAMP RETURNING *`,[jugador_id,antecedentes||null,alergias||null,medicamentos||null,cirugias||null,enfermedades||null,historial_deportivo||null,observaciones||null,req.usuario.id]); res.json(rows[0]); }
  catch(e){responderError(res, e);}
};
exports.getControles = async (req,res) => {
  try {
    // Misma regla de alcance que el resto del sistema (la ruta ya limita los roles; esto es una segunda barrera)
    const params=[];
    const cond=condicionAlcance(req.usuario,params,'j');
    const {rows}=await db.query(`SELECT c.*,j.nombre AS jugador_nombre,j.dorsal AS jugador_dorsal,j.disciplina_id FROM controles_medicos c
      JOIN jugadores j ON j.id=c.jugador_id ${cond?`WHERE ${cond}`:''} ORDER BY c.fecha DESC`,params);
    res.json(rows);
  } catch(e){responderError(res, e);}
};
exports.createControl = async (req,res) => {
  if(!puedeVerSaludCompleta(req.usuario.rol)) return res.status(403).json({error:'Solo personal de salud autorizado puede registrar controles'});
  const {jugador_id,fecha,proxima_fecha,tipo,resultado,restricciones,aptitud}=req.body;
  if(!jugador_id||!tipo) return res.status(400).json({error:'Deportista y tipo de control son obligatorios'});
  try { const {rows}=await db.query(`INSERT INTO controles_medicos(jugador_id,fecha,proxima_fecha,tipo,resultado,restricciones,aptitud,profesional_id) VALUES($1,COALESCE($2::date,CURRENT_DATE),$3,$4,$5,$6,$7,$8) RETURNING *`,[jugador_id,fecha||null,proxima_fecha||null,tipo,resultado||null,restricciones||null,aptitud||'pendiente',req.usuario.id]); res.status(201).json(rows[0]); }
  catch(e){responderError(res, e);}
};
exports.getNotificaciones = async(req,res)=>{try{const {rows}=await db.query('SELECT * FROM notificaciones WHERE usuario_id=$1 ORDER BY created_at DESC LIMIT 100',[req.usuario.id]);res.json(rows);}catch(e){responderError(res, e);}};
exports.leerNotificacion = async(req,res)=>{try{const {rowCount}=await db.query('UPDATE notificaciones SET leida=true WHERE id=$1 AND usuario_id=$2',[req.params.id,req.usuario.id]);if(!rowCount)return res.status(404).json({error:'Notificación no encontrada'});res.json({ok:true});}catch(e){responderError(res, e);}};

exports.getSeguimientos = async (req,res)=>{
 if(!puedeVerSaludCompleta(req.usuario.rol)) return res.status(403).json({error:'Solo personal de salud autorizado puede consultar el detalle clínico de lesiones'});
 try { const {rows}=await db.query(`SELECT s.*,l.jugador_id,j.nombre AS jugador_nombre,j.dorsal AS jugador_dorsal,l.tipo AS lesion_tipo FROM seguimiento_lesiones s JOIN lesiones l ON l.id=s.lesion_id JOIN jugadores j ON j.id=l.jugador_id ORDER BY s.fecha_seguimiento DESC`); res.json(rows); } catch(e){responderError(res, e);}
};
exports.createSeguimiento = async(req,res)=>{
 if(!puedeVerSaludCompleta(req.usuario.rol)) return res.status(403).json({error:'Solo personal de salud autorizado puede registrar seguimientos clínicos'});
 const {lesion_id,zona_corporal,gravedad,diagnostico,tratamiento,evolucion,fecha_seguimiento,fecha_retorno_estimada,fecha_retorno_real,estado}=req.body;
 if(!lesion_id) return res.status(400).json({error:'La lesión es obligatoria'});
 try {const {rows}=await db.query(`INSERT INTO seguimiento_lesiones(lesion_id,zona_corporal,gravedad,diagnostico,tratamiento,evolucion,fecha_seguimiento,fecha_retorno_estimada,fecha_retorno_real,estado,profesional_id) VALUES($1,$2,$3,$4,$5,$6,COALESCE($7::date,CURRENT_DATE),$8,$9,$10,$11) RETURNING *`,[lesion_id,zona_corporal||null,gravedad||null,diagnostico||null,tratamiento||null,evolucion||null,fecha_seguimiento||null,fecha_retorno_estimada||null,fecha_retorno_real||null,estado||'activa',req.usuario.id]);res.status(201).json(rows[0]);}catch(e){responderError(res, e);}
};
