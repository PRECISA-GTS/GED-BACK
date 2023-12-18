const db = require('../config/db');
const { executeQuery } = require('../config/executeQuery');
require('dotenv/config')
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');


const addFormStatusMovimentation = async (parFormularioID, id, usuarioID, unidadeID, papelID, statusAnterior, statusAtual, observacao) => {

    if (parFormularioID && id && usuarioID && unidadeID && papelID && statusAnterior && statusAtual) {
        const sql = `
        INSERT INTO 
        movimentacaoformulario (parFormularioID, id, usuarioID, unidadeID, papelID, dataHora, statusAnterior, statusAtual, observacao) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        const [result] = await db.promise().query(sql, [
            parFormularioID,
            id,
            usuarioID,
            unidadeID,
            papelID,
            new Date(),
            statusAnterior,
            statusAtual,
            observacao ?? ''
        ])

        if (result.length === 0) { return false; }

        return true;
    }

    return false;
}

//* Função verifica na tabela de parametrizações do formulário e ve se objeto se referencia ao campo tabela, se sim, insere "ID" no final da coluna a ser atualizada no BD
const formatFieldsToTable = async (table, fields) => {
    let dataHeader = {}
    //? Usar Promise.all para aguardar a conclusão de todas as consultas
    await Promise.all(fields.map(async (field) => {
        const sql = `SELECT nomeColuna FROM ${table} WHERE tabela = "${field.tabela}" `;
        const [result] = await db.promise().query(sql);
        if (result.length > 0) {
            dataHeader[field.nomeColuna] = field[field.tabela]?.id > 0 ? field[field.tabela].id : 0;
        } else {
            dataHeader[field.nomeColuna] = field[field.nomeColuna] ? field[field.nomeColuna] : null
        }
    }));
    return dataHeader;
}


//* Função que atualiza ou adiciona permissões ao usuário
const accessPermissions = (data, logID) => {
    const boolToNumber = (bool) => { return bool ? 1 : 0 }

    data.menu && data.menu.length > 0 && data.menu.map(async (menuGroup) => {
        menuGroup.menu && menuGroup.menu.length > 0 && menuGroup.menu.map(async (menu, indexMenu) => {
            //? Editou menu
            if (menu.edit) {
                //? Verifica se já existe essa unidade com esse papel para esse usuário
                const verifyMenu = `
                SELECT permissaoID
                FROM permissao
                WHERE rota = ? AND unidadeID = ? AND usuarioID = ? AND papelID = ?`
                const [resultVerifyMenu] = await db.promise().query(verifyMenu, [menu.rota, data.fields.unidadeID, data.fields.usuarioID, 1])
                if (resultVerifyMenu.length > 0) { //? Ok, pode atualizar o menu
                    const sqlMenu = `
                    UPDATE permissao
                    SET ler = ?, inserir = ?, editar = ?, excluir = ?
                    WHERE rota = ? AND unidadeID = ? AND usuarioID = ? AND papelID = ?`

                    await executeQuery(sqlMenu, [boolToNumber(menu.ler),
                    boolToNumber(menu.inserir),
                    boolToNumber(menu.editar),
                    boolToNumber(menu.excluir),
                    menu.rota,
                    data.fields.unidadeID,
                    data.fields.usuarioID,
                        1], 'update', 'permissao', 'usuarioID', data.fields.usuarioID, logID)

                } else { //? Não existe, então insere
                    const sqlMenu = `
                    INSERT INTO permissao (rota, unidadeID, usuarioID, papelID, ler, inserir, editar, excluir)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

                    await executeQuery(sqlMenu, [menu.rota,
                    data.fields.unidadeID,
                    data.fields.usuarioID,
                        1,
                    boolToNumber(menu.ler),
                    boolToNumber(menu.inserir),
                    boolToNumber(menu.editar),
                    boolToNumber(menu.excluir)], 'insert', 'permissao', 'permissaoID', null, logID)
                }
            }

            // //? Submenus 
            menu.submenu && menu.submenu.length > 0 && menu.submenu.map(async (submenu, indexSubmenu) => {
                // if (submenu.edit) { //? Editou submenu 
                //? Verifica se já existe essa unidade com esse papel para esse usuário
                const verifySubmenu = `
                    SELECT permissaoID
                    FROM permissao
                    WHERE rota = ? AND unidadeID = ? AND usuarioID = ? AND papelID = ?`
                const [resultVerifySubmenu] = await db.promise().query(verifySubmenu, [submenu.rota, data.fields.unidadeID, data.fields.usuarioID, 1])

                if (resultVerifySubmenu.length > 0) { //? Ok, pode atualizar o submenu
                    const sqlSubmenu = `
                        UPDATE permissao
                        SET ler = ?, inserir = ?, editar = ?, excluir = ?
                        WHERE rota = ? AND unidadeID = ? AND usuarioID = ? AND papelID = ?`

                    await executeQuery(sqlSubmenu, [
                        boolToNumber(submenu.ler),
                        boolToNumber(submenu.inserir),
                        boolToNumber(submenu.editar),
                        boolToNumber(submenu.excluir),
                        submenu.rota,
                        data.fields.unidadeID,
                        data.fields.usuarioID,
                        1,], 'update', 'permissao', 'usuarioID', data.fields.usuarioID, logID)

                } else { //? Não existe, então insere
                    const sqlSubmenu = `
                        INSERT INTO permissao (rota, unidadeID, usuarioID, papelID, ler, inserir, editar, excluir)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

                    await executeQuery(sqlSubmenu, [submenu.rota,
                    data.fields.unidadeID,
                    data.fields.usuarioID,
                        1,
                    boolToNumber(submenu.ler),
                    boolToNumber(submenu.inserir),
                    boolToNumber(submenu.editar),
                    boolToNumber(submenu.excluir)], 'insert', 'permissao', 'permissaoID', null, logID)
                }
                // }
            })
        })
    })
}

const hasUnidadeID = async (table) => {
    const sql = `
    SELECT *
    FROM information_schema.columns
    WHERE table_schema = "${process.env.DB_DATABASE}" AND table_name = "${table}" AND column_name = "unidadeID" `
    const [result] = await db.promise().query(sql)

    return result.length === 0 ? false : true;
}

const createDocument = async (email, path) => {
    const apiToken = process.env.AUTENTIQUE_TOKEN
    const url = 'https://api.autentique.com.br/v2/graphql';
    const query = `
  mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
    createDocument( sandbox: true, document: $document, signers: $signers, file: $file) {
      id
      name
      signatures {
        public_id
        name
        email
        created_at
        action { name }
        link { short_link }
        user { name}
      }
    }
  }
`;

    const variables = {
        document: {
            name: "Contrato de marketing",
        },
        signers: [
            {
                email: email,
                action: "SIGN",
                positions: [{ "x": "100.0", "y": "100.0", "z": 1, "element": "SIGNATURE" }]
            },

        ],
        file: fs.createReadStream(path),
    };

    const formData = new FormData();
    formData.append('operations', JSON.stringify({ query, variables }));
    formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
    formData.append('0', fs.createReadStream(path));

    const config = {
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            ...formData.getHeaders(),
        },
    };


    // Realizando a requisição POST
    try {
        const response = await axios.post(url, formData, config)
        const id = response.data.data.createDocument.id

        return id
    } catch (error) {
        console.error('Erro na requisição: ', error);
    }
}

const getDocumentSignature = async (idReport) => {
    const apiToken = process.env.AUTENTIQUE_TOKEN
    const url = 'https://api.autentique.com.br/v2/graphql';
    try {
        const query = `query { document(id: "${idReport}") { files { signed } } }`;
        const config = {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
        };

        // Realizing the POST request
        const response = await axios.post(url, { query }, config);

        return response.data.data.document.files.signed
    } catch (error) {
        console.error('Error in the request:', error);
    }
};

const signedReport = async (pathReport) => {
    try {
        const response = await axios.head(pathReport)
        return true
    } catch (err) {
        console.log({ message: 'documento não assinado' })
        return false
    }

}


module.exports = { addFormStatusMovimentation, formatFieldsToTable, hasUnidadeID, accessPermissions, createDocument, getDocumentSignature, signedReport };