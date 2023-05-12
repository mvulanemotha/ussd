const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

let apiKey = process.env.apiKey;
let apiSecret = process.env.apiSecret;


let accountApiCredentials = apiKey + ':' + apiSecret;

let buff = new Buffer.from(accountApiCredentials);
let base64Credentials = buff.toString('base64');

let authHeader = 'Basic ' + base64Credentials;
let config = {
   headers: {
      'Authorization': authHeader,
   }
}


// function to send sms
let sendMessage = async (phoneNumber, message) => {

   try {

      return await axios.get('https://rest.smsportal.com/authentication', config)
         .then(response => {
            if (response.data) {
               Send(response.data.token, message, phoneNumber);
            }
         })
         .catch(error => {
            if (error.response) {
               //res.json({ "error": { "Message": "Authentication Failed" } })
               console.log(error.response)
            }
         });

   } catch (error) {
      console.log(error);
   }
}


let Send = (token, message, destination) => {

   let authHeader = 'Bearer ' + token;
   let config = {
      headers: {
         'Authorization': authHeader,
         'Content-Type': 'application/json'
      }
   }

   let data = JSON.stringify({
      messages: [{
         content: message,
         destination: destination
      }]
   })

   axios.post('https://rest.smsportal.com/bulkmessages', data, config)
      .then(response => {
         if (response.data) {
            console.log(response.data);
            //res.json({ "message": "sent" });
            
            clientsnumbers.updateSentsms(destination)

         }
      })
      .catch(error => {
         if (error.response) {
            // if there is an error log it out
            console.log(error.response.data);
            //res.json({ "message": "failed" });
         }
      });

}



module.exports = { sendMessage }