const http = require('http')
const app = require('./app')

const port = 8888   //8888;
const server = http.createServer(app)

server.listen(port)