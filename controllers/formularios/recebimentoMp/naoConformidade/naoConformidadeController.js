const db = require('../../../../config/db');
const { gerarSenhaCaracteresIniciais, criptoMd5 } = require('../../../../config/defaultConfig');
const sendMailConfig = require('../../../../config/email');
const { executeQuery, executeLog } = require('../../../../config/executeQuery');
const instructionsNewFornecedor = require('../../../../email/template/fornecedor/instructionsNewFornecedor');
const fornecedorPreenche = require('../../../../email/template/recebimentoMP/naoConformidade/fornecedorPreenche');


class NaoConformidade {
    async getProdutosRecebimento(req, res) {
        const { recebimentoMpID, unidadeID } = req.body

        try {
            if (!recebimentoMpID) return res.status(400).json({ error: 'RecebimentoMP não informado!' })

            const sql = `
            SELECT
                p.produtoID AS id,
                CONCAT(p.nome, ' (', u.nome, ')') AS nome
            FROM recebimentomp AS r 
                JOIN recebimentomp_produto AS rp ON (r.recebimentoMpID = rp.recebimentoMpID)
                JOIN produto AS p ON (rp.produtoID = p.produtoID)
                JOIN unidademedida AS u ON (p.unidadeMedidaID = u.unidadeMedidaID)
            WHERE r.recebimentoMpID = ? AND p.status = 1
            ORDER BY p.nome ASC`
            const [result] = await db.promise().query(sql, [recebimentoMpID])

            return res.status(200).json(result)

        } catch (e) {
            console.log(e)
        }
    }

    async getList(req, res) {
        const { unidadeID, papelID, usuarioID } = req.params;

        if (!unidadeID || !papelID) return res.status(400).json({ error: 'Unidade não informada!' })

        const sql = `
        SELECT 
            rn.recebimentoMpNaoConformidadeID AS id, 
            IF(MONTH(rn.data) > 0, DATE_FORMAT(rn.data, "%d/%m/%Y"), '--') AS data,       
            r.recebimentoMpID,      
            IF(r.fornecedorID > 0, CONCAT(f.nome, ' (', f.cnpj, ')'), '--') AS fornecedor,
            COALESCE(GROUP_CONCAT(p.nome SEPARATOR ', '), '--') AS produtos,
            s.statusID,
            s.nome AS status,
            s.cor            
        FROM recebimentomp_naoconformidade AS rn
            JOIN recebimentomp AS r ON (r.recebimentoMpID = rn.recebimentoMpID)
            JOIN fornecedor AS f ON (r.fornecedorID = f.fornecedorID)
            JOIN status AS s ON (rn.status = s.statusID)

            LEFT JOIN recebimentomp_naoconformidade_produto AS rnp ON (rn.recebimentoMpNaoConformidadeID = rnp.recebimentoMpNaoConformidadeID)
            LEFT JOIN produto AS p ON (rnp.produtoID = p.produtoID)
        WHERE rn.unidadeID = ?
        GROUP BY rn.recebimentoMpNaoConformidadeID
        ORDER BY rn.data DESC, rn.status ASC`
        const [result] = await db.promise().query(sql, [unidadeID])
        return res.json(result);
    }

    async getData(req, res) {
        const { id, unidadeID, papelID } = req.body
        try {
            if (!unidadeID || !papelID) return res.status(400).json({ error: 'Unidade não informada!' })

            const sql = `
            SELECT 
                rn.recebimentoMpID, 
                rn.recebimentoMpNaoConformidadeID AS id, 
                rn.quemPreenche,
                rn.fornecedorAcessaRecebimento,
                rn.tipo, 
                rn.descricao, 
                rn.prazoSolucao,

                prnm.parRecebimentoMpNaoConformidadeModeloID AS modeloID,
                prnm.nome AS modelo
            FROM recebimentomp_naoconformidade AS rn
                JOIN par_recebimentomp_naoconformidade_modelo AS prnm ON (rn.parRecebimentoMpNaoConformidadeModeloID = prnm.parRecebimentoMpNaoConformidadeModeloID)
            WHERE rn.recebimentoMpNaoConformidadeID = ? AND rn.unidadeID = ?
            ORDER BY rn.data DESC, rn.status ASC`
            const [result] = await db.promise().query(sql, [id, unidadeID])

            const sqlProdutos = `
            SELECT 
                p.produtoID AS id,
                CONCAT(p.nome, ' (', u.nome, ')') AS nome
            FROM recebimentomp_naoconformidade_produto AS rnp
                JOIN produto AS p ON (rnp.produtoID = p.produtoID)
                JOIN unidademedida AS u ON (p.unidadeMedidaID = u.unidadeMedidaID)
            WHERE rnp.recebimentoMpNaoConformidadeID = ?
            ORDER BY p.nome ASC`
            const [resultProdutos] = await db.promise().query(sqlProdutos, [id])

            const header = {
                recebimentoMpID: result[0].recebimentoMpID,
                quemPreenche: result[0].quemPreenche,
                fornecedorAcessaRecebimento: result[0].fornecedorAcessaRecebimento == 1 ? true : false,
                transporte: result[0].tipo !== 2 ? true : false,
                produto: result[0].tipo !== 1 ? true : false,
                produtos: resultProdutos ?? [],
                descricao: result[0].descricao,
                prazoSolucao: result[0].prazoSolucao,
                modelo: {
                    id: result[0].modeloID,
                    nome: result[0].modelo
                },
            }

            const response = {
                header
            }
            console.log("🚀 ~ response:", response)

            return res.json(response);
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async getModelos(req, res) {
        const { unidadeID } = req.body
        try {
            if (!unidadeID) return res.status(400).json({ error: 'Unidade não informada!' })

            const sql = `
            SELECT parRecebimentoMpNaoConformidadeModeloID AS id, nome
            FROM par_recebimentomp_naoconformidade_modelo
            WHERE unidadeID = ? AND status = 1
            ORDER BY nome ASC`
            const [result] = await db.promise().query(sql, [unidadeID])
            return res.json(result);

        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async fornecedorPreenche(req, res) {
        const data = req.body
        console.log("🚀 ~ data do email:", data)

        // Dados unidade fabrica
        const sqlFabrica = `SELECT * FROM unidade WHERE unidadeID = ? `
        const [result] = await db.promise().query(sqlFabrica, [data.unidadeID])

        //Dados fornecedor
        const sqlFornecedor = `SELECT * FROM fornecedor WHERE fornecedorID = ? `
        const [resultFornecedor] = await db.promise().query(sqlFornecedor, [data.fornecedorID])

        const password = gerarSenhaCaracteresIniciais(resultFornecedor[0].cnpj, 4)

        //Dados profissional logado
        const sqlProfessional = `
        SELECT
            a.nome,
                b.formacaoCargo AS cargo
        FROM profissional AS a 
            LEFT JOIN profissional_cargo AS b ON(a.profissionalID = b.profissionalID)
        WHERE a.profissionalID = ? `
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