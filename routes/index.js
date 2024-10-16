const { Router } = require('express');
const routes = Router();
const urlBase = '/api'

// Autenticação
const auth = require("./auth/authRoutes");
const authFornecedor = require("./auth/authFornecedorRoutes");
routes.use(urlBase + '/', authFornecedor);
routes.use(urlBase + '/', auth);

//? Info
const infoRouter = require("./info/infoRoutes");
routes.use(urlBase, infoRouter);

// Dashborards
const fabricaRouter = require("./dashboard/fabricaRoutes")
const fornecedorDashboardRouter = require("./dashboard/fornecedorDashboardRoutes")
routes.use(urlBase + '/dashboard', fabricaRouter);
routes.use(urlBase + '/dashboard', fornecedorDashboardRouter);

// Fornecedor
const fornecedorRouter = require("./formularios/fornecedor/fornecedorRoutes");
routes.use(urlBase, fornecedorRouter);

// Recebimento de MP
const recebimentoMpRouter = require("./formularios/recebimento-mp/recebimentoMpRoutes");
routes.use(urlBase, recebimentoMpRouter);

// Recebimento de MP / Conformidade
const conformidadeRouter = require("./formularios/recebimento-mp/nao-conformidade/naoConformidadeRoutes");
routes.use(urlBase, conformidadeRouter);

// Limpeza
const limpezaRouter = require("./formularios/limpeza/limpezaRoutes"); 1
routes.use(urlBase, limpezaRouter);

// Limpeza / Conformidade
const conformidadeLimpezaRouter = require("./formularios/limpeza/nao-conformidade/naoConformidadeRoutes");
routes.use(urlBase, conformidadeLimpezaRouter);

// Cadastros 
const atividadeRouter = require("./cadastros/atividade/atividadeRoutes");
const itemRouter = require("./cadastros/item/itemRoutes");
const sistemaQualidadeRouter = require("./cadastros/sistemaQualidade/sistemaQualidadeRoutes");
const tipoVeiculoRouter = require("./cadastros/tipoVeiculo/tipoVeiculoRoutes");
const transportadorRouter = require("./cadastros/transportador/transportadorRoutes");
const ApresentacaoRouter = require("./cadastros/apresentacao/apresentacaoRoutes");
const ProfissaoRouter = require("./cadastros/profissao/profissaoRoutes");
const GrupoAnexosRouter = require("./cadastros/grupoAnexos/grupoAnexosRoutes");
const ProdutoRoutes = require("./cadastros/produto/produtoRoutes");
const ClassificacaoProdutoRoutes = require("./cadastros/classificacaoProduto/classificacaoProdutoRoutes");
const ProfissionalRouter = require("./cadastros/profissional/profissionalRoutes")
const DepartamentoRouter = require("./cadastros/departamento/departamentoRoutes")
const EquipamentoRouter = require("./cadastros/equipamento/equipamentoRoutes")
const SetorRouter = require("./cadastros/setor/setorRoutes")

// Calendario
const calendarioRouter = require("./calendario/calendarioRoutes");
routes.use(urlBase, calendarioRouter);

// Relatorio
const relatorioRouter = require("./relatorio/relatorioRoutes");
routes.use(urlBase, relatorioRouter);

const relatorioFormRoutes = require("./relatorio/formularios/fornecedor/fornecedorRoutes");
routes.use(urlBase, relatorioFormRoutes);

routes.use(urlBase + '/cadastros', atividadeRouter);
routes.use(urlBase + '/cadastros', itemRouter);
routes.use(urlBase + '/cadastros', sistemaQualidadeRouter);
routes.use(urlBase + '/cadastros', tipoVeiculoRouter);
routes.use(urlBase + '/cadastros', transportadorRouter);
routes.use(urlBase + '/cadastros', ApresentacaoRouter);
routes.use(urlBase + '/cadastros', ProfissaoRouter);
routes.use(urlBase + '/cadastros', GrupoAnexosRouter);
routes.use(urlBase + '/cadastros', ProdutoRoutes);
routes.use(urlBase + '/cadastros', ClassificacaoProdutoRoutes);
routes.use(urlBase + '/cadastros', ProfissionalRouter);
routes.use(urlBase + '/cadastros', DepartamentoRouter);
routes.use(urlBase + '/cadastros', EquipamentoRouter);
routes.use(urlBase + '/cadastros', SetorRouter);


//? Configuracoes
const formularios = require("./configuracoes/formularios/formulariosRoutes");
const formularioFornecedor = require("./configuracoes/formularios/fornecedor/fornecedorRoutes");
const formularioRecebimentoMp = require("./configuracoes/formularios/recebimentoMp/recebimentoMpRoutes");
const formularioRecebimentoMpNaoConformidade = require("./configuracoes/formularios/recebimentoMpNaoConformidade/recebimentoMpNaoConformidadeRoutes");
const formularioLimpezaNaoConformidade = require("./configuracoes/formularios/limpezaNaoConformidade/limpezaNaoConformidadeRoutes");
const formularioLimpeza = require("./configuracoes/formularios/limpeza/limpezaRoutes");
const unidade = require("./configuracoes/unidade/unidadeRoutes");
const UsuarioRouter = require("./configuracoes/usuario/usuarioRoutes");
const NotificacaoRouter = require("./configuracoes/notificacao/notificacaoRoutes");
const ProdutosRouter = require("./configuracoes/produtos/produtosRoutes");
const LogRouter = require("./configuracoes/log/logRoutes")
const versaoRouter = require("./configuracoes/versao/versaoRoutes")

routes.use(urlBase + '/configuracoes', formularios);
routes.use(urlBase + '/configuracoes', formularioFornecedor);
routes.use(urlBase + '/configuracoes', formularioRecebimentoMp);
routes.use(urlBase + '/configuracoes', formularioRecebimentoMpNaoConformidade);
routes.use(urlBase + '/configuracoes', formularioLimpezaNaoConformidade);
routes.use(urlBase + '/configuracoes', formularioLimpeza);
routes.use(urlBase + '/configuracoes', unidade);
routes.use(urlBase + '/configuracoes', UsuarioRouter);
routes.use(urlBase + '/configuracoes', NotificacaoRouter);
routes.use(urlBase + '/configuracoes', ProdutosRouter);
routes.use(urlBase + '/configuracoes', LogRouter);
routes.use(urlBase + '/configuracoes', versaoRouter);

// Notificação
const notificacao = require('./notificacao/notificacaoRoutes');
routes.use(urlBase + '/notificacao', notificacao);

// CommonData
const commonData = require('./commonData/commonDataRoutes');
routes.use(urlBase + '/commonData', commonData);

module.exports = routes;