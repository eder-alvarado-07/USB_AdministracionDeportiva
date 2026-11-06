const router = require('express').Router();
const ctrl = require('../controllers/headcoach.controller');
const { verificarToken, autorizar } = require('../middleware/auth');
router.use(verificarToken, autorizar('head_coach'));
router.get('/resumen', ctrl.resumen);
router.get('/entrenadores', ctrl.entrenadores);
router.get('/jugadores', ctrl.jugadores);
module.exports = router;
