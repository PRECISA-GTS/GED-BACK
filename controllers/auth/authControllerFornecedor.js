const db = require('../../config/db');
const fs = require('fs');
const path = require('path');
const { getMenu, criptoMd5 } = require('../../config/defaultConfig');
const sendMailConfig = require('../../config/email');

// ** JWT import
const jwt = require('jsonwebtoken');

// ! These two secrets should be in .env file and not in any other file
const jwtConfig = {
    secret: process.env.NEXT_PUBLIC_JWT_SECRET,
    expirationTime: process.env.NEXT_PUBLIC_JWT_EXPIRATION,
    refreshTokenSecret: process.env.NEXT_PUBLIC_JWT_REFRESH_TOKEN_SECRET
}

class AuthControllerFornecedor {

    //* Login do fornecedor (CNPJ)
    loginFornecedor(req, res) {
        const { cnpj, password } = req.body;
        const sql = `
        SELECT u.*, un.*, p.papelID, p.nome as papel
        FROM usuario AS u 
            LEFT JOIN usuario_unidade AS uu ON (u.usuarioID = uu.usuarioID)
            LEFT JOIN unidade AS un ON (uu.unidadeID = un.unidadeID)
            LEFT JOIN papel AS p ON (uu.papelID = p.papelID)
        WHERE u.cnpj = ? AND u.senha = "${criptoMd5(password)}" AND uu.status = 1 
        AND p.papelID = 2
        ORDER BY un.nomeFantasia ASC`;

        db.query(sql, [cnpj], (err, result) => {
            if (err) { res.status(409).json({ message: err.message }); }
            if (result.length == 0) {
                return res.status(401).json({ message: 'CNPJ ou senha incorretos' });
            }

            const accessToken = jwt.sign({ id: result[0]['usuarioID'] }, jwtConfig.secret, { expiresIn: jwtConfig.expirationTime })

            const response = {
                accessToken,
                userData: {
                    ...result[0],
                    imagem: result[0].cabecalhoRelatorio ? `${process.env.BASE_URL_API}${result[0].cabecalhoRelatorio}` : null,
                    senha: undefined
                },
                unidades: [
                    result[0] // objeto com todos os dados da unidade
                ]
            }
            res.status(200).json(response);
        })
    }

    async getAvailableRoutes(req, res) {
        const functionName = req.headers['function-name'];
        const { usuarioID, unidadeID, papelID } = req.query;


        // Menu e Routes
        switch (functionName) {
            case 'getMenu':
                const menu = await getMenu(papelID)
                res.status(200).json(menu);
                break;

            case 'getRoutes':
                let sqlRoutes = `
                SELECT 
                    IF(b.rota <> '', b.rota, c.rota) AS rota, 1 AS ler, 1 AS inserir, 1 AS editar, 1 AS excluir
                FROM divisor a 
                    LEFT JOIN menu b on (a.divisorID = b.divisorID)
                    LEFT JOIN submenu c on (b.menuID = c.menuID)
                WHERE (b.status = 1 OR c.status = 1) AND a.papelID = ${papelID}`;

                db.query(sqlRoutes, (err, result) => {
                    if (err) { res.status(500).json({ message: err.message }); }
                    result.forEach(rota => {
                        rota.ler = rota.ler === 1 ? true : false;
                        rota.inserir = rota.inserir === 1 ? true : false;
                        rota.editar = rota.editar === 1 ? true : false;
                        rota.excluir = rota.excluir === 1 ? true : false;
                    })
                    res.status(200).json(result);
                })
                break;
        }
    }

    //* Cadastro do fornecedor
    async getData(req, res) {
        const { cnpj } = req.body;
        const resultFormActive = await hasFormActive(cnpj) //? Verificar se alguma fábrica vinculou esse cnpj como um fornecedor
        const resultUser = await hasUser(cnpj) //? Verificar se já existe esse usuário cadastrado
        const resultUnity = await hasUnityRole(cnpj) //? Verificar se já existe essa unidade vinculada como fornecedor

        const result = {
            status:
                resultFormActive == 0 ? 'notAuthorized' //! O fornecedor não está habilidade por nenhuma fabrica
                    : resultUser?.usuarioID > 0 && resultUnity?.existsFornecedor == 0 ? 'hasUserNotUnity' //! Já tem usuário mas não tem nenhuma unidade com papel fornecedor
                        : resultUser?.usuarioID > 0 && resultUnity?.existsFornecedor == 1 ? 'hasUserHasUnity' //! Já tem usuário e já tem unidade com papel fornecedor
                            : 'isAuthorized', //! Está habilidado por uma fábrica, e não possui cadastro de unidade e nem de usuário
            user: resultUser ?? null,
            unity: resultUnity ?? null
        }
        res.json(result)
    }

