const { Router } = require('express');
const limpezaNaoConformidadeRoutes = Router();

const LimpezaNaoConformidadeController = require('../../../../controllers/configuracoes/formularios/limpeza-naoconformidade/limpezaNaoConformidadeController');
const limpezaNaoConformidadeController = new LimpezaNaoConformidadeController();

const route = '/formularios/limpeza-naoconformidade';

limpezaNaoConformidadeRoutes.get(`${route}/getList/:unidadeID`, limpezaNaoConformidadeController.getList);
limpezaNaoConformidadeRoutes.post(`${route}/getData/:id`, limpezaNaoConformidadeController.getData);
limpezaNaoConformidadeRoutes.put(`${route}/insertData`, limpezaNaoConformidadeController.insertData);
limpezaNaoConformidadeRoutes.put(`${route}/updateData`, limpezaNaoConformidadeController.updateData);
limpezaNaoConformidadeRoutes.delete(`${route}/delete/:id/:usuarioID/:unidadeID`, limpezaNaoConformidadeController.deleteData);

module.exports = limpezaNaoConformidadeRoutes;