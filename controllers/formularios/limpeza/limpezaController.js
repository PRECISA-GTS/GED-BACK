const db = require('../../../config/db');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv/config')
const { addFormStatusMovimentation, formatFieldsToTable, hasUnidadeID, createScheduling } = require('../../../defaults/functions');
const { hasPending, deleteItem, criptoMd5, onlyNumbers, gerarSenha, gerarSenhaCaracteresIniciais, removeSpecialCharts } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');
const { send } = require('process');
const fornecedorPreenche = require('../../../email/template/recebimentoMP/naoConformidade/fornecedorPreenche');
const sendMailConfig = require('../../../config/email');

class LimpezaController {
    async getList(req, res) {
        const { unidadeID, papelID, usuarioID } = req.params;

        if (!unidadeID) return res.status(400).json({ error: 'unidadeID não informado!' })

        const sql = `
        SELECT 
            l.limpezaID AS id, 
            IF(MONTH(l.data) > 0, DATE_FORMAT(l.data, "%d/%m/%Y"), '--') AS data, 
            plm.nome AS modelo,
            IF(p.nome <> '', p.nome, '--') AS profissional, 
            s.statusID,
            s.nome AS status,
            s.cor,
            l.concluido
        FROM limpeza AS l
            JOIN par_limpeza_modelo AS plm ON (l.parLimpezaModeloID = plm.parLimpezaModeloID)
            JOIN status AS s ON (l.status = s.statusID)
            LEFT JOIN profissional AS p ON (l.preencheProfissionalID = p.profissionalID)
        WHERE l.unidadeID = ?
        ORDER BY l.limpezaID DESC, l.status ASC`

        const [result] = await db.promise().query(sql, [unidadeID])
        return res.json(result);
    }

    async getModels(req, res) {
        const { unidadeID } = req.params;

        const sql = `
        SELECT a.parLimpezaModeloID AS id, a.nome, a.ciclo, a.cabecalho
        FROM par_limpeza_modelo AS a 
        WHERE a.unidadeID = ? AND a.status = 1 
        ORDER BY a.nome ASC`
        const [result] = await db.promise().query(sql, [unidadeID])

        return res.status(200).json(result)
    }

    async insertData(req, res) {
        const data = req.body

        if (!data.model.id || !data.unidadeID) return res.status(400).json({ message: 'Erro ao inserir formulário!' })

        const logID = await executeLog('Criação de formulário de limpeza', data.usuarioID, data.unidadeID, req)

        const sqlInsert = `INSERT INTO limpeza SET parLimpezaModeloID = ?, data = ?, dataInicio = ?, abreProfissionalID = ?, unidadeID = ?`
        const limpezaID = await executeQuery(sqlInsert, [
            data.model.id,
            new Date(),
            new Date(),
            data.profissionalID,
            data.unidadeID
        ], 'insert', 'limpeza', 'limpezaID', null, logID)

        return res.status(200).json({ limpezaID })
    }

