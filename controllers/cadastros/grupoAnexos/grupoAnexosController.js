const db = require('../../../config/db');
const { hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeQuery, executeLog } = require('../../../config/executeQuery');

class GrupoAnexosController {
    async getList(req, res) {
        try {

            const { unidadeID } = req.body

            if (!unidadeID) {
                return res.status(400).json({ message: "Dados inválidos!" });
            }

            const sqlGetGrupoAnexos = `
            SELECT 
                grupoAnexoID AS id, 
                a.nome, 
                e.nome AS status,
                e.cor,
                a.descricao
            FROM grupoanexo AS a 
                LEFT JOIN status AS e ON (a.status = e.statusID)
            WHERE a.unidadeID = ?
            ORDER BY a.nome ASC
            `
            const [resultSqlGetGrupoAnexos] = await db.promise().query(sqlGetGrupoAnexos, [unidadeID]);
            return res.status(200).json(resultSqlGetGrupoAnexos)
        }
        catch (err) {
            return res.json(err);
        }
    }

    async getData(req, res) {
        try {
            const { id } = req.params

            const sqlData = `
            SELECT a.grupoAnexoID AS id, a.nome, a.descricao, a.status
            FROM grupoanexo AS a 
            WHERE a.grupoAnexoID = ?`
            const [resultData] = await db.promise().query(sqlData, [id]);

            if (!resultData || resultData.length === 0) return res.status(404).json({ error: "Nenhum dado encontrado." })

            const sqlFormulario = `
            SELECT pf.nome, pf.parFormularioID AS id
            FROM grupoanexo_parformulario AS gp 
                JOIN par_formulario AS pf ON (gp.parFormularioID = pf.parFormularioID)
            WHERE gp.grupoAnexoID = ?`
            const [resultFormulario] = await db.promise().query(sqlFormulario, [id]);

            const sqlOptionsFormulario = `SELECT nome, parFormularioID AS id FROM par_formulario`
            const [resultOptionsFormulario] = await db.promise().query(sqlOptionsFormulario);

            const sqlItens = `
            SELECT ai.grupoAnexoItemID AS id, ai.nome, ai.descricao, ai.obrigatorio, ai.status,
                (SELECT IF(COUNT(*) > 0, 1, 0)
                FROM grupoanexo AS a 
                WHERE a.grupoAnexoID = ai.grupoAnexoID) AS hasPending
            FROM grupoanexo_item AS ai
            WHERE ai.grupoAnexoID = ?`
            const [resultItens] = await db.promise().query(sqlItens, [id]);

            const result = {
                fields: resultData[0],
                formulario: {
                    fields: resultFormulario,
                    options: resultOptionsFormulario
                },
                items: resultItens
            }

            res.status(200).json(result);
        } catch (error) {
            console.error("Erro ao buscar dados no banco de dados: ", error);
            res.status(500).json({ error: "Ocorreu um erro ao buscar os dados no banco de dados." });
        }
    }

