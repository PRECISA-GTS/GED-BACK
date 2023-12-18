const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class TransportadorController {
    async getList(req, res) {
        try {
            const { unidadeID } = req.body

            if (!unidadeID) {
                return res.status(400).json({ message: "Unidade não informada!" });
            }

            const getList = `
            SELECT 
                a.transportadorID AS id, 
                a.nome, 
                e.nome AS status,
                e.cor
            FROM transportador AS a 
                LEFT JOIN status AS e ON (a.status = e.statusID)
            WHERE unidadeID = ?
            ORDER BY a.nome ASC;
            `
            const [resultGetList] = await db.promise().query(getList, [unidadeID]);
            res.status(200).json(resultGetList);
        } catch (error) {
            console.log(error)
        }
    }

    async getData(req, res) {
        try {
            const { id } = req.params
            const sqlGet = `SELECT * FROM transportador WHERE transportadorID = ?`
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
            const values = req.body
            console.log("🚀 ~ values:", values)

            //* Valida conflito
            const validateConflicts = {
                columns: ['nome', 'unidadeID'],
                values: [values.fields.nome, values.fields.unidadeID],
                table: 'transportador',
                id: null
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Criação de transportador', values.usuarioID, values.unidadeID, req)

            const sqlInsert = 'INSERT INTO transportador (nome, status, unidadeID) VALUES (?, ?, ?)'
            const id = await executeQuery(sqlInsert, [values.fields.nome, values.fields.status, values.unidadeID], 'insert', 'transportador', 'transportadorID', null, logID)

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
                columns: ['transportadorID', 'nome'],
                values: [id, values.fields.nome],
                table: 'transportador',
                id: id
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }
            const logID = await executeLog('Atualização de transportador', values.usuarioID, values.unidadeID, req)

            const sqlUpdate = `UPDATE transportador SET nome = ?, status = ? WHERE transportadorID = ?`

            await executeQuery(sqlUpdate, [values.fields.nome, values.fields.status, values.unidadeID], 'update', 'transportador', 'transportadorID', id, logID)


            return res.status(200).json({ message: 'Dados atualizados com sucesso' })
        } catch (error) {
            console.log(error)
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['transportador'],
            column: 'transportadorID'
        }

        const arrPending = [
            {
                table: 'recebimentomp',
                column: ['transportadorID',],
            },

        ]


        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de transportador', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de transportador', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}



module.exports = TransportadorController;