    async getData(req, res) {
        try {
            const { id } = req.params; // id do formulário
            const { unidadeID, profissionalID } = req.body;

            if (!id || id == 'undefined') { return res.json({ message: 'Erro ao listar formulário!' }) }

            const sqlResult = `
            SELECT
                r.parLimpezaModeloID,
                prm.nome AS modeloNome,
                prm.ciclo AS modeloCiclo,

                r.unidadeID,
                DATE_FORMAT(r.dataInicio, '%Y-%m-%d') AS dataInicio,
                DATE_FORMAT(r.dataInicio, '%H:%i') AS horaInicio,
                r.abreProfissionalID,
                pa.nome AS abreProfissionalNome,
                r.concluido,

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
            FROM limpeza AS r
                LEFT JOIN unidade AS u ON(r.unidadeID = u.unidadeID)
                LEFT JOIN profissional AS pa ON(r.abreProfissionalID = pa.profissionalID)
                LEFT JOIN profissional AS pp ON(r.preencheProfissionalID = pp.profissionalID)
                LEFT JOIN profissional AS pap ON(r.aprovaProfissionalID = pap.profissionalID)
                LEFT JOIN profissional AS pf ON(r.finalizaProfissionalID = pf.profissionalID)
                LEFT JOIN par_limpeza_modelo AS prm ON (prm.parLimpezaModeloID = r.parLimpezaModeloID)
            WHERE r.limpezaID = ? `
            const [result] = await db.promise().query(sqlResult, [id])

            const unidade = {
                modelo: {
                    id: result[0].parLimpezaModeloID ?? 0,
                    nome: result[0]['modeloNome'],
                    ciclo: result[0]['modeloCiclo']
                },
                unidadeID: result[0]['unidadeID'],
                nomeFantasia: result[0]['nomeFantasia'],
                cnpj: result[0]['cnpj']
            }
            const modeloID = result[0]['parLimpezaModeloID']

            // Fields do header
            const sqlFields = `
            SELECT *
            FROM par_limpeza AS pr
                LEFT JOIN par_limpeza_modelo_cabecalho AS prmc ON(pr.parlimpezaID = prmc.parlimpezaID)
            WHERE prmc.parLimpezaModeloID = ?
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
                    FROM limpeza AS r
                        JOIN ${field.tabela} AS t ON(r.${field.nomeColuna} = t.${field.nomeColuna}) 
                    WHERE r.limpezaID = ${id} `
                    let [temp] = await db.promise().query(sqlFieldData)
                    if (temp) {
                        field[field.tabela] = temp[0]
                    }
                } else {
                    const sqlFieldData = `SELECT ${field.nomeColuna} AS coluna FROM limpeza WHERE limpezaID = ? `;
                    let [resultFieldData] = await db.promise().query(sqlFieldData, [id])
                    field[field.nomeColuna] = resultFieldData[0].coluna ?? ''
                }
            }

            const sqlBlocos = `
            SELECT *
            FROM par_limpeza_modelo_bloco
            WHERE parLimpezaModeloID = ? AND status = 1
            ORDER BY ordem ASC`
            const [resultBlocos] = await db.promise().query(sqlBlocos, [modeloID])

