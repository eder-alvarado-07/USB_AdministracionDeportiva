const router = require('express').Router();
const ctrl   = require('../controllers/lesiones.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

// Lectura: cada rol ve solo lo que le corresponde (filtrado en el controlador).
router.get('/',       autorizar('administrador', 'personal_salud', 'head_coach', 'entrenador', 'jugador'), ctrl.getAll);
router.get('/:id',    autorizar('administrador', 'personal_salud', 'head_coach', 'entrenador', 'jugador'), ctrl.getOne);
router.post('/',      autorizar('administrador', 'personal_salud'), ctrl.create);
router.put('/:id',    autorizar('administrador', 'personal_salud'), ctrl.update);
router.delete('/:id', autorizar('administrador', 'personal_salud'), ctrl.remove);

module.exports = router;
