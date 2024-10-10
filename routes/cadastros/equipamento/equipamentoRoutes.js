const { Router } = require('express');
const equipamentoRoutes = Router();
const { configureMulterMiddleware } = require('../../../config/uploads');

const EquipamentoController = require('../../../controllers/cadastros/equipamento/equipamentoController');
const equipamentoController = new EquipamentoController();

const route = '/equipamento';

equipamentoRoutes.post(`${route}`, equipamentoController.getList);
equipamentoRoutes.post(`${route}/getData/:id`, equipamentoController.getData);

equipamentoRoutes.post(`${route}/updateData/:id`, equipamentoController.updateData);
equipamentoRoutes.post(`${route}/new/insertData`, equipamentoController.insertData);
equipamentoRoutes.delete(`${route}/:id/:unidadeID/:usuarioID`, equipamentoController.deleteData);
equipamentoRoutes.post(`${route}/getEquipamentos`, equipamentoController.getEquipamentos);

//? MULTER: Upload de arquivo
equipamentoRoutes.delete(`${route}/photo/:id/:unidadeID/:usuarioID`, equipamentoController.deletePhoto);
equipamentoRoutes.post(`${route}/photo/:id/:unidadeID/:usuarioID`, (req, res, next) => {
    const pathDestination = `uploads/${req.params.unidadeID}/equipamento/`
    req.pathDestination = pathDestination
    configureMulterMiddleware(req, res, next, req.params.usuarioID, req.params.unidadeID, pathDestination)
}, equipamentoController.updatePhoto);

module.exports = equipamentoRoutes;