            //? Blocos
            const sqlBloco = getSqlBloco()
            for (const bloco of resultBlocos) {
                const [resultBloco] = await db.promise().query(sqlBloco, [id, id, id, bloco.parLimpezaModeloBlocoID])

                //? Itens
                for (const item of resultBloco) {
                    const sqlAlternativa = getAlternativasSql()
                    const [resultAlternativa] = await db.promise().query(sqlAlternativa, [item['parLimpezaModeloBlocoItemID']])
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
                            WHERE ab.limpezaID = ? AND ab.parLimpezaModeloBlocoID = ? AND ab.itemOpcaoAnexoID = ? `
                            const [resultArquivosAnexadosResposta] = await db.promise().query(sqlArquivosAnexadosResposta, [id, bloco.parLimpezaModeloBlocoID, respostaAnexo.itemOpcaoAnexoID])

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
            WHERE m.parFormularioID = 4 AND m.id = ?
            ORDER BY m.movimentacaoFormularioID DESC 
            LIMIT 1`
            const [resultLastMovimentation] = await db.promise().query(sqlLastMovimentation, [id])

            //? Cabeçalho do modelo do formulário 
            const sqlCabecalhoModelo = `
            SELECT cabecalho
            FROM par_limpeza_modelo
            WHERE parLimpezaModeloID = ? `
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
                blocos: resultBlocos ?? [],
                ultimaMovimentacao: resultLastMovimentation[0] ?? null,
                info: {
                    obs: resultOtherInformations[0].obs,
                    status: resultOtherInformations[0].status,
                    concluido: result[0].concluido == 1 ? true : false,
                    cabecalhoModelo: resultCabecalhoModelo[0].cabecalho
                },
                link: `${process.env.BASE_URL}formularios/limpeza?id=${id}`
            }

            res.status(200).json(data);
        } catch (error) {
            console.log(error)
        }
    }

    async updateData(req, res) {
        const { id } = req.params
        const data = req.body.form
        console.log("🚀 ~ data:", data)
        const { usuarioID, profissionalID, papelID, unidadeID } = req.body.auth


        try {
            if (!id || id == 'undefined') { return res.json({ message: 'ID não recebido!' }); }

            const logID = await executeLog('Edição formulário de limpeza', usuarioID, unidadeID, req)

            const sqlSelect = `SELECT status FROM limpeza WHERE limpezaID = ? `
            const [result] = await db.promise().query(sqlSelect, [id])

            //? Atualiza header e footer fixos
            const sqlStaticlHeader = `
            UPDATE limpeza SET data = ?, preencheProfissionalID = ?, dataConclusao = ?, aprovaProfissionalID = ?
            WHERE limpezaID = ? `
            const resultStaticHeader = await executeQuery(sqlStaticlHeader, [
                data.fieldsHeader?.data ? `${data?.fieldsHeader?.data} ${data?.fieldsHeader?.hora}` : null,
                data.fieldsHeader?.profissional?.id ?? null,
                data.fieldsFooter?.dataConclusao ? `${data.fieldsFooter.dataConclusao} ${data.fieldsFooter.horaConclusao} ` : null,
                data.fieldsFooter?.profissional?.id ?? null,
                id
            ], 'update', 'limpeza', 'limpezaID', id, logID)

            //? Atualizar o header dinâmico e setar o status        
            if (data.fields) {
                //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
                let dataHeader = await formatFieldsToTable('par_limpeza', data.fields)
                const sqlHeader = `UPDATE limpeza SET ? WHERE limpezaID = ${id} `;
                const resultHeader = await executeQuery(sqlHeader, [dataHeader], 'update', 'limpeza', 'limpezaID', id, logID)
                if (resultHeader.length === 0) { return res.status(500).json('Error'); }
            }

            //? Blocos 
            for (const bloco of data.blocos) {
                // Itens 
                if (bloco && bloco.parLimpezaModeloBlocoID && bloco.parLimpezaModeloBlocoID > 0 && bloco.itens) {
                    for (const item of bloco.itens) {
                        if (item && item.itemID && item.itemID > 0) {
                            // Verifica se já existe registro em recebimentomp_resposta, com o limpezaID, parLimpezaModeloBlocoID e itemID, se houver, faz update, senao faz insert 
                            const sqlVerificaResposta = `SELECT * FROM limpeza_resposta WHERE limpezaID = ? AND parLimpezaModeloBlocoID = ? AND itemID = ? `
                            const [resultVerificaResposta] = await db.promise().query(sqlVerificaResposta, [id, bloco.parLimpezaModeloBlocoID, item.itemID])

                            const resposta = item.resposta && item.resposta.nome ? item.resposta.nome : item.resposta
                            const respostaID = item.resposta && item.resposta.id > 0 ? item.resposta.id : null
                            const observacao = item.observacao != undefined ? item.observacao : ''

                            if (resposta && resultVerificaResposta.length === 0) {
                                const sqlInsert = `INSERT INTO limpeza_resposta(limpezaID, parLimpezaModeloBlocoID, itemID, resposta, respostaID, obs) VALUES(?, ?, ?, ?, ?, ?)`
                                const resultInsert = await executeQuery(sqlInsert, [
                                    id,
                                    bloco.parLimpezaModeloBlocoID,
                                    item.itemID,
                                    resposta,
                                    respostaID,
                                    observacao
                                ], 'insert', 'limpeza_resposta', 'limpezaRespostaID', null, logID)

                                if (!resultInsert) { return res.json('Error'); }
                            } else if (resposta && resultVerificaResposta.length > 0) {
                                const sqlUpdate = `
                                UPDATE limpeza_resposta 
                                SET resposta = ?, respostaID = ?, obs = ?, limpezaID = ?
                                WHERE limpezaID = ? AND parLimpezaModeloBlocoID = ? AND itemID = ? `
                                const resultUpdate = await executeQuery(sqlUpdate, [
                                    resposta,
                                    respostaID,
                                    observacao,
                                    id,
                                    id,
                                    bloco.parLimpezaModeloBlocoID,
                                    item.itemID
                                ], 'update', 'limpeza_resposta', 'limpezaID', id, logID)
                                if (!resultUpdate) { return res.json('Error'); }
                            }
                            else if (!resposta) {
                                const sqlDelete = `DELETE FROM limpeza_resposta WHERE limpezaID = ? AND parLimpezaModeloBlocoID = ? AND itemID = ? `
                                const resultDelete = await executeQuery(sqlDelete, [id, bloco.parLimpezaModeloBlocoID, item.itemID], 'delete', 'limpeza_resposta', 'limpezaID', id, logID)
                            }
                        }
                    }
                }
            } // laço blocos..

            // Observação
            const sqlUpdateObs = `UPDATE limpeza SET obs = ?, obsConclusao = ? WHERE limpezaID = ? `
            const resultUpdateObs = await executeQuery(sqlUpdateObs, [data.info?.obs, data?.obsConclusao, id], 'update', 'limpeza', 'limpezaID', id, logID)
            if (!resultUpdateObs) { return res.json('Error'); }

            //* Status
            const newStatus = data.info.status < 30 ? 30 : data.info.status
            //* Fecha formulário se status >= 40
            const concluido = data.info.status >= 40 ? '1' : '0'

            const sqlUpdateStatus = `UPDATE limpeza SET status = ?, dataFim = ?, finalizaProfissionalID = ?, concluido = ? WHERE limpezaID = ? `
            const resultUpdateStatus = await executeQuery(sqlUpdateStatus, [
                newStatus,
                newStatus >= 40 ? new Date() : null,
                newStatus >= 40 ? profissionalID : null,
                concluido,
                id
            ], 'update', 'limpeza', 'limpezaID', id, logID)

            //? Gera histórico de alteração de status (se houve alteração)
            if (result[0]['status'] != newStatus) {
                const movimentation = await addFormStatusMovimentation(4, id, usuarioID, unidadeID, papelID, result[0]['status'] ?? '0', newStatus, data?.obsConclusao)
                if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }
            }

            //? Cria agendamento no calendário com a data de vencimento
            if (concluido == '1' && newStatus >= 40) {
                createScheduling(id, 'limpeza', data.unidade?.modelo?.nome, data?.fieldsHeader?.profissional?.nome, data.unidade?.modelo?.ciclo, unidadeID)
            }

            res.status(200).json({ message: 'Dados atualizados!' })

        } catch (error) {
            console.log({ error, message: 'Erro ao atualizar os dados!' })
        }
    }

    //* Salva os anexos do formulário na pasta uploads/anexo e insere os dados na tabela anexo
    async saveAnexo(req, res) {
        try {
            const { id } = req.params;
            const pathDestination = req.pathDestination
            const files = req.files; //? Array de arquivos

            const { usuarioID, unidadeID, parLimpezaModeloBlocoID, itemOpcaoAnexoID } = req.body;

            //? Verificar se há arquivos enviados
            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }
            const logID = await executeLog('Salvo anexo do formulário de limpeza', usuarioID, unidadeID, req)

            let result = []
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                //? Insere em anexo
                const sqlInsert = `INSERT INTO anexo(titulo, diretorio, arquivo, tamanho, tipo, usuarioID, unidadeID, dataHora) VALUES(?,?,?,?,?,?,?,?)`;
                const anexoID = await executeQuery(sqlInsert, [
                    removeSpecialCharts(file.originalname),
                    pathDestination,
                    file.filename,
                    file.size,
                    file.mimetype,
                    usuarioID,
                    unidadeID,
                    new Date()
                ], 'insert', 'anexo', 'anexoID', null, logID)

                //? Insere em anexo_busca
                const sqlInsertBusca = `INSERT INTO anexo_busca(anexoID, limpezaID, parLimpezaModeloBlocoID, itemOpcaoAnexoID) VALUES(?,?,?,?)`;
                await executeQuery(sqlInsertBusca, [
                    anexoID,
                    id,
                    parLimpezaModeloBlocoID ?? null,
                    itemOpcaoAnexoID ?? null
                ], 'insert', 'anexo_busca', 'anexoBuscaID', null, logID)

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
            const pathFile = `uploads/${unidadeID}/limpeza/${folder}/`
            const previousFile = path.resolve(pathFile, resultCurrentFile);
            fs.unlink(previousFile, (error) => {
                if (error) {
                    return console.error('Erro ao remover o anexo:', error);
                } else {
                    return console.log('Anexo removido com sucesso!');
                }
            });
        }

        const logID = await executeLog('Remoção de anexo do formulário de limpeza', usuarioID, unidadeID, req)

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
            table: ['limpeza', 'limpeza_resposta'],
            column: 'limpezaID'
        }

        const arrPending = []

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão anexo no formulário de limpeza', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão anexo no formulário de limpeza', usuarioID, unidadeID, req)
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
}

