const { Router } = require('express');
const setorRoutes = Router();

const SetorController = require('../../../controllers/cadastros/setor/setorController');
const setorController = new SetorController();

const route = '/setor';

setorRoutes.post(`${route}`, setorController.getList);
setorRoutes.post(`${route}/getData/:id`, setorController.getData);
setorRoutes.post(`${route}/updateData/:id`, setorController.updateData);
setorRoutes.post(`${route}/new/insertData`, setorController.insertData);
setorRoutes.delete(`${route}/:id/:unidadeID/:usuarioID`, setorController.deleteData);
setorRoutes.post(`${route}/getSetoresAssinatura`, setorController.getSetoresAssinatura);
setorRoutes.post(`${route}/getProfissionaisSetoresAssinatura`, setorController.getProfissionaisSetoresAssinatura);

module.exports = setorRoutes;