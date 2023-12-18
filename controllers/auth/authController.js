const db = require('../../config/db');
// const dbFile = require('../../config/dbFile');
require('dotenv/config')
const { getMenu, criptoMd5 } = require('../../config/defaultConfig');
const sendMailConfig = require('../../config/email');
const { executeLog, executeQuery } = require('../../config/executeQuery');
const NewPassword = require('../../email/template/EsqueciSenha/NewPassword');

// ** JWT import
const jwt = require('jsonwebtoken');

// ! These two secrets should be in .env file and not in any other file
const jwtConfig = {
    secret: process.env.NEXT_PUBLIC_JWT_SECRET,
    expirationTime: process.env.NEXT_PUBLIC_JWT_EXPIRATION,
    refreshTokenSecret: process.env.NEXT_PUBLIC_JWT_REFRESH_TOKEN_SECRET
}

class AuthController {

    // async testeFoto(req, res) {
    //     const sql = `SELECT * FROM fotos WHERE unidadeID = ?`
    //     const [result] = await dbFile.promise().query(sql, [1]);

    //     for (const foto of result) {

    //         if (foto.tipo == 'image/jpeg') {
    //             foto.url = `data:${foto.tipo};base64,${foto.url}`;
    //         } else {
    //             // Converte para blob
    //             const blob = Buffer.from(foto.url, 'base64');

    //             // Converte para objectUrl pra conseguir abrir o arquivo em uma nova aba no frontend
    //             const objectUrl = URL.createObjectURL(new Blob([blob]));
    //             foto.url = objectUrl;
    //         }
    //     }

    //     res.status(200).json(result);
    // }

    // async enviaFoto(req, res) {
    //     console.log('chegou...')
    //     const files = req.files;

    //     for (const file of files) {
    //         console.log("🚀 ~ file:", file)
    //         const base64 = file.binary.toString('base64');
    //         // Gravar arquivos no banco de dados no formato blob
    //         const sql = `INSERT INTO fotos (url, tipo, unidadeID) VALUES (?, ?, ?)`
    //         const [result] = await dbFile.promise().query(sql, [base64, file.mimetype, 1]);
    //     }

    //     res.status(200).json({ message: 'Fotos salvas no BD!' });
    // }

    //* Login da fábrica (CPF)
    async login(req, res) {
        const { cpf, password } = req.body;

        let error = {
            email: ['Algo está errado!!']
        }

        // LEFT JOIN profissao AS pr ON (uu.profissaoID = pr.profissaoID) , pr.nome as profissao
        const sql = `
        SELECT u.*, un.unidadeID, un.nomeFantasia, p.papelID, p.nome as papel, COALESCE(pr.profissionalID, 0) AS profissionalID, pr.imagem
        FROM usuario AS u 
            LEFT JOIN usuario_unidade AS uu ON (u.usuarioID = uu.usuarioID)
            LEFT JOIN unidade AS un ON (uu.unidadeID = un.unidadeID)
            LEFT JOIN papel AS p ON (uu.papelID = p.papelID)
            LEFT JOIN profissional AS pr ON (u.usuarioID = pr.usuarioID)
        WHERE u.cpf = ? AND u.senha = ? AND uu.status = 1
        ORDER BY un.nomeFantasia ASC`;

        try {
            const [result] = await db.promise().query(sql, [cpf, criptoMd5(password)]);

            if (result.length === 0) {
                return res.status(401).json({ message: 'CPF ou senha incorretos!' });
            }

            const accessToken = jwt.sign({ id: result[0]['usuarioID'] }, jwtConfig.secret, { expiresIn: jwtConfig.expirationTime })

            // +1 UNIDADE, SELECIONA UNIDADE ANTES DE LOGAR
            if (result.length > 1) {
                const response = {
                    accessToken,
                    userData: {
                        ...result[0],
                        senha: undefined,
                        imagem: result[0].imagem ? `${process.env.BASE_URL_API}${result[0].imagem}` : null,
                    },
                    unidades: result.map(unidade => ({ unidadeID: unidade.unidadeID, nomeFantasia: unidade.nomeFantasia, papelID: unidade.papelID, papel: unidade.papel }))
                }

                return res.status(202).json(response);
            }

            // 1 UNIDADE, LOGA DIRETO
            else if (result.length === 1) {
                const response = {
                    accessToken,
                    userData: {
                        ...result[0],
                        imagem: result[0].imagem ? `${process.env.BASE_URL_API}${result[0].imagem}` : null,
                        senha: undefined
                    },
                    unidades: [{ unidadeID: result[0].unidadeID, nomeFantasia: result[0].nomeFantasia, papelID: result[0].papelID, papel: result[0].papel }]
                }
                const logID = await executeLog('Login', response.userData.usuarioID, result[0].unidadeID, req)
                const sqlLatestAcess = 'UPDATE usuario SET ultimoAcesso = NOW() WHERE usuarioID = ?';

                const responseFormat = {
                    userData: response.userData,
                    unidades: response.unidades
                }

                const loginObj = {
                    responseFormat
                }
                await executeQuery(sqlLatestAcess, [response.userData.usuarioID], 'login', 'usuario', 'usuarioID', null, logID, null, loginObj)

                return res.status(200).json(response);
            }

            // ERRO AO FAZER LOGIN
            else {
                error = {
                    email: ['CPF ou senha inválidos!']
                }

                return res.status(400).json(error);
            }
        } catch (err) {
            console.log(err)
            return res.status(500).json({ message: err.message });
        }
    }

