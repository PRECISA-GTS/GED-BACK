const { Router } = require('express');
const naoConformidadeRoutes = Router();

const NaoConformidadeController = require('../../../../controllers/formularios/recebimentoMp/naoConformidade/naoConformidadeController');
const naoConformidadeController = new NaoConformidadeController();

const route = '/formularios/recebimento-mp/nao-conformidade';

//? Módulo 2.0 (agosto 2024)
naoConformidadeRoutes.post(`${route}/getList`, naoConformidadeController.getList);
naoConformidadeRoutes.post(`${route}/getData`, naoConformidadeController.getData);
naoConformidadeRoutes.post(`${route}/getModels`, naoConformidadeController.getModels);
naoConformidadeRoutes.post(`${route}/insertData`, naoConformidadeController.insertData);
naoConformidadeRoutes.post(`${route}/updateData/:id`, naoConformidadeController.updateData);
naoConformidadeRoutes.post(`${route}/conclude`, naoConformidadeController.conclude);
naoConformidadeRoutes.post(`${route}/fornecedor-preenche`, naoConformidadeController.fornecedorPreenche);
naoConformidadeRoutes.delete(`${route}/delete/:id/:usuarioID/:unidadeID`, naoConformidadeController.deleteData);
naoConformidadeRoutes.post(`${route}/reOpen/:id`, naoConformidadeController.reOpen);
naoConformidadeRoutes.post(`${route}/getRecebimentoMPNC`, naoConformidadeController.getRecebimentoMPNC);
naoConformidadeRoutes.post(`${route}/getNCRecebimentoMp`, naoConformidadeController.getNCRecebimentoMp);

module.exports = naoConformidadeRoutes;