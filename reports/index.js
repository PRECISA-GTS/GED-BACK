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


// Teste
const teste = require('./teste');
routerReports.get(`${urlBase}/teste`, teste);

module.exports = routerReports;