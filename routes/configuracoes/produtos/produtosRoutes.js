const { Router } = require('express');
const produtosRoutes = Router();

const ProdutosController = require('../../../controllers/configuracoes/produtos/produtosController');
const produtosController = new ProdutosController();

const route = '/produtos';

produtosRoutes.post(`${route}`, produtosController.getList);
produtosRoutes.post(`${route}/getData/:id`, produtosController.getData);
produtosRoutes.post(`${route}/updateData`, produtosController.updateData);
produtosRoutes.post(`${route}/new/insertData`, produtosController.insertData);
produtosRoutes.delete(`${route}/:id`, produtosController.deleteData);


module.exports = produtosRoutes;