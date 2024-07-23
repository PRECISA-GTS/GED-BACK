const { Router } = require('express');
const formReportRoutes = Router();
const FormReportController = require('../../../../controllers/relatorio/formularios/fornecedor/fornecedorController');
const formReportController = new FormReportController();
const route = '/relatorio/formularios/fornecedor';
formReportRoutes.post(`${route}/getContent`, formReportController.getContent);
module.exports = formReportRoutes;