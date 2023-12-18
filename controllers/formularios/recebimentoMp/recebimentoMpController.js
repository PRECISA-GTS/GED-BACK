const db = require('../../../config/db');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv/config')
const { addFormStatusMovimentation, formatFieldsToTable, hasUnidadeID } = require('../../../defaults/functions');
const { hasPending, deleteItem, criptoMd5, onlyNumbers, gerarSenha, gerarSenhaCaracteresIniciais, removeSpecialCharts } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');
const { send } = require('process');
const fornecedorPreenche = require('../../../email/template/recebimentoMP/naoConformidade/fornecedorPreenche');
const sendMailConfig = require('../../../config/email');

class RecebimentoMpController {
    async getList(req, res) {
        const { unidadeID, papelID, usuarioID } = req.params;

        if (!unidadeID || !papelID) return res.status(400).json({ error: 'unidadeID não informado!' })

        if (papelID == 1) {        //? Fábrica
            const sql = `
            SELECT 
                l.recebimentoMpID AS id, 
                IF(MONTH(l.data) > 0, DATE_FORMAT(l.data, "%d/%m/%Y"), '--') AS data, 
                plm.nome AS modelo,
                p.nome AS profissional, 
                IF(l.fornecedorID > 0, CONCAT(f.nome, ' (', f.cnpj, ')'), '--') AS fornecedor,
                s.nome AS status,
                s.cor,
                l.concluido
            FROM recebimentomp AS l
                JOIN par_recebimentomp_modelo AS plm ON (l.parRecebimentoMpModeloID = plm.parRecebimentoMpModeloID)
                JOIN status AS s ON (l.status = s.statusID)
                LEFT JOIN profissional AS p ON (l.preencheProfissionalID = p.profissionalID)
                LEFT JOIN fornecedor AS f ON (l.fornecedorID = f.fornecedorID)
            WHERE l.unidadeID = ?
            ORDER BY l.recebimentoMpID DESC, l.status ASC`

            const [result] = await db.promise().query(sql, [unidadeID])
            return res.json(result);

        } else if (papelID == 2) { //? Fornecedor
            //? Obtém o CNPJ do usuário logado 
            const sqlCnpj = `SELECT cnpj FROM usuario WHERE usuarioID = ?`
            const [resultCnpj] = await db.promise().query(sqlCnpj, [usuarioID])

            if (!resultCnpj[0]['cnpj']) return res.status(400).json({ error: 'Fornecedor não possui CNPJ!' })

            const sql = `
            SELECT 
                l.recebimentoMpID AS id, 
                IF(MONTH(l.data) > 0, DATE_FORMAT(l.data, "%d/%m/%Y"), '--') AS data, 
                plm.nome AS modelo,
                p.nome AS profissional, 
                CONCAT(u.nomeFantasia, ' (', u.cnpj, ')') AS fabrica,
                s.nome AS status,
                s.cor,
                l.concluido
            FROM recebimentomp AS l
                JOIN recebimentomp_naoconformidade AS rnc ON (l.recebimentoMpID = rnc.recebimentoMpID)
                JOIN par_recebimentomp_modelo AS plm ON (l.parRecebimentoMpModeloID = plm.parRecebimentoMpModeloID)
                JOIN status AS s ON (l.status = s.statusID)
                LEFT JOIN profissional AS p ON (l.preencheProfissionalID = p.profissionalID)
                LEFT JOIN unidade AS u ON (l.unidadeID = u.unidadeID)
                JOIN fornecedor AS f ON (l.fornecedorID = f.fornecedorID)
            WHERE f.cnpj = ? AND rnc.fornecedorPreenche = 1
            GROUP BY l.recebimentoMpID
            ORDER BY l.recebimentoMpID DESC, l.status ASC`

            const [result] = await db.promise().query(sql, [resultCnpj[0]['cnpj']])
            return res.json(result);
        }
    }

    async getModels(req, res) {
        const { unidadeID } = req.params;
        console.log("🚀 ~ unidadeID:", unidadeID)

        const sql = `
        SELECT a.parRecebimentoMpModeloID AS id, a.nome, a.ciclo, a.cabecalho
        FROM par_recebimentomp_modelo AS a 
        WHERE a.unidadeID = ? AND a.status = 1 
        ORDER BY a.nome ASC`
        const [result] = await db.promise().query(sql, [unidadeID])

        return res.status(200).json(result)
    }

    async insertData(req, res) {
        const data = req.body

        if (!data.model.id || !data.unidadeID) return res.status(400).json({ message: 'Erro ao inserir formulário!' })

        const logID = await executeLog('Criação de formulário do recebimento Mp', data.usuarioID, data.unidadeID, req)


        const sqlInsert = `INSERT INTO recebimentomp SET parRecebimentoMpModeloID = ?, data = ?, dataInicio = ?, abreProfissionalID = ?, unidadeID = ?`

        const recebimentoMpID = await executeQuery(sqlInsert, [data.model.id,
        new Date(),
        new Date(),
        data.profissionalID,
        data.unidadeID], 'insert', 'recebimentomp', 'recebimentompID', null, logID)

        return res.status(200).json({ recebimentoMpID })
    }

