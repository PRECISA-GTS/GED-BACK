const db = require('../../config/db');

class CommonDataController {

    async getData(req, res) {
        const { unidadeID } = req.body

        try {
            const sqlStatus = 'SELECT a.nome AS name, a.statusID FROM status AS a'
            const [resultStatus] = await db.promise().query(sqlStatus)

            const sqlProfessional = 'SELECT profissionalID AS id, nome AS name FROM profissional WHERE unidadeID = ? ORDER BY nome ASC'
            const [resultProfessional] = await db.promise().query(sqlProfessional, [unidadeID])

            const sqlRecebimentoModel = 'SELECT parRecebimentoMpModeloID AS id, nome AS name FROM par_recebimentomp_modelo WHERE unidadeID = ? ORDER BY nome ASC'
            const [resultRecebimentoModel] = await db.promise().query(sqlRecebimentoModel, [unidadeID])

            const sqlLimpezaModel = 'SELECT parLimpezaModeloID AS id, nome AS name FROM par_limpeza_modelo WHERE unidadeID = 1 ORDER BY nome ASC'
            const [resultLimpezaModel] = await db.promise().query(sqlLimpezaModel, [unidadeID])

            const sqlTypeFormulario = 'SELECT parFormularioID AS id, nome AS name FROM par_formulario ORDER BY nome ASC'
            const [resultTypeFormulario] = await db.promise().query(sqlTypeFormulario)

            const results = {
                status: resultStatus,
                professional: resultProfessional,
                recebimentoModel: resultRecebimentoModel,
                limpezaModel: resultLimpezaModel,
                typeFormulario: resultTypeFormulario
            }
            return res.status(200).json(results)
        } catch (error) {
            res.status(500).json({ error: 'Erro ao obter CommonData' });
        }
    }
}

module.exports = CommonDataController;