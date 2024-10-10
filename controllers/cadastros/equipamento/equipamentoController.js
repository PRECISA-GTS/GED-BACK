const db = require('../../../config/db');
const { hasConflict, hasPending, deleteItem } = require('../../../config/defaultConfig');
const { executeLog, executeQuery } = require('../../../config/executeQuery');
const { updateMultipleSelect, insertMultipleSelect } = require('../../../defaults/functions');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

class EquipamentoController {
    async getList(req, res) {
        try {
            const { unidadeID } = req.body

            if (!unidadeID) {
                return res.status(400).json({ message: "Unidade não informada!" });
            }

            const getList = `
            SELECT 
                a.equipamentoID AS id, 
                a.nome, 
                a.tipo,
                e.nome AS status,
                e.cor
            FROM equipamento AS a 
                LEFT JOIN status AS e ON (a.status = e.statusID)
            WHERE a.unidadeID = ?
            ORDER BY a.nome ASC`
            const [resultGetList] = await db.promise().query(getList, [unidadeID]);
            res.status(200).json(resultGetList);
        } catch (error) {
            console.log(error)
        }
    }

    async getEquipamentos(req, res) {
        try {
            const { unidadeID } = req.body

            if (!unidadeID) {
                return res.status(400).json({ message: "Unidade não informada!" });
            }

            const sql = `
            SELECT 
                equipamentoID AS id, 
                nome,
                
                (SELECT GROUP_CONCAT(setorID SEPARATOR ', ')
                FROM setor_equipamento 
                WHERE equipamentoID = equipamento.equipamentoID) AS setores
            FROM equipamento
            WHERE unidadeID = ? AND status = 1
            ORDER BY nome ASC`
            const [result] = await db.promise().query(sql, [unidadeID]);

            res.status(200).json(result);
        } catch (error) {
            console.log(error)
        }
    }

    async getData(req, res) {
        try {
            const { id } = req.params

            const sql = `
            SELECT e.*, s.nome AS setor 
            FROM equipamento AS e
                LEFT JOIN setor AS s ON (e.setorID = s.setorID)
            WHERE e.equipamentoID = ?`
            const [resultData] = await db.promise().query(sql, id)

            //? Itens da limpeza
            const sqlLimpeza = `
            SELECT i.itemID AS id, CONCAT(i.nome, ' (', a.nome, ')') AS nome
            FROM equipamento_limpeza AS el 
                JOIN item AS i ON (el.itemID = i.itemID)
                JOIN alternativa AS a ON (i.alternativaID = a.alternativaID)
            WHERE el.equipamentoID = ?`
            const [resultLimpeza] = await db.promise().query(sqlLimpeza, id)

            const result = {
                fields: {
                    ...resultData[0],
                    foto: resultData[0]?.foto ? `${process.env.BASE_URL_API}${resultData[0]?.foto}` : null,
                    dataCompra: new Date(resultData[0].dataCompra).toISOString().split('T')[0],
                    setor: {
                        id: resultData[0]?.setorID,
                        nome: resultData[0]?.setor
                    },
                    realizaLimpeza: resultData[0].realizaLimpeza == 1 ? true : false,
                    limpeza: resultLimpeza ?? []
                }
            }

            return res.status(200).json(result)
        } catch (error) {
            console.log(error)
        }
    }

