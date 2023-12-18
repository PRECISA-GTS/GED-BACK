require('dotenv/config')
const mysql2 = require("mysql2");

const dbFile = mysql2.createConnection({
    'host': process.env.DB_HOST,
    'user': process.env.DB_USER,
    'password': process.env.DB_PASSWORD,
    'database': 'testefotos',
});

module.exports = dbFile
