const router = require('express').Router();
const ctrl   = require('../controllers/convocatorias.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

router.get('/partido/:id',            ctrl.ver);
router.put('/partido/:id',            autorizar('administrador', 'entrenador'), ctrl.guardar);
router.post('/partido/:id/respuesta', ctrl.responder);
router.get('/partido/:id/historial',  autorizar('administrador', 'entrenador', 'head_coach'), ctrl.historial);

module.exports = router;