    async insertData(req, res) {
        try {
            const { fields, usuarioID, unidadeID } = req.body

            //* Valida conflito
            const validateConflicts = {
                columns: ['nome', 'unidadeID'],
                data: [fields.nome, fields.unidadeID],
                table: 'equipamento',
                id: null
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Criação de equipamento', usuarioID, unidadeID, req)

            const sqlInsert = `
            INSERT INTO equipamento 
            (nome, tipo, numeroSerie, codigoInventario, marca, modelo, dataCompra, fornecedor, setorID, realizaLimpeza, frequenciaLimpeza, orientacoesLimpeza, status, unidadeID) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            const id = await executeQuery(sqlInsert, [
                fields.nome,
                fields.tipo,
                fields.numeroSerie,
                fields.codigoInventario,
                fields.marca,
                fields.modelo,
                fields.dataCompra,
                fields.fornecedor,
                fields.setorID,
                fields.realizaLimpeza ? 1 : 0,
                fields.frequenciaLimpeza,
                fields.orientacoesLimpeza,
                1,
                unidadeID
            ], 'insert', 'equipamento', 'equipamentoID', null, logID)
            if (!id) return

            if (fields.realizaLimpeza) {
                await insertMultipleSelect(
                    'equipamento_limpeza',
                    'equipamentoID',
                    'itemID',
                    id,
                    fields?.limpeza
                )
            }

            const values = {
                id,
                value: fields.nome
            }

            return res.status(200).json(values)
        } catch (error) {
            console.log(error)
        }
    }

    async updateData(req, res) {
        try {
            const { id } = req.params
            const { fields, usuarioID, unidadeID } = req.body

            //* Valida conflito
            const validateConflicts = {
                columns: ['equipamentoID', 'nome'],
                data: [id, fields.nome],
                table: 'equipamento',
                id: id
            }

            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Atualização de equipamento', usuarioID, unidadeID, req)

            const sqlUpdate = `
            UPDATE equipamento 
            SET nome = ?, tipo = ?, numeroSerie = ?, codigoInventario = ?, marca = ?, modelo = ?, dataCompra = ?, fornecedor = ?, setorID = ?, realizaLimpeza = ?, frequenciaLimpeza = ?, orientacoesLimpeza = ?, status = ?, unidadeID = ? 
            WHERE equipamentoID = ?`
            await executeQuery(sqlUpdate, [
                fields.nome,
                fields.tipo,
                fields.numeroSerie,
                fields.codigoInventario,
                fields.marca,
                fields.modelo,
                fields.dataCompra,
                fields.fornecedor,
                fields.setor?.id,
                fields.realizaLimpeza ? 1 : 0,
                fields.frequenciaLimpeza,
                fields.orientacoesLimpeza,
                fields.status,
                unidadeID,
                id
            ], 'update', 'equipamento', 'equipamentoID', id, logID)

            await updateMultipleSelect(
                'equipamento_limpeza',
                'equipamentoID',
                'itemID',
                id,
                fields.limpeza
            )

            return res.status(200).json({ message: 'Dados atualizados com sucesso' });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: "Erro interno no servidor" });
        }
    }

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['equipamento'],
            column: 'equipamentoID'
        }

        const arrPending = [
            {
                table: 'setor_equipamento',
                column: ['equipamentoID'],
            },
            {
                table: 'limpeza_equipamento',
                column: ['equipamentoID'],
            }
        ]

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de equipamento', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de equipamento', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }

    async updatePhoto(req, res) {
        try {
            const { id, usuarioID, unidadeID } = req.params
            const pathDestination = req.pathDestination
            const file = req.files[0]; //? Somente 1 arquivo

            const logID = await executeLog('Edição da imagem do equipamento', usuarioID, unidadeID, req)

            const sqlSelectPreviousPhoto = `SELECT foto FROM equipamento WHERE equipamentoID = ?`;
            const sqlUpdatePhotoProfile = `UPDATE equipamento SET foto = ? WHERE equipamentoID = ?`;

            // Verificar se um arquivo foi enviado
            if (!file) {
                res.status(400).json({ error: 'Nenhum arquivo enviado.' });
                return;
            }

            // Obter o nome da foto de perfil anterior
            const [rows] = await db.promise().query(sqlSelectPreviousPhoto, [id]);
            const previousPhotoProfile = rows[0]?.foto;

            // Atualizar a foto de perfil no banco de dados
            await executeQuery(sqlUpdatePhotoProfile, [`${pathDestination}${file.filename}`, id], 'update', 'equipamento', 'equipamentoID', id, logID)

            // Excluir a foto de perfil anterior
            if (previousPhotoProfile) {
                const previousPhotoPath = path.resolve(previousPhotoProfile);
                fs.unlink(previousPhotoPath, (error) => {
                    if (error) {
                        return console.error('Erro ao excluir a imagem anterior:', error);
                    } else {
                        return console.log('Imagem anterior excluída com sucesso!');
                    }
                });
            }

            const photoProfileUrl = `${process.env.BASE_URL_API}${pathDestination}${file.filename}`;
            res.status(200).json(photoProfileUrl);
        } catch (error) {
            console.log("🚀 ~ error:", error)
            if (error instanceof multer.MulterError) {
                // Erro do Multer (arquivo incompatível ou muito grande)
                if (error.code === 'LIMIT_FILE_SIZE') {
                    res.status(400).json({ error: 'O tamanho do arquivo excede o limite permitido.' });
                } else {
                    res.status(400).json({ error: 'O arquivo enviado é incompatível.' });
                }
            } else {
                // Outro erro interno do servidor
                res.status(500).json({ error: 'Erro interno do servidor.' });
            }
        }
    }

    async deletePhoto(req, res) {
        const { id, usuarioID, unidadeID } = req.params

        const logID = await executeLog('Exclusão da imagem do equipamento', usuarioID, unidadeID, req)

        const sqlSelectPreviousPhoto = `SELECT foto FROM equipamento WHERE equipamentoID = ?`;
        const sqlUpdatePhotoProfile = `UPDATE equipamento SET foto = ? WHERE equipamentoID = ?`;

        try {
            // Obter o nome da foto de perfil anterior
            const [rows] = await db.promise().query(sqlSelectPreviousPhoto, [id]);
            const previousPhotoProfile = rows[0]?.foto;

            // Atualizar a foto de perfil no banco de dados
            await executeQuery(sqlUpdatePhotoProfile, [null, id], 'update', 'equipamento', 'equipamentoID', id, logID)
            // Excluir a foto de perfil anterior
            if (previousPhotoProfile) {
                const previousPhotoPath = path.resolve(previousPhotoProfile);
                fs.unlink(previousPhotoPath, (error) => {
                    if (error) {
                        console.error('Erro ao excluir a imagem anterior:', error);
                    } else {
                        console.log('Imagem anterior excluída com sucesso!');
                    }
                });
            }

            res.status(200).json({ message: 'Imagem excluída com sucesso!' });
        } catch (error) {
            console.error('Erro ao excluir a imagem:', error);
            res.status(500).json({ error: 'Erro ao excluir a imagem' });
        }
    }
}

module.exports = EquipamentoController;