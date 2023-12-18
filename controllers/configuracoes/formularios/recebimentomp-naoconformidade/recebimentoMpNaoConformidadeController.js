const db = require('../../../../config/db');
const fs = require('fs');
const path = require('path');
const { hasPending, deleteItem } = require('../../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../../config/executeQuery');
require('dotenv/config')

class RecebimentoMpNaoConformidadeController {
    async getList(req, res) {
        const { unidadeID } = req.params;

        if (!unidadeID) return res.status(400).json({ error: 'unidadeID não informado!' })

        const sql = `
        SELECT parRecebimentoMpNaoConformidadeModeloID AS id, nome, ciclo, status
        FROM par_recebimentomp_naoconformidade_modelo 
        WHERE unidadeID = ?
        ORDER BY nome ASC`
        const [result] = await db.promise().query(sql, [unidadeID])

        return res.json(result);
    }

    async getData(req, res) {
        const { id } = req.params;
        const { unidadeID } = req.body;

        try {
            if (!id || id == 'undefined') { return res.json({ message: 'Sem ID recebido!' }) }

            //? Model
            const sql = `
            SELECT * 
            FROM par_recebimentomp_naoconformidade_modelo
            WHERE parRecebimentoMpNaoConformidadeModeloID = ?`
            const [resultModel] = await db.promise().query(sql, [id])

            //? Header
            const sqlHeader = `
            SELECT pf.*,
                (SELECT COUNT(*)
                FROM par_recebimentomp_naoconformidade_modelo AS pfm 
                    JOIN par_recebimentomp_naoconformidade_modelo_cabecalho AS pfmc ON(pfm.parRecebimentoMpNaoConformidadeModeloID = pfmc.parRecebimentoMpNaoConformidadeModeloID)
                WHERE pfmc.parRecebimentoMpNaoConformidadeID = pf.parRecebimentoMpNaoConformidadeID AND pfm.parRecebimentoMpNaoConformidadeModeloID = ${id}
                LIMIT 1
                ) AS mostra,

                COALESCE((SELECT pfmc.obrigatorio
                FROM par_recebimentomp_naoconformidade_modelo AS pfm 
                    JOIN par_recebimentomp_naoconformidade_modelo_cabecalho AS pfmc ON(pfm.parRecebimentoMpNaoConformidadeModeloID = pfmc.parRecebimentoMpNaoConformidadeModeloID)
                WHERE pfmc.parRecebimentoMpNaoConformidadeID = pf.parRecebimentoMpNaoConformidadeID AND pfm.parRecebimentoMpNaoConformidadeModeloID = ${id}
                LIMIT 1
                ), 0) AS obrigatorio,

                    COALESCE((SELECT pfmc.ordem
                FROM par_recebimentomp_naoconformidade_modelo AS pfm 
                    JOIN par_recebimentomp_naoconformidade_modelo_cabecalho AS pfmc ON(pfm.parRecebimentoMpNaoConformidadeModeloID = pfmc.parRecebimentoMpNaoConformidadeModeloID)
                WHERE pfmc.parRecebimentoMpNaoConformidadeID = pf.parRecebimentoMpNaoConformidadeID AND pfm.parRecebimentoMpNaoConformidadeModeloID = ${id}
                LIMIT 1
                    ), 100) AS ordem
            FROM par_recebimentomp_naoconformidade AS pf
            ORDER BY
            COALESCE((SELECT pfmc.ordem
                    FROM par_recebimentomp_naoconformidade_modelo AS pfm 
                        JOIN par_recebimentomp_naoconformidade_modelo_cabecalho AS pfmc ON(pfm.parRecebimentoMpNaoConformidadeModeloID = pfmc.parRecebimentoMpNaoConformidadeModeloID)
                    WHERE pfmc.parRecebimentoMpNaoConformidadeID = pf.parRecebimentoMpNaoConformidadeID AND pfm.parRecebimentoMpNaoConformidadeModeloID = ${id}
                    LIMIT 1
            ), 100) ASC`;
            const [resultHeader] = await db.promise().query(sqlHeader);

            //? Blocks
            const blocks = [];
            const sqlBlock = `SELECT * FROM par_recebimentomp_naoconformidade_modelo_bloco WHERE parRecebimentoMpNaoConformidadeModeloID = ? ORDER BY ordem ASC`;
            const [resultBlock] = await db.promise().query(sqlBlock, [id]);

            const sqlItem = `
            SELECT i.*, pfmbi.*, a.nome AS alternativa
            -- (SELECT IF(COUNT(*) > 0, 1, 0)
            -- FROM recebimentomp_resposta AS fr
            -- WHERE fr.parRecebimentoMpNaoConformidadeModeloBlocoID = pfmbi.parRecebimentoMpNaoConformidadeModeloBlocoID AND fr.itemID = pfmbi.itemID) AS hasPending
            FROM par_recebimentomp_naoconformidade_modelo_bloco_item AS pfmbi 
                LEFT JOIN item AS i ON(pfmbi.itemID = i.itemID)
                LEFT JOIN alternativa AS a ON(i.alternativaID = a.alternativaID)
            WHERE pfmbi.parRecebimentoMpNaoConformidadeModeloBlocoID = ?
                ORDER BY pfmbi.ordem ASC`

            //? Options
            const sqlOptionsItem = `SELECT itemID AS id, nome FROM item WHERE parFormularioID = 3 AND unidadeID = ? AND status = 1 ORDER BY nome ASC`;
            const [resultItem] = await db.promise().query(sqlOptionsItem, [unidadeID]);
            const objOptionsBlock = {
                itens: resultItem ?? [],
            };

            for (const item of resultBlock) {
                const [resultItem] = await db.promise().query(sqlItem, [item.parRecebimentoMpNaoConformidadeModeloBlocoID])

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

            const sqlProfissionais = `
            SELECT profissionalID AS id, nome
            FROM profissional
            WHERE unidadeID = ? AND status = 1
            ORDER BY nome ASC`
            const [resultProfissionais] = await db.promise().query(sqlProfissionais, [unidadeID])

            //? Options
            const objOptions = {
                itens: resultItem ?? [],
                profissionais: resultProfissionais ?? []
            };

            //? Orientações
            const sqlOrientacoes = `SELECT obs FROM par_formulario WHERE parFormularioID = 3`;
            const [resultOrientacoes] = await db.promise().query(sqlOrientacoes)

            const result = {
                model: resultModel[0],
                header: resultHeader ?? [],
                blocks: blocks ?? [],
                options: objOptions ?? [],
                orientations: resultOrientacoes[0] ?? null
            }
            console.log("🚀 ~ result:", result)

            return res.status(200).json(result)
        } catch (error) {
            return res.json({ message: 'Erro ao receber dados!' })
        }
    }

    async insertData(req, res) {
        try {
            const { unidadeID, usuarioID, model } = req.body

            if (!unidadeID || unidadeID == 'undefined') { return res.json({ message: 'Erro ao receber ID!' }) }

            const logID = await executeLog('Criação de modelo de não conformidade do recebimento de MP', usuarioID, unidadeID, req)

            //? Model
            const sqlModel = `INSERT INTO par_recebimentomp_naoconformidade_modelo(nome, ciclo, cabecalho, unidadeID, status) VALUES(?, ?, ?, ?, ?)`
            const parRecebimentoMpNaoConformidadeModeloID = await executeQuery(sqlModel, [model.nome, model.ciclo, model.cabecalho ?? '', unidadeID, (model.status ? 1 : 0)], 'insert', 'par_recebimentomp_naoconformidade_modelo', 'parRecebimentoMpNaoConformidadeModeloID', null, logID)

            return res.status(200).json({ id: parRecebimentoMpNaoConformidadeModeloID });

        } catch (error) {
            return res.json({ message: 'Erro ao receber dados!' })
        }
    }

    async updateData(req, res) {
        try {
            const { id, unidadeID, usuarioID, model, header, blocks, arrRemovedBlocks, arrRemovedItems, orientacoes } = req.body

            if (!id || id == 'undefined') { return res.json({ message: 'Erro ao receber ID!' }) }

            const logID = await executeLog('Edição do modelo de não conformidade do recebimento de MP', usuarioID, unidadeID, req)

            //? Model
            const sqlModel = `
            UPDATE par_recebimentomp_naoconformidade_modelo
            SET nome = ?, ciclo = ?, cabecalho = ?, status = ?
            WHERE parRecebimentoMpNaoConformidadeModeloID = ? `
            await executeQuery(sqlModel, [model?.nome, model?.ciclo, model?.cabecalho ?? '', (model?.status ? '1' : '0'), id], 'update', 'par_recebimentomp_naoconformidade_modelo', 'parRecebimentoMpNaoConformidadeModeloID', id, logID)

            //? Atualiza profissionais que aprovam e assinam o modelo. tabela: par_recebimentomp_naoconformidade_modelo_profissional
            const sqlDeleteProfissionaisModelo = `DELETE FROM par_recebimentomp_naoconformidade_modelo_profissional WHERE parRecebimentoMpNaoConformidadeModeloID = ? `
            await executeQuery(sqlDeleteProfissionaisModelo, [id], 'delete', 'par_recebimentomp_naoconformidade_modelo_profissional', 'parRecebimentoMpNaoConformidadeModeloID', id, logID)

            //? Insere profissionais que preenchem
            if (model && model.profissionaisPreenchem && model.profissionaisPreenchem.length > 0) {
                for (let i = 0; i < model.profissionaisPreenchem.length; i++) {
                    if (model.profissionaisPreenchem[i].id > 0) {
                        const sqlInsertProfissionalModelo = `
                        INSERT INTO par_recebimentomp_naoconformidade_modelo_profissional(parRecebimentoMpNaoConformidadeModeloID, profissionalID, tipo)
            VALUES(?, ?, ?)`
                        await executeQuery(sqlInsertProfissionalModelo, [id, model.profissionaisPreenchem[i].id, 1], 'insert', 'par_recebimentomp_naoconformidade_modelo_profissional', 'parRecebimentoMpNaoConformidadeModeloProfissionalID', null, logID)
                    }
                }
            }
            //? Insere profissionais que aprovam
            if (model && model.profissionaisAprovam && model.profissionaisAprovam.length > 0) {
                for (let i = 0; i < model.profissionaisAprovam.length; i++) {
                    if (model.profissionaisAprovam[i].id > 0) {
                        const sqlInsertProfissionalModelo = `
                        INSERT INTO par_recebimentomp_naoconformidade_modelo_profissional(parRecebimentoMpNaoConformidadeModeloID, profissionalID, tipo)
                        VALUES(?, ?, ?)`
                        await executeQuery(sqlInsertProfissionalModelo, [id, model.profissionaisAprovam[i].id, 2], 'insert', 'par_recebimentomp_naoconformidade_modelo_profissional', 'parRecebimentoMpNaoConformidadeModeloProfissionalID', null, logID)
                    }
                }
            }

            //? Header
            header && header.forEach(async (item) => {
                if (item && item.mostra == true) {
                    // Verifica se já existe registro em "par_recebimentomp_unidade" para o recebimento e unidade
                    const sqlHeader = `
                    SELECT COUNT(*) AS count
                    FROM par_recebimentomp_naoconformidade_modelo_cabecalho AS plmc
                    WHERE plmc.parRecebimentoMpNaoConformidadeModeloID = ? AND plmc.parRecebimentoMpNaoConformidadeID = ? `
                    // Verifica numero de linhas do sql 
                    const [resultHeader] = await db.promise().query(sqlHeader, [id, item.parRecebimentoMpNaoConformidadeID])

                    if (resultHeader[0].count > 0) { // Update
                        const sqlUpdate = `
                        UPDATE par_recebimentomp_naoconformidade_modelo_cabecalho
                        SET obrigatorio = ?, ordem = ?
                        WHERE parRecebimentoMpNaoConformidadeModeloID = ? AND parRecebimentoMpNaoConformidadeID = ? `
                        await executeQuery(sqlUpdate, [(item.obrigatorio ? '1' : '0'), (item.ordem ?? '0'), id, item.parRecebimentoMpNaoConformidadeID], 'update', 'par_recebimentomp_naoconformidade_modelo_cabecalho', 'parRecebimentoMpNaoConformidadeModeloID', id, logID)
                    } else {                            // Insert
                        const sqlInsert = `
                        INSERT INTO par_recebimentomp_naoconformidade_modelo_cabecalho(parRecebimentoMpNaoConformidadeModeloID, parRecebimentoMpNaoConformidadeID, obrigatorio, ordem)
                        VALUES(?, ?, ?, ?)`
                        await executeQuery(sqlInsert, [id, item.parRecebimentoMpNaoConformidadeID, (item.obrigatorio ? '1' : '0'), (item.ordem ?? '0')], 'insert', 'par_recebimentomp_naoconformidade_modelo_cabecalho', 'parRecebimentoMpNaoConformidadeModeloCabecalhoID', null, logID)
                    }
                } else if (item) { // Deleta
                    const sqlDelete = `
                    DELETE FROM par_recebimentomp_naoconformidade_modelo_cabecalho
                    WHERE parRecebimentoMpNaoConformidadeModeloID = ? AND parRecebimentoMpNaoConformidadeID = ? `
                    await executeQuery(sqlDelete, [id, item.parRecebimentoMpNaoConformidadeID], 'delete', 'par_recebimentomp_naoconformidade_modelo_cabecalho', 'parRecebimentoMpNaoConformidadeModeloID', id, logID)
                }
            })

            //? Blocos removidos
            arrRemovedBlocks && arrRemovedBlocks.forEach(async (block) => {
                if (block && block > 0) {
                    // Blocos
                    const sqlDeleteBlock = `DELETE FROM par_recebimentomp_naoconformidade_modelo_bloco WHERE parRecebimentoMpNaoConformidadeModeloBlocoID = ? `
                    await executeQuery(sqlDeleteBlock, [block], 'delete', 'par_recebimentomp_naoconformidade_modelo_bloco', 'parFornecedorModeloID', id, logID)

                    // Itens do bloco
                    const sqlDeleteBlockItems = `DELETE FROM par_recebimentomp_naoconformidade_modelo_bloco_item WHERE parRecebimentoMpNaoConformidadeModeloBlocoID = ? `
                    await executeQuery(sqlDeleteBlockItems, [block], 'delete', 'par_recebimentomp_naoconformidade_modelo_bloco_item', 'parRecebimentoMpNaoConformidadeModeloBlocoID', id, logID)
                }
            })

            //? Itens removidos dos blocos 
            arrRemovedItems && arrRemovedItems.forEach(async (item) => {
                if (item) {
                    const sqlDelete = `DELETE FROM par_recebimentomp_naoconformidade_modelo_bloco_item WHERE parRecebimentoMpNaoConformidadeModeloBlocoItemID = ? `
                    await executeQuery(sqlDelete, [item.parRecebimentoMpNaoConformidadeModeloBlocoItemID], 'delete', 'par_recebimentomp_naoconformidade_modelo_bloco_item', 'parFornecedorModeloBlocoID', id, logID)
                }
            })

            //? Blocos 
            blocks && blocks.forEach(async (block, index) => {
                if (block) {
                    if (block.dados.parRecebimentoMpNaoConformidadeModeloBlocoID && parseInt(block.dados.parRecebimentoMpNaoConformidadeModeloBlocoID) > 0) {
                        //? Bloco já existe, Update
                        const sqlUpdateBlock = `
                        UPDATE par_recebimentomp_naoconformidade_modelo_bloco
                        SET ordem = ?, nome = ?, obs = ?, status = ?
                        WHERE parRecebimentoMpNaoConformidadeModeloBlocoID = ? `
                        const resultUpdateBlock = await executeQuery(sqlUpdateBlock, [block.dados.ordem,
                        block.dados.nome,
                        (block.dados.obs ? 1 : 0),
                        (block.dados.status ? 1 : 0),
                        block.dados.parRecebimentoMpNaoConformidadeModeloBlocoID], 'update', 'par_recebimentomp_naoconformidade_modelo_bloco', 'parRecebimentoMpNaoConformidadeModeloID', id, logID)
                        if (!resultUpdateBlock) { return res.json(err); }
                    } else {
                        //? Bloco novo, Insert
                        const sqlNewBlock = `
                        INSERT INTO par_recebimentomp_naoconformidade_modelo_bloco(parRecebimentoMpNaoConformidadeModeloID, ordem, nome, obs, unidadeID, status)
                        VALUES(?, ?, ?, ?, ?, ?)`
                        const dataNewBlock = [
                            id,
                            block.dados.ordem,
                            block.dados.nome,
                            (block.dados.obs ? 1 : 0),
                            unidadeID,
                            (block.dados.status ? 1 : 0)
                        ]
                        const modeloBlocoID = await executeQuery(sqlNewBlock, dataNewBlock, 'insert', 'par_recebimentomp_naoconformidade_modelo_bloco', 'parRecebimentoMpNaoConformidadeModeloBlocoID', null, logID)
                        if (!modeloBlocoID) { return res.json(err); }
                        block.dados.parRecebimentoMpNaoConformidadeModeloBlocoID = modeloBlocoID //? parRecebimentoMpNaoConformidadeModeloBlocoID que acabou de ser gerado
                    }

                    //? Itens 
                    block.itens && block.itens.forEach(async (item, indexItem) => {
                        if (item && item.parRecebimentoMpNaoConformidadeModeloBlocoItemID && item.parRecebimentoMpNaoConformidadeModeloBlocoItemID > 0) { //? Update                                
                            const sqlUpdate = `
                            UPDATE par_recebimentomp_naoconformidade_modelo_bloco_item
                            SET ordem = ?, ${item.item.id ? 'itemID = ?, ' : ''} obs = ?, obrigatorio = ?, status = ?
                            WHERE parRecebimentoMpNaoConformidadeModeloBlocoItemID = ? `

                            await executeQuery(sqlUpdate, [item.ordem,
                            ...(item.item.id ? [item.item.id] : []),
                            (item.obs ? 1 : 0),
                            (item.obrigatorio ? 1 : 0),
                            (item.status ? 1 : 0),
                            item.parRecebimentoMpNaoConformidadeModeloBlocoItemID], 'update', 'par_recebimentomp_naoconformidade_modelo_bloco_item', 'parRecebimentoMpNaoConformidadeModeloBlocoID', id, logID)

                        } else if (item && item.new && !item.parRecebimentoMpNaoConformidadeModeloBlocoItemID) { //? Insert                            

                            // Valida duplicidade do item 
                            const sqlItem = `
                            SELECT COUNT(*) AS count
                            FROM par_recebimentomp_naoconformidade_modelo_bloco_item AS plmbi
                            WHERE plmbi.parRecebimentoMpNaoConformidadeModeloBlocoID = ? AND plmbi.itemID = ? `
                            const [resultItem] = await db.promise().query(sqlItem, [block.dados.parRecebimentoMpNaoConformidadeModeloBlocoID, item.item.id])
                            if (resultItem[0].count === 0) {  // Pode inserir
                                const sqlInsert = `
                                INSERT INTO par_recebimentomp_naoconformidade_modelo_bloco_item(parRecebimentoMpNaoConformidadeModeloBlocoID, ordem, itemID, obs, obrigatorio, status)
                                VALUES(?, ?, ?, ?, ?, ?)`

                                await executeQuery(sqlInsert, [block.dados.parRecebimentoMpNaoConformidadeModeloBlocoID,
                                item.ordem,
                                item.item.id,
                                (item.obs ? 1 : 0),
                                (item.obrigatorio ? 1 : 0),
                                (item.status ? 1 : 0)], 'insert', 'par_recebimentomp_naoconformidade_modelo_bloco_item', 'parRecebimentoMpNaoConformidadeModeloBlocoItemID', null, logID)
                            }
                        }
                    })
                }
            })

            //? Orientações
            const sqlOrientacoes = `
            UPDATE par_formulario
            SET obs = ?
                WHERE parFormularioID = 3`
            const [resultOrientacoes] = await db.promise().query(sqlOrientacoes, [orientacoes?.obs])

            await executeQuery(sqlOrientacoes, [orientacoes?.obs], 'update', 'par_formulario', 'parFormularioID', 3, logID)

            res.status(200).json({ message: "Dados atualizados com sucesso." });

        } catch (error) {
            return res.json({ message: 'Erro ao receber dados!' })
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['par_recebimentomp_naoconformidade_modelo'],
            column: 'parRecebimentoMpNaoConformidadeModeloID'
        }

        const arrPending = [
            {
                table: 'recebimentomp_naoconformidade',
                column: ['parRecebimentoMpNaoConformidadeModeloID',],
            },

        ]

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de modelo de não conformidade do recebimento de MP', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de modelo de não conformidade do recebimento de MP', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}

module.exports = RecebimentoMpNaoConformidadeController;