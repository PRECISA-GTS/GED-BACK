const { Router } = require('express');
const equipamentoRoutes = Router();

const EquipamentoController = require('../../../controllers/cadastros/equipamento/equipamentoController');
const equipamentoController = new EquipamentoController();

const route = '/equipamento';

equipamentoRoutes.post(`${route}`, equipamentoController.getList);
equipamentoRoutes.post(`${route}/getData/:id`, equipamentoController.getData);

equipamentoRoutes.post(`${route}/updateData/:id`, equipamentoController.updateData);
equipamentoRoutes.post(`${route}/new/insertData`, equipamentoController.insertData);
equipamentoRoutes.delete(`${route}/:id/:unidadeID/:usuarioID`, equipamentoController.deleteData);
equipamentoRoutes.post(`${route}/getEquipamentos`, equipamentoController.getEquipamentos);

module.exports = equipamentoRoutes;