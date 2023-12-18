const { Router } = require('express');
const recebimentoMpRoutes = Router();

const RecebimentoMpController = require('../../../../controllers/configuracoes/formularios/recebimento-mp/recebimentoMpController');
const recebimentoMpController = new RecebimentoMpController();

const route = '/formularios/recebimento-mp';

recebimentoMpRoutes.get(`${route}/getList/:unidadeID`, recebimentoMpController.getList);
recebimentoMpRoutes.post(`${route}/getData/:id`, recebimentoMpController.getData);
recebimentoMpRoutes.put(`${route}/insertData`, recebimentoMpController.insertData);
recebimentoMpRoutes.put(`${route}/updateData`, recebimentoMpController.updateData);
recebimentoMpRoutes.delete(`${route}/delete/:id/:usuarioID/:unidadeID`, recebimentoMpController.deleteData);

module.exports = recebimentoMpRoutes;