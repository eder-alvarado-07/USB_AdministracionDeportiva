const router = require('express').Router();
const ctrl   = require('../controllers/antropometria.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

router.get('/jugador/:id',  ctrl.getAntropometriaByJugador);
router.post('/',            autorizar('administrador', 'entrenador', 'personal_salud'), ctrl.createAntropometria);
router.put('/:id',          autorizar('administrador', 'entrenador', 'personal_salud'), ctrl.updateAntropometria);
router.delete('/:id',       autorizar('administrador', 'entrenador', 'personal_salud'), ctrl.deleteAntropometria);

module.exports = router;
