const router = require('express').Router();
const ctrl   = require('../controllers/comunicados.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

router.get('/',       ctrl.listar);
router.post('/',      autorizar('administrador', 'entrenador'), ctrl.crear);
router.delete('/:id', autorizar('administrador', 'entrenador'), ctrl.eliminar);

module.exports = router;
