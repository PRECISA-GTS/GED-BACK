const { Router } = require('express');

const fornecedorRoutes = Router();
const { configureMulterMiddleware } = require('../../../config/uploads');

const FornecedorController = require('../../../controllers/formularios/fornecedor/fornecedorController');
const { getDocumentSignature, signedReport } = require('../../../defaults/functions');
const fornecedorController = new FornecedorController();
const route = '/formularios/fornecedor';
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');

// Padrões
fornecedorRoutes.post(`${route}/getList`, fornecedorController.getList);
fornecedorRoutes.post(`${route}/getData/:id`, fornecedorController.getData);
fornecedorRoutes.post(`${route}/updateData/:id`, fornecedorController.updateData);
fornecedorRoutes.delete(`${route}/delete/:id/:usuarioID/:unidadeID`, fornecedorController.deleteData);

// Específicos
fornecedorRoutes.post(`${route}/getFabricas`, fornecedorController.getFabricas);
fornecedorRoutes.post(`${route}/cnpj`, fornecedorController.getFornecedorByCnpj);

// Verifica quem preenche o formulario do fornecedor
fornecedorRoutes.post(`${route}/paramsNewFornecedor`, fornecedorController.paramsNewFornecedor);

fornecedorRoutes.post(`${route}/makeFornecedor`, fornecedorController.makeFornecedor);
fornecedorRoutes.post(`${route}/fornecedorStatus`, fornecedorController.fornecedorStatus);
// fornecedorRoutes.post(`${route}/sendMail`, fornecedorController.sendMail);
fornecedorRoutes.post(`${route}/getItemScore`, fornecedorController.getItemScore);
fornecedorRoutes.post(`${route}/saveItemScore`, fornecedorController.saveItemScore);
fornecedorRoutes.post(`${route}/getModels`, fornecedorController.getModels);
fornecedorRoutes.post(`${route}/getProducts`, fornecedorController.getProducts);
fornecedorRoutes.post(`${route}/getGruposAnexo`, fornecedorController.getGruposAnexo);

fornecedorRoutes.post(`${route}/conclusionAndSendForm/:id`, fornecedorController.conclusionAndSendForm);
fornecedorRoutes.post(`${route}/updateFormStatus/:id`, fornecedorController.updateFormStatus);
fornecedorRoutes.post(`${route}/getMovementHistory/:id`, fornecedorController.getMovementHistory);
fornecedorRoutes.post(`${route}/verifyFormPending/:id`, fornecedorController.verifyFormPending);
fornecedorRoutes.post(`${route}/changeFormStatus/:id`, fornecedorController.changeFormStatus);
fornecedorRoutes.post(`${route}/getGruposAnexo`, fornecedorController.getGruposAnexo);
fornecedorRoutes.post(`${route}/sendNotification`, fornecedorController.sendNotification);
fornecedorRoutes.post(`${route}/getFornecedoresAprovados`, fornecedorController.getFornecedoresAprovados);


//Envia email baseado no status do fornecedor
fornecedorRoutes.post(`${route}/sendEmailBasedStatus`, fornecedorController.sendEmailBasedStatus);

// Anexos
fornecedorRoutes.delete(`${route}/deleteAnexo/:id/:anexoID/:unidadeID/:usuarioID/:folder`, fornecedorController.deleteAnexo);
//? MULTER: Upload de arquivo
fornecedorRoutes.post(`${route}/saveAnexo/:id/:folder/:usuarioID/:unidadeID`, (req, res, next) => {
    const folder = req.params.folder ?? '/' //? Pasta destino do arquivo (grupo-anexo/produto/item/...)
    const pathDestination = `uploads/${req.params.unidadeID}/fornecedor/${folder}/`
    req.pathDestination = pathDestination
    configureMulterMiddleware(req, res, next, req.params.usuarioID, req.params.unidadeID, pathDestination)
}, fornecedorController.saveAnexo);

//? MULTER: Salva relatório
fornecedorRoutes.post(`${route}/saveRelatorio/:id/:usuarioID/:unidadeID`, (req, res, next) => {
    const pathDestination = `uploads/${req.params.unidadeID}/fornecedor/relatorio/original`
    req.pathDestination = pathDestination
    configureMulterMiddleware(req, res, next, req.params.usuarioID, req.params.unidadeID, pathDestination, false)
}, fornecedorController.saveRelatorio);

//? Assinatura relatório (cria documento)
fornecedorRoutes.post(`${route}/createDocumentAutentique/:id/:usuarioID/:unidadeID`, fornecedorController.createDocumentAutentique);

//? MULTER: Salva relatório assinado vindo do autentique
fornecedorRoutes.post(`${route}/saveSignedDocument`, fornecedorController.saveSignedDocument);

module.exports = fornecedorRoutes;