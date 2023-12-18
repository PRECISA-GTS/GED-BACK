const db = require('../../../config/db');
const fs = require('fs');
const path = require('path');
require('dotenv/config')
const { addFormStatusMovimentation, formatFieldsToTable, hasUnidadeID } = require('../../../defaults/functions');

class RecebimentoMpController {
    async getList(req, res) {
        const { unidadeID } = req.params;

        if (!unidadeID) return res.status(400).json({ error: 'unidadeID não informado!' })

        const sql = `
        SELECT 
            l.recebimentoMpID AS id, 
            IF(MONTH(l.data) > 0, DATE_FORMAT(l.data, "%d/%m/%Y"), '--') AS data, 
            plm.nome AS modelo,
            p.nome AS profissional, 
            l.status
        FROM recebimentomp AS l
            JOIN par_recebimentomp_modelo AS plm ON (l.parRecebimentoMpModeloID = plm.parRecebimentoMpModeloID)
            LEFT JOIN profissional AS p ON (l.profissionalID = p.profissionalID)
        WHERE l.unidadeID = ?
        ORDER BY l.recebimentoMpID DESC, l.status ASC`
        const [result] = await db.promise().query(sql, [unidadeID])

        return res.json(result);
    }

    async getData(req, res) {
        const { id } = req.params;
        const { type, unidadeID } = req.body;

        if (!id || id == 'undefined') return res.json({ message: 'Erro ao listar recebimento de MP!' })

        //? Obtém o modelo do formulário
        const sql = `
        SELECT parRecebimentoMpModeloID
        FROM recebimentomp 
        WHERE recebimentoMpID = ?`
        const [result] = await db.promise().query(sql, [id])

        //? Fields do header
        const resultFields = await getFields(result[0].parRecebimentoMpModeloID, unidadeID)

        // Varre fields, verificando se há tipo == 'int', se sim, busca opções pra selecionar no select 
        for (const alternatives of resultFields) {
            if (alternatives.tipo === 'int' && alternatives.tabela) {
                // Busca cadastros ativos e da unidade (se houver unidadeID na tabela)
                const sqlOptions = `
                SELECT ${alternatives.tabela}ID AS id, nome
                FROM ${alternatives.tabela} 
                WHERE status = 1 ${await hasUnidadeID(alternatives.tabela) ? ` AND unidadeID = ${unidadeID} ` : ``}
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
        let sqlData = ``
        if (type == 'edit') {
            for (const field of resultFields) {
                if (field.tabela) {
                    // Monta objeto pra preencher select 
                    // Ex.: profissional:{
                    //     id: 1,
                    //     nome: 'Fulano'
                    // }
                    sqlData = `
                    SELECT t.${field.nomeColuna} AS id, t.nome ${field.tabela == 'fornecedor' ? `, t.cnpj` : ``}
                    FROM recebimentomp AS l
                        JOIN ${field.tabela} AS t ON (l.${field.nomeColuna} = t.${field.nomeColuna}) 
                    WHERE l.recebimentoMpID = ${id}`

                    let [temp] = await db.promise().query(sqlData)
                    if (temp) {
                        field[field.tabela] = temp[0]
                    }
                } else {
                    const sqlFieldData = `SELECT ${field.nomeColuna} AS coluna FROM recebimentomp WHERE recebimentoMpID = ? `;
                    let [resultFieldData] = await db.promise().query(sqlFieldData, [id])
                    field[field.nomeColuna] = resultFieldData[0].coluna
                }
            }
        }

        // Dados (linhas)
        if (type == 'edit') {
            //? Blocos 
            const resultBlocos = await getBlocks(id, result[0].parRecebimentoMpModeloID)

            // Observação e status
            let resultOtherInformations = null
            if (type == 'edit') {
                const sqlOtherInformations = `
                SELECT obs, status
                FROM recebimentomp
                WHERE recebimentoMpID = ?`
                const [temp] = await db.promise().query(sqlOtherInformations, [id])
                resultOtherInformations = temp[0]
            }

            const data = {
                fields: resultFields,
                blocos: resultBlocos,
                info: {
                    obs: resultOtherInformations?.obs,
                    status: resultOtherInformations?.status,
                }
            }

            res.status(200).json(data);
        }
    }

    async updateData(req, res) {
        const { id } = req.params
        const data = req.body.form
        const { usuarioID, papelID, unidadeID } = req.body.auth

        if (!id || id == 'undefined') { return res.json({ message: 'ID não recebido!' }); }

        const sqlStatus = `SELECT status FROM recebimentomp WHERE recebimentoMpID = ?`
        const [resultStatus] = await db.promise().query(sqlStatus, [id])

        // Header         
        let dataHeader
        if (data.fields) {
            //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
            dataHeader = await formatFieldsToTable('par_recebimentomp', data.fields)
            const sqlHeader = `UPDATE recebimentomp SET ? WHERE recebimentoMpID = ${id}`;
            const [resultHeader] = await db.promise().query(sqlHeader, [dataHeader])
            if (resultHeader.length === 0) { return res.status(500).json('Error'); }
        }

        // Blocos 
        for (const bloco of data.blocos) {
            if (bloco && bloco.parRecebimentoMpModeloBlocoID && bloco.parRecebimentoMpModeloBlocoID > 0) {
                // Itens 
                for (const item of bloco.itens) {
                    if (item && item.itemID && item.itemID > 0) {
                        if (item.resposta || item.observacao) {
                            // Verifica se já existe registro em fornecedor_resposta, com o fornecedorID, parFornecedorBlocoID e itemID, se houver, faz update, senao faz insert 
                            const sqlVerificaResposta = `SELECT * FROM recebimentomp_resposta WHERE recebimentoMpID = ? AND parRecebimentoMpModeloBlocoID = ? AND itemID = ?`
                            const [resultVerificaResposta] = await db.promise().query(sqlVerificaResposta, [id, bloco.parRecebimentoMpModeloBlocoID, item.itemID])

                            const resposta = item.resposta?.id > 0 ? item.resposta.nome : item.resposta ? item.resposta : ''
                            const respostaID = item.resposta?.id > 0 ? item.resposta.id : null
                            const observacao = item.observacao != undefined ? item.observacao : ''

                            if (resultVerificaResposta.length === 0) {
                                // insert na tabela fornecedor_resposta
                                const sqlInsert = `INSERT INTO recebimentomp_resposta (recebimentoMpID, parRecebimentoMpModeloBlocoID, itemID, resposta, respostaID, obs) VALUES (?, ?, ?, ?, ?, ?)`
                                const [resultInsert] = await db.promise().query(sqlInsert, [
                                    id,
                                    bloco.parRecebimentoMpModeloBlocoID,
                                    item.itemID,
                                    resposta,
                                    respostaID,
                                    observacao,
                                ])
                                if (resultInsert.length === 0) { return res.status(500).json('Error'); }
                            } else {
                                // update na tabela fornecedor_resposta
                                const sqlUpdate = `
                                UPDATE 
                                    recebimentomp_resposta 
                                SET resposta = ?,
                                    respostaID = ?,
                                    obs = ?,
                                    recebimentoMpID = ?
                                WHERE recebimentoMpID = ? 
                                    AND parRecebimentoMpModeloBlocoID = ? 
                                    AND itemID = ?`
                                const [resultUpdate] = await db.promise().query(sqlUpdate, [
                                    resposta,
                                    respostaID,
                                    observacao,
                                    id,
                                    id,
                                    bloco.parRecebimentoMpModeloBlocoID,
                                    item.itemID
                                ])
                                if (resultUpdate.length === 0) { return res.json('Error'); }
                            }
                        }
                    }
                }
            }
        }

        // Observação
        const sqlUpdateObs = `UPDATE recebimentomp SET obs = ?, obsConclusao = ? WHERE recebimentoMpID = ? `
        const [resultUpdateObs] = await db.promise().query(sqlUpdateObs, [data.info?.obs, data?.obsConclusao, id])
        if (resultUpdateObs.length === 0) { return res.json('Error'); }

        //* Status
        //? 10->Pendente (ainda não concluiu) 50->Reprovado 60->Aprovado Parcial 70->Aprovado	
        const newStatus = data.status > 30 ? data.status : 30

        const sqlUpdateStatus = `UPDATE recebimentomp SET status = ? WHERE recebimentoMpID = ? `
        const [resultUpdateStatus] = await db.promise().query(sqlUpdateStatus, [newStatus, id])

        //? Gera histórico de alteração de status (se houve alteração)
        if (resultStatus[0]['status'] != newStatus) {
            const movimentation = await addFormStatusMovimentation(2, id, usuarioID, unidadeID, papelID, resultStatus[0]['status'] ?? '0', newStatus, data?.obsConclusao)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }
        }

        //* Verifica se está concluindo e se irá gerar uma não conformidade
        // if ((newStatus == 50 || newStatus == 60) && data.naoConformidade && dataHeader.fornecedorID > 0) {
        //     const sqlNC = `INSERT INTO recebimentomp_naoconformidade (recebimentoMpID, fornecedorID, unidadeID, status, dataCadastro) VALUES (?, ?, ?, ?, ?)`
        //     const [resultNC] = await db.promise().query(sqlNC, [id, dataHeader.fornecedorID, unidadeID, 10, new Date()])
        //     const recebimentompNaoconformidadeID = resultNC.insertId //? ID da não conformidade gerada

        //     const movimentation = await addFormStatusMovimentation(3, recebimentompNaoconformidadeID, usuarioID, unidadeID, papelID, '0', '30', data?.obsConclusao)
        //     if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

        //     //? Retorna com o id da não conformidade pra já redirecionar pra não conformidade gerada
        //     return res.status(200).json({
        //         naoConformidade: true,
        //         id: recebimentompNaoconformidadeID
        //     })
        // }

        res.status(200).json({})

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

module.exports = RecebimentoMpController;