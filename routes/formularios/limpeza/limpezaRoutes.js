const { Router } = require('express');
const limpezaRoutes = Router();
const { configureMulterMiddleware } = require('../../../config/uploads');

const LimpezaController = require('../../../controllers/formularios/limpeza/limpezaController');
const limpezaController = new LimpezaController();

const route = '/formularios/limpeza';

limpezaRoutes.get(`${route}/getList/:unidadeID/:papelID/:usuarioID`, limpezaController.getList);
limpezaRoutes.post(`${route}/getData/:id`, limpezaController.getData);
limpezaRoutes.post(`${route}/insertData`, limpezaController.insertData);
limpezaRoutes.delete(`${route}/delete/:id/:usuarioID/:unidadeID`, limpezaController.deleteData);
limpezaRoutes.get(`${route}/getModels/:unidadeID`, limpezaController.getModels);
limpezaRoutes.post(`${route}/updateData/:id`, limpezaController.updateData);
limpezaRoutes.post(`${route}/changeFormStatus/:id`, limpezaController.changeFormStatus);

//? MULTER: Upload de arquivo
limpezaRoutes.delete(`${route}/deleteAnexo/:id/:anexoID/:unidadeID/:usuarioID/:folder`, limpezaController.deleteAnexo);
limpezaRoutes.post(`${route}/saveAnexo/:id/:folder/:usuarioID/:unidadeID`, (req, res, next) => {
    const folder = req.params.folder ?? '/' //? Pasta destino do arquivo (grupo-anexo/produto/item/...)
    const pathDestination = `uploads/${req.params.unidadeID}/limpeza/${folder}/`
    req.pathDestination = pathDestination
    configureMulterMiddleware(req, res, next, req.params.usuarioID, req.params.unidadeID, pathDestination)
}, limpezaController.saveAnexo);

//? MULTER: Salva relatório
limpezaRoutes.post(`${route}/saveRelatorio/:id/:usuarioID/:unidadeID`, (req, res, next) => {
    const pathDestination = `uploads/${req.params.unidadeID}/limpeza/relatorio/original`
    req.pathDestination = pathDestination
    configureMulterMiddleware(req, res, next, req.params.usuarioID, req.params.unidadeID, pathDestination, false)
}, limpezaController.saveRelatorio);

module.exports = limpezaRoutes;