    async registerNew(req, res) {
        const { data } = req.body
        let unidadeID = ''

        //? Busca o nome da unida fabrica para enviar notificação após o fornecedor concluir o cadastro
        const sqlGetFactoryUnit = 'SELECT nomeFantasia, unidadeID FROM unidade WHERE unidadeID = ?'
        const [resultSqlGetFactoryUnit] = await db.promise().query(sqlGetFactoryUnit, [data.unidadeID])

        // //? Verificar se o CNPJ já existe na tabela de usuário
        const resultUserSave = await hasUser(data.sectionOne.cnpj)
        if (resultUserSave) {
            return res.status(201).json({ message: 'Já existe um acesso de usuário com esse CNPJ' });
        }

        // //? Verificar se o CNPJ já existe na tabela de unidade e se é um fornecedor
        const resultUnitySave = await hasUnityRole(data.sectionOne.cnpj)
        if (resultUnitySave && resultUnitySave.existsFornecedor > 0) {
            return res.status(202).json({ message: 'Esse CNPJ já cadastrado como um fornecedor, faça login pou recupere sua senha' });
        }

        // //? Salvar o usuário no banco de dados
        const sqlInsertUsuario = `
                INSERT INTO usuario (nome, cnpj, email, senha, admin, role) VALUES (?, ?, ?, ?, ?, ?)`;
        const resultInsertUsuario = await db.promise().query(sqlInsertUsuario, [data.sectionOne.nomeFantasia, data.sectionOne.cnpj, data.sectionOne.email, criptoMd5(data.sectionOne.senha), 0, 'admin']);
        const usuarioID = resultInsertUsuario[0].insertId;

        // //? Salvar a unidade no banco de dados
        if (!resultUnitySave) { // Unidade ainda nao existe
            const sqlInsertUnidade = `
                    INSERT INTO unidade (cnpj, nomeFantasia, razaoSocial, email, telefone1, cep, logradouro, numero, complemento, bairro, cidade, uf, dataCadastro) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const resultInsertUnidade = await db.promise().query(sqlInsertUnidade, [data.sectionOne.cnpj, data.sectionOne.nomeFantasia, data.sectionOne.razaoSocial, data.sectionOne.email, data.sectionTwo.telefone, data.sectionTwo.cep, data.sectionTwo.logradouro, data.sectionTwo.numero, data.sectionTwo.complemento, data.sectionTwo.bairro, data.sectionTwo.cidade, data.sectionTwo.uf, new Date()]);
            unidadeID = resultInsertUnidade[0].insertId;
        } else {
            unidadeID = resultUnitySave[0].unidadeID;
        }

        // //? Salvar na tabela de usuário_unidade com papel 2 de fornecedor
        const sqlInsertUsuarioUnidade = `
                INSERT INTO usuario_unidade (usuarioID, unidadeID, papelID, status) VALUES (?, ?, ?, ?)`;
        const resultInsertUsuarioUnidade = await db.promise().query(sqlInsertUsuarioUnidade, [usuarioID, unidadeID, 2, 1]);

        const values = {
            factory: resultSqlGetFactoryUnit[0],
            supplier: {
                unidadeID,
                usuarioID
            }
        }

        res.status(200).json(values);
    }

    //? Envia email quando fornecedor se cadastrar com sucesso
    async sendMailNewFornecedor(req, res) {
        // const { data } = req.body;
        // const values = {
        //     data,
        //     noBaseboard: true,
        //     stage: 's2'
        // }
        // // noBaseboard => Se falso mostra o rodapé com os dados da fabrica solicitante senão um padrão

        // let assunto = 'Avaliação de fornecedor '
        // const html = await registerNewFornecedor(values);
        // res.status(200).json(sendMailConfig(data.destinatario, assunto, html))
    }

    //? Quando o fornecedor acessa o link de acesso enviado por email / Muda o stado de 10 para 20 na tabela de fornecedor e salva na tabela de movimentaçãoFornecedor
    async setAcessLink(req, res) {
        const { data } = req.body;

        //? Verificar se o link é válido
        const sqlGet = `
        SELECT  fornecedorID, unidadeID, cnpj
        FROM fornecedor
        WHERE MD5(REGEXP_REPLACE(cnpj, '[^0-9]', '')) = "${data.cnpj}" AND MD5(unidadeID) = "${data.unidadeID}" AND status = 10`;

        const sqlGetCnpj = `
        SELECT  fornecedorID, unidadeID, cnpj
        FROM fornecedor
        WHERE MD5(REGEXP_REPLACE(cnpj, '[^0-9]', '')) = "${data.cnpj}" AND MD5(unidadeID) = "${data.unidadeID}" `;

        const [resultCnpj] = await db.promise().query(sqlGetCnpj);

        const [result] = await db.promise().query(sqlGet);

        //? Se o link for válido, atualizar o status do fornecedor para 20 e salvar na tabela de movimentação
        if (result.length > 0 && result[0].fornecedorID > 0) {
            const sqlUpdate = `UPDATE fornecedor SET status = 20 WHERE fornecedorID = ${result[0].fornecedorID}`;
            await db.promise().query(sqlUpdate);

            const sqlInsert = `INSERT INTO movimentacaoformulario (parFormularioID, id, usuarioID, unidadeID, papelID, dataHora, statusAnterior, statusAtual) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            await db.promise().query(sqlInsert, [1, result[0].fornecedorID, 0, result[0].unidadeID, 2, new Date(), 10, 20]);

        }
        res.status(200).json(resultCnpj);
    }
    // Verifica se o CNPJ já existe na tabela de fabrica_forncedor
    async ValidationCNPJ(req, res) {
        const cnpj = req.body.cnpj;

        const existTableUsuario = `SELECT * FROM usuario WHERE cnpj = ?`;
        const existTableFabricaFornecedor = `SELECT * FROM fabrica_fornecedor WHERE fornecedorCnpj = ?`;
        const [resultUsuario] = await db.promise().query(existTableUsuario, [cnpj]);
        const [resultFabricaFornecedor] = await db.promise().query(existTableFabricaFornecedor, [cnpj]);

        if (resultFabricaFornecedor.length > 0 && resultUsuario.length === 0) {
            res.status(201).json({ message: 'É necessário se cadastrar' });
        } else if (resultFabricaFornecedor.length === 0 && resultUsuario.length === 0) {
            res.status(202).json({ message: 'É necessário que uma fábrica habilite o seu CNPJ para fazer cadastro' });
        } else {
            res.status(200).json({ message: 'Tudo certo, só fazer login' });
        }
    }
}

async function hasFormActive(cnpj) {
    const sql = ` 
    SELECT COUNT(*) AS count
    FROM fabrica_fornecedor AS ff
    WHERE ff.fornecedorCnpj = "${cnpj}" AND ff.status = 1 `;
    const [result] = await db.promise().query(sql);
    return result[0]['count'];
}

async function hasUnityRole(cnpj) {
    const sql = ` 
    SELECT a.*, b.*,
        (SELECT COUNT(*) FROM usuario_unidade WHERE unidadeID = a.unidadeID AND papelID = 2) AS existsFornecedor
    FROM unidade AS a 
        LEFT JOIN usuario_unidade AS b ON(a.unidadeID = b.unidadeID)
    WHERE a.cnpj = ? `;
    const [result] = await db.promise().query(sql, [cnpj]);
    return result[0];
}

async function hasUser(cnpj) {
    const sql = ` 
    SELECT *
    FROM usuario AS a 
    WHERE a.cnpj = ? `;
    const [result] = await db.promise().query(sql, [cnpj]);
    return result[0];
}

module.exports = AuthControllerFornecedor;