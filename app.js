require('dotenv/config')
const express = require('express');
const cors = require('cors');
const app = express();
const routes = require("./routes");
const routerReports = require("./reports");

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(routes);
app.use(routerReports);
app.use('/api/uploads', express.static('uploads'));

const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const apiToken = process.env.AUTENTIQUE_TOKEN
const url = 'https://api.autentique.com.br/v2/graphql';


// Resgatar documento assinado
// const query = ` query { document(id: "54ff5008df91eb31a22fb6d376edde02e356b81da2be1a8dc") { files { signed } } }`;
// const config = { headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' }, };
// // Realizando a requisição POST
// axios.post(url, { query }, config).then((response) => { console.log(response.data.data.document.files.signed); }).catch((error) => { console.error('Erro na requisição: ', error); });


// Assinar documento
// const query = `mutation { signDocument(id: "3d05cee498e60899378c7c540cea13e3d595a0e37193d3705")}`;
// const config = { headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' }, };
// // Realizando a requisição POST
// axios.post(url, { query }, config).then((response) => { console.log(response.data); }).catch((error) => { console.error('Erro na requisição: ', error); });

// Criar documento
// const query = `
//   mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
//     createDocument( sandbox: true, document: $document, signers: $signers, file: $file) {
//       id
//       name
//       signatures {
//         public_id
//         name
//         email
//         created_at
//         action { name }
//         link { short_link }
//         user { name}
//       }
//     }
//   }
// `;

// // Substitua 'caminho_para_seu_arquivo.pdf' pelo caminho real do arquivo que você deseja enviar
// const filePath = 'teste.pdf'

// const variables = {
//     document: {
//         name: "Contrato de marketing",
//     },
//     signers: [
//         {
//             // email: "ropioo@gmail.com",
//             email: "jonatankalmeidakk28@gmail.com",
//             // email: "roberto.delavy@gmail.com",

//             action: "SIGN",
//             positions: [{ "x": "100.0", "y": "100.0", "z": 1, "element": "SIGNATURE" }]
//         },

//     ],
//     file: fs.createReadStream(filePath),
// };

// const formData = new FormData();
// formData.append('operations', JSON.stringify({ query, variables }));
// formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
// formData.append('0', fs.createReadStream(filePath));

// const config = {
//     headers: {
//         'Authorization': `Bearer ${apiToken}`,
//         ...formData.getHeaders(),
//     },
// };

// // Realizando a requisição POST
// axios.post(url, formData, config)
//     .then((response) => {
//         console.log(response.data);
//         // console.log(response.data.data.);

//     })
//     .catch((error) => {
//         console.error('Erro na requisição: ', error);

//     });


const port = process.env.PORT ?? 3333;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
