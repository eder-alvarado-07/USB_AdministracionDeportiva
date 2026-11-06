const router  = require('express').Router();
const multer  = require('multer');
const ctrl    = require('../controllers/usuarios.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.use(verificarToken);

router.get('/',            autorizar('administrador'), ctrl.getAll);
router.post('/',           autorizar('administrador'), ctrl.create);
router.put('/:id',         autorizar('administrador'), ctrl.update);
router.put('/:id/reset',   autorizar('administrador'), ctrl.resetPassword);
router.patch('/:id/activar', autorizar('administrador'), ctrl.activar);
router.delete('/:id',      autorizar('administrador'), ctrl.remove);
router.post('/csv',        autorizar('administrador'), upload.single('archivo'), ctrl.createFromCSV);

module.exports = router;
