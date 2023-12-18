const db = require('../../../../config/db');
const fs = require('fs');
const path = require('path');
const { hasPending, deleteItem } = require('../../../../config/defaultConfig');
require('dotenv/config')

class LimpezaController {
    async getList(req, res) {
        const { unidadeID } = req.params;

        if (!unidadeID) return res.status(400).json({ error: 'unidadeID não informado!' })

        const sql = `
        SELECT parLimpezaModeloID AS id, nome, ciclo, status
        FROM par_limpeza_modelo 
        WHERE unidadeID = ?
        ORDER BY nome ASC`
        const [result] = await db.promise().query(sql, [unidadeID])

        return res.json(result);
    }

    async getData(req, res) {
        const { id, unidadeID } = req.body;
        try {
            if (!id || id == 'undefined') { return res.json({ message: 'Sem ID recebido!' }) }

            //? Model
            const sql = `
            SELECT * 
            FROM par_limpeza_modelo
            WHERE parLimpezaModeloID = ?`
            const [resultModel] = await db.promise().query(sql, [id])

            //? Header
            const sqlHeader = `
            SELECT pl.*, 
                (SELECT IF(COUNT(*) > 0, 1, 0)
                FROM par_limpeza_modelo AS plm 
                    JOIN par_limpeza_modelo_cabecalho AS plmc ON (plmc.parLimpezaID = pl.parLimpezaID AND plm.parLimpezaModeloID = plmc.parLimpezaModeloID)
                WHERE plm.parLimpezaModeloID = ?
                LIMIT 1
                ) AS mostra, 
                
                COALESCE((SELECT plmc.obrigatorio
                FROM par_limpeza_modelo AS plm 
                    JOIN par_limpeza_modelo_cabecalho AS plmc ON (plmc.parLimpezaID = pl.parLimpezaID AND plm.parLimpezaModeloID = plmc.parLimpezaModeloID)
                WHERE plm.parLimpezaModeloID = ?
                LIMIT 1
                ), 0) AS obrigatorio

            FROM par_limpeza AS pl`;
            const [resultHeader] = await db.promise().query(sqlHeader, [id, id]);

            //? Blocks
            const blocks = [];
            const sqlBlock = `SELECT * FROM par_limpeza_modelo_bloco WHERE parLimpezaModeloID = ? ORDER BY ordem ASC`;
            const [resultBlock] = await db.promise().query(sqlBlock, [id]);

            const sqlItem = `
            SELECT i.*, plmbi.*, a.nome AS alternativa, 
                (SELECT IF(COUNT(*) > 0, 1, 0)
                FROM limpeza_resposta AS fr 
                WHERE fr.parLimpezaModeloBlocoID = plmbi.parLimpezaModeloBlocoID AND fr.itemID = plmbi.itemID) AS hasPending
            FROM par_limpeza_modelo_bloco_item AS plmbi 
                LEFT JOIN item AS i ON (plmbi.itemID = i.itemID)
                LEFT JOIN alternativa AS a ON (i.alternativaID = a.alternativaID)
            WHERE plmbi.parLimpezaModeloBlocoID = ?
            ORDER BY plmbi.ordem ASC`

            //? Options
            const sqlOptionsItem = `SELECT itemID AS id, nome FROM item WHERE parFormularioID = 4 AND unidadeID = ? AND status = 1 ORDER BY nome ASC`;
            const [resultItem] = await db.promise().query(sqlOptionsItem, [unidadeID]);
            const objOptionsBlock = {
                itens: resultItem
            };

            for (const item of resultBlock) {
                const [resultItem] = await db.promise().query(sqlItem, [item.parLimpezaModeloBlocoID])

                for (const item of resultItem) {
                    if (item) {
                        item['new'] = false
                        item['item'] = {
                            id: item.itemID,
                            nome: item.nome
                        }
                        item['alternativa'] = {
                            id: item.alternativaID,
                            nome: item.alternativa
                        }
                    }
                }

                const objData = {
                    dados: item,
                    itens: resultItem ?? [],
                    optionsBlock: objOptionsBlock
                };

                blocks.push(objData);
            }

            //? Options
            const objOptions = {
                itens: resultItem ?? []
            };

            //? Orientações
            const sqlOrientacoes = `SELECT obs FROM par_formulario WHERE parFormularioID = 4`;
            const [resultOrientacoes] = await db.promise().query(sqlOrientacoes)

            const result = {
                model: resultModel[0],
                header: resultHeader,
                blocks: blocks,
                options: objOptions,
                orientations: resultOrientacoes[0]
            }

            return res.json(result)
        } catch (error) {
            return res.json({ message: 'Erro ao receber dados!' })
        }
    }

