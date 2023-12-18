const { Router } = require('express');
const itemRoutes = Router();

const ItemController = require('../../../controllers/cadastros/item/itemController');
const itemController = new ItemController();

const route = '/item';

itemRoutes.get(`${route}/:unidadeID`, itemController.getList);

itemRoutes.post(`${route}/getData/:id`, itemController.getData);
itemRoutes.post(`${route}/updateData/:id`, itemController.updateData);
itemRoutes.delete(`${route}/:id/:usuarioID/:unidadeID`, itemController.deleteData);

itemRoutes.post(`${route}/getAlternatives`, itemController.getAlternatives);
itemRoutes.post(`${route}/getItemConfigs`, itemController.getItemConfigs);

itemRoutes.post(`${route}/new/getData`, itemController.getNewData);
itemRoutes.post(`${route}/new/insertData`, itemController.insertData);


module.exports = itemRoutes;
