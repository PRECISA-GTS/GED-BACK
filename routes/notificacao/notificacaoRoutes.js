const { Router } = require('express');

const NotificacaoRoutes = Router();

const NotificacaoController = require('../../controllers/notificacao/notificacaoController');
const notificacaoController = new NotificacaoController();


NotificacaoRoutes.post(`/getData`, notificacaoController.getData);
NotificacaoRoutes.put(`/updateData`, notificacaoController.updateData);
NotificacaoRoutes.post(`/insertData`, notificacaoController.insertData);



module.exports = NotificacaoRoutes;