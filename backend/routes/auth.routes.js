const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth');
const { limitarLogin } = require('../middleware/limite');

router.post('/login',             limitarLogin, ctrl.login);
router.post('/refresh',           ctrl.refresh);
router.get('/me',                 verificarToken, ctrl.me);
router.put('/cambiar-password',   verificarToken, ctrl.cambiarPassword);

module.exports = router;
