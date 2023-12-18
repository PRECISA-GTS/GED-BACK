const express = require('express');
const routerReports = express.Router();
const urlBase = '/api/relatorio';

// Cabeçalho padrão
const headerReport = require('./layouts/headerReport');
routerReports.post(`${urlBase}/header`, headerReport);

// Fornecedor
const dadosFornecedor = require('./formularios/fornecedor/dadosFornecedor');
routerReports.post(`${urlBase}/fornecedor/dadosFornecedor`, dadosFornecedor);

// Recebimento MP
const dadosRecebimentoMp = require('./formularios/recebimentoMp/dadosRecebimentoMp');
routerReports.post(`${urlBase}/recebimentoMp/dadosRecebimentoMp`, dadosRecebimentoMp);

module.exports = routerReports;