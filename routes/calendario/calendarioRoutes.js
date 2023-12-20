const { Router } = require('express');
const calendarioRoutes = Router();

const CalendarioController = require('../../controllers/calendario/calendarioController');
const calendarioController = new CalendarioController();

const route = '/calendario';

calendarioRoutes.post(`${route}/getEvents`, calendarioController.getEvents);

module.exports = calendarioRoutes;