    async getData(req, res) {
        try {
            const { id } = req.params; // id do formulário
            const { unidadeID, profissionalID } = req.body;

            if (!id || id == 'undefined') { return res.json({ message: 'Erro ao listar formulário!' }) }

            const sqlResult = `
            SELECT
                r.parRecebimentoMpModeloID,
                prm.nome AS modeloNome,
                prm.ciclo AS modeloCiclo,

                r.unidadeID,
                DATE_FORMAT(r.dataInicio, '%Y-%m-%d') AS dataInicio,
                DATE_FORMAT(r.dataInicio, '%H:%i') AS horaInicio,
                r.abreProfissionalID,
                pa.nome AS abreProfissionalNome,
                r.naoConformidade,
                r.concluido,

                -- Fornecedor
                f.fornecedorID,
                CONCAT(f.nome, " (", f.cnpj, ")") AS nomeFornecedor,
                f.nome AS nomeFornecedor_,
                f.cnpj AS cnpjFornecedor,
                f.telefone AS telefoneFornecedor,
                CONCAT(f.cidade, "/", f.estado) AS cidadeFornecedor,
                uf.cabecalhoRelatorio AS fotoFornecedor,
                f.email AS emailFornecedor,
                (
                    SELECT IF(COUNT(*) > 0, 1, 0)
                    FROM usuario AS ui 
                    WHERE ui.cnpj = f.cnpj 
                ) AS fornecedorIsUser,

                DATE_FORMAT(r.data, '%Y-%m-%d') AS data,
                IF(r.data, DATE_FORMAT(r.data, '%H:%i'), DATE_FORMAT(NOW(), '%H:%i')) AS hora,
                r.preencheProfissionalID,
                pp.nome AS preencheProfissionalNome,

                DATE_FORMAT(r.dataConclusao, '%Y-%m-%d') AS dataConclusao,
                IF(r.dataConclusao, DATE_FORMAT(r.dataConclusao, '%H:%i'), DATE_FORMAT(NOW(), '%H:%i')) AS horaConclusao,
                r.aprovaProfissionalID,
                pap.nome AS aprovaProfissionalNome,

                DATE_FORMAT(r.dataFim, '%Y-%m-%d') AS dataFim,
                DATE_FORMAT(r.dataFim, '%H:%i') AS horaFim,
                r.finalizaProfissionalID,
                pf.nome AS finalizaProfissionalNome,

                u.nomeFantasia,
                u.cnpj
            FROM recebimentomp AS r
                LEFT JOIN unidade AS u ON(r.unidadeID = u.unidadeID)
                LEFT JOIN profissional AS pa ON(r.abreProfissionalID = pa.profissionalID)
                LEFT JOIN profissional AS pp ON(r.preencheProfissionalID = pp.profissionalID)
                LEFT JOIN profissional AS pap ON(r.aprovaProfissionalID = pap.profissionalID)
                LEFT JOIN profissional AS pf ON(r.finalizaProfissionalID = pf.profissionalID)
                LEFT JOIN fornecedor AS f ON(r.fornecedorID = f.fornecedorID)
                LEFT JOIN unidade AS uf ON (f.cnpj = uf.cnpj)
                LEFT JOIN par_recebimentomp_modelo AS prm ON (prm.parRecebimentoMpModeloID = r.parRecebimentoMpModeloID)
            WHERE r.recebimentoMpID = ? `
            const [result] = await db.promise().query(sqlResult, [id])
            const unidade = {
                modelo: {
                    id: result[0]['parRecebimentoMpModeloID'] ?? 0,
                    nome: result[0]['modeloNome'],
                    ciclo: result[0]['modeloCiclo']
                },
                unidadeID: result[0]['unidadeID'],
                nomeFantasia: result[0]['nomeFantasia'],
                cnpj: result[0]['cnpj']
            }
            const modeloID = result[0].parRecebimentoMpModeloID

            // Fields do header
            const sqlFields = `
            SELECT *
            FROM par_recebimentomp AS pr
                LEFT JOIN par_recebimentomp_modelo_cabecalho AS prmc ON(pr.parRecebimentoMpID = prmc.parRecebimentoMpID)
            WHERE prmc.parRecebimentoMpModeloID = ?
            ORDER BY prmc.ordem ASC`
            const [resultFields] = await db.promise().query(sqlFields, [modeloID])

            // Varre fields, verificando se há tipo == 'int', se sim, busca opções pra selecionar no select 
            for (const alternatives of resultFields) {
                if (alternatives.tipo === 'int' && alternatives.tabela) {
                    // Busca cadastros ativos e da unidade (se houver unidadeID na tabela)
                    const sqlOptions = `
                    SELECT ${alternatives.tabela}ID AS id, nome
                    FROM ${alternatives.tabela} 
                    WHERE status = 1 ${await hasUnidadeID(alternatives.tabela) ? ` AND unidadeID = ${unidade.unidadeID} ` : ``}
                    ORDER BY nome ASC`

                    // Executar select e inserir no objeto alternatives
                    const [resultOptions] = await db.promise().query(sqlOptions)
                    alternatives.options = resultOptions
                }
            }

            // Varrer result, pegando nomeColuna e inserir em um array se row.tabela == null
            let columns = []
            for (const row of resultFields) {
                if (!row.tabela) { columns.push(row.nomeColuna) }
            }

            // varrer resultFields 
            for (const field of resultFields) {
                if (field.tabela) {
                    // Monta objeto pra preencher select 
                    // Ex.: profissional:{
                    //     id: 1,
                    //     nome: 'Fulano'
                    // }
                    const sqlFieldData = `
                    SELECT t.${field.nomeColuna} AS id, t.nome
                    FROM recebimentomp AS r
                        JOIN ${field.tabela} AS t ON(r.${field.nomeColuna} = t.${field.nomeColuna}) 
                    WHERE r.recebimentoMpID = ${id} `
                    let [temp] = await db.promise().query(sqlFieldData)
                    if (temp) {
                        field[field.tabela] = temp[0]
                    }
                } else {
                    const sqlFieldData = `SELECT ${field.nomeColuna} AS coluna FROM recebimentomp WHERE recebimentoMpID = ? `;
                    let [resultFieldData] = await db.promise().query(sqlFieldData, [id])
                    field[field.nomeColuna] = resultFieldData[0].coluna ?? ''
                }
            }

            //? Produtos
            const sqlProdutos = `
            SELECT
                rp.recebimentoMpProdutoID,
                rp.quantidade,
                DATE_FORMAT(rp.dataFabricacao, '%Y-%m-%d') AS dataFabricacao,
                rp.lote,
                rp.nf,
                DATE_FORMAT(rp.dataValidade, '%Y-%m-%d') AS dataValidade,
                p.produtoID,
                p.nome AS produto,
                um.nome AS unidadeMedida,
                a.apresentacaoID,
                a.nome AS apresentacao                
            FROM recebimentomp_produto AS rp
                JOIN produto AS p ON(rp.produtoID = p.produtoID)
                JOIN unidademedida AS um ON(p.unidadeMedidaID = um.unidadeMedidaID)
                LEFT JOIN apresentacao AS a ON(rp.apresentacaoID = a.apresentacaoID)
            WHERE rp.recebimentoMpID = ?
            ORDER BY p.nome ASC`
            const [resultProdutos] = await db.promise().query(sqlProdutos, [id])

            for (const produto of resultProdutos) {
                produto['checked_'] = true
                produto['apresentacao'] = produto['apresentacaoID'] > 0 ? {
                    id: produto['apresentacaoID'],
                    nome: produto['apresentacao']
                } : null
                produto['produto'] = {
                    id: produto['produtoID'],
                    nome: produto['produto']
                }
            }

            const sqlBlocos = `
            SELECT *
            FROM par_recebimentomp_modelo_bloco
            WHERE parRecebimentoMpModeloID = ? AND status = 1
            ORDER BY ordem ASC`
            const [resultBlocos] = await db.promise().query(sqlBlocos, [modeloID])

            //? Blocos
            const sqlBloco = getSqlBloco()
            for (const bloco of resultBlocos) {
                const [resultBloco] = await db.promise().query(sqlBloco, [id, id, id, bloco.parRecebimentoMpModeloBlocoID])

                //? Itens
                for (const item of resultBloco) {
                    const sqlAlternativa = getAlternativasSql()
                    const [resultAlternativa] = await db.promise().query(sqlAlternativa, [item['parRecebimentoMpModeloBlocoItemID']])
                    item.alternativas = resultAlternativa

                    // Cria objeto da resposta (se for de selecionar)
                    if (item?.respostaID > 0) {
                        item.resposta = {
                            id: item.respostaID,
                            nome: item.resposta
                        }
                    }

                    // Obter os anexos vinculados a essa resposta
                    const sqlRespostaAnexos = `
                    SELECT io.itemOpcaoID, io.anexo, io.bloqueiaFormulario, io.observacao, ioa.itemOpcaoAnexoID, ioa.nome, ioa.obrigatorio
                    FROM item_opcao AS io 
                        LEFT JOIN item_opcao_anexo AS ioa ON(io.itemOpcaoID = ioa.itemOpcaoID)
                    WHERE io.itemID = ? AND io.alternativaItemID = ? `
                    const [resultRespostaAnexos] = await db.promise().query(sqlRespostaAnexos, [item.itemID, item?.respostaID ?? 0])

                    if (resultRespostaAnexos.length > 0) {
                        for (const respostaAnexo of resultRespostaAnexos) {
                            //? Verifica se cada anexo exigido existe 1 ou mais arquivos anexados
                            const sqlArquivosAnexadosResposta = `
                            SELECT *
                            FROM anexo AS a 
                                JOIN anexo_busca AS ab ON(a.anexoID = ab.anexoID)
                            WHERE ab.recebimentoMpID = ? AND ab.parRecebimentoMpModeloBlocoID = ? AND ab.itemOpcaoAnexoID = ? `
                            const [resultArquivosAnexadosResposta] = await db.promise().query(sqlArquivosAnexadosResposta, [id, bloco.parRecebimentoMpModeloBlocoID, respostaAnexo.itemOpcaoAnexoID])

                            let anexos = []
                            for (const anexo of resultArquivosAnexadosResposta) {
                                const objAnexo = {
                                    exist: true,
                                    anexoID: anexo.anexoID,
                                    path: `${process.env.BASE_URL_API}${anexo.diretorio}${anexo.arquivo} `,
                                    nome: anexo.titulo,
                                    tipo: anexo.tipo,
                                    size: anexo.tamanho,
                                    time: anexo.dataHora
                                }
                                anexos.push(objAnexo)
                            }

                            respostaAnexo['anexos'] = anexos ?? []
                        }
                    }

                    item['respostaConfig'] = {
                        'anexo': resultRespostaAnexos[0]?.anexo ?? 0,
                        'bloqueiaFormulario': resultRespostaAnexos[0]?.bloqueiaFormulario ?? 0,
                        'observacao': resultRespostaAnexos[0]?.observacao ?? 0,
                        'anexosSolicitados': resultRespostaAnexos ?? []
                    }
                }

                bloco.itens = resultBloco
            }

            // Observação e status
            const sqlOtherInformations = getSqlOtherInfos()
            const [resultOtherInformations] = await db.promise().query(sqlOtherInformations, [id])

            //* Última movimentação do formulário
            const sqlLastMovimentation = `
            SELECT
                u.nome,
                un.nomeFantasia,
                s1.nome AS statusAnterior,
                s2.nome AS statusAtual,
                DATE_FORMAT(m.dataHora, '%d/%m/%Y %H:%i') AS dataHora,
                m.observacao
            FROM movimentacaoformulario AS m
                JOIN usuario AS u ON(m.usuarioID = u.usuarioID)
                JOIN unidade AS un ON(m.unidadeID = un.unidadeID)
                LEFT JOIN status AS s1 ON(s1.statusID = m.statusAnterior)
                LEFT JOIN status AS s2 ON(s2.statusID = m.statusAtual)
            WHERE m.parFormularioID = 2 AND m.id = ?
            ORDER BY m.movimentacaoFormularioID DESC 
            LIMIT 1`
            const [resultLastMovimentation] = await db.promise().query(sqlLastMovimentation, [id])

            //? Cabeçalho do modelo do formulário 
            const sqlCabecalhoModelo = `
            SELECT cabecalho
            FROM par_recebimentomp_modelo
            WHERE parRecebimentoMpModeloID = ? `
            const [resultCabecalhoModelo] = await db.promise().query(sqlCabecalhoModelo, [modeloID])

            const data = {
                unidade: unidade,
                fieldsHeader: {
                    //? Fixos
                    abertoPor: {
                        dataInicio: result[0].dataInicio,
                        horaInicio: result[0].horaInicio,
                        profissional: result[0].abreProfissionalID > 0 ? {
                            id: result[0].abreProfissionalID,
                            nome: result[0].abreProfissionalNome
                        } : null
                    },
                    //? Fields                    
                    data: result[0].data,
                    hora: result[0].hora,
                    profissional: result[0].preencheProfissionalID > 0 ? {
                        id: result[0].preencheProfissionalID,
                        nome: result[0].preencheProfissionalNome
                    } : null,
                    fornecedor: result[0].fornecedorID > 0 ? {
                        id: result[0].fornecedorID,
                        nome: result[0].nomeFornecedor,
                        nome_: result[0].nomeFornecedor_,
                        cnpj_: result[0].cnpjFornecedor,
                        telefone: result[0].telefoneFornecedor,
                        cidade: result[0].cidadeFornecedor,
                        foto: result[0].fotoFornecedor ? `${process.env.BASE_URL_API}${result[0].fotoFornecedor}` : null,
                        email: result[0].emailFornecedor,
                        isUser: result[0].fornecedorIsUser == 1 ? true : false
                    } : null
                },
                fieldsFooter: {
                    concluded: result[0].dataFim ? true : false,

                    dataConclusao: result[0].dataConclusao,
                    horaConclusao: result[0].horaConclusao,
                    profissional: result[0].aprovaProfissionalID > 0 ? {
                        id: result[0].aprovaProfissionalID,
                        nome: result[0].aprovaProfissionalNome
                    } : null,

                    conclusion: {
                        dataFim: result[0].dataFim,
                        horaFim: result[0].horaFim,
                        profissional: result[0].finalizaProfissionalID > 0 ? {
                            id: result[0].finalizaProfissionalID,
                            nome: result[0].finalizaProfissionalNome
                        } : null
                    }
                },
                fields: resultFields,
                produtos: resultProdutos ?? [],
                blocos: resultBlocos ?? [],
                grupoAnexo: [],
                ultimaMovimentacao: resultLastMovimentation[0] ?? null,
                info: {
                    obs: resultOtherInformations[0].obs,
                    status: resultOtherInformations[0].status,
                    naoConformidade: result[0].naoConformidade == 1 ? true : false,
                    concluido: result[0].concluido == 1 ? true : false,
                    cabecalhoModelo: resultCabecalhoModelo[0].cabecalho
                },
                link: `${process.env.BASE_URL} formularios / recebimento - mp ? id = ${id} `,
                naoConformidade: {
                    itens: await getNaoConformidades(id),
                    // varrer array resultProdutos e retornar somente o objeto produto 
                    produtos: resultProdutos.map(produto => {
                        return produto.produto
                    })
                }
            }

            res.status(200).json(data);
        } catch (error) {
            console.log(error)
        }
    }

