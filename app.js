const express = require('express')
const app = express();
const ussd = require('./api/routes/index')
const bodyParser = require('body-parser')

//app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

//app.use(morgan('dev'))


app.use((req, res, next) => {

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "X-Requested-With,Content-type,Accept,X-Access-Token,X-Key");

    // Set response contenttype
    res.contentType('text/plain');
    
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    } else {
        next();
    }
})

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