//* Obtém colunas
// const getFields = async (parLimpezaModeloID, unidadeID) => {
//     const sqlFields = `
//     SELECT * 
//     FROM par_recebimentomp AS pl
//         JOIN par_limpeza_modelo_cabecalho AS plmc ON (plmc.parlimpezaID = pl.parlimpezaID)
//         JOIN par_limpeza_modelo AS plm ON (plm.parLimpezaModeloID = plmc.parLimpezaModeloID)
//     WHERE plm.parLimpezaModeloID = ?`
//     const [resultFields] = await db.promise().query(sqlFields, [parLimpezaModeloID])
//     if (resultFields.length === 0) { return res.json({ message: 'Nenhum campo encontrado' }) }

//     // Varre fields, verificando se há tipo == 'int', se sim, busca opções pra selecionar no select 
//     for (const alternatives of resultFields) {
//         if (alternatives.tipo === 'int' && alternatives.tabela) {
//             // Busca cadastros ativos e da unidade (se houver unidadeID na tabela)
//             let sqlOptions = ``
//             if (alternatives.tabela == 'fornecedor') {
//                 // sqlOptions = `
//                 // SELECT MAX(fornecedorID) AS id, nome, cnpj
//                 // FROM fornecedor
//                 // WHERE status >= 60 AND unidadeID = ${unidadeID}
//                 // GROUP BY cnpj
//                 // ORDER BY nome ASC`
//             } else {
//                 sqlOptions = `
//                 SELECT ${alternatives.tabela}ID AS id, nome
//                 FROM ${alternatives.tabela} 
//                 WHERE status = 1 ${await hasUnidadeID(alternatives.tabela) ? ` AND unidadeID = ${unidadeID} ` : ``}
//                 ORDER BY nome ASC`
//             }