    async updateData(req, res) {
        const { id } = req.params
        const data = req.body.form
        const { usuarioID, profissionalID, papelID, unidadeID } = req.body.auth

        try {
            if (!id || id == 'undefined') { return res.json({ message: 'ID não recebido!' }); }

            const logID = await executeLog('Edição formulário do Recebimento Mp', usuarioID, unidadeID, req)

            const sqlSelect = `SELECT status, naoConformidade, naoConformidadeEmailFornecedor FROM recebimentomp WHERE recebimentoMpID = ? `
            const [result] = await db.promise().query(sqlSelect, [id])

            //? Atualiza header e footer fixos
            const sqlStaticlHeader = `
            UPDATE recebimentomp SET data = ?, preencheProfissionalID = ?, fornecedorID = ?, dataConclusao = ?, aprovaProfissionalID = ?
            WHERE recebimentoMpID = ? `
            const resultStaticHeader = await executeQuery(sqlStaticlHeader, [
                data.fieldsHeader?.data ? `${data?.fieldsHeader?.data} ${data?.fieldsHeader?.hora}` : null,
                data.fieldsHeader?.profissional?.id ?? null,
                data.fieldsHeader?.fornecedor?.id ?? null,
                data.fieldsFooter?.dataConclusao ? `${data.fieldsFooter.dataConclusao} ${data.fieldsFooter.horaConclusao} ` : null,
                data.fieldsFooter?.profissional?.id ?? null,
                id
            ], 'update', 'recebimentomp', 'recebimentompID', id, logID)

            //? Atualizar o header dinâmico e setar o status        
            if (data.fields) {
                //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
                let dataHeader = await formatFieldsToTable('par_recebimentomp', data.fields)
                const sqlHeader = `UPDATE recebimentomp SET ? WHERE recebimentoMpID = ${id} `;
                const resultHeader = await executeQuery(sqlHeader, [dataHeader], 'update', 'recebimentomp', 'recebimentoMpID', id, logID)
                if (resultHeader.length === 0) { return res.status(500).json('Error'); }
            }

            //? Produtos
            if (data.info.status < 40 && data.produtos && data.produtos.length > 0) {
                // Deleta produtos do recebimento
                const sqlDeleteProduto = `DELETE FROM recebimentomp_produto WHERE recebimentoMpID = ? `
                // const [resultDeleteProduto] = await db.promise().query(sqlDeleteProduto, [id])
                const resultDeleteProduto = await executeQuery(sqlDeleteProduto, [id], 'delete', 'recebimentomp_produto', 'recebimentoMpID', id, logID)
                for (const produto of data.produtos) {
                    if (produto && produto.checked_) { //? Marcou o produto no checkbox
                        if (produto && produto.produtoID > 0) {
                            const sqlInsertProduto = `
                        INSERT INTO recebimentomp_produto(recebimentoMpID, produtoID, quantidade, dataFabricacao, lote, nf, dataValidade, apresentacaoID)
                        VALUES(?, ?, ?, ?, ?, ?, ?, ?)`
                            const resultInsertProduto = await executeQuery(sqlInsertProduto, [
                                id,
                                produto.produtoID,
                                produto.quantidade ?? null,
                                produto.dataFabricacao ?? null,
                                produto.lote ?? null,
                                produto.nf ?? null,
                                produto.dataValidade ?? null,
                                produto.apresentacao?.id ?? null
                            ], 'insert', 'recebimentomp_produto', 'recebimentoMpProdutoID', null, logID)
                            if (!resultInsertProduto) { return res.json('Error'); }
                        }
                    }
                }
            }

            //? Blocos 
            for (const bloco of data.blocos) {
                // Itens 
                if (bloco && bloco.parRecebimentoMpModeloBlocoID && bloco.parRecebimentoMpModeloBlocoID > 0 && bloco.itens) {
                    for (const item of bloco.itens) {
                        if (item && item.itemID && item.itemID > 0) {
                            // Verifica se já existe registro em recebimentomp_resposta, com o recebimentompID, parRecebimentoMpModeloBlocoID e itemID, se houver, faz update, senao faz insert 
                            const sqlVerificaResposta = `SELECT * FROM recebimentomp_resposta WHERE recebimentoMpID = ? AND parRecebimentoMpModeloBlocoID = ? AND itemID = ? `
                            const [resultVerificaResposta] = await db.promise().query(sqlVerificaResposta, [id, bloco.parRecebimentoMpModeloBlocoID, item.itemID])

                            const resposta = item.resposta && item.resposta.nome ? item.resposta.nome : item.resposta
                            const respostaID = item.resposta && item.resposta.id > 0 ? item.resposta.id : null
                            const observacao = item.observacao != undefined ? item.observacao : ''

                            if (resposta && resultVerificaResposta.length === 0) {
                                const sqlInsert = `INSERT INTO recebimentomp_resposta(recebimentoMpID, parRecebimentoMpModeloBlocoID, itemID, resposta, respostaID, obs) VALUES(?, ?, ?, ?, ?, ?)`
                                // const [resultInsert] = await db.promise().query(sqlInsert, [
                                //     id,
                                //     bloco.parRecebimentoMpModeloBlocoID,
                                //     item.itemID,
                                //     resposta,
                                //     respostaID,
                                //     observacao
                                // ])
                                const resultInsert = await executeQuery(sqlInsert, [
                                    id,
                                    bloco.parRecebimentoMpModeloBlocoID,
                                    item.itemID,
                                    resposta,
                                    respostaID,
                                    observacao
                                ], 'insert', 'recebimentomp_resposta', 'recebimentoMpRespostaID', null, logID)

                                if (!resultInsert) { return res.json('Error'); }
                            } else if (resposta && resultVerificaResposta.length > 0) {
                                const sqlUpdate = `
                            UPDATE recebimentomp_resposta 
                            SET resposta = ?, respostaID = ?, obs = ?, recebimentoMpID = ?
                            WHERE recebimentoMpID = ? AND parRecebimentoMpModeloBlocoID = ? AND itemID = ? `
                                // const [resultUpdate] = await db.promise().query(sqlUpdate, [
                                //     resposta,
                                //     respostaID,
                                //     observacao,
                                //     id,
                                //     id,
                                //     bloco.parRecebimentoMpModeloBlocoID,
                                //     item.itemID
                                // ])
                                const resultUpdate = await executeQuery(sqlUpdate, [
                                    resposta,
                                    respostaID,
                                    observacao,
                                    id,
                                    id,
                                    bloco.parRecebimentoMpModeloBlocoID,
                                    item.itemID
                                ], 'update', 'recebimentomp_resposta', 'recebimentoMpID', id, logID)
                                if (!resultUpdate) { return res.json('Error'); }
                            }
                            else if (!resposta) {
                                const sqlDelete = `DELETE FROM recebimentomp_resposta WHERE recebimentoMpID = ? AND parRecebimentoMpModeloBlocoID = ? AND itemID = ? `
                                // const [resultDelete] = await db.promise().query(sqlDelete, [id, bloco.parRecebimentoMpModeloBlocoID, item.itemID])
                                const resultDelete = await executeQuery(sqlDelete, [id, bloco.parRecebimentoMpModeloBlocoID, item.itemID], 'delete', 'recebimentomp_resposta', 'recebimentoMpID', id, logID)
                            }
                        }
                    }

                }
            } // laço blocos..

            // Observação
            const sqlUpdateObs = `UPDATE recebimentomp SET obs = ?, obsConclusao = ? WHERE recebimentoMpID = ? `
            const resultUpdateObs = await executeQuery(sqlUpdateObs, [data.info?.obs, data?.obsConclusao, id], 'update', 'recebimentomp', 'recebimentoMpID', id, logID)
            if (!resultUpdateObs) { return res.json('Error'); }

            //* Status
            const newStatus = data.info.status < 30 ? 30 : data.info.status
            //* Fecha formulário: se concluiu e não gerou NC ou já existia NC e concluiu novamente!
            const concluido = data.concluiForm && (!data.info.naoConformidade || result[0]['naoConformidade'] == 1) ? '1' : '0'

            const sqlUpdateStatus = `UPDATE recebimentomp SET status = ?, naoConformidade = ?, dataFim = ?, finalizaProfissionalID = ?, concluido = ? WHERE recebimentoMpID = ? `
            const resultUpdateStatus = await executeQuery(sqlUpdateStatus, [
                newStatus,
                data.info.naoConformidade ? '1' : '0',
                newStatus >= 40 ? new Date() : null,
                newStatus >= 40 ? profissionalID : null,
                concluido,
                id
            ], 'update', 'recebimentomp', 'recebimentoMpID', id, logID)

            //! Atualiza não conformidades, caso haja
            if (data.info.naoConformidade) {
                if (data.naoConformidade.itens.length > 0) {
                    for (const nc of data.naoConformidade.itens) {
                        nc.recebimentoMpNaoConformidadeID > 0 ? await updateNc(nc, id, logID) : await insertNc(nc, id, logID)
                    }
                }

                //? Se ainda não enviou email ao fornecedor preencher NC, verifica se precisa enviar
                if (result[0]['naoConformidadeEmailFornecedor'] != 1) await checkNotificationFornecedor(id, data.fieldsHeader.fornecedor, data.naoConformidade.itens, unidadeID, usuarioID, papelID, req)
            }

            //? Gera histórico de alteração de status (se houve alteração)
            if (result[0]['status'] != newStatus) {
                const movimentation = await addFormStatusMovimentation(2, id, usuarioID, unidadeID, papelID, result[0]['status'] ?? '0', newStatus, data?.obsConclusao)
                if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }
            }

            res.status(200).json({ message: 'Função do email sucesso' })

        } catch (error) {
            console.log({ error, message: 'Função email errrooo' })
        }
    }

    //* Salva os anexos do formulário na pasta uploads/anexo e insere os dados na tabela anexo
    async saveAnexo(req, res) {
        try {
            const { id } = req.params;
            const pathDestination = req.pathDestination
            const files = req.files; //? Array de arquivos

            const { usuarioID, unidadeID, produtoAnexoID, grupoAnexoItemID, parRecebimentoMpModeloBlocoID, itemOpcaoAnexoID } = req.body;

            //? Verificar se há arquivos enviados
            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }
            const logID = await executeLog('Salvo anexo do formulário do recebimento Mp', usuarioID, unidadeID, req)

            let result = []
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                //? Insere em anexo
                const sqlInsert = `INSERT INTO anexo(titulo, diretorio, arquivo, tamanho, tipo, usuarioID, unidadeID, dataHora) VALUES(?,?,?,?,?,?,?,?)`;
                const anexoID = await executeQuery(sqlInsert, [removeSpecialCharts(file.originalname),
                    pathDestination,
                file.filename,
                file.size,
                file.mimetype,
                    usuarioID,
                    unidadeID,
                new Date()], 'insert', 'anexo', 'anexoID', null, logID)

                //? Insere em anexo_busca
                const sqlInsertBusca = `INSERT INTO anexo_busca(anexoID, recebimentoMpID, produtoAnexoID, grupoAnexoItemID, parRecebimentoMpModeloBlocoID, itemOpcaoAnexoID) VALUES(?,?,?,?,?,?)`;
                await executeQuery(sqlInsertBusca, [anexoID,
                    id,
                    produtoAnexoID ?? null,
                    grupoAnexoItemID ?? null,
                    parRecebimentoMpModeloBlocoID ?? null,
                    itemOpcaoAnexoID ?? null], 'insert', 'anexo_busca', 'anexoBuscaID', null, logID)

                const objAnexo = {
                    exist: true,
                    anexoID: anexoID,
                    path: `${process.env.BASE_URL_API}${pathDestination}${file.filename} `,
                    nome: file.originalname,
                    tipo: file.mimetype,
                    size: file.size,
                    time: new Date(),
                }
                result.push(objAnexo)
            }

            return res.status(200).json(result)
        } catch (error) {
            console.log(error)
        }
    }

    async deleteAnexo(req, res) {
        const { id, anexoID, unidadeID, usuarioID, folder } = req.params;

        //? Obtém o caminho do anexo atual
        const sqlCurrentFile = `SELECT arquivo FROM anexo WHERE anexoID = ? `;
        const [tempResultCurrentFile] = await db.promise().query(sqlCurrentFile, [anexoID])
        const resultCurrentFile = tempResultCurrentFile[0]?.arquivo;

        //? Remover arquivo do diretório
        if (resultCurrentFile) {
            const pathFile = `uploads / ${unidadeID} /recebimento-mp/${folder} /`
            const previousFile = path.resolve(pathFile, resultCurrentFile);
            fs.unlink(previousFile, (error) => {
                if (error) {
                    return console.error('Erro ao remover o anexo:', error);
                } else {
                    return console.log('Anexo removido com sucesso!');
                }
            });
        }

        const logID = await executeLog('Remoção de anexo do formulário do recebimento Mp', usuarioID, unidadeID, req)

        //? Remove anexo do BD
        const sqlDelete = `DELETE FROM anexo WHERE anexoID = ?`;
        await executeQuery(sqlDelete, [anexoID], 'delete', 'anexo', 'anexoID', anexoID, logID)

        const sqlDeleteBusca = `DELETE FROM anexo_busca WHERE anexoID = ?`;
        await executeQuery(sqlDeleteBusca, [anexoID], 'delete', 'anexo_busca', 'anexoID', anexoID, logID)

        res.status(200).json(anexoID);
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['recebimentomp', 'recebimentomp_produto', 'recebimentomp_resposta'],
            column: 'recebimentoMpID'
        }

        const arrPending = []

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão anexo no formulário do recebimento Mp', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão anexo no formulário do recebimento Mp', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }

    async saveRelatorio(req, res) {
        const pathDestination = req.pathDestination
        const files = req.files;
    }

    async getNaoConformidadeModels(req, res) {
        const { unidadeID } = req.params

        try {
            const sqlModel = `
            SELECT parRecebimentoMpNaoConformidadeModeloID, nome, ciclo, cabecalho
            FROM par_recebimentomp_naoconformidade_modelo                
            WHERE unidadeID = ? AND status = 1
            ORDER BY nome ASC`
            const [resultModels] = await db.promise().query(sqlModel, [unidadeID])

            for (const model of resultModels) {

                const profissionaisAssinatura = await getNcDynamicProfessionals(model.parRecebimentoMpNaoConformidadeModeloID)

                const sqlFields = `
                SELECT prnmc.obrigatorio, prnmc.ordem, prn.nomeCampo, prn.tabela, prn.nomeColuna, prn.tipo
                FROM par_recebimentomp_naoconformidade_modelo_cabecalho AS prnmc
                    LEFT JOIN par_recebimentomp_naoconformidade AS prn ON (prn.parRecebimentoMpNaoConformidadeID = prnmc.parRecebimentoMpNaoConformidadeID)
                WHERE prnmc.parRecebimentoMpNaoConformidadeModeloID = ?
                ORDER BY prn.ordem ASC`
                const [resultFields] = await db.promise().query(sqlFields, [model.parRecebimentoMpNaoConformidadeModeloID])
                model['dynamicFields'] = resultFields ?? []
                model['profissionaisOptions'] = {
                    'preenchimento': profissionaisAssinatura.profissionaisPreenchimento ?? [],
                    'conclusao': profissionaisAssinatura.profissionaisConclusao ?? []
                }
            }

            return res.status(200).json(resultModels)
        } catch (error) {
            console.log(error)
        }
    }
}

