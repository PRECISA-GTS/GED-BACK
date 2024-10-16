require('dotenv/config');
process.env.TZ = 'America/Sao_Paulo'; // Configurar timezone
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const routes = require("./routes");

const app = express();

// Configuração do CORS
app.use(cors({ origin: '*' }));

// Middleware para analisar requisições JSON e URL-encoded
app.use(express.json());
// app.use(bodyParser.json({ limit: '20mb' })); // Aumente conforme necessário
// app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));

// Middleware para registrar requisições e tempo de execução
// app.use((req, res, next) => {
//     const start = Date.now();
//     console.log(`${req.method} ${req.url}`);

//     res.on('finish', () => {
//         const duration = Date.now() - start;
//         console.log(`Request to ${req.url} took ${duration}ms`);
//     });

//     next();
// });

// Rotas
app.use(routes);
app.use('/api/uploads', express.static('uploads'));

const port = process.env.PORT ?? 3333;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
