const router = require('express').Router();
const ctrl   = require('../controllers/asistencia.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

router.get('/',       ctrl.getAll);
router.post('/',      autorizar('administrador', 'entrenador'), ctrl.create);
router.put('/lote',   autorizar('administrador', 'entrenador'), ctrl.lote);
router.put('/:id',   autorizar('administrador', 'entrenador'), ctrl.update);
router.delete('/:id', autorizar('administrador', 'entrenador'), ctrl.remove);

module.exports = router;