//! Não conformidade 
const getNaoConformidades = async (recebimentoMpID) => {
    try {
        if (!recebimentoMpID) return [];

        //? Obtém todas as não conformidades do recebimento
        const sql = `
        SELECT 
            rn.recebimentoMpNaoConformidadeID,
            rn.parRecebimentoMpNaoConformidadeModeloID,
            prnm.nome AS modeloNome,
            DATE_FORMAT(rn.data, '%Y-%m-%d') AS data,
            DATE_FORMAT(rn.data, '%H:%i') AS hora,
            pp.profissionalID AS profissionalIDPreenchimento,
            pp.nome AS profissionalNomePreenchimento,
            rn.tipo,
            pr.produtoID,
            pr.nome AS produtoNome,
            rn.descricao,
            rn.acoesSolicitadas,
            rn.fornecedorPreenche,
            rn.obsFornecedor, 
            DATE_FORMAT(rn.dataFornecedor, '%Y-%m-%d') AS dataFornecedor,
            DATE_FORMAT(rn.dataFornecedor, '%H:%i') AS horaFornecedor,
            u.usuarioID AS usuarioIDFornecedor,
            u.nome AS usuarioNomeFornecedor,
            rn.conclusao,
            DATE_FORMAT(rn.dataConclusao, '%Y-%m-%d') AS dataConclusao,
            DATE_FORMAT(rn.dataConclusao, '%H:%i') AS horaConclusao,
            pc.profissionalID AS profissionalIDConclusao,
            pc.nome AS profissionalNomeConclusao,
            rn.status
        FROM recebimentomp_naoconformidade AS rn
            LEFT JOIN profissional AS pp ON (rn.profissionalIDPreenchimento = pp.profissionalID)                
            LEFT JOIN produto AS pr ON (rn.produtoID = pr.produtoID)
            LEFT JOIN usuario AS u ON (rn.usuarioID = u.usuarioID)
            LEFT JOIN profissional AS pc ON (rn.profissionalIDConclusao = pc.profissionalID)
            LEFT JOIN par_recebimentomp_naoconformidade_modelo AS prnm ON (rn.parRecebimentoMpNaoConformidadeModeloID = prnm.parRecebimentoMpNaoConformidadeModeloID)
        WHERE rn.recebimentoMpID = ? `
        const [result] = await db.promise().query(sql, [recebimentoMpID])

        if (result.length === 0) return []

        let arrData = []
        for (const row of result) {
            //? Obtém os campos dinâmicos da não conformidade baseada no modelo
            const dynamicFields = await getNcDynamicFields(row.recebimentoMpNaoConformidadeID, row.parRecebimentoMpNaoConformidadeModeloID)
            const profissionaisAssinatura = await getNcDynamicProfessionals(row.parRecebimentoMpNaoConformidadeModeloID)

            const data = {
                'recebimentoMpNaoConformidadeID': row.recebimentoMpNaoConformidadeID,
                'modelo': {
                    id: row.parRecebimentoMpNaoConformidadeModeloID,
                    nome: row.modeloNome
                },
                'fornecedorPreenche': row.fornecedorPreenche == 1 ? true : false,
                'data': row.data,
                'hora': row.hora,
                'profissionalPreenchimento': row.profissionalIDPreenchimento > 0 ? {
                    id: row.profissionalIDPreenchimento,
                    nome: row.profissionalNomePreenchimento
                } : null,
                'tipo': row.tipo,
                'produto': row.produtoID > 0 ? {
                    id: row.produtoID,
                    nome: row.produtoNome
                } : null,
                dynamicFields: dynamicFields,
                'obsFornecedor': row.obsFornecedor,
                'dataFornecedor': row.dataFornecedor,
                'horaFornecedor': row.horaFornecedor,
                'usuarioFornecedor': row.usuarioIDFornecedor > 0 ? {
                    id: row.usuarioIDFornecedor,
                    nome: row.usuarioNomeFornecedor
                } : null,
                'conclusao': row.conclusao,
                'dataConclusao': row.dataConclusao,
                'horaConclusao': row.horaConclusao,
                'profissionalConclusao': row.profissionalIDConclusao > 0 ? {
                    id: row.profissionalIDConclusao,
                    nome: row.profissionalNomeConclusao
                } : null,
                'profissionaisOptions': {
                    'preenchimento': profissionaisAssinatura.profissionaisPreenchimento ?? [],
                    'conclusao': profissionaisAssinatura.profissionaisConclusao ?? []
                },
                'status': row.status
            }

            arrData.push(data)
        }

        return arrData

    } catch (error) {
        console.log(error)
    }
}

