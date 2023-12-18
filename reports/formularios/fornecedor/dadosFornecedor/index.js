
const { arraysIguais } = require('../../../configs/config');
const db = require('../../../../config/db');
const dynamic = require('./dynamic');

const dadosFornecedor = async (req, res) => {
    const data = req.body

    // Dados do fornecedor
    const sqlStatus = 'SELECT status, parFornecedorModeloID FROM fornecedor WHERE fornecedorID = ?'
    const [resultSqlStatus] = await db.promise().query(sqlStatus, [data.id])
    const status = resultSqlStatus[0].status
    const modelo = resultSqlStatus[0].parFornecedorModeloID

    // Dados da unidade fabrica
    const sqlDataUnity = 'SELECT * FROM unidade WHERE unidadeID = ?'
    const [resultSqlDataUnity] = await db.promise().query(sqlDataUnity, [data.unidadeID])

    // Dados dos produtos solicitados para o fornecedor
    const sqlProduct = `
    SELECT 
        
        b.nome AS produtos
    FROM fornecedor_produto AS a
    JOIN produto AS b ON (a.produtoID = b.produtoID)
    WHERE a.fornecedorID = ?`
    const [resultSqlProduct] = await db.promise().query(sqlProduct, [data.id])


    // Se status maior ou igual a 40 busca os dados do fornecedor senão da configurações_fornecedor
    let statusData = status >= 40 ? await dynamic(data) : await dynamic(data, modelo)
    const result = {
        ...statusData,
        unidade: resultSqlDataUnity[0].nomeFantasia,
        produtos: resultSqlProduct
    };
    res.json(result)
}


module.exports = dadosFornecedor;