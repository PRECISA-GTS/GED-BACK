const { Router } = require('express');
const recebimentoMpRoutes = Router();
const { configureMulterMiddleware } = require('../../../config/uploads');

const RecebimentoMpController = require('../../../controllers/formularios/recebimentoMp/recebimentoMpController');
const recebimentoMpController = new RecebimentoMpController();

const route = '/formularios/recebimento-mp';

recebimentoMpRoutes.post(`${route}/getList`, recebimentoMpController.getList);
// recebimentoMpRoutes.post(`${route}/getData/:id`, recebimentoMpController.getData);
recebimentoMpRoutes.post(`${route}/getData`, recebimentoMpController.getData);
recebimentoMpRoutes.post(`${route}/insertData`, recebimentoMpController.insertData);
recebimentoMpRoutes.delete(`${route}/delete/:id/:usuarioID/:unidadeID`, recebimentoMpController.deleteData);
recebimentoMpRoutes.get(`${route}/getModels/:unidadeID`, recebimentoMpController.getModels);
recebimentoMpRoutes.post(`${route}/updateData/:id`, recebimentoMpController.updateData);
recebimentoMpRoutes.get(`${route}/getNaoConformidadeModels/:unidadeID`, recebimentoMpController.getNaoConformidadeModels);
recebimentoMpRoutes.post(`${route}/changeFormStatus/:id`, recebimentoMpController.changeFormStatus);
recebimentoMpRoutes.post(`${route}/getProdutosRecebimento`, recebimentoMpController.getProdutosRecebimento);

//? MULTER: Upload de arquivo
recebimentoMpRoutes.delete(`${route}/deleteAnexo/:id/:anexoID/:unidadeID/:usuarioID/:folder`, recebimentoMpController.deleteAnexo);
recebimentoMpRoutes.post(`${route}/saveAnexo/:id/:folder/:usuarioID/:unidadeID`, (req, res, next) => {
    const folder = req.params.folder ?? '/' //? Pasta destino do arquivo (grupo-anexo/produto/item/...)
    const pathDestination = `uploads/${req.params.unidadeID}/recebimento-mp/${folder}/`
    req.pathDestination = pathDestination
    configureMulterMiddleware(req, res, next, req.params.usuarioID, req.params.unidadeID, pathDestination)
}, recebimentoMpController.saveAnexo);

//? MULTER: Salva relatório
recebimentoMpRoutes.post(`${route}/saveRelatorio/:id/:usuarioID/:unidadeID`, (req, res, next) => {
    const pathDestination = `uploads/${req.params.unidadeID}/recebimento-mp/relatorio/original`
    req.pathDestination = pathDestination
    configureMulterMiddleware(req, res, next, req.params.usuarioID, req.params.unidadeID, pathDestination, false)
}, recebimentoMpController.saveRelatorio);

module.exports = recebimentoMpRoutes;