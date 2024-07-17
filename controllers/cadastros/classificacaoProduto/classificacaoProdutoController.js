const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class ClassificacaoProdutoController {
    async getList(req, res) {
        const { unidadeID } = req.params;
        try {
            const sqlGetList = `
                SELECT 
                    a.classificacaoProdutoID AS id,
                    a.nome AS nome,
                    b.nome as status,
                    b.cor
                FROM classificacao_produto AS a 
                JOIN status AS b ON a.status = b.statusID
                WHERE a.unidadeID = ?`;
            const [result] = await db.promise().query(sqlGetList, [unidadeID]);
            return res.status(200).json(result);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar dados.' });
        }
    }

    async getData(req, res) {
        const { id } = req.params;
        try {
            const sqlData = 'SELECT * FROM classificacao_produto WHERE classificacaoProdutoID = ?';
            const [result] = await db.promise().query(sqlData, [id]);

            if (!result.length) {
                return res.status(404).json({ error: 'Nenhum dado encontrado.' });
            }

            return res.status(200).json({ fields: result[0] });
        } catch (error) {
            console.error('Erro ao buscar dados no banco de dados: ', error);
            return res.status(500).json({ error: 'Erro ao buscar dados.' });
        }
    }

    async getNewData(req, res) {
        try {
            return res.status(200).json('no data');
        } catch (error) {
            console.error('Erro ao buscar dados no banco de dados: ', error);
            return res.status(500).json({ error: 'Erro ao buscar dados.' });
        }
    }

    async insertData(req, res) {
        const { fields, unidadeID, usuarioID } = req.body;
        try {
            const validateConflicts = {
                columns: ['nome', 'unidadeID'],
                values: [fields.nome, unidadeID],
                table: 'classificacao_produto',
                id: null,
            };

            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: 'Dados já cadastrados!' });
            }

            const logID = await executeLog('Criação de classificação de produto', usuarioID, unidadeID, req);
            const sqlInsert = 'INSERT INTO classificacao_produto (nome, status, unidadeID) VALUES (?, ?, ?)';
            const id = await executeQuery(sqlInsert, [fields.nome, fields.status ? '1' : '0', unidadeID], 'insert', 'classificacao_produto', 'classificacaoProdutoID', null, logID);

            const sqlGetClassificacaoProduto = 'SELECT classificacaoProdutoID AS id, nome FROM classificacao_produto WHERE classificacaoProdutoID = ?';
            const [result] = await db.promise().query(sqlGetClassificacaoProduto, [id]);

            return res.status(200).json({ id: result[0].id, nome: result[0].nome });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao inserir dados.' });
        }
    }

    async updateData(req, res) {
        const { id } = req.params;
        const { fields, unidadeID, usuarioID } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'ID não informado' });
        }

        try {
            const validateConflicts = {
                columns: ['classificacaoProdutoID', 'nome', 'unidadeID'],
                values: [id, fields.nome, unidadeID],
                table: 'classificacao_produto',
                id,
            };

            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: 'Dados já cadastrados!' });
            }

            const logID = await executeLog('Atualização de classificação de produto', usuarioID, unidadeID, req);
            const sqlUpdate = 'UPDATE classificacao_produto SET nome = ?, status = ? WHERE classificacaoProdutoID = ?';
            await executeQuery(sqlUpdate, [fields.nome, fields.status ? '1' : '0', id], 'update', 'classificacao_produto', 'classificacaoProdutoID', id, logID);

            return res.status(200).json({ message: 'Dados atualizados com sucesso!' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao atualizar dados.' });
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params;
        const objDelete = {
            table: ['classificacao_produto'],
            column: 'classificacaoProdutoID',
        };
        const arrPending = [
            {
                table: 'produto',
                column: ['classificacaoProdutoID'],
            },
        ];

        try {
            if (!arrPending.length) {
                const logID = await executeLog('Exclusão de classificação de produto', usuarioID, unidadeID, req);
                return deleteItem(id, objDelete.table, objDelete.column, logID, res);
            }

            const hasPendingResult = await hasPending(id, arrPending);
            if (hasPendingResult) {
                return res.status(409).json({ message: 'Dado possui pendência.' });
            }

            const logID = await executeLog('Exclusão de classificação de produto', usuarioID, unidadeID, req);
            return deleteItem(id, objDelete.table, objDelete.column, logID, res);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao excluir dados.' });
        }
    }
}

module.exports = ClassificacaoProdutoController;
