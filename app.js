const express = require('express')
const app = express();
const ussd = require('./api/routes/index')
const salaries = require('./api/routes/salaries')
const auth = require('./api/routes/auth')
const bodyParser = require('body-parser')
const morgan = require('morgan');

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(morgan('dev'))

app.use((req, res, next) => {

    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    //res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Headers', '*');


    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    } else {
        next();
    }
})

app.use(express.json())

app.use('/ussd', ussd)
app.use('/ussd/salaries', salaries)
app.use('/ussd/auth', auth)
// handling errors if none of the routes were accessed
app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

module.exports = app