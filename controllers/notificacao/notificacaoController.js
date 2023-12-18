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
            const [resultSqlGet] = await db.promise().query(sqlGet, [usuarioID, unidadeID])
            res.status(200).json(resultSqlGet)
        } catch (err) {
            console.log(err)
        }
    }

    async updateData(req, res) {
        const data = req.body
        try {
            if (data.length > 0) {
                const sqlUpdate = `UPDATE notificacao_usuario SET lido = 1 WHERE notificacaoID IN (${data.join(',')})`
                const [resultUpdate] = await db.promise().query(sqlUpdate)
                res.status(200).json({ message: 'Notificações lidas com sucesso!' })
            }
        } catch (err) {
            console.log(err)
        }
    }

    async insertData(req, res) {
        const data = req.body
        try {
            if (data.usuarioID == 0) { //? Gera notificação pra todos os usuários da unidade
                const sqlUsers = `
                SELECT usuarioID FROM usuario_unidade WHERE unidadeID = ? AND papelID = ?`
                const [resultUsers] = await db.promise().query(sqlUsers, [data.unidadeID, data.papelID])

                if (resultUsers.length > 0) {
                    const sqlInsert = 'INSERT INTO notificacao (titulo, descricao, url, urlID, tipoNotificacaoID, usuarioGeradorID, unidadeID) VALUES (?,?,?,?,?,?,?)'
                    const [resultInsert] = await db.promise().query(sqlInsert, [
                        data.titulo,
                        data.descricao,
                        data.url,
                        data.urlID,
                        data.tipoNotificacaoID,
                        data.usuarioGeradorID,
                        data.unidadeID
                    ])
                    const notificacaoID = resultInsert.insertId

                    //? Grava em notificacao_usuario
                    const sqlInsertNotificacaoUsuario = 'INSERT INTO notificacao_usuario (notificacaoID, usuarioID, email, alerta) VALUES (?, ?, ?, ?)'
                    for (let i = 0; i < resultUsers.length; i++) {
                        const [resultInsertNotificacaoUsuario] = await db.promise().query(sqlInsertNotificacaoUsuario, [
                            notificacaoID,
                            resultUsers[i].usuarioID,
                            data.email ? '1' : '0',
                            data.alerta ? '1' : '0'
                        ])
                    }

                    return res.status(200).json({ message: 'Notificação cadastrada com sucesso!' })
                }
            } else {
                //? Gera notificação pra um usuário específico

                //? Se não tiver unidadeID no data faz um select nas unidades do usuário e seta o indice 0 como unidadeID
                let unidadeID = data.unidadeID;
                if (!data.unidadeID) {
                    const sqlGetUnity = 'SELECT * FROM usuario_unidade WHERE usuarioID = ?'
                    const [resultGetUnity] = await db.promise().query(sqlGetUnity, [data.usuarioID])
                    if (resultGetUnity.length > 0) {
                        unidadeID = resultGetUnity[0].unidadeID;
                    }
                }
                const sqlInsert = 'INSERT INTO notificacao (titulo, descricao, url, urlID, tipoNotificacaoID, usuarioGeradorID, unidadeID) VALUES (?,?,?,?,?,?,?)'
                const [resultInsert] = await db.promise().query(sqlInsert, [
                    data.titulo,
                    data.descricao,
                    data.url,
                    data.urlID,
                    data.tipoNotificacaoID,
                    data.usuarioGeradorID,
                    unidadeID
                ])
                const notificacaoID = resultInsert.insertId

                //? Grava em notificacao_usuario
                const sqlInsertNotificacaoUsuario = 'INSERT INTO notificacao_usuario (notificacaoID, usuarioID, email, alerta) VALUES (?, ?, ?, ?)'
                const [resultInsertNotificacaoUsuario] = await db.promise().query(sqlInsertNotificacaoUsuario, [
                    notificacaoID,
                    data.usuarioID,
                    data.email ? '1' : '0',
                    data.alerta ? '1' : '0'
                ])
                return res.status(200).json({ message: 'Notificação cadastrada com sucesso!' })
            }
        } catch (err) {
            console.log(err)
        }
    }
}

module.exports = NotificacaoController;