const db = require('../../../config/db');
const fs = require('fs');
const path = require('path');
require('dotenv/config')
const { addFormStatusMovimentation, formatFieldsToTable, getDateNow, getTimeNow, updateMultipleSelect, insertMultipleSelect } = require('../../../defaults/functions');
const { hasPending, deleteItem, removeSpecialCharts } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');
const { getDynamicHeaderFields } = require('../../../defaults/dynamicFields');
const { getHeaderDepartments } = require('../../../defaults/sector/getSectors');
const { getDynamicBlocks, updateDynamicBlocks, insertDynamicBlocks } = require('../../../defaults/dynamicBlocks');
const { deleteScheduling, createScheduling, updateScheduling, updateStatusScheduling } = require('../../../defaults/scheduling');

class LimpezaController {
    async getList(req, res) {
        const { unidadeID, papelID, usuarioID } = req.params;

        if (!unidadeID) return res.status(400).json({ error: 'unidadeID não informado!' })

        const sql = `
        SELECT 
            l.limpezaID AS id, 
            IF(MONTH(l.dataInicio) > 0, DATE_FORMAT(l.dataInicio, "%d/%m/%Y"), '--') AS dataInicio, 
            IF(MONTH(l.dataFim) > 0, DATE_FORMAT(l.dataFim, "%d/%m/%Y"), '--') AS dataFim, 
            plm.nome AS modelo,
            COALESCE(s2.nome, '--') AS setor,
            COALESCE(IF(l.limpezaHigienizacao = 1, 'Limpeza', 'Limpeza e Higienização'), '--') AS limpezaHigienizacao,
            s.statusID,
            s.nome AS status,
            s.cor,
            l.concluido,
            l.naoConformidade
        FROM limpeza AS l
            JOIN par_limpeza_modelo AS plm ON (l.parLimpezaModeloID = plm.parLimpezaModeloID)
            JOIN status AS s ON (l.status = s.statusID)
            LEFT JOIN setor AS s2 ON (l.setorID = s2.setorID)
        WHERE l.unidadeID = ?
        ORDER BY l.dataInicio DESC, l.status ASC`

        const [result] = await db.promise().query(sql, [unidadeID])
        return res.json(result);
    }

    async getModels(req, res) {
        const { unidadeID } = req.body
        if (!unidadeID) return

        const sql = `
        SELECT parLimpezaModeloID AS id, nome, ciclo, cabecalho
        FROM par_limpeza_modelo
        WHERE unidadeID = ? AND status = 1 
        ORDER BY nome ASC`
        const [result] = await db.promise().query(sql, [unidadeID])

        return res.status(200).json(result)
    }

