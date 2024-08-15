const db = require('../../../config/db');
const { deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class SetorController {
    async getList(req, res) {
        try {
            const { unidadeID } = req.body
            if (!unidadeID) return res.status(400).json({ error: 'Unidade não informada!' })

            const getList = `
            SELECT 
                s.setorID AS id, 
                s.nome, 
                e.nome AS status,
                e.cor,
                COALESCE(GROUP_CONCAT(p.nome SEPARATOR ', '), '--') AS profissionais
            FROM setor AS s
                LEFT JOIN profissional_setor AS ps ON (s.setorID = ps.setorID)
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
            ORDER BY ps.dataInicio, p.nome ASC`
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
                        item.dataFim ? 0 : 1, // Status
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
                        item.dataFim ? 0 : 1 // Status
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

module.exports = SetorController;