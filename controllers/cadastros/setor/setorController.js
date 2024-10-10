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

            // obter todos os equipamentos ativos nos setores 
            const sql = `
            SELECT p.equipamentoID AS id, p.nome, ps.setorID
            FROM setor_equipamento AS ps 
                JOIN equipamento AS p ON (ps.equipamentoID = p.equipamentoID)
            WHERE p.unidadeID = ? AND ps.setorID IN (?) AND ps.status = 1 AND p.status = 1
            ORDER BY p.nome ASC`
            const [result] = await db.promise().query(sql, [unidadeID, setores])

            return res.status(200).json(result);
        } catch (error) {
            console.log(error)
        }
    }

    async getProfissionaisDepartamentosAssinatura(req, res) {
        const { formularioID, modeloID, unidadeID } = req.body

        if (!formularioID || !modeloID) {
            return res.status(400).json({ message: "Dados inválidos!" });
        }

        try {
            let result = null

            switch (formularioID) {
                case 1: //* Fornecedor
                    result = await getProfissionaisDepartamentosPreenchimento('par_fornecedor_modelo_setor', 'parFornecedorModeloID', modeloID, unidadeID)
                    break;
                case 2: //* Recebimento de MP
                    result = await getProfissionaisDepartamentosPreenchimento('par_recebimentomp_modelo_setor', 'parRecebimentoMpModeloID', modeloID, unidadeID)
                    break;
                case 3: //* Não conformidade do recebimento de MP
                    result = await getProfissionaisDepartamentosPreenchimento('par_recebimentomp_naoconformidade_modelo_setor', 'parRecebimentoMpNaoConformidadeModeloID', modeloID, unidadeID)
                    break;
                case 4: //* Limpeza
                    result = await getProfissionaisDepartamentosPreenchimento('par_limpeza_modelo_setor', 'parLimpezaModeloID', modeloID, unidadeID)
                    break;
            }

            return res.status(200).json(result)
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }
    //? Obtém os setores pra assinatura
    async getDepartamentosAssinatura(req, res) {
        const { formularioID, modeloID } = req.body

        if (!formularioID || !modeloID) {
            return res.status(400).json({ message: "Dados inválidos!" });
        }

        try {
            let result = null

            switch (formularioID) {
                case 1: //* Fornecedor
                    result = await getDepartamentosPreenchimento('par_fornecedor_modelo_setor', 'parFornecedorModeloID', modeloID)
                    break;
                case 2: //* Recebimento de MP
                    result = await getDepartamentosPreenchimento('par_recebimentomp_modelo_setor', 'parRecebimentoMpModeloID', modeloID)
                    break;
                case 3: //* Não conformidade do recebimento de MP
                    result = await getDepartamentosPreenchimento('par_recebimentomp_naoconformidade_modelo_setor', 'parRecebimentoMpNaoConformidadeModeloID', modeloID)
                    break;
                case 4: //* Limpeza
                    result = await getDepartamentosPreenchimento('par_limpeza_modelo_setor', 'parLimpezaModeloID', modeloID)
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
                COALESCE(GROUP_CONCAT(p.nome SEPARATOR ', '), '--') AS equipamentos
            FROM setor AS s
                LEFT JOIN setor_equipamento AS ps ON (s.setorID = ps.setorID AND ps.status = 1)
                LEFT JOIN equipamento AS p ON (ps.equipamentoID = p.equipamentoID)
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

    async getSetores(req, res) {
        const { unidadeID } = req.body
        if (!unidadeID) return res.status(400).json({ error: 'Unidade não informada!' })

        try {
            const sql = `
            SELECT setorID AS id, nome                
            FROM setor 
            WHERE unidadeID = ? 
            ORDER BY nome ASC`
            const [result] = await db.promise().query(sql, [unidadeID]);

            return res.status(200).json(result);
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
                localizacao, 
                funcao, 
                numeroFuncionarios, 
                observacao, 
                orientacoesLimpeza,
                status
            FROM setor                
            WHERE setorID = ?`
            const [result] = await db.promise().query(sql, [id]);

            const sqlProfissionais = `
            SELECT 
                ps.setorEquipamentoID AS id, 
                p.equipamentoID, 
                p.nome, 
                ps.status
            FROM setor_equipamento AS ps 
                JOIN equipamento AS p ON (ps.equipamentoID = p.equipamentoID)
            WHERE ps.setorID = ?
            ORDER BY ps.status DESC, p.nome ASC`
            const [resultProfissionais] = await db.promise().query(sqlProfissionais, [id]);

            const formatedProfissionais = resultProfissionais.map(row => {
                return {
                    ...row,
                    equipamento: {
                        id: row.equipamentoID,
                        nome: row.nome
                    }
                }
            })

            const data = {
                fields: {
                    ...result[0],
                    equipamentos: formatedProfissionais
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
            const sql = 'INSERT INTO setor (nome, localizacao, funcao, numeroFuncionarios, observacao, orientacoesLimpeza, unidadeID, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            const id = await executeQuery(sql, [
                fields.nome,
                fields.localizacao,
                fields.funcao,
                fields.numeroFuncionarios,
                fields.observacao,
                fields.orientacoesLimpeza,
                unidadeID,
                1
            ], 'insert', 'setor', 'setorID', null, logID)
            if (!id) return

            for (const row of fields.equipamentos) {
                const sqlItem = 'INSERT INTO setor_equipamento (setorID, equipamentoID) VALUES (?, ?)'
                await executeQuery(sqlItem, [
                    id,
                    row.equipamento.id
                ], 'insert', 'setor_equipamento', 'setorEquipamentoID', null, logID)
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
            const sql = `
            UPDATE setor 
            SET nome = ?, localizacao = ?, funcao = ?, numeroFuncionarios = ?, observacao = ?, orientacoesLimpeza = ?, status = ? 
            WHERE setorID = ?`
            await executeQuery(sql, [
                fields.nome,
                fields.localizacao,
                fields.funcao,
                fields.numeroFuncionarios,
                fields.observacao,
                fields.orientacoesLimpeza,
                fields?.status ? 1 : 0,
                id
            ], 'update', 'setor', 'setorID', id, logID)

            const existingItems = await db.promise().query(`SELECT setorEquipamentoID FROM setor_equipamento WHERE setorID = ?`, [id]);
            const incomingItemIDs = new Set(fields.equipamentos.map(item => item.id));

            // Remove os itens que não estão mais na nova lista
            for (const existingItem of existingItems[0]) {
                if (!incomingItemIDs.has(existingItem.setorEquipamentoID)) {
                    const sqlItemDelete = `DELETE FROM setor_equipamento WHERE setorEquipamentoID = ? AND setorID = ?`;
                    await executeQuery(sqlItemDelete, [existingItem.setorEquipamentoID, id], 'delete', 'setor_equipamento', 'setorEquipamentoID', existingItem.setorEquipamentoID, logID);
                }
            }

            // Atualiza ou insere os itens recebidos
            for (const item of fields.equipamentos) {
                if (item.id) {
                    const sqlItemUpdate = `UPDATE setor_equipamento SET equipamentoID = ? WHERE setorEquipamentoID = ? AND setorID = ?`;
                    await executeQuery(sqlItemUpdate, [
                        item.equipamento.id,
                        item.id,
                        id
                    ], 'update', 'setor_equipamento', 'setorEquipamentoID', item.id, logID);
                } else {
                    const sqlItemInsert = `INSERT INTO setor_equipamento (setorID, equipamentoID) VALUES (?, ?)`
                    await executeQuery(sqlItemInsert, [
                        id,
                        item.equipamento.id
                    ], 'insert', 'setor_equipamento', 'setorID', id, logID);
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
        return deleteItem(id, ['setor_equipamento', 'setor'], 'setorID', logID, res)
    }
}

const getDepartamentosPreenchimento = async (table, key, modeloID) => {
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

const getProfissionaisDepartamentosPreenchimento = async (table, key, modeloID, unidadeID) => {
    //? Todos os equipamentos ativos da unidade, caso não tenha setor vinculado ao modelo
    const sqlProfissionaisAtivos = `
    SELECT 
        a.equipamentoID AS id, 
        a.nome 
    FROM equipamento AS a
    WHERE a.unidadeID = ? AND a.status = 1`
    const [resultProfissionaisAtivos] = await db.promise().query(sqlProfissionaisAtivos, [unidadeID])

    //? Verifica quantidade de setores vinculados ao modelo (preenchimento e conclusão)
    const sqlDepartamentosModelo = `
    SELECT COUNT(*) AS qtd 
    FROM ${table} AS a
    WHERE a.${key} = ? AND a.tipo = 1`
    const [resultDepartamentosModeloPreenchimento] = await db.promise().query(sqlDepartamentosModelo, [modeloID])
    const sqlDepartamentosModeloConclusao = `
    SELECT COUNT(*) AS qtd 
    FROM ${table} AS a
    WHERE a.${key} = ? AND a.tipo = 2`
    const [resultDepartamentosModeloConclusao] = await db.promise().query(sqlDepartamentosModeloConclusao, [modeloID])

    //? Obtém os equipamentos vinculados aos setores selecionados no modelo (preenchimento e conclusão)
    const sqlPreenche = `
    SELECT
        d.equipamentoID AS id, 
        d.nome
    FROM ${table} AS a
        JOIN setor AS b ON (a.setorID = b.setorID)
        JOIN setor_equipamento AS c ON (a.setorID = c.setorID)
        JOIN equipamento AS d ON (c.equipamentoID = d.equipamentoID)
    WHERE a.${key} = ? AND a.tipo = 1 AND b.status = 1 AND c.status = 1 AND d.status = 1
    GROUP BY d.equipamentoID
    ORDER BY d.nome ASC`
    const [resultPreenche] = await db.promise().query(sqlPreenche, [modeloID])
    const sqlConclui = `
    SELECT
        d.equipamentoID AS id, 
        d.nome
    FROM ${table} AS a
        JOIN setor AS b ON (a.setorID = b.setorID)
        JOIN setor_equipamento AS c ON (a.setorID = c.setorID)
        JOIN equipamento AS d ON (c.equipamentoID = d.equipamentoID)
    WHERE a.${key} = ? AND a.tipo = 2 AND b.status = 1 AND c.status = 1 AND d.status = 1
    GROUP BY d.equipamentoID
    ORDER BY d.nome ASC`
    const [resultConclui] = await db.promise().query(sqlConclui, [modeloID])

    const result = {
        preenche: resultDepartamentosModeloPreenchimento[0].qtd > 0 ? resultPreenche : resultProfissionaisAtivos ?? [],
        conclui: resultDepartamentosModeloConclusao[0].qtd > 0 ? resultConclui : resultProfissionaisAtivos ?? []
    }

    return result
}

module.exports = SetorController;