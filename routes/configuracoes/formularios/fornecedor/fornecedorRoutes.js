const { Router } = require('express');
const fornecedorRoutes = Router();

const FornecedorController = require('../../../../controllers/configuracoes/formularios/fornecedor/fornecedorController');
const fornecedorController = new FornecedorController();

const route = '/formularios/fornecedor';

fornecedorRoutes.get(`${route}/getList/:unidadeID`, fornecedorController.getList);
fornecedorRoutes.post(`${route}/getData/:id`, fornecedorController.getData);
fornecedorRoutes.put(`${route}/insertData`, fornecedorController.insertData);
fornecedorRoutes.put(`${route}/updateData`, fornecedorController.updateData);
fornecedorRoutes.delete(`${route}/delete/:id/:usuarioID/:unidadeID`, fornecedorController.deleteData);
fornecedorRoutes.post(`${route}/getCategories`, fornecedorController.getCategories);
fornecedorRoutes.post(`${route}/getLinkingForms`, fornecedorController.getLinkingForms);
fornecedorRoutes.post(`${route}/updateLinkingForms`, fornecedorController.updateLinkingForms);

module.exports = fornecedorRoutes;