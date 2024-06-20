const dotenv = require('dotenv');

dotenv.config();

const mysql = require('mysql');

const database = mysql.createPool({
    connectionLimit: 50,
    password: process.env.passwordDB,
    user: process.env.usernameDB,
    database: process.env.databaseDB,
    host: process.env.hostDB,
    port: process.env.portDB,
    timezone: 'SAST',
    dateStrings: true,
    pool: {
        acquire: 30000,
        idle: 30000
    }
});


module.exports = database;

