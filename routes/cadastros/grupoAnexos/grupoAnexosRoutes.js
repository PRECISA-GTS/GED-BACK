const { Router } = require('express');
const grupoAnexosRoutes = Router();

const GrupoAnexosController = require('../../../controllers/cadastros/grupoAnexos/grupoAnexosController');
const grupoAnexosController = new GrupoAnexosController();

const route = '/grupo-anexos';

grupoAnexosRoutes.post(`${route}`, grupoAnexosController.getList);

grupoAnexosRoutes.post(`${route}/getData/:id`, grupoAnexosController.getData);
grupoAnexosRoutes.post(`${route}/updateData/:id`, grupoAnexosController.updateData);
grupoAnexosRoutes.delete(`${route}/deleteData/:id/:usuarioID/:unidadeID`, grupoAnexosController.deleteData);
//
grupoAnexosRoutes.post(`${route}/new/getData`, grupoAnexosController.getNewData);
grupoAnexosRoutes.post(`${route}/new/insertData`, grupoAnexosController.insertData);

module.exports = grupoAnexosRoutes;
