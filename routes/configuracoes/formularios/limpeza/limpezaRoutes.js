const { Router } = require('express');
const limpezaRoutes = Router();

const LimpezaController = require('../../../../controllers/configuracoes/formularios/limpeza/limpezaController');
const limpezaController = new LimpezaController();

const route = '/formularios/limpeza';

limpezaRoutes.get(`${route}/getList/:unidadeID`, limpezaController.getList);
limpezaRoutes.post(`${route}/getData`, limpezaController.getData);
limpezaRoutes.put(`${route}/updateData`, limpezaController.updateData);
limpezaRoutes.delete(`${route}/delete/:id/:usuarioID/:unidadeID`, limpezaController.deleteData);

module.exports = limpezaRoutes;