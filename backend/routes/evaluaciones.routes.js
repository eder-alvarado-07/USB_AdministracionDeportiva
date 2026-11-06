const router = require('express').Router();
const ctrl   = require('../controllers/evaluaciones.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

router.get('/',       ctrl.getAll);
router.post('/',      autorizar('administrador', 'entrenador', 'personal_salud'), ctrl.create);
router.delete('/:id', autorizar('administrador', 'entrenador', 'personal_salud'), ctrl.remove);

module.exports = router;
