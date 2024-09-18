const { Router } = require('express');
const departamentoRoutes = Router();

const DepartamentoController = require('../../../controllers/cadastros/departamento/departamentoController');
const departamentoController = new DepartamentoController();

const route = '/departamento';

departamentoRoutes.post(`${route}`, departamentoController.getList);
departamentoRoutes.post(`${route}/getData/:id`, departamentoController.getData);
departamentoRoutes.post(`${route}/updateData/:id`, departamentoController.updateData);
departamentoRoutes.post(`${route}/new/insertData`, departamentoController.insertData);
departamentoRoutes.delete(`${route}/:id/:unidadeID/:usuarioID`, departamentoController.deleteData);
departamentoRoutes.post(`${route}/getDepartamentosAssinatura`, departamentoController.getDepartamentosAssinatura);
departamentoRoutes.post(`${route}/getProfissionaisDepartamentosAssinatura`, departamentoController.getProfissionaisDepartamentosAssinatura);
departamentoRoutes.post(`${route}/getProfessionals`, departamentoController.getProfessionals);

module.exports = departamentoRoutes;