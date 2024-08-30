const db = require('../config/db');

/*
* Params ex:
    * id
    * modeloID
    * 'recebimentoMpID'
    * 'par_recebimentomp_modelo_bloco'
    * 'parRecebimentoMpModeloID'
    * 'recebimentomp_resposta'
    * 'par_recebimentomp_modelo_bloco_item'
    * 'parRecebimentoMpNaoConformidadeModeloBlocoItemID'
    * 'parRecebimentoMpModeloBlocoID'
    * 'par_recebimentomp_modelo_bloco_setor'
    
*/
const getDynamicBlocks = async (id, modeloID, rootKey, tableConfig, columnKeyConfig, tableResponse, tableConfigItem, columnKeyConfigItem, columnKeyConfigBlock, tableConfigSetor) => {
    const sql = `
    SELECT *
    FROM ${tableConfig}
    WHERE ${columnKeyConfig} = ? AND status = 1
    ORDER BY ordem ASC`
    const [resultBlocos] = await db.promise().query(sql, [modeloID])

    //? Blocos
    const sqlBloco = `
    SELECT prbi.*, i.*, a.nome AS alternativa,

        (SELECT rr.respostaID
        FROM ${tableResponse} AS rr 
        WHERE rr.${rootKey} = ? AND rr.${columnKeyConfigBlock} = prbi.${columnKeyConfigBlock} AND rr.itemID = prbi.itemID) AS respostaID,

        (SELECT rr.resposta
        FROM ${tableResponse} AS rr 
        WHERE rr.${rootKey} = ? AND rr.${columnKeyConfigBlock} = prbi.${columnKeyConfigBlock} AND rr.itemID = prbi.itemID) AS resposta,

        (SELECT rr.obs
        FROM ${tableResponse} AS rr 
        WHERE rr.${rootKey} = ? AND rr.${columnKeyConfigBlock} = prbi.${columnKeyConfigBlock} AND rr.itemID = prbi.itemID) AS observacao

    FROM ${tableConfigItem} AS prbi 
        LEFT JOIN item AS i ON(prbi.itemID = i.itemID)
        LEFT JOIN alternativa AS a ON(i.alternativaID = a.alternativaID)
    WHERE prbi.${columnKeyConfigBlock} = ? AND prbi.status = 1
    ORDER BY prbi.ordem ASC`

    for (const bloco of resultBlocos) {
        const [resultBloco] = await db.promise().query(sqlBloco, [id, id, id, bloco[columnKeyConfigBlock]])

        //? Obtem os setores que acessam o bloco e profissionais que acessam os setores
        const sqlSetores = `
        SELECT s.setorID AS id, s.nome
        FROM ${tableConfigSetor} AS prmbs
            JOIN setor AS s ON (prmbs.setorID = s.setorID)
        WHERE prmbs.${columnKeyConfigBlock} = ?
        GROUP BY s.setorID
        ORDER BY s.nome ASC`
        const [resultSetores] = await db.promise().query(sqlSetores, [bloco[columnKeyConfigBlock]])
        bloco['setores'] = resultSetores

        //? Itens
        for (const item of resultBloco) {
            const sqlAlternativa = `
            SELECT ai.alternativaItemID AS id, ai.nome, io.anexo, io.bloqueiaFormulario, io.observacao
            FROM ${tableConfigItem} AS prbi 
                JOIN item AS i ON (prbi.itemID = i.itemID)
                JOIN alternativa AS a ON(i.alternativaID = a.alternativaID)
                JOIN alternativa_item AS ai ON(a.alternativaID = ai.alternativaID)        
                LEFT JOIN item_opcao AS io ON (io.itemID = i.itemID AND io.alternativaItemID = ai.alternativaItemID)
            WHERE prbi.${columnKeyConfigItem} = ? AND prbi.status = 1`
            const [resultAlternativa] = await db.promise().query(sqlAlternativa, [item[columnKeyConfigItem]])

            // Obter os anexos vinculados as alternativas
            const sqlRespostaAnexos = `
            SELECT io.alternativaItemID, io.itemOpcaoID, io.anexo, io.bloqueiaFormulario, io.observacao, ioa.itemOpcaoAnexoID, ioa.nome, ioa.obrigatorio
            FROM item_opcao AS io 
                JOIN item_opcao_anexo AS ioa ON(io.itemOpcaoID = ioa.itemOpcaoID)
            WHERE io.itemID = ? `
            const [resultRespostaAnexos] = await db.promise().query(sqlRespostaAnexos, [item.itemID])

            if (resultRespostaAnexos.length > 0) {
                for (const respostaAnexo of resultRespostaAnexos) {
                    //? Verifica se cada anexo exigido existe 1 ou mais arquivos anexados
                    const sqlArquivosAnexadosResposta = `
                    SELECT *
                    FROM anexo AS a 
                        JOIN anexo_busca AS ab ON(a.anexoID = ab.anexoID)
                    WHERE ab.recebimentoMpID = ? AND ab.${columnKeyConfigBlock} = ? AND ab.itemOpcaoAnexoID = ? `
                    const [resultArquivosAnexadosResposta] = await db.promise().query(sqlArquivosAnexadosResposta, [
                        id,
                        bloco[columnKeyConfigBlock],
                        respostaAnexo.itemOpcaoAnexoID
                    ])

                    let anexos = []
                    for (const anexo of resultArquivosAnexadosResposta) {
                        const objAnexo = {
                            exist: true,
                            anexoID: anexo.anexoID,
                            path: `${process.env.BASE_URL_API}${anexo.diretorio}${anexo.arquivo} `,
                            nome: anexo.titulo,
                            tipo: anexo.tipo,
                            size: anexo.tamanho,
                            time: anexo.dataHora
                        }
                        anexos.push(objAnexo)
                    }
                    respostaAnexo['anexos'] = anexos ?? []
                }
            }

            //? Insere lista de anexos solicitados pras alternativas
            for (const alternativa of resultAlternativa) {
                alternativa['anexosSolicitados'] = resultRespostaAnexos.filter(row => row.alternativaItemID == alternativa.id)
            }
            item.alternativas = resultAlternativa

            // Cria objeto da resposta (se for de selecionar)
            if (item?.respostaID > 0) {
                item.resposta = {
                    id: item.respostaID,
                    nome: item.resposta,
                    bloqueiaFormulario: item.alternativas.find(a => a.id == item.respostaID)?.bloqueiaFormulario,
                    observacao: item.alternativas.find(a => a.id == item.respostaID)?.observacao,
                    anexo: resultRespostaAnexos.find(a => a.alternativaItemID == item.respostaID)?.anexo,
                    anexosSolicitados: resultRespostaAnexos.filter(a => a.alternativaItemID == item.respostaID) ?? []
                }
            }
        }
        bloco.itens = resultBloco
    }

    return resultBlocos ?? []
}

module.exports = { getDynamicBlocks }