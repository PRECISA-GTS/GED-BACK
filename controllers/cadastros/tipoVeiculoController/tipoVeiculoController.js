const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class TipoVeiculoController {
    async getList(req, res) {
        try {
            const getList = `
            SELECT 
                a.tipoVeiculoID AS id, 
                a.nome, 
                e.nome AS status,
                e.cor
            FROM tipoveiculo AS a
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
            const sqlGet = `SELECT * FROM tipoveiculo WHERE tipoVeiculoID = ?`
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
        const data = req.body
        console.log("🚀 ~ data:", data)
        try {

            //* Valida conflito
            const validateConflicts = {
                columns: ['nome'],
                values: [data.fields.nome],
                table: 'tipoveiculo',
                id: null
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Criação de tipo veículo', data.usuarioID, data.unidadeID, req)

            const sqlInsert = 'INSERT INTO tipoveiculo (nome, status) VALUES (?, ?)'
            const id = await executeQuery(sqlInsert, [data.fields.nome, data.fields.status], 'insert', 'tipoveiculo', 'tipoveiculoID', null, logID)

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
            const values = req.body

            //* Valida conflito
            const validateConflicts = {
                columns: ['tipoVeiculoID', 'nome'],
                values: [id, values.fields.nome],
                table: 'tipoVeiculo',
                id: id
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Atualização de tipo veículo', values.usuarioID, values.unidadeID, req)

            const sqlUpdate = `UPDATE tipoVeiculo SET nome = ?, status = ? WHERE tipoVeiculoID = ?`
            await executeQuery(sqlUpdate, [values.fields.nome, values.fields.status, id], 'update', 'tipoVeiculo', 'tipoVeiculoID', id, logID)

            return res.status(200).json({ message: 'Dados atualizados com sucesso' })
        } catch (error) {
            console.log(error)
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['tipoveiculo'],
            column: 'tipoVeiculoID'
        }

        const arrPending = [
            {
                table: 'recebimentomp',
                column: ['tipoVeiculoID',],
            },

        ]


        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de tipo veículo', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de tipo veículo', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}



module.exports = TipoVeiculoController;