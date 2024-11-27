const dotenv = require('dotenv');
dotenv.config();



let headersMusoni = () => {

  //let apiKey = 'uUUnYBrEJ48mp2JoM8Jni7yIf8JDRP1N7mZvUTmO' 
  let apiKey = process.env.key //'G1ApOPzYok3CnSupBeBMfRMXEFxHVMT5DaFc5854'
  let username = process.env.User //'Status Capital API'
  let password = process.env.Password // 'Status12345'


  /* User = 'Status Capital API'
  Password = 'Status12345' */

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

module.exports = { headersMusoni }