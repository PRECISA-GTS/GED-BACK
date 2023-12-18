const { Router } = require('express');
const unidadeRoutes = Router();
const { configureMulterMiddleware } = require('../../../config/uploads');

const UnidadeController = require('../../../controllers/configuracoes/unidade/unidadeController');
const unidadeController = new UnidadeController();

const route = '/unidade';

unidadeRoutes.get(`${route}`, unidadeController.getList);
unidadeRoutes.get(`${route}/:id`, unidadeController.getData);
unidadeRoutes.post(`${route}/updateData/:id`, unidadeController.updateData);
unidadeRoutes.delete(`${route}/fileReport/:id/:usuarioID/:unidadeID`, unidadeController.handleDeleteImage);
unidadeRoutes.delete(`${route}/:id/:usuarioID/:unidadeID`, unidadeController.deleteData);
unidadeRoutes.post(`${route}/new/insertData`, unidadeController.insertData);
//? MULTER: Upload de arquivo
unidadeRoutes.post(`${route}/updateData/report/:id/:usuarioID/:unidadeID`, (req, res, next) => {
    const pathDestination = `uploads/${req.params.id}/unidade/`
    req.pathDestination = pathDestination
    configureMulterMiddleware(req, res, next, req.params.usuarioID, req.params.id, pathDestination)
}, unidadeController.updateDataReport);

module.exports = unidadeRoutes;