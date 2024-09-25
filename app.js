require('dotenv/config')
process.env.TZ = 'America/Sao_Paulo'; // Configurar timezone

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

const port = process.env.PORT ?? 3333;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
