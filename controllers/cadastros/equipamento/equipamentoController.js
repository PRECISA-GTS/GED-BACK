const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class EquipamentoController {
    async getList(req, res) {
        try {
            const { unidadeID } = req.body

            if (!unidadeID) {
                return res.status(400).json({ message: "Unidade não informada!" });
            }

            const getList = `
            SELECT 
                a.equipamentoID AS id, 
                a.nome, 
                a.tipo,
                e.nome AS status,
                e.cor
            FROM equipamento AS a 
                LEFT JOIN status AS e ON (a.status = e.statusID)
            WHERE a.unidadeID = ?
            ORDER BY a.nome ASC`
            const [resultGetList] = await db.promise().query(getList, [unidadeID]);
            res.status(200).json(resultGetList);
        } catch (error) {
            console.log(error)
        }
    }

    async getEquipamentos(req, res) {
        try {
            const { unidadeID } = req.body

            if (!unidadeID) {
                return res.status(400).json({ message: "Unidade não informada!" });
            }

            const sql = `
            SELECT 
                equipamentoID AS id, 
                nome                
            FROM equipamento
            WHERE unidadeID = ? AND status = 1
            ORDER BY nome ASC`
            const [result] = await db.promise().query(sql, [unidadeID]);

            res.status(200).json(result);
        } catch (error) {
            console.log(error)
        }
    }

    async getData(req, res) {
        try {
            const { id } = req.params
            const sqlGet = `SELECT * FROM equipamento WHERE equipamentoID = ?`
            const [resultSqlGet] = await db.promise().query(sqlGet, id)
            const result = {
                fields: resultSqlGet[0]
            }
            return res.status(200).json(result)
        } catch (error) {
            console.log(error)
        }
    }

    async insertData(req, res) {
        try {
            const data = req.body

            //* Valida conflito
            const validateConflicts = {
                columns: ['nome', 'unidadeID'],
                data: [data.fields.nome, data.fields.unidadeID],
                table: 'equipamento',
                id: null
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Criação de equipamento', data.usuarioID, data.unidadeID, req)

            const sqlInsert = 'INSERT INTO equipamento (nome, tipo, status, unidadeID) VALUES (?, ?, ?, ?)'
            const id = await executeQuery(sqlInsert, [data.fields.nome, data.fields.tipo, data.fields.status, data.unidadeID], 'insert', 'equipamento', 'equipamentoID', null, logID)


            const values = {
                id,
                value: data.fields.nome
            }

            return res.status(200).json(values)
        } catch (error) {
            console.log(error)
        }
    }

    async updateData(req, res) {
        try {
            const { id } = req.params
            const data = req.body

            //* Valida conflito
            const validateConflicts = {
                columns: ['equipamentoID', 'nome'],
                data: [id, data.fields.nome],
                table: 'equipamento',
                id: id
            }

            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Atualização de equipamento', data.usuarioID, data.unidadeID, req)

            const sqlUpdate = `UPDATE equipamento SET nome = ?, tipo = ?, status = ?, unidadeID = ? WHERE equipamentoID = ?`
            await executeQuery(sqlUpdate, [data.fields.nome, data.fields.tipo, data.fields.status, data.unidadeID, id], 'update', 'equipamento', 'equipamentoID', id, logID)

            return res.status(200).json({ message: 'Dados atualizados com sucesso' });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: "Erro interno no servidor" });
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['equipamento'],
            column: 'equipamentoID'
        }

        const arrPending = []

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de equipamento', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de equipamento', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}

module.exports = EquipamentoController;