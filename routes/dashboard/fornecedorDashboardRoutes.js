const { Router } = require('express');

const FornecedorDashboardRoutes = Router();

const FornecedorDashboardController = require('../../controllers/dashboard/fornecedorDashboardController');
const fornecedorDashboardController = new FornecedorDashboardController();

const route = '/fornecedor';


FornecedorDashboardRoutes.post(`${route}/getData`, fornecedorDashboardController.getData);



module.exports = FornecedorDashboardRoutes;