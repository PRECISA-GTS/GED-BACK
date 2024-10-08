const db = require('../../../../config/db');
const fs = require('fs');
const path = require('path');
const { gerarSenhaCaracteresIniciais, criptoMd5, hasPending, deleteItem, removeSpecialCharts } = require('../../../../config/defaultConfig');
const sendMailConfig = require('../../../../config/email');
const { executeQuery, executeLog } = require('../../../../config/executeQuery');
const { getDynamicBlocks, updateDynamicBlocks, insertDynamicBlocks } = require('../../../../defaults/dynamicBlocks');
const { getDynamicHeaderFields } = require('../../../../defaults/dynamicFields');
const { formatFieldsToTable, addFormStatusMovimentation, floatToFractioned, fractionedToFloat, getDateNow, getTimeNow } = require('../../../../defaults/functions');
const { createScheduling, deleteScheduling, updateScheduling, updateStatusScheduling } = require('../../../../defaults/scheduling');
const { getHeaderDepartments } = require('../../../../defaults/sector/getSectors');

class NaoConformidade {
    async getList(req, res) {
        const { unidadeID, papelID, usuarioID, limpezaID } = req.body;

        try {
            if (!unidadeID || !papelID || !limpezaID) return res.status(400).json({ error: 'Unidade não informada!' })

            const sql = `
            SELECT 
                ln.limpezaNaoConformidadeID AS id, 
                IF(MONTH(ln.data) > 0, DATE_FORMAT(ln.data, "%d/%m/%Y"), '--') AS data,       
                l.limpezaID,      
                COALESCE(GROUP_CONCAT(e.nome SEPARATOR ', '), '--') AS equipamentos,
                s.statusID,
                s.nome AS status,
                s.cor            
            FROM limpeza_naoconformidade AS ln
                JOIN limpeza AS l ON (l.limpezaID = ln.limpezaID)                
                JOIN status AS s ON (ln.status = s.statusID)
    
                LEFT JOIN limpeza_naoconformidade_equipamento AS lne ON (ln.limpezaNaoConformidadeID = lne.limpezaNaoConformidadeID)
                LEFT JOIN limpeza_equipamento AS le ON (lne.limpezaEquipamentoID = le.limpezaEquipamentoID)
                LEFT JOIN equipamento AS e ON (le.equipamentoID = e.equipamentoID)
            WHERE ln.unidadeID = ? AND ln.limpezaID = ?
            GROUP BY ln.limpezaNaoConformidadeID
            ORDER BY ln.data DESC, ln.status ASC`
            const [result] = await db.promise().query(sql, [unidadeID, limpezaID])

            return res.json(result);
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async getModels(req, res) {
        const { unidadeID } = req.body
        try {
            if (!unidadeID) return res.status(400).json({ error: 'Unidade não informada!' })

            const sql = `
            SELECT parLimpezaNaoConformidadeModeloID AS id, nome
            FROM par_limpeza_naoconformidade_modelo
            WHERE unidadeID = ? AND status = 1
            ORDER BY nome ASC`
            const [result] = await db.promise().query(sql, [unidadeID])
            return res.json(result);

        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async getData(req, res) {
        let { id, modelID, limpezaID, unidadeID, papelID } = req.body

        try {
            if (!unidadeID || !papelID) return res.status(400).json({ error: 'Unidade não informada!' })
            if (!id && !limpezaID) return res.status(204).json({ error: 'Limpeza não informada!' })

            let result = []
            let modeloID = modelID //? Quando vem de um formulário NOVO

            if (id && id > 0) {
                const sql = `
                SELECT 
                    ln.limpezaID, 
                    ln.parLimpezaNaoConformidadeModeloID AS modeloID,
                    DATE_FORMAT(ln.data, "%Y-%m-%d") AS data,
                    DATE_FORMAT(ln.data, "%H:%i") AS hora,
                    ln.limpezaNaoConformidadeID AS id, 
                    ln.descricao, 
                    ln.prazoSolucao,
                    ln.status,
                    plnm.parLimpezaNaoConformidadeModeloID AS modeloID,
                    plnm.nome AS modelo,
                    s.statusID,
                    s.nome AS statusNome,
                    s.cor AS statusCor,

                    (SELECT COUNT(*)
                    FROM limpeza_naoconformidade AS lni
                    WHERE lni.limpezaID = ln.limpezaID) AS totalNc
                FROM limpeza_naoconformidade AS ln
                    JOIN par_limpeza_naoconformidade_modelo AS plnm ON (ln.parLimpezaNaoConformidadeModeloID = plnm.parLimpezaNaoConformidadeModeloID)
                    LEFT JOIN status AS s ON (ln.status = s.statusID)    
                WHERE ln.limpezaNaoConformidadeID = ? AND ln.unidadeID = ?
                ORDER BY ln.data DESC, ln.status ASC`
                const [rows] = await db.promise().query(sql, [id, unidadeID])

                result = rows
                modeloID = rows[0]?.modeloID
                limpezaID = rows[0]?.limpezaID
            }

            const sqlModelo = `
            SELECT parLimpezaNaoConformidadeModeloID AS id, nome
            FROM par_limpeza_naoconformidade_modelo
            WHERE parLimpezaNaoConformidadeModeloID = ?`
            const [resultModelo] = await db.promise().query(sqlModelo, [modeloID])

            const sqlLimpeza = `
            SELECT 
                l.limpezaID,
                DATE_FORMAT(l.dataInicio, "%d/%m/%Y %H:%i") AS dataInicio,
                DATE_FORMAT(l.dataFim, "%d/%m/%Y %H:%i") AS dataFim,                
                plm.nome AS modelo,
                se.nome AS setor,
                s.nome AS status,
                s.cor AS statusCor
            FROM limpeza AS l
                JOIN par_limpeza_modelo AS plm ON (l.parLimpezaModeloID = plm.parLimpezaModeloID)
                JOIN status AS s ON (l.status = s.statusID)    
                LEFT JOIN setor AS se ON (se.setorID = l.setorID)
            WHERE l.limpezaID = ?`
            const [resultLimpeza] = await db.promise().query(sqlLimpeza, [limpezaID])

            const sqlEquipamentos = `
            SELECT
                le.limpezaEquipamentoID,
                e.equipamentoID AS id,
                e.nome,

                (SELECT IF(COUNT(*) > 0, 1, 0)
                FROM limpeza_naoconformidade_equipamento AS lne
                    JOIN limpeza_naoconformidade AS ln ON (lne.limpezaNaoConformidadeID = ln.limpezaNaoConformidadeID)
                WHERE ln.limpezaNaoConformidadeID = ? AND lne.limpezaEquipamentoID = le.limpezaEquipamentoID
                ) AS checked_,
                 
                (SELECT lne.descricao
                FROM limpeza_naoconformidade_equipamento AS lne
                    JOIN limpeza_naoconformidade AS ln ON (lne.limpezaNaoConformidadeID = ln.limpezaNaoConformidadeID)
                WHERE ln.limpezaNaoConformidadeID = ? AND lne.limpezaEquipamentoID = le.limpezaEquipamentoID) AS descricao

            FROM limpeza_equipamento AS le
                JOIN equipamento AS e ON (le.equipamentoID = e.equipamentoID)                                
            WHERE le.limpezaID = ?
            ORDER BY e.nome ASC`
            let [resultEquipamentos] = await db.promise().query(sqlEquipamentos, [id, id, limpezaID])
            resultEquipamentos = resultEquipamentos.map(row => ({
                ...row,
                checked_: row.checked_ === 1 ? true : false
            }));

            //? Função que retorna fields dinâmicos definidos no modelo!
            const fields = await getDynamicHeaderFields(
                id,
                modeloID,
                unidadeID,
                result?.[0]?.['status'] ?? 0,
                'par_limpeza_naoconformidade',
                'parLimpezaNaoConformidadeID',
                'parLimpezaNaoConformidadeModeloID',
                'limpeza_naoconformidade',
                'limpezaNaoConformidadeID'
            )

            const departments = await getHeaderDepartments(
                modeloID,
                'par_limpeza_naoconformidade_modelo_departamento',
                'parLimpezaNaoConformidadeModeloID'
            )

            const today = getDateNow()
            const time = getTimeNow()

            const header = {
                limpeza: {
                    id: limpezaID,
                    dataInicio: resultLimpeza[0].dataInicio,
                    dataFim: resultLimpeza[0].dataFim,
                    modelo: resultLimpeza[0].modelo,
                    setor: resultLimpeza[0].setor,
                    status: {
                        label: resultLimpeza[0].status,
                        color: resultLimpeza[0].statusCor
                    }
                },
                data: result?.[0]?.data ?? today,
                hora: result?.[0]?.hora ?? time,
                totalNc: result?.[0]?.totalNc ?? 0,
                equipamentos: resultEquipamentos ?? [],
                descricao: result?.[0]?.descricao,
                prazoSolucao: result?.[0]?.prazoSolucao,
                status: result?.[0]?.status,
                modelo: {
                    id: resultModelo[0].id,
                    nome: resultModelo[0].nome
                },
                status: {
                    id: result?.[0]?.statusID ?? 10,
                    label: result?.[0]?.statusNome ?? 'Novo',
                    color: result?.[0]?.statusCor ?? 'primary'
                },
                fields,
                departamentosPreenchimento: departments.fill ?? [],
                departamentosConclusao: departments.conclude ?? []
            }

            //? Função que retorna blocos dinâmicos definidos no modelo!
            const blocos = await getDynamicBlocks(
                id,
                modeloID,
                result?.[0]?.['status'] ?? 0,
                'limpezaNaoConformidadeID',
                'par_limpeza_naoconformidade_modelo_bloco',
                'parLimpezaNaoConformidadeModeloID',
                'limpeza_naoconformidade_resposta',
                'limpezaNaoConformidadeRespostaID',
                'par_limpeza_naoconformidade_modelo_bloco_item',
                'parLimpezaNaoConformidadeModeloBlocoItemID',
                'parLimpezaNaoConformidadeModeloBlocoID',
                'par_limpeza_naoconformidade_modelo_bloco_departamento'
            )

            return res.json({ header, blocos });
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async updateData(req, res) {
        const { id } = req.params
        const { form, auth } = req.body
        const { header, blocos } = form
        const { usuarioID, unidadeID, papelID, profissionalID } = auth

        try {
            if (!id || id == 'undefined') return res.status(400).json({ error: 'ID do formulário não informado!' })

            const logID = await executeLog('Edição formulário de Não Conformidade da Limpeza e Higienização', usuarioID, unidadeID, req)

            //? Atualiza itens fixos (header)
            const sql = `
            UPDATE limpeza_naoconformidade SET 
                parLimpezaNaoConformidadeModeloID = ?, 
                data = ?, 
                prazoSolucao = ?                
            WHERE limpezaNaoConformidadeID = ?`
            await executeQuery(sql, [
                header.modelo.id,
                header.data + ' ' + header.hora + ':00',
                header.prazoSolucao,
                id
            ], 'update', 'limpeza_naoconformidade', 'limpezaNaoConformidadeID', id, logID)

            //? Atualizar o header dinâmico e setar o status        
            if (header.fields) {
                //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
                let dataHeader = await formatFieldsToTable('par_limpeza_naoconformidade', header.fields)
                if (Object.keys(dataHeader).length > 0) {
                    const sqlHeader = `UPDATE limpeza_naoconformidade SET ? WHERE limpezaNaoConformidadeID = ${id} `;
                    const resultHeader = await executeQuery(sqlHeader, [dataHeader], 'update', 'limpeza_naoconformidade', 'limpezaNaoConformidadeID', id, logID)
                    if (resultHeader.length === 0) { return res.status(500).json('Error'); }
                }
            }

            //? Atualiza equipamentos marcados
            if (header.equipamentos && header.equipamentos.length > 0) {
                const checkedEquip = header.equipamentos.filter(row => row.checked_ === true);
                const checkedEquipsId = checkedEquip.map(row => row.limpezaEquipamentoID);
                const existingEquips = await db.promise().query(
                    'SELECT limpezaEquipamentoID FROM limpeza_naoconformidade_equipamento WHERE limpezaNaoConformidadeID = ?', [id]
                );
                const existingEquipIds = existingEquips[0].map(row => row.limpezaEquipamentoID);
                const equipToDelete = existingEquipIds.filter(id => !checkedEquipsId.includes(id));
                const equipToInsert = checkedEquip.filter(row => !existingEquipIds.includes(row.limpezaEquipamentoID));
                const equipToUpdate = checkedEquip.filter(row => existingEquipIds.includes(row.limpezaEquipamentoID));

                // Deletar os equipamentos desmarcados
                if (equipToDelete.length > 0) {
                    await executeQuery(
                        'DELETE FROM limpeza_naoconformidade_equipamento WHERE limpezaNaoConformidadeID = ? AND limpezaEquipamentoID IN (?)',
                        [id, equipToDelete.join(',')],
                        'delete', 'limpeza_naoconformidade_equipamento', 'limpezaNaoConformidadeID', id, logID
                    );
                }

                // Inserir os novos equipamentos marcados com descrição
                if (equipToInsert.length > 0) {
                    const insertValues = equipToInsert.map(row => `(${id}, ${row.limpezaEquipamentoID}, '${row.descricao.replace(/'/g, "''")}')`).join(',');
                    await executeQuery(
                        `INSERT INTO limpeza_naoconformidade_equipamento (limpezaNaoConformidadeID, limpezaEquipamentoID, descricao) VALUES ${insertValues}`,
                        null,
                        'insert', 'limpeza_naoconformidade_equipamento', 'limpezaNaoConformidadeID', null, logID
                    );
                }

                // Atualizar a descrição dos equipamentos marcados
                if (equipToUpdate.length > 0) {
                    for (const equip of equipToUpdate) {
                        await executeQuery(
                            'UPDATE limpeza_naoconformidade_equipamento SET descricao = ? WHERE limpezaNaoConformidadeID = ? AND limpezaEquipamentoID = ?',
                            [equip.descricao, id, equip.limpezaEquipamentoID],
                            'update', 'limpeza_naoconformidade_equipamento', 'limpezaNaoConformidadeID', id, logID
                        );
                    }
                }
            }

            //? Atualiza blocos do modelo 
            await updateDynamicBlocks(
                id,
                blocos,
                'limpeza_naoconformidade_resposta',
                'limpezaNaoConformidadeID',
                'parLimpezaNaoConformidadeModeloBlocoID',
                'limpezaNaoConformidadeRespostaID',
                logID
            )

            //? Cria agendamento no calendário com a data de vencimento        
            const formatedDate = header.data.split('-').reverse().join('/')
            const subtitle = `${formatedDate} ${header.hora} (${header.setor})`
            await updateScheduling(id, 'limpeza-naoconformidade', 'Não Conformidade da Limpeza e Higienização', subtitle, header.data, header.prazoSolucao, unidadeID, logID)

            //? Gera histórico de alteração de status 
            const newStatus = header.status.id < 30 ? 30 : header.status.id
            const movimentation = await addFormStatusMovimentation(5, id, usuarioID, unidadeID, papelID, newStatus, null)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

            return res.status(201).json({ message: "Formulário atualizado com sucesso!" })

        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async insertData(req, res) {
        const { form, auth } = req.body
        const { header, blocos } = form
        const { usuarioID, unidadeID, papelID, profissionalID } = auth

        try {
            const logID = await executeLog('Criação formulário de Não Conformidade da Limpeza e Higienização', usuarioID, unidadeID, req)

            //? Insere itens fixos (header)
            const sql = `
            INSERT INTO limpeza_naoconformidade (
                parLimpezaNaoConformidadeModeloID,
                limpezaID,
                data,
                profissionalIDPreenchimento,
                prazoSolucao,
                status,
                unidadeID
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`
            const id = await executeQuery(sql, [
                header.modelo.id,
                header.limpeza.id,
                header.data + ' ' + header.hora + ':00',
                profissionalID,
                header.prazoSolucao,
                30,
                unidadeID
            ], 'insert', 'limpeza_naoconformidade', 'limpezaNaoConformidadeID', header.limpeza.id, logID)
            if (!id) return res.status(400).json({ message: 'Erro ao inserir formulário!' })

            //? Atualizar o header dinâmico e setar o status        
            if (header.fields) {
                //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
                let dataHeader = await formatFieldsToTable('par_limpeza_naoconformidade', header.fields)
                if (Object.keys(dataHeader).length > 0) {
                    const sqlHeader = `UPDATE limpeza_naoconformidade SET ? WHERE limpezaNaoConformidadeID = ${id} `;
                    const resultHeader = await executeQuery(sqlHeader, [dataHeader], 'update', 'limpeza_naoconformidade', 'limpezaNaoConformidadeID', id, logID)
                    if (resultHeader.length === 0) { return res.status(500).json('Error'); }
                }
            }

            //? Insere equipamentos marcados
            if (header.equipamentos && header.equipamentos.length > 0) {
                const checkedEquipments = header.equipamentos.filter(row => row.checked_ === true)
                if (checkedEquipments && checkedEquipments.length > 0) {
                    const insertValues = checkedEquipments.map(row => `(${id}, ${row.limpezaEquipamentoID}, "${row.descricao ?? ''}")`).join(',');
                    const sql = `INSERT INTO limpeza_naoconformidade_equipamento (limpezaNaoConformidadeID, limpezaEquipamentoID, descricao) VALUES ${insertValues}`
                    await executeQuery(sql, null, 'insert', 'limpeza_naoconformidade_equipamento', 'limpezaNaoConformidadeID', id, logID)
                }
            }

            //? Insere blocos do modelo 
            await insertDynamicBlocks(
                blocos,
                'parLimpezaNaoConformidadeModeloBlocoID',
                'limpeza_naoconformidade_resposta',
                'limpezaNaoConformidadeID',
                'limpezaNaoConformidadeRespostaID',
                id,
                logID
            )

            //? Cria agendamento no calendário com a data de vencimento            
            const formatedDate = header.data.split('-').reverse().join('/')
            const subtitle = `${formatedDate} ${header.hora} (Prazo de ${header.prazoSolucao} ${header.prazoSolucao == 1 ? 'dia' : 'dias'})`
            await createScheduling(id, 'limpeza-naoconformidade', 'Não Conformidade da Limpeza e Higienização', subtitle, header.data, header.prazoSolucao, unidadeID, logID)

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(5, id, usuarioID, unidadeID, papelID, 30, null)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

            return res.status(200).json({ id })

        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async conclude(req, res) {
        let { id, limpezaID, usuarioID, papelID, unidadeID, profissionalID } = req.body.params
        const form = req.body.form

        try {
            if (!id || !limpezaID) {
                return res.status(400).json({ error: 'Formulário não informado!' })
            }

            const logID = await executeLog('Conclusão formulário de Não Conformidade da Limpeza e Higienização', usuarioID, unidadeID, req)
            const sql = `
            UPDATE limpeza_naoconformidade 
            SET status = ?, profissionalIDConclusao = ?, dataConclusao = ?, conclusao = ?
            WHERE limpezaNaoConformidadeID = ?`
            await executeQuery(sql, [
                form.status,
                profissionalID,
                new Date(),
                form.obsConclusao ?? '',
                id
            ], 'update', 'limpeza_naoconformidade', 'limpezaNaoConformidadeID', id, logID)

            updateStatusScheduling(id, '/formularios/limpeza/?aba=nao-conformidade', 1, unidadeID, logID)

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(5, id, usuarioID, unidadeID, papelID, form.status, form.obsConclusao)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

            return res.status(201).json({ message: "Formulário concluído com sucesso!" })
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async reOpen(req, res) {
        const { id } = req.params
        const { status, observacao } = req.body
        const { usuarioID, papelID, unidadeID } = req.body.auth

        //? É uma fábrica, e formulário já foi concluído
        if (status && papelID == 1) {
            const logID = await executeLog('Edição do status do formulário de Não Conformidade da Limpeza e Higienização', usuarioID, unidadeID, req)
            const sqlUpdateStatus = `
            UPDATE limpeza_naoconformidade
            SET status = ?, profissionalIDConclusao = ?, dataConclusao = ?, conclusao = ?
            WHERE limpezaNaoConformidadeID = ?`
            const resultUpdateStatus = await executeQuery(sqlUpdateStatus, [
                status,
                null,
                null,
                null,
                id
            ], 'update', 'limpeza_naoconformidade', 'limpezaNaoConformidadeID', id, logID)

            updateStatusScheduling(id, '/formularios/limpeza/?aba=nao-conformidade', 0, unidadeID, logID)

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(5, id, usuarioID, unidadeID, papelID, status, observacao)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }
        }

        res.status(200).json({ message: 'Ok' })
    }

    async getLimpezaNC(req, res) {
        const { unidadeID } = req.body

        try {
            const sql = `
            SELECT 
                l.limpezaID AS id, 
                CONCAT(DATE_FORMAT(l.dataInicio, '%d/%m/%Y'), ' a ', DATE_FORMAT(l.dataFim, '%d/%m/%Y'), ' - ', s.nome) AS nome
            FROM limpeza AS l
                JOIN setor AS s ON (l.setorID = s.setorID)
            WHERE l.unidadeID = ? AND l.naoConformidade = 1
            ORDER BY l.dataInicio DESC`
            const [result] = await db.promise().query(sql, [unidadeID])

            return res.json(result)
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async getNCLimpeza(req, res) {
        const { id } = req.body

        try {
            if (!id) return res.status(400).json({ error: 'Limpeza não informada!' })

            const sql = `
            SELECT 
                ln.limpezaNaoConformidadeID AS id, 
                DATE_FORMAT(ln.data, '%d/%m/%Y') AS data,
                s.nome AS status                
            FROM limpeza_naoconformidade AS ln                
                JOIN status AS s ON (s.statusID = ln.status)
            WHERE ln.limpezaID = ?`
            const [result] = await db.promise().query(sql, [id])

            const formatedResult = result.map(item => {
                return {
                    id: item.id,
                    nome: item.data + ' - ' + item.status + ' - ID: ' + item.id
                }
            })

            return res.json(formatedResult)
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['limpeza_naoconformidade_equipamento', 'limpeza_naoconformidade_resposta', 'limpeza_naoconformidade'],
            column: 'limpezaNaoConformidadeID'
        }

        const arrPending = []

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão formulário de Não Conformidade da Limpeza e Higienização', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }


        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão formulário de Não Conformidade da Limpeza e Higienização', usuarioID, unidadeID, req)

                    //? Remove agendamento de vencimento deste formulário (ao concluir criará novamente)
                    deleteScheduling('limpeza-naoconformidade', id, unidadeID, logID)

                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }

    async saveAnexo(req, res) {
        try {
            const { id } = req.params;
            const pathDestination = req.pathDestination
            const files = req.files; //? Array de arquivos

            const { usuarioID, unidadeID, grupoAnexoItemID, parLimpezaNaoConformidadeModeloBlocoID, itemOpcaoAnexoID } = req.body;

            //? Verificar se há arquivos enviados
            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }
            const logID = await executeLog('Salvo anexo do formulário de não conformidade da Limpeza e Higienização', usuarioID, unidadeID, req)

            let result = []
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                //? Insere em anexo
                const sqlInsert = `INSERT INTO anexo(titulo, diretorio, arquivo, tamanho, tipo, usuarioID, unidadeID, dataHora) VALUES(?,?,?,?,?,?,?,?)`;
                const anexoID = await executeQuery(sqlInsert, [
                    removeSpecialCharts(file.originalname),
                    pathDestination,
                    file.filename,
                    file.size,
                    file.mimetype,
                    usuarioID,
                    unidadeID,
                    new Date()
                ], 'insert', 'anexo', 'anexoID', null, logID)

                //? Insere em anexo_busca
                const sqlInsertBusca = `
                INSERT INTO anexo_busca(anexoID, limpezaNaoConformidadeID, grupoAnexoItemID, parLimpezaNaoConformidadeModeloBlocoID, itemOpcaoAnexoID) VALUES(?,?,?,?,?)`;
                await executeQuery(sqlInsertBusca, [
                    anexoID,
                    id,
                    grupoAnexoItemID ?? null,
                    parLimpezaNaoConformidadeModeloBlocoID ?? null,
                    itemOpcaoAnexoID ?? null
                ], 'insert', 'anexo_busca', 'anexoBuscaID', null, logID)

                const objAnexo = {
                    exist: true,
                    anexoID: anexoID,
                    path: `${process.env.BASE_URL_API}${pathDestination}${file.filename} `,
                    nome: file.originalname,
                    tipo: file.mimetype,
                    size: file.size,
                    time: new Date(),
                }
                result.push(objAnexo)
            }

            return res.status(200).json(result)
        } catch (error) {
            console.log(error)
        }
    }

    async deleteAnexo(req, res) {
        const { id, anexoID, unidadeID, usuarioID, folder } = req.params;

        //? Obtém o caminho do anexo atual
        const sqlCurrentFile = `SELECT arquivo FROM anexo WHERE anexoID = ? `;
        const [tempResultCurrentFile] = await db.promise().query(sqlCurrentFile, [anexoID])
        const resultCurrentFile = tempResultCurrentFile[0]?.arquivo;

        //? Remover arquivo do diretório
        if (resultCurrentFile) {
            const pathFile = `uploads/${unidadeID}/limpeza-nao-conformidade/${folder}/`
            const previousFile = path.resolve(pathFile, resultCurrentFile);
            fs.unlink(previousFile, (error) => {
                if (error) {
                    return console.error('Erro ao remover o anexo:', error);
                } else {
                    return console.log('Anexo removido com sucesso!');
                }
            });
        }

        const logID = await executeLog('Remoção de anexo da não conformidade do formulário da Limpeza e Higienização', usuarioID, unidadeID, req)

        //? Remove anexo do BD
        const sqlDeleteBusca = `DELETE FROM anexo_busca WHERE anexoID = ?`;
        await executeQuery(sqlDeleteBusca, [anexoID], 'delete', 'anexo_busca', 'anexoID', anexoID, logID)

        const sqlDelete = `DELETE FROM anexo WHERE anexoID = ?`;
        await executeQuery(sqlDelete, [anexoID], 'delete', 'anexo', 'anexoID', anexoID, logID)

        res.status(200).json(anexoID);
    }
}

module.exports = NaoConformidade