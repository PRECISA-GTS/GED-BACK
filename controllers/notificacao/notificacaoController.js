const db = require('../../config/db');

class NotificacaoController {

    async getData(req, res) {
        const { unidadeID, usuarioID } = req.body
        try {
            const sqlGet = `
            SELECT 
                a.*,
                c.lido,
                c.usuarioID,
                b.nome AS tipoNotificacao,
                b.icone AS icone,
                b.cor AS cor,
                CASE
                    WHEN DATE(a.dataHora) = CURDATE() THEN 'hoje'
                    WHEN DATE(a.dataHora) = DATE(CURDATE() - INTERVAL 1 DAY) THEN 'ontem'
                    ELSE 
                        CONCAT(
                            DATEDIFF(CURDATE(), DATE(a.dataHora)),
                            ' dias'
                        )
                END AS dataFormatada
            FROM notificacao AS a
                JOIN tiponotificacao AS b ON (a.tipoNotificacaoID = b.tipoNotificacaoID)
                JOIN notificacao_usuario AS c ON (a.notificacaoID = c.notificacaoID)
            WHERE c.usuarioID = ? AND a.unidadeID = ? AND c.alerta = 1 AND c.lido = 0
            ORDER BY a.dataHora DESC`
            // const [resultSqlGet] = await db.promise().query(sqlGet, [usuarioID, unidadeID])
            // res.status(200).json(resultSqlGet)

            return res.status(200).json([])

        } catch (err) {
            console.log(err)
        }
    }

    async updateData(req, res) {
        const data = req.body
        try {
            if (data.length > 0) {
                // const sqlUpdate = `UPDATE notificacao_usuario SET lido = 1 WHERE notificacaoID IN (${data.join(',')})`
                // const [resultUpdate] = await db.promise().query(sqlUpdate)
                res.status(200).json({ message: 'Notificações lidas com sucesso!' })
            }
        } catch (err) {
            console.log(err)
        }
    }

    async insertData(req, res) {
        const data = req.body
        try {
            res.status(200).json({ message: 'Notificação aguardando...!' })
        } catch (err) {
            console.log(err)
        }
    }
}

module.exports = NotificacaoController;