    async saveDataLogMultiUnit(req, res) {
        const data = req.body

        const logID = await executeLog('LogOut', data.userData.usuarioID, data.unidadeID.unidadeID, req)
        const sqlLatestAcess = 'UPDATE usuario SET ultimoAcesso = NOW() WHERE usuarioID = ?';

        const responseFormat = data

        const loginObj = {
            responseFormat
        }
        await executeQuery(sqlLatestAcess, [data.userData.usuarioID], 'login', 'usuario', 'usuarioID', null, logID, null, loginObj)

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
                let sqlRoutes = ``
                const admin = req.query.admin;
                //? Usuário admin ou fornecedor, acessa todas as rotas do seu papel
                if (admin == 1 || papelID == 2) {
                    sqlRoutes = `
                    SELECT IF(m.rota <> '', m.rota, s.rota) AS rota, 1 AS ler, 1 AS inserir, 1 AS editar, 1 AS excluir
                    FROM divisor AS d 
                        JOIN menu AS m ON (d.divisorID = m.divisorID)  
                        LEFT JOIN submenu AS s ON (m.menuID = s.menuID)
                    WHERE d.papelID = ${papelID} AND m.status = 1 OR s.status = 1`
                } else {
                    // Não é admin, busca permissões da tabela permissao
                    console.log('papel', papelID);
                    sqlRoutes = `
                    SELECT rota, papelID, ler, inserir, editar, excluir
                    FROM permissao                    
                    WHERE papelID = ${papelID} AND usuarioID = ${usuarioID} AND unidadeID = ${unidadeID}`;
                }

                db.query(sqlRoutes, (err, result) => {
                    if (err) { return res.status(500).json({ message: err.message }); }

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

    /*async*/ register(req, res) {
        const functionName = req.headers['function-name'];

        switch (functionName) {

            //? Função que valida se o cnpj já existe no banco de dados
            case 'handleGetCnpj':
                const { cnpj } = req.body;

                const cnpjExists = `
                SELECT a.*, b.*, c.* 
                FROM unidade a
                    LEFT JOIN usuario_unidade b ON (a.unidadeID = b.unidadeID)
                    LEFT JOIN usuario = c ON (b.usuarioID = c.usuarioID)
                WHERE a.cnpj = ? `;
                const resultCnpj = [] // await db.promise().query(cnpjExists, [cnpj]);
                res.status(200).json(resultCnpj[0]);
                console.log(resultCnpj[0]);
                break;

            //? Funçãoq que valida se o cpf já existe no banco de dados
            case 'handleGetCpf':
                const { cpf } = req.body;

                const cpfExists = `SELECT * FROM usuario WHERE cpf = ?`;
                const resultCpf = [] //await db.promise().query(cpfExists, [cpf]);
                res.status(200).json(resultCpf[0]);
                break;
        }
    }

    //? Função que valida se o CPF é válido e retorna o mesmo para o front / para redefinir senha
    async routeForgotEmailValidation(req, res) {
        const { data } = req.body;
        const type = req.query.type;

        if (type == 'login') {
            let sql = `SELECT * FROM usuario WHERE cpf = ?`;
            const [result] = await db.promise().query(sql, [data]);
            res.status(200).json(result[0]);
        } else if (type == 'fornecedor') {
            let sql = `SELECT email, nome, usuarioID FROM usuario WHERE cnpj = ?`;
            const [result] = await db.promise().query(sql, [data]);
            res.status(200).json(result[0] ? result[0] : null);
        } else {
            res.status(400).json({ message: 'Essa rota não é válida!' });
        }
    }

    //? Função que recebe os dados e envia o email com os dados de acesso
    async forgotPassword(req, res) {
        const { data } = req.body;
        const type = req.query.type;

        let assunto = 'Redefinir senha'

        const values = {
            nome: data.nome,
            usuarioID: data.usuarioID,
            type: type,
            noBaseboard: true,
        }

        const html = await NewPassword(values)
        res.status(200).json(sendMailConfig(data.email, assunto, html));
    }

    //? Função que redefine a senha do usuário
    async routeForgotNewPassword(req, res) {
        const { data } = req.body;
        const logID = await executeLog('Redefinir senha', data.usuarioID, 1, req)

        let sql = `UPDATE usuario SET senha = ? WHERE usuarioID = ?`;
        await executeQuery(sql, [criptoMd5(data.senha), data.usuarioID], 'update', 'usuario', 'usuarioID', data.usuarioID, logID)

        return res.status(200).json({ message: 'Senha alterada com sucesso!' });
    }
}

module.exports = AuthController;