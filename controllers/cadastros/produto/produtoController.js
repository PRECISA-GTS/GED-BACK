const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');
const { fractionedToFloat, floatToFractioned } = require('../../../defaults/functions');

class ProdutoController {

    //? Produtos ativos (obtidos em outros módulos)
    async getProdutos(req, res) {
        const { unidadeID } = req.body
        try {
            const sql = `
            SELECT
                p.produtoID AS id,
                CONCAT(p.nome, ' (', u.nome, ')') AS nome                
            FROM produto AS p
                JOIN unidademedida AS u ON (p.unidadeMedidaID = u.unidadeMedidaID)
            WHERE p.unidadeID = ? AND p.status = 1
            ORDER BY p.nome ASC`
            const [result] = await db.promise().query(sql, [unidadeID])

            return res.status(200).json(result)
        } catch (error) {
            return res.status(500).json(error)
        }
    }

    async getProdutosLimpeza(req, res) {
        const { unidadeID } = req.body

        try {
            const sql = `
            SELECT
                p.produtoID AS id,
                CONCAT(p.nome, ' (', u.nome, ')') AS nome
            FROM produto AS p
                JOIN unidademedida AS u ON (p.unidadeMedidaID = u.unidadeMedidaID)
            WHERE p.unidadeID = ? AND p.status = 1 AND p.limpeza = 1
            ORDER BY p.nome ASC`
            const [result] = await db.promise().query(sql, [unidadeID])

            return res.status(200).json(result)
        } catch (error) {
            return res.status(500).json(error)
        }
    }

    async getFormularios(req, res) {
        const sql = `
        SELECT parFormularioID AS id, nome
        FROM par_formulario
        ORDER BY parFormularioID ASC`
        const [result] = await db.promise().query(sql)

        return res.status(200).json(result)
    }

    async getList(req, res) {
        const { unidadeID } = req.params
        try {
            const sqlGetList = `
            SELECT 
                a.produtoID AS id,
                CONCAT(a.nome, ' (', b.nome, ')') AS nome,
                b.nome AS unidadeMedida,
                COALESCE(d.nome, '--') as classificacao,
                c.nome as status,
                c.cor,
                IF(a.limpeza = 1, 'Limpeza', '--') AS limpeza
            FROM produto AS a 
                JOIN unidademedida AS b ON (a.unidadeMedidaID = b.unidadeMedidaID)
                JOIN status AS c ON (a.status = c.statusID)
                LEFT JOIN classificacao_produto AS d ON (a.classificacaoProdutoID = d.classificacaoProdutoID)
            WHERE a.unidadeID = ?`
            const resultSqlGetList = await db.promise().query(sqlGetList, [unidadeID])
            return res.status(200).json(resultSqlGetList[0])
        } catch (error) {
            console.log(error)
        }
    }

    async getData(req, res) {
        const { id, unidadeID } = req.params;
        try {
            const sqlData = `SELECT * FROM produto WHERE produtoID = ?`
            const [resultData] = await db.promise().query(sqlData, id);

            if (!resultData || resultData.length === 0) return res.status(404).json({ error: "Nenhum dado encontrado." })

            const sqlUnidadeMedida = `
            SELECT 
                pf.nome, 
                pf.unidadeMedidaID AS id
            FROM produto AS gp 
                JOIN unidademedida AS pf ON (gp.unidadeMedidaID  = pf.unidadeMedidaID )
            WHERE gp.produtoID = ?`
            const [resultUnidadeMedida] = await db.promise().query(sqlUnidadeMedida, [id]);

            const sqlClassificacao = `
            SELECT 
                pf.nome, 
                pf.classificacaoProdutoID AS id
            FROM produto AS gp 
                LEFT JOIN classificacao_produto AS pf ON (gp.classificacaoProdutoID  = pf.classificacaoProdutoID )
            WHERE gp.produtoID = ?`
            const [resultClassificacao] = await db.promise().query(sqlClassificacao, [id]);

            //? Anexos
            const sqlAnexos = `
            SELECT pa.*, f.nome AS formularioNome
            FROM produto_anexo AS pa
                JOIN par_formulario AS f ON (pa.parFormularioID = f.parFormularioID)
            WHERE pa.produtoID = ?`
            const [resultAnexos] = await db.promise().query(sqlAnexos, [id])
            for (let anexo of resultAnexos) {
                anexo['formulario'] = {
                    id: anexo.parFormularioID,
                    nome: anexo.formularioNome
                }
            }

            const sqlOptionsUnidadeMedida = `SELECT nome, unidadeMedidaID AS id FROM unidademedida`
            const [resultOptionsUnidadeMedida] = await db.promise().query(sqlOptionsUnidadeMedida);

            const sqlOptionsClassificacao = `SELECT nome, classificacaoProdutoID AS id FROM classificacao_produto WHERE unidadeID = ?`;
            const [resultOptionsClassificacao] = await db.promise().query(sqlOptionsClassificacao, [unidadeID]);

            //? Análise 
            const sqlAnalise = `
            SELECT *
            FROM produto_analise
            WHERE produtoID = ?
            ORDER BY status DESC`
            const [resultAnalise] = await db.promise().query(sqlAnalise, [id]);
            const formattedAnalise = resultAnalise.map((analise) => {
                return {
                    ...analise,
                    minimo: floatToFractioned(analise.minimo),
                    maximo: floatToFractioned(analise.maximo),
                }
            });

            const result = {
                fields: {
                    ...resultData[0],
                    limpeza: resultData[0].limpeza === 1 ? true : false,
                    analiseProduto: resultData[0].analiseProduto === 1 ? true : false,
                    analises: formattedAnalise ?? []
                },
                anexos: resultAnexos,
                unidadeMedida: {
                    fields: resultUnidadeMedida[0],
                    options: resultOptionsUnidadeMedida
                },
                classificacao: {
                    fields: resultClassificacao[0].id ? resultClassificacao[0] : null,
                    options: resultOptionsClassificacao
                }
            };
            res.status(200).json(result);
        } catch (error) {
            console.error("Erro ao buscar dados no banco de dados: ", error);
            res.status(500).json({ error: "Ocorreu um erro ao buscar os dados no banco de dados." });
        }
    }

