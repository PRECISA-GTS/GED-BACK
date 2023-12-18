const { Router } = require('express');
const notificacaoRoutes = Router();

const NotificacaoController = require('../../../controllers/configuracoes/notificacao/notificacaoController');
const notificacaoController = new NotificacaoController();

const route = '/notificacao';

notificacaoRoutes.get(`${route}/getData/:usuarioID/:unidadeID`, notificacaoController.getData);
notificacaoRoutes.post(`${route}/updateData/:usuarioID/:unidadeID`, notificacaoController.updateData);

module.exports = notificacaoRoutes;