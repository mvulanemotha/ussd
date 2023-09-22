const db = require('../../db/database')
const headers = require('./headerCollections')
const headersMusoni = require('./header')
const dotenv = require('dotenv');
const { default: axios } = require('axios');
dotenv.config();




//get balance of client

let requestToPay = async (uuid, payToken, amount, msisdn) => {

    try {

        let data = {

            "amount": amount,
            "currency": "SZL",
            "externalId": msisdn,
            "payer": {
                "partyIdType": "MSISDN",
                "partyId": msisdn
            },
            "payerMessage": "Transfer funds to scbs",
            "payeeNote": "Transfer Funds"
        }

        return await axios({
            method: "post",
            url: 'https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay', //process.env.tokenUrlCollections + 'v1_0/requesttopay',
            withCredentials: true,
            crossdomain: true,
            headers: headers.apiCallsHeader(uuid, payToken),
            data: data
        })


    } catch (error) {
        console.log(error)
    }

}

// check user MOMO status
let momoStatus = async (token, number) => {

    try {
   
        //collection header

        let header = {
            'Ocp-Apim-Subscription-Key': 'b38eedce669f43808c7e5ac7e33b249e', //process.env.SubscriptionKey, //process.env.collections_secondary_key,
            'Authorization': 'Bearer ' + token,
            'X-Target-Environment': 'mtnswaziland',
            'Content-Type': 'application/json',
            'keep-alive': true
        }
        
        return await axios({
            method: "get",
            url: "https://proxy.momoapi.mtn.com/collection/v1_0/accountholder/msisdn/" + number + "/active", //'https://proxy.momoapi.mtn.com/collection/v1_0/accountholder/msisdn/' + number + '/active',
            withCredentials: true,
            crossdomain: true,
            headers: header

        })

    } catch (error) {
        console.log(error)
    }

}

// request to pay transaction status
let paymentStatus = async (xreference, token) => {

    try {

        return await axios({

            method: "get",
            url: 'https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay/' + xreference,
            withCredentials: true,
            crossdomain: true,
            headers: headers.paymentStatusHeader(xreference, token)
        })


    } catch (error) {
        console.log(error)
    }

}

// check account balance
let checkBalance = async (xreference_id, token) => {

    try {

        return await axios({

            method: "get",
            url: process.env.tokenUrlCollections + 'v1_0/account/balance',
            withCredentials: true,
            crossdomain: true,
            headers: headers.apiCallsHeader(xreference_id, token)

        })

    } catch (error) {
        console.log(error)
    }

}


// save made payment request in database
let saveRequestTransaction = async (token, xxid, amount, phone, accountNo) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "insert into collectionrequest(token , xxid , amount, phone , accountNo) select ?,?,?,?,? where not exists (select xxid from collectionrequest where xxid = ?) limit 1 "

            db.query(query, [token, xxid, amount, phone, accountNo, xxid], (err, result) => {

                if (err) {
                    return reject(err)
                }
                
                return resolve(result)

            })
        })

    } catch (error) {
        console.log(error)
    }

}


//get data from database to get payment status
let getPaymentStatus = async () => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "select * from collectionrequest where status = 0 limit 1"

            db.query(query, [], (err, result) => {

                if (err) {
                    return reject(err)
                }

                return resolve(result)

            })
        })

    } catch (error) {
        console.log(error)
    }

}

// update database to a failed response
let updatepaymentRequest = async (status, token, xxid) => {

    try {

        return await new Promise((resolve, reject) => {

            let query

            //succesfully
            if (status === 1) {
                query = "update collectionrequest set status = 1 where token = ? and xxid = ? limit 1"
            }

            //failed request
            if (status === 2) {
                query = "update collectionrequest set status = 2 where token = ? and xxid = ? limit 1"
            }

            db.query(query, [token, xxid], (err, result) => {

                if (err) {
                    return reject(err)
                }

                return resolve(result)

            })

        })

    } catch (error) {
        console.log(error)
    }

}

// make a deposit 
let makeDeposit = async (amount, accountNo, phoneNumber, depositDate) => {

    try {

        //let url = 'https://api.live.irl.musoniservices.com/v1/' //'https://api.demo.irl.musoniservices.com/v1/'

        let data = {
            "locale": "en",
            "dateFormat": "dd MMMM yyyy",
            "transactionDate": depositDate,
            "transactionAmount": amount,
            "paymentTypeId": 177,
            "accountNumber": accountNo,
            "receiptNumber": "From " + phoneNumber + " Momo Account",
            "bankNumber": "scbs"
        }

        return await axios({

            method: "post",
            url: process.env.url + "savingsaccounts/" + accountNo + "/transactions?command=deposit",
            withCredentials: true,
            crossdomain: true,
            headers: headersMusoni.headersMusoni(),
            data: data

        })

    } catch (error) {
        console.log(error)
    }

}


module.exports = { momoStatus, makeDeposit, requestToPay, paymentStatus, checkBalance, saveRequestTransaction, getPaymentStatus, updatepaymentRequest }