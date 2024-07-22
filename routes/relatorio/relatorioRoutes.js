const { Router } = require('express');
const relatorioRoutes = Router();

const RelatorioController = require('../../controllers/relatorio/relatorioController');
const relatorioController = new RelatorioController();

const route = '/relatorio';

relatorioRoutes.post(`${route}/getHeader`, relatorioController.getHeader);

module.exports = relatorioRoutes;