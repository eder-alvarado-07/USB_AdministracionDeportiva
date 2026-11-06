const router = require('express').Router();
const ctrl   = require('../controllers/notificaciones.controller');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/',            ctrl.listar);
router.patch('/leidas',    ctrl.marcarTodas);
router.patch('/:id/leida', ctrl.marcarLeida);

module.exports = router;
