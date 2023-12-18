const { Router } = require('express');
const LogController = require('../../../controllers/configuracoes/log/logController');


const logRoutes = Router();
const logController = new LogController();
const route = '/log';

logRoutes.get(`${route}/:unidadeID`, logController.getList);
logRoutes.get(`${route}/getData/:unidadeID/:logID`, logController.getData);

module.exports = logRoutes;
