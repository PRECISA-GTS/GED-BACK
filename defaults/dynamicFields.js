const db = require('../config/db');
const { hasUnidadeID } = require('./functions');

/*
* Params ex:
    * id
    * modeloID
    * unidadeID
    * 'par_recebimentomp'
    * 'parRecebimentoMpID'
    * 'parRecebimentoMpModeloID'
    * 'recebimentomp'
    * 'recebimentoMpID'
*/
const getDynamicHeaderFields = async (
    id,
    modelID,
    unityID,

    tableConfig,
    commonColumnConfig,
    columnKeyConfig,

    table,
    columnKey
) => {
    if (!modelID) return null

    // Fields do header
    const sql = `
    SELECT *
    FROM ${tableConfig} AS a
        LEFT JOIN ${tableConfig}_modelo_cabecalho AS b ON (a.${commonColumnConfig} = b.${commonColumnConfig})
    WHERE b.${columnKeyConfig} = ? 
    ORDER BY b.ordem ASC`
    const [resultFields] = await db.promise().query(sql, [modelID])

    // Varre fields, verificando se há tipo == 'int', se sim, busca opções pra selecionar no select 
    for (const alternatives of resultFields) {
        if (alternatives.tipo === 'int' && alternatives.tabela) {
            // Busca cadastros ativos e da unidade (se houver unidadeID na tabela)
            const sqlOptions = `
            SELECT ${alternatives.tabela}ID AS id, nome
            FROM ${alternatives.tabela} 
            WHERE status = 1 ${await hasUnidadeID(alternatives.tabela) ? ` AND unidadeID = ${unityID} ` : ``}
            ORDER BY nome ASC`
            const [resultOptions] = await db.promise().query(sqlOptions)
            alternatives.options = resultOptions
        }
    }

    // Varrer result, pegando nomeColuna e inserir em um array se row.tabela == null
    let columns = []
    for (const row of resultFields) {
        if (!row.tabela) { columns.push(row.nomeColuna) }
    }

    // varrer resultFields 
    for (const field of resultFields) {
        if (field.tabela) {
            // Monta objeto pra preencher select 
            // Ex.: profissional:{
            //     id: 1,
            //     nome: 'Fulano'
            // }
            const sqlFieldData = `
            SELECT t.${field.nomeColuna} AS id, t.nome
            FROM ${table} AS f 
                JOIN ${field.tabela} AS t ON(f.${field.nomeColuna} = t.${field.nomeColuna}) 
            WHERE f.${columnKey} = ${id} `
            let [temp] = await db.promise().query(sqlFieldData)
            if (temp) {
                field[field.tabela] = temp[0]
            }
        } else {
            const sqlFieldData = `SELECT ${field.nomeColuna} AS coluna FROM ${table} WHERE ${columnKey} = ? `;
            let [resultFieldData] = await db.promise().query(sqlFieldData, [id])
            field[field.nomeColuna] = resultFieldData[0].coluna ?? ''
        }
    }

    return resultFields ?? null
}

module.exports = { getDynamicHeaderFields }