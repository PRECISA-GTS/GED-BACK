const { Router } = require('express');
const apresentacaoRoutes = Router();

const ApresentacaoController = require('../../../controllers/cadastros/apresentacao/apresentacaoController');
const apresentacaoController = new ApresentacaoController();

const route = '/apresentacao';

apresentacaoRoutes.get(`${route}`, apresentacaoController.getList);
apresentacaoRoutes.post(`${route}/getData/:id`, apresentacaoController.getData);

apresentacaoRoutes.post(`${route}/updateData/:id`, apresentacaoController.updateData);
apresentacaoRoutes.post(`${route}/new/insertData`, apresentacaoController.insertData);
apresentacaoRoutes.delete(`${route}/:id/:usuarioID/:unidadeID`, apresentacaoController.deleteData);


module.exports = apresentacaoRoutes;