const getNcDynamicFields = async (recebimentoMpNaoConformidadeID, parRecebimentoMpNaoConformidadeModeloID) => {
    const sqlConfig = `
    SELECT prnmc.ordem, prn.nomeCampo, prn.tabela, prn.nomeColuna, prnmc.obrigatorio
    FROM par_recebimentomp_naoconformidade_modelo AS prnm
        LEFT JOIN par_recebimentomp_naoconformidade_modelo_cabecalho AS prnmc ON (prnmc.parRecebimentoMpNaoConformidadeModeloID = prnm.parRecebimentoMpNaoConformidadeModeloID)
        LEFT JOIN par_recebimentomp_naoconformidade AS prn ON (prn.parRecebimentoMpNaoConformidadeID = prnmc.parRecebimentoMpNaoConformidadeID)
    WHERE prnm.parRecebimentoMpNaoConformidadeModeloID = ? `
    const [resultDynamicFields] = await db.promise().query(sqlConfig, [parRecebimentoMpNaoConformidadeModeloID])

    //? Obtém os valores dos campos na tabela recebimentomp_naoconformidade
    const sqlValues = `
    SELECT *
    FROM recebimentomp_naoconformidade AS rn 
    WHERE rn.recebimentoMpNaoConformidadeID = ? `
    const [resultValues] = await db.promise().query(sqlValues, [recebimentoMpNaoConformidadeID])

    //? Monta o objeto de retorno
    for (const row of resultDynamicFields) {
        row.value = resultValues[0][row.nomeColuna]
    }

    return resultDynamicFields ?? []
}

