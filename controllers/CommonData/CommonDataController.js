const db = require('../../config/db');

class CommonDataController {

    async getData(req, res) {
        const { unidadeID } = req.body

        try {
            const sqlStatus = 'SELECT a.nome AS name, a.cor, a.statusID, a.icone FROM status AS a'
            const [resultStatus] = await db.promise().query(sqlStatus)

            const sqlProfessional = 'SELECT profissionalID AS id, nome AS name FROM profissional WHERE unidadeID = ? ORDER BY nome ASC'
            const [resultProfessional] = await db.promise().query(sqlProfessional, [unidadeID])

            const sqlRecebimentoModel = 'SELECT parRecebimentoMpModeloID AS id, nome AS name FROM par_recebimentomp_modelo WHERE unidadeID = ? ORDER BY nome ASC'
            const [resultRecebimentoModel] = await db.promise().query(sqlRecebimentoModel, [unidadeID])

            const results = {
                status: resultStatus,
                professional: resultProfessional,
                recebimentoModel: resultRecebimentoModel
            }
            return res.status(200).json(results)
        } catch (error) {
            res.status(500).json({ error: 'Erro ao obter CommonData' });
        }
    }
}

module.exports = CommonDataController;