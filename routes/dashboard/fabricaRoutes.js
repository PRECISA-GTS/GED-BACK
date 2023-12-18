const { Router } = require('express');

const FabricacaoRoutes = Router();

const FabricaController = require('../../controllers/dashboard/fabricaController');
const fabricaController = new FabricaController();

const route = '/fabrica';


FabricacaoRoutes.get(`${route}/getData/:unidadeID`, fabricaController.getData);



module.exports = FabricacaoRoutes;