const db = require('../../../../config/db');


const dynamic = async (data, modelo) => {
    const resultData = [];

    // Fields fixos
    sqlRecebimento = `
    SELECT 
        a.*,
        b.nome AS quemAbriu,
        c.nome AS aprova,
        d.nome AS preenche,
        e.nome AS nomeFantasia,
        DATE_FORMAT(a.dataInicio, '%d/%m/%Y') AS dataInicio,
        DATE_FORMAT(a.dataInicio, '%H:%i:%s') AS horaInicio,
        DATE_FORMAT(a.dataFim, '%d/%m/%Y') AS dataFim,
        DATE_FORMAT(a.dataFim, '%H:%i:%s') AS horaFim    
    FROM recebimentomp AS a
    LEFT JOIN profissional AS b ON (a.abreProfissionalID = b.profissionalID)
    LEFT JOIN profissional AS d ON (a.preencheProfissionalID = d.profissionalID)
    LEFT JOIN profissional AS c ON (a.aprovaProfissionalID = c.profissionalID)
    JOIN fornecedor AS e ON (a.fornecedorID = e.fornecedorID)

    WHERE a.recebimentoMpID = ?`
    const [resultSqlRecebimentoMp] = await db.promise().query(sqlRecebimento, [data.id])
    const resultDataFixos = resultSqlRecebimentoMp[0]

    const header = [
        {
            'name': 'Data Inicio',
            'value': resultDataFixos?.dataInicio
        },
        {
            'name': 'Data Fim',
            'value': resultDataFixos?.dataFim
        },
        {
            'name': 'Hora Inicio',
            'value': resultDataFixos?.horaInicio
        },
        {
            'name': 'Hora Fim',
            'value': resultDataFixos?.horaFim
        },
        {
            'name': 'Fornecedor',
            'value': resultDataFixos?.nomeFantasia
        },
        {
            'name': 'Profissional que abriu',
            'value': resultDataFixos?.quemAbriu
        },
        {
            'name': 'Profissional que preenche',
            'value': resultDataFixos?.preenche
        },
        {
            'name': 'Profissional que aprova',
            'value': resultDataFixos?.aprova
        },
    ]


    resultData.push(...header)

    // Fields header dinamicos
    const sqlRecebimentoFixos = `
    SELECT *
    FROM par_recebimentomp AS pf 
        LEFT JOIN par_recebimentomp_modelo_cabecalho AS pfmc ON (pf.parRecebimentoMpID = pfmc.parRecebimentoMpID)
    WHERE pfmc.parRecebimentoMpModeloID = ?
    ORDER BY pfmc.ordem ASC`
    const [colunsRecebimento] = await db.promise().query(sqlRecebimentoFixos, [modelo]);

    const columns = colunsRecebimento.map(row => row.nomeColuna);
    const titleColumns = colunsRecebimento.map(row => row.nomeCampo);
    const titleTable = colunsRecebimento.map(row => row.tabela);
    const typeColumns = colunsRecebimento.map(row => row.tipo);


    for (let i = 0; i < columns.length; i++) {
        let sqlQuery = ''
        if (typeColumns[i] == 'int') {
            sqlQuery = `
            SELECT  
                b.nome 
            FROM recebimentomp AS a 
                JOIN ${titleTable[i]} AS b ON(a.${columns[i]} = b.${columns[i]})  
            WHERE recebimentoMpID = ?`
        } else {
            sqlQuery = `SELECT  ${columns[i]} FROM recebimentomp WHERE recebimentoMpID = ?`;
        }
        const [queryResult] = await db.promise().query(sqlQuery, [data.id]);
        console.log("🚀 ~ queryResult:", queryResult)

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
    SELECT 
        nome, 
        parRecebimentoMpModeloBlocoID
    FROM par_recebimentomp_modelo_bloco
    WHERE parRecebimentoMpModeloID = ? AND status = 1
    ORDER BY ordem ASC`;

    const [resultSqlBlocks] = await db.promise().query(sqlBlocks, [modelo]);
    const blocks = [];

    for (const block of resultSqlBlocks) {
        const blockID = block.parRecebimentoMpModeloBlocoID;

        const sqlItensBlock = `
        SELECT 
            i.nome,
            (SELECT fr.resposta
            FROM recebimentomp_resposta AS fr 
            WHERE fr.recebimentoMpID = ? AND fr.parRecebimentoMpModeloBlocoID = pfbi.parRecebimentoMpModeloBlocoID AND fr.itemID = pfbi.itemID) AS resposta
        FROM par_recebimentomp_modelo_bloco_item AS pfbi 
            LEFT JOIN item AS i ON(pfbi.itemID = i.itemID)
        WHERE pfbi.parRecebimentoMpModeloBlocoID = ? AND pfbi.status = 1
        ORDER BY pfbi.ordem ASC`;
        const [resultSqlItensBlock] = await db.promise().query(sqlItensBlock, [data.id, blockID]);

        blocks.push({
            nome: block.nome,
            itens: resultSqlItensBlock,
        });
    }

    // Produtos
    const getProdutos = `
    SELECT
        rp.recebimentoMpProdutoID,
        rp.quantidade,
        DATE_FORMAT(rp.dataFabricacao, '%Y-%m-%d') AS dataFabricacao,
        rp.lote,
        rp.nf,
        DATE_FORMAT(rp.dataValidade, '%Y-%m-%d') AS dataValidade,
        p.produtoID,
        p.nome AS produto,
        a.apresentacaoID,
        um.nome AS unidadeMedida,
        a.nome AS apresentacao                
    FROM recebimentomp_produto AS rp
        JOIN produto AS p ON(rp.produtoID = p.produtoID)
        JOIN unidademedida AS um ON(p.unidadeMedidaID = um.unidadeMedidaID)
        LEFT JOIN apresentacao AS a ON(rp.apresentacaoID = a.apresentacaoID)
    WHERE rp.recebimentoMpID = ?
    ORDER BY p.nome ASC`

    const [resultProdutos] = await db.promise().query(getProdutos, [data.id]);

    // Não conformidades
    const sqlNaoConformidades = `
    SELECT 
        rn.recebimentoMpNaoConformidadeID,
        rn.parRecebimentoMpNaoConformidadeModeloID,
        prnm.nome AS modeloNome,
        DATE_FORMAT(rn.data, '%d/%m/%Y') AS data,
        DATE_FORMAT(rn.data, '%H:%i') AS hora,
        pp.profissionalID AS profissionalIDPreenchimento,
        pp.nome AS profissionalNomePreenchimento,
        rn.tipo,
        pr.produtoID,
        pr.nome AS produtoNome,
        rn.descricao,
        rn.acoesSolicitadas,
        rn.fornecedorPreenche,
        rn.obsFornecedor, 
        DATE_FORMAT(rn.dataFornecedor, '%d/%m/%Y') AS dataFornecedor,
        DATE_FORMAT(rn.dataFornecedor, '%H:%i') AS horaFornecedor,
        u.usuarioID AS usuarioIDFornecedor,
        u.nome AS usuarioNomeFornecedor,
        rn.conclusao,
        DATE_FORMAT(rn.dataConclusao, '%d/%m/%Y') AS dataConclusao,
        DATE_FORMAT(rn.dataConclusao, '%H:%i') AS horaConclusao,
        pc.profissionalID AS profissionalIDConclusao,
        pc.nome AS profissionalNomeConclusao,
        rn.status
    FROM recebimentomp_naoconformidade AS rn
        LEFT JOIN profissional AS pp ON (rn.profissionalIDPreenchimento = pp.profissionalID)                
        LEFT JOIN produto AS pr ON (rn.produtoID = pr.produtoID)
        LEFT JOIN usuario AS u ON (rn.usuarioID = u.usuarioID)
        LEFT JOIN profissional AS pc ON (rn.profissionalIDConclusao = pc.profissionalID)
        LEFT JOIN par_recebimentomp_naoconformidade_modelo AS prnm ON (rn.parRecebimentoMpNaoConformidadeModeloID = prnm.parRecebimentoMpNaoConformidadeModeloID)
    WHERE rn.recebimentoMpID = ? `

    const [resultNaoConformidades] = await db.promise().query(sqlNaoConformidades, [data.id]);

    const values = {
        header: resultData,
        blocks,
        produtos: resultProdutos,
        naoConformidades: resultNaoConformidades

    };

    return values
}

module.exports = dynamic 