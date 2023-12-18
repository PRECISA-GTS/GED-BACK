const db = require('../../../config/db');
const { hasPending, deleteItem } = require('../../../config/defaultConfig');
const { addFormStatusMovimentation, formatFieldsToTable, hasUnidadeID } = require('../../../defaults/functions');

class RecebimentoMpController {
    async getList(req, res) {
        const { unidadeID } = req.params;
        const sql = `
        SELECT 
            rm.recebimentompID AS id, 
            IF(MONTH(rm.data) > 0, DATE_FORMAT(rm.data, "%d/%m/%Y"), '--') AS data, 
            IF(f.nome <> '', f.nome, '--') AS fornecedor, 
            IF(f.cnpj <> '', f.cnpj, '--') AS cnpj,
            (SELECT COUNT(*)
            FROM recebimentomp_produto AS rp 
            WHERE rp.recebimentompID = rm.recebimentompID) AS totalProdutos,
            e.nome AS status,
            e.cor
        FROM recebimentomp AS rm
            LEFT JOIN fornecedor AS f ON (rm.fornecedorID = f.fornecedorID)
            LEFT JOIN status as e ON (rm.status = e.statusID)
        WHERE rm.unidadeID = ?
        ORDER BY rm.recebimentompID DESC, e.nome ASC`
        const [result] = await db.promise().query(sql, [unidadeID])

        res.status(200).json(result)
    }

    async getNewData(req, res) {
        const { unidadeID } = req.body;

        //? Fields do header
        const resultFields = await getFields(unidadeID)
        //? Fields dos Produtos (colunas)
        const resultFieldsProducts = await getFieldsProduct(unidadeID)
        //? Blocos 
        const resultBlocos = await getBlocks(0, unidadeID)

        const data = {
            fields: resultFields,
            fieldsProduct: resultFieldsProducts,
            products: [{}], //? Inicia com 1 produto aberto
            blocos: resultBlocos,
            info: {
                obs: null,
                status: null,
            }
        }

        res.status(200).json(data);
    }

