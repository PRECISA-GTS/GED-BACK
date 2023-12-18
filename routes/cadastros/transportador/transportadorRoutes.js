const { Router } = require('express');
const transportadorRoutes = Router();

const TransportadorController = require('../../../controllers/cadastros/transportador/transportadorController');
const transportadorController = new TransportadorController();

const route = '/transportador';

transportadorRoutes.post(`${route}`, transportadorController.getList);
transportadorRoutes.post(`${route}/getData/:id`, transportadorController.getData);

transportadorRoutes.post(`${route}/updateData/:id`, transportadorController.updateData);
transportadorRoutes.post(`${route}/new/insertData`, transportadorController.insertData);
transportadorRoutes.delete(`${route}/:id/:unidadeID/:usuarioID`, transportadorController.deleteData);


module.exports = transportadorRoutes;