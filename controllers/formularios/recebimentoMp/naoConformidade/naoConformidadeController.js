const db = require('../../../../config/db');
const { gerarSenhaCaracteresIniciais, criptoMd5, hasPending, deleteItem } = require('../../../../config/defaultConfig');
const sendMailConfig = require('../../../../config/email');
const { executeQuery, executeLog } = require('../../../../config/executeQuery');
const { getDynamicBlocks, updateDynamicBlocks, insertDynamicBlocks } = require('../../../../defaults/dynamicBlocks');
const { getDynamicHeaderFields } = require('../../../../defaults/dynamicFields');
const { formatFieldsToTable, addFormStatusMovimentation, floatToFractioned, fractionedToFloat, getDateNow, getTimeNow } = require('../../../../defaults/functions');
const { getHeaderSectors } = require('../../../../defaults/sector/getSectors');
const instructionsNewFornecedor = require('../../../../email/template/fornecedor/instructionsNewFornecedor');
const fornecedorPreenche = require('../../../../email/template/recebimentoMP/naoConformidade/fornecedorPreenche');

class NaoConformidade {
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
        const { id, modelID, recebimentoMpID, unidadeID, papelID } = req.body
        try {
            if (!unidadeID || !papelID) return res.status(400).json({ error: 'Unidade não informada!' })
            if (!id && !recebimentoMpID) return res.status(204).json({ error: 'RecebimentoMP não informado!' })

            let result = []
            let recebimentoID = recebimentoMpID //? Quando vem de um formulário NOVO
            let modeloID = modelID //? Quando vem de um formulário NOVO

            if (id && id > 0) {
                const sql = `
                SELECT 
                    rn.recebimentoMpID, 
                    rn.parRecebimentoMpNaoConformidadeModeloID AS modeloID,
                    DATE_FORMAT(rn.data, "%Y-%m-%d") AS data,
                    DATE_FORMAT(rn.data, "%H:%i") AS hora,
                    rn.recebimentoMpNaoConformidadeID AS id, 
                    rn.quemPreenche,
                    rn.fornecedorAcessaRecebimento,
                    rn.tipo, 
                    rn.descricao, 
                    rn.prazoSolucao,
                    rn.status,
                    prnm.parRecebimentoMpNaoConformidadeModeloID AS modeloID,
                    prnm.nome AS modelo,
                    s.statusID,
                    s.nome AS statusNome,
                    s.cor AS statusCor
                FROM recebimentomp_naoconformidade AS rn
                    JOIN par_recebimentomp_naoconformidade_modelo AS prnm ON (rn.parRecebimentoMpNaoConformidadeModeloID = prnm.parRecebimentoMpNaoConformidadeModeloID)
                    LEFT JOIN status AS s ON (rn.status = s.statusID)    
                WHERE rn.recebimentoMpNaoConformidadeID = ? AND rn.unidadeID = ?
                ORDER BY rn.data DESC, rn.status ASC`
                const [rows] = await db.promise().query(sql, [id, unidadeID])
                result = rows
                modeloID = rows[0].modeloID
                recebimentoID = rows[0].recebimentoMpID
            }

            const sqlModelo = `
            SELECT parRecebimentoMpNaoConformidadeModeloID AS id, nome
            FROM par_recebimentomp_naoconformidade_modelo
            WHERE parRecebimentoMpNaoConformidadeModeloID = ?`
            const [resultModelo] = await db.promise().query(sqlModelo, [modeloID])

            const sqlRecebimento = `
            SELECT 
                r.recebimentoMpID,
                DATE_FORMAT(r.data, "%d/%m/%Y") AS data,
                DATE_FORMAT(r.data, "%H:%i") AS hora,
                r.nf,
                CONCAT(f.nome, ' (', f.cnpj, ')') AS fornecedor,
                s.nome AS status,
                s.cor AS statusCor
            FROM recebimentomp AS r
                JOIN status AS s ON (r.status = s.statusID)    
                JOIN fornecedor AS f ON (r.fornecedorID = f.fornecedorID)
            WHERE r.recebimentoMpID = ?`
            const [resultRecebimento] = await db.promise().query(sqlRecebimento, [recebimentoID])

            const sqlProdutos = `
            SELECT
                rp.recebimentoMpProdutoID,
                p.produtoID AS id,
                CONCAT(p.nome, ' (', u.nome, ')') AS nome,

                (SELECT IF(COUNT(*) > 0, 1, 0)
                FROM recebimentomp_naoconformidade_produto AS rnp
                    JOIN recebimentomp_naoconformidade AS rn ON (rnp.recebimentoMpNaoConformidadeID = rn.recebimentoMpNaoConformidadeID)
                WHERE rn.recebimentoMpNaoConformidadeID = ? AND rnp.produtoID = p.produtoID
                ) AS checked_,

                rp.quantidade,
                rp.quantidadeEntrada,
                DATE_FORMAT(rp.dataFabricacao, "%d/%m/%Y") AS dataFabricacao,
                DATE_FORMAT(rp.dataValidade, "%d/%m/%Y") AS dataValidade,
                rp.lote, 
                a.apresentacaoID,
                a.nome AS apresentacao
            FROM recebimentomp_produto AS rp
                JOIN produto AS p ON (rp.produtoID = p.produtoID)
                JOIN unidademedida AS u ON (p.unidadeMedidaID = u.unidadeMedidaID)
                LEFT JOIN apresentacao AS a ON (rp.apresentacaoID = a.apresentacaoID)
            WHERE rp.recebimentoMpID = ?
            ORDER BY p.nome ASC`
            let [resultProdutos] = await db.promise().query(sqlProdutos, [id, recebimentoID])
            resultProdutos = resultProdutos.map(row => ({
                ...row,
                checked_: row.checked_ === 1 ? true : false,
                quantidade: floatToFractioned(row.quantidade),
                apresentacao: {
                    id: row.apresentacaoID,
                    nome: row.apresentacao
                }
            }));

            //? Função que retorna fields dinâmicos definidos no modelo!
            const fields = await getDynamicHeaderFields(
                id,
                modeloID,
                unidadeID,
                'par_recebimentomp_naoconformidade',
                'parRecebimentoMpNaoConformidadeID',
                'parRecebimentoMpNaoConformidadeModeloID',
                'recebimentomp_naoconformidade',
                'recebimentoMpNaoConformidadeID'
            )

            const sectors = await getHeaderSectors(
                modeloID,
                'par_recebimentomp_naoconformidade_modelo_setor',
                'parRecebimentoMpNaoConformidadeModeloID'
            )

            const today = getDateNow()
            const time = getTimeNow()

            const header = {
                recebimento: {
                    id: recebimentoID,
                    dataRecebimentoMp: resultRecebimento[0].data,
                    horaRecebimentoMp: resultRecebimento[0].hora,
                    nfRecebimentoMp: resultRecebimento[0].nf,
                    fornecedor: resultRecebimento[0].fornecedor,
                    status: {
                        label: resultRecebimento[0].status,
                        color: resultRecebimento[0].statusCor
                    }
                },

                data: result?.[0]?.data ?? today,
                hora: result?.[0]?.hora ?? time,
                quemPreenche: result?.[0]?.quemPreenche ?? 1,
                fornecedorAcessaRecebimento: result?.[0]?.fornecedorAcessaRecebimento == 1 ? true : false,
                transporte: (result?.[0]?.tipo === 1 || result?.[0]?.tipo === 3) ? true : false,
                produto: (result?.[0]?.tipo === 2 || result?.[0]?.tipo === 3) ? true : false,
                produtos: resultProdutos ?? [],
                descricao: result?.[0]?.descricao,
                prazoSolucao: result?.[0]?.prazoSolucao,
                status: result?.[0]?.status,
                modelo: {
                    id: resultModelo[0].id,
                    nome: resultModelo[0].nome
                },
                status: {
                    id: result?.[0]?.statusID ?? 10,
                    label: result?.[0]?.statusNome ?? 'Novo',
                    color: result?.[0]?.statusCor ?? 'primary'
                },
                fields,
                setoresPreenchimento: sectors.fill ?? [],
                setoresConclusao: sectors.conclude ?? []
            }

            //? Função que retorna blocos dinâmicos definidos no modelo!
            const blocos = await getDynamicBlocks(
                id,
                modeloID,
                'recebimentoMpNaoConformidadeID',
                'par_recebimentomp_naoconformidade_modelo_bloco',
                'parRecebimentoMpNaoConformidadeModeloID',
                'recebimentomp_naoconformidade_resposta',
                'par_recebimentomp_naoconformidade_modelo_bloco_item',
                'parRecebimentoMpNaoConformidadeModeloBlocoItemID',
                'parRecebimentoMpNaoConformidadeModeloBlocoID',
                'par_recebimentomp_naoconformidade_modelo_bloco_setor'
            )

            return res.json({ header, blocos });
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async updateData(req, res) {
        const { id } = req.params
        const { form, auth } = req.body
        const { header, blocos } = form
        const { usuarioID, unidadeID, papelID, profissionalID } = auth

        try {
            if (!id || id == 'undefined') return res.status(400).json({ error: 'ID do formulário não informado!' })

            const logID = await executeLog('Edição formulário de Não Conformidade do Recebimento Mp', usuarioID, unidadeID, req)

            //? Atualiza itens fixos (header)
            const sql = `
            UPDATE recebimentomp_naoconformidade SET 
                parRecebimentoMpNaoConformidadeModeloID = ?, 
                data = ?, 
                prazoSolucao = ?, 
                quemPreenche = ?, 
                fornecedorAcessaRecebimento = ?, 
                tipo = ?
            WHERE recebimentoMpNaoConformidadeID = ?`
            await executeQuery(sql, [
                header.modelo.id,
                header.data + ' ' + header.hora + ':00',
                header.prazoSolucao,
                header.quemPreenche,
                header.fornecedorAcessaRecebimento ? '1' : '0',
                header.transporte && header.produto ? '3' : header.produto && !header.transporte ? '2' : '1',
                id
            ], 'update', 'recebimentomp_naoconformidade', 'recebimentoMpNaoConformidadeID', id, logID)

            //? Atualizar o header dinâmico e setar o status        
            if (header.fields) {
                //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
                let dataHeader = await formatFieldsToTable('par_recebimentomp_naoconformidade', header.fields)
                if (Object.keys(dataHeader).length > 0) {
                    const sqlHeader = `UPDATE recebimentomp_naoconformidade SET ? WHERE recebimentoMpNaoConformidadeID = ${id} `;
                    const resultHeader = await executeQuery(sqlHeader, [dataHeader], 'update', 'recebimentomp_naoconformidade', 'recebimentoMpNaoConformidadeID', id, logID)
                    if (resultHeader.length === 0) { return res.status(500).json('Error'); }
                }
            }

            //? Atualiza produtos (header.produtos) marcados (setar em recebimentomp_naoconformidade_produto os produtos com checked_ == true)
            if (header.produtos && header.produtos.length > 0) {
                const checkedProducts = header.produtos.filter(product => product.checked_ === true)
                const checkedProductIds = checkedProducts.map(product => product.id);
                const existingProducts = await db.promise().query(
                    'SELECT produtoID AS id FROM recebimentomp_naoconformidade_produto WHERE recebimentoMpNaoConformidadeID = ?', [id]
                );
                const existingProductIds = existingProducts[0].map(row => row.id);
                const productsToDelete = existingProductIds.filter(id => !checkedProductIds.includes(id));
                const productsToInsert = checkedProducts.filter(product => !existingProductIds.includes(product.id));
                // Deletar os produtos desmarcados
                if (productsToDelete.length > 0) {
                    await executeQuery(
                        'DELETE FROM recebimentomp_naoconformidade_produto WHERE recebimentoMpNaoConformidadeID = ? AND produtoID IN (?)',
                        [id, productsToDelete, productsToDelete.join(',')],
                        'delete', 'recebimentomp_naoconformidade_produto', 'recebimentoMpNaoConformidadeID', id, logID
                    );
                }
                // Inserir os novos produtos marcados
                if (productsToInsert.length > 0) {
                    const insertValues = productsToInsert.map(product => `(${id}, ${product.id})`).join(',');
                    await executeQuery(
                        `INSERT INTO recebimentomp_naoconformidade_produto (recebimentoMpNaoConformidadeID, produtoID) VALUES ${insertValues}`, null,
                        'insert', 'recebimentomp_naoconformidade_produto', 'recebimentoMpNaoConformidadeID', null, logID
                    );
                }
            }

            //? Atualiza blocos do modelo 
            await updateDynamicBlocks(
                id,
                blocos,
                'recebimentomp_naoconformidade_resposta',
                'recebimentoMpNaoConformidadeID',
                'parRecebimentoMpNaoConformidadeModeloBlocoID',
                'recebimentoMpNaoConformidadeRespostaID',
                logID
            )

            //? Gera histórico de alteração de status 
            const newStatus = header.status.id < 30 ? 30 : header.status.id
            const movimentation = await addFormStatusMovimentation(3, id, usuarioID, unidadeID, papelID, newStatus, null)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

            return res.status(201).json({ message: "Formulário atualizado com sucesso!" })

        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async insertData(req, res) {
        const { form, auth } = req.body
        const { header, blocos } = form
        const { usuarioID, unidadeID, papelID, profissionalID } = auth

        try {
            const logID = await executeLog('Criação formulário de Não Conformidade do Recebimento Mp', usuarioID, unidadeID, req)

            //? Insere itens fixos (header)
            const sql = `
            INSERT INTO recebimentomp_naoconformidade (
                parRecebimentoMpNaoConformidadeModeloID,
                recebimentoMpID,
                data,
                profissionalIDPreenchimento,
                prazoSolucao,
                quemPreenche,
                fornecedorAcessaRecebimento,
                tipo,
                usuarioID,
                status,
                unidadeID
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            const id = await executeQuery(sql, [
                header.modelo.id,
                header.recebimento.id,
                header.data + ' ' + header.hora + ':00',
                profissionalID,
                header.prazoSolucao,
                header.quemPreenche,
                header.fornecedorAcessaRecebimento ? '1' : '0',
                header.transporte && header.produto ? '3' : header.produto && !header.transporte ? '2' : '1',
                usuarioID,
                30,
                unidadeID
            ], 'insert', 'recebimentomp_naoconformidade', 'recebimentoMpNaoConformidadeID', header.recebimento.id, logID)
            if (!id) return res.status(400).json({ message: 'Erro ao inserir formulário!' })

            //? Atualizar o header dinâmico e setar o status        
            if (header.fields) {
                //* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
                let dataHeader = await formatFieldsToTable('par_recebimentomp_naoconformidade', header.fields)
                if (Object.keys(dataHeader).length > 0) {
                    const sqlHeader = `UPDATE recebimentomp_naoconformidade SET ? WHERE recebimentoMpNaoConformidadeID = ${id} `;
                    const resultHeader = await executeQuery(sqlHeader, [dataHeader], 'update', 'recebimentomp_naoconformidade', 'recebimentoMpNaoConformidadeID', id, logID)
                    if (resultHeader.length === 0) { return res.status(500).json('Error'); }
                }
            }

            //? Insere produtos (header.produtos) marcados (setar em recebimentomp_naoconformidade_produto os produtos com checked_ == true)
            if (header.produtos && header.produtos.length > 0) {
                const checkedProducts = header.produtos.filter(product => product.checked_ === true)
                const insertValues = checkedProducts.map(product => `(${id}, ${product.id})`).join(',');
                await db.promise().query(`INSERT INTO recebimentomp_naoconformidade_produto (recebimentoMpNaoConformidadeID, produtoID) VALUES ${insertValues}`);
            }

            //? Insere blocos do modelo 
            await insertDynamicBlocks(
                blocos,
                'parRecebimentoMpNaoConformidadeModeloBlocoID',
                'recebimentomp_naoconformidade_resposta',
                'recebimentoMpNaoConformidadeID',
                'recebimentoMpNaoConformidadeRespostaID',
                id,
                logID
            )

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(3, id, usuarioID, unidadeID, papelID, 30, null)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

            return res.status(200).json({ id })

        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async conclude(req, res) {
        const { id, recebimentoMpID, usuarioID, papelID, unidadeID, profissionalID } = req.body.params
        const form = req.body.form

        try {
            if (!id || !recebimentoMpID) {
                return res.status(400).json({ error: 'Formulário não informado!' })
            }

            const logID = await executeLog('Conclusão formulário de Não Conformidade do Recebimento Mp', usuarioID, unidadeID, req)
            const sql = `
            UPDATE recebimentomp_naoconformidade 
            SET status = ?, profissionalIDConclusao = ?, dataConclusao = ?, conclusao = ?
            WHERE recebimentoMpNaoConformidadeID = ?`
            await executeQuery(sql, [
                form.status,
                profissionalID,
                new Date(),
                form.obsConclusao ?? '',
                id
            ], 'update', 'recebimentomp_naoconformidade', 'recebimentoMpNaoConformidadeID', id, logID)

            //? Atualiza a nova quantidade de produtos do recebimento de MP 
            if (form.products && form.products.length > 0) {
                for (const product of form.products) {
                    if (product && product.novaQuantidade && product.recebimentoMpProdutoID) {
                        const sql = `
                        UPDATE recebimentomp_produto 
                        SET quantidadeEntrada = ? 
                        WHERE recebimentoMpProdutoID = ?`;
                        await executeQuery(sql, [
                            fractionedToFloat(product.novaQuantidade),
                            product.recebimentoMpProdutoID
                        ], 'update', 'recebimentomp_produto', 'recebimentoMpProdutoID', product.recebimentoMpProdutoID, logID);
                    }
                }
            }

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(3, id, usuarioID, unidadeID, papelID, form.status, form.obsConclusao)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }

            return res.status(201).json({ message: "Formulário concluído com sucesso!" })
        } catch (error) {
            console.log("🚀 ~ error:", error)
        }
    }

    async reOpen(req, res) {
        const { id } = req.params
        const { status, observacao } = req.body
        const { usuarioID, papelID, unidadeID } = req.body.auth

        const logID = await executeLog('Edição do status do formulário de Não Conformidade do recebimento de MP', usuarioID, unidadeID, req)

        //? É uma fábrica, e formulário já foi concluído
        if (status && papelID == 1) {
            const sqlUpdateStatus = `
            UPDATE recebimentomp_naoconformidade
            SET status = ?, profissionalIDConclusao = ?, dataConclusao = ?, conclusao = ?
            WHERE recebimentoMpNaoConformidadeID = ?`
            const resultUpdateStatus = await executeQuery(sqlUpdateStatus, [
                status,
                null,
                null,
                null,
                id
            ], 'update', 'recebimentomp_naoconformidade', 'recebimentoMpNaoConformidadeID', id, logID)

            //? Gera histórico de alteração de status
            const movimentation = await addFormStatusMovimentation(3, id, usuarioID, unidadeID, papelID, status, observacao)
            if (!movimentation) { return res.status(201).json({ message: "Erro ao atualizar status do formulário! " }) }
        }

        res.status(200).json({ message: 'Ok' })
    }

    async getModels(req, res) {
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

    async getRecebimentoMPNC(req, res) {
        const { unidadeID } = req.body

        try {
            const sql = `
            SELECT 
                r.recebimentoMpID AS id, 
                CONCAT(r.recebimentoMpID, ' - ', DATE_FORMAT(r.data, '%d/%m/%Y %H:%i'), ' - ', f.nome, ' (', f.cnpj, ')', ' - ', COALESCE(r.nf, '(sem NF)')) AS nome
            FROM recebimentomp AS r
                JOIN fornecedor AS f ON (f.fornecedorID = r.fornecedorID)                
            WHERE r.unidadeID = ? AND r.naoConformidade = 1
            ORDER BY r.data DESC`
            const [result] = await db.promise().query(sql, [unidadeID])

            return res.json(result)
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

    async deleteData(req, res) {
        const { id, usuarioID, unidadeID } = req.params
        const objDelete = {
            table: ['recebimentomp_naoconformidade_produto', 'recebimentomp_naoconformidade_resposta', 'recebimentomp_naoconformidade'],
            column: 'recebimentoMpNaoConformidadeID'
        }

        const arrPending = []

        if (!arrPending || arrPending.length === 0) {
            const logID = await executeLog('Exclusão formulário de Não Conformidade do recebimento Mp', usuarioID, unidadeID, req)
            return deleteItem(id, objDelete.table, objDelete.column, logID, res)
        }

        hasPending(id, arrPending)
            .then(async (hasPending) => {
                if (hasPending) {
                    res.status(409).json({ message: "Dado possui pendência." });
                } else {
                    const logID = await executeLog('Exclusão formulário de Não Conformidade do recebimento Mp', usuarioID, unidadeID, req)
                    return deleteItem(id, objDelete.table, objDelete.column, logID, res)
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json(err);
            });
    }
}

module.exports = NaoConformidade