const db = require('../../../config/db');
require('dotenv/config')
const path = require('path');
const fs = require('fs');
const { hasPending, deleteItem, getMenuPermissions, criptoMd5 } = require('../../../config/defaultConfig');
const multer = require('multer');

class UsuarioController {
    async getList(req, res) {
        const { unidadeID, papelID } = req.query

        if (!unidadeID || !papelID) {
            return res.status(400).json({ message: "Dados inválidos!" });
        }

        //? Busca usuários da unidade e papel atual 
        const sql = `
        SELECT u.usuarioID AS id, u.nome, u.cpf, u.dataNascimento, e.nome AS status , e.cor
        FROM usuario AS u
            JOIN usuario_unidade AS uu ON (u.usuarioID = uu.usuarioID)
            JOIN status AS e ON (u.status = e.statusID)
        WHERE uu.unidadeID = ? AND uu.papelID = ?
        ORDER BY u.status DESC, u.nome ASC`
        const [result] = await db.promise().query(sql, [unidadeID, papelID])

        res.status(200).json(result)
    }

    async getData(req, res) {
        try {
            const { id } = req.params
            const { unidadeID, papelID, admin } = req.query
            let getData = {}

            // LEFT JOIN profissao c on (b.profissaoID = c.profissaoID) b.profissaoID,
            const sql = `
            SELECT a.*, b.usuarioUnidadeID,  b.registroConselhoClasse, d.nome AS papel
            FROM usuario a 
                JOIN usuario_unidade b ON a.usuarioID = b.usuarioID
                LEFT JOIN papel d on (b.papelID = d.papelID)
                WHERE a.usuarioID = ? AND b.unidadeID = ?`
            const [result] = await db.promise().query(sql, [id, unidadeID])

            if (result.length == 0) {
                return res.status(404).json({ message: 'Usuário não encontrado!' })
            }

            getData['fields'] = {
                ...result[0],
                imagem: result[0].imagem ? `${process.env.BASE_URL_UPLOADS}profile/${result[0].imagem}` : null,
            }
            getData['units'] = []

            // LEFT JOIN profissao c on (b.profissaoID = c.profissaoID) c.profissaoID,
            // Se for admin, busca os dados da unidade, papel e cargo
            if (admin == 1) {
                const sqlUnits = `
                SELECT b.usuarioUnidadeID, a.*, b.registroConselhoClasse, b.unidadeID, b.papelID, d.nomeFantasia as unidade,  b.status as statusUnidade, e.nome AS papel
                FROM usuario a 
                    JOIN usuario_unidade b ON a.usuarioID = b.usuarioID
                    JOIN unidade d on (b.unidadeID = d.unidadeID)
                    JOIN papel e on (b.papelID = e.papelID)
                WHERE a.usuarioID = ?
                ORDER BY IF((b.unidadeID = ${unidadeID} AND b.papelID = ${papelID}), 1, 0) DESC, d.nomeFantasia ASC `;

                const [resultUnits] = await db.promise().query(sqlUnits, [id])

                for (const unit of resultUnits) {
                    unit[`unidade`] = {
                        id: unit.unidadeID,
                        nome: unit.unidade,
                    }
                    unit[`papel`] = {
                        id: unit.papelID,
                        nome: unit.papel,
                    }
                    // unit[`profissao`] = {
                    //     id: unit.profissaoID,
                    //     nome: unit.profissao,
                    // }

                    // Obtém os cargos
                    const sqlCargos = `
                    SELECT c.cargoID AS id, nome
                    FROM usuario_unidade a
                        JOIN usuario_unidade_cargo b on (a.usuarioUnidadeID = b.usuarioUnidadeID)
                        JOIN cargo c on (b.cargoID = c.cargoID)
                    WHERE a.usuarioID = ? AND a.unidadeID = ? AND a.papelID = ?`;
                    const [resultCargos] = await db.promise().query(sqlCargos, [id, unit.unidadeID, unit.papelID])
                    unit[`cargos`] = resultCargos

                    // Obtém opções do menu pra setar permissões (empresa ou fornecedor)
                    unit['menu'] = await getMenuPermissions(unit?.papelID, id, unit.unidadeID)
                }

                getData['units'] = resultUnits

                // Options pros selects
                const sqlUnidadesAll = `
                SELECT unidadeID, nomeFantasia AS nome
                FROM unidade
                WHERE status = 1
                ORDER BY nomeFantasia ASC`;
                const [resultUnidadesAll] = await db.promise().query(sqlUnidadesAll)
                getData['unidadesOptions'] = resultUnidadesAll

                const sqlPapel = `
                SELECT papelID AS id, nome
                FROM papel
                WHERE status = 1
                ORDER BY nome ASC`;
                const [resultPapel] = await db.promise().query(sqlPapel)
                getData['papelOptions'] = resultPapel
            } else { // Não é admin 
                // Profissão
                // getData[`profissao`] = {
                //     id: result[0].profissaoID,
                //     nome: result[0].profissao,
                // }

                // Cargos 
                const sqlCargos = `
                SELECT c.cargoID AS id, nome
                FROM usuario_unidade a
                    JOIN usuario_unidade_cargo b on (a.usuarioUnidadeID = b.usuarioUnidadeID)
                    JOIN cargo c on (b.cargoID = c.cargoID)
                WHERE a.usuarioID = ? AND a.unidadeID = ? AND a.papelID = ?`;
                const [resultCargos] = await db.promise().query(sqlCargos, [id, unidadeID, papelID])
                getData[`cargo`] = resultCargos
            }

            // const sqlProfissao = `
            // SELECT * 
            // FROM profissao
            // WHERE status = 1 
            // ORDER BY nome ASC`;
            // const [resultProfissao] = await db.promise().query(sqlProfissao)
            // getData['profissaoOptions'] = resultProfissao

            const sqlCargosAll = `
            SELECT cargoID AS id, nome
            FROM cargo
            WHERE status = 1
            ORDER BY nome ASC`;
            const [resultCargosAll] = await db.promise().query(sqlCargosAll)
            getData['cargosOptions'] = resultCargosAll

            res.status(200).json(getData)
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async insertData(req, res) {
        try {
            const data = req.body;

            //? Valida duplicidade de CPF 
            const sqlVerifyCpf = `SELECT usuarioID FROM usuario WHERE cpf = ?`
            const [resultVerifyCpf] = await db.promise().query(sqlVerifyCpf, [data.fields.cpf])
            if (resultVerifyCpf.length > 0) {
                return res.status(409).json({ message: 'Já existe um usuário com esse CPF!' })
            }

            //* USUARIO
            // CPF novo
            const sqlUsuario = `
            INSERT INTO usuario (nome, cpf, senha, dataNascimento, rg, email, role, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            const [resultUsuario] = await db.promise().query(sqlUsuario, [data.fields.nome, data.fields.cpf, criptoMd5(data.fields.senha), data.fields.dataNascimento, data.fields.rg, data.fields.email, 'admin', 1])
            const usuarioID = resultUsuario.insertId

            //* USUARIO_UNIDADE
            const sqlUsuarioUnidade = `
            INSERT INTO usuario_unidade (usuarioID, unidadeID, papelID, registroConselhoClasse, status)
            VALUES (?, ?, ?, ?, ?)`;
            const [resultUsuarioUnidade] = await db.promise().query(sqlUsuarioUnidade, [usuarioID, data.unidadeID, data.papelID, data.fields.registroConselhoClasse, 1])

            res.status(200).json({
                id: usuarioID,
                message: 'Dados inseridos com sucesso!'
            })

        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    //! Atualiza a foto do perfil do usuário
    async updatePhotoProfile(req, res) {
        try {
            const photoProfile = req.file;
            const { id } = req.params;
            const sqlSelectPreviousPhoto = `SELECT imagem FROM usuario WHERE usuarioID = ?`;
            const sqlUpdatePhotoProfile = `UPDATE usuario SET imagem = ? WHERE usuarioID = ?`;

            // Verificar se um arquivo foi enviado
            if (!photoProfile) {
                res.status(400).json({ error: 'Nenhum arquivo enviado.' });
                return;
            }

            // Obter o nome da foto de perfil anterior
            const [rows] = await db.promise().query(sqlSelectPreviousPhoto, [id]);
            const previousPhotoProfile = rows[0]?.imagem;

            // Atualizar a foto de perfil no banco de dados
            await db.promise().query(sqlUpdatePhotoProfile, [photoProfile.filename, id]);

            // Excluir a foto de perfil anterior
            if (previousPhotoProfile) {
                const previousPhotoPath = path.resolve('uploads/profile', previousPhotoProfile);
                fs.unlink(previousPhotoPath, (error) => {
                    if (error) {
                        return console.error('Erro ao excluir a imagem anterior:', error);
                    } else {
                        return console.log('Imagem anterior excluída com sucesso!');
                    }
                });
            }

            const photoProfileUrl = `${process.env.BASE_URL_UPLOADS}profile/${photoProfile.filename}`;
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
        const { id } = req.params;

        const sqlSelectPreviousPhoto = `SELECT imagem FROM usuario WHERE usuarioID = ?`;
        const sqlUpdatePhotoProfile = `UPDATE usuario SET imagem = ? WHERE usuarioID = ?`;

        try {
            // Obter o nome da foto de perfil anterior
            const [rows] = await db.promise().query(sqlSelectPreviousPhoto, [id]);
            const previousPhotoProfile = rows[0]?.imagem;

            // Atualizar a foto de perfil no banco de dados
            await db.promise().query(sqlUpdatePhotoProfile, [null, id]);

            // Excluir a foto de perfil anterior
            if (previousPhotoProfile) {
                const previousPhotoPath = path.resolve('uploads/profile', previousPhotoProfile);
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

    async updateData(req, res) {
        try {
            const { id } = req.params
            const data = req.body

            //* USUÁRIO
            //? Atualiza os dados do usuário
            const sqlUsuario = `
            UPDATE usuario
            SET nome = ?, email = ?, dataNascimento = ?, cpf = ?, rg = ? ${data.fields.senha && data.fields.senha.length > 0 ? ', senha = ?' : ''}
            WHERE usuarioID = ?`
            const [resultUsuario] = await db.promise().query(sqlUsuario, [
                data.fields.nome,
                data.fields.email,
                data.fields.dataNascimento,
                data.fields.cpf,
                data.fields.rg,
                ...(data.fields.senha && data.fields.senha.length > 0 ? [criptoMd5(data.fields.senha)] : []),
                id
            ])

            //* USUARIO_UNIDADE
            //? Profissão
            if (data.profissao && data.profissao.id > 0 && data.profissao.edit) {
                const sqlProfissao = `
                UPDATE usuario_unidade
                SET profissaoID = ?
                WHERE usuarioUnidadeID = ?`
                const [resultProfissao] = await db.promise().query(sqlProfissao, [data.profissao.id, data.usuarioUnidadeID])
            }

            //? Cargos 
            if (data.cargo && data.cargo.length > 0 && hasCargosEdit(data.cargo)) {
                //? Deleta todos os cargos dessa unidade do usuário
                const sqlDeleteCargos = `
                DELETE FROM usuario_unidade_cargo
                WHERE usuarioUnidadeID = ?`
                const [resultDeleteCargos] = await db.promise().query(sqlDeleteCargos, [data.usuarioUnidadeID])
                //? Insere os novos cargos
                data.cargo.map(async (cargo, indexCargo) => {
                    const sqlCargo = `
                    INSERT INTO usuario_unidade_cargo (usuarioUnidadeID, cargoID)
                    VALUES (?, ?)`
                    const [resultCargo] = await db.promise().query(sqlCargo, [data.usuarioUnidadeID, cargo.id])
                })
            }

            //* ADMIN
            //? ADMIN Configura:
            //?      - unidades
            //?      - papeis
            //?      - profissões
            //?      - cargos
            //?      - permissões de acesso
            if (data.permissionUserLogged == 1 && data.units && data.units.length > 0) {
                data.units.map(async (unit, indexUnit) => {

                    //* UNIDADE
                    //? Só vem se for inserida uma nova
                    if (unit.unidade && unit.unidade.id > 0 && unit.papel && unit.papel.id > 0) {
                        //? Verifica se já existe essa unidade com esse papel para esse usuário
                        const verifyUsuarioUnidadePapel = await existsUsuarioUnidadePapel(id, unit.unidade.id, unit.papel.id)
                        if (!verifyUsuarioUnidadePapel) { //? Ok, pode inserir nova unidade 
                            const sqlUsuarioUnidade = `
                            INSERT INTO usuario_unidade (usuarioID, unidadeID, papelID, profissaoID, status)
                            VALUES (?, ?, ?, ?, ?)`
                            const [resultUsuarioUnidade] = await db.promise().query(sqlUsuarioUnidade, [id, unit.unidade.id, unit.papel.id, (unit.profissao && unit.profissao.id > 0 ? unit.profissao.id : ''), 1])

                            //? Insere os cargos
                            if (unit.cargo && unit.cargo.length > 0 && hasCargosEdit(unit.cargo)) {
                                unit.cargo.map(async (cargo, indexCargo) => {
                                    const sqlUsuarioUnidadeCargo = `
                                    INSERT INTO usuario_unidade_cargo (usuarioUnidadeID, cargoID)
                                    VALUES (?, ?)`
                                    const [resultUsuarioUnidadeCargo] = await db.promise().query(sqlUsuarioUnidadeCargo, [resultUsuarioUnidade.insertId, cargo.id])
                                })
                            }
                        }
                    }

                    //* PAPEL
                    //? Altera papel existente, se não houver conflito com unidade e usuario
                    if (unit.usuarioUnidadeID > 0 && unit.unidadeID && unit.papel && unit.papel.edit) { // Alterou o papel
                        //? Verifica se já existe essa unidade com esse papel para esse usuário
                        const verifyPapel = await existsUsuarioUnidadePapel(id, unit.unidadeID, unit.papel.id)
                        if (!verifyPapel) { //? Ok, pode atualizar o papel
                            const sqlUsuarioUnidade = `
                            UPDATE usuario_unidade
                            SET papelID = ?
                            WHERE usuarioUnidadeID = ?`
                            const [resultUsuarioUnidade] = await db.promise().query(sqlUsuarioUnidade, [unit.papel.id, unit.usuarioUnidadeID])
                        }
                    }

                    //* PROFISSÃO E CARGOS
                    //? Edição, não precisa de validação, só alterar
                    if (unit.usuarioUnidadeID > 0) {
                        //? Alterou a profissão
                        if (unit.profissao.edit) {
                            const sqlProfissao = `
                            UPDATE usuario_unidade
                            SET profissaoID = ?
                            WHERE usuarioUnidadeID = ?`
                            const [resultProfissao] = await db.promise().query(sqlProfissao, [unit.profissao.id, unit.usuarioUnidadeID])
                        }

                        //? Alterou os cargos
                        if (unit.cargo && unit.cargo.length > 0 && hasCargosEdit(unit.cargo)) { // Houve pelo menos 1 alteração de cargo pra essa unidade, então atualiza todos os cargos
                            //? Deleta todos os cargos dessa unidade do usuário
                            const sqlDeleteCargos = `
                            DELETE FROM usuario_unidade_cargo
                            WHERE usuarioUnidadeID = ?`
                            const [resultDeleteCargos] = await db.promise().query(sqlDeleteCargos, [unit.usuarioUnidadeID])
                            //? Insere os novos cargos
                            unit.cargo.map(async (cargo, indexCargo) => {
                                const sqlCargo = `
                                INSERT INTO usuario_unidade_cargo (usuarioUnidadeID, cargoID)
                                VALUES (?, ?)`
                                const [resultCargo] = await db.promise().query(sqlCargo, [unit.usuarioUnidadeID, cargo.id])
                            })
                        }
                    }

                    //* PERMISSÕES DE ACESSO
                    unit.menu && unit.menu.length > 0 && unit.menu.map(async (menuGroup, indexMenuGroup) => {
                        menuGroup.menu && menuGroup.menu.length > 0 && menuGroup.menu.map(async (menu, indexMenu) => {
                            //? Editou menu
                            if (menu.edit) {
                                //? Verifica se já existe essa unidade com esse papel para esse usuário
                                const verifyMenu = `
                                SELECT permissaoID
                                FROM permissao
                                WHERE rota = ? AND unidadeID = ? AND usuarioID = ? AND papelID = ?`
                                const [resultVerifyMenu] = await db.promise().query(verifyMenu, [menu.rota, unit.unidadeID, id, unit.papel.id])
                                if (resultVerifyMenu.length > 0) { //? Ok, pode atualizar o menu
                                    const sqlMenu = `
                                    UPDATE permissao
                                    SET ler = ?, inserir = ?, editar = ?, excluir = ?
                                    WHERE rota = ? AND unidadeID = ? AND usuarioID = ? AND papelID = ?`
                                    const [resultMenu] = await db.promise().query(sqlMenu, [
                                        boolToNumber(menu.ler),
                                        boolToNumber(menu.inserir),
                                        boolToNumber(menu.editar),
                                        boolToNumber(menu.excluir),
                                        menu.rota,
                                        unit.unidadeID,
                                        id,
                                        unit.papel.id
                                    ])
                                } else { //? Não existe, então insere
                                    const sqlMenu = `
                                    INSERT INTO permissao (rota, unidadeID, usuarioID, papelID, ler, inserir, editar, excluir)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                                    const [resultMenu] = await db.promise().query(sqlMenu, [
                                        menu.rota,
                                        unit.unidadeID,
                                        id,
                                        unit.papel.id,
                                        boolToNumber(menu.ler),
                                        boolToNumber(menu.inserir),
                                        boolToNumber(menu.editar),
                                        boolToNumber(menu.excluir)
                                    ])
                                }
                            }

                            //? Submenus 
                            menu.submenu && menu.submenu.length > 0 && menu.submenu.map(async (submenu, indexSubmenu) => {
                                if (submenu.edit) { //? Editou submenu 
                                    //? Verifica se já existe essa unidade com esse papel para esse usuário
                                    const verifySubmenu = `
                                    SELECT permissaoID
                                    FROM permissao
                                    WHERE rota = ? AND unidadeID = ? AND usuarioID = ? AND papelID = ?`
                                    const [resultVerifySubmenu] = await db.promise().query(verifySubmenu, [submenu.rota, unit.unidadeID, id, unit.papel.id])

                                    if (resultVerifySubmenu.length > 0) { //? Ok, pode atualizar o submenu
                                        const sqlSubmenu = `
                                        UPDATE permissao
                                        SET ler = ?, inserir = ?, editar = ?, excluir = ?
                                        WHERE rota = ? AND unidadeID = ? AND usuarioID = ? AND papelID = ?`
                                        const [resultSubmenu] = await db.promise().query(sqlSubmenu, [
                                            boolToNumber(submenu.ler),
                                            boolToNumber(submenu.inserir),
                                            boolToNumber(submenu.editar),
                                            boolToNumber(submenu.excluir),
                                            submenu.rota,
                                            unit.unidadeID,
                                            id,
                                            unit.papel.id
                                        ])
                                    } else { //? Não existe, então insere
                                        const sqlSubmenu = `
                                        INSERT INTO permissao (rota, unidadeID, usuarioID, papelID, ler, inserir, editar, excluir)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                                        const [resultSubmenu] = await db.promise().query(sqlSubmenu, [
                                            submenu.rota,
                                            unit.unidadeID,
                                            id,
                                            unit.papel.id,
                                            boolToNumber(submenu.ler),
                                            boolToNumber(submenu.inserir),
                                            boolToNumber(submenu.editar),
                                            boolToNumber(submenu.excluir)
                                        ])
                                    }
                                }
                            })
                        })
                    })
                })
            }

            res.status(200).json({ message: 'Dados atualizados com sucesso!' })
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    deleteData(req, res) {
        const { id } = req.params
        const objModule = {
            table: ['usuario'],
            column: 'usuarioID'
        }
        const tablesPending = [] // Tabelas que possuem relacionamento com a tabela atual

        if (!tablesPending || tablesPending.length === 0) {
            return deleteItem(id, objModule.table, objModule.column, res)
        }

        hasPending(id, objModule.column, tablesPending)
            .then((hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    return deleteItem(id, objModule.table, objModule.column, res)
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

module.exports = UsuarioController;