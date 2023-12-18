const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class ProdutoController {

    async getFormularios(req, res) {
        const sql = `
        SELECT parFormularioID AS id, nome
        FROM par_formulario
        ORDER BY parFormularioID ASC`
        const [result] = await db.promise().query(sql)

        return res.status(200).json(result)
    }

    // async getProdutosFornecedor(req, res) {
    //     const { recebimentoMpID, fornecedorID } = req.body

    //     //? Obtém o CNPJ do fornecedor
    //     const sqlFornecedor = `SELECT parFornecedorModeloID, cnpj, unidadeID FROM fornecedor WHERE fornecedorID = ?`
    //     const [resultFornecedor] = await db.promise().query(sqlFornecedor, [fornecedorID])
    //     const cnpj = resultFornecedor[0].cnpj
    //     const unidadeID = resultFornecedor[0].unidadeID
    //     const parFornecedorModeloID = resultFornecedor[0].parFornecedorModeloID

    //     //? Prazo do modelo do formulário
    //     const sqlModelo = `
    //     SELECT ciclo 
    //     FROM par_fornecedor_modelo
    //     WHERE parFornecedorModeloID = ${parFornecedorModeloID}`
    //     const [resultModelo] = await db.promise().query(sqlModelo)

    //     //? Busca os produtos habilitados por esse fornecedor (cnpj)
    //     const sqlProduto = `
    //     SELECT 
    //         p.produtoID, 
    //         CONCAT(p.nome, " (", um.nome, ")") AS nome,

    //         -- Recebimento de MP (valores)
    //         (
    //         	SELECT IF(COUNT(*) > 0, 1, 0)
    //             FROM recebimentomp_produto AS rp 
    //             WHERE rp.recebimentoMpID = ${recebimentoMpID} AND rp.produtoID = fp.produtoID
    //             LIMIT 1
    //         ) AS checked,            
    //         (
    //         	SELECT rp.quantidade
    //             FROM recebimentomp_produto AS rp 
    //             WHERE rp.recebimentoMpID = ${recebimentoMpID} AND rp.produtoID = fp.produtoID
    //             LIMIT 1
    //         ) AS quantidade,
    //         (
    //         	SELECT DATE_FORMAT(rp.dataFabricacao, '%Y-%m-%d')
    //             FROM recebimentomp_produto AS rp 
    //             WHERE rp.recebimentoMpID = ${recebimentoMpID} AND rp.produtoID = fp.produtoID
    //             LIMIT 1
    //         ) AS dataFabricacao,
    //         (
    //         	SELECT DATE_FORMAT(rp.dataValidade, '%Y-%m-%d')
    //             FROM recebimentomp_produto AS rp 
    //             WHERE rp.recebimentoMpID = ${recebimentoMpID} AND rp.produtoID = fp.produtoID
    //             LIMIT 1
    //         ) AS dataValidade,
    //         (
    //         	SELECT rp.apresentacaoID
    //             FROM recebimentomp_produto AS rp 
    //             WHERE rp.recebimentoMpID = ${recebimentoMpID} AND rp.produtoID = fp.produtoID
    //             LIMIT 1
    //         ) AS apresentacaoID,
    //         (
    //         	SELECT a.nome
    //             FROM recebimentomp_produto AS rp 
    //                 JOIN apresentacao AS a ON (rp.apresentacaoID = a.apresentacaoID)
    //             WHERE rp.recebimentoMpID = ${recebimentoMpID} AND rp.produtoID = fp.produtoID
    //             LIMIT 1
    //         ) AS apresentacaoNome,            

    //         -- Fornecedor (opções de produtos habilitados pro fornecedor selecionado)
    //         (
    //             SELECT DATE_FORMAT(b.dataFim, "%d/%m/%Y") AS dataFim
    //             FROM fornecedor_produto AS a
    //                 JOIN fornecedor AS b ON (a.fornecedorID = b.fornecedorID)
    //             WHERE a.produtoID = fp.produtoID AND b.cnpj = "${cnpj}" AND b.status IN (60, 70) AND b.unidadeID = ${unidadeID}
    //             ORDER BY b.dataFim DESC
    //             LIMIT 1
    //         ) AS ultimaAvaliacao,            
    //         (
    //             SELECT DATE_FORMAT(DATE_ADD(b.dataFim, INTERVAL ${resultModelo[0].ciclo} DAY), "%d/%m/%Y") AS dataFim
    //             FROM fornecedor_produto AS a
    //                 JOIN fornecedor AS b ON (a.fornecedorID = b.fornecedorID)
    //             WHERE a.produtoID = fp.produtoID AND b.cnpj = "${cnpj}" AND b.status IN (60, 70) AND b.unidadeID = ${unidadeID}
    //             ORDER BY b.dataFim DESC
    //             LIMIT 1
    //         ) AS proximaAvialacao,
    //         DATEDIFF(
    //             (
    //                 SELECT DATE_ADD(b.dataFim, INTERVAL ${resultModelo[0].ciclo} DAY) AS dataFim
    //                 FROM fornecedor_produto AS a
    //                     JOIN fornecedor AS b ON (a.fornecedorID = b.fornecedorID)
    //                 WHERE a.produtoID = fp.produtoID AND b.cnpj = "${cnpj}" AND b.status IN (60, 70) AND b.unidadeID = ${unidadeID}
    //                 ORDER BY b.dataFim DESC
    //                 LIMIT 1
    //             ),
    //             NOW()
    //         ) AS diasRestantes            

    //     FROM fornecedor_produto AS fp 
    //         JOIN fornecedor AS f ON (fp.fornecedorID = f.fornecedorID)
    //         JOIN produto AS p ON (fp.produtoID = p.produtoID)
    //         JOIN unidademedida AS um ON (p.unidadeMedidaID = um.unidadeMedidaID)
    //     WHERE f.cnpj = "${cnpj}" AND f.status IN (60, 70) AND f.unidadeID = ${unidadeID} AND p.status = 1
    //     GROUP BY p.produtoID
    //     ORDER BY p.nome ASC`
    //     console.log("🚀 ~ sqlProduto:", sqlProduto)
    //     const [resultProduto] = await db.promise().query(sqlProduto)

    //     for (let i = 0; i < resultProduto.length; i++) {
    //         resultProduto[i].checked = resultProduto[i].checked == '1' ? true : false
    //         resultProduto[i].apresentacao = resultProduto[i].apresentacaoID > 0 ? {
    //             id: resultProduto[i].apresentacaoID,
    //             nome: resultProduto[i].apresentacaoNome
    //         } : null
    //     }

    //     return res.status(200).json(resultProduto)
    // }

    async getList(req, res) {
        const { unidadeID } = req.params
        try {
            const sqlGetList = `
            SELECT 
                a.produtoID AS id,
                CONCAT(a.nome, ' (', b.nome, ')') AS nome,
                b.nome AS unidadeMedida,
                c.nome as status,
                c.cor
            FROM produto AS a 
                JOIN unidademedida AS b ON (a.unidadeMedidaID = b.unidadeMedidaID)
                JOIN status AS c ON (a.status = c.statusID)
            WHERE a.unidadeID = ?`
            const resultSqlGetList = await db.promise().query(sqlGetList, [unidadeID])
            return res.status(200).json(resultSqlGetList[0])
        } catch (error) {
            console.log(error)
        }
    }

    async getData(req, res) {
        try {
            const { id } = req.params;
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

            const result = {
                fields: resultData[0],
                anexos: resultAnexos,
                unidadeMedida: {
                    fields: resultUnidadeMedida[0],
                    options: resultOptionsUnidadeMedida
                },
            };
            res.status(200).json(result);
        } catch (error) {
            console.error("Erro ao buscar dados no banco de dados: ", error);
            res.status(500).json({ error: "Ocorreu um erro ao buscar os dados no banco de dados." });
        }
    }

    async getNewData(req, res) {
        try {
            const sqlForms = 'SELECT nome, unidadeMedidaID AS id FROM unidademedida'
            const [resultForms] = await db.promise().query(sqlForms)

            const result = {
                fields: {
                    status: true
                },
                anexos: [],
                unidadeMedida: {
                    fields: null,
                    options: resultForms
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

            // //? Insere novo item
            const sqlInsert = `INSERT INTO produto (nome, status, unidadeMedidaID, unidadeID) VALUES (?, ?, ?, ?)`
            // const [resultInsert] = await db.promise().query(sqlInsert, [values.fields.nome, (values.fields.status ? '1' : '0'), values.unidadeMedida.fields.id, values.unidadeID])
            // const id = resultInsert.insertId

            const id = await executeQuery(sqlInsert, [values.fields.nome, (values.fields.status ? '1' : '0'), values.unidadeMedida.fields.id, values.unidadeID], 'insert', 'produto', 'produtoID', null, logID)

            //? Dados do grupo inserido,
            const sqlGetProduto = `
            SELECT 
                produtoID AS id, 
                a.nome
            FROM produto AS a  
            WHERE a. produtoID = ?`
            const [resultSqlGetProduto] = await db.promise().query(sqlGetProduto, [id]);

            //? Adiciona anexos
            if (values.anexos.length > 0) {
                const sqlInsertAnexo = 'INSERT INTO produto_anexo (nome, parFormularioID, descricao, obrigatorio, status, produtoID) VALUES (?, ?, ?, ?, ?, ?)'
                values.anexos.map(async (item) => {
                    // const [resultInsertAnexo] = await db.promise().query(sqlInsertAnexo, [item.nome, item.formulario.id, item.descricao, item.obrigatorio ? '1' : '0', item.status ? '1' : '0', id])

                    await executeQuery(sqlInsertAnexo, [item.nome, item.formulario.id, item.descricao, item.obrigatorio ? '1' : '0', item.status ? '1' : '0', id], 'insert', 'produto_anexo', 'produtoAnexoID', null, logID)
                })
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
            const sqlUpdate = `UPDATE produto SET nome = ?, unidadeMedidaID = ?, status = ? WHERE produtoID = ?`;
            await executeQuery(sqlUpdate, [values.fields.nome, values.unidadeMedida.fields.id, (values.fields.status ? '1' : '0'), id], 'update', 'produto', 'produtoID', id, logID)

            //? Insere ou atualiza anexos
            if (values.anexos.length > 0) {
                values.anexos.map(async (item) => {
                    if (item && item.produtoAnexoID > 0) { //? Já existe, atualiza
                        const sqlUpdateItem = `UPDATE produto_anexo SET nome = ?, parFormularioID = ?, descricao = ?, status = ?, obrigatorio = ? WHERE produtoAnexoID = ?`
                        await executeQuery(sqlUpdateItem, [item.nome, item.formulario.id, item.descricao, (item.status ? '1' : '0'), (item.obrigatorio ? '1' : '0'), item.produtoAnexoID], 'update', 'produto_anexo', 'produtoID', id, logID)

                    } else if (item && !item.produtoAnexoID) {                   //? Novo, insere
                        const sqlInsertItem = `INSERT INTO produto_anexo (nome, parFormularioID, descricao, produtoID, status, obrigatorio) VALUES (?, ?, ?, ?, ?, ?)`
                        await executeQuery(sqlInsertItem, [item.nome, item.formulario.id, item.descricao, id, (item.status ? '1' : '0'), (item.obrigatorio ? '1' : '0')], 'insert', 'produto_anexo', 'produtoID', null, logID)
                    }
                })
            }

            if (values.removedItems.length > 0) {
                const sqlDeleteAnexos = `DELETE FROM produto_anexo WHERE produtoAnexoID IN (${values.removedItems.join(',')})`
                await executeQuery(sqlDeleteAnexos, [], 'delete', 'produto_anexo', 'produtoID', id, logID)

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