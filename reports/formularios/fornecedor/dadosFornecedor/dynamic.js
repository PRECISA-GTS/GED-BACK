const db = require("../../../../config/db");

async function dynamic(data, modelo) {
    const resultData = [];
    // Fields header fixos
    const sqlFornecedorFixos = `
    SELECT 
        a.*,
        a.nome AS nomeFantasia,
        b.nome AS quemAbriu,
        c.nome AS aprovaProfissional,
        DATE_FORMAT(a.dataInicio, '%d/%m/%Y') AS dataInicio,
        DATE_FORMAT(a.dataInicio, '%H:%i:%s') AS horaInicio,
        DATE_FORMAT(a.dataFim, '%d/%m/%Y') AS dataFim,
        DATE_FORMAT(a.dataFim, '%H:%i:%s') AS horaFim    
    FROM fornecedor AS a
    JOIN profissional AS b ON (a.profissionalID = b.profissionalID)
    LEFT JOIN profissional AS c ON (a.aprovaProfissionalID = c.profissionalID)
    WHERE a.fornecedorID = ?`
    const [resultSqlFornecedor] = await db.promise().query(sqlFornecedorFixos, [data.id])
    const resultFornecedorFixos = resultSqlFornecedor[0]

    const header = [
        {
            'name': 'CNPJ',
            'value': resultFornecedorFixos.cnpj
        },
        {
            'name': 'Nome Fantasia',
            'value': resultFornecedorFixos.nome
        },
        {
            'name': 'Razao Social',
            'value': resultFornecedorFixos.razaoSocial
        },
        {
            'name': 'Quem Abriu',
            'value': resultFornecedorFixos.quemAbriu
        },
        {
            'name': 'Data Inicio',
            'value': resultFornecedorFixos.dataInicio
        },
        {
            'name': 'Data Fim',
            'value': resultFornecedorFixos.dataFim
        },
        {
            'name': 'Hora Inicio',
            'value': resultFornecedorFixos.horaInicio
        },
        {
            'name': 'Hora Fim',
            'value': resultFornecedorFixos.horaFim
        },
        {
            'name': 'Quem prenche',
            'value': resultFornecedorFixos.quemPreenche == 2 ? 'Fornecedor' : 'Fabrica'
        },
        {
            'name': 'Aprova Profissional',
            'value': resultFornecedorFixos.aprovaProfissional
        },
    ]

    resultData.push(...header)

    // Fields header dinamicos
    const sqlFornecedor = `
    SELECT *
            FROM par_fornecedor AS pf 
                LEFT JOIN par_fornecedor_modelo_cabecalho AS pfmc ON (pf.parFornecedorID = pfmc.parFornecedorID)
            WHERE pfmc.parFornecedorModeloID = ?
            ORDER BY pfmc.ordem ASC`
    const [colunsFornecedor] = await db.promise().query(sqlFornecedor, [modelo]);

    const columns = colunsFornecedor.map(row => row.nomeColuna);
    const titleColumns = colunsFornecedor.map(row => row.nomeCampo);
    const titleTable = colunsFornecedor.map(row => row.tabela);
    const typeColumns = colunsFornecedor.map(row => row.tipo);

    for (let i = 0; i < columns.length; i++) {
        let sqlQuery = ''
        if (typeColumns[i] == 'int') {
            sqlQuery = `
            SELECT  
            b.nome 
            FROM fornecedor AS a 
            JOIN ${titleTable[i]} AS b ON(a.${columns[i]} = b.${columns[i]})  
            WHERE fornecedorID = ?`
        } else {
            sqlQuery = `SELECT  ${columns[i]} FROM fornecedor WHERE fornecedorID = ?`;
        }
        const [queryResult] = await db.promise().query(sqlQuery, [data.id]);

        resultData.push({
            name: titleColumns[i],
            value: typeColumns[i] === 'date' && queryResult[0][columns[i]] !== null
                ? new Date(queryResult[0][columns[i]]).toLocaleDateString('pt-BR')
                : typeColumns[i] === 'int'
                    ? queryResult[0]?.nome
                    : queryResult[0][columns[i]]

        });
    }

    // Blocos e itens
    const sqlBlocks = `
    SELECT nome, parFornecedorModeloBlocoID
    FROM par_fornecedor_modelo_bloco
    WHERE parFornecedorModeloID = ? AND status = 1
    ORDER BY ordem ASC`;



    const [resultSqlBlocks] = await db.promise().query(sqlBlocks, [modelo]);
    const blocks = [];

    for (const block of resultSqlBlocks) {
        const blockID = block.parFornecedorModeloBlocoID;

        const sqlItensBlock = `
        SELECT 
        i.nome,

        (SELECT fr.resposta
        FROM fornecedor_resposta AS fr 
        WHERE fr.fornecedorID = ? AND fr.parFornecedorModeloBlocoID = pfbi.parFornecedorModeloBlocoID AND fr.itemID = pfbi.itemID) AS resposta

    FROM par_fornecedor_modelo_bloco_item AS pfbi 
        LEFT JOIN item AS i ON(pfbi.itemID = i.itemID)
    WHERE pfbi.parFornecedorModeloBlocoID = ? AND pfbi.status = 1
    ORDER BY pfbi.ordem ASC`;
        const [resultSqlItensBlock] = await db.promise().query(sqlItensBlock, [data.id, blockID]);

        blocks.push({
            nome: block.nome,
            itens: resultSqlItensBlock,
        });
    }

    return {
        header: resultData,
        blocks
    };

}

module.exports = dynamic;
