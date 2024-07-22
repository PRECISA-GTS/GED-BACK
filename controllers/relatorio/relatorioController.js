const db = require('../../config/db');

class RelatorioController {
    async getHeader(req, res) {
        const { unidadeID } = req.body

        const sql = `
        SELECT 
            cnpj, 
            cabecalhoRelatorio AS url, 
            tituloRelatorio,
            TRIM(
                TRAILING ', ' FROM CONCAT_WS(', ',
                    IF(logradouro <> '', logradouro, NULL),
                    IF(numero <> '', numero, NULL),
                    IF(complemento <> '', complemento, NULL),
                    IF(bairro <> '', bairro, NULL),
                    IF(cidade <> '', CONCAT(cidade, '/', uf), NULL),
                    IF(cep <> '', CONCAT('CEP: ', cep), NULL)
                )
            ) AS endereco
        FROM unidade 
        WHERE unidadeID = ?`
        const [result] = await db.promise().query(sql, [unidadeID])
        res.status(200).json(result[0])
    }
}

module.exports = RelatorioController;