const db = require('../../../config/db');
require('dotenv/config')
const path = require('path');
const fs = require('fs');
const { hasPending, deleteItem, getMenuPermissions, hasConflict, criptoMd5 } = require('../../../config/defaultConfig');
const multer = require('multer');
const { accessPermissions, getDateNow } = require('../../../defaults/functions');
const alterPassword = require('../../../email/template/user/alterPassword');
const newUser = require('../../../email/template/user/newUser');
const sendMailConfig = require('../../../config/email');
const { executeLog, executeQuery } = require('../../../config/executeQuery');

class ProfissionalController {
    //? Obtém os profissionais pra assinatura
    async getProfissionaisAssinatura(req, res) {
        const { formularioID, modeloID } = req.body

        if (!formularioID || !modeloID) {
            return res.status(400).json({ message: "Dados inválidos!" });
        }

        try {
            let result = null

            switch (formularioID) {
                case 1: //* Fornecedor
                    result = await getProfissionalPreenchimento('par_fornecedor_modelo_departamento', 'parFornecedorModeloID', modeloID)
                    break;
                case 2: //* Recebimento de MP
                    result = await getProfissionalPreenchimento('par_recebimentomp_modelo_departamento', 'parRecebimentoMpModeloID', modeloID)
                    break;
                case 3: //* Não conformidade do recebimento de MP
                    result = await getProfissionalPreenchimento('par_recebimentomp_naoconformidade_modelo_departamento', 'parRecebimentoMpNaoConformidadeModeloID', modeloID)
                    break;
                case 4: //* Limpeza
                    result = await getProfissionalPreenchimento('par_limpeza_modelo_departamento', 'parLimpezaModeloID', modeloID)
                    break;
            }

            return res.status(200).json(result)
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async getProfissionais(req, res) {
        const { unidadeID } = req.body

        if (!unidadeID) return res.status(400).json({ message: "Dados inválidos!" });

        //? Busca usuários da unidade e papel atual 
        const sql = `
        SELECT profissionalID AS id, nome            
        FROM profissional            
        WHERE unidadeID = ? AND status = 1
        ORDER BY nome ASC`
        const [result] = await db.promise().query(sql, [unidadeID])

        res.status(200).json(result)
    }

    async getList(req, res) {
        const { unidadeID, papelID } = req.query

        if (!unidadeID || !papelID) {
            return res.status(400).json({ message: "Dados inválidos!" });
        }

        //? Busca usuários da unidade e papel atual 
        const sql = `
        SELECT
            a.profissionalID AS id,
            a.nome,
            e.nome AS status,
            e.cor,
            a.status AS statusID
        FROM profissional AS a 
            JOIN status AS e ON (a.status = e.statusID)
        WHERE a.unidadeID = ?
        ORDER BY a.nome ASC`
        const [result] = await db.promise().query(sql, [unidadeID])

        res.status(200).json(result)
    }

    async getData(req, res) {
        const { id } = req.params
        let { unidadeID } = req.query

        try {
            // Dados do profissional
            const dataUser = `
            SELECT 
                a.*,
                DATE_FORMAT(a.dataNascimento, '%Y-%m-%d') AS dataNascimento
            FROM profissional AS a 
            WHERE a.profissionalID = ? AND a.unidadeID = ?`
            const [resultDataUser] = await db.promise().query(dataUser, [id, unidadeID])

            // Departamentos do profissional
            const sqlDepartamento = `
            SELECT 
                ps.profissionaldepartamentoID AS id,
                s.departamentoID,
                s.nome, 
                DATE_FORMAT(ps.dataInicio, '%Y-%m-%d') AS dataInicio,
                DATE_FORMAT(ps.dataFim, '%Y-%m-%d') AS dataFim,
                ps.status
            FROM profissional_departamento AS ps 
                JOIN departamento AS s ON (ps.departamentoID = s.departamentoID)
            WHERE ps.profissionalID = ? AND s.unidadeID = ?
            ORDER BY ps.status DESC, s.nome ASC`
            const [resultDepartamento] = await db.promise().query(sqlDepartamento, [id, unidadeID])

            const formatedDepartamento = resultDepartamento.map(row => {
                return {
                    id: row.id,
                    departamento: {
                        id: row.departamentoID,
                        nome: row.nome
                    },
                    dataInicio: row.dataInicio,
                    dataFim: row.dataFim,
                    status: row.status
                }
            })

            // Cargos do profissional
            const formacaoCargo = `
            SELECT 
                a.profissionalCargoID,
                DATE_FORMAT(a.data, '%Y-%m-%d') AS data,
                a.formacaoCargo,
                a.conselho,
                IF(a.dataInativacao, DATE_FORMAT(a.dataInativacao, '%Y-%m-%d'), NULL) AS dataInativacao,
                a.status
            FROM profissional_cargo AS a
                JOIN profissional AS b ON (a.profissionalID = b.profissionalID)
            WHERE  a.profissionalID = ? AND b.unidadeID = ? 
            ORDER BY a.status DESC, a.data ASC`
            const [resultFormacaoCargo] = await db.promise().query(formacaoCargo, [id, unidadeID])

            // Profissionais da unidade (copiar permissões dele)
            const getProfessional = `
            SELECT profissionalID as id, nome, usuarioID 
            FROM profissional 
            WHERE unidadeID = ? AND profissionalID <> ? AND status = 1 AND usuarioID > 0 
            ORDER BY nome`
            const [resultProfessional] = await db.promise().query(getProfessional, [unidadeID, id])

            const values = {
                imagem: resultDataUser[0]?.imagem ? `${process.env.BASE_URL_API}${resultDataUser[0].imagem}` : null,
                fields: {
                    ...resultDataUser[0],
                    departamentos: formatedDepartamento,
                },
                cargosFuncoes: resultFormacaoCargo,
                menu: await getMenuPermissions(1, resultDataUser[0].usuarioID, unidadeID),
                professionals: resultProfessional ?? [],
            }

            res.status(200).json(values)
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async getNewData(req, res) {
        try {
            const today = getDateNow()

            const values = {
                fields: {},
                cargosFuncoes: [
                    {
                        data: today
                    }
                ],
                menu: await getMenuPermissions(1, 0, 1)
            };

            res.status(200).json(values);
        } catch (error) {
            console.log("🚀 ~ error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    async insertData(req, res) {
        try {
            const data = req.body;
            let departamentos = data.fields.departamentos
            delete data.fields.departamentos

            //* Valida conflito
            const validateConflicts = {
                columns: ['cpf', 'unidadeID'],
                values: [data.fields.cpf, data.unidadeID],
                table: 'profissional',
                id: null
            }
            if (await hasConflict(validateConflicts)) {
                return res.status(409).json({ message: "Dados já cadastrados!" });
            }

            const logID = await executeLog('Criação de profissional', data.usualioLogado, data.unidadeID, req)

            // Cadastra novo profisional
            const InsertUser = `INSERT profissional SET ? `
            const profissionalID = await executeQuery(InsertUser, [data.fields], 'insert', 'profissional', 'profissionalID', null, logID)

            if (!profissionalID) return

            // Departamentos do profissional
            if (departamentos && departamentos.length > 0) {
                const sqlDepartamento = `INSERT INTO profissional_departamento (profissionalID, departamentoID, dataInicio, dataFim, status) VALUES (?, ?, ?, ?, ?)`
                departamentos.map(async (row) => {
                    await executeQuery(sqlDepartamento, [profissionalID, row.departamento.id, row.dataInicio, (row.dataFim ?? null), 1], 'insert', 'profissional_departamento', 'profissionaldepartamentoID', null, logID)
                })
            }

            // Cadastro CARGOS / FUNÇÃO
            if (data.cargosFuncoes.length > 0) {
                const insertCargo = `INSERT INTO profissional_cargo (data, formacaoCargo, conselho, dataInativacao, profissionalID, status) VALUES (?, ?, ?, ?, ?, ?)`
                data.cargosFuncoes.map(async (row) => {
                    await executeQuery(insertCargo, [row.data, row.formacaoCargo, row.conselho, (row.dataInativacao ?? null), profissionalID, (row.dataInativacao ? 0 : 1)], 'insert', 'profissional_cargo', 'profissionalCargoID', null, logID)
                })
            }

            // Se for usuario
            //* Marcou usuário do sistema
            if (data.isUsuario) {
                const sqlInsertUsuario = `INSERT INTO usuario (cpf, nome, email, senha) VALUES (?,?,?, ?)`
                const usuarioID = await executeQuery(sqlInsertUsuario, [data.fields.cpf, data.fields.nome, data.fields.email, criptoMd5(data.senha)], 'insert', 'usuario', 'usuarioID', null, logID)

                const sqlInsertUsuarioUnity = `INSERT INTO usuario_unidade (usuarioID, unidadeID, papelID) VALUES (?,?, ?)`
                await executeQuery(sqlInsertUsuarioUnity, [usuarioID, data.fields.unidadeID, 1], 'insert', 'usuario_unidade', 'usuarioUnidadeID', null, logID)

                const UpdateUser = `UPDATE profissional SET usuarioID = ? WHERE profissionalID = ?`
                await executeQuery(UpdateUser, [usuarioID, profissionalID], 'update', 'profissional', 'profissionalID', null, logID)

                //* PERMISSÕES DE ACESSO
                const newData = {
                    ...data,
                    fields: {
                        ...data.fields,
                        usuarioID
                    },
                }
                accessPermissions(newData)

                // Envia email para email do profissional avisando que o mesmo agora é um usuário
                // Dados do profissional
                const sqlProfessional = `
                SELECT 
                    a.nome,
                    b.formacaoCargo AS cargo
                FROM profissional AS a 
                    LEFT JOIN profissional_cargo AS b ON (a.profissionalID = b.profissionalID)
                WHERE a.profissionalID = ?`
                const [resultSqlProfessional] = await db.promise().query(sqlProfessional, [data.usualioLogado])

                //   Obtem dados da fabrica
                const sqlUnity = `
                SELECT a.*   
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

                const destinatario = data.fields.email
                let assunto = `GEDagro - Login de Acesso ${resultUnity[0].nomeFantasia}`
                const values = {
                    // fabrica
                    enderecoCompletoFabrica: enderecoCompleto,
                    nomeFantasiaFabrica: resultUnity[0].nomeFantasia,
                    cnpjFabrica: resultUnity[0].cnpj,

                    // new user 
                    nome: data.fields.nome,
                    cpf: data.fields.cpf,
                    senha: data.senha,

                    // professional
                    nomeProfissional: resultSqlProfessional[0]?.nome,
                    cargoProfissional: resultSqlProfessional[0]?.cargo,
                    papelID: data.papelID,

                    // outros
                    noBaseboard: false, // Se falso mostra o rodapé com os dados da fabrica, senão mostra dados do GEDagro,
                }

                const html = await newUser(values);
                await sendMailConfig(destinatario, assunto, html, logID, values)

                return res.status(200).json(profissionalID)
            }

            return res.status(200).json(profissionalID)
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    //! Atualiza a foto do perfil do usuário
    async updatePhotoProfile(req, res) {
        try {
            const { id, usuarioID, unidadeID } = req.params
            const pathDestination = req.pathDestination
            const file = req.files[0]; //? Somente 1 arquivo

            const logID = await executeLog('Edição da imagem do profissional', usuarioID, unidadeID, req)

            const sqlSelectPreviousPhoto = `SELECT imagem FROM profissional WHERE profissionalID = ?`;
            const sqlUpdatePhotoProfile = `UPDATE profissional SET imagem = ? WHERE profissionalID = ?`;

            // Verificar se um arquivo foi enviado
            if (!file) {
                res.status(400).json({ error: 'Nenhum arquivo enviado.' });
                return;
            }

            // Obter o nome da foto de perfil anterior
            const [rows] = await db.promise().query(sqlSelectPreviousPhoto, [id]);
            const previousPhotoProfile = rows[0]?.imagem;

            // Atualizar a foto de perfil no banco de dados
            await executeQuery(sqlUpdatePhotoProfile, [`${pathDestination}${file.filename}`, id], 'update', 'profissional', 'profissionalID', id, logID)
            // await db.promise().query(sqlUpdatePhotoProfile, [`${pathDestination}${file.filename}`, id]);

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

    async handleDeleteImage(req, res) {
        const { id, usuarioID, unidadeID } = req.params

        const logID = await executeLog('Exclusão da imagem do profissional', usuarioID, unidadeID, req)

        const sqlSelectPreviousPhoto = `SELECT imagem FROM profissional WHERE profissionalID = ?`;
        const sqlUpdatePhotoProfile = `UPDATE profissional SET imagem = ? WHERE profissionalID = ?`;

        try {
            // Obter o nome da foto de perfil anterior
            const [rows] = await db.promise().query(sqlSelectPreviousPhoto, [id]);
            const previousPhotoProfile = rows[0]?.imagem;

            // Atualizar a foto de perfil no banco de dados
            await executeQuery(sqlUpdatePhotoProfile, [null, id], 'update', 'profissional', 'profissionalID', id, logID)
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

    async verifyCPF(req, res) {
        const data = req.body
        try {
            const sql = `SELECT * FROM usuario WHERE cpf = ?`
            const [result] = await db.promise().query(sql, [data.cpf])
            if (result.length > 0) {
                return res.status(409).json({ message: "CPF já cadastrado!" });
            }
            return res.status(200).json({ message: "CPF válido!" });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao verificar CPF' });
        }
    }

    async updateData(req, res) {
        try {
            const { id } = req.params
            let data = req.body

            let departamentos = data.fields.departamentos
            delete data.fields.departamentos

            const logID = await executeLog('Edição do profissional', data.usualioLogado, data.fields.unidadeID, req)

            // Atualiza dados do profissional
            delete data.fields.imagem

            const UpdateUser = `UPDATE profissional SET ? WHERE profissionalID = ?`
            await executeQuery(UpdateUser, [data.fields, id], 'update', 'profissional', 'profissionalID', id, logID)

            // Departamento 
            const existingItems = await db.promise().query(`SELECT profissionaldepartamentoID FROM profissional_departamento WHERE profissionalID = ?`, [id]);
            const incomingItemIDs = new Set(departamentos.map(item => item.id));

            // Remove os itens que não estão mais na nova lista
            for (const existingItem of existingItems[0]) {
                if (!incomingItemIDs.has(existingItem.profissionaldepartamentoID)) {
                    const sqlItemDelete = `DELETE FROM profissional_departamento WHERE profissionaldepartamentoID = ? AND profissionalID = ?`;
                    await executeQuery(sqlItemDelete, [existingItem.profissionaldepartamentoID, id], 'delete', 'profissional_departamento', 'profissionaldepartamentoID', existingItem.profissionaldepartamentoID, logID);
                }
            }

            // Atualiza ou insere os itens recebidos
            for (const item of departamentos) {
                if (item.id) {
                    const sqlItemUpdate = `UPDATE profissional_departamento SET departamentoID = ?, dataInicio = ?, dataFim = ?, status = ? WHERE profissionaldepartamentoID = ? AND profissionalID = ?`;
                    await executeQuery(sqlItemUpdate, [
                        item.departamento.id,
                        item.dataInicio,
                        item.dataFim ?? null,
                        item.dataFim && item.dataFim !== '0000-00-00' ? 0 : 1, // Status
                        item.id,
                        id
                    ], 'update', 'profissional_departamento', 'profissionaldepartamentoID', item.id, logID);
                } else {
                    const sqlItemInsert = `INSERT INTO profissional_departamento (profissionalID, departamentoID, dataInicio, dataFim, status) VALUES (?, ?, ?, ?, ?)`
                    await executeQuery(sqlItemInsert, [
                        id,
                        item.departamento.id,
                        item.dataInicio,
                        item.dataFim ?? null,
                        item.dataFim && item.dataFim !== '0000-00-00' ? 0 : 1 // Status
                    ], 'insert', 'profissional_departamento', 'departamentoID', id, logID);
                }
            }

            // Exclui cargos / função
            if (data.removedItems.length > 0) {
                const sqlDeleteItens = `DELETE FROM profissional_cargo WHERE profissionalCargoID IN (${data.removedItems.join(',')})`
                await executeQuery(sqlDeleteItens, [], 'delete', 'profissional_cargo', 'profissionalID', id, logID)
            }

            // Atualiza ou insere cargo | Função
            if (data.cargosFuncoes.length > 0) {
                data.cargosFuncoes.map(async (row) => {
                    const formatedData = row.data.substring(0, 10)
                    if (row && row.profissionalCargoID > 0) { //? Já existe, atualiza
                        const sqlUpdateItem = `UPDATE profissional_cargo SET data = ?, formacaoCargo = ?, conselho = ?,  dataInativacao = ?, status = ?  WHERE profissionalCargoID = ?`
                        await executeQuery(sqlUpdateItem, [formatedData,
                            row.formacaoCargo, row.conselho, (row.dataInativacao), (row.dataInativacao ? '0' : '1'), row.profissionalCargoID], 'update', 'profissional_cargo', 'profissionalID', id, logID)

                    } else if (row && !row.profissionalCargoID) {    //? Novo, insere
                        const sqlInsertItem = `INSERT INTO profissional_cargo (data, formacaoCargo, conselho, dataInativacao, status, profissionalID) VALUES (?, ?, ?, ?, ?, ?)`
                        await executeQuery(sqlInsertItem, [formatedData, row.formacaoCargo, row.conselho, (row.dataInativacao), (row.dataInativacao ? '0' : '1'), data.fields.profissionalID], 'insert', 'profissional_cargo', 'profissionalCargoID', null, logID)
                    }
                })
            }

            //* Marcou usuário do sistema
            if (data.isUsuario) {
                const sqlCheckCPF = `SELECT * FROM usuario WHERE cpf = "${data.fields.cpf}"`
                const [resultCheckCPF] = await db.promise().query(sqlCheckCPF)

                //? Já existe usuário com esse CPF, copia usuário id para a tabela profissional
                if (resultCheckCPF.length > 0) {
                    const usuarioID = resultCheckCPF[0].usuarioID

                    // Seta usuárioID na tabela profissional
                    const UpdateUser = `UPDATE profissional SET usuarioID = ? WHERE profissionalID = ?`
                    await executeQuery(UpdateUser, [usuarioID, id], 'update', 'profissional', 'profissionalID', id, logID)

                    if (id > 1) { //? Ignora administrador
                        // Verifica se já esta cadastrado na unidade
                        const sqlUnityCheck = `SELECT * FROM usuario_unidade WHERE usuarioID = ? AND unidadeID = ?`
                        const [resultUnityCheck] = await db.promise().query(sqlUnityCheck, [usuarioID, data.fields.unidadeID])

                        //? Já está cadastrado na unidade
                        if (resultUnityCheck.length > 0) {
                            const sqlUpdateUsuarioUnity = `UPDATE usuario_unidade SET status = ? WHERE usuarioID = ? AND unidadeID = ? `
                            await executeQuery(sqlUpdateUsuarioUnity, [1, usuarioID, data.fields.unidadeID], 'update', 'usuario_unidade', 'usuarioID', usuarioID, logID)
                        } else {
                            // Insere usuário na unidade
                            const sqlInsertUsuarioUnity = `INSERT INTO usuario_unidade (usuarioID, unidadeID, papelID) VALUES (?,?,?)`
                            await executeQuery(sqlInsertUsuarioUnity, [usuarioID, data.fields.unidadeID, 1], 'insert', 'usuario_unidade', 'usuarioUnidadeID', null, logID)
                        }

                        //* PERMISSÕES DE ACESSO
                        accessPermissions(data)
                    }

                    res.status(200).json({ message: 'Dados atualizados com sucesso!' })
                }
                //? Ainda não existe o usuario com esse CPF, cria novo
                else {
                    const sqlInsertUsuario = `INSERT INTO usuario (cpf, nome, email, senha) VALUES (?,?,?,?)`
                    const usuarioID = await executeQuery(sqlInsertUsuario, [data.fields.cpf, data.fields.nome, data.fields.email, criptoMd5(data.senha)], 'insert', 'usuario', 'usuarioID', null, logID)

                    const sqlInsertUsuarioUnity = `INSERT INTO usuario_unidade (usuarioID, unidadeID, papelID) VALUES (?,?,?)`
                    await executeQuery(sqlInsertUsuarioUnity, [usuarioID, data.fields.unidadeID, 1], 'insert', 'usuario_unidade', 'usuarioUnidadeID', null, logID)

                    const UpdateUser = `UPDATE profissional SET usuarioID = ? WHERE profissionalID = ?`
                    await executeQuery(UpdateUser, [usuarioID, id], 'update', 'profissional', 'profissionalID', id, logID)

                    //* PERMISSÕES DE ACESSO
                    const newData = {
                        ...data,
                        fields: {
                            ...data.fields,
                            usuarioID
                        },
                    }
                    accessPermissions(newData, logID)

                    // Envia email para email do profissional avisando que o mesmo agora é um usuário
                    const sqlProfessional = `
                    SELECT 
                        a.nome,
                        b.formacaoCargo AS cargo
                    FROM profissional AS a 
                        LEFT JOIN profissional_cargo AS b ON (a.profissionalID = b.profissionalID)
                    WHERE a.profissionalID = ?
                    `
                    const [resultSqlProfessional] = await db.promise().query(sqlProfessional, [data.usualioLogado])

                    //   Obtem dados da fabrica
                    const sqlUnity = `
                    SELECT a.*   
                    FROM unidade AS a
                    WHERE a.unidadeID = ?;
                    `
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

                    const destinatario = data.fields.email
                    let assunto = `GEDagro - Login de Acesso ${resultUnity[0].nomeFantasia}`
                    const values = {
                        // fabrica
                        enderecoCompletoFabrica: enderecoCompleto,
                        nomeFantasiaFabrica: resultUnity[0].nomeFantasia,
                        cnpjFabrica: resultUnity[0].cnpj,

                        // new user 
                        nome: data.fields.nome,
                        cpf: data.fields.cpf,
                        senha: data.senha,

                        // professional
                        nomeProfissional: resultSqlProfessional[0]?.nome,
                        cargoProfissional: resultSqlProfessional[0]?.cargo,
                        papelID: data.papelID,

                        // outros
                        noBaseboard: false, // Se falso mostra o rodapé com os dados da fabrica, senão mostra dados do GEDagro,
                    }

                    const html = await newUser(values);
                    await sendMailConfig(destinatario, assunto, html, logID, values)

                    res.status(200).json({ message: 'Dados atualizados com sucesso!' })
                }
            }
            //* Desmarcou usuário do sistema
            else {
                const UpdateUser = `UPDATE profissional SET usuarioID = ? WHERE profissionalID = ?`
                await executeQuery(UpdateUser, [null, id], 'update', 'profissional', 'profissionalID', id, logID)

                res.status(200).json({ message: 'Dados atualizados com sucesso!' })
            }
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async updatePassword(req, res) {
        const { id } = req.params;
        const data = req.body;
        try {
            if (!id || id <= 0) {
                throw new Error("Dados incorretos");
            }
            const logID = await executeLog('Troca de senha do profissional', id, data.unidadeID, req)

            // Verifica se é ADMIN
            const sqlAdmin = `SELECT admin FROM usuario WHERE usuarioID = ?`
            const [resultAdmin] = await db.promise().query(sqlAdmin, [id])

            // // dados do profissional
            const getProfessional = "SELECT * FROM profissional WHERE usuarioID = ?"
            const [resultProfessional] = await db.promise().query(getProfessional, [id])

            // //   Obtem dados da fabrica
            const sqlUnity = `
            SELECT a.*   
            FROM unidade AS a
            WHERE a.unidadeID = ?`
            const [resultUnity] = await db.promise().query(sqlUnity, [data.unidadeID])

            if (resultAdmin && resultAdmin[0].admin == 1) { //? ADMIN do sistema (não tem profissional) (não envia email)

                const getUpdate = "UPDATE usuario SET senha = ? WHERE usuarioID = ?"

                await executeQuery(getUpdate, [criptoMd5(data.senha), id], 'update', 'usuario', 'usuarioID', id, logID)

                return res.status(200).json({ message: 'Senha atualizada com sucesso!' })
            } else if (resultProfessional.length > 0 || data.papelID == 2) {
                const getUpdate = "UPDATE usuario SET senha = ? WHERE usuarioID = ?"

                await executeQuery(getUpdate, [criptoMd5(data.senha), id], 'update', 'usuario', 'usuarioID', id, logID)


                // Chama a função que envia email para o usuário
                const destinatario = data.papelID == 1 ? resultProfessional[0].email : resultUnity[0].email
                let assunto = 'GEDagro - Senha Alterada'
                const values = {
                    // fabrica
                    nomeFantasiaFabrica: data.papelID == 1 ? resultUnity[0].nomeFantasia : resultUnity[0].nomeFantasia,
                    cnpjFabrica: data.papelID == 1 ? resultUnity[0].cnpj : resultUnity[0].cnpj,

                    // outros
                    nome: data.papelID == 1 ? resultProfessional[0].nome : resultUnity[0].nomeFantasia,
                    papelID: data.papelID,
                }

                const html = await alterPassword(values);
                await sendMailConfig(destinatario, assunto, html)

                return res.status(200).json({ message: 'Senha atualizada com sucesso!' })
            } else {
                return res.status(500).json({ message: 'Erro ao atualizar a senha' })
            }

        } catch (e) {
            console.log(e);
        }
    }

    async copyPermissions(req, res) {
        const data = req.body;
        try {
            if (!data.papelID || !data.usuarioID || !data.unidadeID) {
                return res.status(500).json({ message: 'Dados incorretos' })
            }

            const permission = await getMenuPermissions(data.papelID, data.usuarioID, data.unidadeID)
            if (!permission) {
                return res.status(500).json({ message: 'Erro ao copiar permissões' })
            }

            return res.status(200).json(permission)

        } catch (error) {
            console.log("🚀 ~ error:", error)
        }



    }

    async deleteData(req, res) {
        const { id, unidadeID, usuarioID } = req.params

        //? Obtém usuarioID pra deletar tabelas usuario e usuario_unidade depois de apagar o profissional
        const sqlUser = `SELECT usuarioID FROM profissional WHERE profissionalID = ?`
        const [resultUser] = await db.promise().query(sqlUser, [id])
        const usuarioIDelete = resultUser[0].usuarioID

        const objDelete = {
            table: ['profissional_departamento', 'profissional_cargo', 'profissional'],
            column: 'profissionalID'
        }
        const arrPending = [
            {
                table: 'recebimentomp',
                column: ['preencheProfissionalID', 'abreProfissionalID', 'finalizaProfissionalID', 'aprovaProfissionalID'],
            },
            {
                table: 'fornecedor',
                column: ['profissionalID', 'aprovaProfissionalID'],
            },
            {
                table: 'profissional_departamento',
                column: ['profissionalID'],
            }
        ]

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão de profissional', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    return res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão de profissional', usuarioID, unidadeID, req)
                    if (usuarioIDelete) {
                        // Deleta de notificacao_usuario
                        const sqlDeleteNotificacaoUsuario = `DELETE FROM notificacao_usuario WHERE usuarioID = ?`
                        await executeQuery(sqlDeleteNotificacaoUsuario, [usuarioIDelete], 'delete', 'notificacao_usuario', 'usuarioID', id, logID)

                        //? Deleta usuario e usuario_unidade
                        const sqlDeleteUsuarioUnidade = `DELETE FROM usuario_unidade WHERE usuarioID = ?`
                        await executeQuery(sqlDeleteUsuarioUnidade, [usuarioIDelete], 'delete', 'usuario_unidade', 'usuarioID', id, logID)
                    }

                    const sqlDeleteUsuario = `DELETE FROM usuario WHERE usuarioID = ?`
                    await executeQuery(sqlDeleteUsuario, [usuarioIDelete], 'delete', 'usuario', 'usuarioID', id, logID)

                    //? Deleta profissional e profissional_cargo
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}

const boolToNumber = (bool) => { return bool ? 1 : 0 }

const existsUsuarioUnidadePapel = async (usuarioID, unidadeID, papelID) => {
    const sql = `
    SELECT * 
    FROM usuario_unidade 
    WHERE usuarioID = ? AND unidadeID = ? AND papelID = ? `
    const [result] = await db.promise().query(sql, [usuarioID, unidadeID, papelID])
    return result.length > 0 ? true : false
}

const hasCargosEdit = (cargos) => {
    let hasEdit = false
    cargos.map(cargo => {
        if (cargo.edit) { hasEdit = true }
    })
    return hasEdit
}

const getProfissionalPreenchimento = async (table, key, modeloID) => {
    const sqlPreenche = `
    SELECT
        b.profissionalID AS id, 
        b.nome
    FROM ${table} AS a
        JOIN profissional AS b ON (a.profissionalID = b.profissionalID)
    WHERE a.${key} = ? AND a.tipo = 1
    ORDER BY b.nome ASC`
    // const [resultPreenche] = await db.promise().query(sqlPreenche, [modeloID])

    const sqlAprova = `
    SELECT
        b.profissionalID AS id, 
        b.nome
    FROM ${table} AS a
        JOIN profissional AS b ON (a.profissionalID = b.profissionalID)
    WHERE a.${key} = ? AND a.tipo = 2
    ORDER BY b.nome ASC`
    // const [resultAprova] = await db.promise().query(sqlAprova, [modeloID])

    const result = {
        preenche: [],
        aprova: []
    }

    return result
}

module.exports = ProfissionalController;