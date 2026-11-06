const router = require('express').Router();
const ctrl   = require('../controllers/dashboard.controller');
const inicio = require('../controllers/inicio.controller');
const { verificarToken } = require('../middleware/auth');

router.get('/', verificarToken, ctrl.getSummary);
router.get('/inicio', verificarToken, inicio.getInicio);

module.exports = router;