//             // Executar select e inserir no objeto alternatives
//             const [resultOptions] = await db.promise().query(sqlOptions)
//             alternatives.options = resultOptions
//         }
//     }

//     return resultFields
// }

//* Obtém estrutura dos blocos e itens
// const getBlocks = async (id, parLimpezaModeloID) => {
//     const sqlBlocos = `
//     SELECT * 
//     FROM par_limpeza_modelo_bloco
//     WHERE parLimpezaModeloID = ? AND status = 1
//     ORDER BY ordem ASC`
//     const [resultBlocos] = await db.promise().query(sqlBlocos, [parLimpezaModeloID])

//     // Itens
//     const sqlItem = `
//     SELECT plmbi.*, i.*, a.nome AS alternativa,

//         (SELECT lr.respostaID
//         FROM recebimentomp_resposta AS lr 
//         WHERE lr.limpezaID = 1 AND lr.parLimpezaModeloBlocoID = plmbi.parLimpezaModeloBlocoID AND lr.itemID = plmbi.itemID
//         LIMIT 1) AS respostaID,

//         (SELECT lr.resposta
//         FROM recebimentomp_resposta AS lr 
//         WHERE lr.limpezaID = 1 AND lr.parLimpezaModeloBlocoID = plmbi.parLimpezaModeloBlocoID AND lr.itemID = plmbi.itemID
//         LIMIT 1) AS resposta,

