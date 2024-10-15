const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class ItemController {

    async getItems(req, res) {
        const { parFormularioID, unidadeID } = req.body
        if (!parFormularioID || !unidadeID) return res.status(400).json({ message: "Dados não informados!" })

        try {
            const sql = `
            SELECT i.itemID AS id, CONCAT(i.nome, ' (', a.nome, ')') AS nome
            FROM item AS i
                JOIN alternativa AS a ON (i.alternativaID = a.alternativaID)
            WHERE i.parFormularioID = ? AND i.unidadeID = ? AND i.status = 1 
            ORDER BY i.nome ASC`
            const [result] = await db.promise().query(sql, [parFormularioID, unidadeID])
            return res.status(200).json(result)
        } catch (error) {
            console.log(error)
        }
    }
    async getItemConfigs(req, res) {
        try {
            const { itemID, alternativaItemID } = req.body
            if (!itemID || !alternativaItemID) return res.status(400).json({ message: "Dados não informados!" })

            const sql = `
            SELECT io.itemOpcaoID, io.anexo, io.bloqueiaFormulario, io.observacao
            FROM item AS i
                LEFT JOIN item_opcao AS io ON (i.itemID = io.itemID)
            WHERE i.itemID = ? AND io.alternativaItemID = ?`
            const [result] = await db.promise().query(sql, [itemID, alternativaItemID])

            result[0]['anexosSolicitados'] = []
            if (result[0]['anexo'] == 1) { //? Essa resposta solicita anexo
                const sqlAnexos = `
                SELECT itemOpcaoAnexoID, nome, obrigatorio
                FROM item_opcao_anexo
                WHERE itemID = ? AND itemOpcaoID = ?`
                const [resultAnexos] = await db.promise().query(sqlAnexos, [itemID, result[0]['itemOpcaoID']])
                result[0]['anexosSolicitados'] = resultAnexos.length > 0 ? resultAnexos : []
            }

            return res.status(200).json(result[0])

        } catch (error) {
            console.log(error)
        }
    }

    async getAlternatives(req, res) {
        const { alternativa } = req.body

        if (!alternativa.id) return res.status(400).json({ message: "Dados não informados!" })

        try {
            const sql = `
            SELECT alternativaItemID AS id, nome
            FROM alternativa_item 
            WHERE alternativaID = ? `
            const [result] = await db.promise().query(sql, [alternativa.id])

            for (let i = 0; i < result.length; i++) {
                result[i].anexo = false
                result[i].bloqueiaFormulario = false
                result[i].observacao = false
                result[i].anexos = [{ nome: '' }]
            }

            res.status(200).json(result)
        } catch (error) {
            console.log(error)
        }
    }

    async getList(req, res) {
        const { unidadeID } = req.params
        try {
            const sqlGetList = `
            SELECT 
                itemID AS id,
                a.nome,
                e.nome AS status,
                    e.cor,
                    b.nome AS formulario 
            FROM item AS a 
            LEFT JOIN par_formulario b ON(a.parFormularioID = b.parFormularioID) 
            JOIN status e ON(a.status = e.statusID)
            WHERE a.unidadeID = ?
                ORDER BY b.parFormularioID ASC, a.itemID ASC`
            const resultSqlGetList = await db.promise().query(sqlGetList, [unidadeID])
            return res.status(200).json(resultSqlGetList[0])
        } catch (error) {
            console.log(error)
        }
    }

    async getData(req, res) {
        try {
            const { id } = req.params;

            const sql = `
            SELECT i.itemID AS id, i.nome, i.status, i.ajuda, pf.parFormularioID, pf.nome AS formulario, a.alternativaID, a.nome AS alternativa
            FROM item AS i
                JOIN par_formulario AS pf ON(i.parFormularioID = pf.parFormularioID)
                JOIN alternativa AS a ON(i.alternativaID = a.alternativaID)
            WHERE i.itemID = ? `
            const [resultData] = await db.promise().query(sql, [id]);

            if (!resultData || resultData.length === 0) return res.status(404).json({ error: "Nenhum dado encontrado." })

            // Opções de seleção de formulário  
            const sqlOptionsFormulario = `SELECT parFormularioID AS id, nome FROM par_formulario`
            const [resultOptionsFormulario] = await db.promise().query(sqlOptionsFormulario);

            // Opções de eleção de alternativa 
            const sqlOptionsAlternativa = `SELECT alternativaID AS id, nome FROM alternativa WHERE status = 1`
            const [resultOptionsAlternativa] = await db.promise().query(sqlOptionsAlternativa);

            //? Opções do item 
            const sqlOpcoes = `
            SELECT io.itemOpcaoID, ai.alternativaItemID AS id, ai.nome, ai.alternativaID, io.anexo, io.bloqueiaFormulario, io.observacao
            FROM item_opcao AS io 
                JOIN alternativa_item AS ai ON(io.alternativaItemID = ai.alternativaItemID)
            WHERE io.itemID = ? `
            const [resultOpcoes] = await db.promise().query(sqlOpcoes, [id]);

            for (let i = 0; i < resultOpcoes.length; i++) {
                const sqlAnexos = `
                SELECT itemOpcaoAnexoID AS id, nome, obrigatorio
                FROM item_opcao_anexo 
                WHERE itemID = ? AND itemOpcaoID = ? `
                const [resultAnexos] = await db.promise().query(sqlAnexos, [id, resultOpcoes[i].itemOpcaoID]);
                resultOpcoes[i].anexos = resultAnexos.length > 0 ? resultAnexos : [{ nome: '' }]
            }

            let arrPending = [
                {
                    table: 'fornecedor_resposta',
                    column: ['itemID'],
                },
                {
                    table: 'recebimentomp_resposta',
                    column: ['itemID'],
                },
                {
                    table: 'limpeza_resposta',
                    column: ['itemID'],
                },
            ]
            const sqlTableWithItem = `
            SELECT TABLE_NAME, COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE COLUMN_NAME = 'itemID'
                AND TABLE_NAME LIKE 'par_%'
            AND TABLE_NAME != 'item'
            AND TABLE_SCHEMA = "${process.env.DB_DATABASE}"`
            const [resultHasPending] = await db.promise().query(sqlTableWithItem);
            const convertedResultHasPending = resultHasPending.map((item) => {
                return {
                    table: item.TABLE_NAME,
                    column: [item.COLUMN_NAME],
                };
            })
            arrPending = [...arrPending, ...convertedResultHasPending]
            const pending = await hasPending(id, arrPending)
            const models = await getModelsWithItem(id)

            const result = {
                fields: {
                    formulario: {
                        id: resultData[0].parFormularioID,
                        nome: resultData[0].formulario,
                    },
                    nome: resultData[0].nome,
                    status: resultData[0].status,
                    alternativa: {
                        id: resultData[0].alternativaID,
                        nome: resultData[0].alternativa,
                        opcoes: resultOptionsAlternativa ?? []
                    },
                    ajuda: resultData[0].ajuda ?? '',
                    opcoesForm: resultOptionsFormulario ?? [],
                    opcoes: resultOpcoes ?? [],
                    models: models,
                    pending: pending
                }
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Erro ao buscar dados no banco de dados: ", error);
            res.status(500).json({ error: "Ocorreu um erro ao buscar os dados no banco de dados." });
        }
    }

    async getNewData(req, res) {
        const { type } = req.body

        try {
            //? Pra trazer o formulário selecionado conforme o tipo (rota), no modal de novo item nas cnfg dos formulários
            const indexDefaultForm = type === 'fornecedor' ? 0 : type === 'recebimento-mp' ? 1 : type === 'recebimentomp-naoconformidade' ? 2 : type === 'limpeza' ? 3 : type === 'limpeza-naoconformidade' ? 4 : null

            // Opções de seleção de formulário  
            const sqlOptionsFormulario = `SELECT parFormularioID AS id, nome FROM par_formulario`
            const [resultOptionsFormulario] = await db.promise().query(sqlOptionsFormulario);

            // Opções de eleção de alternativa 
            const sqlOptionsAlternativa = `SELECT alternativaID AS id, nome FROM alternativa WHERE status = 1`
            const [resultOptionsAlternativa] = await db.promise().query(sqlOptionsAlternativa);

            //? Opções do item (já traz aberto as opções da primeira alternativa)
            const sqlOpcoes = `
            SELECT ai.alternativaItemID AS id, ai.nome, ai.alternativaID
            FROM alternativa_item AS ai 
            WHERE ai.alternativaID = ? `
            const [resultOpcoes] = await db.promise().query(sqlOpcoes, [resultOptionsAlternativa[0].id]);

            for (let i = 0; i < resultOpcoes.length; i++) {
                resultOpcoes[i].anexos = [{ nome: '' }]
            }

            const result = {
                fields: {
                    formulario: indexDefaultForm !== null ? {
                        id: resultOptionsFormulario[indexDefaultForm].id,
                        nome: resultOptionsFormulario[indexDefaultForm].nome,
                    } : null,
                    nome: '',
                    status: 1,
                    alternativa: {
                        id: resultOptionsAlternativa[0].id,
                        nome: resultOptionsAlternativa[0].nome,
                        opcoes: resultOptionsAlternativa ?? []
                    },
                    ajuda: '',
                    opcoesForm: resultOptionsFormulario ?? [],
                    opcoes: resultOpcoes ?? []
                }
            };
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
                columns: ['nome', 'parFormularioID', 'alternativaID', 'unidadeID'],
                values: [values.fields.nome, values.fields.formulario.id, values.fields.alternativa.id, values.unidadeID],
                table: 'item',
                id: null
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Criação de item', values.usuarioID, values.unidadeID, req)

            //? Insert item
            const sqlInsert = `INSERT INTO item(nome, parFormularioID, alternativaID, ajuda, status, unidadeID) VALUES(?, ?, ?, ?, ?, ?)`;

            const id = await executeQuery(sqlInsert, [values.fields.nome,
            values.fields.formulario.id,
            values.fields.alternativa.id,
            values.fields.ajuda,
            (values.fields.status ? '1' : '0'),
            values.unidadeID], 'insert', 'item', 'itemID', null, logID)

            // Busca dados do item inserido
            const getItem = "SELECT * FROM item WHERE itemID = ? "
            const [resultItem] = await db.promise().query(getItem, [id]);


            //? Atualiza item_opcao
            // Insert
            const sqlInsertOpcao = `INSERT INTO item_opcao(itemID, alternativaItemID, anexo, bloqueiaFormulario, observacao) VALUES(?, ?, ?, ?, ?)`
            if (values.fields.opcoes && values.fields.opcoes.length > 0) {
                for (let i = 0; i < values.fields.opcoes.length; i++) {
                    const element = values.fields.opcoes[i];
                    const itemOpcaoID = await executeQuery(sqlInsertOpcao, [id,
                        element.id,
                        (element.anexo ? '1' : '0'),
                        (element.bloqueiaFormulario ? '1' : '0'),
                        (element.observacao ? '1' : '0')], 'insert', 'item_opcao', 'itemOpcaoID', null, logID)



                    //? Atualiza item_opcao_anexo
                    // Insert
                    const sqlInsertAnexo = `INSERT INTO item_opcao_anexo(itemID, itemOpcaoID, nome, obrigatorio) VALUES(?, ?, ?, ?)`
                    if (element.anexos && element.anexos.length > 0) {
                        for (let j = 0; j < element.anexos.length; j++) {
                            const elementAnexo = element.anexos[j];
                            if (elementAnexo.nome != '') {
                                await executeQuery(sqlInsertAnexo, [id,
                                    itemOpcaoID,
                                    elementAnexo.nome,
                                    (elementAnexo.obrigatorio ? '1' : '0')], 'insert', 'item_opcao_anexo', 'itemOpcaoAnexoID', null, logID)
                            }
                        }
                    }
                }
            }

            const data = {
                id: resultItem[0].itemID,
                nome: resultItem[0].nome,
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
                columns: ['itemID', 'nome', 'parFormularioID', 'alternativaID', 'unidadeID'],
                values: [id, values.fields.nome, values.fields.formulario.id, values.fields.alternativa.id, values.unidadeID],
                table: 'item',
                id: id
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }
            const logID = await executeLog('Atualização de item', values.usuarioID, values.unidadeID, req)

            //? Atualiza item
            const sqlUpdate = `UPDATE item SET nome = ?, parFormularioID = ?, alternativaID = ?, ajuda = ?, status = ? WHERE itemID = ? `;

            await executeQuery(sqlUpdate, [values.fields.nome, values.fields.formulario.id, values.fields.alternativa.id, values.fields.ajuda, (values.fields.status ? '1' : '0'), id], 'update', 'item', 'itemID', id, logID)

            //? Atualiza item_opcao
            // Delete
            const sqlDeleteAnexo = `DELETE FROM item_opcao_anexo WHERE itemID = ? `
            await executeQuery(sqlDeleteAnexo, [id], 'delete', 'item_opcao_anexo', 'itemID', id, logID)

            // Delete
            const sqlDelete = `DELETE FROM item_opcao WHERE itemID = ? `
            await executeQuery(sqlDelete, [id], 'delete', 'item_opcao', 'itemID', id, logID)

            // Insert
            const sqlInsertOpcao = `INSERT INTO item_opcao(itemID, alternativaItemID, anexo, bloqueiaFormulario, observacao) VALUES(?, ?, ?, ?, ?)`
            for (let i = 0; i < values.fields.opcoes.length; i++) {
                const element = values.fields.opcoes[i];
                const itemOpcaoID = await executeQuery(sqlInsertOpcao, [id,
                    element.id,
                    (element.anexo ? '1' : '0'),
                    (element.bloqueiaFormulario ? '1' : '0'),
                    (element.observacao ? '1' : '0')], 'insert', 'item_opcao', 'itemOpcaoID', null, logID)

                //? Atualiza item_opcao_anexo
                // Insert
                const sqlInsertAnexo = `INSERT INTO item_opcao_anexo(itemID, itemOpcaoID, nome, obrigatorio) VALUES(?, ?, ?, ?)`
                for (let j = 0; j < element.anexos.length; j++) {
                    const elementAnexo = element.anexos[j];
                    if (elementAnexo.nome != '') {
                        await executeQuery(sqlInsertAnexo, [id,
                            itemOpcaoID,
                            elementAnexo.nome,
                            (elementAnexo.obrigatorio ? '1' : '0')], 'insert', 'item_opcao_anexo', 'itemOpcaoAnexoID', null, logID)
                    }
                }
            }

            return res.status(200).json({ message: 'Dados atualizados com sucesso!' })
        } catch (error) {
            console.log(error)
        }
    }

    async inactivate(req, res) {
        try {
            const { id } = req.params
            const { usuarioID, unidadeID } = req.body
            const logID = await executeLog('Inativação de item', usuarioID, unidadeID, req)

            const sqlUpdate = `UPDATE item SET status = ? WHERE itemID = ? `;
            await executeQuery(sqlUpdate, ['0', id], 'update', 'item', 'itemID', id, logID)

            //? Formulários com o item vinculado 
            let models = []
            const sqlTableWithItem = `
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE COLUMN_NAME = 'itemID'
                AND TABLE_NAME LIKE 'par_%item'
            AND TABLE_NAME != 'item'
            AND TABLE_SCHEMA = "${process.env.DB_DATABASE}"`
            const [result] = await db.promise().query(sqlTableWithItem)

            if (result && result.length > 0) {
                for (const table of result) {
                    if (table.TABLE_NAME) {
                        const sqlUpdate = `UPDATE ${table.TABLE_NAME} SET status = ? WHERE itemID = ?`;
                        await executeQuery(sqlUpdate, ['0', id], 'update', table.TABLE_NAME, 'itemID', id, logID)
                    }
                }
            }

            return res.status(200).json({ message: 'Dado inativado com sucesso!' })
        } catch (error) {
            console.log(error)
        }
    }

    async activate(req, res) {
        try {
            const { id } = req.params
            const { usuarioID, unidadeID } = req.body
            const logID = await executeLog('Ativação de item', usuarioID, unidadeID, req)

            const sqlUpdate = `UPDATE item SET status = ? WHERE itemID = ? `;
            await executeQuery(sqlUpdate, ['1', id], 'update', 'item', 'itemID', id, logID)

            return res.status(200).json({ message: 'Dado ativado com sucesso!' })
        } catch (error) {
            console.log(error)
        }
    }
    deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params

        // Tabelas que quero deletar
        const objDelete = {
            table: ['item_opcao_anexo', 'item_opcao', 'item'],
            column: 'itemID'
        };

        const arrPending = [
            {
                table: 'par_fornecedor_modelo_bloco_item',
                column: ['itemID'],
            },
            {
                table: 'par_limpeza_modelo_bloco_item',
                column: ['itemID'],
            },
        ]

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de item', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}
const getModelsWithItem = async (id) => {
    //? Formulários com o item vinculado 
    let models = []
    const sqlTableWithItem = `
    SELECT TABLE_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE COLUMN_NAME = 'itemID'
        AND TABLE_NAME LIKE 'par_%'
    AND TABLE_NAME != 'item'
    AND TABLE_SCHEMA = "${process.env.DB_DATABASE}"`
    const [tablesWithItem] = await db.promise().query(sqlTableWithItem);

    // obter rota em par_formulario    
    const sqlRoute = `
    SELECT tabela, rota
    FROM par_formulario`
    const [resultRoutes] = await db.promise().query(sqlRoute, [sqlRoute]);

    for (const table of tablesWithItem) {
        //? par_fornecedor_modelo_bloco_item => par_fornecedor_modelo_bloco
        const modelBlockTableName = table.TABLE_NAME.split('_').slice(0, -1).join('_')

        //? par_fornecedor_modelo_bloco_item => par_fornecedor_modelo
        const modelTableName = table.TABLE_NAME.split('_').slice(0, -2).join('_')

        //? parFornecedorModeloBlocoID
        const sqlBlockTableKey = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = "${modelBlockTableName}"
        AND TABLE_SCHEMA = "${process.env.DB_DATABASE}"
        ORDER BY ORDINAL_POSITION
        LIMIT 1`
        const [resultBlockTableKey] = await db.promise().query(sqlBlockTableKey);
        const blockTableKey = resultBlockTableKey[0]['COLUMN_NAME']

        //? parFornecedorModeloID
        const sqlModelTableKey = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = "${modelTableName}"
        AND TABLE_SCHEMA = "${process.env.DB_DATABASE}"
        ORDER BY ORDINAL_POSITION
        LIMIT 1`
        const [resultmodelTableKey] = await db.promise().query(sqlModelTableKey);
        const modelTableKey = resultmodelTableKey[0]['COLUMN_NAME']

        const sqlModel = `
        SELECT 
            a.${modelTableKey} AS id, 
            a.nome, 
            a.ciclo, 
            d.nome AS status
        FROM ${modelTableName} AS a
            JOIN ${modelBlockTableName} AS b ON (a.${modelTableKey} = b.${modelTableKey})
            JOIN ${table.TABLE_NAME} AS c ON (b.${blockTableKey} = c.${blockTableKey})
            JOIN status AS d ON (c.status = d.statusID)
        WHERE c.itemID = ${id}             
        GROUP BY 1
        ORDER BY c.status DESC, a.nome ASC`
        const [resultModel] = await db.promise().query(sqlModel, [id]);

        const tableModule = modelTableName.split('_').slice(0, -1).join('_')
        const route = resultRoutes.find(route => route.tabela === tableModule).rota

        resultModel.forEach(model => {
            model.rota = route
        })

        models = [...models, ...resultModel]
    }

    return models ?? []
}

module.exports = ItemController;