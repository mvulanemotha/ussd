const dotenv = require('dotenv');
const { default: axios } = require('axios');
dotenv.config();



let headers = () => {

  let apiKey = 'uUUnYBrEJ48mp2JoM8Jni7yIf8JDRP1N7mZvUTmO' 
  let username = 'Status Capital API' 
  let password = 'Status12345'

  
  let musonCredentials = username + ':' + password

  let buff = new Buffer.from(musonCredentials)

  let base64Credentials = buff.toString('base64');

  let authHeader = 'Basic ' + base64Credentials
  
  return header = {
    'Authorization': authHeader,
    'X-Fineract-Platform-TenantId': 'StatusCapital',
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    'keep-alive': true
  }

}

module.exports = { headers }