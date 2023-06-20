const dotenv = require('dotenv');
const { default: axios } = require('axios');
dotenv.config();


//uuid x-reference-id =  reference_id


let paymentStatusHeader = (xreference_id, token) => {
    
    return header = {
        //'X-Reference-Id': xreference_id,
        'Ocp-Apim-Subscription-Key': 'b38eedce669f43808c7e5ac7e33b249e', //process.env.collections_secondary_key,
        'Authorization': 'Bearer ' + token, //authHeader,
        'X-Target-Environment' : 'mtnswaziland',
        'keep-alive': true
    }

}

// requestTopay header
let apiCallsHeader = (reference_id, token) => {
    
    return header = {
        'X-Reference-Id': reference_id,
        'Ocp-Apim-Subscription-Key': 'b38eedce669f43808c7e5ac7e33b249e', //process.env.SubscriptionKey, //process.env.collections_secondary_key,
        'Authorization': 'Bearer ' + token,
        'X-Target-Environment': 'mtnswaziland',
        'Content-Type': 'application/json',
        'keep-alive': true
    }
}

let token = async () => {

    let username = '53d3b42b-e41b-4e96-8407-e471e41cdbd3'  //process.env.reference_id
    let password = 'b7aafbeef25a4b4295be82ee26b78855'  //process.env.apiKey

    let mtnCredentials = username + ':' + password

    let buff = new Buffer.from(mtnCredentials)

    let base64Credentials = buff.toString('base64');

    let authHeader = 'Basic ' + base64Credentials


    let header = {

        //'X-Reference-Id': reference_id,
        'Ocp-Apim-Subscription-Key': 'b38eedce669f43808c7e5ac7e33b249e', //process.env.SubscriptionKey, //process.env.collections_secondary_key,
        'Authorization': authHeader,
        'X-Target-Environment': 'mtnswaziland',
        //'Content-Type': 'application/json',
        'keep-alive': true
    }


    return await axios({
        method: "post",
        url: 'https://proxy.momoapi.mtn.com/collection/token/', //process.env.tokenUrlCollections + 'token/',
        withCredentials: true,
        crossdomain: true,
        headers: header
    })
}

//create header to get token status
let checkPaymentStatusHeader = (token, reference_id) => {

    return header = {
        'X-Reference-Id': reference_id,
        'Ocp-Apim-Subscription-Key': 'b38eedce669f43808c7e5ac7e33b249e', //process.env.SubscriptionKey, //process.env.collections_secondary_key,
        'Authorization': 'Bearer ' + token,
        'X-Target-Environment': 'mtnswaziland',
        'keep-alive': true
    }

}


module.exports = { token, apiCallsHeader, paymentStatusHeader, checkPaymentStatusHeader }