const db = require('../../../config/db');
const fs = require('fs');
const path = require('path');
require('dotenv/config')
const { addFormStatusMovimentation, formatFieldsToTable, getDateNow, getTimeNow } = require('../../../defaults/functions');
const { hasPending, deleteItem, removeSpecialCharts } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');
const { getDynamicHeaderFields } = require('../../../defaults/dynamicFields');
const { getHeaderDepartments } = require('../../../defaults/sector/getSectors');
const { getDynamicBlocks, updateDynamicBlocks } = require('../../../defaults/dynamicBlocks');
const { deleteScheduling, createScheduling } = require('../../../defaults/scheduling');

class LimpezaController {
    async getList(req, res) {
        const { unidadeID, papelID, usuarioID } = req.params;

        if (!unidadeID) return res.status(400).json({ error: 'unidadeID não informado!' })

        const sql = `
        SELECT 
            l.limpezaID AS id, 
            IF(MONTH(l.dataInicio) > 0, DATE_FORMAT(l.dataInicio, "%d/%m/%Y"), '--') AS data, 
            plm.nome AS modelo,
            s2.nome AS setor,
            s.statusID,
            s.nome AS status,
            s.cor,
            l.concluido
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
        const { unidadeID } = req.params;

        const sql = `
        SELECT a.parLimpezaModeloID AS id, a.nome, a.ciclo, a.cabecalho
        FROM par_limpeza_modelo AS a 
        WHERE a.unidadeID = ? AND a.status = 1 
        ORDER BY a.nome ASC`
        const [result] = await db.promise().query(sql, [unidadeID])

        return res.status(200).json(result)
    }

    async insertData(req, res) {
        const data = req.body

        if (!data.model.id || !data.unidadeID) return res.status(400).json({ message: 'Erro ao inserir formulário!' })

        const logID = await executeLog('Criação de formulário de limpeza', data.usuarioID, data.unidadeID, req)

        const sqlInsert = `INSERT INTO limpeza SET parLimpezaModeloID = ?, data = ?, dataInicio = ?, abreProfissionalID = ?, unidadeID = ?`
        const limpezaID = await executeQuery(sqlInsert, [
            data.model.id,
            new Date(),
            new Date(),
            data.profissionalID,
            data.unidadeID
        ], 'insert', 'limpeza', 'limpezaID', null, logID)

        return res.status(200).json({ limpezaID })
    }

    async getData(req, res) {
        const { id } = req.params
        let { modelID, unidadeID } = req.body

        try {
            if (!id || !unidadeID) return res.status(204).json({ error: 'Parâmetros não informados!' })

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
                    s.statusID,
                    s.nome AS statusNome,
                    s.cor AS statusCor
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
            SELECT parLimpezaModeloID AS id, nome
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
                limpeza: (result?.[0]?.limpezaHigienizacao === 1 || result?.[0]?.limpezaHigienizacao === 2) ? true : false,
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

            return res.json({ header, blocos });
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async updateData(req, res) {
        const { id } = req.params
        const data = req.body.form
        const { usuarioID, profissionalID, papelID, unidadeID } = req.body.auth

        try {
            if (!id || id == 'undefined') { return res.json({ message: 'ID não recebido!' }); }

            const logID = await executeLog('Edição formulário de limpeza', usuarioID, unidadeID, req)

            //? Atualiza header e footer fixos
            const sqlStaticlHeader = `
            UPDATE limpeza SET data = ?, preencheProfissionalID = ?, dataConclusao = ?, aprovaProfissionalID = ?
            WHERE limpezaID = ? `
            const resultStaticHeader = await executeQuery(sqlStaticlHeader, [
                data.fieldsHeader?.data ? `${data?.fieldsHeader?.data} ${data?.fieldsHeader?.hora}` : null,
                data.fieldsHeader?.profissional?.id ?? null,
                data.fieldsFooter?.dataConclusao ? `${data.fieldsFooter.dataConclusao} ${data.fieldsFooter.horaConclusao} ` : null,
                data.fieldsFooter?.profissional?.id ?? null,
                id
            ], 'update', 'limpeza', 'limpezaID', id, logID)

            //? Atualizar o header dinâmico e setar o status        
            if (data.fields) {
                //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
                let dataHeader = await formatFieldsToTable('par_limpeza', data.fields)
                if (Object.keys(dataHeader).length > 0) {
                    const sqlHeader = `UPDATE limpeza SET ? WHERE limpezaID = ${id} `;
                    const resultHeader = await executeQuery(sqlHeader, [dataHeader], 'update', 'limpeza', 'limpezaID', id, logID)
                    if (resultHeader.length === 0) { return res.status(500).json('Error'); }
                }
            }

            //? Atualiza blocos do modelo 
            await updateDynamicBlocks(
                id,
                data.blocos,
                'limpeza_resposta',
                'limpezaID',
                'parLimpezaModeloBlocoID',
                'limpezaRespostaID',
                logID
            )

            // Observação
            const sqlUpdateObs = `UPDATE limpeza SET obs = ?, obsConclusao = ? WHERE limpezaID = ? `
            const resultUpdateObs = await executeQuery(sqlUpdateObs, [data.info?.obs, data?.obsConclusao, id], 'update', 'limpeza', 'limpezaID', id, logID)
            if (!resultUpdateObs) { return res.json('Error'); }

            //* Status
            const newStatus = data.info.status < 30 ? 30 : data.info.status
            //* Fecha formulário se status >= 40
            const concluido = data.info.status >= 40 ? '1' : '0'

            const sqlUpdateStatus = `UPDATE limpeza SET status = ?, dataFim = ?, finalizaProfissionalID = ?, concluido = ? WHERE limpezaID = ? `
            const resultUpdateStatus = await executeQuery(sqlUpdateStatus, [
                newStatus,
                newStatus >= 40 ? new Date() : null,
                newStatus >= 40 ? profissionalID : null,
                concluido,
                id
            ], 'update', 'limpeza', 'limpezaID', id, logID)

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(4, id, usuarioID, unidadeID, papelID, newStatus, data?.obsConclusao)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

            //? Cria agendamento no calendário com a data de vencimento
            if (concluido == '1' && newStatus >= 40) {
                createScheduling(id, 'limpeza', data.unidade?.modelo?.nome, data?.fieldsHeader?.profissional?.nome, data?.fieldsHeader?.data, data.unidade?.modelo?.ciclo, unidadeID, logID)
            }

            res.status(200).json({ message: 'Dados atualizados!' })

        } catch (error) {
            console.log({ error, message: 'Erro ao atualizar os dados!' })
        }
    }

    async changeFormStatus(req, res) {
        const { id } = req.params
        const { status, observacao } = req.body
        const { usuarioID, papelID, unidadeID } = req.body.auth

        if (!status) { return res.status(400).json({ message: 'Status obrigatório!' }) }

        const logID = await executeLog('Edição do status do formulário de limpeza', usuarioID, unidadeID, req)

        const sqlUpdateStatus = `
        UPDATE limpeza 
        SET status = ?, dataFim = ?, aprovaProfissionalID = ?, dataConclusao = ?, finalizaProfissionalID = ?, concluido = ?  
        WHERE limpezaID = ?`
        const resultUpdateStatus = await executeQuery(sqlUpdateStatus, [
            status,
            null,
            null,
            null,
            null,
            '0',
            id
        ], 'update', 'limpeza', 'limpezaID', id, logID)

        //? Gera histórico de alteração de status
        const movimentation = await addFormStatusMovimentation(4, id, usuarioID, unidadeID, papelID, status, observacao)
        if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

        //? Remove agendamento de vencimento deste formulário (ao concluir criará novamente)
        deleteScheduling('limpeza', id, unidadeID, logID)

        res.status(200).json({ message: 'Ok' })
    }

    //* Salva os anexos do formulário na pasta uploads/anexo e insere os dados na tabela anexo
    async saveAnexo(req, res) {
        try {
            const { id } = req.params;
            const pathDestination = req.pathDestination
            const files = req.files; //? Array de arquivos

            const { usuarioID, unidadeID, parLimpezaModeloBlocoID, itemOpcaoAnexoID } = req.body;

            //? Verificar se há arquivos enviados
            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }
            const logID = await executeLog('Salvo anexo do formulário de limpeza', usuarioID, unidadeID, req)

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
                const sqlInsertBusca = `INSERT INTO anexo_busca(anexoID, limpezaID, parLimpezaModeloBlocoID, itemOpcaoAnexoID) VALUES(?,?,?,?)`;
                await executeQuery(sqlInsertBusca, [
                    anexoID,
                    id,
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

        const logID = await executeLog('Remoção de anexo do formulário de limpeza', usuarioID, unidadeID, req)

        //? Remove anexo do BD
        const sqlDeleteBusca = `DELETE FROM anexo_busca WHERE anexoID = ?`;
        await executeQuery(sqlDeleteBusca, [anexoID], 'delete', 'anexo_busca', 'anexoID', anexoID, logID)

        const sqlDelete = `DELETE FROM anexo WHERE anexoID = ?`;
        await executeQuery(sqlDelete, [anexoID], 'delete', 'anexo', 'anexoID', anexoID, logID)

        res.status(200).json(anexoID);
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['anexo_busca', 'limpeza_resposta', 'limpeza'],
            column: 'limpezaID'
        }

        const arrPending = []

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão anexo no formulário de limpeza', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão anexo no formulário de limpeza', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }

    async saveRelatorio(req, res) {
        const pathDestination = req.pathDestination
        const files = req.files;
    }
}

const getSqlOtherInfos = () => {
    const sql = `
    SELECT obs, status
    FROM limpeza
    WHERE limpezaID = ? `
    return sql
}

module.exports = LimpezaController;