const getNcDynamicProfessionals = async (parRecebimentoMpNaoConformidadeModeloID) => {
    const sqlConfig = `
    SELECT p.profissionalID AS id, p.nome, prnmp.tipo
    FROM par_recebimentomp_naoconformidade_modelo AS prnm
        JOIN par_recebimentomp_naoconformidade_modelo_profissional AS prnmp ON (prnmp.parRecebimentoMpNaoConformidadeModeloID = prnm.parRecebimentoMpNaoConformidadeModeloID)
        JOIN profissional AS p ON (p.profissionalID = prnmp.profissionalID)
    WHERE prnm.parRecebimentoMpNaoConformidadeModeloID = ? `
    const [resultDynamicProfessionals] = await db.promise().query(sqlConfig, [parRecebimentoMpNaoConformidadeModeloID])

    const profissionaisPreenchimento = []
    const profissionaisConclusao = []

    for (const row of resultDynamicProfessionals) {
        if (row.tipo == 1) {
            profissionaisPreenchimento.push({
                id: row.id,
                nome: row.nome
            })
        } else if (row.tipo == 2) {
            profissionaisConclusao.push({
                id: row.id,
                nome: row.nome
            })
        }
    }

    return {
        profissionaisPreenchimento: profissionaisPreenchimento,
        profissionaisConclusao: profissionaisConclusao
    }
}

//* Obtém colunas
const getFields = async (parRecebimentoMpModeloID, unidadeID) => {
    const sqlFields = `
    SELECT * 
    FROM par_recebimentomp AS pl
        JOIN par_recebimentomp_modelo_cabecalho AS plmc ON (plmc.parRecebimentoMpID = pl.parRecebimentoMpID)
        JOIN par_recebimentomp_modelo AS plm ON (plm.parRecebimentoMpModeloID = plmc.parRecebimentoMpModeloID)
    WHERE plm.parRecebimentoMpModeloID = ?`
    const [resultFields] = await db.promise().query(sqlFields, [parRecebimentoMpModeloID])
    if (resultFields.length === 0) { return res.json({ message: 'Nenhum campo encontrado' }) }

    // Varre fields, verificando se há tipo == 'int', se sim, busca opções pra selecionar no select 
    for (const alternatives of resultFields) {
        if (alternatives.tipo === 'int' && alternatives.tabela) {
            // Busca cadastros ativos e da unidade (se houver unidadeID na tabela)
            let sqlOptions = ``
            if (alternatives.tabela == 'fornecedor') {
                // sqlOptions = `
                // SELECT MAX(fornecedorID) AS id, nome, cnpj
                // FROM fornecedor
                // WHERE status >= 60 AND unidadeID = ${unidadeID}
                // GROUP BY cnpj
                // ORDER BY nome ASC`
            } else {
                sqlOptions = `
                SELECT ${alternatives.tabela}ID AS id, nome
                FROM ${alternatives.tabela} 
                WHERE status = 1 ${await hasUnidadeID(alternatives.tabela) ? ` AND unidadeID = ${unidadeID} ` : ``}
                ORDER BY nome ASC`
            }

            // Executar select e inserir no objeto alternatives
            const [resultOptions] = await db.promise().query(sqlOptions)
            alternatives.options = resultOptions
        }
    }

    return resultFields
}


