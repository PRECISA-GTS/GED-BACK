const { Router } = require('express');
const produtoRoutes = Router();

const ProdutoController = require('../../../controllers/cadastros/produto/produtoController');
const produtoController = new ProdutoController();

const route = '/produto';

produtoRoutes.get(`${route}/:unidadeID`, produtoController.getList);
produtoRoutes.post(`${route}/getData/:id/:unidadeID`, produtoController.getData);
produtoRoutes.post(`${route}/updateData/:id`, produtoController.updateData);
produtoRoutes.delete(`${route}/:id/:usuarioID/:unidadeID`, produtoController.deleteData);
produtoRoutes.post(`${route}/new/getData/:unidadeID`, produtoController.getNewData);
produtoRoutes.post(`${route}/new/insertData`, produtoController.insertData);
produtoRoutes.post(`${route}/getFormularios`, produtoController.getFormularios);
produtoRoutes.post(`${route}/getProdutos`, produtoController.getProdutos); //? Acessado de outros módulos pra obter produtos ativos

module.exports = produtoRoutes;
