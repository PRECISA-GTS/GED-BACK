const db = require('../../../config/db');
const { hasPending, deleteItem, criptoMd5 } = require('../../../config/defaultConfig');
const path = require('path');
const fs = require('fs');
const alterPassword = require('../../../email/template/user/alterPassword');
const sendMailConfig = require('../../../config/email');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class UnidadeController {
    async getList(req, res) {
        try {
            const { admin, unidadeID, usuarioID } = req.query;
            const sqlGetList = `
            SELECT 
                a.unidadeID AS id, a.nomeFantasia AS nome, e.nome AS status, e.cor
            FROM unidade AS a
                JOIN status AS e ON (a.status = e.statusID)
            WHERE ${admin == 1 ? `a.unidadeID > 0` : `a.unidadeID = ${unidadeID}`}`

            const [resultGetList] = await db.promise().query(sqlGetList)
            res.status(200).json(resultGetList);
        } catch (error) {
            console.log(error)
        }
    }

    async getData(req, res) {
        try {
            const { id } = req.params
            const sqlGetData = `
            SELECT 
                a.*,
                b.fornecedorCategoriaID AS categoriaID,
                b.nome AS categoriaNome,
                c.fornecedorCategoriaRiscoID AS riscoID,
                c.nome AS riscoNome
            FROM unidade AS a
                LEFT JOIN fornecedorcategoria AS b ON (a.fornecedorCategoriaID = b.fornecedorCategoriaID)
                LEFT JOIN fornecedorcategoria_risco  AS c ON (a.fornecedorCategoriaRiscoID = c.fornecedorCategoriaRiscoID)
            WHERE a.unidadeID = ?`
            const [resultSqlGetData] = await db.promise().query(sqlGetData, id)

            //? Todas as extensões da unidade
            const sqlMyExtensions = `SELECT extensaoID AS id, nome FROM extensao WHERE extensaoID IN (SELECT extensaoID FROM unidade_extensao WHERE unidadeID = ?)`
            const [resultExtensions] = await db.promise().query(sqlMyExtensions, id)

            //? Todas as extensões
            const sqlExtensions = `SELECT extensaoID AS id, nome FROM extensao`
            const [resultAllExtensions] = await db.promise().query(sqlExtensions)

            const result = {
                fields: {
                    ...resultSqlGetData[0],
                    cabecalhoRelatorio: resultSqlGetData[0].cabecalhoRelatorio ? `${process.env.BASE_URL_API}${resultSqlGetData[0].cabecalhoRelatorio}` : null,
                    cabecalhoRelatorioTitle: resultSqlGetData[0].cabecalhoRelatorio,
                    categoria: resultSqlGetData[0].categoriaID > 0 ? {
                        id: resultSqlGetData[0].categoriaID,
                        nome: resultSqlGetData[0].categoriaNome
                    } : null,
                    risco: resultSqlGetData[0].riscoID > 0 ? {
                        id: resultSqlGetData[0].riscoID,
                        nome: resultSqlGetData[0].riscoNome
                    } : null,
                    extensoes: resultExtensions.length > 0 ? resultExtensions : [],
                    allExtensions: resultAllExtensions.length > 0 ? resultAllExtensions : []
                }
            }
            res.status(200).json(result);
        } catch (error) {
            console.log(error)
        }
    }

    async insertData(req, res) {
        const data = req.body;
        try {

            const logID = await executeLog('Crição de unidade', data.usuarioID, data.unidadeID, req)

            const sqlExist = 'SELECT * FROM unidade'
            const [resultSqlExist] = await db.promise().query(sqlExist, [data.fields])

            const rows = resultSqlExist.find(row => row.cnpj === data.cnpj);

            if (!rows) {
                const sqlInsert = 'INSERT INTO unidade SET ?'
                const id = await executeQuery(sqlInsert, [data.fields], 'insert', 'unidade', 'unidadeID', null, logID)
                return res.status(200).json(id)
            }
        } catch (error) {
            console.log(error)
        }
    }

    async updateData(req, res) {
        const { id } = req.params
        const data = req.body

        try {
            const logID = await executeLog('Edição de unidade', data.usuarioID, data.unidadeID, req)

            const extensoes = data.fields.extensoes
            delete data.fields.extensoes
            delete data.fields.allExtensions
            delete data.fields.cabecalhoRelatorioTitle
            delete data.fields.categoria
            delete data.fields.risco

            const sqlExist = 'SELECT * FROM unidade'
            const [resultSqlExist] = await db.promise().query(sqlExist)

            const rows = resultSqlExist.find(row => row.cnpj == data.fields.cnpj && row.unidadeID !== id);
            if (rows > 0) return res.status(409).json({ message: "CNPJ já cadastrado!" });

            delete data.fields.cabecalhoRelatorio

            const sqlUpdate = 'UPDATE unidade SET ? WHERE unidadeID = ?'
            const resultSqlUpdate = await executeQuery(sqlUpdate, [data.fields, id], 'update', 'unidade', 'unidadeID', id, logID)

            //? Define o modelo pro formulário baseado na categoria e risco informadas (se ainda não houver)
            await setModelSupplierForm(data.fields)

            //? Copia as informações da unidade para o formulário de fornecedor
            await copyUnityToForm(data.fields)

            //? Atualiza extensões da unidade na tabela unidade_extensao 
            if (extensoes.length > 0) {
                const sqlDelete = 'DELETE FROM unidade_extensao WHERE unidadeID = ?'
                await db.promise().query(sqlDelete, id)
                const resultDelete = await executeQuery(sqlDelete, [id], 'delete', 'unidade_extensao', 'unidadeID', id, logID)

                const sqlInsert = 'INSERT INTO unidade_extensao (unidadeID, extensaoID) VALUES ?'
                const values = extensoes.map(extensao => [id, extensao.id])
                const resultInsert = await executeQuery(sqlInsert, [values], 'insert', 'unidade_extensao', 'unidadeExtensaoID', null, logID)
            }

            if (data.senha) {
                const sqlUpdateUser = 'UPDATE usuario SET senha = ? WHERE usuarioID = ?'

                const [resultSqlUpdateUser] = await executeQuery(sqlUpdateUser, [criptoMd5(data.senha), data.usuarioID], 'update', 'usuario', 'usuarioID', id,
                    logID)

                const sqlUnity = `
                SELECT 
                    a.*   
                FROM unidade AS a
                WHERE a.unidadeID = ?`

                const [resultUnity] = await db.promise().query(sqlUnity, [data.fields.unidadeID])

                const endereco = {
                    logradouro: resultUnity[0].logradouro,
                    numero: resultUnity[0].numero,
                    complemento: resultUnity[0].complemento,
                    bairro: resultUnity[0].bairro,
                    cidade: resultUnity[0].cidade,
                    uf: resultUnity[0].uf,
                }

                const enderecoCompleto = Object.entries(endereco).map(([key, value]) => {
                    if (value) {
                        return `${value}, `;
                    }
                }).join('').slice(0, -2) + '.'; // Remove a última vírgula e adiciona um ponto final

                // Chama a função que envia email para o usuário
                if (data.fields.email) {
                    const destinatario = data.fields.email
                    let assunto = 'GEDagro - Senha Alterada'
                    const values = {
                        // fabrica
                        enderecoCompletoFabrica: enderecoCompleto,
                        nomeFantasiaFabrica: resultUnity[0].nomeFantasia,
                        cnpjFabrica: resultUnity[0].cnpj,

                        // outros
                        nome: data.fields.nomeFantasia,
                        papelID: 2,
                        noBaseboard: false, // Se falso mostra o rodapé com os dados da fabrica, senão mostra dados do GEDagro,
                    }

                    const html = await alterPassword(values);
                    await sendMailConfig(destinatario, assunto, html, logID, values)
                }
            }

            res.status(200).json({ message: 'Unidade atualizada com sucesso!' });
        } catch (error) {
            console.log(error)
        }
    }

    //! Atualiza a imagem de cabeçalho do relatório
    async updateDataReport(req, res) {
        const { id, usuarioID, unidadeID } = req.params;
        try {

            const logID = await executeLog('Edição da foto da unidade', usuarioID, unidadeID, req)

            const pathDestination = req.pathDestination
            const file = req.files[0]; //? Somente 1 arquivo

            const sqlSelectPreviousFileReport = `SELECT cabecalhoRelatorio FROM unidade WHERE unidadeID = ?`;
            const sqlUpdateFileReport = `UPDATE unidade SET cabecalhoRelatorio = ? WHERE unidadeID = ?`;

            //? Verificar se há arquivos enviados
            if (!file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }

            // Obter o nome da foto de perfil anterior
            const [rows] = await db.promise().query(sqlSelectPreviousFileReport, [id]);
            const previousFileReport = rows[0]?.cabecalhoRelatorio;

            // Atualizar a foto de perfil no banco de dados
            // await db.promise().query(sqlUpdateFileReport, [`${pathDestination}${file.filename}`, id]);
            await executeQuery(sqlUpdateFileReport, [`${pathDestination}${file.filename}`, id], 'update', 'unidade', 'unidadeID', id, logID);

            // Excluir a foto de perfil anterior
            if (previousFileReport) {
                const previousFileReportPath = path.resolve(previousFileReport);
                fs.unlink(previousFileReportPath, (error) => {
                    if (error) {
                        return console.error('Erro ao excluir a imagem anterior:', error);
                    } else {
                        return console.log('Imagem anterior excluída com sucesso!');
                    }
                });
            }
            const photoProfileUrl = `${process.env.BASE_URL_API}${pathDestination}${file.filename}`;
            res.status(200).json(photoProfileUrl);
        } catch (e) {
            console.log(e)
        }
    }

    //! Deleta a imagem no banco de dados e no caminho uploads/report
    async handleDeleteImage(req, res) {
        const { id, usuarioID, unidadeID } = req.params;

        try {
            const logID = await executeLog('Exclusão da foto da unidade', usuarioID, unidadeID, req)

            const sqlSelectPreviousPhoto = `SELECT cabecalhoRelatorio FROM unidade WHERE unidadeID = ?`;
            const sqlUpdatePhotoProfile = `UPDATE unidade SET cabecalhoRelatorio = ? WHERE unidadeID = ?`;
            // Obter o nome da foto de perfil anterior
            const [rows] = await db.promise().query(sqlSelectPreviousPhoto, [id]);
            const previousPhotoProfile = rows[0]?.cabecalhoRelatorio;

            // Atualizar a foto de perfil no banco de dados
            await executeQuery(sqlUpdatePhotoProfile, [null, id], 'update', 'unidade', 'unidadeID', id, logID);

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

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params

        const objDelete = {
            table: ['unidade'],
            column: 'unidadeID'
        }
        const arrPending = [
            {
                table: 'anexo',
                column: ['unidadeID'],

            },
            {
                table: 'fornecedor',
                column: ['unidadeID'],

            },
            {
                table: 'recebimentomp',
                column: ['unidadeID'],

            },
            {
                table: 'limpeza',
                column: ['unidadeID'],

            },
            {
                table: 'item',
                column: ['unidadeID'],

            },
            {
                table: 'produto',
                column: ['unidadeID'],

            },
            {
                table: 'profissional',
                column: ['unidadeID'],

            },
            {
                table: 'usuario_unidade',
                column: ['unidadeID'],

            },
            {
                table: 'grupoanexo',
                column: ['unidadeID'],

            },

        ]

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão da unidade', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão da unidade', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}

const setModelSupplierForm = async (values) => {
    // Verifica se há formulários de fornecedor sem modelo para esse cnpj 
    const sql = `SELECT fornecedorID, unidadeID FROM fornecedor WHERE cnpj = "${values.cnpj}" AND parFornecedorModeloID = 0`
    const [result] = await db.promise().query(sql)

    if (result.length > 0) {
        for (let i = 0; i < result.length; i++) {
            if (!values.fornecedorCategoriaRiscoID || !result[i].unidadeID) return

            const sql = `
            SELECT frm.parFornecedorModeloID
            FROM fornecedorcategoria_risco AS fr
                JOIN fornecedorcategoria_risco_modelo AS frm ON (fr.fornecedorCategoriaRiscoID = frm.fornecedorCategoriaRiscoID)
            WHERE fr.fornecedorCategoriaRiscoID = ${values.fornecedorCategoriaRiscoID} AND frm.unidadeID = ${result[i].unidadeID}`
            const [resultModel] = await db.promise().query(sql)

            if (resultModel[0].parFornecedorModeloID > 0) {
                // Seta modelo da unidade no formulário desse fornecedor 
                const sql = `
                UPDATE fornecedor 
                SET parFornecedorModeloID = ?
                WHERE fornecedorID = ?`
                await db.promise().query(sql, [resultModel[0].parFornecedorModeloID, result[i].fornecedorID])
                console.log(`Atualiza fornecedor ${result[i].fornecedorID} para o modelo ${resultModel[0].parFornecedorModeloID}`)
            }
        }
    }
}

const copyUnityToForm = async (values) => {
    // Atualiza somente os formulários que ainda não foram preenchidos (status 10)
    const sql = `
    UPDATE fornecedor SET 
        cnpj = "${values.cnpj}"
        ${values.nomeFantasia ? `, nome = "${values.nomeFantasia}"` : ''}
        ${values.razaoSocial ? `, razaoSocial = "${values.razaoSocial}"` : ''}
        ${values.ie ? `, ie = "${values.ie}"` : ''}
        ${values.principaisClientes ? `, principaisClientes = "${values.principaisClientes}"` : ''}
        ${values.email ? `, email = "${values.email}"` : ''}
        ${values.telefone1 ? `, telefone = "${values.telefone1}"` : ''}
        ${values.cep ? `, cep = "${values.cep}"` : ''}
        ${values.logradouro ? `, logradouro = "${values.logradouro}"` : ''}
        ${values.numero ? `, numero = "${values.numero}"` : ''}
        ${values.complemento ? `, complemento = "${values.complemento}"` : ''}
        ${values.bairro ? `, bairro = "${values.bairro}"` : ''}
        ${values.cidade ? `, cidade = "${values.cidade}"` : ''}
        ${values.uf ? `, estado = "${values.uf}"` : ''}
        ${values.pais ? `, pais = "${values.pais}"` : ''}
        ${values.registroSipeagro ? `, registroSipeagro = "${values.registroSipeagro}"` : ''}        
    WHERE cnpj = "${values.cnpj}" AND status = 10`
    await db.promise().query(sql)
}

module.exports = UnidadeController;