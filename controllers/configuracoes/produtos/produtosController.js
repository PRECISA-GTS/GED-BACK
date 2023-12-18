const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');

class ProdutosController {
    async getList(req, res) {
        try {
            const { unidadeID } = req.body

            if (!unidadeID) {
                return res.status(400).json({ message: "Dados inválidos!" });
            }

            const getList = `
            SELECT 
                p.produtoID AS id, 
                p.idMinisterio, 
                p.nome, 
                p.descricao, 
                pc.nome AS categoria, 
                e.nome AS status, 
                e.cor,

                (SELECT IF(COUNT(*) > 0, 1, 0)
                FROM produto_unidade AS pu 
                WHERE pu.unidadeID = ? AND pu.produtoID = p.produtoID 
                ) AS checked                
            FROM produto AS p 
                JOIN produto_categoria AS pc ON (p.produtoCategoriaID = pc.produtoCategoriaID)
                JOIN status as e ON (p.status = e.statusID)
            WHERE p.status = 1 
            ORDER BY p.produtoID ASC`
            const [resultGetList] = await db.promise().query(getList, [unidadeID, unidadeID]);
            res.status(200).json(resultGetList);
        } catch (error) {
            console.log(error)
        }
    }

    async getData(req, res) {
        // try {
        //     const { id } = req.params
        //     const sqlGet = `SELECT * FROM produto WHERE produtoID = ?`
        //     const [resultSqlGet] = await db.promise().query(sqlGet, id)
        //     const result = {
        //         fields: resultSqlGet[0]
        //     }
        //     return res.status(200).json(result)
        // } catch (error) {
        //     console.log(error)
        // }
    }

    async insertData(req, res) {
        // const values = req.body
        // try {

        //     //* Valida conflito
        //     const validateConflicts = {
        //         columns: ['nome', 'unidadeID', 'unidadeMedida'],
        //         values: [values.fields.nome, values.fields.unidadeID, values.fields.unidadeMedida],
        //         table: 'produto',
        //         id: null
        //     }
        //     if (await hasConflict(validateConflicts)) {
        //         return res.status(409).json({ message: "Dados já cadastrados!" });
        //     }

        //     const sqlInsert = 'INSERT INTO produto (nome, status, unidadeMedida, unidadeID) VALUES (?, ?, ?, ?)'
        //     const [resultSqlInsert] = await db.promise().query(sqlInsert, [values.fields.nome, values.fields.status, values.fields.unidadeMedida, values.fields.unidadeID])
        //     const id = resultSqlInsert.insertId
        //     return res.status(200).json(id)

        // } catch (error) {
        //     console.log(error)
        // }
    }

    async updateData(req, res) {
        try {
            const { unidadeID, usuarioID, products } = req.body

            if (!unidadeID || !usuarioID) {
                return res.status(400).json({ message: "Dados inválidos!" });
            }

            //? Array com os produtos que estao vinculados com a tabela recebimentomp_produto 
            const sqlGet = `
            SELECT rp.produtoID
            FROM recebimentomp_produto AS rp 
                JOIN recebimentomp AS r ON (rp.recebimentompID = r.recebimentompID)
            WHERE r.unidadeID = ?
            GROUP BY rp.produtoID`
            const [resultSqlGet] = await db.promise().query(sqlGet, [unidadeID])

            const productsLinked = []
            for (let i = 0; i < resultSqlGet.length; i++) {
                productsLinked.push(resultSqlGet[i].produtoID)
            }

            //? Deleta produtos que não contem os id de productsLinked
            if (productsLinked && productsLinked.length > 0) {
                const sqlDelete = `
                DELETE FROM produto_unidade
                WHERE unidadeID = ? AND produtoID NOT IN (?)`
                await db.promise().query(sqlDelete, [unidadeID, productsLinked])
            }

            //? Verifica se já existe registro na tabela produto_unidade pra não inserir novamente
            const sqlGetProducts = `
            SELECT produtoID
            FROM produto_unidade
            WHERE unidadeID = ?`
            const [resultSqlGetProducts] = await db.promise().query(sqlGetProducts, [unidadeID])

            const productsLinkedInTable = []
            for (let i = 0; i < resultSqlGetProducts.length; i++) {
                productsLinkedInTable.push(resultSqlGetProducts[i].produtoID)
            }

            //? Insere produtos que não contem os id de productsLinkedInTable
            const sqlInsert = `
            INSERT INTO produto_unidade (produtoID, unidadeID)
            VALUES (?, ?)`
            for (let i = 0; i < products.length; i++) {
                if (!productsLinkedInTable.includes(products[i])) {
                    await db.promise().query(sqlInsert, [products[i], unidadeID])
                }
            }

            return res.status(200).json({ message: 'Dados atualizados com sucesso' })

        } catch (error) {
            console.log(error)
        }
    }

    deleteData(req, res) {
        // const { id } = req.params
        // const objModule = {
        //     table: ['produto'],
        //     column: 'produtoID'
        // }
        // const tablesPending = ['recebimentomp_produto'] // Tabelas que possuem relacionamento com a tabela atual

        // if (!tablesPending || tablesPending.length === 0) {
        //     return deleteItem(id, objModule.table, objModule.column, res)
        // }

        // hasPending(id, objModule.column, tablesPending)
        //     .then((hasPending) => {
        //         if (hasPending) {
        //             res.status(409).json({ message: "Dado possui pendência." });
        //         } else {
        //             return deleteItem(id, objModule.table, objModule.column, res)
        //         }
        //     })
        //     .catch((err) => {
        //         console.log(err);
        //         res.status(500).json(err);
        //     });
    }
}



module.exports = ProdutosController;