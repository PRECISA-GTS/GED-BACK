const { Router } = require('express');

const limpezaRoutes = Router();

const LimpezaController = require('../../../controllers/formularios/limpeza/limpezaController');
const limpezaController = new LimpezaController();
const route = '/formularios/limpeza';

// Padrões
limpezaRoutes.get(`${route}/getList/:unidadeID`, limpezaController.getList);
limpezaRoutes.post(`${route}/getData/:id`, limpezaController.getData);
limpezaRoutes.post(`${route}/updateData/:id`, limpezaController.updateData);
// limpezaRoutes.delete(`${route}/:id`, limpezaController.deleteData);
// limpezaRoutes.delete(`${route}/deleteAnexo/:grupoAnexoItemID/:id/:unidadeID/:usuarioID`, limpezaController.deleteAnexo);
// limpezaRoutes.post(`${route}/novo`, limpezaController.insertData);

module.exports = limpezaRoutes;