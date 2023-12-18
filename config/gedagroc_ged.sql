-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 19-Jul-2023 às 19:50
-- Versão do servidor: 10.4.22-MariaDB
-- versão do PHP: 7.4.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `gedagroc_ged`
--

-- --------------------------------------------------------

--
-- Estrutura da tabela `alternativa`
--

CREATE TABLE `alternativa` (
  `alternativaID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `alternativa`
--

INSERT INTO `alternativa` (`alternativaID`, `nome`, `status`) VALUES
(1, 'Sim/Não', 1),
(2, 'Sim/Não/NA', 1),
(3, 'Conforme/Não Conforme', 1),
(4, 'Conforme/Não Conforme/NA', 1),
(5, 'Dissertativa', 1),
(6, 'Data', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `alternativa_item`
--

CREATE TABLE `alternativa_item` (
  `alternativaItemID` int(11) NOT NULL,
  `alternativaID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `alternativa_item`
--

INSERT INTO `alternativa_item` (`alternativaItemID`, `alternativaID`, `nome`) VALUES
(1, 1, 'Sim'),
(2, 1, 'Não'),
(3, 2, 'Sim'),
(4, 2, 'Não'),
(5, 2, 'NA'),
(6, 3, 'Conforme'),
(7, 3, 'Não Conforme'),
(8, 4, 'Conforme'),
(9, 4, 'Não Conforme'),
(10, 4, 'NA');

-- --------------------------------------------------------

--
-- Estrutura da tabela `anexo`
--

CREATE TABLE `anexo` (
  `anexoID` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `arquivo` text NOT NULL,
  `tamanho` float NOT NULL COMMENT 'mb',
  `tipo` varchar(50) NOT NULL,
  `grupoAnexoItemID` int(11) NOT NULL,
  `usuarioID` int(11) NOT NULL,
  `unidadeID` int(11) NOT NULL,
  `fornecedorID` int(11) NOT NULL DEFAULT 0,
  `recebimentoMpID` int(11) NOT NULL DEFAULT 0,
  `naoConformidadeID` int(11) NOT NULL DEFAULT 0,
  `dataHora` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Extraindo dados da tabela `anexo`
--

INSERT INTO `anexo` (`anexoID`, `titulo`, `arquivo`, `tamanho`, `tipo`, `grupoAnexoItemID`, `usuarioID`, `unidadeID`, `fornecedorID`, `recebimentoMpID`, `naoConformidadeID`, `dataHora`) VALUES
(11, 'teste', 'boleto-(6)-1688560153346.pdf', 328713, 'application/pdf', 69, 37, 31, 66, 0, 0, '2023-07-05 09:29:13'),
(12, 'teste', '1tz3d5v5tfm-1688560153366.pdf', 196233, 'application/pdf', 5, 37, 31, 66, 0, 0, '2023-07-05 09:29:13'),
(13, 'teste', '1tz3d5v5tfm-1688560187693.pdf', 196233, 'application/pdf', 69, 37, 31, 66, 0, 0, '2023-07-05 09:29:48'),
(14, 'teste', 'boleto-(6)-1688560187709.pdf', 328713, 'application/pdf', 80, 37, 31, 66, 0, 0, '2023-07-05 09:29:48'),
(15, 'teste', 'boleto-(6)-1688560225791.pdf', 328713, 'application/pdf', 69, 37, 31, 66, 0, 0, '2023-07-05 09:30:26'),
(16, 'teste', '1tz3d5v5tfm-1688560225824.pdf', 196233, 'application/pdf', 69, 37, 31, 66, 0, 0, '2023-07-05 09:30:26'),
(31, '1TZ3D5V5TFM.pdf', '1tz3d5v5tfm-1688565245519.pdf', 196233, 'application/pdf', 1, 37, 31, 66, 0, 0, '2023-07-05 10:54:05'),
(33, 'boleto (6).pdf', 'boleto-(6)-1688741844667.pdf', 328713, 'application/pdf', 12, 37, 31, 66, 0, 0, '2023-07-07 11:57:24');

-- --------------------------------------------------------

--
-- Estrutura da tabela `apresentacao`
--

CREATE TABLE `apresentacao` (
  `apresentacaoID` int(11) NOT NULL,
  `nome` varchar(200) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo. 0->Inativo',
  `dataCadastro` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `apresentacao`
--

INSERT INTO `apresentacao` (`apresentacaoID`, `nome`, `status`, `dataCadastro`) VALUES
(1, 'Sacos', 1, '2022-09-23'),
(2, 'Big Bags', 1, '2022-09-23'),
(3, 'Granel', 1, '2022-09-23');

-- --------------------------------------------------------

--
-- Estrutura da tabela `atividade`
--

CREATE TABLE `atividade` (
  `atividadeID` int(11) NOT NULL,
  `nome` text NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `atividade`
--

INSERT INTO `atividade` (`atividadeID`, `nome`, `status`) VALUES
(1, 'Rações', 1),
(2, 'Suplementos', 1),
(3, 'Concentrados', 1),
(4, 'Ingredientes', 1),
(5, 'Alimentos', 1),
(6, 'Aditivos', 1),
(7, 'Alimentos com Medicamentos', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `cargo`
--

CREATE TABLE `cargo` (
  `cargoID` int(11) NOT NULL,
  `nome` text NOT NULL,
  `dataCadastro` date DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `cargo`
--

INSERT INTO `cargo` (`cargoID`, `nome`, `dataCadastro`, `status`) VALUES
(1, 'Responsável Qualidade', '2023-05-02', 1),
(2, 'Responsável Produção', '2023-05-02', 1),
(3, 'Responsável Técnico', '2023-05-02', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `categoria`
--

CREATE TABLE `categoria` (
  `categoriaID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `categoria`
--

INSERT INTO `categoria` (`categoriaID`, `nome`, `status`) VALUES
(1, 'Fabricante', 1),
(2, 'Importador', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `divisor`
--

CREATE TABLE `divisor` (
  `divisorID` int(11) NOT NULL,
  `papelID` int(11) NOT NULL COMMENT 'Cliente, Fornecedor...',
  `nome` varchar(255) NOT NULL,
  `ordem` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `divisor`
--

INSERT INTO `divisor` (`divisorID`, `papelID`, `nome`, `ordem`, `status`) VALUES
(1, 1, 'Geral', 1, 1),
(2, 1, 'Formulários', 2, 1),
(3, 1, 'Definições', 3, 1),
(4, 2, 'Geral', 1, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `fabrica_fornecedor`
--

CREATE TABLE `fabrica_fornecedor` (
  `fabricaFornecedorID` int(11) NOT NULL,
  `unidadeID` int(11) NOT NULL COMMENT 'unidadeID da fábrica',
  `fornecedorCnpj` varchar(18) NOT NULL COMMENT 'CNPJ do fornecedor',
  `obs` text DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `fabrica_fornecedor`
--

INSERT INTO `fabrica_fornecedor` (`fabricaFornecedorID`, `unidadeID`, `fornecedorCnpj`, `obs`, `status`) VALUES
(1, 3, '41.153.569/0001-74', NULL, 1),
(2, 1, '91.930.944/0001-13', NULL, 1),
(3, 1, '41.153.569/0001-74', NULL, 1),
(4, 1, '13.363.709/0001-01', NULL, 1),
(5, 2, '13.363.709/0001-01', NULL, 1),
(6, 1, '92.949.754/0001-00', NULL, 1),
(7, 1, '21.580.036/0001-61', NULL, 1),
(8, 1, '49.810.962/0001-03', NULL, 1),
(9, 1, '36.017.981/0001-27', NULL, 1),
(10, 1, '94.195.676/0001-21', NULL, 1),
(11, 1, '28.312.835/0001-04', NULL, 1),
(13, 3, '28.312.835/0001-04', NULL, 1),
(14, 1, '56.943.255/0001-42', NULL, 1),
(16, 1, '68.448.525/0001-28', NULL, 1),
(17, 1, '45.570.610/0001-69', NULL, 1),
(30, 1, '34.546.657/0001-70', NULL, 1),
(31, 1, '81.858.563/0001-17', NULL, 1),
(32, 1, '13.701.959/0001-04', NULL, 1),
(33, 1, '24.407.199/0001-35', NULL, 1),
(34, 1, '68.681.949/0001-38', NULL, 1),
(35, 1, '36.772.837/0001-04', NULL, 1),
(36, 1, '98.743.916/0001-36', NULL, 1),
(37, 1, '82.294.477/0001-91', NULL, 1),
(38, 1, '87.513.337/0001-80', NULL, 1),
(39, 1, '95.515.864/0001-52', NULL, 1),
(40, 1, '67.400.648/0001-26', NULL, 1),
(41, 1, '08.716.433/0001-50', NULL, 1),
(42, 1, '52.120.203/0001-15', NULL, 1),
(43, 1, '18.009.709/0001-13', NULL, 1),
(44, 1, '28.738.192/0001-57', NULL, 1),
(45, 1, '50.422.443/0001-49', NULL, 1),
(46, 1, 'null', NULL, 1),
(47, 1, 'undefined', NULL, 1),
(48, 1, '69.415.326/0001-86', NULL, 1),
(49, 1, '85.038.100/0001-60', NULL, 1),
(50, 1, '98.603.582/0001-03', NULL, 1),
(51, 1, '08.443.488/0001-33', NULL, 1),
(52, 1, '57.008.980/0001-96', NULL, 1),
(53, 1, '30.005.941/0001-89', NULL, 1),
(54, 1, '20.761.362/0001-02', NULL, 1),
(55, 1, '30.112.796/0001-35', NULL, 1),
(56, 1, '78.325.124/0001-34', NULL, 1),
(57, 1, '78.466.650/0001-14', NULL, 1),
(58, 1, '53.458.075/0001-87', NULL, 1),
(59, 1, '89.181.507/0001-00', NULL, 1),
(60, 1, '38.247.842/0001-15', NULL, 1),
(61, 1, '77.608.478/0001-23', NULL, 1),
(62, 1, '69.902.386/0001-23', NULL, 1),
(63, 1, '78.037.938/0001-73', NULL, 1),
(64, 1, '64.942.856/0001-69', NULL, 1),
(65, 1, '12.051.743/0001-70', NULL, 1),
(66, 1, '61.736.974/0001-22', NULL, 1),
(67, 1, '04.335.918/0001-42', NULL, 1),
(68, 1, '14.353.674/0001-84', NULL, 1),
(69, 1, '99.336.627/0001-85', NULL, 1),
(70, 1, '44.417.366/0001-36', NULL, 1),
(71, 1, '16.271.578/0001-12', NULL, 1),
(72, 1, '11.944.823/0001-91', NULL, 1),
(73, 1, '81.817.948/0001-36', NULL, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `fabrica_fornecedor_grupoanexo`
--

CREATE TABLE `fabrica_fornecedor_grupoanexo` (
  `fabricaFornecedorGrupoAnexoID` int(11) NOT NULL,
  `fabricaFornecedorID` int(11) NOT NULL,
  `grupoAnexoID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Extraindo dados da tabela `fabrica_fornecedor_grupoanexo`
--

INSERT INTO `fabrica_fornecedor_grupoanexo` (`fabricaFornecedorGrupoAnexoID`, `fabricaFornecedorID`, `grupoAnexoID`) VALUES
(1, 70, 1),
(2, 70, 2),
(3, 69, 3),
(4, 73, 1),
(5, 73, 6);

-- --------------------------------------------------------

--
-- Estrutura da tabela `fornecedor`
--

CREATE TABLE `fornecedor` (
  `fornecedorID` int(11) NOT NULL,
  `fabricante` int(11) NOT NULL DEFAULT 0 COMMENT '1->Sim, 0->Não',
  `importador` int(11) NOT NULL DEFAULT 0 COMMENT '1->Sim, 0->Não',
  `dataAvaliacao` date DEFAULT NULL,
  `cnpj` varchar(18) NOT NULL,
  `razaoSocial` varchar(255) DEFAULT NULL,
  `nome` varchar(255) DEFAULT NULL COMMENT 'Nome Fantasia',
  `email` varchar(255) DEFAULT NULL,
  `telefone` varchar(15) DEFAULT NULL,
  `brasil` int(11) DEFAULT NULL COMMENT '1->Fornecedor do Brasil, 0->Fornecedor estrangeiro',
  `cep` varchar(10) DEFAULT NULL,
  `logradouro` varchar(255) DEFAULT NULL,
  `numero` varchar(20) DEFAULT NULL,
  `complemento` varchar(255) DEFAULT NULL,
  `bairro` varchar(255) DEFAULT NULL,
  `cidade` varchar(255) DEFAULT NULL,
  `estado` varchar(255) DEFAULT NULL,
  `pais` varchar(255) DEFAULT NULL,
  `ie` varchar(255) DEFAULT NULL,
  `responsavel` varchar(255) DEFAULT NULL COMMENT 'Nome do fornecedor\r\nresponsável pelo preenchimento',
  `principaisClientes` varchar(255) DEFAULT NULL,
  `registroEstabelecimentoID` int(11) DEFAULT NULL,
  `numeroRegistro` varchar(255) DEFAULT NULL COMMENT 'Nº registro do estabelecimento (se não for ISENTO)',
  `obs` text DEFAULT NULL COMMENT 'Obs do formulário',
  `obsConclusao` text DEFAULT NULL,
  `unidadeID` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 10 COMMENT '10->Pendente (fornecedor não preencheu ainda)\r\n20->Acessou o link\r\n30->Em preenchimento (já salvou)\r\n40->Fornecedor concluiu preenchimento\r\n50->Reprovado\r\n60->Aprovado Parcial\r\n70->Aprovado\r\n',
  `atual` int(11) NOT NULL COMMENT '1->Avaliação atual desse fornecedor (última), 0->Não é a avaliação atual desse fornecedor (antiga)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `fornecedor`
--

INSERT INTO `fornecedor` (`fornecedorID`, `fabricante`, `importador`, `dataAvaliacao`, `cnpj`, `razaoSocial`, `nome`, `email`, `telefone`, `brasil`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `pais`, `ie`, `responsavel`, `principaisClientes`, `registroEstabelecimentoID`, `numeroRegistro`, `obs`, `obsConclusao`, `unidadeID`, `status`, `atual`) VALUES
(1, 1, 1, '2023-02-15', '28.312.835/0001-04', 'Abc uppp 333', 'hhhh', 'contato@tozzo.com.br', '(45) 45454-5454', 0, 'aa', 'Rua Minas Gerais', 'aa33aa444', 'Sala 206', 'aa233', 'quilombo555', 'SC', 'Brasil', '545787824', 'aa', 'aa', 1, NULL, '', NULL, 1, 70, 1),
(2, 0, 0, '2023-06-13', '28.312.835/0001-04', 'Almeida Prado Supermercado', 'Brasão Supermercado', 'ropioo@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'brf66699', 2, '12345', '', NULL, 1, 30, 1),
(46, 0, 0, NULL, '98.603.582/0001-03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(47, 0, 0, NULL, '08.443.488/0001-33', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(48, 0, 0, NULL, '57.008.980/0001-96', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(49, 0, 0, NULL, '30.005.941/0001-89', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(50, 0, 0, NULL, '20.761.362/0001-02', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(51, 0, 0, NULL, '30.112.796/0001-35', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(52, 0, 0, NULL, '78.325.124/0001-34', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(53, 0, 0, NULL, '78.466.650/0001-14', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(54, 0, 0, NULL, '53.458.075/0001-87', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(55, 0, 0, NULL, '89.181.507/0001-00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(56, 0, 0, NULL, '38.247.842/0001-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(57, 0, 0, NULL, '77.608.478/0001-23', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(58, 0, 0, NULL, '69.902.386/0001-23', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(59, 0, 0, NULL, '78.037.938/0001-73', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(60, 0, 0, NULL, '64.942.856/0001-69', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(61, 0, 0, NULL, '12.051.743/0001-70', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(62, 0, 0, NULL, '61.736.974/0001-22', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(63, 0, 0, NULL, '04.335.918/0001-42', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(64, 0, 0, NULL, '14.353.674/0001-84', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(65, 0, 0, NULL, '99.336.627/0001-85', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 20, 1),
(66, 0, 0, NULL, '44.417.366/0001-36', 'Jhonatan KK 28', 'Jhonatan KK 28', 'john@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Fulano', 'BRF', 3, '125', '', NULL, 1, 30, 1),
(67, 0, 0, NULL, '16.271.578/0001-12', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(68, 0, 0, NULL, '11.944.823/0001-91', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1),
(69, 0, 0, NULL, '81.817.948/0001-36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `fornecedor_atividade`
--

CREATE TABLE `fornecedor_atividade` (
  `fornecedorAtividadeID` int(11) NOT NULL,
  `fornecedorID` int(11) NOT NULL,
  `atividadeID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Estrutura da tabela `fornecedor_categoria`
--

CREATE TABLE `fornecedor_categoria` (
  `fornecedorCategoriaID` int(11) NOT NULL,
  `fornecedorID` int(11) NOT NULL,
  `categoriaID` int(11) NOT NULL COMMENT '1->Fabricante, 2->Importador'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `fornecedor_categoria`
--

INSERT INTO `fornecedor_categoria` (`fornecedorCategoriaID`, `fornecedorID`, `categoriaID`) VALUES
(19, 2, 1),
(20, 2, 2),
(21, 66, 2),
(22, 66, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `fornecedor_resposta`
--

CREATE TABLE `fornecedor_resposta` (
  `fornecedorRespostaID` int(11) NOT NULL,
  `fornecedorID` int(11) NOT NULL,
  `parFornecedorBlocoID` int(11) NOT NULL COMMENT 'ID do bloco',
  `itemID` int(11) NOT NULL,
  `resposta` varchar(255) NOT NULL COMMENT 'Descrição da resposta',
  `respostaID` int(11) NOT NULL COMMENT 'Se for resposta selecionável, guarda ID do alternativa_item',
  `pontuacao` int(11) DEFAULT NULL COMMENT 'Opcional',
  `obs` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `fornecedor_resposta`
--

INSERT INTO `fornecedor_resposta` (`fornecedorRespostaID`, `fornecedorID`, `parFornecedorBlocoID`, `itemID`, `resposta`, `respostaID`, `pontuacao`, `obs`) VALUES
(1, 66, 2, 3, 'Sim', 2, NULL, 'aaaa');

-- --------------------------------------------------------

--
-- Estrutura da tabela `fornecedor_sistemaqualidade`
--

CREATE TABLE `fornecedor_sistemaqualidade` (
  `fornecedorSistemaQualidadeID` int(11) NOT NULL,
  `fornecedorID` int(11) NOT NULL,
  `sistemaQualidadeID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `fornecedor_sistemaqualidade`
--

INSERT INTO `fornecedor_sistemaqualidade` (`fornecedorSistemaQualidadeID`, `fornecedorID`, `sistemaQualidadeID`) VALUES
(7, 7, 2);

-- --------------------------------------------------------

--
-- Estrutura da tabela `grupoanexo`
--

CREATE TABLE `grupoanexo` (
  `grupoanexoID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text DEFAULT NULL,
  `unidadeID` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `grupoanexo`
--

INSERT INTO `grupoanexo` (`grupoanexoID`, `nome`, `descricao`, `unidadeID`, `status`) VALUES
(1, 'Compra internacional', 'Documento necessários pra compra do calcári o pq sim...', 1, 1),
(2, 'Documentos compra material de limpeza', 'Desc...', 1, 1),
(6, 'Documentos de compra de calcário', NULL, 1, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `grupoanexo_item`
--

CREATE TABLE `grupoanexo_item` (
  `grupoanexoitemID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text DEFAULT NULL,
  `obrigatorio` int(11) NOT NULL DEFAULT 0 COMMENT '1->Obrigatório, 0->Opcional',
  `grupoanexoID` int(11) NOT NULL COMMENT 'Grupo do item',
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `grupoanexo_item`
--

INSERT INTO `grupoanexo_item` (`grupoanexoitemID`, `nome`, `descricao`, `obrigatorio`, `grupoanexoID`, `status`) VALUES
(3, 'Comprovante de limpeza', 'desc..', 1, 2, 1),
(4, 'Documento exportação', 'Desc...', 1, 3, 1),
(5, 'Comprovante extração', 'opa', 1, 1, 1),
(12, 'Comprovante venda', 'ssss', 1, 1, 1),
(16, 'Comporvante de extração de calcário', '...', 1, 6, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `grupoanexo_parformulario`
--

CREATE TABLE `grupoanexo_parformulario` (
  `grupoanexoParformularioID` int(11) NOT NULL,
  `grupoAnexoID` int(11) NOT NULL,
  `parFormularioID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Extraindo dados da tabela `grupoanexo_parformulario`
--

INSERT INTO `grupoanexo_parformulario` (`grupoanexoParformularioID`, `grupoAnexoID`, `parFormularioID`) VALUES
(76, 4, 1),
(77, 4, 3),
(78, 5, 2),
(82, 7, 1),
(139, 1, 3),
(140, 1, 1),
(141, 2, 1),
(142, 2, 2),
(143, 6, 2),
(144, 6, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `item`
--

CREATE TABLE `item` (
  `itemID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `parFormularioID` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `item`
--

INSERT INTO `item` (`itemID`, `nome`, `parFormularioID`, `status`) VALUES
(1, 'Os colaboradores receberam treinamento em BPF - Boas Práticas de Fabricação?', 1, 1),
(2, 'É realizada conscientização dos colaboradores sobre higiene pessoal?', 1, 1),
(3, 'Os colaboradores utilizam uniformes apropriados, limpos e em bom estado de conservação?', 1, 1),
(4, 'Existe local, produtos e materiais apropriados para desinfecção das mãos?', 1, 1),
(12, 'Qual a metade de 2 + 2 ?', 1, 1),
(13, 'O veículo está limpo externamente e em condições que não comprometem a integridade do produto?\r\n\r\n', 2, 1),
(14, 'A área interna do veículo encontra-se limpa, ausente de materiais estranhos e/ou vestígios de insetos e roedores?', 2, 1),
(15, 'Não há sinais visíveis de danos (frestas, pregos, parafusos, lascas de madeira, correntes) no assoalho, teto e paredes?\r\n\r\n\r\n', 2, 1),
(16, 'Não existem indícios de umidade, vazamentos ou mofo?', 2, 1),
(17, 'Não existem indícios de produtos químicos e/ou odores característicos destes produtos?\n\n', 2, 1),
(18, 'Descrição do último produto transportado:', 2, 1),
(19, 'As cantoneiras, cintas, travas e portas apresentam-se em condições adequadas e em quantidades suficientes à proteção da carga?', 2, 1),
(20, 'As lonas encontram-se limpas, ausentes de danos (rasgos e furos), secas e sem odores?', 2, 1),
(21, 'Os produtos encontram-se dentro do prazo de validade?', 2, 1),
(22, 'Os produtos encontram-se paletizados, estrechados, sem danos (furos e /ou rasgos)?', 2, 1),
(23, 'Possui laboratório próprio ?', 1, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `menu`
--

CREATE TABLE `menu` (
  `menuID` int(11) NOT NULL,
  `divisorID` int(11) NOT NULL COMMENT 'Divisor do menu',
  `nome` varchar(255) NOT NULL,
  `icone` varchar(255) NOT NULL,
  `rota` varchar(255) DEFAULT NULL COMMENT 'Se nula possui sub itens',
  `ordem` int(11) NOT NULL,
  `novo` int(11) NOT NULL DEFAULT 0 COMMENT '1 => Novo\r\n0 = > ''''',
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1 => Ativo\r\n0 => Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Extraindo dados da tabela `menu`
--

INSERT INTO `menu` (`menuID`, `divisorID`, `nome`, `icone`, `rota`, `ordem`, `novo`, `status`) VALUES
(1, 1, 'Início', 'material-symbols:home-outline-rounded', '/home', 1, 0, 1),
(2, 2, 'Fornecedor', 'mdi:truck-fast-outline', '/formularios/fornecedor', 2, 1, 1),
(3, 2, 'Recebimento MP', 'icon-park-outline:receive', '/formularios/recebimento-mp', 3, 0, 1),
(4, 3, 'Cadastros', 'ph:note-pencil', NULL, 4, 0, 1),
(5, 3, 'Configurações', 'ph:gear', NULL, 5, 0, 1),
(7, 4, 'Meus Dados', 'mdi:user', '/meus-dados', 3, 0, 1),
(8, 4, 'Formulários', 'fluent:form-24-regular', '/formularios/fornecedor', 2, 0, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `movimentacaoformulario`
--

CREATE TABLE `movimentacaoformulario` (
  `movimentacaoFormularioID` int(11) NOT NULL,
  `parFormularioID` int(11) NOT NULL COMMENT 'Tipo do formulário: 1->Fornecedor, 2->Recebimento MP, ...',
  `id` int(11) NOT NULL COMMENT 'id do formulário',
  `usuarioID` int(11) NOT NULL,
  `unidadeID` int(11) NOT NULL,
  `papelID` int(11) NOT NULL COMMENT '1->Fábrica, 2->Fornecedor',
  `dataHora` datetime NOT NULL,
  `statusAnterior` int(11) NOT NULL,
  `statusAtual` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `movimentacaoformulario`
--

INSERT INTO `movimentacaoformulario` (`movimentacaoFormularioID`, `parFormularioID`, `id`, `usuarioID`, `unidadeID`, `papelID`, `dataHora`, `statusAnterior`, `statusAtual`) VALUES
(12, 1, 7, 33, 29, 2, '2023-05-22 15:56:08', 70, 30),
(13, 1, 6, 33, 29, 2, '2023-05-22 15:57:39', 20, 30),
(14, 1, 10, 1, 1, 1, '2023-05-22 16:02:47', 60, 50),
(15, 1, 3, 1, 1, 1, '2023-05-23 08:46:17', 50, 70),
(16, 1, 4, 33, 29, 2, '2023-05-23 08:56:05', 30, 40),
(17, 1, 2, 33, 29, 2, '2023-05-23 09:03:04', 20, 30),
(18, 1, 2, 33, 29, 2, '2023-05-23 09:03:46', 30, 40),
(19, 1, 2, 1, 1, 1, '2023-05-23 09:04:20', 40, 60),
(20, 1, 2, 1, 1, 1, '2023-05-23 09:04:44', 60, 50),
(21, 1, 2, 1, 1, 1, '2023-05-23 09:05:05', 50, 70),
(22, 1, 25, 1, 1, 1, '2023-05-23 09:06:06', 0, 10),
(23, 1, 26, 1, 1, 1, '2023-05-23 09:09:10', 0, 10),
(24, 1, 2, 1, 1, 1, '2023-05-23 11:51:55', 70, 60),
(25, 1, 2, 1, 1, 1, '2023-05-23 11:51:58', 60, 50),
(26, 1, 1, 1, 1, 1, '2023-05-23 11:52:01', 50, 60),
(27, 1, 1, 1, 1, 1, '2023-05-23 11:52:04', 60, 70),
(28, 1, 27, 1, 1, 1, '2023-05-23 14:34:37', 0, 10),
(29, 1, 2, 1, 1, 1, '2023-05-23 17:02:12', 70, 10),
(30, 1, 2, 1, 1, 1, '2023-05-23 17:02:43', 10, 40),
(31, 1, 2, 1, 1, 1, '2023-05-23 17:07:38', 40, 20),
(32, 1, 2, 1, 1, 1, '2023-05-23 17:13:07', 20, 30),
(33, 1, 2, 1, 1, 1, '2023-05-23 17:13:26', 30, 10),
(34, 1, 2, 1, 1, 1, '2023-05-23 17:15:06', 10, 20),
(35, 1, 2, 1, 1, 1, '2023-05-23 17:16:23', 20, 10),
(36, 1, 2, 1, 1, 1, '2023-05-23 17:18:30', 10, 20),
(37, 1, 2, 1, 1, 1, '2023-05-23 17:19:28', 20, 30),
(38, 1, 2, 1, 1, 1, '2023-05-23 17:23:39', 30, 20),
(39, 1, 13, 1, 1, 1, '2023-05-23 17:24:51', 10, 20),
(40, 1, 2, 1, 1, 1, '2023-05-23 17:34:21', 20, 10),
(41, 1, 2, 1, 1, 1, '2023-05-23 17:36:34', 10, 20),
(42, 1, 2, 1, 1, 1, '2023-05-23 17:39:00', 20, 30),
(43, 1, 2, 1, 1, 1, '2023-05-23 17:40:10', 30, 10),
(44, 1, 3, 1, 1, 1, '2023-05-23 17:47:06', 70, 10),
(45, 1, 3, 1, 1, 1, '2023-05-23 17:47:14', 10, 30),
(46, 1, 3, 1, 1, 1, '2023-05-23 17:48:03', 30, 10),
(47, 1, 3, 1, 1, 1, '2023-05-23 17:49:21', 10, 10),
(48, 1, 10, 1, 1, 1, '2023-05-23 17:49:45', 50, 10),
(49, 1, 10, 1, 1, 1, '2023-05-23 17:55:05', 10, 20),
(50, 1, 2, 1, 1, 1, '2023-05-24 08:12:28', 10, 20),
(51, 1, 2, 1, 1, 1, '2023-05-24 08:12:37', 20, 30),
(52, 1, 2, 1, 1, 1, '2023-05-24 08:14:19', 30, 20),
(53, 1, 2, 33, 29, 2, '2023-05-24 08:18:19', 20, 30),
(54, 1, 2, 33, 29, 2, '2023-05-24 08:18:23', 30, 40),
(55, 1, 3, 33, 29, 2, '2023-05-24 08:20:49', 10, 30),
(56, 1, 3, 33, 29, 2, '2023-05-24 08:26:56', 30, 40),
(57, 1, 6, 33, 29, 2, '2023-05-24 08:30:00', 30, 40),
(58, 1, 7, 33, 29, 2, '2023-05-24 08:34:09', 30, 40),
(59, 1, 4, 1, 1, 1, '2023-05-24 08:38:23', 40, 10),
(60, 1, 3, 1, 1, 1, '2023-05-24 08:39:50', 40, 20),
(61, 1, 1, 1, 1, 1, '2023-05-24 08:43:12', 40, 60),
(62, 1, 1, 1, 1, 1, '2023-05-24 08:44:04', 60, 50),
(63, 1, 1, 1, 1, 1, '2023-05-24 08:44:20', 50, 70),
(64, 1, 2, 1, 1, 1, '2023-05-24 08:55:36', 40, 60),
(65, 1, 28, 1, 1, 1, '2023-05-24 09:15:19', 0, 10),
(66, 1, 2, 1, 1, 1, '2023-05-24 09:24:34', 60, 20),
(67, 1, 29, 1, 1, 1, '2023-05-24 09:26:13', 0, 10),
(68, 1, 30, 1, 1, 1, '2023-05-24 09:31:47', 0, 10),
(69, 1, 31, 1, 1, 1, '2023-05-24 09:32:33', 0, 10),
(70, 1, 32, 1, 1, 1, '2023-05-24 10:01:57', 0, 10),
(71, 1, 33, 1, 1, 1, '2023-05-24 10:04:29', 0, 10),
(72, 1, 34, 1, 1, 1, '2023-05-24 10:05:43', 0, 10),
(73, 1, 35, 1, 1, 1, '2023-05-24 10:08:24', 0, 10),
(74, 1, 36, 1, 1, 1, '2023-05-24 10:23:05', 0, 10),
(75, 1, 37, 1, 1, 1, '2023-05-24 10:26:21', 0, 10),
(76, 1, 38, 1, 1, 1, '2023-05-24 10:27:31', 0, 10),
(77, 1, 39, 1, 1, 1, '2023-05-24 10:31:21', 0, 10),
(78, 1, 40, 1, 1, 1, '2023-05-24 10:33:38', 0, 10),
(79, 1, 41, 1, 1, 1, '2023-05-24 10:38:43', 0, 10),
(80, 1, 42, 1, 1, 1, '2023-05-24 10:54:36', 0, 10),
(81, 1, 43, 1, 1, 1, '2023-05-24 10:59:49', 0, 10),
(82, 1, 44, 1, 1, 1, '2023-05-24 11:22:03', 0, 10),
(83, 1, 45, 1, 1, 1, '2023-05-24 11:32:47', 0, 10),
(84, 1, 46, 1, 1, 1, '2023-05-24 11:34:30', 0, 10),
(85, 1, 47, 1, 1, 1, '2023-05-24 11:50:34', 0, 10),
(86, 1, 48, 1, 1, 1, '2023-05-24 13:59:25', 0, 10),
(87, 1, 49, 1, 1, 1, '2023-05-24 14:39:19', 0, 10),
(88, 1, 50, 1, 1, 1, '2023-05-24 15:11:16', 0, 10),
(89, 1, 51, 1, 1, 1, '2023-05-24 16:38:47', 0, 10),
(90, 1, 52, 1, 1, 1, '2023-05-24 16:42:30', 0, 10),
(91, 1, 53, 1, 1, 1, '2023-05-24 16:45:08', 0, 10),
(92, 1, 54, 1, 1, 1, '2023-05-24 16:46:36', 0, 10),
(93, 1, 55, 1, 1, 1, '2023-05-24 16:48:02', 0, 10),
(94, 1, 56, 1, 1, 1, '2023-05-24 16:49:56', 0, 10),
(95, 1, 57, 1, 1, 1, '2023-05-24 16:52:33', 0, 10),
(96, 1, 58, 1, 1, 1, '2023-05-24 16:53:38', 0, 10),
(97, 1, 59, 1, 1, 1, '2023-05-24 16:54:16', 0, 10),
(98, 1, 60, 1, 1, 1, '2023-05-24 16:55:58', 0, 10),
(99, 1, 61, 1, 1, 1, '2023-05-24 16:58:27', 0, 10),
(100, 1, 62, 1, 1, 1, '2023-05-24 16:58:58', 0, 10),
(101, 1, 63, 1, 1, 1, '2023-05-24 16:59:21', 0, 10),
(102, 1, 64, 1, 1, 1, '2023-05-25 09:19:39', 0, 10),
(103, 1, 2, 33, 29, 2, '2023-05-25 10:26:53', 20, 30),
(104, 1, 2, 33, 29, 2, '2023-05-30 16:08:30', 30, 40),
(105, 1, 65, 1, 1, 1, '2023-06-02 11:43:31', 0, 10),
(106, 1, 65, 0, 1, 2, '2023-06-02 11:45:35', 10, 20),
(107, 1, 2, 1, 1, 1, '2023-06-07 08:08:10', 40, 30),
(108, 1, 2, 33, 29, 2, '2023-06-07 09:38:52', 30, 40),
(109, 1, 2, 1, 1, 1, '2023-06-07 09:39:51', 40, 10),
(110, 1, 2, 33, 29, 2, '2023-06-07 09:40:24', 10, 30),
(111, 1, 2, 33, 29, 2, '2023-06-12 10:22:52', 30, 40),
(112, 1, 2, 1, 1, 1, '2023-06-12 10:35:58', 40, 30),
(113, 2, 1, 1, 1, 1, '2023-06-12 11:25:53', 60, 30),
(114, 2, 1, 1, 1, 1, '2023-06-12 14:51:09', 70, 50),
(115, 2, 1, 1, 1, 1, '2023-06-12 14:51:40', 50, 60),
(116, 2, 1, 1, 1, 1, '2023-06-12 15:03:50', 60, 30),
(117, 2, 1, 1, 1, 1, '2023-06-12 15:32:38', 30, 70),
(118, 2, 1, 1, 1, 1, '2023-06-12 15:34:59', 70, 30),
(119, 2, 1, 1, 1, 1, '2023-06-12 15:38:26', 30, 60),
(120, 2, 1, 1, 1, 1, '2023-06-12 15:38:37', 60, 30),
(121, 1, 2, 33, 29, 2, '2023-06-12 15:39:34', 30, 40),
(122, 1, 2, 1, 1, 1, '2023-06-12 15:50:12', 40, 70),
(123, 1, 2, 1, 1, 1, '2023-06-12 15:51:22', 70, 30),
(124, 1, 2, 33, 29, 2, '2023-06-12 15:54:02', 30, 40),
(125, 1, 2, 1, 1, 1, '2023-06-12 15:55:10', 40, 50),
(126, 1, 2, 1, 1, 1, '2023-06-12 15:55:43', 50, 30),
(127, 1, 2, 33, 29, 2, '2023-06-12 15:56:16', 30, 40),
(128, 1, 2, 1, 1, 1, '2023-06-12 16:17:51', 40, 60),
(129, 1, 2, 1, 1, 1, '2023-06-12 16:24:17', 60, 30),
(130, 1, 2, 33, 29, 2, '2023-06-12 16:26:44', 30, 40),
(131, 2, 1, 1, 1, 1, '2023-06-12 16:40:09', 30, 70),
(132, 2, 1, 1, 1, 1, '2023-06-12 16:41:19', 70, 30),
(133, 2, 1, 1, 1, 1, '2023-06-12 16:41:39', 30, 50),
(134, 2, 1, 1, 1, 1, '2023-06-12 16:45:31', 50, 30),
(135, 2, 1, 1, 1, 1, '2023-06-13 08:33:57', 30, 60),
(136, 2, 1, 1, 1, 1, '2023-06-13 08:49:30', 60, 30),
(137, 2, 1, 1, 1, 1, '2023-06-13 11:50:23', 30, 60),
(138, 2, 1, 1, 1, 1, '2023-06-13 11:51:30', 60, 30),
(139, 2, 1, 1, 1, 1, '2023-06-13 11:52:21', 30, 60),
(140, 2, 1, 1, 1, 1, '2023-06-13 13:51:31', 60, 30),
(141, 2, 1, 1, 1, 1, '2023-06-13 13:52:17', 30, 60),
(142, 2, 1, 1, 1, 1, '2023-06-13 13:53:05', 60, 30),
(143, 2, 1, 1, 1, 1, '2023-06-13 14:26:23', 30, 50),
(144, 2, 1, 1, 1, 1, '2023-06-13 14:26:36', 50, 30),
(145, 2, 1, 1, 1, 1, '2023-06-13 14:37:12', 30, 50),
(146, 1, 2, 1, 1, 1, '2023-06-13 14:38:01', 40, 30),
(147, 1, 2, 33, 29, 2, '2023-06-13 14:44:49', 30, 40),
(148, 1, 2, 1, 1, 1, '2023-06-13 14:48:33', 40, 30),
(149, 2, 1, 1, 1, 1, '2023-06-13 15:38:55', 50, 30),
(150, 2, 26, 1, 1, 1, '2023-06-15 09:16:10', 0, 10),
(151, 2, 27, 1, 1, 1, '2023-06-15 09:19:58', 0, 10),
(152, 1, 66, 1, 1, 1, '2023-06-15 11:00:41', 0, 10),
(153, 1, 66, 37, 31, 2, '2023-07-04 14:15:55', 10, 30),
(154, 1, 67, 1, 1, 1, '2023-07-12 09:16:06', 0, 10),
(155, 1, 68, 1, 1, 1, '2023-07-12 11:04:43', 0, 10),
(156, 1, 69, 1, 1, 1, '2023-07-12 14:13:23', 0, 10);

-- --------------------------------------------------------

--
-- Estrutura da tabela `papel`
--

CREATE TABLE `papel` (
  `papelID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo',
  `dataCadastro` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `papel`
--

INSERT INTO `papel` (`papelID`, `nome`, `status`, `dataCadastro`) VALUES
(1, 'Fábrica', 1, '2023-05-03'),
(2, 'Fornecedor', 1, '2023-05-03'),
(3, 'Transportador', 1, '2023-05-03');

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_formulario`
--

CREATE TABLE `par_formulario` (
  `parFormularioID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `tabela` varchar(255) NOT NULL,
  `obs` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_formulario`
--

INSERT INTO `par_formulario` (`parFormularioID`, `nome`, `tabela`, `obs`) VALUES
(1, 'Fornecedor', 'par_fornecedor', 'Opaaaaaa uppp\n'),
(2, 'Recebimento MP', 'par_recebimentomp', 'Opa sopa vamo inter'),
(3, 'Não Conformidade', 'par_naoconformidade', NULL);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_fornecedor`
--

CREATE TABLE `par_fornecedor` (
  `parFornecedorID` int(11) NOT NULL,
  `ordem` int(11) NOT NULL DEFAULT 1 COMMENT 'Ordem de exibição no formulário',
  `nomeCampo` varchar(255) NOT NULL,
  `tabela` varchar(255) DEFAULT NULL,
  `nomeColuna` varchar(255) NOT NULL COMMENT 'Deve possuir uma coluna com esse nome na tabela fornecedor',
  `tipo` varchar(50) NOT NULL,
  `obs` text DEFAULT NULL COMMENT 'Obs para desenvolvimento'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_fornecedor`
--

INSERT INTO `par_fornecedor` (`parFornecedorID`, `ordem`, `nomeCampo`, `tabela`, `nomeColuna`, `tipo`, `obs`) VALUES
(1, 1, 'Data da avaliação', NULL, 'dataAvaliacao', 'date', NULL),
(2, 2, 'CNPJ', NULL, 'cnpj', 'string', NULL),
(3, 3, 'Razão Social', NULL, 'razaoSocial', 'string', NULL),
(4, 5, 'E-mail', NULL, 'email', 'string', NULL),
(5, 6, 'Telefone', NULL, 'telefone', 'string', NULL),
(6, 8, 'CEP', NULL, 'cep', 'string', NULL),
(7, 9, 'Logradouro', NULL, 'logradouro', 'string', NULL),
(8, 10, 'Nº', NULL, 'numero', 'string', 'Nº do endereço do imóvel'),
(9, 11, 'Complemento', NULL, 'complemento', 'string', NULL),
(10, 12, 'Bairro', NULL, 'bairro', 'string', NULL),
(11, 13, 'Cidade', NULL, 'cidade', 'string', NULL),
(12, 14, 'Estado', NULL, 'estado', 'string', NULL),
(13, 15, 'País', NULL, 'pais', 'string', NULL),
(14, 17, 'IE', NULL, 'ie', 'string', NULL),
(15, 4, 'Nome fantasia', NULL, 'nome', 'string', NULL),
(16, 7, 'Responsável', NULL, 'responsavel', 'string', NULL),
(17, 18, 'Principais clientes', NULL, 'principaisClientes', 'string', NULL),
(18, 19, 'Registro Mapa', NULL, 'registroMapa', 'string', NULL),
(20, 20, 'Registro do Estabelecimento', 'registroestabelecimento', 'registroEstabelecimentoID', 'int', NULL),
(21, 21, 'Nº do Registro', NULL, 'numeroRegistro', 'string', 'Nº do registro do estabelecimento (se não for ISENTO)');

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_fornecedor_bloco`
--

CREATE TABLE `par_fornecedor_bloco` (
  `parFornecedorBlocoID` int(11) NOT NULL,
  `ordem` int(11) NOT NULL COMMENT 'Ordem de exibição',
  `nome` varchar(255) NOT NULL,
  `obs` int(11) NOT NULL DEFAULT 1 COMMENT '1->Possui obs no bloco, 0->Não possui obs',
  `unidadeID` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_fornecedor_bloco`
--

INSERT INTO `par_fornecedor_bloco` (`parFornecedorBlocoID`, `ordem`, `nome`, `obs`, `unidadeID`, `status`) VALUES
(1, 2, 'Fabricante e Importador upppp 55', 1, 1, 1),
(2, 2, 'Só Importador', 1, 1, 1),
(3, 1, 'Itens Avaliados uni 2', 1, 2, 1),
(9, 3, 'Só Fabricante', 0, 1, 1),
(102, 4, 'novo Blooooocooooo', 0, 1, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_fornecedor_bloco_atividade`
--

CREATE TABLE `par_fornecedor_bloco_atividade` (
  `parFornecedorBlocoAtividadeID` int(11) NOT NULL,
  `parFornecedorBlocoID` int(11) NOT NULL,
  `atividadeID` int(11) NOT NULL,
  `unidadeID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_fornecedor_bloco_atividade`
--

INSERT INTO `par_fornecedor_bloco_atividade` (`parFornecedorBlocoAtividadeID`, `parFornecedorBlocoID`, `atividadeID`, `unidadeID`) VALUES
(19, 10, 6, 1),
(20, 10, 2, 1),
(21, 11, 3, 1),
(22, 12, 7, 1),
(23, 13, 6, 1),
(24, 13, 5, 1),
(25, 14, 6, 1),
(26, 14, 2, 1),
(27, 15, 3, 1),
(28, 16, 7, 1),
(29, 17, 6, 1),
(30, 17, 5, 1),
(31, 17, 3, 1),
(32, 18, 6, 1),
(33, 18, 7, 1),
(34, 18, 2, 1),
(35, 19, 6, 1),
(36, 19, 5, 1),
(37, 20, 6, 1),
(38, 20, 5, 1),
(39, 21, 6, 1),
(40, 21, 2, 1),
(41, 22, 6, 1),
(42, 22, 2, 1),
(43, 23, 3, 1),
(44, 24, 7, 1),
(45, 25, 6, 1),
(46, 25, 5, 1),
(47, 25, 3, 1),
(48, 26, 6, 1),
(49, 26, 7, 1),
(50, 26, 2, 1),
(51, 27, 6, 1),
(52, 27, 5, 1),
(53, 27, 3, 1),
(54, 28, 6, 1),
(55, 28, 5, 1),
(56, 28, 7, 1),
(57, 29, 6, 1),
(58, 29, 5, 1),
(59, 29, 2, 1),
(60, 30, 6, 1),
(61, 30, 5, 1),
(62, 30, 2, 1),
(63, 31, 6, 1),
(64, 31, 5, 1),
(65, 31, 3, 1),
(66, 32, 6, 1),
(67, 32, 5, 1),
(68, 33, 6, 1),
(69, 33, 5, 1),
(70, 34, 6, 1),
(71, 34, 2, 1),
(72, 35, 6, 1),
(73, 35, 2, 1),
(74, 36, 6, 1),
(75, 36, 7, 1),
(76, 36, 2, 1),
(77, 37, 6, 1),
(78, 37, 2, 1),
(79, 38, 6, 1),
(80, 38, 2, 1),
(81, 39, 3, 1),
(82, 40, 7, 1),
(83, 41, 3, 1),
(84, 42, 7, 1),
(85, 43, 3, 1),
(86, 44, 7, 1),
(87, 45, 3, 1),
(88, 46, 7, 1),
(89, 47, 6, 1),
(90, 47, 5, 1),
(91, 48, 6, 1),
(92, 48, 5, 1),
(93, 49, 6, 1),
(94, 49, 5, 1),
(95, 49, 3, 1),
(96, 50, 6, 1),
(97, 50, 5, 1),
(98, 51, 6, 1),
(99, 51, 5, 1),
(100, 52, 6, 1),
(101, 52, 5, 1),
(102, 52, 3, 1),
(103, 53, 6, 1),
(104, 53, 5, 1),
(105, 53, 3, 1),
(106, 54, 6, 1),
(107, 54, 5, 1),
(108, 54, 7, 1),
(109, 55, 6, 1),
(110, 55, 5, 1),
(111, 55, 3, 1),
(112, 56, 6, 1),
(113, 56, 5, 1),
(114, 57, 6, 1),
(115, 57, 5, 1),
(116, 58, 6, 1),
(117, 58, 2, 1),
(118, 59, 6, 1),
(119, 59, 2, 1),
(120, 60, 6, 1),
(121, 60, 7, 1),
(122, 60, 2, 1),
(123, 61, 6, 1),
(124, 61, 2, 1),
(125, 62, 6, 1),
(126, 62, 2, 1),
(127, 63, 6, 1),
(128, 63, 7, 1),
(129, 63, 2, 1),
(130, 64, 6, 1),
(131, 64, 5, 1),
(132, 64, 2, 1),
(133, 65, 6, 1),
(134, 65, 5, 1),
(135, 65, 2, 1),
(136, 66, 6, 1),
(137, 66, 2, 1),
(138, 67, 6, 1),
(139, 67, 2, 1),
(140, 68, 6, 1),
(141, 68, 7, 1),
(142, 68, 2, 1),
(143, 69, 6, 1),
(144, 69, 2, 1),
(145, 70, 6, 1),
(146, 70, 2, 1),
(147, 71, 3, 1),
(148, 72, 7, 1),
(149, 73, 6, 1),
(150, 73, 5, 1),
(151, 74, 6, 1),
(152, 74, 2, 1),
(153, 75, 3, 1),
(154, 76, 7, 1),
(155, 77, 3, 1),
(156, 78, 7, 1),
(157, 79, 6, 1),
(158, 79, 5, 1),
(159, 80, 6, 1),
(160, 80, 5, 1),
(161, 81, 6, 1),
(162, 81, 2, 1),
(163, 82, 6, 1),
(164, 82, 2, 1),
(165, 83, 3, 1),
(166, 84, 7, 1),
(167, 85, 3, 1),
(168, 86, 7, 1),
(169, 87, 6, 1),
(170, 87, 5, 1),
(171, 87, 3, 1),
(172, 88, 6, 1),
(173, 88, 5, 1),
(174, 88, 7, 1),
(175, 89, 6, 1),
(176, 89, 3, 1),
(177, 89, 2, 1),
(178, 90, 6, 1),
(179, 90, 7, 1),
(180, 90, 2, 1),
(181, 91, 6, 1),
(182, 91, 5, 1),
(183, 92, 6, 1),
(184, 92, 5, 1),
(185, 93, 6, 1),
(186, 93, 5, 1),
(187, 94, 6, 1),
(188, 94, 5, 1),
(189, 95, 6, 1),
(190, 95, 2, 1),
(191, 96, 6, 1),
(192, 96, 2, 1),
(193, 97, 6, 1),
(194, 97, 2, 1),
(195, 98, 6, 1),
(196, 98, 2, 1),
(197, 99, 3, 1),
(198, 100, 7, 1),
(199, 101, 6, 1),
(200, 101, 5, 1),
(458, 1, 3, 1),
(459, 1, 1, 1),
(460, 1, 2, 1),
(461, 2, 7, 1),
(462, 9, 6, 1),
(463, 9, 5, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_fornecedor_bloco_categoria`
--

CREATE TABLE `par_fornecedor_bloco_categoria` (
  `parFornecedorBlocoCategoriaID` int(11) NOT NULL,
  `parFornecedorBlocoID` int(11) NOT NULL,
  `categoriaID` int(11) NOT NULL COMMENT '1->Fabricante, 2->Importador',
  `unidadeID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_fornecedor_bloco_categoria`
--

INSERT INTO `par_fornecedor_bloco_categoria` (`parFornecedorBlocoCategoriaID`, `parFornecedorBlocoID`, `categoriaID`, `unidadeID`) VALUES
(10, 4, 1, 1),
(12, 10, 2, 1),
(13, 11, 1, 1),
(14, 11, 2, 1),
(15, 12, 2, 1),
(16, 13, 1, 1),
(17, 14, 2, 1),
(18, 15, 1, 1),
(19, 15, 2, 1),
(20, 16, 2, 1),
(21, 17, 1, 1),
(22, 17, 2, 1),
(23, 18, 2, 1),
(24, 19, 1, 1),
(25, 20, 1, 1),
(26, 21, 2, 1),
(27, 22, 2, 1),
(28, 23, 1, 1),
(29, 23, 2, 1),
(30, 24, 2, 1),
(31, 25, 1, 1),
(32, 25, 2, 1),
(33, 26, 2, 1),
(34, 27, 1, 1),
(35, 27, 2, 1),
(36, 28, 1, 1),
(37, 28, 2, 1),
(38, 29, 1, 1),
(39, 29, 2, 1),
(40, 30, 1, 1),
(41, 30, 2, 1),
(42, 31, 1, 1),
(43, 31, 2, 1),
(44, 32, 1, 1),
(45, 33, 1, 1),
(46, 34, 2, 1),
(47, 35, 2, 1),
(48, 36, 2, 1),
(49, 37, 2, 1),
(50, 38, 2, 1),
(51, 39, 1, 1),
(52, 39, 2, 1),
(53, 40, 2, 1),
(54, 41, 1, 1),
(55, 41, 2, 1),
(56, 42, 2, 1),
(57, 43, 1, 1),
(58, 43, 2, 1),
(59, 44, 2, 1),
(60, 45, 1, 1),
(61, 45, 2, 1),
(62, 46, 2, 1),
(63, 47, 1, 1),
(64, 48, 1, 1),
(65, 49, 1, 1),
(66, 49, 2, 1),
(67, 50, 1, 1),
(68, 51, 1, 1),
(69, 52, 1, 1),
(70, 52, 2, 1),
(71, 53, 1, 1),
(72, 53, 2, 1),
(73, 54, 1, 1),
(74, 54, 2, 1),
(75, 55, 1, 1),
(76, 55, 2, 1),
(77, 56, 1, 1),
(78, 57, 1, 1),
(79, 58, 2, 1),
(80, 59, 2, 1),
(81, 60, 2, 1),
(82, 61, 2, 1),
(83, 62, 2, 1),
(84, 63, 2, 1),
(85, 64, 1, 1),
(86, 64, 2, 1),
(87, 65, 1, 1),
(88, 65, 2, 1),
(89, 66, 2, 1),
(90, 67, 2, 1),
(91, 68, 2, 1),
(92, 69, 2, 1),
(93, 70, 2, 1),
(94, 71, 1, 1),
(95, 71, 2, 1),
(96, 72, 2, 1),
(97, 73, 1, 1),
(98, 74, 2, 1),
(99, 75, 1, 1),
(100, 75, 2, 1),
(101, 76, 2, 1),
(102, 77, 1, 1),
(103, 77, 2, 1),
(104, 78, 2, 1),
(105, 79, 1, 1),
(106, 80, 1, 1),
(107, 81, 2, 1),
(108, 82, 2, 1),
(109, 83, 1, 1),
(110, 83, 2, 1),
(111, 84, 2, 1),
(112, 85, 1, 1),
(113, 85, 2, 1),
(114, 86, 2, 1),
(115, 87, 1, 1),
(116, 87, 2, 1),
(117, 88, 1, 1),
(118, 88, 2, 1),
(119, 89, 1, 1),
(120, 89, 2, 1),
(121, 90, 2, 1),
(122, 91, 1, 1),
(123, 92, 1, 1),
(124, 93, 1, 1),
(125, 94, 1, 1),
(126, 95, 2, 1),
(127, 96, 2, 1),
(128, 97, 2, 1),
(129, 98, 2, 1),
(130, 99, 1, 1),
(131, 99, 2, 1),
(132, 100, 2, 1),
(133, 101, 1, 1),
(524, 1, 1, 1),
(525, 1, 2, 1),
(526, 2, 1, 1),
(527, 9, 1, 1),
(528, 102, 1, 1),
(529, 102, 2, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_fornecedor_bloco_item`
--

CREATE TABLE `par_fornecedor_bloco_item` (
  `parFornecedorBlocoItemID` int(11) NOT NULL,
  `parFornecedorBlocoID` int(11) NOT NULL,
  `ordem` int(11) NOT NULL,
  `itemID` int(11) NOT NULL,
  `alternativaID` int(11) NOT NULL COMMENT 'Forma de resposta no formulário',
  `obs` int(11) NOT NULL DEFAULT 1 COMMENT '1->Possui obs, 0->Não possui obs',
  `obrigatorio` int(11) NOT NULL DEFAULT 0 COMMENT '1->Obrigatório, 0->Não obrigatório',
  `pontuacao` int(11) NOT NULL DEFAULT 0 COMMENT '1->Tem pontuação, 0->Não tem pontuação',
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_fornecedor_bloco_item`
--

INSERT INTO `par_fornecedor_bloco_item` (`parFornecedorBlocoItemID`, `parFornecedorBlocoID`, `ordem`, `itemID`, `alternativaID`, `obs`, `obrigatorio`, `pontuacao`, `status`) VALUES
(21, 10, 1, 12, 3, 1, 1, 0, 1),
(32, 23, 2, 23, 2, 1, 1, 0, 1),
(33, 39, 2, 12, 2, 1, 1, 0, 1),
(34, 83, 2, 23, 2, 1, 1, 0, 1),
(50, 2, 1, 2, 3, 1, 1, 1, 1),
(51, 102, 1, 12, 2, 1, 1, 0, 1),
(56, 1, 2, 1, 4, 0, 0, 0, 1),
(61, 1, 8, 12, 2, 1, 1, 0, 1),
(62, 102, 2, 3, 1, 1, 1, 0, 1),
(63, 102, 3, 23, 2, 1, 1, 0, 1),
(64, 2, 2, 4, 3, 1, 1, 0, 1),
(65, 2, 3, 4, 3, 1, 1, 0, 1),
(66, 1, 3, 2, 4, 1, 1, 0, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_fornecedor_bloco_item_pontuacao`
--

CREATE TABLE `par_fornecedor_bloco_item_pontuacao` (
  `parFornecedorBlocoItemPontuacaoID` int(11) NOT NULL,
  `parFornecedorBlocoItemID` int(11) NOT NULL,
  `alternativaID` int(11) NOT NULL,
  `alternativaItemID` int(11) NOT NULL COMMENT 'Sim, Não...',
  `pontuacao` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_fornecedor_bloco_item_pontuacao`
--

INSERT INTO `par_fornecedor_bloco_item_pontuacao` (`parFornecedorBlocoItemPontuacaoID`, `parFornecedorBlocoItemID`, `alternativaID`, `alternativaItemID`, `pontuacao`) VALUES
(3, 50, 3, 6, 2),
(4, 50, 3, 7, 4);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_fornecedor_unidade`
--

CREATE TABLE `par_fornecedor_unidade` (
  `parFornecedorUnidadeID` int(11) NOT NULL,
  `parFornecedorID` int(11) NOT NULL,
  `unidadeID` int(11) NOT NULL,
  `obrigatorio` int(11) NOT NULL DEFAULT 1 COMMENT '1->Obrigatório, 0->Não obrigatório'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_fornecedor_unidade`
--

INSERT INTO `par_fornecedor_unidade` (`parFornecedorUnidadeID`, `parFornecedorID`, `unidadeID`, `obrigatorio`) VALUES
(41, 19, 1, 1),
(47, 1, 1, 1),
(64, 3, 1, 1),
(65, 4, 1, 1),
(67, 1, 2, 0),
(68, 2, 2, 0),
(69, 20, 1, 1),
(70, 17, 1, 0),
(71, 1, 3, 1),
(72, 2, 3, 1),
(73, 3, 3, 1),
(74, 21, 1, 1),
(75, 16, 1, 1),
(76, 5, 1, 1),
(77, 2, 1, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_recebimentomp`
--

CREATE TABLE `par_recebimentomp` (
  `parRecebimentompID` int(11) NOT NULL,
  `ordem` int(11) NOT NULL COMMENT 'Ordem de exibição no formulário',
  `nomeCampo` varchar(255) NOT NULL,
  `tabela` varchar(255) DEFAULT NULL COMMENT 'Somente para opções de selecionar uma alternativa (fazer join)',
  `nomeColuna` varchar(255) NOT NULL COMMENT 'Deve possuir uma coluna com esse nome na tabela recebimentomp',
  `tipo` varchar(10) NOT NULL,
  `obs` text DEFAULT NULL COMMENT 'Obs pra desenvolvimento'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_recebimentomp`
--

INSERT INTO `par_recebimentomp` (`parRecebimentompID`, `ordem`, `nomeCampo`, `tabela`, `nomeColuna`, `tipo`, `obs`) VALUES
(1, 1, 'Profissional', 'pessoa', 'pessoaID', 'int', NULL),
(2, 2, 'Tipo de Operação', 'tipooperacao', 'tipoOperacaoID', 'int', NULL),
(3, 3, 'Data', NULL, 'data', 'date', NULL),
(4, 4, 'NF', NULL, 'nf', 'string', NULL),
(5, 5, 'Fornecedor', 'fornecedor', 'fornecedorID', 'int', NULL),
(6, 6, 'Transportador', 'transportador', 'transportadorID', 'int', NULL),
(7, 7, 'Placa', NULL, 'placa', 'string', NULL),
(8, 8, 'Motorista', NULL, 'motorista', 'string', NULL),
(9, 9, 'Tipo de Veículo', 'tipoveiculo', 'tipoVeiculoID', 'int', NULL);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_recebimentomp_bloco`
--

CREATE TABLE `par_recebimentomp_bloco` (
  `parRecebimentompBlocoID` int(11) NOT NULL,
  `ordem` int(11) NOT NULL COMMENT 'Ordem de exibição',
  `nome` varchar(255) NOT NULL,
  `obs` int(11) NOT NULL DEFAULT 1 COMMENT '1->Possui obs no bloco, 0->Não possui obs',
  `unidadeID` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_recebimentomp_bloco`
--

INSERT INTO `par_recebimentomp_bloco` (`parRecebimentompBlocoID`, `ordem`, `nome`, `obs`, `unidadeID`, `status`) VALUES
(1, 1, 'Bloco 1', 0, 1, 0);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_recebimentomp_bloco_item`
--

CREATE TABLE `par_recebimentomp_bloco_item` (
  `parRecebimentompBlocoItemID` int(11) NOT NULL,
  `parRecebimentompBlocoID` int(11) NOT NULL,
  `ordem` int(11) NOT NULL,
  `itemID` int(11) NOT NULL,
  `alternativaID` int(11) NOT NULL COMMENT 'Forma de resposta no formulário',
  `obs` int(11) NOT NULL DEFAULT 1 COMMENT '1->Possui obs, 0->Não possui obs',
  `obrigatorio` int(11) NOT NULL DEFAULT 0 COMMENT '1->Obrigatório, 0->Não obrigatório',
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_recebimentomp_bloco_item`
--

INSERT INTO `par_recebimentomp_bloco_item` (`parRecebimentompBlocoItemID`, `parRecebimentompBlocoID`, `ordem`, `itemID`, `alternativaID`, `obs`, `obrigatorio`, `status`) VALUES
(2, 1, 2, 15, 6, 1, 1, 1),
(5, 1, 3, 18, 4, 0, 0, 1),
(6, 1, 444, 15, 4, 0, 1, 1),
(9, 2, 1, 17, 3, 1, 1, 1),
(11, 3, 1, 19, 3, 1, 1, 1),
(12, 3, 2, 20, 3, 1, 1, 1),
(13, 4, 1, 21, 3, 1, 1, 1),
(14, 4, 2, 20, 3, 1, 0, 1),
(15, 4, 3, 18, 5, 1, 0, 1),
(17, 1, 6, 14, 5, 1, 1, 1),
(19, 5, 1, 20, 4, 1, 1, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_recebimentomp_produto`
--

CREATE TABLE `par_recebimentomp_produto` (
  `parRecebimentompProdutoID` int(11) NOT NULL,
  `ordem` int(11) NOT NULL,
  `nomeCampo` varchar(255) NOT NULL,
  `nomeColuna` varchar(255) NOT NULL,
  `tabela` varchar(255) DEFAULT NULL COMMENT 'Se houver join com outra tabela (select)',
  `tipo` varchar(10) NOT NULL,
  `obs` text DEFAULT NULL COMMENT 'Obs pra desenvolvimento'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_recebimentomp_produto`
--

INSERT INTO `par_recebimentomp_produto` (`parRecebimentompProdutoID`, `ordem`, `nomeCampo`, `nomeColuna`, `tabela`, `tipo`, `obs`) VALUES
(1, 1, 'Produto', 'produtoID', 'produto', 'int', NULL),
(2, 2, 'Apresentação', 'apresentacaoID', 'apresentacao', 'int', NULL),
(3, 4, 'Quantidade', 'quantidade', NULL, 'string', NULL),
(4, 5, 'Possui Laudo?', 'possuiLaudo', NULL, 'checkbox', ''),
(5, 3, 'Atividade', 'atividadeID', 'atividade', 'int', NULL);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_recebimentomp_produto_unidade`
--

CREATE TABLE `par_recebimentomp_produto_unidade` (
  `parRecebimentompProdutoUnidadeID` int(11) NOT NULL,
  `parRecebimentompProdutoID` int(11) NOT NULL,
  `unidadeID` int(11) NOT NULL,
  `obrigatorio` int(11) NOT NULL DEFAULT 0 COMMENT '1->Obrigatório, 0->Não obrigatório'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_recebimentomp_produto_unidade`
--

INSERT INTO `par_recebimentomp_produto_unidade` (`parRecebimentompProdutoUnidadeID`, `parRecebimentompProdutoID`, `unidadeID`, `obrigatorio`) VALUES
(156, 0, 1, 1),
(157, 0, 1, 1),
(158, 0, 1, 1),
(159, 0, 1, 1),
(160, 1, 1, 1),
(162, 5, 1, 1),
(163, 2, 1, 1),
(164, 3, 1, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `par_recebimentomp_unidade`
--

CREATE TABLE `par_recebimentomp_unidade` (
  `parRecebimentompUnidadeID` int(11) NOT NULL,
  `parRecebimentompID` int(11) NOT NULL,
  `unidadeID` int(11) NOT NULL,
  `obrigatorio` int(11) NOT NULL DEFAULT 0 COMMENT '1->Obrigatório, 0->Não obrigatório'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `par_recebimentomp_unidade`
--

INSERT INTO `par_recebimentomp_unidade` (`parRecebimentompUnidadeID`, `parRecebimentompID`, `unidadeID`, `obrigatorio`) VALUES
(7, 1, 1, 1),
(14, 6, 1, 1),
(19, 5, 1, 1),
(20, 7, 1, 0),
(22, 2, 1, 1),
(23, 4, 1, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `permissao`
--

CREATE TABLE `permissao` (
  `permissaoID` int(11) NOT NULL,
  `rota` varchar(255) NOT NULL,
  `papelID` int(11) NOT NULL COMMENT 'Cliente, Fornecedor...',
  `usuarioID` int(11) NOT NULL,
  `unidadeID` int(11) NOT NULL,
  `ler` int(11) NOT NULL DEFAULT 0 COMMENT '1 => True\r\n0 => False',
  `inserir` int(11) NOT NULL DEFAULT 0 COMMENT '1 => True\r\n0 => False',
  `editar` int(11) NOT NULL DEFAULT 0 COMMENT '1 => True\r\n0 => False',
  `excluir` int(11) NOT NULL DEFAULT 0 COMMENT '1 => True\r\n0 => False'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Extraindo dados da tabela `permissao`
--

INSERT INTO `permissao` (`permissaoID`, `rota`, `papelID`, `usuarioID`, `unidadeID`, `ler`, `inserir`, `editar`, `excluir`) VALUES
(1, '/home', 1, 1, 1, 1, 0, 1, 1),
(2, '/formularios/fornecedor', 1, 1, 1, 1, 1, 1, 1),
(3, '/formularios/recebimento-mp', 1, 1, 1, 1, 1, 1, 1),
(4, '/cadastros/item', 1, 1, 1, 1, 1, 1, 1),
(5, '/cadastros/tipo-veiculo', 1, 1, 1, 0, 0, 0, 1),
(6, '/cadastros/apresentacao', 1, 1, 1, 1, 0, 0, 0),
(7, '/cadastros/sistema-qualidade', 1, 1, 1, 0, 0, 0, 1),
(8, '/cadastros/transportador', 1, 1, 1, 1, 0, 0, 0),
(9, '/configuracoes/usuario', 1, 1, 1, 1, 1, 1, 1),
(10, '/home', 1, 1, 3, 1, 0, 0, 0),
(11, '/formularios/fornecedor', 1, 1, 3, 1, 0, 0, 0),
(12, '/formularios/recebimento-mp', 1, 1, 3, 1, 0, 1, 0),
(13, '/configuracoes/usuario', 1, 1, 3, 1, 1, 1, 1),
(14, '/configuracoes/unidade', 1, 1, 3, 1, 1, 1, 0);

-- --------------------------------------------------------

--
-- Estrutura da tabela `pessoa`
--

CREATE TABLE `pessoa` (
  `pessoaID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `cpf` varchar(14) NOT NULL,
  `unidadeID` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo',
  `dataCadastro` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `pessoa`
--

INSERT INTO `pessoa` (`pessoaID`, `nome`, `cpf`, `unidadeID`, `status`, `dataCadastro`) VALUES
(1, 'José Henry Lopes', '211.316.998-31', 1, 1, '2023-04-17'),
(2, 'Bruno Guilherme Antonio dos Santos', '344.408.221-50', 1, 1, '2023-04-17'),
(3, 'Yuri Otávio Anthony da Mota', '087.237.005-48', 1, 1, '2023-04-17'),
(4, 'Severino Francisco Rocha', '172.873.906-39', 2, 1, '2023-04-17');

-- --------------------------------------------------------

--
-- Estrutura da tabela `produto`
--

CREATE TABLE `produto` (
  `produtoID` int(11) NOT NULL,
  `nome` varchar(200) NOT NULL,
  `unidadeMedida` varchar(20) DEFAULT NULL,
  `unidadeID` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo. 0->Inativo',
  `dataCadastro` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `produto`
--

INSERT INTO `produto` (`produtoID`, `nome`, `unidadeMedida`, `unidadeID`, `status`, `dataCadastro`) VALUES
(1, 'Soja', 'Kg', 1, 1, '2022-09-23'),
(2, 'Milho', 'Kg', 1, 1, '2022-09-23'),
(3, 'Potássio', 'Kg', 1, 1, '2022-09-23'),
(4, 'Trigo', 'Kg', 1, 1, '2022-09-23');

-- --------------------------------------------------------

--
-- Estrutura da tabela `profissao`
--

CREATE TABLE `profissao` (
  `profissaoID` int(11) NOT NULL,
  `nome` text NOT NULL,
  `dataCadastro` date DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `profissao`
--

INSERT INTO `profissao` (`profissaoID`, `nome`, `dataCadastro`, `status`) VALUES
(1, 'Programador', '2023-05-02', 1),
(2, 'Eletricista', '2023-05-02', 1),
(3, 'Mecânico', '2023-05-02', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `recebimentomp`
--

CREATE TABLE `recebimentomp` (
  `recebimentompID` int(11) NOT NULL,
  `pessoaID` int(11) DEFAULT NULL COMMENT 'Profissional',
  `tipoOperacaoID` int(11) DEFAULT NULL COMMENT 'Recepção ou Expedição',
  `data` date DEFAULT NULL,
  `dataEdicao` date DEFAULT NULL,
  `dataRevisao` date DEFAULT NULL,
  `nf` varchar(255) DEFAULT NULL,
  `fornecedorID` int(11) DEFAULT NULL,
  `transportadorID` int(11) DEFAULT NULL,
  `placa` varchar(9) DEFAULT NULL,
  `motorista` varchar(255) DEFAULT NULL,
  `tipoVeiculoID` int(11) DEFAULT NULL,
  `obs` text DEFAULT NULL,
  `obsConclusao` text DEFAULT NULL,
  `unidadeID` int(11) NOT NULL,
  `status` int(11) DEFAULT 10 COMMENT '10->Pendente (ainda não concluiu) \r\n30->Reprovado \r\n40->Aprovado Parcial \r\n50->Aprovado	',
  `dataCadastro` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `recebimentomp`
--

INSERT INTO `recebimentomp` (`recebimentompID`, `pessoaID`, `tipoOperacaoID`, `data`, `dataEdicao`, `dataRevisao`, `nf`, `fornecedorID`, `transportadorID`, `placa`, `motorista`, `tipoVeiculoID`, `obs`, `obsConclusao`, `unidadeID`, `status`, `dataCadastro`) VALUES
(1, 1, 1, '2023-06-07', '2023-04-17', '2023-04-17', '54551111', 1, 1, 'MKY-2000', 'Leomar Z', 2, 'Obssss uppp', NULL, 1, 30, '2023-04-17'),
(2, 2, 1, NULL, NULL, NULL, '66', 1, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, NULL),
(3, 3, 2, NULL, NULL, NULL, '69', 1, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, NULL),
(4, 1, 2, NULL, NULL, NULL, '33', 1, NULL, NULL, NULL, NULL, '', NULL, 1, 60, NULL),
(7, 3, 2, NULL, NULL, NULL, '11', 1, NULL, NULL, NULL, NULL, NULL, NULL, 1, 10, NULL),
(8, 2, 1, NULL, NULL, NULL, '238', 1, NULL, NULL, NULL, NULL, 'aassasa uppp', NULL, 1, 50, NULL),
(9, 1, 2, NULL, NULL, NULL, '777', 1, NULL, NULL, NULL, NULL, 'fechou!', NULL, 1, 70, NULL),
(10, 2, 1, NULL, NULL, NULL, '55', 1, NULL, NULL, NULL, NULL, 'dsdsdsd uppp', NULL, 1, 60, NULL),
(11, 1, 2, NULL, NULL, NULL, '55', 1, NULL, NULL, NULL, NULL, 'sadsdsdsdsd', NULL, 1, 70, NULL),
(13, 1, 1, '2023-06-12', NULL, NULL, '123', 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(14, 1, 1, '2023-06-02', NULL, NULL, '9999999', 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(15, 1, 1, '2023-06-02', NULL, NULL, '9999999', 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(16, 1, 1, '2023-06-07', NULL, NULL, '5454', 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(17, 1, 0, '2023-06-11', NULL, NULL, '3223', 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(18, 1, 1, '2023-06-02', NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(19, 1, 0, '2023-06-08', NULL, NULL, '123321', 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(20, 3, 0, '2023-06-07', NULL, NULL, '5555', 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(21, 3, 0, '2023-06-06', NULL, NULL, '9996', 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(22, 0, 1, '2023-06-07', NULL, NULL, '6666', 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(23, 3, 0, '2023-06-07', NULL, NULL, NULL, 0, 2, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(24, 0, 0, '2023-06-14', NULL, NULL, '455454', 0, 0, NULL, NULL, NULL, NULL, NULL, 1, 10, '2023-06-15'),
(25, 3, 0, '2023-06-14', NULL, NULL, '455445', 0, 0, NULL, NULL, NULL, 'new obssss', NULL, 1, 10, '2023-06-15'),
(26, 3, 0, '2023-06-14', NULL, NULL, '23423', 1, 1, NULL, NULL, NULL, 'obssssssssss', NULL, 1, 10, '2023-06-15'),
(27, 3, 0, '2023-06-12', NULL, NULL, '5454', 0, 0, NULL, NULL, NULL, 'obssssss', NULL, 1, 10, '2023-06-15');

-- --------------------------------------------------------

--
-- Estrutura da tabela `recebimentomp_produto`
--

CREATE TABLE `recebimentomp_produto` (
  `recebimentompProdutoID` int(11) NOT NULL,
  `recebimentompID` int(11) NOT NULL,
  `produtoID` int(11) DEFAULT NULL,
  `apresentacaoID` int(11) DEFAULT NULL,
  `atividadeID` int(11) DEFAULT NULL,
  `quantidade` int(11) DEFAULT NULL,
  `possuiLaudo` int(11) DEFAULT NULL COMMENT 'checkBox: 1->Marcado, 0->Não marcado'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `recebimentomp_produto`
--

INSERT INTO `recebimentomp_produto` (`recebimentompProdutoID`, `recebimentompID`, `produtoID`, `apresentacaoID`, `atividadeID`, `quantidade`, `possuiLaudo`) VALUES
(1, 1, 1, 2, 1, 2288, 1),
(4, 2, 1, 1, NULL, 3, 0),
(8, 4, 3, 3, NULL, 55, NULL),
(9, 4, 1, 3, NULL, 55, NULL),
(10, 5, 3, 2, NULL, 5, NULL),
(11, 6, 3, 2, NULL, 5, NULL),
(12, 7, 1, 3, NULL, 22, NULL),
(13, 8, 2, 2, NULL, 23, NULL),
(14, 8, 3, 3, NULL, 88, NULL),
(15, 9, 4, 1, NULL, 97, NULL),
(16, 10, 1, 3, NULL, 44, NULL),
(17, 10, 3, 3, NULL, 99, NULL),
(18, 11, 3, 3, NULL, 66, NULL),
(25, 1, 3, 3, 4, 650, NULL),
(26, 15, 0, 0, 0, NULL, NULL),
(27, 16, 0, 0, 0, NULL, NULL),
(28, 17, 0, 0, 0, NULL, NULL),
(29, 21, 0, 0, 0, NULL, NULL),
(30, 22, 1, 2, 4, 55, NULL),
(31, 27, 3, NULL, 5, NULL, NULL),
(32, 27, 3, NULL, 0, NULL, NULL),
(33, 26, 3, 3, 2, NULL, NULL);

-- --------------------------------------------------------

--
-- Estrutura da tabela `recebimentomp_resposta`
--

CREATE TABLE `recebimentomp_resposta` (
  `recebimentompRespostaID` int(11) NOT NULL,
  `recebimentompID` int(11) NOT NULL,
  `parRecebimentompBlocoID` int(11) NOT NULL COMMENT 'ID do bloco',
  `itemID` int(11) NOT NULL,
  `resposta` varchar(255) NOT NULL COMMENT 'Descrição da resposta',
  `respostaID` int(11) DEFAULT NULL COMMENT 'Se for resposta selecionável, guarda ID do alternativa_item',
  `obs` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `recebimentomp_resposta`
--

INSERT INTO `recebimentomp_resposta` (`recebimentompRespostaID`, `recebimentompID`, `parRecebimentompBlocoID`, `itemID`, `resposta`, `respostaID`, `obs`) VALUES
(1, 1, 1, 13, '2023-06-02', NULL, ''),
(2, 1, 1, 14, '2023-06-10', NULL, ''),
(3, 23, 1, 13, '2023-06-13', NULL, ''),
(4, 23, 1, 14, '2023-06-09', NULL, 'Opa data'),
(5, 23, 1, 15, 'Não Conforme', 4, ''),
(6, 24, 1, 13, '2023-06-14', NULL, ''),
(7, 24, 1, 14, '2023-06-05', NULL, ''),
(8, 24, 1, 15, 'Não Conforme', 4, ''),
(9, 25, 1, 13, '2023-06-07', NULL, ''),
(10, 25, 1, 14, '2023-06-13', NULL, ''),
(11, 25, 1, 15, 'Não Conforme', 4, ''),
(12, 26, 1, 13, '2023-06-14', NULL, ''),
(13, 26, 1, 14, '2023-06-05', NULL, ''),
(14, 26, 1, 15, 'Não Conforme', 4, ''),
(15, 26, 1, 18, 'Pqsim', NULL, ''),
(16, 27, 1, 13, '2023-06-07', NULL, ''),
(17, 27, 1, 14, '2023-06-10', NULL, ''),
(18, 27, 1, 15, 'Não Conforme', 4, '');

-- --------------------------------------------------------

--
-- Estrutura da tabela `registroestabelecimento`
--

CREATE TABLE `registroestabelecimento` (
  `registroEstabelecimentoID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo',
  `dataCadastro` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `registroestabelecimento`
--

INSERT INTO `registroestabelecimento` (`registroEstabelecimentoID`, `nome`, `status`, `dataCadastro`) VALUES
(1, 'ISENTO', 1, '2023-05-17'),
(2, 'MAPA', 1, '2023-05-17'),
(3, 'ANVISA', 1, '2023-05-17');

-- --------------------------------------------------------

--
-- Estrutura da tabela `sistemaqualidade`
--

CREATE TABLE `sistemaqualidade` (
  `sistemaQualidadeID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `sistemaqualidade`
--

INSERT INTO `sistemaqualidade` (`sistemaQualidadeID`, `nome`, `status`) VALUES
(1, '5S', 1),
(2, 'BPF', 1),
(3, 'FAMI\'QS', 1),
(4, 'ISO 9001', 1),
(5, 'FSC22000', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `submenu`
--

CREATE TABLE `submenu` (
  `submenuID` int(11) NOT NULL,
  `menuID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `icone` varchar(255) NOT NULL,
  `rota` varchar(255) NOT NULL,
  `ordem` int(11) NOT NULL,
  `novo` int(11) NOT NULL DEFAULT 0 COMMENT '1 => "Novo''\r\n0 => ""',
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1 => Ativo\r\n0 => Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Extraindo dados da tabela `submenu`
--

INSERT INTO `submenu` (`submenuID`, `menuID`, `nome`, `icone`, `rota`, `ordem`, `novo`, `status`) VALUES
(1, 4, 'Atividade', 'fluent:food-grains-24-regular', '/cadastros/atividade', 1, 0, 1),
(2, 4, 'Item', 'material-symbols:format-list-bulleted-rounded', '/cadastros/item', 2, 0, 1),
(3, 4, 'Sistema de Qualidade', 'material-symbols:playlist-add-check', '/cadastros/sistema-qualidade', 3, 0, 1),
(4, 5, 'Unidade', 'mdi:company', '/configuracoes/unidade', 3, 0, 1),
(5, 5, 'Usuário', 'mdi:user', '/configuracoes/usuario', 2, 0, 1),
(6, 5, 'Formulários', 'clarity:form-line', '/configuracoes/formularios', 1, 0, 1),
(7, 4, 'Tipo de Veículo', 'mdi:truck-outline', '/cadastros/tipo-veiculo', 4, 0, 1),
(8, 4, 'Transportador', 'ph:truck-bold', '/cadastros/transportador', 6, 0, 1),
(9, 4, 'Produtos', 'ph:plant', '/cadastros/produtos', 7, 0, 1),
(10, 4, 'Apresentação', 'ri:pencil-ruler-2-line', '/cadastros/apresentacao', 8, 0, 1),
(11, 4, 'Grupo de Anexos', 'formkit:group', '/cadastros/grupo-anexos', 3, 1, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `tipooperacao`
--

CREATE TABLE `tipooperacao` (
  `tipooperacaoID` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo',
  `dataCadastro` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `tipooperacao`
--

INSERT INTO `tipooperacao` (`tipooperacaoID`, `nome`, `status`, `dataCadastro`) VALUES
(1, 'RECEPÇÃO', 1, '2023-04-17'),
(2, 'EXPEDIÇÃO', 1, '2023-04-17');

-- --------------------------------------------------------

--
-- Estrutura da tabela `tipoveiculo`
--

CREATE TABLE `tipoveiculo` (
  `tipoVeiculoID` int(11) NOT NULL,
  `nome` varchar(200) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo. 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `tipoveiculo`
--

INSERT INTO `tipoveiculo` (`tipoVeiculoID`, `nome`, `status`) VALUES
(1, 'Carroceria', 1),
(2, 'Graneleiro', 1),
(3, 'Sider up', 1),
(4, 'Tanque', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `transportador`
--

CREATE TABLE `transportador` (
  `transportadorID` int(11) NOT NULL,
  `nome` varchar(200) NOT NULL,
  `unidadeID` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo. 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `transportador`
--

INSERT INTO `transportador` (`transportadorID`, `nome`, `unidadeID`, `status`) VALUES
(1, 'Lunardi', 1, 1),
(2, 'Tozzo', 1, 1),
(4, 'Express', 2, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `unidade`
--

CREATE TABLE `unidade` (
  `unidadeID` int(11) NOT NULL,
  `nomeFantasia` varchar(255) NOT NULL,
  `razaoSocial` varchar(255) DEFAULT NULL,
  `cnpj` varchar(20) DEFAULT NULL,
  `telefone1` varchar(20) DEFAULT NULL,
  `telefone2` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `responsavel` varchar(255) DEFAULT NULL,
  `cep` varchar(10) DEFAULT NULL,
  `logradouro` varchar(255) DEFAULT NULL,
  `numero` varchar(20) DEFAULT NULL COMMENT 'Nº do logradouro',
  `complemento` varchar(255) DEFAULT NULL,
  `bairro` varchar(255) DEFAULT NULL,
  `cidade` varchar(255) DEFAULT NULL,
  `uf` varchar(2) DEFAULT NULL,
  `dataCadastro` date DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1->Ativo, 0->Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `unidade`
--

INSERT INTO `unidade` (`unidadeID`, `nomeFantasia`, `razaoSocial`, `cnpj`, `telefone1`, `telefone2`, `email`, `responsavel`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `dataCadastro`, `status`) VALUES
(1, 'Nutri Plus', 'Plus Plus', '11.149.451/0001-01', '(49) 335-58977', '(49) 99958-45877', 'roberto.delavy@gmail.com', 'Paulo Luiz', '89812-600', 'Rua Euclides Prade', '465E', 'Bloco A, apto 406', 'Santa Maria', 'Chapecó', 'SC', '2023-04-26', 1),
(2, 'Precisa Tecnologia', NULL, '22.761.856/0001-12', '49984356670', NULL, 'jonatankalmeidakk5@gmail.com', 'Rodrigo Piozevan', '89812-600', 'Rua Euclides Prade', '533', 'sala 206', 'Santa Maria', 'Chapecó', 'SC', '2023-03-30', 1),
(3, 'BRF Alimentos', 'BRF Alimentos', '41.153.569/0001-74', '(49) 9994-91845', '(49) 335-24671', 'roberto@gmail.com', 'Roberto Delavi', '89812-600', 'Rua Euclides Prade', '465', 'Bloco A, apto. 406', 'Santa Maria', 'Chapecó', 'SC', '2023-04-27', 1),
(4, 'Nutri Vitalaaaaa', '565666', '13.363.709/0001-01', '(49) 98435-6670', NULL, 'jonatankalmeidakk5@gmail.com', NULL, '18087-149', 'Avenida Fernando Stecca', '', 'Fundos', 'Iporanga', 'Sorocaba', 'SP', '2023-05-10', 1),
(24, 'Nutri Vitalaaaaa', '565666', '91.507.596/0001-76', '(49) 98435-6670', NULL, 'jonatankalmeidakk5@gmail.com', NULL, '18087-149', 'Avenida Fernando Stecca', '11', 'Fundos', 'Iporanga', 'Sorocaba', 'SP', '2023-05-10', 1),
(25, 'tetweeee', 'Ltda Nwe', '01.116.088/0001-74', '(49) 98435-6670', NULL, 'jonatankalmeidakk5@gmail.com', NULL, '18087-149', 'Avenida Fernando Stecca', '888', 'Fundos', 'Iporanga', 'Sorocaba', 'SP', '2023-05-10', 1),
(26, 'Ltda New', '565666', '33.485.347/0001-20', '', NULL, 'jonatankalmeidakk5@gmail.com', NULL, '', '', '11', '', '', '', '', '2023-05-10', 1),
(27, 'Ltda New', '565666', '45.014.434/0001-89', '', NULL, 'jonatankalmeidakk5@gmail.com', NULL, '', '', '11', '', '', '', '', '2023-05-11', 1),
(28, 'Tozzo Alimentos', 'Tozzo Alimentos', '94.195.676/0001-21', '', NULL, 'roberto.delavy@gmail.com', NULL, '89812-600', 'Rua Euclides Prade', '465E', '', 'Santa Maria', 'Chapecó', 'SC', '2023-05-17', 1),
(29, 'Brasão Supermercado', 'Almeida Prado Supermercado', '28.312.835/0001-04', '(49) 99494-5454', NULL, 'ropioo@gmail.com', NULL, '97250-000', 'Rua Getulio Vargas', '465', 'Apto 500', 'Centro', 'Nova Palma', 'RS', '2023-05-18', 1),
(30, 'Base Sul', 'Base Sul', '99.336.627/0001-85', '', NULL, 'roberto.delavy@gmail.com', NULL, '89812-600', 'Rua Euclides Prade', '', '', 'Santa Maria', 'Chapecó', 'SC', '2023-06-02', 1),
(31, 'Jhonatan KK 28', 'Jhonatan KK 28', '44.417.366/0001-36', '', NULL, 'john@gmail.com', NULL, '', NULL, '', '', NULL, NULL, NULL, '2023-07-04', 1),
(32, 'Roberto Delavi de Araújo', 'Ifood LTDA', '81.817.948/0001-36', '49999491845', '49999491845', 'roberto.delavy@gmail.com', NULL, '89812600', NULL, '', '', NULL, 'Chapecó', NULL, '2023-07-12', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `usuario`
--

CREATE TABLE `usuario` (
  `usuarioID` int(11) NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` varchar(14) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cnpj` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dataNascimento` date DEFAULT NULL,
  `rg` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin` int(11) NOT NULL DEFAULT 0 COMMENT '1->Acesso todo sistema, 0->Usuário normal\r\n',
  `role` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1 => Ativo\r\n0 => Inativo',
  `imagem` text COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `usuario`
--

INSERT INTO `usuario` (`usuarioID`, `nome`, `cpf`, `cnpj`, `dataNascimento`, `rg`, `email`, `senha`, `admin`, `role`, `status`, `imagem`) VALUES
(1, 'Roberto Delavi', '089.092.569-07', NULL, NULL, '510177319933312', 'admin@materialize.com', '81dc9bdb52d04dc20036dbd8313ed055', 1, 'admin', 1, '1688567328218-perfil.jpg'),
(21, 'sasasa', '021.164.710-10', NULL, '1899-11-30', 'sasaas', 'saassaas', '81dc9bdb52d04dc20036dbd8313ed055', 0, '', 1, NULL),
(22, 'teste', '8998', NULL, '0000-00-00', '9898', '9898', '81dc9bdb52d04dc20036dbd8313ed055', 0, '', 1, NULL),
(23, 'sasa', '3333', NULL, '0000-00-00', '4343', '32', '81dc9bdb52d04dc20036dbd8313ed055', 0, '', 1, NULL),
(24, 'Novooo certo', '888975454', NULL, '0000-00-00', '5454', 'asasjsaj', '81dc9bdb52d04dc20036dbd8313ed055', 0, '', 1, NULL),
(25, 'Novo com senha', '047.169.888-12', NULL, '0000-00-00', '545454', 'rr@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, '', 1, NULL),
(26, 'bruna', '783.131.870-42', NULL, '1996-05-20', '515', 'bruna@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, '', 1, NULL),
(27, 'Nutri Vitalaaaaa', NULL, '13.363.709/0001-01', NULL, NULL, 'roberto.delavy@gmail.com', '2e247e2eb505c42b362e80ed4d05b078', 0, 'admin', 1, NULL),
(28, 'Nutri Vitalaaaaa', NULL, '91.507.596/0001-76', NULL, NULL, 'jonatankalmeidakk5@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL),
(29, 'tetweeee', NULL, '01.116.088/0001-74', NULL, NULL, 'jonatankalmeidakk5@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL),
(30, 'Ltda New', NULL, '33.485.347/0001-20', NULL, NULL, 'jonatankalmeidakk5@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL),
(31, 'Ltda New', NULL, '45.014.434/0001-89', NULL, NULL, 'jonatankalmeidakk5@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL),
(32, 'Tozzo Alimentos', NULL, '94.195.676/0001-21', NULL, NULL, 'roberto.delavy@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL),
(33, 'Brasão Supermercado', NULL, '28.312.835/0001-04', NULL, NULL, 'ropioo@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL),
(34, 'Juliane', '422.916.500-50', NULL, '1980-05-10', '', '089.092.569-07', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL),
(35, 'Base Sul', NULL, '99.336.627/0001-85', NULL, NULL, 'roberto.delavy@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL),
(36, 'Bruna Silva', '328.679.583-69', NULL, '1980-05-10', '', 'teste@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL),
(37, 'Jhonatan KK 28', NULL, '44.417.366/0001-36', NULL, NULL, 'john@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL),
(38, 'Ifood', NULL, '81.817.948/0001-36', NULL, NULL, 'ifood@gmail.com', '81dc9bdb52d04dc20036dbd8313ed055', 0, 'admin', 1, NULL);

-- --------------------------------------------------------

--
-- Estrutura da tabela `usuario_unidade`
--

CREATE TABLE `usuario_unidade` (
  `usuarioUnidadeID` int(11) NOT NULL,
  `usuarioID` int(11) NOT NULL,
  `unidadeID` int(11) NOT NULL,
  `papelID` int(11) NOT NULL COMMENT 'Cliente, Fornecedor...',
  `profissaoID` int(11) DEFAULT NULL,
  `registroConselhoClasse` varchar(50) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1 => Ativo\r\n0 => Inativo'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Extraindo dados da tabela `usuario_unidade`
--

INSERT INTO `usuario_unidade` (`usuarioUnidadeID`, `usuarioID`, `unidadeID`, `papelID`, `profissaoID`, `registroConselhoClasse`, `status`) VALUES
(1, 1, 1, 1, 1, NULL, 1),
(6, 1, 3, 1, 3, NULL, 1),
(13, 21, 3, 1, NULL, 'assaas', 1),
(14, 22, 3, 1, NULL, '9898', 1),
(15, 23, 3, 1, NULL, '4334', 1),
(16, 24, 3, 1, NULL, '545', 1),
(17, 25, 3, 1, NULL, '54545', 1),
(18, 26, 1, 1, NULL, '5151', 1),
(19, 27, 23, 2, NULL, NULL, 1),
(20, 28, 24, 2, NULL, NULL, 1),
(21, 29, 25, 2, NULL, NULL, 1),
(22, 30, 26, 2, NULL, NULL, 1),
(23, 31, 27, 2, NULL, NULL, 1),
(24, 1, 2, 1, 1, NULL, 1),
(25, 32, 28, 2, NULL, NULL, 1),
(26, 33, 29, 2, NULL, NULL, 1),
(27, 34, 1, 1, NULL, '', 1),
(28, 35, 30, 2, NULL, NULL, 1),
(29, 36, 1, 1, NULL, '', 1),
(30, 37, 31, 2, NULL, NULL, 1),
(31, 38, 32, 2, NULL, NULL, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `usuario_unidade_cargo`
--

CREATE TABLE `usuario_unidade_cargo` (
  `usuarioUnidadeCargoID` int(11) NOT NULL,
  `usuarioUnidadeID` int(11) NOT NULL,
  `cargoID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `usuario_unidade_cargo`
--

INSERT INTO `usuario_unidade_cargo` (`usuarioUnidadeCargoID`, `usuarioUnidadeID`, `cargoID`) VALUES
(4, 5, 2),
(8, 1, 3);

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `alternativa`
--
ALTER TABLE `alternativa`
  ADD PRIMARY KEY (`alternativaID`);

--
-- Índices para tabela `alternativa_item`
--
ALTER TABLE `alternativa_item`
  ADD PRIMARY KEY (`alternativaItemID`);

--
-- Índices para tabela `anexo`
--
ALTER TABLE `anexo`
  ADD PRIMARY KEY (`anexoID`);

--
-- Índices para tabela `apresentacao`
--
ALTER TABLE `apresentacao`
  ADD PRIMARY KEY (`apresentacaoID`);

--
-- Índices para tabela `atividade`
--
ALTER TABLE `atividade`
  ADD PRIMARY KEY (`atividadeID`);

--
-- Índices para tabela `cargo`
--
ALTER TABLE `cargo`
  ADD PRIMARY KEY (`cargoID`);

--
-- Índices para tabela `categoria`
--
ALTER TABLE `categoria`
  ADD PRIMARY KEY (`categoriaID`);

--
-- Índices para tabela `divisor`
--
ALTER TABLE `divisor`
  ADD PRIMARY KEY (`divisorID`);

--
-- Índices para tabela `fabrica_fornecedor`
--
ALTER TABLE `fabrica_fornecedor`
  ADD PRIMARY KEY (`fabricaFornecedorID`);

--
-- Índices para tabela `fabrica_fornecedor_grupoanexo`
--
ALTER TABLE `fabrica_fornecedor_grupoanexo`
  ADD PRIMARY KEY (`fabricaFornecedorGrupoAnexoID`);

--
-- Índices para tabela `fornecedor`
--
ALTER TABLE `fornecedor`
  ADD PRIMARY KEY (`fornecedorID`);

--
-- Índices para tabela `fornecedor_atividade`
--
ALTER TABLE `fornecedor_atividade`
  ADD PRIMARY KEY (`fornecedorAtividadeID`);

--
-- Índices para tabela `fornecedor_categoria`
--
ALTER TABLE `fornecedor_categoria`
  ADD PRIMARY KEY (`fornecedorCategoriaID`);

--
-- Índices para tabela `fornecedor_resposta`
--
ALTER TABLE `fornecedor_resposta`
  ADD PRIMARY KEY (`fornecedorRespostaID`);

--
-- Índices para tabela `fornecedor_sistemaqualidade`
--
ALTER TABLE `fornecedor_sistemaqualidade`
  ADD PRIMARY KEY (`fornecedorSistemaQualidadeID`);

--
-- Índices para tabela `grupoanexo`
--
ALTER TABLE `grupoanexo`
  ADD PRIMARY KEY (`grupoanexoID`);

--
-- Índices para tabela `grupoanexo_item`
--
ALTER TABLE `grupoanexo_item`
  ADD PRIMARY KEY (`grupoanexoitemID`);

--
-- Índices para tabela `grupoanexo_parformulario`
--
ALTER TABLE `grupoanexo_parformulario`
  ADD PRIMARY KEY (`grupoanexoParformularioID`);

--
-- Índices para tabela `item`
--
ALTER TABLE `item`
  ADD PRIMARY KEY (`itemID`);

--
-- Índices para tabela `menu`
--
ALTER TABLE `menu`
  ADD PRIMARY KEY (`menuID`);

--
-- Índices para tabela `movimentacaoformulario`
--
ALTER TABLE `movimentacaoformulario`
  ADD PRIMARY KEY (`movimentacaoFormularioID`);

--
-- Índices para tabela `papel`
--
ALTER TABLE `papel`
  ADD PRIMARY KEY (`papelID`);

--
-- Índices para tabela `par_formulario`
--
ALTER TABLE `par_formulario`
  ADD PRIMARY KEY (`parFormularioID`);

--
-- Índices para tabela `par_fornecedor`
--
ALTER TABLE `par_fornecedor`
  ADD PRIMARY KEY (`parFornecedorID`);

--
-- Índices para tabela `par_fornecedor_bloco`
--
ALTER TABLE `par_fornecedor_bloco`
  ADD PRIMARY KEY (`parFornecedorBlocoID`);

--
-- Índices para tabela `par_fornecedor_bloco_atividade`
--
ALTER TABLE `par_fornecedor_bloco_atividade`
  ADD PRIMARY KEY (`parFornecedorBlocoAtividadeID`);

--
-- Índices para tabela `par_fornecedor_bloco_categoria`
--
ALTER TABLE `par_fornecedor_bloco_categoria`
  ADD PRIMARY KEY (`parFornecedorBlocoCategoriaID`);

--
-- Índices para tabela `par_fornecedor_bloco_item`
--
ALTER TABLE `par_fornecedor_bloco_item`
  ADD PRIMARY KEY (`parFornecedorBlocoItemID`);

--
-- Índices para tabela `par_fornecedor_bloco_item_pontuacao`
--
ALTER TABLE `par_fornecedor_bloco_item_pontuacao`
  ADD PRIMARY KEY (`parFornecedorBlocoItemPontuacaoID`);

--
-- Índices para tabela `par_fornecedor_unidade`
--
ALTER TABLE `par_fornecedor_unidade`
  ADD PRIMARY KEY (`parFornecedorUnidadeID`);

--
-- Índices para tabela `par_recebimentomp`
--
ALTER TABLE `par_recebimentomp`
  ADD PRIMARY KEY (`parRecebimentompID`);

--
-- Índices para tabela `par_recebimentomp_bloco`
--
ALTER TABLE `par_recebimentomp_bloco`
  ADD PRIMARY KEY (`parRecebimentompBlocoID`);

--
-- Índices para tabela `par_recebimentomp_bloco_item`
--
ALTER TABLE `par_recebimentomp_bloco_item`
  ADD PRIMARY KEY (`parRecebimentompBlocoItemID`);

--
-- Índices para tabela `par_recebimentomp_produto`
--
ALTER TABLE `par_recebimentomp_produto`
  ADD PRIMARY KEY (`parRecebimentompProdutoID`);

--
-- Índices para tabela `par_recebimentomp_produto_unidade`
--
ALTER TABLE `par_recebimentomp_produto_unidade`
  ADD PRIMARY KEY (`parRecebimentompProdutoUnidadeID`);

--
-- Índices para tabela `par_recebimentomp_unidade`
--
ALTER TABLE `par_recebimentomp_unidade`
  ADD PRIMARY KEY (`parRecebimentompUnidadeID`);

--
-- Índices para tabela `permissao`
--
ALTER TABLE `permissao`
  ADD PRIMARY KEY (`permissaoID`);

--
-- Índices para tabela `pessoa`
--
ALTER TABLE `pessoa`
  ADD PRIMARY KEY (`pessoaID`);

--
-- Índices para tabela `produto`
--
ALTER TABLE `produto`
  ADD PRIMARY KEY (`produtoID`);

--
-- Índices para tabela `profissao`
--
ALTER TABLE `profissao`
  ADD PRIMARY KEY (`profissaoID`);

--
-- Índices para tabela `recebimentomp`
--
ALTER TABLE `recebimentomp`
  ADD PRIMARY KEY (`recebimentompID`);

--
-- Índices para tabela `recebimentomp_produto`
--
ALTER TABLE `recebimentomp_produto`
  ADD PRIMARY KEY (`recebimentompProdutoID`);

--
-- Índices para tabela `recebimentomp_resposta`
--
ALTER TABLE `recebimentomp_resposta`
  ADD PRIMARY KEY (`recebimentompRespostaID`);

--
-- Índices para tabela `registroestabelecimento`
--
ALTER TABLE `registroestabelecimento`
  ADD PRIMARY KEY (`registroEstabelecimentoID`);

--
-- Índices para tabela `sistemaqualidade`
--
ALTER TABLE `sistemaqualidade`
  ADD PRIMARY KEY (`sistemaQualidadeID`);

--
-- Índices para tabela `submenu`
--
ALTER TABLE `submenu`
  ADD PRIMARY KEY (`submenuID`);

--
-- Índices para tabela `tipooperacao`
--
ALTER TABLE `tipooperacao`
  ADD PRIMARY KEY (`tipooperacaoID`);

--
-- Índices para tabela `tipoveiculo`
--
ALTER TABLE `tipoveiculo`
  ADD PRIMARY KEY (`tipoVeiculoID`);

--
-- Índices para tabela `transportador`
--
ALTER TABLE `transportador`
  ADD PRIMARY KEY (`transportadorID`);

--
-- Índices para tabela `unidade`
--
ALTER TABLE `unidade`
  ADD PRIMARY KEY (`unidadeID`);

--
-- Índices para tabela `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`usuarioID`);

--
-- Índices para tabela `usuario_unidade`
--
ALTER TABLE `usuario_unidade`
  ADD PRIMARY KEY (`usuarioUnidadeID`);

--
-- Índices para tabela `usuario_unidade_cargo`
--
ALTER TABLE `usuario_unidade_cargo`
  ADD PRIMARY KEY (`usuarioUnidadeCargoID`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `alternativa`
--
ALTER TABLE `alternativa`
  MODIFY `alternativaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `alternativa_item`
--
ALTER TABLE `alternativa_item`
  MODIFY `alternativaItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de tabela `anexo`
--
ALTER TABLE `anexo`
  MODIFY `anexoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT de tabela `apresentacao`
--
ALTER TABLE `apresentacao`
  MODIFY `apresentacaoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `atividade`
--
ALTER TABLE `atividade`
  MODIFY `atividadeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31934;

--
-- AUTO_INCREMENT de tabela `cargo`
--
ALTER TABLE `cargo`
  MODIFY `cargoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de tabela `categoria`
--
ALTER TABLE `categoria`
  MODIFY `categoriaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `divisor`
--
ALTER TABLE `divisor`
  MODIFY `divisorID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `fabrica_fornecedor`
--
ALTER TABLE `fabrica_fornecedor`
  MODIFY `fabricaFornecedorID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=74;

--
-- AUTO_INCREMENT de tabela `fabrica_fornecedor_grupoanexo`
--
ALTER TABLE `fabrica_fornecedor_grupoanexo`
  MODIFY `fabricaFornecedorGrupoAnexoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `fornecedor`
--
ALTER TABLE `fornecedor`
  MODIFY `fornecedorID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=70;

--
-- AUTO_INCREMENT de tabela `fornecedor_atividade`
--
ALTER TABLE `fornecedor_atividade`
  MODIFY `fornecedorAtividadeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de tabela `fornecedor_categoria`
--
ALTER TABLE `fornecedor_categoria`
  MODIFY `fornecedorCategoriaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT de tabela `fornecedor_resposta`
--
ALTER TABLE `fornecedor_resposta`
  MODIFY `fornecedorRespostaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `fornecedor_sistemaqualidade`
--
ALTER TABLE `fornecedor_sistemaqualidade`
  MODIFY `fornecedorSistemaQualidadeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de tabela `grupoanexo`
--
ALTER TABLE `grupoanexo`
  MODIFY `grupoanexoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de tabela `grupoanexo_item`
--
ALTER TABLE `grupoanexo_item`
  MODIFY `grupoanexoitemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de tabela `grupoanexo_parformulario`
--
ALTER TABLE `grupoanexo_parformulario`
  MODIFY `grupoanexoParformularioID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=145;

--
-- AUTO_INCREMENT de tabela `item`
--
ALTER TABLE `item`
  MODIFY `itemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT de tabela `menu`
--
ALTER TABLE `menu`
  MODIFY `menuID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `movimentacaoformulario`
--
ALTER TABLE `movimentacaoformulario`
  MODIFY `movimentacaoFormularioID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=157;

--
-- AUTO_INCREMENT de tabela `papel`
--
ALTER TABLE `papel`
  MODIFY `papelID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `par_formulario`
--
ALTER TABLE `par_formulario`
  MODIFY `parFormularioID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `par_fornecedor`
--
ALTER TABLE `par_fornecedor`
  MODIFY `parFornecedorID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de tabela `par_fornecedor_bloco`
--
ALTER TABLE `par_fornecedor_bloco`
  MODIFY `parFornecedorBlocoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=103;

--
-- AUTO_INCREMENT de tabela `par_fornecedor_bloco_atividade`
--
ALTER TABLE `par_fornecedor_bloco_atividade`
  MODIFY `parFornecedorBlocoAtividadeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=464;

--
-- AUTO_INCREMENT de tabela `par_fornecedor_bloco_categoria`
--
ALTER TABLE `par_fornecedor_bloco_categoria`
  MODIFY `parFornecedorBlocoCategoriaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=530;

--
-- AUTO_INCREMENT de tabela `par_fornecedor_bloco_item`
--
ALTER TABLE `par_fornecedor_bloco_item`
  MODIFY `parFornecedorBlocoItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT de tabela `par_fornecedor_bloco_item_pontuacao`
--
ALTER TABLE `par_fornecedor_bloco_item_pontuacao`
  MODIFY `parFornecedorBlocoItemPontuacaoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `par_fornecedor_unidade`
--
ALTER TABLE `par_fornecedor_unidade`
  MODIFY `parFornecedorUnidadeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT de tabela `par_recebimentomp`
--
ALTER TABLE `par_recebimentomp`
  MODIFY `parRecebimentompID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `par_recebimentomp_bloco`
--
ALTER TABLE `par_recebimentomp_bloco`
  MODIFY `parRecebimentompBlocoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `par_recebimentomp_bloco_item`
--
ALTER TABLE `par_recebimentomp_bloco_item`
  MODIFY `parRecebimentompBlocoItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT de tabela `par_recebimentomp_produto`
--
ALTER TABLE `par_recebimentomp_produto`
  MODIFY `parRecebimentompProdutoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `par_recebimentomp_produto_unidade`
--
ALTER TABLE `par_recebimentomp_produto_unidade`
  MODIFY `parRecebimentompProdutoUnidadeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=165;

--
-- AUTO_INCREMENT de tabela `par_recebimentomp_unidade`
--
ALTER TABLE `par_recebimentomp_unidade`
  MODIFY `parRecebimentompUnidadeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT de tabela `permissao`
--
ALTER TABLE `permissao`
  MODIFY `permissaoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de tabela `pessoa`
--
ALTER TABLE `pessoa`
  MODIFY `pessoaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `produto`
--
ALTER TABLE `produto`
  MODIFY `produtoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `profissao`
--
ALTER TABLE `profissao`
  MODIFY `profissaoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `recebimentomp`
--
ALTER TABLE `recebimentomp`
  MODIFY `recebimentompID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT de tabela `recebimentomp_produto`
--
ALTER TABLE `recebimentomp_produto`
  MODIFY `recebimentompProdutoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de tabela `recebimentomp_resposta`
--
ALTER TABLE `recebimentomp_resposta`
  MODIFY `recebimentompRespostaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de tabela `registroestabelecimento`
--
ALTER TABLE `registroestabelecimento`
  MODIFY `registroEstabelecimentoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `sistemaqualidade`
--
ALTER TABLE `sistemaqualidade`
  MODIFY `sistemaQualidadeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `submenu`
--
ALTER TABLE `submenu`
  MODIFY `submenuID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de tabela `tipooperacao`
--
ALTER TABLE `tipooperacao`
  MODIFY `tipooperacaoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `tipoveiculo`
--
ALTER TABLE `tipoveiculo`
  MODIFY `tipoVeiculoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `transportador`
--
ALTER TABLE `transportador`
  MODIFY `transportadorID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `unidade`
--
ALTER TABLE `unidade`
  MODIFY `unidadeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de tabela `usuario`
--
ALTER TABLE `usuario`
  MODIFY `usuarioID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT de tabela `usuario_unidade`
--
ALTER TABLE `usuario_unidade`
  MODIFY `usuarioUnidadeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT de tabela `usuario_unidade_cargo`
--
ALTER TABLE `usuario_unidade_cargo`
  MODIFY `usuarioUnidadeCargoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