//* Obtém estrutura dos blocos e itens
const getBlocks = async (id, parRecebimentoMpModeloID) => {
    const sqlBlocos = `
    SELECT * 
    FROM par_recebimentomp_modelo_bloco
    WHERE parRecebimentoMpModeloID = ? AND status = 1
    ORDER BY ordem ASC`
    const [resultBlocos] = await db.promise().query(sqlBlocos, [parRecebimentoMpModeloID])

    // Itens
    const sqlItem = `
    SELECT plmbi.*, i.*, a.nome AS alternativa,
	
        (SELECT lr.respostaID
        FROM recebimentomp_resposta AS lr 
        WHERE lr.recebimentoMpID = 1 AND lr.parRecebimentoMpModeloBlocoID = plmbi.parRecebimentoMpModeloBlocoID AND lr.itemID = plmbi.itemID
        LIMIT 1) AS respostaID,
        
        (SELECT lr.resposta
        FROM recebimentomp_resposta AS lr 
        WHERE lr.recebimentoMpID = 1 AND lr.parRecebimentoMpModeloBlocoID = plmbi.parRecebimentoMpModeloBlocoID AND lr.itemID = plmbi.itemID
        LIMIT 1) AS resposta,
        
        (SELECT lr.obs
        FROM recebimentomp_resposta AS lr 
        WHERE lr.recebimentoMpID = 1 AND lr.parRecebimentoMpModeloBlocoID = plmbi.parRecebimentoMpModeloBlocoID AND lr.itemID = plmbi.itemID
        LIMIT 1) AS observacao

    FROM par_recebimentomp_modelo_bloco_item AS plmbi
        LEFT JOIN item AS i ON (plmbi.itemID = i.itemID)
        LEFT JOIN alternativa AS a ON (i.alternativaID = a.alternativaID)
    WHERE plmbi.parRecebimentoMpModeloBlocoID = ? AND plmbi.status = 1
    ORDER BY plmbi.ordem ASC`
    for (const item of resultBlocos) {
        const [resultItem] = await db.promise().query(sqlItem, [id, id, id, item.parRecebimentoMpModeloBlocoID])

        // Obter alternativas para cada item 
        for (const item2 of resultItem) {

            // Cria objeto da resposta (se for de selecionar)
            if (item2?.respostaID > 0) {
                item2.resposta = {
                    id: item2.respostaID,
                    nome: item2.resposta
                }
            }

            const sqlAlternativa = `
            SELECT ai.alternativaItemID AS id, ai.nome
            FROM par_recebimentomp_modelo_bloco_item AS plmbi 
                JOIN item AS i ON (plmbi.itemID = i.itemID)
                JOIN alternativa AS a ON (i.alternativaID = a.alternativaID)
                JOIN alternativa_item AS ai ON (a.alternativaID = ai.alternativaID)
            WHERE plmbi.parRecebimentoMpModeloBlocoItemID = ?`
            const [resultAlternativa] = await db.promise().query(sqlAlternativa, [item2.parRecebimentoMpModeloBlocoItemID])
            item2.alternativas = resultAlternativa
        }

        item.itens = resultItem
    }

    return resultBlocos
}

const getSqlBloco = () => {
    const sql = `
    SELECT prbi.*, i.*, a.nome AS alternativa,

        (SELECT rr.respostaID
        FROM recebimentomp_resposta AS rr 
        WHERE rr.recebimentoMpID = ? AND rr.parRecebimentoMpModeloBlocoID = prbi.parRecebimentoMpModeloBlocoID AND rr.itemID = prbi.itemID) AS respostaID,

        (SELECT rr.resposta
        FROM recebimentomp_resposta AS rr 
        WHERE rr.recebimentoMpID = ? AND rr.parRecebimentoMpModeloBlocoID = prbi.parRecebimentoMpModeloBlocoID AND rr.itemID = prbi.itemID) AS resposta,

        (SELECT rr.obs
        FROM recebimentomp_resposta AS rr 
        WHERE rr.recebimentoMpID = ? AND rr.parRecebimentoMpModeloBlocoID = prbi.parRecebimentoMpModeloBlocoID AND rr.itemID = prbi.itemID) AS observacao

    FROM par_recebimentomp_modelo_bloco_item AS prbi 
        LEFT JOIN item AS i ON(prbi.itemID = i.itemID)
        LEFT JOIN alternativa AS a ON(i.alternativaID = a.alternativaID)
    WHERE prbi.parRecebimentoMpModeloBlocoID = ? AND prbi.status = 1
    ORDER BY prbi.ordem ASC`
    return sql
}

const getAlternativasSql = () => {
    const sql = `
    SELECT ai.alternativaItemID AS id, ai.nome
    FROM par_recebimentomp_modelo_bloco_item AS prbi 
    	JOIN item AS i ON (prbi.itemID = i.itemID)
        JOIN alternativa AS a ON(i.alternativaID = a.alternativaID)
        JOIN alternativa_item AS ai ON(a.alternativaID = ai.alternativaID)
    WHERE prbi.parRecebimentoMpModeloBlocoItemID = ? AND prbi.status = 1`
    return sql
}

const getSqlOtherInfos = () => {
    const sql = `
    SELECT obs, status
    FROM recebimentomp
    WHERE recebimentoMpID = ? `
    return sql
}

const checkNotificationFornecedor = async (recebimentoMpID, fornecedor, arrNaoConformidades, unidadeID, usuarioID, papelID, req) => {
    if (arrNaoConformidades.length === 0) return

    const arrProducts = []
    let needNotify = false
    for (const nc of arrNaoConformidades) {
        if (nc.fornecedorPreenche) {
            needNotify = true
            if (nc.produto && nc.produto.nome != '') arrProducts.push(nc.produto?.nome)
        }
    }

    if (needNotify) {
        // send axios post to api
        const data = {
            unidadeID: unidadeID,
            usuarioID: usuarioID,
            papelID: papelID,
            recebimentoMpID: recebimentoMpID,
            fornecedorID: fornecedor.id,
            isUser: fornecedor.isUser,
            products: arrProducts ?? []
        }

        //todo Arrumar...
        // const url = `${process.env.BASE_URL_API}formularios/recebimento-mp/nao-conformidade/fornecedor-preenche`
        // const result = await axios.post(url, data)

        //? Atualiza flag de envio de email
        const sqlUpdate = `UPDATE recebimentomp SET naoConformidadeEmailFornecedor = ? WHERE recebimentoMpID = ? `
        const [resultUpdate] = await db.promise().query(sqlUpdate, [1, recebimentoMpID])

        // const data = req.body
        console.log("🚀 ~ data do email:", data)

        // Dados unidade fabrica
        const sqlFabrica = `SELECT * FROM unidade WHERE unidadeID = ?`
        const [result] = await db.promise().query(sqlFabrica, [data.unidadeID])

        //Dados fornecedor
        const sqlFornecedor = `SELECT * FROM fornecedor WHERE fornecedorID = ?`
        const [resultFornecedor] = await db.promise().query(sqlFornecedor, [data.fornecedorID])

        const password = gerarSenhaCaracteresIniciais(resultFornecedor[0].cnpj, 4)

        //Dados profissional logado
        const sqlProfessional = `
        SELECT 
            a.nome,
            b.formacaoCargo AS cargo
        FROM profissional AS a 
            LEFT JOIN profissional_cargo AS b ON (a.profissionalID = b.profissionalID)
        WHERE a.profissionalID = ?`
        const [resultSqlProfessional] = await db.promise().query(sqlProfessional, [data.usuarioID])

        const values = {
            // Unidade Fbrica
            nomeFantasiaFabrica: result[0].nomeFantasia,

            // Unidade Fornecedor
            nomeFantasia: resultFornecedor[0].nome,
            razaoSocial: resultFornecedor[0].razaoSocial,
            cnpjFornecedor: resultFornecedor[0].cnpj,
            senhaFornecedor: password,

            // profissional que abriu formulario
            nomeProfissional: resultSqlProfessional[0]?.nome,
            cargoProfissional: resultSqlProfessional[0]?.cargo,

            // Outros
            unidadeID: data.unidadeID,
            usuarioID: data.usuarioID,
            papelID: data.papelID,
            fornecedorID: data.fornecedorID,
            stage: 's3',
            link: `${process.env.BASE_URL}/fornecedor?r=${data.recebimentoMpID}`,
            products: data.products

        }

        // Envia email para preencher não conformidade no recebimentoMp 
        const logID = await executeLog('Email para preencher não conformidade no recebimentoMp', data.usuarioID, data.unidadeID, req)
        const destinatario = resultFornecedor[0].email
        let assunto = `GEDagro - Prencher não conformidade `
        const html = await fornecedorPreenche(values);
        await sendMailConfig(destinatario, assunto, html, logID, values)

        // Novo fornecedor, envia email como dados de acesso
        if (!data.isUser) {
            const logID = await executeLog('Email e criação de novo fornecedor', data.usuarioID, data.unidadeID, req)

            // Verifica se CNPJ já está cadastrado
            const cnpjExists = "SELECT * FROM usuario WHERE cnpj = ?"
            const [resultCnpjExists] = await db.promise().query(cnpjExists, [resultFornecedor[0].cnpj])

            if (resultCnpjExists.length > 0) {
                return
            } else {
                // Cadastra novo usuário
                const sqlNewUuser = `
                INSERT INTO usuario(nome, cnpj, email, senha)
                VALUES(?, ?, ?, ?)`
                const usuarioID = await executeQuery(sqlNewUuser, [resultFornecedor[0].nome, resultFornecedor[0].cnpj, resultFornecedor[0].email, criptoMd5(password)], 'insert', 'usuario', 'usuarioID', null, logID)
                // return

                // Salva a unidade
                const sqlInsertUnity = `INSERT INTO unidade (razaoSocial, nomeFantasia, cnpj, email) VALUES (?,?, ?, ?)`
                const newUnidadeID = await executeQuery(sqlInsertUnity, [resultFornecedor[0].nome, resultFornecedor[0].nome, resultFornecedor[0].cnpj, data.email], 'insert', 'unidade', 'unidadeID', null, logID)

                // Salva usuario_unidade
                const sqlNewUserUnity = `
                INSERT INTO usuario_unidade(usuarioID, unidadeID, papelID)
                VALUES(?, ?, ?)`
                await executeQuery(sqlNewUserUnity, [usuarioID, newUnidadeID, 2], 'insert', 'usuario_unidade', 'usuarioUnidadeID', null, logID)

                let assunto = `Bem-vindo ao GEDagro`
                const html = await instructionsNewFornecedor(values)
                await sendMailConfig(destinatario, assunto, html, logID, values)
            }
        }

        // Atualiza tabela recebimentoMp
        const sqlUpdateRecebimentoMp = `UPDATE recebimentoMp SET naoConformidadeEmailFornecedor = 1 WHERE recebimentoMpID = ?`
        await db.promise().query(sqlUpdateRecebimentoMp, [data.recebimentoMpID])

    }

}

