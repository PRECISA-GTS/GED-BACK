const express = require('express');
const routerReports = express.Router();
const urlBase = '/api/relatorio';

// Cabeçalho padrão
const headerReport = require('./layouts/headerReport');
routerReports.post(`${urlBase}/header`, headerReport);

// Fornecedor
const formulario = require('./formularios/fornecedor/formulario');
routerReports.post(`${urlBase}/fornecedor/formulario`, formulario);

// Recebimento MP
const dadosRecebimentoMp = require('./formularios/recebimentoMp/dadosRecebimentoMp');
routerReports.post(`${urlBase}/recebimentoMp/dadosRecebimentoMp`, dadosRecebimentoMp);



const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/teste')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({ storage: storage });


// Teste
const generate = require('./teste/generate');
routerReports.get(`${urlBase}/teste/generate`, generate);

const save = require('./teste/save');
routerReports.post(`${urlBase}/teste/save`, upload.single('file'), save);

module.exports = routerReports;