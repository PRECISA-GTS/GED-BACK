const { Router } = require('express');
const atividadeRoutes = Router();

const AtividadeController = require('../../../controllers/cadastros/atividade/atividadeController');
const atividadeController = new AtividadeController();

const route = '/atividade';

atividadeRoutes.get(`${route}`, atividadeController.getList);
atividadeRoutes.post(`${route}/getData/:id`, atividadeController.getData);

atividadeRoutes.post(`${route}/updateData/:id`, atividadeController.updateData);
atividadeRoutes.post(`${route}/new/insertData`, atividadeController.insertData);
atividadeRoutes.delete(`${route}/:id/:usuarioID/:unidadeID`, atividadeController.deleteData);


module.exports = atividadeRoutes;