const { Router } = require('express');
const tipoVeiculoRoutes = Router();

const TipoVeiculoController = require('../../../controllers/cadastros/tipoVeiculoController/tipoVeiculoController');
const tipoVeiculoController = new TipoVeiculoController();

const route = '/tipo-veiculo';

tipoVeiculoRoutes.get(`${route}`, tipoVeiculoController.getList);
tipoVeiculoRoutes.post(`${route}/getData/:id`, tipoVeiculoController.getData);

tipoVeiculoRoutes.post(`${route}/updateData/:id`, tipoVeiculoController.updateData);
tipoVeiculoRoutes.post(`${route}/new/insertData`, tipoVeiculoController.insertData);
tipoVeiculoRoutes.delete(`${route}/:id/:unidadeID/:usuarioID`, tipoVeiculoController.deleteData);


module.exports = tipoVeiculoRoutes;

