const { Router } = require('express');
const formulariosRoutes = Router();

const Formularios = require('../../../controllers/configuracoes/formularios/formulariosController');
const formulariosController = new Formularios();

const route = '/formularios';

formulariosRoutes.get(`${route}`, formulariosController.getList);

module.exports = formulariosRoutes;