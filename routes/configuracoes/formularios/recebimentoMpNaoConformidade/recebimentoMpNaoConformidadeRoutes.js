const { Router } = require('express');
const recebimentoMpNaoConformidadeRoutes = Router();

const RecebimentoMpNaoConformidadeController = require('../../../../controllers/configuracoes/formularios/recebimentomp-naoconformidade/recebimentoMpNaoConformidadeController');
const recebimentoMpNaoConformidadeController = new RecebimentoMpNaoConformidadeController();

const route = '/formularios/recebimentomp-naoconformidade';

recebimentoMpNaoConformidadeRoutes.get(`${route}/getList/:unidadeID`, recebimentoMpNaoConformidadeController.getList);
recebimentoMpNaoConformidadeRoutes.post(`${route}/getData/:id`, recebimentoMpNaoConformidadeController.getData);
recebimentoMpNaoConformidadeRoutes.put(`${route}/insertData`, recebimentoMpNaoConformidadeController.insertData);
recebimentoMpNaoConformidadeRoutes.put(`${route}/updateData`, recebimentoMpNaoConformidadeController.updateData);
recebimentoMpNaoConformidadeRoutes.delete(`${route}/delete/:id/:usuarioID/:unidadeID`, recebimentoMpNaoConformidadeController.deleteData);

module.exports = recebimentoMpNaoConformidadeRoutes;