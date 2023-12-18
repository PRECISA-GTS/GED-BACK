const { Router } = require('express');
const profissaoRoutes = Router();

const ProfissaoController = require('../../../controllers/cadastros/profissao/profissaoController');
const profissaoController = new ProfissaoController();

const route = '/profissao';

profissaoRoutes.get(`${route}`, profissaoController.getList);
profissaoRoutes.get(`${route}/:id`, profissaoController.getData);
profissaoRoutes.put(`${route}/:id`, profissaoController.updateData);
profissaoRoutes.delete(`${route}/:id`, profissaoController.deleteData);
profissaoRoutes.post(`${route}/novo`, profissaoController.insertData);

module.exports = profissaoRoutes;