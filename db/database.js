const mysql = require('mysql');

const database = mysql.createPool({
    connectionLimit: 10,
    password: 'Mvulane2@@',
    user: 'SCBS',
    database: 'scbs_ussd',
    host: 'localhost',
    port: '3306',
    timezone: 'SAST',
    dateStrings: true,
    pool: {
        acquire: 30000,
        idle: 10000
    }
});


module.exports = database;

