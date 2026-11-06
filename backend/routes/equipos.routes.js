const router = require('express').Router();
const ctrl   = require('../controllers/equipos.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

// Consulta: administrador, head coach, entrenadores y personal de salud
router.get('/',           autorizar('administrador', 'head_coach', 'entrenador', 'personal_salud'), ctrl.getAll);
router.get('/:id',        autorizar('administrador', 'head_coach', 'entrenador', 'personal_salud'), ctrl.getOne);

// Entrenadores y administrador pueden crear, editar y gestionar imágenes
router.post('/',          autorizar('administrador', 'entrenador'), ctrl.create);
router.put('/:id',        autorizar('administrador', 'entrenador'), ctrl.update);
router.post('/:id/logo',  autorizar('administrador', 'entrenador'), ctrl.uploadMiddleware, ctrl.uploadLogo);
router.delete('/:id',     autorizar('administrador', 'entrenador'), ctrl.remove);

module.exports = router;

