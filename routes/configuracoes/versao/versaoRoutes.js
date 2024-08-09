const { Router } = require('express');
const versaoRoutes = Router();

const VersaoController = require('../../../controllers/configuracoes/versao/versaoController');
const versaoController = new VersaoController();

const route = '/versao';

versaoRoutes.post(`${route}`, versaoController.getList);
versaoRoutes.post(`${route}/getData/:id`, versaoController.getData);

versaoRoutes.post(`${route}/updateData/:id`, versaoController.updateData);
versaoRoutes.post(`${route}/new/insertData`, versaoController.insertData);
versaoRoutes.delete(`${route}/:id/:unidadeID/:usuarioID`, versaoController.deleteData);

module.exports = versaoRoutes;