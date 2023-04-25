const express = require('express')
const app = express();
const ussd = require('./api/routes/index')
const bodyParser = require('body-parser')
const morgan = require('morgan');

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(morgan('dev'))

app.use(express.json())

app.use('/ussd', ussd)

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