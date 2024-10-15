const { Router } = require('express');

const InfoRoutes = Router();

const InfoController = require('../../controllers/info/infoController');
const infoController = new InfoController();

const route = '/info';

InfoRoutes.get(`${route}/db-connections-count`, infoController.dbConnectionsCount);

module.exports = InfoRoutes;