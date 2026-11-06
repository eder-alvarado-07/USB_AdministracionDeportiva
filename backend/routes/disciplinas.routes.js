const router = require('express').Router();
const ctrl   = require('../controllers/disciplinas.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

router.get('/',       ctrl.getAll);
router.get('/categorias', ctrl.categorias);
router.post('/:id/categorias', autorizar('administrador'), ctrl.crearCategoria);
router.delete('/categorias/:id', autorizar('administrador'), ctrl.eliminarCategoria);
// Los deportes de la universidad los administra solo el administrador (v1.9)
router.post('/',      autorizar('administrador'), ctrl.create);
router.delete('/:id', autorizar('administrador'), ctrl.remove);

module.exports = router;
