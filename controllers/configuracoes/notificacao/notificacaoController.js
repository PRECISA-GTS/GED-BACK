const db = require('../../../config/db');

class NotificacaoController {
    async getData(req, res) {
        try {
            const { usuarioID, unidadeID } = req.params

            if (!usuarioID || !unidadeID) return res.status(400).json({ message: 'Parâmetros inválidos!' })

            const sqlTiposNotificacao = `
            SELECT * 
            FROM tiponotificacao AS tn`
            const [result] = await db.promise().query(sqlTiposNotificacao)

            for (const tipoNotificacao of result) {
                const sqlRotinas = `
                SELECT r.rotinaID, r.nome, r.descricao, 
                    (SELECT IF(COUNT(*) > 0, true, false)
                    FROM usuario_unidade_rotina AS uur 
                    WHERE uur.rotinaID = r.rotinaID AND uur.usuarioID = ${usuarioID} AND uur.unidadeID = ${unidadeID} AND uur.email = 1) AS email,
                    
                    (SELECT IF(COUNT(*) > 0, 1, 0)
                    FROM usuario_unidade_rotina AS uur 
                    WHERE uur.rotinaID = r.rotinaID AND uur.usuarioID = ${usuarioID} AND uur.unidadeID = ${unidadeID} AND uur.alerta = 1) AS alerta
                FROM rotina AS r
                WHERE r.tipoNotificacaoID = ${tipoNotificacao.tipoNotificacaoID}`
                const [rotinas] = await db.promise().query(sqlRotinas)
                tipoNotificacao.rotinas = rotinas
            }

            res.status(200).json(result)
        } catch (error) {
            console.log(error)
        }
    }

    async updateData(req, res) {
        try {
            const { usuarioID, unidadeID } = req.params
            const values = req.body

            if (!usuarioID || !unidadeID || !values) return res.status(400).json({ message: 'Parâmetros inválidos!' })

            const sql = `DELETE FROM usuario_unidade_rotina WHERE usuarioID = ${usuarioID} AND unidadeID = ${unidadeID}`
            await db.promise().query(sql)

            for (const category of values) {
                for (const rotina of category.rotinas) {
                    const sql = `INSERT INTO usuario_unidade_rotina (usuarioID, unidadeID, rotinaID, email, alerta) VALUES (?, ?, ?, ?, ?)`
                    const values = [usuarioID, unidadeID, rotina.rotinaID, rotina.email ? '1' : '0', rotina.alerta ? '1' : '0']
                    await db.promise().query(sql, values)
                }
            }

            res.status(200).json({ message: 'Dados atualizados com sucesso!' })

        } catch (error) {
            console.log(error)
        }
    }
}

module.exports = NotificacaoController;