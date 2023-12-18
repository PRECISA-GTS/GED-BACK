const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class SistemaQualidadeController {
    async getList(req, res) {
        try {
            const getList = `
            SELECT 
            a.sistemaqualidadeID AS id, 
            a.nome, 
            e.nome AS status,
            e.cor
            FROM sistemaqualidade AS a
            LEFT JOIN status AS e ON (a.status = e.statusID)
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
            const sqlGet = `SELECT * FROM sistemaqualidade WHERE sistemaqualidadeID = ?`
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
                table: 'sistemaqualidade',
                id: null
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Criação de sistema de qualidade', values.usuarioID, values.unidadeID, req)

            const sqlInsert = 'INSERT INTO sistemaqualidade (nome, status) VALUES (?, ?)'
            // const [resultSqlInsert] = await db.promise().query(sqlInsert, [values.fields.nome, values.fields.status])
            // const id = resultSqlInsert.insertId

            const id = await executeQuery(sqlInsert, [values.fields.nome, values.fields.status], 'insert', 'sistemaqualidade', 'sistemaQualidadeID', null, logID)
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
                columns: ['sistemaqualidadeID', 'nome'],
                values: [id, values.fields.nome],
                table: 'sistemaqualidade',
                id: id
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Atualização de sistema de qualidade', values.usuarioID, values.unidadeID, req)

            const sqlUpdate = `UPDATE sistemaqualidade SET nome = ?, status = ? WHERE sistemaqualidadeID = ?`
            await executeQuery(sqlUpdate, [values.fields.nome, values.fields.status, id], 'update', 'sistemaqualidade', 'sistemaQualidadeID', id, logID)

            return res.status(200).json({ message: 'Dados atualizados com sucesso' })
        } catch (error) {
            console.log(error)
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['sistemaqualidade'],
            column: 'sistemaqualidadeID'
        }

        const arrPending = [
            {
                table: 'fornecedor_sistemaqualidade',
                column: ['sistemaqualidadeID',],
            },

        ]

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de sistema de qualidade', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de sistema de qualidade', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}



module.exports = SistemaQualidadeController;