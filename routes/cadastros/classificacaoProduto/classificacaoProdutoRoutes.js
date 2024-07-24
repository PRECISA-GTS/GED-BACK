const { Router } = require('express');
const classificacaoProdutoRoutes = Router();

const ClassificacaoProdutoController = require('../../../controllers/cadastros/classificacaoProduto/classificacaoProdutoController');
const classificacaoProdutoController = new ClassificacaoProdutoController();

const route = '/classificacao-produto';

classificacaoProdutoRoutes.get(`${route}/:unidadeID`, classificacaoProdutoController.getList);
classificacaoProdutoRoutes.post(`${route}/getData/:id`, classificacaoProdutoController.getData);
classificacaoProdutoRoutes.post(`${route}/updateData/:id`, classificacaoProdutoController.updateData);
classificacaoProdutoRoutes.delete(`${route}/:id/:usuarioID/:unidadeID`, classificacaoProdutoController.deleteData);
classificacaoProdutoRoutes.post(`${route}/new/insertData`, classificacaoProdutoController.insertData);

module.exports = classificacaoProdutoRoutes;
