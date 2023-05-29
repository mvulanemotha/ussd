const db = require('../../db/database')
const headers = require('../modal/disburstmentHeader')
const headersMusoni = require('./header')
const dotenv = require('dotenv');
const { default: axios } = require('axios');
dotenv.config();




//get balance of client

let requestToTransfer = async (uuid, token, amount, msisdn) => {

    try {

        let data = {

            "amount": amount,
            "currency": "SZL",
            "externalId": "234284587",
            "payer": {
                "partyIdType": "MSISDN",
                "partyId": msisdn
            },
            "payerMessage": "SCBS TRANSFER",
            "payeeNote": "SCBS TRANSFER"
        }
        
        return await axios({
            method: "post",
            url: 'https://proxy.momoapi.mtn.com/disbursement/v1_0/transfer', //process.env.tokenUrlCollections + 'v1_0/requesttopay',
            withCredentials: true,
            crossdomain: true,
            headers: headers.apiCallsHeader(uuid, token),
            data: data
        })


    } catch (error) {
        console.log(error)
    }

}



// make a deposit 
let makeWithdrawal = async (amount, accountNo, phoneNumber, depositDate) => {

    try {

        let url = 'https://api.live.irl.musoniservices.com/v1/'

        let data = {
            "locale": "en",
            "dateFormat": "dd MMMM yyyy",
            "transactionDate": depositDate,
            "transactionAmount": amount,
            "paymentTypeId": 177,
            "accountNumber": accountNo,
            "receiptNumber": "Tranfered To " + phoneNumber + " Momo Account",
            "bankNumber": "SCBS"
        }

        return await axios({

            method: "post",
            url: url + "savingsaccounts/" + accountNo + "/transactions?command=withdrawal",
            withCredentials: true,
            crossdomain: true,
            headers: headersMusoni.headersMusoni(),
            data: data

        })

    } catch (error) {
        console.log(error)
    }

}

// store a disbursement request

let saveDisbursmentRequest = async (token, xxid, amount, phone, accountNo) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "insert into disbursmentrequest(token , xxid , amount, phone , accountNo) select ?,?,?,?,? where not exists (select xxid from disbursmentrequest where xxid = ?) limit 1 "

            db.query(query, [token, xxid, amount, phone, accountNo, xxid], (err, result) => {

                if (err) {
                    return reject(err)
                }

                return resolve(result)

            })

        })

    } catch (error) {
        console.log(error.message)
    }

}


//get data from database to get payment status
let getTransferStatus = async () => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "select * from disbursmentrequest where status = 0 limit 1"

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
let updateTransferRequest = async (status, token, xxid) => {

    try {

        return await new Promise((resolve, reject) => {

            let query

            //succesfully
            if (status === 1) {
                query = "update disbursmentrequest set status = 1 where token = ? and xxid = ? limit 1"
            }

            //failed request
            if (status === 2) {
                query = "update disbursmentrequest set status = 2 where token = ? and xxid = ? limit 1"
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



module.exports = { makeWithdrawal, requestToTransfer, saveDisbursmentRequest, updateTransferRequest, getTransferStatus }