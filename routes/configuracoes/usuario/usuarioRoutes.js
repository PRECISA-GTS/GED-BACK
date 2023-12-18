const { Router } = require('express');
const UsuarioController = require('../../../controllers/configuracoes/usuario/usuarioController');

const { configureMulterMiddleware } = require('../../../config/uploads');

const usuarioRoutes = Router();
const usuarioController = new UsuarioController();
const route = '/usuario';

usuarioRoutes.get(`${route}`, usuarioController.getList);
usuarioRoutes.post(`${route}/getData/:id`, usuarioController.getData);
usuarioRoutes.post(`${route}/updateData/:id`, usuarioController.updateData);

usuarioRoutes.delete(`${route}/photo-profile/:id`, usuarioController.handleDeleteImage);
usuarioRoutes.delete(`${route}/:id`, usuarioController.deleteData);
usuarioRoutes.post(`${route}/new/insertData`, usuarioController.insertData);

//? MULTER: Upload de arquivo
usuarioRoutes.post(`${route}/photo-profile/:id/:unidadeID`, (req, res, next) => {
    const isImage = 'true'
    configureMulterMiddleware(req, res, next, req.params.unidadeID, 'uploads/profile', isImage)
}, usuarioController.updatePhotoProfile);

module.exports = usuarioRoutes;