const insertNc = async (nc, id, logID) => {
    //? Atualiza colunas dinâmicas
    const arrayDynamicFields = []
    const arrayDynamicOptions = []
    const arrayDynamicValues = []
    if (nc.dynamicFields && nc.dynamicFields.length > 0) {
        for (const field of nc.dynamicFields) {
            arrayDynamicFields.push(`${field.nomeColuna}, `)
            arrayDynamicOptions.push(`?, `)
            arrayDynamicValues.push(field.value)
        }
    }

    const sqlInsertNaoConformidade = `
    INSERT INTO recebimentomp_naoconformidade(${arrayDynamicFields.join('')} parRecebimentoMpNaoConformidadeModeloID, recebimentoMpID, data, profissionalIDPreenchimento, tipo, produtoID, fornecedorPreenche, obsFornecedor, dataFornecedor, usuarioID, conclusao, dataConclusao, profissionalIDConclusao, status) VALUES (${arrayDynamicOptions.join('')} ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    nc.hora = nc.hora ? nc.hora : '00:00'
    nc.horaFornecedor = nc.horaFornecedor ? nc.horaFornecedor : '00:00'
    nc.horaConclusao = nc.horaConclusao ? nc.horaConclusao : '00:00'
    const dataInsert = [
        ...arrayDynamicValues,
        nc.parRecebimentoMpNaoConformidadeModeloID,
        id,
        nc.data ? nc.data.substring(0, 10) + ' ' + nc.hora : null,
        nc.profissionalPreenchimento?.id ? nc.profissionalPreenchimento?.id : null,
        nc.tipo ?? null,
        nc.produto?.id ? nc.produto?.id : null,
        nc.fornecedorPreenche ? '1' : '0',
        nc.obsFornecedor ?? null,
        nc.dataFornecedor ? nc.dataFornecedor.substring(0, 10) + ' ' + nc.horaFornecedor : null,
        nc.usuarioFornecedor?.id ? nc.usuarioFornecedor?.id : null,
        nc.conclusao ?? null,
        nc.dataConclusao ? nc.dataConclusao.substring(0, 10) + ' ' + nc.horaConclusao : null,
        nc.profissionalConclusao?.id ? nc.profissionalConclusao?.id : null,
        nc.status ?? null
    ]

    const resultInsertNaoConformidade = await executeQuery(sqlInsertNaoConformidade, dataInsert, 'insert', 'recebimentomp_naoconformidade', 'recebimentoMpNaoConformidadeID', null, logID)

    return true
}

const updateNc = async (nc, id, logID) => {

    //? Atualiza colunas dinâmicas
    const arrayDynamicFields = []
    const arrayDynamicValues = []
    if (nc.dynamicFields && nc.dynamicFields.length > 0) {
        for (const field of nc.dynamicFields) {
            arrayDynamicFields.push(`${field.nomeColuna} = ?, `)
            arrayDynamicValues.push(field.value)
        }
    }

    const sqlUpdateNaoConformidade = `
    UPDATE recebimentomp_naoconformidade
    SET 
        ${arrayDynamicFields.join('')}
        data = ?, 
        profissionalIDPreenchimento = ?, 
        tipo = ?, 
        produtoID = ?, 
        fornecedorPreenche = ?, 
        obsFornecedor = ?, 
        dataFornecedor = ?, 
        usuarioID = ?, 
        conclusao = ?, 
        dataConclusao = ?, 
        profissionalIDConclusao = ?, 
        status = ?
    WHERE recebimentoMpNaoConformidadeID = ? `
    nc.hora = nc.hora ? nc.hora : '00:00'
    nc.horaFornecedor = nc.horaFornecedor ? nc.horaFornecedor : '00:00'
    nc.horaConclusao = nc.horaConclusao ? nc.horaConclusao : '00:00'
    const dataUpdate = [
        ...arrayDynamicValues,
        nc.data ? nc.data.substring(0, 10) + ' ' + nc.hora : null,
        nc.profissionalPreenchimento?.id ? nc.profissionalPreenchimento?.id : null,
        nc.tipo ?? null,
        nc.produto?.id ? nc.produto?.id : null,
        nc.fornecedorPreenche ? '1' : '0',
        nc.obsFornecedor ?? null,
        nc.dataFornecedor ? nc.dataFornecedor.substring(0, 10) + ' ' + nc.horaFornecedor : null,
        nc.usuarioFornecedor?.id ? nc.usuarioFornecedor?.id : null,
        nc.conclusao ?? null,
        nc.dataConclusao ? nc.dataConclusao.substring(0, 10) + ' ' + nc.horaConclusao : null,
        nc.profissionalConclusao?.id ? nc.profissionalConclusao?.id : null,
        nc.status ?? null,
        nc.recebimentoMpNaoConformidadeID
    ]

    const resultUpdateNaoConformidade = await executeQuery(sqlUpdateNaoConformidade, dataUpdate, 'update', 'recebimentomp_naoconformidade', 'recebimentoMpNaoConformidadeID', nc.recebimentoMpNaoConformidadeID, logID)
}

module.exports = RecebimentoMpController;