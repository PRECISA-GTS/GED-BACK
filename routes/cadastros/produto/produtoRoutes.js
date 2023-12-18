const { Router } = require('express');
const produtoRoutes = Router();

const ProdutoController = require('../../../controllers/cadastros/produto/produtoController');
const produtoController = new ProdutoController();

const route = '/produto';

produtoRoutes.get(`${route}/:unidadeID`, produtoController.getList);
produtoRoutes.post(`${route}/getData/:id`, produtoController.getData);
produtoRoutes.post(`${route}/updateData/:id`, produtoController.updateData);
produtoRoutes.delete(`${route}/:id/:usuarioID/:unidadeID`, produtoController.deleteData);
produtoRoutes.post(`${route}/new/getData`, produtoController.getNewData);
produtoRoutes.post(`${route}/new/insertData`, produtoController.insertData);
// produtoRoutes.post(`${route}/getProdutosFornecedor`, produtoController.getProdutosFornecedor); //! descontinuado
produtoRoutes.post(`${route}/getFormularios`, produtoController.getFormularios);

module.exports = produtoRoutes;
