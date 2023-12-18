const db = require('../../../../config/db');
const { gerarSenhaCaracteresIniciais, criptoMd5 } = require('../../../../config/defaultConfig');
const sendMailConfig = require('../../../../config/email');
const { executeQuery, executeLog } = require('../../../../config/executeQuery');
const instructionsNewFornecedor = require('../../../../email/template/fornecedor/instructionsNewFornecedor');
const fornecedorPreenche = require('../../../../email/template/recebimentoMP/naoConformidade/fornecedorPreenche');


class NaoConformidade {
    async fornecedorPreenche(req, res) {
        const data = req.body
        console.log("🚀 ~ data do email:", data)

        // Dados unidade fabrica
        const sqlFabrica = `SELECT * FROM unidade WHERE unidadeID = ?`
        const [result] = await db.promise().query(sqlFabrica, [data.unidadeID])

        //Dados fornecedor
        const sqlFornecedor = `SELECT * FROM fornecedor WHERE fornecedorID = ?`
        const [resultFornecedor] = await db.promise().query(sqlFornecedor, [data.fornecedorID])

        const password = gerarSenhaCaracteresIniciais(resultFornecedor[0].cnpj, 4)

        //Dados profissional logado
        const sqlProfessional = `
        SELECT 
            a.nome,
            b.formacaoCargo AS cargo
        FROM profissional AS a 
            LEFT JOIN profissional_cargo AS b ON (a.profissionalID = b.profissionalID)
        WHERE a.profissionalID = ?`
        const [resultSqlProfessional] = await db.promise().query(sqlProfessional, [data.usuarioID])

        const values = {
            // Unidade Fbrica
            nomeFantasiaFabrica: result[0].nomeFantasia,

            // Unidade Fornecedor
            nomeFantasia: resultFornecedor[0].nome,
            razaoSocial: resultFornecedor[0].razaoSocial,
            cnpjFornecedor: resultFornecedor[0].cnpj,
            senhaFornecedor: password,

            // profissional que abriu formulario
            nomeProfissional: resultSqlProfessional[0]?.nome,
            cargoProfissional: resultSqlProfessional[0]?.cargo,

            // Outros
            unidadeID: data.unidadeID,
            usuarioID: data.usuarioID,
            papelID: data.papelID,
            fornecedorID: data.fornecedorID,
            stage: 's3',
            link: `${process.env.BASE_URL}/fornecedor?r=${data.recebimentoMpID}`,
            products: data.products

        }

        // Envia email para preencher não conformidade no recebimentoMp 
        const logID = await executeLog('Email para preencher não conformidade no recebimentoMp', data.usuarioID, data.unidadeID, req)
        const destinatario = resultFornecedor[0].email
        let assunto = `GEDagro - Prencher não conformidade `
        const html = await fornecedorPreenche(values);
        await sendMailConfig(destinatario, assunto, html, logID, values)

        // Novo fornecedor, envia email como dados de acesso
        if (!data.isUser) {
            const logID = await executeLog('Email e criação de novo fornecedor', data.usuarioID, data.unidadeID, req)

            // Verifica se CNPJ já está cadastrado
            const cnpjExists = "SELECT * FROM usuario WHERE cnpj = ?"
            const [resultCnpjExists] = await db.promise().query(cnpjExists, [resultFornecedor[0].cnpj])

            if (resultCnpjExists.length > 0) {
                return
            } else {
                // Cadastra novo usuário
                const sqlNewUuser = `
                   INSERT INTO usuario(nome, cnpj, email, senha)
                  VALUES(?, ?, ?, ?)`
                const usuarioID = await executeQuery(sqlNewUuser, [resultFornecedor[0].nome, resultFornecedor[0].cnpj, resultFornecedor[0].email, criptoMd5(password)], 'insert', 'usuario', 'usuarioID', null, logID)
                // return

                // Salva a unidade
                const sqlInsertUnity = `
                  INSERT INTO unidade (razaoSocial, nomeFantasia, cnpj, email) VALUES (?,?, ?, ?)`
                const newUnidadeID = await executeQuery(sqlInsertUnity, [resultFornecedor[0].nome, resultFornecedor[0].nome, resultFornecedor[0].cnpj, data.email], 'insert', 'unidade', 'unidadeID', null, logID)

                // Salva usuario_unidade
                const sqlNewUserUnity = `
                INSERT INTO usuario_unidade(usuarioID, unidadeID, papelID)
                VALUES(?, ?, ?)
                      `
                await executeQuery(sqlNewUserUnity, [usuarioID, newUnidadeID, 2], 'insert', 'usuario_unidade', 'usuarioUnidadeID', null, logID)

                let assunto = `Bem-vindo ao GEDagro`
                const html = await instructionsNewFornecedor(values)
                await sendMailConfig(destinatario, assunto, html, logID, values)
            }
        }

        // Atualiza tabela recebimentoMp
        const sqlUpdateRecebimentoMp = `UPDATE recebimentoMp SET naoConformidadeEmailFornecedor = 1 WHERE recebimentoMpID = ?`
        await db.promise().query(sqlUpdateRecebimentoMp, [data.recebimentoMpID])

        res.status(200).json('Email enviado!')
    }
}

module.exports = NaoConformidade