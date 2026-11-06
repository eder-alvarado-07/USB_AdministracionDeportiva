const { Router } = require('express');
const { getTeamSettings, uploadTeamLogo, uploadMiddleware } = require('../controllers/settings.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

const router = Router();

router.get('/team',       verificarToken, getTeamSettings);
router.post('/team/logo', verificarToken, autorizar('administrador'), uploadMiddleware, uploadTeamLogo);

module.exports = router;
