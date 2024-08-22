const db = require('../../../../config/db');
const fs = require('fs');
const path = require('path');
const { hasPending, deleteItem } = require('../../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../../config/executeQuery');
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
        const { id } = req.params;
        const { unidadeID } = req.body;

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
            SELECT pf.*, 
                (SELECT COUNT(*)
                FROM par_limpeza_modelo AS pfm 
                    JOIN par_limpeza_modelo_cabecalho AS pfmc ON (pfm.parLimpezaModeloID = pfmc.parLimpezaModeloID)
                WHERE pfmc.parLimpezaID = pf.parLimpezaID AND pfm.parLimpezaModeloID = ${id}
                LIMIT 1
                ) AS mostra, 
                
                COALESCE((SELECT pfmc.obrigatorio
                FROM par_limpeza_modelo AS pfm 
                    JOIN par_limpeza_modelo_cabecalho AS pfmc ON (pfm.parLimpezaModeloID = pfmc.parLimpezaModeloID)
                WHERE pfmc.parLimpezaID = pf.parLimpezaID AND pfm.parLimpezaModeloID = ${id}
                LIMIT 1
                ), 0) AS obrigatorio,

                COALESCE((SELECT pfmc.ordem
                FROM par_limpeza_modelo AS pfm 
                    JOIN par_limpeza_modelo_cabecalho AS pfmc ON (pfm.parLimpezaModeloID = pfmc.parLimpezaModeloID)
                WHERE pfmc.parLimpezaID = pf.parLimpezaID AND pfm.parLimpezaModeloID = ${id}
                LIMIT 1
                ), 100) AS ordem
            FROM par_limpeza AS pf
            ORDER BY 
                COALESCE((SELECT pfmc.ordem
                    FROM par_limpeza_modelo AS pfm 
                        JOIN par_limpeza_modelo_cabecalho AS pfmc ON (pfm.parLimpezaModeloID = pfmc.parLimpezaModeloID)
                    WHERE pfmc.parLimpezaID = pf.parLimpezaID AND pfm.parLimpezaModeloID = ${id}
                    LIMIT 1
                ), 100) ASC`;
            const [resultHeader] = await db.promise().query(sqlHeader);

            //? Blocks
            const blocks = [];
            const sqlBlock = `SELECT * FROM par_limpeza_modelo_bloco WHERE parLimpezaModeloID = ? ORDER BY ordem ASC`;
            const [resultBlock] = await db.promise().query(sqlBlock, [id]);

            const sqlItem = `
            SELECT i.*, pfmbi.*, a.nome AS alternativa, 
                (SELECT IF(COUNT(*) > 0, 1, 0)
                FROM limpeza_resposta AS fr 
                WHERE fr.parLimpezaModeloBlocoID = pfmbi.parLimpezaModeloBlocoID AND fr.itemID = pfmbi.itemID) AS hasPending
            FROM par_limpeza_modelo_bloco_item AS pfmbi 
                LEFT JOIN item AS i ON (pfmbi.itemID = i.itemID)
                LEFT JOIN alternativa AS a ON (i.alternativaID = a.alternativaID)
            WHERE pfmbi.parLimpezaModeloBlocoID = ?
            ORDER BY pfmbi.ordem ASC`

            //? Options
            const sqlOptionsItem = `SELECT itemID AS id, nome FROM item WHERE parFormularioID = 4 AND unidadeID = ? AND status = 1 ORDER BY nome ASC`;
            const [resultItem] = await db.promise().query(sqlOptionsItem, [unidadeID]);
            const objOptionsBlock = {
                itens: resultItem ?? [],
            };

            for (const item of resultBlock) {
                //? Setores que preenchem 
                const sqlSetores = `
                SELECT 
                    plmbs.parLimpezaModeloBlocoSetorID,
                    s.setorID AS id, 
                    s.nome
                FROM par_limpeza_modelo_bloco_setor AS plmbs 
                    JOIN setor AS s ON (plmbs.setorID = s.setorID)
                WHERE plmbs.parLimpezaModeloBlocoID = ?
                GROUP BY s.setorID
                ORDER BY s.nome ASC`
                const [resultSetores] = await db.promise().query(sqlSetores, [item.parLimpezaModeloBlocoID])

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
                    dados: {
                        ...item,
                        setores: resultSetores ?? [],
                    },
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
            const sqlOrientacoes = `SELECT obs FROM par_formulario WHERE parFormularioID = 4`;
            const [resultOrientacoes] = await db.promise().query(sqlOrientacoes)

            const result = {
                model: resultModel[0],
                header: resultHeader ?? [],
                blocks: blocks.length > 0 ? blocks : [{
                    dados: { ordem: 1, nome: 'Itens', status: 1 },
                    categorias: [],
                    atividades: [],
                    optionsBlock: objOptionsBlock,
                    itens: [{
                        parFormularioID: 4,
                        new: true,
                        ordem: '1',
                        nome: '',
                        status: 1,
                        item: null
                    }]
                }],
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

            const logID = await executeLog('Criação modelo de limpeza', usuarioID, unidadeID, req)

            //? Model
            const sqlModel = `INSERT INTO par_limpeza_modelo(nome, ciclo, cabecalho, unidadeID, status) VALUES (?, ?, ?, ?, ?)`
            const parLimpezaModeloID = await executeQuery(sqlModel, [model.nome, model.ciclo, model.cabecalho ?? '', unidadeID, (model.status ? 1 : 0)], 'insert', 'par_limpeza_modelo', 'parLimpezaModeloID', null, logID)

            //? Insere setores que preenchem
            if (model && model.setoresPreenchem && model.setoresPreenchem.length > 0) {
                for (let i = 0; i < model.setoresPreenchem.length; i++) {
                    if (model.setoresPreenchem[i].id > 0) {
                        const sqlInsertSetorModelo = `
                        INSERT INTO par_limpeza_modelo_setor(parLimpezaModeloID, setorID, tipo) 
                        VALUES (?, ?, ?)`
                        await executeQuery(sqlInsertSetorModelo, [parLimpezaModeloID, model.setoresPreenchem[i].id, 1], 'insert', 'par_limpeza_modelo_setor', 'parLimpezaModeloSetorID', null, logID)
                    }
                }
            }
            //? Insere setores que concluem
            if (model && model.setoresConcluem && model.setoresConcluem.length > 0) {
                for (let i = 0; i < model.setoresConcluem.length; i++) {
                    if (model.setoresConcluem[i].id > 0) {
                        const sqlInsertSetorModelo = `
                        INSERT INTO par_limpeza_modelo_setor(parLimpezaModeloID, setorID, tipo) 
                        VALUES (?, ?, ?)`
                        await executeQuery(sqlInsertSetorModelo, [parLimpezaModeloID, model.setoresConcluem[i].id, 2], 'insert', 'par_limpeza_modelo_setor', 'parLimpezaModeloSetorID', null, logID)
                    }
                }
            }

            return res.status(200).json({ id: parLimpezaModeloID });

        } catch (error) {
            return res.json({ message: 'Erro ao receber dados!' })
        }
    }

    async updateData(req, res) {
        try {
            const { id, unidadeID, usuarioID, model, header, blocks, arrRemovedBlocks, arrRemovedItems, orientacoes } = req.body

            if (!id || id == 'undefined') { return res.json({ message: 'Erro ao receber ID!' }) }

            const logID = await executeLog('Edição modelo de limpeza', usuarioID, unidadeID, req)

            //? Model
            const sqlModel = `
            UPDATE par_limpeza_modelo
            SET nome = ?, ciclo = ?, cabecalho = ?, status = ?
            WHERE parLimpezaModeloID = ?`
            await executeQuery(sqlModel, [model?.nome, model?.ciclo, model?.cabecalho ?? '', (model?.status ? '1' : '0'), id], 'update', 'par_limpeza_modelo', 'parLimpezaModeloID', id, logID)

            //? Atualiza setores que preenchem e concluem o modelo. tabela: par_limpeza_modelo_setor
            const sqlDeleteSetoresModelo = `DELETE FROM par_limpeza_modelo_setor WHERE parLimpezaModeloID = ?`
            await executeQuery(sqlDeleteSetoresModelo, [id], 'delete', 'par_limpeza_modelo_setor', 'parLimpezaModeloID', id, logID)

            //? Insere setores que preenchem
            if (model && model.setoresPreenchem && model.setoresPreenchem.length > 0) {
                for (let i = 0; i < model.setoresPreenchem.length; i++) {
                    if (model.setoresPreenchem[i].id > 0) {
                        const sqlInsertSetorModelo = `
                        INSERT INTO par_limpeza_modelo_setor(parLimpezaModeloID, setorID, tipo) 
                        VALUES (?, ?, ?)`
                        await executeQuery(sqlInsertSetorModelo, [id, model.setoresPreenchem[i].id, 1], 'insert', 'par_limpeza_modelo_setor', 'parLimpezaModeloSetorID', null, logID)
                    }
                }
            }
            //? Insere setores que concluem
            if (model && model.setoresConcluem && model.setoresConcluem.length > 0) {
                for (let i = 0; i < model.setoresConcluem.length; i++) {
                    if (model.setoresConcluem[i].id > 0) {
                        const sqlInsertSetorModelo = `
                        INSERT INTO par_limpeza_modelo_setor(parLimpezaModeloID, setorID, tipo) 
                        VALUES (?, ?, ?)`
                        await executeQuery(sqlInsertSetorModelo, [id, model.setoresConcluem[i].id, 2], 'insert', 'par_limpeza_modelo_setor', 'parLimpezaModeloSetorID', null, logID)
                    }
                }
            }

            //? Atualiza profissionais que aprovam e assinam o modelo. tabela: par_limpeza_modelo_profissional
            const sqlDeleteProfissionaisModelo = `DELETE FROM par_limpeza_modelo_profissional WHERE parLimpezaModeloID = ?`
            await executeQuery(sqlDeleteProfissionaisModelo, [id], 'delete', 'par_limpeza_modelo_profissional', 'parLimpezaModeloID', id, logID)

            //? Insere profissionais que preenchem
            if (model && model.profissionaisPreenchem && model.profissionaisPreenchem.length > 0) {
                for (let i = 0; i < model.profissionaisPreenchem.length; i++) {
                    if (model.profissionaisPreenchem[i].id > 0) {
                        const sqlInsertProfissionalModelo = `
                        INSERT INTO par_limpeza_modelo_profissional(parLimpezaModeloID, profissionalID, tipo) 
                        VALUES (?, ?, ?)`
                        await executeQuery(sqlInsertProfissionalModelo, [id, model.profissionaisPreenchem[i].id, 1], 'insert', 'par_limpeza_modelo_profissional', 'parLimpezaModeloProfissionalID', null, logID)
                    }
                }
            }

            //? Insere profissionais que aprovam
            if (model && model.profissionaisAprovam && model.profissionaisAprovam.length > 0) {
                for (let i = 0; i < model.profissionaisAprovam.length; i++) {
                    if (model.profissionaisAprovam[i].id > 0) {
                        const sqlInsertProfissionalModelo = `
                        INSERT INTO par_limpeza_modelo_profissional(parLimpezaModeloID, profissionalID, tipo) 
                        VALUES (?, ?, ?)`
                        await executeQuery(sqlInsertProfissionalModelo, [id, model.profissionaisAprovam[i].id, 2], 'insert', 'par_limpeza_modelo_profissional', 'parLimpezaModeloProfissionalID', null, logID)
                    }
                }
            }

            //? Header
            header && header.forEach(async (item) => {
                if (item && item.mostra == true) {
                    // Verifica se já existe registro em "par_limpeza_unidade" para a limpeza e unidade
                    const sqlHeader = `
                    SELECT COUNT(*) AS count
                    FROM par_limpeza_modelo_cabecalho AS plmc
                    WHERE plmc.parLimpezaModeloID = ? AND plmc.parLimpezaID = ?`
                    // Verifica numero de linhas do sql 
                    const [resultHeader] = await db.promise().query(sqlHeader, [id, item.parLimpezaID])

                    if (resultHeader[0].count > 0) { // Update
                        const sqlUpdate = `
                        UPDATE par_limpeza_modelo_cabecalho
                        SET obrigatorio = ?, ordem = ?
                        WHERE parLimpezaModeloID = ? AND parLimpezaID = ?`
                        await executeQuery(sqlUpdate, [(item.obrigatorio ? '1' : '0'), (item.ordem ?? '0'), id, item.parLimpezaID], 'update', 'par_limpeza_modelo_cabecalho', 'parLimpezaModeloID', id, logID)
                    } else {                            // Insert
                        const sqlInsert = `
                        INSERT INTO par_limpeza_modelo_cabecalho (parLimpezaModeloID, parLimpezaID, obrigatorio, ordem)
                        VALUES (?, ?, ?, ?)`
                        await executeQuery(sqlInsert, [id, item.parLimpezaID, (item.obrigatorio ? '1' : '0'), (item.ordem ?? '0')], 'insert', 'par_limpeza_modelo_cabecalho', 'parLimpezaModeloCabecalhoID', null, logID)
                    }
                } else if (item) { // Deleta
                    const sqlDelete = `
                    DELETE FROM par_limpeza_modelo_cabecalho
                    WHERE parLimpezaModeloID = ? AND parLimpezaID = ?`
                    await executeQuery(sqlDelete, [id, item.parLimpezaID], 'delete', 'par_limpeza_modelo_cabecalho', 'parLimpezaModeloID', id, logID)
                }
            })

            //? Blocos removidos
            arrRemovedBlocks && arrRemovedBlocks.length > 0 && arrRemovedBlocks.forEach(async (block) => {
                if (block && block > 0) {
                    const ids = arrRemovedBlocks.join(',')

                    // Blocos
                    const sqlDeleteBlock = `DELETE FROM par_limpeza_modelo_bloco WHERE parLimpezaModeloBlocoID = ?`
                    await executeQuery(sqlDeleteBlock, [block], 'delete', 'par_limpeza_modelo_bloco', 'parLimpezaModeloID', id, logID)

                    // Itens do bloco
                    const sqlDeleteBlockItems = `DELETE FROM par_limpeza_modelo_bloco_item WHERE parLimpezaModeloBlocoID = ?`
                    await executeQuery(sqlDeleteBlockItems, [block], 'delete', 'par_limpeza_modelo_bloco_item', 'parLimpezaModeloBlocoID', id, logID)

                    // Setores do bloco
                    const sqlDeleteBlockSetores = `DELETE FROM par_limpeza_modelo_bloco_setor WHERE parLimpezaModeloBlocoID IN (${ids})`
                    await executeQuery(sqlDeleteBlockSetores, [], 'delete', 'par_limpeza_modelo_bloco_setor', 'parLimpezaModeloBlocoID', id, logID)
                }
            })

            //? Itens removidos dos blocos (?)
            arrRemovedItems && arrRemovedItems.forEach(async (item) => {
                if (item) {
                    const sqlDelete = `DELETE FROM par_limpeza_modelo_bloco_item WHERE parLimpezaModeloBlocoItemID = ?`
                    await executeQuery(sqlDelete, [item], 'delete', 'par_limpeza_modelo_bloco_item', 'parLimpezaModeloBlocoItemID', id, logID)
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
                        const resultUpdateBlock = await executeQuery(sqlUpdateBlock, [block.dados.ordem,
                        block.dados.nome,
                        (block.dados.obs ? 1 : 0),
                        (block.dados.status ? 1 : 0),
                        block.dados.parLimpezaModeloBlocoID], 'update', 'par_limpeza_modelo_bloco', 'parLimpezaModeloID', id, logID)
                        if (!resultUpdateBlock) { return res.json(err); }

                        //? Setores do bloco 
                        // deleta
                        const sqlDelete = `DELETE FROM par_limpeza_modelo_bloco_setor WHERE parLimpezaModeloBlocoID = ?`
                        await executeQuery(sqlDelete, [block.dados.parLimpezaModeloBlocoID], 'delete', 'par_limpeza_modelo_bloco_setor', 'parLimpezaModeloBlocoID', id, logID)
                        // insere novamente 
                        block.dados.setores && block.dados.setores.forEach(async (setor, indexSetor) => {
                            if (setor && setor.id && setor.id > 0) {
                                const sqlInsert = `INSERT INTO par_limpeza_modelo_bloco_setor(parLimpezaModeloBlocoID, setorID) VALUES (?, ?)`
                                await executeQuery(sqlInsert, [block.dados.parLimpezaModeloBlocoID, setor.id], 'insert', 'par_limpeza_modelo_bloco_setor', 'parLimpezaModeloBlocoID', id, logID)
                            }
                        })
                    } else {
                        //? Bloco novo, Insert
                        const sqlNewBlock = `
                        INSERT INTO par_limpeza_modelo_bloco(parLimpezaModeloID, ordem, nome, obs, unidadeID, status) 
                        VALUES (?, ?, ?, ?, ?, ?)`

                        const resultNewBlock = await executeQuery(sqlNewBlock, [
                            id,
                            block.dados.ordem,
                            block.dados.nome,
                            (block.dados.obs ? 1 : 0),
                            unidadeID,
                            (block.dados.status ? 1 : 0)
                        ], 'insert', 'par_limpeza_modelo_bloco', 'parLimpezaModeloBlocoID', null, logID)

                        if (!resultNewBlock) { return res.json(err); }
                        block.dados.parLimpezaModeloBlocoID = resultNewBlock //? parLimpezaModeloBlocoID que acabou de ser gerado

                        //? Setores do bloco
                        block.dados.setores && block.dados.setores.forEach(async (setor, indexSetor) => {
                            if (setor && setor.id && setor.id > 0) {
                                const sqlInsert = `INSERT INTO par_limpeza_modelo_bloco_setor(parLimpezaModeloBlocoID, setorID) VALUES (?, ?)`
                                await executeQuery(sqlInsert, [resultNewBlock, setor.id], 'insert', 'par_limpeza_modelo_bloco_setor', 'parLimpezaModeloBlocoID', id, logID)
                            }
                        })
                    }

                    //? Itens 
                    block.itens && block.itens.forEach(async (item, indexItem) => {
                        if (item && item.parLimpezaModeloBlocoItemID && item.parLimpezaModeloBlocoItemID > 0) { //? Update                                
                            const sqlUpdate = `
                            UPDATE par_limpeza_modelo_bloco_item
                            SET ordem = ?, ${item.item.id ? 'itemID = ?, ' : ''} obs = ?, obrigatorio = ?, status = ?
                            WHERE parLimpezaModeloBlocoItemID = ?`

                            await executeQuery(sqlUpdate, [item.ordem,
                            ...(item.item.id ? [item.item.id] : []),
                            (item.obs ? 1 : 0),
                            (item.obrigatorio ? 1 : 0),
                            (item.status ? 1 : 0),
                            item.parLimpezaModeloBlocoItemID], 'update', 'par_limpeza_modelo_bloco_item', 'parLimpezaModeloBlocoID', id, logID)

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

                                await executeQuery(sqlInsert, [block.dados.parLimpezaModeloBlocoID,
                                item.ordem,
                                item.item.id,
                                (item.obs ? 1 : 0),
                                (item.obrigatorio ? 1 : 0),
                                (item.status ? 1 : 0)], 'insert', 'par_limpeza_modelo_bloco_item', 'parLimpezaModeloBlocoItemID', null, logID)
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

            await executeQuery(sqlOrientacoes, [orientacoes?.obs], 'update', 'par_formulario', 'parFormularioID', 4, logID)

            res.status(200).json({ message: "Dados atualizados com sucesso." });

        } catch (error) {
            return res.json({ message: 'Erro ao receber dados!' })
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
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
            const logID = await executeLog('Exclusão de modelo de limpeza', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de modelo de limpeza', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}

module.exports = LimpezaController;