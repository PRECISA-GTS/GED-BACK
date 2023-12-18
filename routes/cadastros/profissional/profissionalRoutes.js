const { Router } = require('express');

const ProfissionalController = require('../../../controllers/cadastros/profissional/profissionalController');
const profissionalController = new ProfissionalController();


const { configureMulterMiddleware } = require('../../../config/uploads');

const profissionalRoutes = Router();
const route = '/profissional';

profissionalRoutes.get(`${route}`, profissionalController.getList);
profissionalRoutes.post(`${route}/getData/:id`, profissionalController.getData);
profissionalRoutes.post(`${route}/new/getData`, profissionalController.getNewData);

// troca de senha
profissionalRoutes.put(`${route}/updatePassword/:id`, profissionalController.updatePassword);

// Copia permissões de outro usuário
profissionalRoutes.post(`${route}/copyPermissions`, profissionalController.copyPermissions);

profissionalRoutes.post(`${route}/updateData/:id`, profissionalController.updateData);
profissionalRoutes.post(`${route}/verifyCPF`, profissionalController.verifyCPF);
profissionalRoutes.post(`${route}/getProfissionaisAssinatura`, profissionalController.getProfissionaisAssinatura);

profissionalRoutes.delete(`${route}/photo-profile/:id/:unidadeID/:usuarioID`, profissionalController.handleDeleteImage);
profissionalRoutes.delete(`${route}/:id/:unidadeID/:usuarioID`, profissionalController.deleteData);
profissionalRoutes.post(`${route}/new/insertData`, profissionalController.insertData);

//? MULTER: Upload de arquivo
profissionalRoutes.post(`${route}/photo-profile/:id/:unidadeID/:usuarioID`, (req, res, next) => {
    const pathDestination = `uploads/${req.params.unidadeID}/profissional/`
    req.pathDestination = pathDestination
    configureMulterMiddleware(req, res, next, req.params.usuarioID, req.params.unidadeID, pathDestination)
}, profissionalController.updatePhotoProfile);

module.exports = profissionalRoutes;