    async getData(req, res) {
        const { id } = req.params;
        const { type, unidadeID } = req.body;

        if (!id || id == 'undefined') { return res.json({ message: 'Erro ao listar recebimento' }) }

        //? Fields do header
        const resultFields = await getFields(unidadeID)

        // Varre fields, verificando se há tipo == 'int', se sim, busca opções pra selecionar no select 
        for (const alternatives of resultFields) {
            if (alternatives.tipo === 'int' && alternatives.tabela) {
                // Busca cadastros ativos e da unidade (se houver unidadeID na tabela)
                let sqlOptions = ``
                if (alternatives.tabela == 'fornecedor') { //? Fornecedor: busca aprovados e com a avaliação mais recente
                    sqlOptions = `
                    SELECT MAX(fornecedorID) AS id, nome, cnpj
                    FROM fornecedor
                    WHERE status >= 60 AND unidadeID = ${unidadeID}
                    GROUP BY cnpj
                    ORDER BY nome ASC`
                } else {                                   //? Não é fornecedor: busca ativos e da unidade
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
                    FROM recebimentomp AS rm 
                        JOIN ${field.tabela} AS t ON (rm.${field.nomeColuna} = t.${field.nomeColuna}) 
                    WHERE rm.recebimentompID = ${id}`

                    let [temp] = await db.promise().query(sqlData)
                    if (temp) {
                        field[field.tabela] = temp[0]
                    }
                } else {
                    const sqlFieldData = `SELECT ${field.nomeColuna} AS coluna FROM recebimentomp WHERE recebimentompID = ? `;
                    let [resultFieldData] = await db.promise().query(sqlFieldData, [id])
                    field[field.nomeColuna] = resultFieldData[0].coluna
                }
            }
        }

        ///////////////////////////////////////////////////////////////////////////////////////////////////

        //? Fields dos Produtos (colunas)
        const resultFieldsProducts = await getFieldsProduct(unidadeID)

        // Dados (linhas)
        let products = []
        if (type == 'edit') {
            const sqlDataProducts = `SELECT * FROM recebimentomp_produto WHERE recebimentompID = ?`
            let [resultDataProducts] = await db.promise().query(sqlDataProducts, [id])

            // Dados dos produtos (array com os produtos)
            let dataFieldProducts = {}
            for (const data of resultDataProducts) {
                for (const field of resultFieldsProducts) {
                    if (field.tipo === 'int' && field.tabela) {
                        // Monta objeto pra preencher select 
                        // Ex.: profissional:{
                        //     id: 1,
                        //     nome: 'Fulano'
                        // }
                        const sqlProductsData = `
                        SELECT t.${field.nomeColuna} AS id, t.nome
                        FROM recebimentomp_produto AS rm 
                            JOIN ${field.tabela} AS t ON (rm.${field.nomeColuna} = t.${field.nomeColuna}) 
                        WHERE rm.recebimentompID = ${id} AND t.${field.nomeColuna} = ${data[field.nomeColuna]}`

                        let [temp] = await db.promise().query(sqlProductsData)
                        if (temp) {
                            dataFieldProducts[field.tabela] = temp[0]
                        }
                    } else {
                        dataFieldProducts[field.nomeColuna] = data[field.nomeColuna]
                    }
                }

                // dataFieldProducts['fields'] = resultFieldsProducts
                products.push({ ...data, ...dataFieldProducts })
            }

            //? Blocos 
            const resultBlocos = await getBlocks(id, unidadeID)

            // Observação e status
            let resultOtherInformations = null
            if (type == 'edit') {
                const sqlOtherInformations = `
                SELECT obs, status
                FROM recebimentomp
                WHERE recebimentompID = ?`
                const [temp] = await db.promise().query(sqlOtherInformations, [id])
                resultOtherInformations = temp[0]
            }

            const data = {
                fields: resultFields,
                fieldsProduct: resultFieldsProducts,
                products: products.length > 0 ? products : [{}], //? Inicia com 1 produto aberto
                blocos: resultBlocos,
                info: {
                    obs: resultOtherInformations?.obs,
                    status: resultOtherInformations?.status,
                }
            }

            res.status(200).json(data);
        }
    }

    async insertData(req, res) {
        const data = req.body.form
        const { usuarioID, papelID, unidadeID } = req.body.auth

        //? Header             
        //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
        let dataHeader = await formatFieldsToTable('par_recebimentomp', data.fields)
        dataHeader['unidadeID'] = unidadeID
        dataHeader['obs'] = data.obs ?? ''
        dataHeader['status'] = 10
        dataHeader['dataCadastro'] = new Date()
        //
        const sqlHeader = `INSERT INTO recebimentomp SET ?`;
        const [resultHeader] = await db.promise().query(sqlHeader, dataHeader);
        if (resultHeader.length === 0) { return res.json('Error'); }
        const id = resultHeader.insertId

        if (!id || id == 'undefined') { return res.json({ message: 'Erro ao gravar novo formulário!' }) }

        //? Produtos 
        if (data.products) {
            let dataProduct = {}
            for (const product of data.products) {
                if (product && product.produto && product.produto.id > 0) {
                    //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
                    // let dataProduto = await formatFieldsToTable('par_recebimentomp_produto', product)
                    for (const field of data.fieldsProduct) {
                        if (field.tabela && field.tipo == 'int') {
                            dataProduct[field.nomeColuna] = product[field.tabela].id ?? 0
                        } else {
                            dataProduct[field.nomeColuna] = product[field.nomeColuna] ?? null
                        }
                    }

                    dataProduct['recebimentompID'] = id
                    const sqlInsertProduto = `INSERT INTO recebimentomp_produto SET ?`
                    const [resultInsertProduto] = await db.promise().query(sqlInsertProduto, [dataProduct])
                    if (resultInsertProduto.length === 0) { return res.status(500).json('Error'); }
                }
            }
        }

        //? Blocos 
        for (const bloco of data.blocos) {
            if (bloco && bloco.parRecebimentompBlocoID && bloco.parRecebimentompBlocoID > 0) {
                // Itens 
                for (const item of bloco.itens) {
                    if (item && item.itemID && item.itemID > 0) {
                        if (item.resposta || item.observacao) {
                            // Verifica se já existe registro em fornecedor_resposta, com o fornecedorID, parFornecedorBlocoID e itemID, se houver, faz update, senao faz insert 
                            const sqlVerificaResposta = `SELECT * FROM recebimentomp_resposta WHERE recebimentompID = ? AND parRecebimentompBlocoID = ? AND itemID = ?`
                            const [resultVerificaResposta] = await db.promise().query(sqlVerificaResposta, [id, bloco.parRecebimentompBlocoID, item.itemID])

                            const resposta = item.resposta?.id > 0 ? item.resposta.nome : item.resposta ? item.resposta : ''
                            const respostaID = item.resposta?.id > 0 ? item.resposta.id : null
                            const observacao = item.observacao != undefined ? item.observacao : ''

                            if (resultVerificaResposta.length === 0) {
                                // insert na tabela fornecedor_resposta
                                const sqlInsert = `INSERT INTO recebimentomp_resposta (recebimentompID, parRecebimentompBlocoID, itemID, resposta, respostaID, obs) VALUES (?, ?, ?, ?, ?, ?)`
                                const [resultInsert] = await db.promise().query(sqlInsert, [
                                    id,
                                    bloco.parRecebimentompBlocoID,
                                    item.itemID,
                                    resposta,
                                    respostaID,
                                    observacao,
                                ])
                                if (resultInsert.length === 0) { return res.json('Error'); }
                            }
                        }
                    }
                }
            }
        }

        //? Gera histórico de alteração de status (se alterou de status)        
        const movimentation = await addFormStatusMovimentation(2, id, usuarioID, unidadeID, papelID, '0', '10', '')
        if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

        res.status(200).json(id)
    }

    async updateData(req, res) {
        const { id } = req.params
        const data = req.body.form
        const { usuarioID, papelID, unidadeID } = req.body.auth

        if (!id || id == 'undefined') { return res.json({ message: 'ID não recebido!' }); }

        const sqlStatus = `SELECT status FROM recebimentomp WHERE recebimentompID = ?`
        const [resultStatus] = await db.promise().query(sqlStatus, [id])

        // Header         
        let dataHeader
        if (data.fields) {
            //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
            dataHeader = await formatFieldsToTable('par_recebimentomp', data.fields)
            const sqlHeader = `UPDATE recebimentomp SET ? WHERE recebimentompID = ${id}`;
            const [resultHeader] = await db.promise().query(sqlHeader, [dataHeader])
            if (resultHeader.length === 0) { return res.status(500).json('Error'); }
        }

        // Produtos 
        if (data.products && data.products.length > 0) {
            let dataProduct = {}
            for (const product of data.products) {
                for (const field of data.fieldsProduct) {
                    if (field.tabela && field.tipo == 'int' && product[field.tabela] && product[field.tabela].id > 0) {
                        dataProduct[field.nomeColuna] = product[field.tabela].id ?? 0
                    } else {
                        dataProduct[field.nomeColuna] = product[field.nomeColuna] ?? null
                    }
                }

                if (product['recebimentompProdutoID'] > 0) { // UPDATE
                    const sqlUpdateProduto = `UPDATE recebimentomp_produto SET ? WHERE recebimentompProdutoID = ?`
                    const [resultUpdateProduto] = await db.promise().query(sqlUpdateProduto, [dataProduct, product['recebimentompProdutoID']])
                    if (resultUpdateProduto.length === 0) { return res.status(500).json('Error'); }
                } else {                                  // INSERT
                    dataProduct['recebimentompID'] = id
                    const sqlInsertProduto = `INSERT INTO recebimentomp_produto SET ?`
                    const [resultInsertProduto] = await db.promise().query(sqlInsertProduto, [dataProduct])
                    if (resultInsertProduto.length === 0) { return res.status(500).json('Error'); }
                }
            }
        }

        // Remove os produtos removidos
        if (data.removedProducts.length > 0) {
            const sqlRemoveProduct = `DELETE FROM recebimentomp_produto WHERE recebimentompProdutoID IN (${data.removedProducts.join(',')})`;
            const [resultRemoveProduct] = await db.promise().query(sqlRemoveProduct)
            if (resultRemoveProduct.length === 0) { return res.json('Error'); }
        }

        // Blocos 
        for (const bloco of data.blocos) {
            if (bloco && bloco.parRecebimentompBlocoID && bloco.parRecebimentompBlocoID > 0) {
                // Itens 
                for (const item of bloco.itens) {
                    if (item && item.itemID && item.itemID > 0) {
                        if (item.resposta || item.observacao) {
                            // Verifica se já existe registro em fornecedor_resposta, com o fornecedorID, parFornecedorBlocoID e itemID, se houver, faz update, senao faz insert 
                            const sqlVerificaResposta = `SELECT * FROM recebimentomp_resposta WHERE recebimentompID = ? AND parRecebimentompBlocoID = ? AND itemID = ?`
                            const [resultVerificaResposta] = await db.promise().query(sqlVerificaResposta, [id, bloco.parRecebimentompBlocoID, item.itemID])

                            const resposta = item.resposta?.id > 0 ? item.resposta.nome : item.resposta ? item.resposta : ''
                            const respostaID = item.resposta?.id > 0 ? item.resposta.id : null
                            const observacao = item.observacao != undefined ? item.observacao : ''

                            if (resultVerificaResposta.length === 0) {
                                // insert na tabela fornecedor_resposta
                                const sqlInsert = `INSERT INTO recebimentomp_resposta (recebimentompID, parRecebimentompBlocoID, itemID, resposta, respostaID, obs) VALUES (?, ?, ?, ?, ?, ?)`
                                const [resultInsert] = await db.promise().query(sqlInsert, [
                                    id,
                                    bloco.parRecebimentompBlocoID,
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
                                    recebimentompID = ?
                                WHERE recebimentompID = ? 
                                    AND parRecebimentompBlocoID = ? 
                                    AND itemID = ?`
                                const [resultUpdate] = await db.promise().query(sqlUpdate, [
                                    resposta,
                                    respostaID,
                                    observacao,
                                    id,
                                    id,
                                    bloco.parRecebimentompBlocoID,
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
        const sqlUpdateObs = `UPDATE recebimentomp SET obs = ?, obsConclusao = ? WHERE recebimentompID = ? `
        const [resultUpdateObs] = await db.promise().query(sqlUpdateObs, [data.info?.obs, data?.obsConclusao, id])
        if (resultUpdateObs.length === 0) { return res.json('Error'); }

        //* Status
        //? 10->Pendente (ainda não concluiu) 50->Reprovado 60->Aprovado Parcial 70->Aprovado	
        const newStatus = data.status > 30 ? data.status : 30

        const sqlUpdateStatus = `UPDATE recebimentomp SET status = ? WHERE recebimentompID = ? `
        const [resultUpdateStatus] = await db.promise().query(sqlUpdateStatus, [newStatus, id])

        //? Gera histórico de alteração de status (se houve alteração)
        if (resultStatus[0]['status'] != newStatus) {
            const movimentation = await addFormStatusMovimentation(2, id, usuarioID, unidadeID, papelID, resultStatus[0]['status'] ?? '0', newStatus, data?.obsConclusao)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }
        }

        //* Verifica se está concluindo e se irá gerar uma não conformidade
        if ((newStatus == 50 || newStatus == 60) && data.naoConformidade && dataHeader.fornecedorID > 0) {
            const sqlNC = `INSERT INTO recebimentomp_naoconformidade (recebimentompID, fornecedorID, unidadeID, status, dataCadastro) VALUES (?, ?, ?, ?, ?)`
            const [resultNC] = await db.promise().query(sqlNC, [id, dataHeader.fornecedorID, unidadeID, 10, new Date()])
            const recebimentompNaoconformidadeID = resultNC.insertId //? ID da não conformidade gerada

            const movimentation = await addFormStatusMovimentation(3, recebimentompNaoconformidadeID, usuarioID, unidadeID, papelID, '0', '30', data?.obsConclusao)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

            //? Retorna com o id da não conformidade pra já redirecionar pra não conformidade gerada
            return res.status(200).json({
                naoConformidade: true,
                id: recebimentompNaoconformidadeID
            })
        }

        res.status(200).json({})
    }

    async verifyFormPending(req, res) {
        const { id } = req.params;
        const { parFormularioID } = req.body;

        //? Recebimento MP
        if (parFormularioID == 2) {
            //todo Inserir tabela verificando se há ocorrencia de recebimentompID
            // const sql = `SELECT * FROM recebimentomp WHERE fornecedorID = ?`
            // const [result] = await db.promise().query(sql, [id])
            // const pending = result.length === 0 ? false : true

            const pending = false
            return res.status(200).json(pending)
        }

        res.status(200).json(true)
    }

    async changeFormStatus(req, res) {
        //? Atualiza status
        const { id } = req.params
        const status = req.body.status
        const { usuarioID, papelID, unidadeID } = req.body.auth

        const sqlData = `SELECT status FROM recebimentomp WHERE recebimentompID = ?`
        const [resultData] = await db.promise().query(sqlData, [id])

        //? Atualiza status do formulário
        if (status) {
            const sqlUpdateStatus = `UPDATE recebimentomp SET status = ? WHERE recebimentompID = ?`
            const [resultUpdateStatus] = await db.promise().query(sqlUpdateStatus, [status, id])

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(2, id, usuarioID, unidadeID, papelID, resultData[0]['status'] ?? '0', status, '')
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }
        }

        res.status(200).json({ message: 'Ok' })
    }

    deleteData(req, res) {
        const { id } = req.params
        const objModule = {
            table: ['item'],
            column: 'itemID'
        }
        const tablesPending = [] // Tabelas que possuem relacionamento com a tabela atual

        if (!tablesPending || tablesPending.length === 0) {
            return deleteItem(id, objModule.table, objModule.column, res)
        }

        hasPending(id, objModule.column, tablesPending)
            .then((hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    return deleteItem(id, objModule.table, objModule.column, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}

//* Obtém colunas
const getFields = async (unidadeID) => {
    const sqlFields = `
    SELECT * 
    FROM par_recebimentomp AS pr 
        JOIN par_recebimentomp_unidade AS pru ON (pr.parRecebimentompID = pru.parRecebimentompID) 
    WHERE pru.unidadeID = ? 
    ORDER BY pr.ordem ASC`
    const [resultFields] = await db.promise().query(sqlFields, [unidadeID])
    if (resultFields.length === 0) { return res.json({ message: 'Nenhum campo encontrado' }) }

    // Varre fields, verificando se há tipo == 'int', se sim, busca opções pra selecionar no select 
    for (const alternatives of resultFields) {
        if (alternatives.tipo === 'int' && alternatives.tabela) {
            // Busca cadastros ativos e da unidade (se houver unidadeID na tabela)
            let sqlOptions = ``
            if (alternatives.tabela == 'fornecedor') {
                sqlOptions = `
                SELECT MAX(fornecedorID) AS id, nome, cnpj
                FROM fornecedor
                WHERE status >= 60 AND unidadeID = ${unidadeID}
                GROUP BY cnpj
                ORDER BY nome ASC`
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

//* Obtém colunas dos produtos
const getFieldsProduct = async (unidadeID) => {
    const sqlFieldsProducts = `
    SELECT * 
    FROM par_recebimentomp_produto AS rp 
        JOIN par_recebimentomp_produto_unidade AS rpu ON (rp.parRecebimentoMpProdutoID = rpu.parRecebimentoMpProdutoID) 
    WHERE rpu.unidadeID = ? 
    ORDER BY rp.ordem ASC`
    const [resultFieldsProducts] = await db.promise().query(sqlFieldsProducts, [unidadeID])
    if (resultFieldsProducts.length === 0) { return res.json({ message: 'Erro ao obter produtos!' }); }
    // Se houver join com outra tabela, monta as opções pra selecionar no select (autocomplete)
    for (const alternatives of resultFieldsProducts) {
        if (alternatives.tipo === 'int' && alternatives.tabela) {
            // Busca cadastros ativos e da unidade (se houver unidadeID na tabela)

            let sqlProductsOptions = ``
            if (alternatives.tabela == 'produto') {
                sqlProductsOptions = `
                SELECT p.produtoID AS id, p.nome
                FROM produto AS p 
                    JOIN produto_unidade AS pu ON (p.produtoID = pu.produtoID)
                WHERE p.status = 1 AND pu.unidadeID = ${unidadeID}
                GROUP BY p.produtoID
                ORDER BY p.nome ASC`
            } else {
                sqlProductsOptions = `
                SELECT ${alternatives.tabela}ID AS id, nome
                FROM ${alternatives.tabela} 
                WHERE status = 1 ${await hasUnidadeID(alternatives.tabela) ? ` AND unidadeID = ${unidadeID} ` : ``}
                ORDER BY nome ASC`
            }

            // Executar select e inserir no objeto alternatives
            const [resultProductsOptions] = await db.promise().query(sqlProductsOptions)
            alternatives.options = resultProductsOptions
        }
    }

    return resultFieldsProducts
}

//* Obtém estrutura dos blocos e itens
const getBlocks = async (id, unidadeID) => {
    const sqlBlocos = `
    SELECT * 
    FROM par_recebimentomp_bloco
    WHERE unidadeID = ? AND status = 1
    ORDER BY ordem ASC`
    const [resultBlocos] = await db.promise().query(sqlBlocos, [unidadeID])

    // Itens
    const sqlItem = `
    SELECT prbi.*, i.*, a.nome AS alternativa,

        (SELECT rr.respostaID
        FROM recebimentomp_resposta AS rr 
        WHERE rr.recebimentompID = ? AND rr.parRecebimentompBlocoID = prbi.parRecebimentompBlocoID AND rr.itemID = prbi.itemID
        LIMIT 1) AS respostaID,
        
        (SELECT rr.resposta
        FROM recebimentomp_resposta AS rr 
        WHERE rr.recebimentompID = ? AND rr.parRecebimentompBlocoID = prbi.parRecebimentompBlocoID AND rr.itemID = prbi.itemID
        LIMIT 1) AS resposta,

        (SELECT rr.obs
        FROM recebimentomp_resposta AS rr 
        WHERE rr.recebimentompID = ? AND rr.parRecebimentompBlocoID = prbi.parRecebimentompBlocoID AND rr.itemID = prbi.itemID
        LIMIT 1) AS observacao

    FROM par_recebimentomp_bloco_item AS prbi 
        LEFT JOIN item AS i ON (prbi.itemID = i.itemID)
        LEFT JOIN alternativa AS a ON (i.alternativaID = a.alternativaID)
    WHERE prbi.parRecebimentompBlocoID = ? AND prbi.status = 1
    ORDER BY prbi.ordem ASC`
    for (const item of resultBlocos) {
        const [resultItem] = await db.promise().query(sqlItem, [id, id, id, item.parRecebimentompBlocoID])

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
            FROM par_recebimentomp_bloco_item AS prbi 
                JOIN item AS i ON (prbi.itemID = i.itemID)
                JOIN alternativa AS a ON (i.alternativaID = a.alternativaID)
                JOIN alternativa_item AS ai ON (a.alternativaID = ai.alternativaID)
            WHERE prbi.parRecebimentompBlocoItemID = ?`
            const [resultAlternativa] = await db.promise().query(sqlAlternativa, [item2.parRecebimentompBlocoItemID])
            item2.alternativas = resultAlternativa
        }

        item.itens = resultItem
    }

    return resultBlocos
}

module.exports = RecebimentoMpController;