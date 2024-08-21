const db = require('../../../config/db');
const { deleteItem, hasConflict } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class SetorController {

    async getProfessionals(req, res) {
        try {
            const { setores, unidadeID } = req.body

            if (!unidadeID || !setores || setores.length === 0) {
                return res.status(200).json([]);
            }

            // obter todos os profissionais ativos nos setores 
            const sql = `
            SELECT p.profissionalID AS id, p.nome, ps.setorID
            FROM profissional_setor AS ps 
                JOIN profissional AS p ON (ps.profissionalID = p.profissionalID)
            WHERE p.unidadeID = ? AND ps.setorID IN (?) AND ps.status = 1 AND p.status = 1
            ORDER BY p.nome ASC`
            const [result] = await db.promise().query(sql, [unidadeID, setores])

            return res.status(200).json(result);
        } catch (error) {
            console.log(error)
        }
    }

    async getProfissionaisSetoresAssinatura(req, res) {
        const { formularioID, modeloID, unidadeID } = req.body

        if (!formularioID || !modeloID) {
            return res.status(400).json({ message: "Dados inválidos!" });
        }

        try {
            let result = null

            switch (formularioID) {
                case 1: //* Fornecedor
                    result = await getProfissionaisSetoresPreenchimento('par_fornecedor_modelo_setor', 'parFornecedorModeloID', modeloID, unidadeID)
                    break;
                case 2: //* Recebimento de MP
                    result = await getProfissionaisSetoresPreenchimento('par_recebimentomp_modelo_setor', 'parRecebimentoMpModeloID', modeloID, unidadeID)
                    break;
                case 3: //* Não conformidade do recebimento de MP
                    result = await getProfissionaisSetoresPreenchimento('par_recebimentomp_naoconformidade_modelo_setor', 'parRecebimentoMpNaoConformidadeModeloID', modeloID, unidadeID)
                    break;
                case 4: //* Limpeza
                    result = await getProfissionaisSetoresPreenchimento('par_limpeza_modelo_setor', 'parLimpezaModeloID', modeloID, unidadeID)
                    break;
            }

            return res.status(200).json(result)
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }
    //? Obtém os setores pra assinatura
    async getSetoresAssinatura(req, res) {
        const { formularioID, modeloID } = req.body

        if (!formularioID || !modeloID) {
            return res.status(400).json({ message: "Dados inválidos!" });
        }

        try {
            let result = null

            switch (formularioID) {
                case 1: //* Fornecedor
                    result = await getSetoresPreenchimento('par_fornecedor_modelo_setor', 'parFornecedorModeloID', modeloID)
                    break;
                case 2: //* Recebimento de MP
                    result = await getSetoresPreenchimento('par_recebimentomp_modelo_setor', 'parRecebimentoMpModeloID', modeloID)
                    break;
                case 3: //* Não conformidade do recebimento de MP
                    result = await getSetoresPreenchimento('par_recebimentomp_naoconformidade_modelo_setor', 'parRecebimentoMpNaoConformidadeModeloID', modeloID)
                    break;
                case 4: //* Limpeza
                    result = await getSetoresPreenchimento('par_limpeza_modelo_setor', 'parLimpezaModeloID', modeloID)
                    break;
            }

            return res.status(200).json(result)
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async getList(req, res) {
        const { unidadeID } = req.body
        if (!unidadeID) return res.status(400).json({ error: 'Unidade não informada!' })
        try {

            const getList = `
            SELECT 
                s.setorID AS id, 
                s.nome, 
                e.nome AS status,
                e.cor,
                COALESCE(GROUP_CONCAT(p.nome SEPARATOR ', '), '--') AS profissionais
            FROM setor AS s
                LEFT JOIN profissional_setor AS ps ON (s.setorID = ps.setorID AND ps.status = 1)
                LEFT JOIN profissional AS p ON (ps.profissionalID = p.profissionalID)
                LEFT JOIN status as e ON (s.status = e.statusID)
            WHERE s.unidadeID = ? 
            GROUP BY s.setorID
            ORDER BY s.nome, p.nome ASC`
            const [result] = await db.promise().query(getList, [unidadeID]);
            res.status(200).json(result);
        } catch (error) {
            console.log(error)
        }
    }

    async getData(req, res) {
        try {
            const { id } = req.params
            if (!id) return res.status(400).json({ error: 'ID não informado!' })

            const sql = `
            SELECT 
                setorID,
                nome, 
                status
            FROM setor                
            WHERE setorID = ?`
            const [result] = await db.promise().query(sql, [id]);

            const sqlProfissionais = `
            SELECT 
                ps.profissionalSetorID AS id, 
                p.profissionalID, 
                p.nome, 
                DATE_FORMAT(ps.dataInicio, '%Y-%m-%d') AS dataInicio,
                DATE_FORMAT(ps.dataFim, '%Y-%m-%d') AS dataFim, 
                ps.status
            FROM profissional_setor AS ps 
                JOIN profissional AS p ON (ps.profissionalID = p.profissionalID)
            WHERE ps.setorID = ?
            ORDER BY ps.status DESC, p.nome ASC`
            const [resultProfissionais] = await db.promise().query(sqlProfissionais, [id]);

            const formatedProfissionais = resultProfissionais.map(row => {
                return {
                    ...row,
                    profissional: {
                        id: row.profissionalID,
                        nome: row.nome
                    }
                }
            })

            const data = {
                fields: {
                    ...result[0],
                    profissionais: formatedProfissionais
                }
            };

            return res.status(200).json(data)
        } catch (error) {
            console.log(error)
        }
    }

    async insertData(req, res) {
        try {
            const { fields, usuarioID, unidadeID } = req.body

            //* Valida conflito
            const validateConflicts = {
                columns: ['nome', 'unidadeID'],
                values: [fields.nome, unidadeID],
                table: 'setor',
                id: null
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Criação de setor', usuarioID, 1, req)
            const sql = 'INSERT INTO setor (nome, unidadeID, status) VALUES (?, ?, ?)'
            const id = await executeQuery(sql, [fields.nome, unidadeID, 1], 'insert', 'setor', 'setorID', null, logID)
            if (!id) return

            for (const row of fields.profissionais) {
                const sqlItem = 'INSERT INTO profissional_setor (setorID, profissionalID, dataInicio, dataFim, status) VALUES (?, ?, ?, ?, ?)'
                await executeQuery(sqlItem, [
                    id,
                    row.profissional.id,
                    row.dataInicio,
                    row.dataFim ?? null,
                    1
                ], 'insert', 'profissional_setor', 'profissionalSetorID', null, logID)
            }

            return res.status(200).json({ id })
        } catch (error) {
            console.log(error)
        }
    }

    async updateData(req, res) {
        try {
            const { id } = req.params
            const { fields, usuarioID, unidadeID } = req.body

            //* Valida conflito
            const validateConflicts = {
                columns: ['setorID', 'nome', 'unidadeID'],
                values: [id, fields.nome, unidadeID],
                table: 'setor',
                id: id
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Atualização de setor', usuarioID, 1, req)
            const sql = `UPDATE setor SET nome = ?, status = ? WHERE setorID = ?`
            await executeQuery(sql, [fields.nome, fields.status ? 1 : 0, id], 'update', 'setor', 'setorID', id, logID)

            const existingItems = await db.promise().query(`SELECT profissionalSetorID FROM profissional_setor WHERE setorID = ?`, [id]);
            const incomingItemIDs = new Set(fields.profissionais.map(item => item.id));

            // Remove os itens que não estão mais na nova lista
            for (const existingItem of existingItems[0]) {
                if (!incomingItemIDs.has(existingItem.profissionalSetorID)) {
                    const sqlItemDelete = `DELETE FROM profissional_setor WHERE profissionalSetorID = ? AND setorID = ?`;
                    await executeQuery(sqlItemDelete, [existingItem.profissionalSetorID, id], 'delete', 'profissional_setor', 'profissionalSetorID', existingItem.profissionalSetorID, logID);
                }
            }

            // Atualiza ou insere os itens recebidos
            for (const item of fields.profissionais) {
                if (item.id) {
                    const sqlItemUpdate = `UPDATE profissional_setor SET profissionalID = ?, dataInicio = ?, dataFim = ?, status = ? WHERE profissionalSetorID = ? AND setorID = ?`;
                    await executeQuery(sqlItemUpdate, [
                        item.profissional.id,
                        item.dataInicio,
                        item.dataFim ?? null,
                        item.dataFim && item.dataFim != '0000-00-00' ? 0 : 1, // Status
                        item.id,
                        id
                    ], 'update', 'profissional_setor', 'profissionalSetorID', item.id, logID);
                } else {
                    const sqlItemInsert = `INSERT INTO profissional_setor (setorID, profissionalID, dataInicio, dataFim, status) VALUES (?, ?, ?, ?, ?)`
                    await executeQuery(sqlItemInsert, [
                        id,
                        item.profissional.id,
                        item.dataInicio,
                        item.dataFim ?? null,
                        item.dataFim && item.dataFim != '0000-00-00' ? 0 : 1 // Status
                    ], 'insert', 'profissional_setor', 'setorID', id, logID);
                }
            }

            return res.status(200).json({ message: 'Dados atualizados com sucesso' });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: "Erro interno no servidor" });
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID } = req.params

        const logID = await executeLog('Exclusão de setor', usuarioID, 1, req)
        return deleteItem(id, ['setor', 'profissional_setor'], 'setorID', logID, res)
    }
}

const getSetoresPreenchimento = async (table, key, modeloID) => {
    const sqlPreenche = `
    SELECT
        b.setorID AS id, 
        b.nome
    FROM ${table} AS a
        JOIN setor AS b ON (a.setorID = b.setorID)
    WHERE a.${key} = ? AND a.tipo = 1
    GROUP BY b.setorID
    ORDER BY b.nome ASC`
    const [resultPreenche] = await db.promise().query(sqlPreenche, [modeloID])

    const sqlConclui = `
    SELECT
        b.setorID AS id, 
        b.nome
    FROM ${table} AS a
        JOIN setor AS b ON (a.setorID = b.setorID)
    WHERE a.${key} = ? AND a.tipo = 2
    GROUP BY b.setorID
    ORDER BY b.nome ASC`
    const [resultConclui] = await db.promise().query(sqlConclui, [modeloID])

    const result = {
        preenche: resultPreenche ?? [],
        conclui: resultConclui ?? []
    }

    return result
}

const getProfissionaisSetoresPreenchimento = async (table, key, modeloID, unidadeID) => {
    //? Todos os profissionais ativos da unidade, caso não tenha setor vinculado ao modelo
    const sqlProfissionaisAtivos = `
    SELECT 
        a.profissionalID AS id, 
        a.nome 
    FROM profissional AS a
    WHERE a.unidadeID = ? AND a.status = 1`
    const [resultProfissionaisAtivos] = await db.promise().query(sqlProfissionaisAtivos, [unidadeID])

    //? Verifica quantidade de setores vinculados ao modelo (preenchimento e conclusão)
    const sqlSetoresModelo = `
    SELECT COUNT(*) AS qtd 
    FROM ${table} AS a
    WHERE a.${key} = ? AND a.tipo = 1`
    const [resultSetoresModeloPreenchimento] = await db.promise().query(sqlSetoresModelo, [modeloID])
    const sqlSetoresModeloConclusao = `
    SELECT COUNT(*) AS qtd 
    FROM ${table} AS a
    WHERE a.${key} = ? AND a.tipo = 2`
    const [resultSetoresModeloConclusao] = await db.promise().query(sqlSetoresModeloConclusao, [modeloID])

    //? Obtém os profissionais vinculados aos setores selecionados no modelo (preenchimento e conclusão)
    const sqlPreenche = `
    SELECT
        d.profissionalID AS id, 
        d.nome
    FROM ${table} AS a
        JOIN setor AS b ON (a.setorID = b.setorID)
        JOIN profissional_setor AS c ON (a.setorID = c.setorID)
        JOIN profissional AS d ON (c.profissionalID = d.profissionalID)
    WHERE a.${key} = ? AND a.tipo = 1 AND b.status = 1 AND c.status = 1 AND d.status = 1
    GROUP BY d.profissionalID
    ORDER BY d.nome ASC`
    const [resultPreenche] = await db.promise().query(sqlPreenche, [modeloID])
    const sqlConclui = `
    SELECT
        d.profissionalID AS id, 
        d.nome
    FROM ${table} AS a
        JOIN setor AS b ON (a.setorID = b.setorID)
        JOIN profissional_setor AS c ON (a.setorID = c.setorID)
        JOIN profissional AS d ON (c.profissionalID = d.profissionalID)
    WHERE a.${key} = ? AND a.tipo = 2 AND b.status = 1 AND c.status = 1 AND d.status = 1
    GROUP BY d.profissionalID
    ORDER BY d.nome ASC`
    const [resultConclui] = await db.promise().query(sqlConclui, [modeloID])

    const result = {
        preenche: resultSetoresModeloPreenchimento[0].qtd > 0 ? resultPreenche : resultProfissionaisAtivos ?? [],
        conclui: resultSetoresModeloConclusao[0].qtd > 0 ? resultConclui : resultProfissionaisAtivos ?? []
    }

    return result
}

module.exports = SetorController;