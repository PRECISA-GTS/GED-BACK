const db = require('../../../../config/db');
const fs = require('fs');
const path = require('path');
const { hasPending, deleteItem } = require('../../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../../config/executeQuery');
require('dotenv/config')

class LimpezaNaoConformidadeController {
    async getList(req, res) {
        const { unidadeID } = req.params;

        if (!unidadeID) return res.status(400).json({ error: 'unidadeID não informado!' })

        const sql = `
        SELECT parLimpezaNaoConformidadeModeloID AS id, nome, ciclo, status
        FROM par_limpeza_naoconformidade_modelo 
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
            FROM par_limpeza_naoconformidade_modelo
            WHERE parLimpezaNaoConformidadeModeloID = ?`
            const [resultModel] = await db.promise().query(sql, [id])

            //? Header
            const sqlHeader = `
            SELECT pf.*,
                (SELECT COUNT(*)
                FROM par_limpeza_naoconformidade_modelo AS pfm 
                    JOIN par_limpeza_naoconformidade_modelo_cabecalho AS pfmc ON(pfm.parLimpezaNaoConformidadeModeloID = pfmc.parLimpezaNaoConformidadeModeloID)
                WHERE pfmc.parLimpezaNaoConformidadeID = pf.parLimpezaNaoConformidadeID AND pfm.parLimpezaNaoConformidadeModeloID = ${id}
                LIMIT 1
                ) AS mostra,

                COALESCE((SELECT pfmc.obrigatorio
                FROM par_limpeza_naoconformidade_modelo AS pfm 
                    JOIN par_limpeza_naoconformidade_modelo_cabecalho AS pfmc ON(pfm.parLimpezaNaoConformidadeModeloID = pfmc.parLimpezaNaoConformidadeModeloID)
                WHERE pfmc.parLimpezaNaoConformidadeID = pf.parLimpezaNaoConformidadeID AND pfm.parLimpezaNaoConformidadeModeloID = ${id}
                LIMIT 1
                ), 0) AS obrigatorio,

                    COALESCE((SELECT pfmc.ordem
                FROM par_limpeza_naoconformidade_modelo AS pfm 
                    JOIN par_limpeza_naoconformidade_modelo_cabecalho AS pfmc ON(pfm.parLimpezaNaoConformidadeModeloID = pfmc.parLimpezaNaoConformidadeModeloID)
                WHERE pfmc.parLimpezaNaoConformidadeID = pf.parLimpezaNaoConformidadeID AND pfm.parLimpezaNaoConformidadeModeloID = ${id}
                LIMIT 1
                    ), 100) AS ordem
            FROM par_limpeza_naoconformidade AS pf
            ORDER BY
            COALESCE((SELECT pfmc.ordem
                    FROM par_limpeza_naoconformidade_modelo AS pfm 
                        JOIN par_limpeza_naoconformidade_modelo_cabecalho AS pfmc ON(pfm.parLimpezaNaoConformidadeModeloID = pfmc.parLimpezaNaoConformidadeModeloID)
                    WHERE pfmc.parLimpezaNaoConformidadeID = pf.parLimpezaNaoConformidadeID AND pfm.parLimpezaNaoConformidadeModeloID = ${id}
                    LIMIT 1
            ), 100) ASC`;
            const [resultHeader] = await db.promise().query(sqlHeader);

            //? Blocks
            const blocks = [];
            const sqlBlock = `SELECT * FROM par_limpeza_naoconformidade_modelo_bloco WHERE parLimpezaNaoConformidadeModeloID = ? ORDER BY ordem ASC`;
            const [resultBlock] = await db.promise().query(sqlBlock, [id]);

            const sqlItem = `
            SELECT i.*, pfmbi.*, a.nome AS alternativa
            -- (SELECT IF(COUNT(*) > 0, 1, 0)
            -- FROM limpeza_resposta AS fr
            -- WHERE fr.parLimpezaNaoConformidadeModeloBlocoID = pfmbi.parLimpezaNaoConformidadeModeloBlocoID AND fr.itemID = pfmbi.itemID) AS hasPending
            FROM par_limpeza_naoconformidade_modelo_bloco_item AS pfmbi 
                LEFT JOIN item AS i ON(pfmbi.itemID = i.itemID)
                LEFT JOIN alternativa AS a ON(i.alternativaID = a.alternativaID)
            WHERE pfmbi.parLimpezaNaoConformidadeModeloBlocoID = ?
                ORDER BY pfmbi.ordem ASC`

            //? Options
            const sqlOptionsItem = `SELECT itemID AS id, nome FROM item WHERE parFormularioID = 5 AND unidadeID = ? AND status = 1 ORDER BY nome ASC`;
            const [resultItem] = await db.promise().query(sqlOptionsItem, [unidadeID]);
            const objOptionsBlock = {
                itens: resultItem ?? [],
            };

            for (const item of resultBlock) {
                //? Departamentos que preenchem 
                const sqlDepartamentos = `
                SELECT 
                    prmbs.parLimpezaNaoConformidadeModeloBlocodepartamentoID,
                    s.departamentoID AS id, 
                    s.nome
                FROM par_limpeza_naoconformidade_modelo_bloco_departamento AS prmbs 
                    JOIN departamento AS s ON (prmbs.departamentoID = s.departamentoID)
                WHERE prmbs.parLimpezaNaoConformidadeModeloBlocoID = ?
                GROUP BY s.departamentoID
                ORDER BY s.nome ASC`
                const [resultDepartamentos] = await db.promise().query(sqlDepartamentos, [item.parLimpezaNaoConformidadeModeloBlocoID])

                const [resultItem] = await db.promise().query(sqlItem, [item.parLimpezaNaoConformidadeModeloBlocoID])

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
                    dados: {
                        ...item,
                        departamentos: resultDepartamentos ?? [],
                    },
                    itens: resultItem ?? [],
                    optionsBlock: objOptionsBlock
                };

                blocks.push(objData);
            }

