const { Router } = require('express');
const limpezaRoutes = Router();
const { configureMulterMiddleware } = require('../../../config/uploads');

const LimpezaController = require('../../../controllers/formularios/limpeza/limpezaController');
const limpezaController = new LimpezaController();

const route = '/formularios/limpeza';

limpezaRoutes.post(`${route}/getList`, limpezaController.getList);
limpezaRoutes.post(`${route}/getData`, limpezaController.getData);
limpezaRoutes.post(`${route}/getModels`, limpezaController.getModels);
limpezaRoutes.post(`${route}/insertData`, limpezaController.insertData);
limpezaRoutes.post(`${route}/updateData/:id`, limpezaController.updateData);
limpezaRoutes.post(`${route}/conclude`, limpezaController.conclude);
limpezaRoutes.post(`${route}/getEquipamentos`, limpezaController.getEquipamentos);
limpezaRoutes.delete(`${route}/delete/:id/:usuarioID/:unidadeID`, limpezaController.deleteData);
limpezaRoutes.post(`${route}/reOpen/:id`, limpezaController.reOpen);
limpezaRoutes.delete(`${route}/deleteAnexo/:id/:anexoID/:unidadeID/:usuarioID/:folder`, limpezaController.deleteAnexo);

limpezaRoutes.post(`${route}/saveAnexo/:id/:folder/:usuarioID/:unidadeID`, (req, res, next) => {
    const folder = req.params.folder ?? '/' //? Pasta destino do arquivo (grupo-anexo/produto/item/...)
    const pathDestination = `uploads/${req.params.unidadeID}/limpeza/${folder}/`
    req.pathDestination = pathDestination
    console.log("🚀 ~ pathDestination:", pathDestination)
    configureMulterMiddleware(req, res, next, req.params.usuarioID, req.params.unidadeID, pathDestination)
}, limpezaController.saveAnexo);

module.exports = limpezaRoutes;