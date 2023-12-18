const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class AtividadeController {
    async getList(req, res) {
        try {
            const getList = `
            SELECT 
            a.atividadeID AS id, 
            a.nome, 
            e.nome AS status,
            e.cor
            FROM atividade AS a
            JOIN status as e ON (a.status = e.statusID);
            `
            const [resultGetList] = await db.promise().query(getList);
            res.status(200).json(resultGetList);
        } catch (error) {
            console.log(error)
        }
    }

    async getData(req, res) {
        try {
            const { id } = req.params
            const sqlGet = `SELECT * FROM atividade WHERE atividadeID = ?`
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
        const values = req.body
        try {
            //* Valida conflito
            const validateConflicts = {
                columns: ['nome'],
                values: [values.fields.nome],
                table: 'atividade',
                id: null
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }
            const logID = await executeLog('Criação de atividade', values.usuarioID, values.unidadeID, req)

            const sqlInsert = 'INSERT INTO atividade (nome, status) VALUES (?, ?)'
            const id = await executeQuery(sqlInsert, [values.fields.nome, values.fields.status,], 'insert', 'atividade', 'atividadeID', null, logID)

            return res.status(200).json(id)

        } catch (error) {
            console.log(error)
        }
    }

    async updateData(req, res) {
        try {
            const { id } = req.params
            const values = req.body

            //* Valida conflito
            const validateConflicts = {
                columns: ['atividadeID', 'nome'],
                values: [id, values.fields.nome],
                table: 'atividade',
                id: id
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }
            const logID = await executeLog('Atualização de atividade', values.usuarioID, values.unidadeID, req)

            const sqlUpdate = `UPDATE atividade SET nome = ?, status = ? WHERE atividadeID = ?`
            executeQuery(sqlUpdate, [values.fields.nome, values.fields.status, id], 'update', 'atividade', 'atividadeID', id, logID)

            return res.status(200).json({ message: 'Dados atualizados com sucesso' })
        } catch (error) {
            console.log(error)
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params

        const objDelete = {
            table: ['atividade'],
            column: 'atividadeID'
        }

        const arrPending = [
            {
                table: 'recebimentomp_produto',
                column: ['atividadeID'],
            },

        ]

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de atividade', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de atividade', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}



module.exports = AtividadeController;