            //? Options
            const objOptions = {
                itens: resultItem ?? [],
            };

            //? Orientações
            const sqlOrientacoes = `SELECT obs FROM par_formulario WHERE parFormularioID = 5`;
            const [resultOrientacoes] = await db.promise().query(sqlOrientacoes)

            const result = {
                model: resultModel[0],
                header: resultHeader ?? [],
                blocks: blocks ?? [],
                options: objOptions ?? [],
                orientations: resultOrientacoes[0] ?? null
            }

            return res.status(200).json(result)
        } catch (error) {
            return res.json({ message: 'Erro ao receber dados!' })
        }
    }

    async insertData(req, res) {
        try {
            const { unidadeID, usuarioID, model } = req.body

            if (!unidadeID || unidadeID == 'undefined') { return res.json({ message: 'Erro ao receber ID!' }) }

            const logID = await executeLog('Criação de modelo de não conformidade da Limpeza e Higienização', usuarioID, unidadeID, req)

            //? Model
            const sqlModel = `INSERT INTO par_limpeza_naoconformidade_modelo(nome, ciclo, cabecalho, unidadeID, status) VALUES(?, ?, ?, ?, ?)`
            const parLimpezaNaoConformidadeModeloID = await executeQuery(sqlModel, [model.nome, '0', model.cabecalho ?? '', unidadeID, (model.status ? 1 : 0)], 'insert', 'par_limpeza_naoconformidade_modelo', 'parLimpezaNaoConformidadeModeloID', null, logID)

            //? Insere departamentos que preenchem
            if (model && model.departamentosPreenchem && model.departamentosPreenchem.length > 0) {
                for (let i = 0; i < model.departamentosPreenchem.length; i++) {
                    if (model.departamentosPreenchem[i].id > 0) {
                        const sqlInsertDepartamentoModelo = `
                        INSERT INTO par_limpeza_naoconformidade_modelo_departamento(parLimpezaNaoConformidadeModeloID, departamentoID, tipo) 
                        VALUES (?, ?, ?)`
                        await executeQuery(sqlInsertDepartamentoModelo, [parLimpezaNaoConformidadeModeloID, model.departamentosPreenchem[i].id, 1], 'insert', 'par_limpeza_naoconformidade_modelo_departamento', 'parLimpezaNaoConformidadeModelodepartamentoID', null, logID)
                    }
                }
            }
            //? Insere departamentos que concluem
            if (model && model.departamentosConcluem && model.departamentosConcluem.length > 0) {
                for (let i = 0; i < model.departamentosConcluem.length; i++) {
                    if (model.departamentosConcluem[i].id > 0) {
                        const sqlInsertDepartamentoModelo = `
                        INSERT INTO par_limpeza_naoconformidade_modelo_departamento(parLimpezaNaoConformidadeModeloID, departamentoID, tipo) 
                        VALUES (?, ?, ?)`
                        await executeQuery(sqlInsertDepartamentoModelo, [parLimpezaNaoConformidadeModeloID, model.departamentosConcluem[i].id, 2], 'insert', 'par_limpeza_naoconformidade_modelo_departamento', 'parLimpezaNaoConformidadeModelodepartamentoID', null, logID)
                    }
                }
            }

            return res.status(200).json({ id: parLimpezaNaoConformidadeModeloID });

        } catch (error) {
            return res.json({ message: 'Erro ao receber dados!' })
        }
    }

    async updateData(req, res) {
        try {
            const { id, unidadeID, usuarioID, model, header, blocks, arrRemovedBlocks, arrRemovedItems, orientacoes } = req.body

            if (!id || id == 'undefined') { return res.json({ message: 'Erro ao receber ID!' }) }

            const logID = await executeLog('Edição do modelo de não conformidade da Limpeza e Higienização', usuarioID, unidadeID, req)

            //? Model
            const sqlModel = `
            UPDATE par_limpeza_naoconformidade_modelo
            SET nome = ?, cabecalho = ?, status = ?
            WHERE parLimpezaNaoConformidadeModeloID = ? `
            await executeQuery(sqlModel, [model?.nome, model?.cabecalho ?? '', (model?.status ? '1' : '0'), id], 'update', 'par_limpeza_naoconformidade_modelo', 'parLimpezaNaoConformidadeModeloID', id, logID)

            //? Atualiza departamentos que preenchem e concluem o modelo. tabela: par_limpeza_naoconformidade_modelo_departamento
            const sqlDeleteDepartamentosModelo = `DELETE FROM par_limpeza_naoconformidade_modelo_departamento WHERE parLimpezaNaoConformidadeModeloID = ?`
            await executeQuery(sqlDeleteDepartamentosModelo, [id], 'delete', 'par_limpeza_naoconformidade_modelo_departamento', 'parLimpezaNaoConformidadeModeloID', id, logID)

            //? Insere departamentos que preenchem
            if (model && model.departamentosPreenchem && model.departamentosPreenchem.length > 0) {
                for (let i = 0; i < model.departamentosPreenchem.length; i++) {
                    if (model.departamentosPreenchem[i].id > 0) {
                        const sqlInsertDepartamentoModelo = `
                        INSERT INTO par_limpeza_naoconformidade_modelo_departamento(parLimpezaNaoConformidadeModeloID, departamentoID, tipo) 
                        VALUES (?, ?, ?)`
                        await executeQuery(sqlInsertDepartamentoModelo, [id, model.departamentosPreenchem[i].id, 1], 'insert', 'par_limpeza_naoconformidade_modelo_departamento', 'parLimpezaNaoConformidadeModelodepartamentoID', null, logID)
                    }
                }
            }
            //? Insere departamentos que concluem
            if (model && model.departamentosConcluem && model.departamentosConcluem.length > 0) {
                for (let i = 0; i < model.departamentosConcluem.length; i++) {
                    if (model.departamentosConcluem[i].id > 0) {
                        const sqlInsertDepartamentoModelo = `
                        INSERT INTO par_limpeza_naoconformidade_modelo_departamento(parLimpezaNaoConformidadeModeloID, departamentoID, tipo) 
                        VALUES (?, ?, ?)`
                        await executeQuery(sqlInsertDepartamentoModelo, [id, model.departamentosConcluem[i].id, 2], 'insert', 'par_limpeza_naoconformidade_modelo_departamento', 'parLimpezaNaoConformidadeModelodepartamentoID', null, logID)
                    }
                }
            }

            //? Header
            header && header.forEach(async (item) => {
                if (item && item.mostra == true) {
                    // Verifica se já existe registro em "par_limpeza_unidade" para a limpeza e unidade
                    const sqlHeader = `
                    SELECT COUNT(*) AS count
                    FROM par_limpeza_naoconformidade_modelo_cabecalho AS plmc
                    WHERE plmc.parLimpezaNaoConformidadeModeloID = ? AND plmc.parLimpezaNaoConformidadeID = ? `
                    // Verifica numero de linhas do sql 
                    const [resultHeader] = await db.promise().query(sqlHeader, [id, item.parLimpezaNaoConformidadeID])

                    if (resultHeader[0].count > 0) { // Update
                        const sqlUpdate = `
                        UPDATE par_limpeza_naoconformidade_modelo_cabecalho
                        SET obrigatorio = ?, ordem = ?
                        WHERE parLimpezaNaoConformidadeModeloID = ? AND parLimpezaNaoConformidadeID = ? `
                        await executeQuery(sqlUpdate, [(item.obrigatorio ? '1' : '0'), (item.ordem ?? '0'), id, item.parLimpezaNaoConformidadeID], 'update', 'par_limpeza_naoconformidade_modelo_cabecalho', 'parLimpezaNaoConformidadeModeloID', id, logID)
                    } else {                            // Insert
                        const sqlInsert = `
                        INSERT INTO par_limpeza_naoconformidade_modelo_cabecalho(parLimpezaNaoConformidadeModeloID, parLimpezaNaoConformidadeID, obrigatorio, ordem)
                        VALUES(?, ?, ?, ?)`
                        await executeQuery(sqlInsert, [id, item.parLimpezaNaoConformidadeID, (item.obrigatorio ? '1' : '0'), (item.ordem ?? '0')], 'insert', 'par_limpeza_naoconformidade_modelo_cabecalho', 'parLimpezaNaoConformidadeModeloCabecalhoID', null, logID)
                    }
                } else if (item) { // Deleta
                    const sqlDelete = `
                    DELETE FROM par_limpeza_naoconformidade_modelo_cabecalho
                    WHERE parLimpezaNaoConformidadeModeloID = ? AND parLimpezaNaoConformidadeID = ? `
                    await executeQuery(sqlDelete, [id, item.parLimpezaNaoConformidadeID], 'delete', 'par_limpeza_naoconformidade_modelo_cabecalho', 'parLimpezaNaoConformidadeModeloID', id, logID)
                }
            })

            //? Blocos removidos
            for (const block of arrRemovedBlocks) {
                if (block && block > 0) {
                    const ids = arrRemovedBlocks.join(',')

                    // Itens do bloco
                    const sqlDeleteBlockItems = `DELETE FROM par_limpeza_naoconformidade_modelo_bloco_item WHERE parLimpezaNaoConformidadeModeloBlocoID = ?`
                    await executeQuery(sqlDeleteBlockItems, [block], 'delete', 'par_limpeza_naoconformidade_modelo_bloco_item', 'parLimpezaNaoConformidadeModeloBlocoID', block, logID)

                    // Departamentos do bloco
                    const sqlDeleteBlockDepartamentos = `DELETE FROM par_limpeza_naoconformidade_modelo_bloco_departamento WHERE parLimpezaNaoConformidadeModeloBlocoID IN (${ids})`
                    await executeQuery(sqlDeleteBlockDepartamentos, [block], 'delete', 'par_limpeza_naoconformidade_modelo_bloco_departamento', 'parLimpezaNaoConformidadeModeloBlocoID', block, logID)

                    // Blocos
                    const sqlDeleteBlock = `DELETE FROM par_limpeza_naoconformidade_modelo_bloco WHERE parLimpezaNaoConformidadeModeloBlocoID = ?`
                    await executeQuery(sqlDeleteBlock, [block], 'delete', 'par_limpeza_naoconformidade_modelo_bloco', 'parLimpezaNaoConformidadeModeloBlocoID', block, logID)
                }
            }

            //? Itens removidos dos blocos 
            if (arrRemovedItems && arrRemovedItems.length > 0) {
                for (const item of arrRemovedItems) {
                    if (item) {
                        const sqlDelete = `DELETE FROM par_limpeza_naoconformidade_modelo_bloco_item WHERE parLimpezaNaoConformidadeModeloBlocoItemID = ?`
                        await executeQuery(sqlDelete, [item], 'delete', 'par_limpeza_naoconformidade_modelo_bloco_item', 'parLimpezaNaoConformidadeModeloBlocoItemID', item, logID)
                    }
                }
            }

            //? Blocos 
            blocks && blocks.forEach(async (block, index) => {
                if (block) {
                    if (block.dados.parLimpezaNaoConformidadeModeloBlocoID && parseInt(block.dados.parLimpezaNaoConformidadeModeloBlocoID) > 0) {
                        //? Bloco já existe, Update
                        const sqlUpdateBlock = `
                        UPDATE par_limpeza_naoconformidade_modelo_bloco
                        SET ordem = ?, nome = ?, obs = ?, status = ?
                        WHERE parLimpezaNaoConformidadeModeloBlocoID = ? `
                        const resultUpdateBlock = await executeQuery(sqlUpdateBlock, [block.dados.ordem,
                        block.dados.nome,
                        (block.dados.obs ? 1 : 0),
                        (block.dados.status ? 1 : 0),
                        block.dados.parLimpezaNaoConformidadeModeloBlocoID], 'update', 'par_limpeza_naoconformidade_modelo_bloco', 'parLimpezaNaoConformidadeModeloID', id, logID)
                        if (!resultUpdateBlock) { return res.json(err); }

                        //? Departamentos do bloco 
                        // deleta
                        const sqlDelete = `DELETE FROM par_limpeza_naoconformidade_modelo_bloco_departamento WHERE parLimpezaNaoConformidadeModeloBlocoID = ?`
                        await executeQuery(sqlDelete, [block.dados.parLimpezaNaoConformidadeModeloBlocoID], 'delete', 'par_limpeza_naoconformidade_modelo_bloco_departamento', 'parLimpezaNaoConformidadeModeloBlocoID', block.dados.parLimpezaNaoConformidadeModeloBlocoID, logID)
                        // insere novamente 
                        block.dados.departamentos && block.dados.departamentos.forEach(async (departamento, indexDepartamento) => {
                            if (departamento && departamento.id && departamento.id > 0) {
                                const sqlInsert = `INSERT INTO par_limpeza_naoconformidade_modelo_bloco_departamento(parLimpezaNaoConformidadeModeloBlocoID, departamentoID) VALUES (?, ?)`
                                await executeQuery(sqlInsert, [block.dados.parLimpezaNaoConformidadeModeloBlocoID, departamento.id], 'insert', 'par_limpeza_naoconformidade_modelo_bloco_departamento', 'parLimpezaNaoConformidadeModeloBlocoID', id, logID)
                            }
                        })
                    } else {
                        //? Bloco novo, Insert
                        const sqlNewBlock = `
                        INSERT INTO par_limpeza_naoconformidade_modelo_bloco(parLimpezaNaoConformidadeModeloID, ordem, nome, obs, unidadeID, status)
                        VALUES(?, ?, ?, ?, ?, ?)`
                        const dataNewBlock = [
                            id,
                            block.dados.ordem,
                            block.dados.nome,
                            (block.dados.obs ? 1 : 0),
                            unidadeID,
                            (block.dados.status ? 1 : 0)
                        ]
                        const modeloBlocoID = await executeQuery(sqlNewBlock, dataNewBlock, 'insert', 'par_limpeza_naoconformidade_modelo_bloco', 'parLimpezaNaoConformidadeModeloBlocoID', null, logID)
                        if (!modeloBlocoID) { return res.json(err); }
                        block.dados.parLimpezaNaoConformidadeModeloBlocoID = modeloBlocoID //? parLimpezaNaoConformidadeModeloBlocoID que acabou de ser gerado

                        //? Departamentos do bloco
                        block.dados.departamentos && block.dados.departamentos.forEach(async (departamento, indexDepartamento) => {
                            if (departamento && departamento.id && departamento.id > 0) {
                                const sqlInsert = `INSERT INTO par_limpeza_naoconformidade_modelo_bloco_departamento(parLimpezaNaoConformidadeModeloBlocoID, departamentoID) VALUES (?, ?)`
                                await executeQuery(sqlInsert, [modeloBlocoID, departamento.id], 'insert', 'par_limpeza_naoconformidade_modelo_bloco_departamento', 'parLimpezaNaoConformidadeModeloBlocoID', id, logID)
                            }
                        })
                    }

                    //? Itens 
                    block.itens && block.itens.forEach(async (item, indexItem) => {
                        if (item && item.parLimpezaNaoConformidadeModeloBlocoItemID && item.parLimpezaNaoConformidadeModeloBlocoItemID > 0) { //? Update                                
                            const sqlUpdate = `
                            UPDATE par_limpeza_naoconformidade_modelo_bloco_item
                            SET ordem = ?, ${item.item.id ? 'itemID = ?, ' : ''} obs = ?, obrigatorio = ?, status = ?
                            WHERE parLimpezaNaoConformidadeModeloBlocoItemID = ? `

                            await executeQuery(sqlUpdate, [item.ordem,
                            ...(item.item.id ? [item.item.id] : []),
                            (item.obs ? 1 : 0),
                            (item.obrigatorio ? 1 : 0),
                            (item.status ? 1 : 0),
                            item.parLimpezaNaoConformidadeModeloBlocoItemID], 'update', 'par_limpeza_naoconformidade_modelo_bloco_item', 'parLimpezaNaoConformidadeModeloBlocoID', id, logID)
                        } else if (item && item.new && !item.parLimpezaNaoConformidadeModeloBlocoItemID) { //? Insert       
                            // Valida duplicidade do item 
                            const sqlItem = `
                            SELECT COUNT(*) AS count
                            FROM par_limpeza_naoconformidade_modelo_bloco_item AS plmbi
                            WHERE plmbi.parLimpezaNaoConformidadeModeloBlocoID = ? AND plmbi.itemID = ? `
                            const [resultItem] = await db.promise().query(sqlItem, [block.dados.parLimpezaNaoConformidadeModeloBlocoID, item.item.id])
                            if (resultItem[0].count === 0) {  // Pode inserir
                                const sqlInsert = `
                                INSERT INTO par_limpeza_naoconformidade_modelo_bloco_item(parLimpezaNaoConformidadeModeloBlocoID, ordem, itemID, obs, obrigatorio, status)
                                VALUES(?, ?, ?, ?, ?, ?)`

                                await executeQuery(sqlInsert, [block.dados.parLimpezaNaoConformidadeModeloBlocoID,
                                item.ordem,
                                item.item.id,
                                (item.obs ? 1 : 0),
                                (item.obrigatorio ? 1 : 0),
                                (item.status ? 1 : 0)], 'insert', 'par_limpeza_naoconformidade_modelo_bloco_item', 'parLimpezaNaoConformidadeModeloBlocoItemID', null, logID)
                            }
                        }
                    })
                }
            })

            //? Orientações
            const sqlOrientacoes = `
            UPDATE par_formulario
            SET obs = ?
            WHERE parFormularioID = 5`
            const [resultOrientacoes] = await db.promise().query(sqlOrientacoes, [orientacoes?.obs])

            await executeQuery(sqlOrientacoes, [orientacoes?.obs], 'update', 'par_formulario', 'parFormularioID', 5, logID)

            res.status(200).json({ message: "Dados atualizados com sucesso." });

        } catch (error) {
            return res.json({ message: 'Erro ao receber dados!' })
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['par_limpeza_naoconformidade_modelo_cabecalho', 'par_limpeza_naoconformidade_modelo'],
            column: 'parLimpezaNaoConformidadeModeloID'
        }

        const arrPending = [
            {
                table: 'limpeza_naoconformidade',
                column: ['parLimpezaNaoConformidadeModeloID',],
            },

        ]

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de modelo de não conformidade da Limpeza e Higienização', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    // Deleta de par_limpeza_naoconformidade_modelo_bloco_item
                    const sqlModeloBloco = `SELECT parLimpezaNaoConformidadeModeloBlocoID FROM par_limpeza_naoconformidade_modelo_bloco WHERE parLimpezaNaoConformidadeModeloID = ?`
                    const [resultModeloBloco] = await db.promise().query(sqlModeloBloco, [id])

                    if (resultModeloBloco && resultModeloBloco.length > 0) {
                        for (const bloco of resultModeloBloco) {
                            // Deleta de par_limpeza_naoconformidade_modelo_bloco_item
                            const sqlModeloBlocoItem = `DELETE FROM par_limpeza_naoconformidade_modelo_bloco_item WHERE parLimpezaNaoConformidadeModeloBlocoID = ?`;
                            await db.promise().query(sqlModeloBlocoItem, [bloco.parLimpezaNaoConformidadeModeloBlocoID]);

                            // Deleta de par_limpeza_naoconformidade_modelo_bloco_departamento 
                            const sqlModeloBlocoDepartamento = `DELETE FROM par_limpeza_naoconformidade_modelo_bloco_departamento WHERE parLimpezaNaoConformidadeModeloBlocoID = ?`;
                            await db.promise().query(sqlModeloBlocoDepartamento, [bloco.parLimpezaNaoConformidadeModeloBlocoID]);

                            // Deleta de par_limpeza_naoconformidade_modelo_bloco
                            const sqlModeloBloco = `DELETE FROM par_limpeza_naoconformidade_modelo_bloco WHERE parLimpezaNaoConformidadeModeloBlocoID = ?`;
                            await db.promise().query(sqlModeloBloco, [bloco.parLimpezaNaoConformidadeModeloBlocoID]);
                        }
                    }

                    // Deleta de par_limpeza_naoconformidade_modelo_departamento
                    const sqlModeloDepartamento = `DELETE FROM par_limpeza_naoconformidade_modelo_departamento WHERE parLimpezaNaoConformidadeModeloID = ?`;
                    await db.promise().query(sqlModeloDepartamento, [id]);

                    const logID = await executeLog('Exclusão de modelo de Não conformidade do Recebimento de MP', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}

module.exports = LimpezaNaoConformidadeController;