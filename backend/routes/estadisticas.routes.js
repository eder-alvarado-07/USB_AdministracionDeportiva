const router = require('express').Router();
const ctrl   = require('../controllers/estadisticas.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

// Las estadísticas deportivas no son del campo del personal de salud (v1.9)
const LECTORES = ['administrador', 'head_coach', 'entrenador', 'jugador'];
router.get('/metricas',            autorizar(...LECTORES), ctrl.metricas);
router.get('/',                    autorizar(...LECTORES), ctrl.getAll);
router.get('/jugador/:jugador_id', autorizar(...LECTORES), ctrl.getByJugador);
router.post('/',                   autorizar('administrador', 'entrenador'), ctrl.create);
router.put('/:id',                 autorizar('administrador', 'entrenador'), ctrl.update);
router.delete('/:id',              autorizar('administrador', 'entrenador'), ctrl.remove);

module.exports = router;
