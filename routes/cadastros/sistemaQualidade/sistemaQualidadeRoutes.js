const { Router } = require('express');
const sistemaQualidadeRoutes = Router();

const SistemaQualidadeController = require('../../../controllers/cadastros/sistemaQualidadeController/sistemaQualidadeController');
const sistemaQualidadeController = new SistemaQualidadeController();

const route = '/sistema-qualidade';

sistemaQualidadeRoutes.get(`${route}`, sistemaQualidadeController.getList);
sistemaQualidadeRoutes.post(`${route}/getData/:id`, sistemaQualidadeController.getData);

sistemaQualidadeRoutes.post(`${route}/updateData/:id`, sistemaQualidadeController.updateData);
sistemaQualidadeRoutes.post(`${route}/new/insertData`, sistemaQualidadeController.insertData);
sistemaQualidadeRoutes.delete(`${route}/:id/:unidadeID/:usuarioID`, sistemaQualidadeController.deleteData);


module.exports = sistemaQualidadeRoutes;