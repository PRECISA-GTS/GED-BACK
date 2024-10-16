
const { arraysIguais } = require('../../../configs/config');
const db = require('../../../../config/db');
const dynamic = require('./dynamic');
require('dotenv/config')

const formulario = async (req, res) => {
    const { user, report } = req.body

    // Dados do fornecedor
    const sqlFornecedor = 'SELECT status, parFornecedorModeloID, nome FROM fornecedor WHERE fornecedorID = ?'
    const [resultSqlsFornecedor] = await db.promise().query(sqlFornecedor, [report.id])
    const status = resultSqlsFornecedor[0]?.status
    const modelo = resultSqlsFornecedor[0]?.parFornecedorModeloID

    // Dados da unidade fabrica
    const sqlDataUnity = `SELECT * FROM unidade WHERE unidadeID = ${user.unidadeID}`
    const [resultSqlDataUnity] = await db.promise().query(sqlDataUnity)

    // Dados dos produtos solicitados para o fornecedor
    const sqlProduct = `
    SELECT 
        b.nome AS produtos
    FROM fornecedor_produto AS a
    LEFT JOIN produto AS b ON (a.produtoID = b.produtoID)
    WHERE a.fornecedorID = ?`
    const [resultSqlProduct] = await db.promise().query(sqlProduct, [report.id])


    let statusData = await dynamic(report, modelo)
    const result = {
        ...statusData,
        unidade: resultSqlDataUnity[0].nomeFantasia,
        fornecedor: resultSqlsFornecedor[0]?.nome,
        produtos: resultSqlProduct,
    };
    res.json(result)
}


module.exports = formulario;