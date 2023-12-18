
const db = require('../../../../config/db');
const dynamic = require('./dynamic');

const dadosRecebimentoMp = async (req, res) => {
    const data = req.body

    // Dados do recebimento
    const sqlStatus = 'SELECT status, parRecebimentoMpModeloID FROM recebimentomp WHERE recebimentompID = ?'
    const [resultSqlStatus] = await db.promise().query(sqlStatus, [data.id])
    // const status = resultSqlStatus[0].status
    const status = 20
    const modelo = resultSqlStatus[0].parRecebimentoMpModeloID

    // Dados da unidade fabrica
    const sqlDataUnity = 'SELECT * FROM unidade WHERE unidadeID = ?'
    const [resultSqlDataUnity] = await db.promise().query(sqlDataUnity, [data.unidadeID])


    // Se status maior ou igual a 40 busca os dados do recebimentoMP senão da configurações_recebimentoMP
    let statusData = status >= 40 ? await dynamic(data, modelo) : await dynamic(data, modelo)
    const result = {
        ...statusData,
        unidade: resultSqlDataUnity[0].nomeFantasia,
        status: status,
        modelo: modelo
    }
    res.json(result)
}


module.exports = dadosRecebimentoMp;