const db = require('../../config/db');

/* 
* Params ex:
    * modelID
    * 'par_recebimentomp_modelo_setor'
    * 'parRecebimentoMpModeloID'    
*/

const getHeaderSectors = async (modelID, table, tableKey) => {
    //? Setores vinculados ao cabeçalho e rodapé (preenchimento e conclusão)
    const sql = `
    SELECT 
        b.setorID AS id, 
        b.nome, 
        a.tipo
    FROM ${table} AS a 
        JOIN setor AS b ON (a.setorID = b.setorID)
    WHERE a.${tableKey} = ? AND b.status = 1
    ORDER BY b.nome ASC`
    const [result] = await db.promise().query(sql, [modelID])

    const fill = result.filter(row => row?.tipo === 1)
    const conclude = result.filter(row => row?.tipo === 2)

    return { fill, conclude }
}

/*
* Params ex:
    * blockID
    * 'par_recebimentomp_naoconformidade_modelo_bloco_setor'
    * 'parRecebimentoMpNaoConformidadeModeloBlocoID'    
*/
const getBlockSectors = async (blockID, table, tableKey) => {
    const sql = `
    SELECT s.setorID AS id, s.nome
    FROM ${table} AS prmbs
        JOIN setor AS s ON (prmbs.setorID = s.setorID)
    WHERE prmbs.${tableKey} = ?
    GROUP BY s.setorID
    ORDER BY s.nome ASC`
    const [result] = await db.promise().query(sql, [blockID])

    return result ?? []
}

module.exports = { getHeaderSectors, getBlockSectors }