    async getNewData(req, res) {
        try {
            const sqlForms = 'SELECT parFormularioID AS id, nome FROM par_formulario'
            const [resultForms] = await db.promise().query(sqlForms)

            const result = {
                fields: {
                    status: true
                },
                formulario: {
                    fields: [],
                    options: resultForms
                },
                items: [{
                    status: true,
                    obrigatorio: true
                }]
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

            const logID = await executeLog('Criação de grupo de anexos', values.usuarioID, values.unidadeID, req)

            //? Atualiza grupo_anexo 
            const sqlInsert = `INSERT INTO grupoanexo (nome, descricao, unidadeID, status) VALUES (?, ?, ?, ?)`
            const id = await executeQuery(sqlInsert, [values.fields?.nome, values.fields.descricao, values.unidade, (values.fields.status ? '1' : '0')], 'insert', 'grupoanexo', 'grupoanexoID', null, logID)

            //? Dados do grupo inserido,
            const sqlGetGrupoAnexos = `
            SELECT 
                grupoAnexoID AS id, 
                a.nome
            FROM grupoanexo AS a  
            WHERE a. grupoAnexoID = ?`
            const [resultSqlGetGrupoAnexos] = await db.promise().query(sqlGetGrupoAnexos, [id]);

            //? Atualizado formulários (+1)
            if (values.formulario.fields.length > 0) {
                const sqlInsertFormularios = `INSERT INTO grupoanexo_parformulario (grupoAnexoID, parFormularioID) VALUES (?, ?)`
                values.formulario.fields.map(async (item) => {
                    await executeQuery(sqlInsertFormularios, [id, item.id], 'insert', 'grupoanexo_parformulario', 'grupoanexoParformularioID', null, logID)
                })
            }

            //? Itens do grupo de anexos
            if (values.items.length > 0) {
                values.items.map(async (item) => {
                    const sqlInsertItem = `INSERT INTO grupoanexo_item (nome, descricao, grupoAnexoID, status, obrigatorio) VALUES (?, ?, ?, ?, ?)`
                    await executeQuery(sqlInsertItem, [item.nome, item.descricao, id, (item.status ? '1' : '0'), (item.obrigatorio ? '1' : '0')], 'insert', 'grupoanexo_item', 'grupoAnexoItemID', null, logID)
                })
            }

            const data = {
                id: resultSqlGetGrupoAnexos[0].id,
                nome: resultSqlGetGrupoAnexos[0].nome,

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
            const logID = await executeLog('Atualização de grupo de anexos', values.usuarioID, values.unidadeID, req)

            //? Atualiza grupo_anexo 
            const sqlUpdate = `UPDATE grupoanexo SET nome = ?, descricao = ?, status = ? WHERE grupoAnexoID = ?`;
            await executeQuery(sqlUpdate, [values.fields.nome, values.fields.descricao, (values.fields.status ? '1' : '0'), id], 'update', 'grupoanexo', 'grupoAnexoID', id, logID)

            //? Atualizado formulários (+1)
            // Remove atuais 
            const sqlDeleteFormularios = `DELETE FROM grupoanexo_parformulario WHERE grupoAnexoID = ?`
            await executeQuery(sqlDeleteFormularios, [id], 'delete', 'grupoanexo_parformulario', 'grupoAnexoID', id, logID)

            // Insere novos 
            if (values.formulario.fields.length > 0) {
                const sqlInsertFormularios = `INSERT INTO grupoanexo_parformulario (grupoAnexoID, parFormularioID) VALUES (?, ?)`
                values.formulario.fields.map(async (item) => {
                    await executeQuery(sqlInsertFormularios, [id, item.id], 'insert', 'grupoanexo_parformulario', 'grupoanexoParformularioID', null, logID)
                })
            }

            //? Itens do grupo de anexos
            if (values.removedItems.length > 0) {
                //? Valida se há pendências
                const sqlPending = `SELECT * FROM anexo WHERE grupoAnexoItemID IN (${values.removedItems.join(',')})`
                const [resultPending] = await db.promise().query(sqlPending)
                if (resultPending.length > 0) {
                    resultPending.map((item, index) => {
                        const indexItem = values.removedItems.indexOf(item.grupoAnexoItemID)
                        if (indexItem > -1) { values.removedItems.splice(indexItem, 1) }
                    })
                }
                //? Remove somente itens que não possuem pendências
                const sqlDeleteItens = `DELETE FROM grupoanexo_item WHERE grupoAnexoItemID IN (${values.removedItems.join(',')})`

                await executeQuery(sqlDeleteItens, [], 'delete', 'grupoanexo_item', 'grupoAnexoID', id, logID)
            }

            if (values.items.length > 0) {
                values.items.map(async (item) => {
                    if (item && item.id > 0) { //? Já existe, atualiza
                        const sqlUpdateItem = `UPDATE grupoanexo_item SET nome = ?, descricao = ?, status = ?, obrigatorio = ? WHERE grupoAnexoItemID = ?`

                        await executeQuery(sqlUpdateItem, [item.nome, item.descricao, (item.status ? '1' : '0'), (item.obrigatorio ? '1' : '0'), item.id], 'update', 'grupoanexo_item', 'grupoAnexoItemID', id, logID)

                    } else if (item && !item.id) {                   //? Novo, insere
                        const sqlInsertItem = `INSERT INTO grupoanexo_item (nome, descricao, grupoAnexoID, status, obrigatorio) VALUES (?, ?, ?, ?, ?)`

                        await executeQuery(sqlInsertItem, [item.nome, item.descricao, id, (item.status ? '1' : '0'), (item.obrigatorio ? '1' : '0')], 'insert', 'grupoanexo_item', 'grupoAnexoItemID', null, logID)
                    }
                })
            }

            return res.status(200).json({ message: 'Dados atualizados com sucesso!' })
        } catch (error) {
            console.log(error)
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params

        const objDelete = {
            table: ['grupoanexo', 'grupoanexo_item', 'grupoanexo_parformulario'],
            column: 'grupoAnexoID'
        };


        const arrPending = [
            {
                table: 'fornecedor_grupoanexo',
                column: ['grupoAnexoID'],
            },
        ]

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de grupo de anexos', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de grupo de anexos', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });

        // //? obtém itens do grupo
        // const sqlItems = `SELECT * FROM grupoanexo_item WHERE grupoAnexoID = ?`
        // const [resultItems] = await db.promise().query(sqlItems, [id])

        // let canDelete = true; // Se não houver nenhuma pendência nos itens do grupo, pode apagar o grupo
        // if (arrPending.length > 0) {
        //     for (const item of resultItems) {
        //         if (item.grupoAnexoItemID) {
        //             const sqlPending = `SELECT * FROM anexo WHERE grupoAnexoItemID = ?`
        //             const [resultPending] = await db.promise().query(sqlPending, [item.grupoAnexoItemID])
        //             if (resultPending.length > 0) {
        //                 canDelete = false;
        //                 break; // Encerrar o laço
        //             }
        //         }
        //     }
        // }

        // //? Nenhum item tem pendência com os anexos, pode deletar
        // if (canDelete) {
        //     return deleteItem(id, objDelete.table, objDelete.column, res);
        // } else {
        //     return res.status(409).json({ message: "Dado possui pendência." });
        // }
    }
}

module.exports = GrupoAnexosController;