//         (SELECT lr.obs
//         FROM recebimentomp_resposta AS lr 
//         WHERE lr.limpezaID = 1 AND lr.parLimpezaModeloBlocoID = plmbi.parLimpezaModeloBlocoID AND lr.itemID = plmbi.itemID
//         LIMIT 1) AS observacao

//     FROM par_limpeza_modelo_bloco_item AS plmbi
//         LEFT JOIN item AS i ON (plmbi.itemID = i.itemID)
//         LEFT JOIN alternativa AS a ON (i.alternativaID = a.alternativaID)
//     WHERE plmbi.parLimpezaModeloBlocoID = ? AND plmbi.status = 1
//     ORDER BY plmbi.ordem ASC`
//     for (const item of resultBlocos) {
//         const [resultItem] = await db.promise().query(sqlItem, [id, id, id, item.parLimpezaModeloBlocoID])

//         // Obter alternativas para cada item 
//         for (const item2 of resultItem) {

//             // Cria objeto da resposta (se for de selecionar)
//             if (item2?.respostaID > 0) {
//                 item2.resposta = {
//                     id: item2.respostaID,
//                     nome: item2.resposta
//                 }
//             }

//             const sqlAlternativa = `
//             SELECT ai.alternativaItemID AS id, ai.nome
//             FROM par_limpeza_modelo_bloco_item AS plmbi 
//                 JOIN item AS i ON (plmbi.itemID = i.itemID)
//                 JOIN alternativa AS a ON (i.alternativaID = a.alternativaID)
//                 JOIN alternativa_item AS ai ON (a.alternativaID = ai.alternativaID)
//             WHERE plmbi.parRecebimentoMpModeloBlocoItemID = ?`
//             const [resultAlternativa] = await db.promise().query(sqlAlternativa, [item2.parRecebimentoMpModeloBlocoItemID])
//             item2.alternativas = resultAlternativa
//         }

//         item.itens = resultItem
//     }

//     return resultBlocos
// }

const getSqlBloco = () => {
    const sql = `
    SELECT prbi.*, i.*, a.nome AS alternativa,

        (SELECT rr.respostaID
        FROM limpeza_resposta AS rr 
        WHERE rr.limpezaID = ? AND rr.parLimpezaModeloBlocoID = prbi.parLimpezaModeloBlocoID AND rr.itemID = prbi.itemID) AS respostaID,

        (SELECT rr.resposta
        FROM limpeza_resposta AS rr 
        WHERE rr.limpezaID = ? AND rr.parLimpezaModeloBlocoID = prbi.parLimpezaModeloBlocoID AND rr.itemID = prbi.itemID) AS resposta,

        (SELECT rr.obs
        FROM limpeza_resposta AS rr 
        WHERE rr.limpezaID = ? AND rr.parLimpezaModeloBlocoID = prbi.parLimpezaModeloBlocoID AND rr.itemID = prbi.itemID) AS observacao

    FROM par_limpeza_modelo_bloco_item AS prbi 
        LEFT JOIN item AS i ON(prbi.itemID = i.itemID)
        LEFT JOIN alternativa AS a ON(i.alternativaID = a.alternativaID)
    WHERE prbi.parLimpezaModeloBlocoID = ? AND prbi.status = 1
    ORDER BY prbi.ordem ASC`
    return sql
}

const getAlternativasSql = () => {
    const sql = `
    SELECT ai.alternativaItemID AS id, ai.nome
    FROM par_limpeza_modelo_bloco_item AS prbi 
    	JOIN item AS i ON (prbi.itemID = i.itemID)
        JOIN alternativa AS a ON(i.alternativaID = a.alternativaID)
        JOIN alternativa_item AS ai ON(a.alternativaID = ai.alternativaID)
    WHERE prbi.parLimpezaModeloBlocoItemID = ? AND prbi.status = 1`
    return sql
}

const getSqlOtherInfos = () => {
    const sql = `
    SELECT obs, status
    FROM limpeza
    WHERE limpezaID = ? `
    return sql
}

module.exports = LimpezaController;