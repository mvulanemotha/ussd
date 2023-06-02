const dotenv = require('dotenv');
const { default: axios } = require('axios');
dotenv.config();

// requestTopay header
let apiCallsHeader = (reference_id, token) => {

    return header = {
        'X-Reference-Id': reference_id,
        'Ocp-Apim-Subscription-Key': '7834fdfd87bb45c897437753bf206060', //process.env.SubscriptionKey, //process.env.collections_secondary_key,
        'Authorization': 'Bearer ' + token,
        'X-Target-Environment': 'mtnswaziland',
        'Content-Type': 'application/json',
        'keep-alive': true
    }
}

let token = async () => {
    
    let username = 'b883f2de-746a-4d44-a8b9-7354289d1606'  //process.env.reference_id
    let password = '8f79674de1ea46dc80653eac1d0fe485'  //process.env.apiKey

    let mtnCredentials = username + ':' + password
    
    let buff = new Buffer.from(mtnCredentials)

    let base64Credentials = buff.toString('base64');

    let authHeader = 'Basic ' + base64Credentials


    let header = {

        //'X-Reference-Id': reference_id,
        'Ocp-Apim-Subscription-Key': '7834fdfd87bb45c897437753bf206060',
        'Authorization': authHeader,
        'X-Target-Environment': 'mtnswaziland',
        'keep-alive': true
    }


    return await axios({
        method: "post",
        url: 'https://proxy.momoapi.mtn.com/disbursement/token/',
        withCredentials: true,
        crossdomain: true,
        headers: header
    })
}



module.exports = { token, apiCallsHeader }