    async updateData(req, res) {
        try {
            const { id, unidadeID, model, header, blocks, arrRemovedBlocks, arrRemovedItems, orientacoes } = req.body

            if (!id || id == 'undefined') { return res.json({ message: 'Erro ao receber ID!' }) }

            //? Model
            const sqlModel = `
            UPDATE par_limpeza_modelo
            SET nome = ?, ciclo = ?, status = ?
            WHERE parLimpezaModeloID = ?`
            const [resultModel] = await db.promise().query(sqlModel, [model.nome, model.ciclo, (model.status ? 1 : 0), id])

            //? Header
            header && header.forEach(async (item) => {
                if (item && item.mostra) {
                    // Verifica se já existe registro em "par_fornecedor_unidade" para o fornecedor e unidade
                    const sqlHeader = `
                    SELECT COUNT(*) AS count
                    FROM par_limpeza_modelo_cabecalho AS plmc
                    WHERE plmc.parLimpezaModeloID = ? AND plmc.parLimpezaID = ?`
                    // Verifica numero de linhas do sql 
                    const [resultHeader] = await db.promise().query(sqlHeader, [id, item.parLimpezaID])
                    if (resultHeader[0].count === 0) { // Insert
                        const sqlInsert = `
                        INSERT INTO par_limpeza_modelo_cabecalho (parLimpezaModeloID, parLimpezaID, obrigatorio)
                        VALUES (?, ?, ?)`
                        const [resultInsert] = await db.promise().query(sqlInsert, [id, item.parLimpezaID, (item.obrigatorio ? 1 : 0)]);
                    } else {                            // Update
                        const sqlUpdate = `
                        UPDATE par_limpeza_modelo_cabecalho
                        SET obrigatorio = ?
                        WHERE parLimpezaModeloID = ? AND parLimpezaID = ?`
                        const [resultUpdate] = await db.promise().query(sqlUpdate, [(item.obrigatorio ? 1 : 0), id, item.parLimpezaID]);
                    }
                } else if (item) { // Deleta
                    const sqlDelete = `
                    DELETE FROM par_limpeza_modelo_cabecalho
                    WHERE parLimpezaModeloID = ? AND parLimpezaID = ?`
                    const [resultDelete] = await db.promise().query(sqlDelete, [id, item.parLimpezaID])
                }
            })

            //? Blocos removidos
            arrRemovedBlocks && arrRemovedBlocks.forEach(async (block) => {
                if (block && block > 0) {
                    // Blocos
                    const sqlDeleteBlock = `DELETE FROM par_limpeza_modelo_bloco WHERE parLimpezaModeloBlocoID = ?`
                    const [resultDeleteBlock] = await db.promise().query(sqlDeleteBlock, [block])

                    // Itens do bloco
                    const sqlDeleteBlockItems = `DELETE FROM par_limpeza_modelo_bloco_item WHERE parLimpezaModeloBlocoID = ?`
                    const [resultDeleteBlockItems] = await db.promise().query(sqlDeleteBlockItems, [block])
                }
            })

            //? Itens removidos dos blocos 
            arrRemovedItems && arrRemovedItems.forEach(async (item) => {
                if (item) {
                    const sqlDelete = `DELETE FROM par_limpeza_modelo_bloco_item WHERE parLimpezaModeloBlocoItemID = ?`
                    const [resultDelete] = await db.promise().query(sqlDelete, [item.parLimpezaModeloBlocoItemID])
                }
            })

            //? Blocos 
            blocks && blocks.forEach(async (block, index) => {
                if (block) {
                    if (block.dados.parLimpezaModeloBlocoID && parseInt(block.dados.parLimpezaModeloBlocoID) > 0) {
                        //? Bloco já existe, Update
                        const sqlUpdateBlock = `
                        UPDATE par_limpeza_modelo_bloco
                        SET ordem = ?, nome = ?, obs = ?, status = ?
                        WHERE parLimpezaModeloBlocoID = ?`
                        const [resultUpdateBlock] = await db.promise().query(sqlUpdateBlock, [
                            block.dados.ordem,
                            block.dados.nome,
                            (block.dados.obs ? 1 : 0),
                            (block.dados.status ? 1 : 0),
                            block.dados.parLimpezaModeloBlocoID
                        ])
                        if (resultUpdateBlock.length === 0) { return res.json(err); }
                    } else {
                        //? Bloco novo, Insert
                        const sqlNewBlock = `
                        INSERT INTO par_limpeza_modelo_bloco(parLimpezaModeloID, ordem, nome, obs, unidadeID, status) 
                        VALUES (?, ?, ?, ?, ?, ?)`
                        const [resultNewBlock] = await db.promise().query(sqlNewBlock, [
                            id,
                            block.dados.ordem,
                            block.dados.nome,
                            (block.dados.obs ? 1 : 0),
                            unidadeID,
                            (block.dados.status ? 1 : 0)
                        ])
                        if (resultNewBlock.length === 0) { return res.json(err); }
                        block.dados.parLimpezaModeloBlocoID = resultNewBlock.insertId //? parLimpezaModeloBlocoID que acabou de ser gerado
                    }

                    //? Itens 
                    block.itens && block.itens.forEach(async (item, indexItem) => {
                        if (item && item.parLimpezaModeloBlocoItemID && item.parLimpezaModeloBlocoItemID > 0) { //? Update                                
                            console.log('update item: ', item.item.id, item.item.nome)
                            const sqlUpdate = `
                            UPDATE par_limpeza_modelo_bloco_item
                            SET ordem = ?, ${item.item.id ? 'itemID = ?, ' : ''} obs = ?, obrigatorio = ?, status = ?
                            WHERE parLimpezaModeloBlocoItemID = ?`
                            const [resultUpdate] = await db.promise().query(sqlUpdate, [
                                item.ordem,
                                ...(item.item.id ? [item.item.id] : []),
                                (item.obs ? 1 : 0),
                                (item.obrigatorio ? 1 : 0),
                                (item.status ? 1 : 0),
                                item.parLimpezaModeloBlocoItemID
                            ])
                        } else if (item && item.new && !item.parLimpezaModeloBlocoItemID) { //? Insert                            
                            // Valida duplicidade do item 
                            const sqlItem = `
                            SELECT COUNT(*) AS count
                            FROM par_limpeza_modelo_bloco_item AS plmbi
                            WHERE plmbi.parLimpezaModeloBlocoID = ? AND plmbi.itemID = ?`
                            const [resultItem] = await db.promise().query(sqlItem, [block.dados.parLimpezaModeloBlocoID, item.item.id])
                            if (resultItem[0].count === 0) {  // Pode inserir
                                const sqlInsert = `
                                INSERT INTO par_limpeza_modelo_bloco_item (parLimpezaModeloBlocoID, ordem, itemID, obs, obrigatorio, status)
                                VALUES (?, ?, ?, ?, ?, ?)`
                                const [resultInsert] = await db.promise().query(sqlInsert, [
                                    block.dados.parLimpezaModeloBlocoID,
                                    item.ordem,
                                    item.item.id,
                                    (item.obs ? 1 : 0),
                                    (item.obrigatorio ? 1 : 0),
                                    (item.status ? 1 : 0)
                                ])
                            }
                        }
                    })
                }
            })

            //? Orientações
            const sqlOrientacoes = `
            UPDATE par_formulario
            SET obs = ? 
            WHERE parFormularioID = 4`
            const [resultOrientacoes] = await db.promise().query(sqlOrientacoes, [orientacoes?.obs])

            res.status(200).json({ message: "Dados atualizados com sucesso." });

        } catch (error) {
            return res.json({ message: 'Erro ao receber dados!' })
        }
    }

    deleteData(req, res) {
        const { id } = req.params
        const objDelete = {
            table: ['par_limpeza_modelo'],
            column: 'parLimpezaModeloID'
        }

        const arrPending = [
            {
                table: 'limpeza',
                column: ['parLimpezaModeloID',],
            },

        ]

        if (!arrPending || arrPending.length === 0) {
            return deleteItem(id, objDelete.table, objDelete.column, res)
        }

        hasPending(id, arrPending)
            .then((hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    return deleteItem(id, objDelete.table, objDelete.column, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}

module.exports = LimpezaController;