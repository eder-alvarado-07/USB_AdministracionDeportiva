const router = require('express').Router();
const ctrl   = require('../controllers/jugadores.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

router.get('/',          ctrl.getAll);
router.get('/:id',       ctrl.getOne);
router.post('/bulk',     autorizar('administrador', 'entrenador'), ctrl.bulkCreate);
router.post('/',         autorizar('administrador', 'entrenador'), ctrl.create);
router.post('/:id/foto', autorizar('administrador', 'entrenador'), ctrl.uploadMiddleware, ctrl.uploadPhoto);
router.put('/:id',       autorizar('administrador', 'entrenador'), ctrl.update);
router.patch('/:id/dorsal', autorizar('administrador', 'entrenador'), ctrl.updateDorsal);
router.delete('/:id',    autorizar('administrador', 'entrenador'), ctrl.remove);

module.exports = router;