    async getNewData(req, res) {
        try {
            const sqlUnidadeMedida = 'SELECT nome, unidadeMedidaID AS id FROM unidademedida'
            const [resultUnidadeMedida] = await db.promise().query(sqlUnidadeMedida)

            const sqlClassificacao = 'SELECT nome, classificacaoProdutoID AS id FROM classificacao_produto WHERE unidadeID = ?'
            const [resultClassificacao] = await db.promise().query(sqlClassificacao, [req.params.unidadeID])

            const result = {
                fields: {
                    status: true
                },
                anexos: [],
                unidadeMedida: {
                    fields: null,
                    options: resultUnidadeMedida
                },
                classificacao: {
                    fields: null,
                    options: resultClassificacao
                },
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Erro ao buscar dados no banco de dados: ", error);
            res.json({ error: "Ocorreu um erro ao buscar os dados no banco de dados." });
        }
    }

    async insertData(req, res) {
        try {
            const values = req.body

            //* Valida conflito
            const validateConflicts = {
                columns: ['nome', 'unidadeID', 'unidadeMedidaID'],
                values: [values.fields.nome, values.unidadeID, values.unidadeMedida.fields.id],
                table: 'produto',
                id: null
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Criação de produto', values.usuarioID, values.unidadeID, req)

            //? Insere novo item
            const classificacaoID = values.classificacao.fields ? values.classificacao.fields.id : null
            const sqlInsert = `INSERT INTO produto (nome, limpeza, analiseProduto, status, unidadeMedidaID, classificacaoProdutoID, unidadeID) VALUES (?, ?, ?, ?, ?, ?, ?)`
            const id = await executeQuery(sqlInsert, [
                values.fields.nome,
                (values.fields.limpeza ? '1' : '0'),
                (values.fields.analiseProduto ? '1' : '0'),
                (values.fields.status ? '1' : '0'),
                values.unidadeMedida.fields.id, classificacaoID,
                values.unidadeID
            ], 'insert', 'produto', 'produtoID', null, logID)

            //? Dados do grupo inserido,
            const sqlGetProduto = `
            SELECT 
                produtoID AS id, 
                a.nome
            FROM produto AS a  
            WHERE a. produtoID = ?`
            const [resultSqlGetProduto] = await db.promise().query(sqlGetProduto, [id]);

            //? Adiciona anexos
            // if (values.anexos.length > 0) {
            //     const sqlInsertAnexo = 'INSERT INTO produto_anexo (nome, parFormularioID, descricao, obrigatorio, status, produtoID) VALUES (?, ?, ?, ?, ?, ?)'
            //     values.anexos.map(async (item) => {

            //         await executeQuery(sqlInsertAnexo, [item.nome, item.formulario.id, item.descricao, item.obrigatorio ? '1' : '0', item.status ? '1' : '0', id], 'insert', 'produto_anexo', 'produtoAnexoID', null, logID)
            //     })
            // }

            //? Análises
            for (const row of values.fields.analises) {
                const sqlItem = 'INSERT INTO produto_analise (produtoID, nome, unidade, minimo, maximo, ajuda, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
                await executeQuery(sqlItem, [
                    id,
                    row.nome,
                    row.unidade,
                    fractionedToFloat(row.minimo),
                    fractionedToFloat(row.maximo),
                    row.ajuda,
                    1
                ], 'insert', 'produto_analise', 'produtoAnaliseID', null, logID)
            }

            const data = {
                id: resultSqlGetProduto[0].id,
                nome: resultSqlGetProduto[0].nome,

            }

            return res.status(200).json(data)
        } catch (error) {
            console.log(error)
        }
    }

    async updateData(req, res) {
        try {
            const { id } = req.params
            const values = req.body

            if (!id || id == undefined) return res.status(400).json({ message: "ID não informado" })

            //* Valida conflito
            const validateConflicts = {
                columns: ['produtoID', 'nome', 'unidadeID', 'unidadeMedidaID'],
                values: [id, values.fields.nome, values.unidadeID, values.unidadeMedida.fields.id],
                table: 'produto',
                id: id
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Atualização de produto', values.usuarioID, values.unidadeID, req)

            //? Atualiza produto
            const classificacaoID = values.classificacao.fields?.id ?? null
            const sqlUpdate = `UPDATE produto SET nome = ?, limpeza = ?, unidadeMedidaID = ?, classificacaoProdutoID = ?, analiseProduto = ?, status = ? WHERE produtoID = ?`;
            await executeQuery(sqlUpdate, [
                values.fields.nome,
                (values.fields.limpeza ? '1' : '0'),
                values.unidadeMedida.fields.id,
                classificacaoID,
                (values.fields.analiseProduto ? '1' : '0'),
                values.fields.status,
                id
            ], 'update', 'produto', 'produtoID', id, logID)

            //? Insere ou atualiza anexos
            // if (values.anexos.length > 0) {
            //     values.anexos.map(async (item) => {
            //         if (item && item.produtoAnexoID > 0) { //? Já existe, atualiza
            //             const sqlUpdateItem = `UPDATE produto_anexo SET nome = ?, parFormularioID = ?, descricao = ?, status = ?, obrigatorio = ? WHERE produtoAnexoID = ?`
            //             await executeQuery(sqlUpdateItem, [item.nome, item.formulario.id, item.descricao, (item.status ? '1' : '0'), (item.obrigatorio ? '1' : '0'), item.produtoAnexoID], 'update', 'produto_anexo', 'produtoID', id, logID)

            //         } else if (item && !item.produtoAnexoID) {                   //? Novo, insere
            //             const sqlInsertItem = `INSERT INTO produto_anexo (nome, parFormularioID, descricao, produtoID, status, obrigatorio) VALUES (?, ?, ?, ?, ?, ?)`
            //             await executeQuery(sqlInsertItem, [item.nome, item.formulario.id, item.descricao, id, (item.status ? '1' : '0'), (item.obrigatorio ? '1' : '0')], 'insert', 'produto_anexo', 'produtoID', null, logID)
            //         }
            //     })
            // }

            // if (values.removedItems.length > 0) {
            //     const sqlDeleteAnexos = `DELETE FROM produto_anexo WHERE produtoAnexoID IN (${values.removedItems.join(',')})`
            //     await executeQuery(sqlDeleteAnexos, [], 'delete', 'produto_anexo', 'produtoID', id, logID)
            // }

            //? Análises
            const existingItems = await db.promise().query(`SELECT produtoAnaliseID FROM produto_analise WHERE produtoID = ?`, [id]);
            const incomingItemIDs = new Set(values.fields.analises.map(item => item.id));

            // Remove os itens que não estão mais na nova lista
            for (const existingItem of existingItems[0]) {
                if (!incomingItemIDs.has(existingItem.produtoAnaliseID)) {
                    const sqlItemDelete = `DELETE FROM produto_analise WHERE produtoAnaliseID = ? AND produtoID = ?`;
                    await executeQuery(sqlItemDelete, [existingItem.produtoAnaliseID, id], 'delete', 'produto_analise', 'produtoAnaliseID', existingItem.produtoAnaliseID, logID);
                }
            }

            // Atualiza ou insere os itens recebidos
            for (const item of values.fields.analises) {
                if (item.id) {
                    const sqlItemUpdate = `UPDATE produto_analise SET nome = ?, unidade = ?, minimo = ?, maximo = ?, ajuda = ?, status = ? WHERE produtoAnaliseID = ? AND produtoID = ?`;
                    await executeQuery(sqlItemUpdate, [
                        item.nome,
                        item.unidade,
                        fractionedToFloat(item.minimo ?? 0),
                        fractionedToFloat(item.maximo ?? 0),
                        item.ajuda,
                        item.status,
                        item.id,
                        id
                    ], 'update', 'produto_analise', 'produtoAnaliseID', item.id, logID);
                } else {
                    const sqlItemInsert = `INSERT INTO produto_analise (produtoID, nome, unidade, minimo, maximo, ajuda, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
                    await executeQuery(sqlItemInsert, [
                        id,
                        item.nome,
                        item.unidade,
                        fractionedToFloat(item.minimo ?? 0),
                        fractionedToFloat(item.maximo ?? 0),
                        item.ajuda,
                        '1'
                    ], 'insert', 'produto_analise', 'produtoID', id, logID);
                }
            }

            return res.status(200).json({ message: 'Dados atualizados com sucesso!' })
        } catch (error) {
            console.log(error)
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['produto', 'produto_anexo'],
            column: 'produtoID'
        }
        const arrPending = [
            {
                table: 'fornecedor_produto',
                column: ['produtoID'],
            },
            {
                table: 'recebimentomp_produto',
                column: ['produtoID'],
            },
        ]

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de produto', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de produto', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }

}

module.exports = ProdutoController;