    async getData(req, res) {
        let { id, modelID, unidadeID } = req.body

        try {
            if (!unidadeID) return res.status(204).json({ error: 'Parâmetros não informados!' })

            let result = []
            let modeloID = modelID //? Quando vem de um formulário NOVO

            if (id && id > 0) {
                const sql = `
                SELECT 
                    l.limpezaID AS id, 
                    l.parLimpezaModeloID AS modeloID,
                    DATE_FORMAT(l.dataInicio, "%Y-%m-%d") AS dataInicio,
                    DATE_FORMAT(l.dataInicio, "%H:%i") AS horaInicio,
                    DATE_FORMAT(l.dataFim, "%Y-%m-%d") AS dataFim,
                    DATE_FORMAT(l.dataFim, "%H:%i") AS horaFim,
                    l.limpezaHigienizacao,
                    l.prestadorServico,
                    l.fornecedorID, 
                    f.nome AS fornecedor,
                    l.departamentoID,
                    d.nome AS departamento,
                    l.profissionalID,
                    p.nome AS profissional,
                    l.setorID,
                    s2.nome AS setor,
                    l.temperaturaAgua,
                    l.obs,
                    l.naoConformidade,
                    s.statusID,
                    s.nome AS statusNome,
                    s.cor AS statusCor,
                    DATE_FORMAT(l.dataConclusao, "%Y-%m-%d") AS dataConclusao,
                    DATE_FORMAT(l.dataConclusao, "%H:%i") AS horaConclusao
                FROM limpeza AS l
                    JOIN par_limpeza_modelo AS plm ON (l.parLimpezaModeloID = plm.parLimpezaModeloID)
                    LEFT JOIN status AS s ON (l.status = s.statusID)    

                    LEFT JOIN fornecedor AS f ON (l.fornecedorID = f.fornecedorID)
                    LEFT JOIN departamento AS d ON (l.departamentoID = d.departamentoID)
                    LEFT JOIN profissional AS p ON (l.profissionalID = p.profissionalID)
                    LEFT JOIN setor AS s2 ON (l.setorID = s2.setorID)                    
                WHERE l.limpezaID = ? AND l.unidadeID = ?
                ORDER BY l.dataInicio DESC, l.status ASC`
                const [rows] = await db.promise().query(sql, [id, unidadeID])
                result = rows
                modeloID = rows[0].modeloID
            }

            const sqlModelo = `
            SELECT parLimpezaModeloID AS id, nome, ciclo, cabecalho
            FROM par_limpeza_modelo
            WHERE parLimpezaModeloID = ?`
            const [resultModelo] = await db.promise().query(sqlModelo, [modeloID])

            //? Função que retorna fields dinâmicos definidos no modelo!
            const fields = await getDynamicHeaderFields(
                id,
                modeloID,
                unidadeID,
                result?.[0]?.['status'] ?? 0,
                'par_limpeza',
                'parLimpezaID',
                'parLimpezaModeloID',
                'limpeza',
                'limpezaID'
            )

            //? Equipamentos 
            const sqlEquipment = `
            SELECT e.equipamentoID AS id, e.nome
            FROM limpeza_equipamento AS le 
                JOIN equipamento AS e ON (le.equipamentoID = e.equipamentoID)
            WHERE le.limpezaID = ?
            ORDER BY e.nome ASC`
            const [rowsEquipment] = await db.promise().query(sqlEquipment, [id])

            //? Produtos
            const sqlProduct = `
            SELECT p.produtoID AS id, p.nome
            FROM limpeza_produto AS lp 
                JOIN produto AS p ON (lp.produtoID = p.produtoID)
            WHERE lp.limpezaID = ?
            ORDER BY p.nome ASC`
            const [rowsProduct] = await db.promise().query(sqlProduct, [id])

            const departments = await getHeaderDepartments(
                modeloID,
                'par_limpeza_modelo_departamento',
                'parLimpezaModeloID'
            )

            const today = getDateNow()
            const time = getTimeNow()

            const header = {
                dataInicio: result?.[0]?.dataInicio ?? today,
                horaInicio: result?.[0]?.horaInicio ?? time,
                dataFim: result?.[0]?.dataFim ?? today,
                horaFim: result?.[0]?.horaFim ?? time,
                limpeza: true,
                higienizacao: result?.[0]?.limpezaHigienizacao === 2 ? true : false,
                prestadorServico: result?.[0]?.prestadorServico === 1 ? true : false,
                fornecedor: {
                    id: result?.[0]?.fornecedorID,
                    nome: result?.[0]?.fornecedor
                },
                setor: {
                    id: result?.[0]?.setorID,
                    nome: result?.[0]?.setor
                },
                departamento: {
                    id: result?.[0]?.departamentoID,
                    nome: result?.[0]?.departamento
                },
                profissional: {
                    id: result?.[0]?.profissionalID,
                    nome: result?.[0]?.profissional
                },
                temperaturaAgua: result?.[0]?.temperaturaAgua,
                equipamentos: rowsEquipment ?? [],
                produtos: rowsProduct ?? [],
                modelo: {
                    id: resultModelo[0].id,
                    nome: resultModelo[0].nome,
                    ciclo: resultModelo[0].ciclo,
                    cabecalho: resultModelo[0].cabecalho
                },
                status: {
                    id: result?.[0]?.statusID ?? 10,
                    label: result?.[0]?.statusNome ?? 'Novo',
                    color: result?.[0]?.statusCor ?? 'primary'
                },
                naoConformidade: result?.[0]?.naoConformidade == '1' ? true : false,
                fields,
                departamentosPreenchimento: departments.fill ?? [],
                departamentosConclusao: departments.conclude ?? [],
            }

            const fieldsFooter = {
                dataConclusao: result[0]?.dataConclusao ?? today,
                horaConclusao: result[0]?.horaConclusao ?? time,
            }

            //? Função que retorna blocos dinâmicos definidos no modelo!
            const blocos = await getDynamicBlocks(
                id,
                modeloID,
                result?.[0]?.['statusID'] ?? 0,
                'limpezaID',
                'par_limpeza_modelo_bloco',
                'parLimpezaModeloID',
                'limpeza_resposta',
                'limpezaRespostaID',
                'par_limpeza_modelo_bloco_item',
                'parLimpezaModeloBlocoItemID',
                'parLimpezaModeloBlocoID',
                'par_limpeza_modelo_bloco_departamento'
            )

            return res.json({ header, blocos, fieldsFooter });
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async updateData(req, res) {
        const { id } = req.params
        const { form, auth } = req.body
        const { header, blocos } = form
        const { usuarioID, unidadeID, papelID } = auth

        try {
            if (!id || id == 'undefined') return res.status(400).json({ error: 'ID do formulário não informado!' })

            const logID = await executeLog('Edição formulário de Não Conformidade do Recebimento Mp', usuarioID, unidadeID, req)

            //? Atualiza itens fixos (header)
            const sql = `
            UPDATE limpeza SET 
                dataInicio = ?, 
                dataFim = ?,
                limpezaHigienizacao = ?,
                prestadorServico = ?,
                fornecedorID = ?,
                departamentoID = ?,
                profissionalID = ?,
                setorID = ?                
            WHERE limpezaID = ?`
            await executeQuery(sql, [
                header.dataInicio + ' ' + header.horaInicio + ':00',
                header.dataFim + ' ' + header.horaFim + ':00',
                header.higienizacao ? '2' : '1',
                header.prestadorServico ? '1' : '0',
                header.fornecedor?.id ?? null,
                header.departamento?.id ?? null,
                header.profissional?.id ?? null,
                header.setor.id,
                id
            ], 'update', 'limpeza', 'limpezaID', id, logID)

            //? Atualizar o header dinâmico e setar o status        
            if (header.fields) {
                //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
                let dataHeader = await formatFieldsToTable('par_limpeza', header.fields)
                if (Object.keys(dataHeader).length > 0) {
                    const sqlHeader = `UPDATE limpeza SET ? WHERE limpezaID = ${id} `;
                    const resultHeader = await executeQuery(sqlHeader, [dataHeader], 'update', 'limpeza', 'limpezaID', id, logID)
                    if (resultHeader.length === 0) { return res.status(500).json('Error'); }
                }
            }

            //? Atualiza equipamentos
            await updateMultipleSelect(
                'limpeza_equipamento',
                'limpezaID',
                'equipamentoID',
                id,
                header.equipamentos
            )

            //? Atualiza produtos
            await updateMultipleSelect(
                'limpeza_produto',
                'limpezaID',
                'produtoID',
                id,
                header.produtos
            )

            //? Atualiza blocos do modelo 
            await updateDynamicBlocks(
                id,
                blocos,
                'limpeza_resposta',
                'limpezaID',
                'parLimpezaModeloBlocoID',
                'limpezaRespostaID',
                logID
            )

            //? Cria agendamento no calendário com a data de vencimento            
            const subtitle = `${header.dataInicio} ${header.horaInicio} (${header.setor.nome})`
            await updateScheduling(id, 'limpeza', 'Limpeza e Higienização', subtitle, header.dataInicio, header.modelo.ciclo, unidadeID, logID)

            //? Gera histórico de alteração de status 
            const newStatus = header.status.id < 30 ? 30 : header.status.id
            const movimentation = await addFormStatusMovimentation(4, id, usuarioID, unidadeID, papelID, newStatus, null)
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
            const logID = await executeLog('Criação formulário de Limpeza e Higienização', usuarioID, unidadeID, req)

            //? Insere itens fixos (header)
            const sql = `
            INSERT INTO limpeza (
                parLimpezaModeloID,
                dataInicio,
                dataFim,
                limpezaHigienizacao,
                prestadorServico,
                fornecedorID,
                profissionalID,
                setorID,                
                status,
                unidadeID,
                dataCadastro
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            const id = await executeQuery(sql, [
                header.modelo.id,
                header.dataInicio + ' ' + header.horaInicio + ':00',
                header.dataFim + ' ' + header.horaFim + ':00',
                header.higienacao ? '2' : '1',
                header.prestadorServico ? '1' : '0',
                header.fornecedor?.id ?? null,
                header.profissional?.id ?? null,
                header.setor?.id ?? null,
                30,
                unidadeID,
                new Date()
            ], 'insert', 'limpeza', 'limpezaID', header.modelo.id, logID)
            if (!id) return res.status(400).json({ message: 'Erro ao inserir formulário!' })

            //? Atualizar o header dinâmico e setar o status        
            if (header.fields) {
                //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
                let dataHeader = await formatFieldsToTable('par_limpeza', header.fields)
                if (Object.keys(dataHeader).length > 0) {
                    const sqlHeader = `UPDATE limpeza SET ? WHERE limpezaID = ${id} `;
                    const resultHeader = await executeQuery(sqlHeader, [dataHeader], 'update', 'limpeza', 'limpezaID', id, logID)
                    if (resultHeader.length === 0) { return res.status(500).json('Error'); }
                }
            }

            //? Insere equipamentos
            insertMultipleSelect(
                'limpeza_equipamento',
                'limpezaID',
                'equipamentoID',
                id,
                header.equipamentos
            )

            //? Insere produtos
            insertMultipleSelect(
                'limpeza_produto',
                'limpezaID',
                'produtoID',
                id,
                header.produtos
            )

            //? Insere blocos do modelo 
            await insertDynamicBlocks(
                blocos,
                'parLimpezaModeloBlocoID',
                'limpeza_resposta',
                'limpezaID',
                'limpezaRespostaID',
                id,
                logID
            )

            //? Cria agendamento no calendário com a data de vencimento            
            const subtitle = `${header.dataInicio} ${header.horaInicio} (${header.setor.nome})`
            await createScheduling(id, 'limpeza', 'Limpeza e Higienização', subtitle, header.dataInicio, header.modelo.ciclo, unidadeID, logID)

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(4, id, usuarioID, unidadeID, papelID, 30, null)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

            return res.status(200).json({ id })

        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async conclude(req, res) {
        let { id, usuarioID, papelID, unidadeID, profissionalID } = req.body.params
        const form = req.body.form

        try {
            if (!id) {
                return res.status(400).json({ error: 'Formulário não informado!' })
            }

            const logID = await executeLog('Conclusão formulário de Limpeza e Higienização', usuarioID, unidadeID, req)
            const sql = `
            UPDATE limpeza 
            SET status = ?, profissionalIDConclusao = ?, dataConclusao = ?, obsConclusao = ?, concluido = ?, naoConformidade = ?
            WHERE limpezaID = ?`
            await executeQuery(sql, [
                form.status,
                profissionalID,
                form.dataConclusao + ' ' + form.horaConclusao + ':00',
                form.obsConclusao ?? '',
                1,
                form.naoConformidade ? '1' : '0',
                id
            ], 'update', 'limpeza', 'limpezaID', id, logID)

            updateStatusScheduling(id, '/formularios/limpeza', 1, unidadeID, logID)

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(4, id, usuarioID, unidadeID, papelID, form.status, form.obsConclusao)
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
            const logID = await executeLog('Edição do status do formulário de Limpeza e Higienização', usuarioID, unidadeID, req)
            const sqlUpdateStatus = `
            UPDATE limpeza
            SET status = ?, profissionalIDConclusao = ?, dataConclusao = ?, concluido = ?, naoConformidade = ?
            WHERE limpezaID = ?`
            const resultUpdateStatus = await executeQuery(sqlUpdateStatus, [
                status,
                null,
                null,
                null,
                0,
                id
            ], 'update', 'limpeza', 'limpezaID', id, logID)

            updateStatusScheduling(id, '/formularios/limpeza', 0, unidadeID, logID)

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(4, id, usuarioID, unidadeID, papelID, status, observacao)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }
        }

        res.status(200).json({ message: 'Ok' })
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['limpeza_produto', 'limpeza_equipamento', 'limpeza_resposta', 'limpeza'],
            column: 'limpezaID'
        }

        const arrPending = []

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão formulário de Limpeza e Higienização', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }


        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão formulário de Limpeza e Higienização', usuarioID, unidadeID, req)

                    //? Remove agendamento de vencimento deste formulário (ao concluir criará novamente)
                    deleteScheduling('limpeza', id, unidadeID, logID)

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

            const { usuarioID, unidadeID, grupoAnexoItemID, parLimpezaModeloBlocoID, itemOpcaoAnexoID } = req.body;

            //? Verificar se há arquivos enviados
            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }
            const logID = await executeLog('Salvo anexo do formulário de Limpeza e Higienização', usuarioID, unidadeID, req)

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
                INSERT INTO anexo_busca(anexoID, limpezaID, grupoAnexoItemID, parLimpezaModeloBlocoID, itemOpcaoAnexoID) VALUES(?,?,?,?,?)`;
                await executeQuery(sqlInsertBusca, [
                    anexoID,
                    id,
                    grupoAnexoItemID ?? null,
                    parLimpezaModeloBlocoID ?? null,
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
            const pathFile = `uploads/${unidadeID}/limpeza/${folder}/`
            const previousFile = path.resolve(pathFile, resultCurrentFile);
            fs.unlink(previousFile, (error) => {
                if (error) {
                    return console.error('Erro ao remover o anexo:', error);
                } else {
                    return console.log('Anexo removido com sucesso!');
                }
            });
        }

        const logID = await executeLog('Remoção de anexo de limpeza e higienização', usuarioID, unidadeID, req)

        //? Remove anexo do BD
        const sqlDeleteBusca = `DELETE FROM anexo_busca WHERE anexoID = ?`;
        await executeQuery(sqlDeleteBusca, [anexoID], 'delete', 'anexo_busca', 'anexoID', anexoID, logID)

        const sqlDelete = `DELETE FROM anexo WHERE anexoID = ?`;
        await executeQuery(sqlDelete, [anexoID], 'delete', 'anexo', 'anexoID', anexoID, logID)

        res.status(200).json(anexoID);
    }
}

module.exports = LimpezaController;