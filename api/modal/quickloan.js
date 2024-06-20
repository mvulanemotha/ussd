const dotenv = require('dotenv');
const db = require('../../db/database')
const { default: axios } = require('axios');
const headersMusoni = require("../modal/header")
//const accounts = require("../modal/accounts")
const dateTime = require("../modal/datetime");

dotenv.config();

//save 
let saveQuickLoan = async (mssid, sessionId, accountNo, borrowedValue) => {

    try {

        console.log(borrowedValue.toFixed(2))

        let mydate = dateTime.getTime()

        console.log(mydate)

        return await new Promise((resolve, reject) => {

            let query = "insert into lamula (mssId , sessionId , accountNo , borrowedAmount) select ?,?,?,? " // where MONTH(?) != MONTH(now()) and mssId = ?"

            db.query(query, [mssid, sessionId, accountNo, borrowedValue.toFixed(2)], (err, result) => {

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

//function to calculate how much a user sshould be borrowed money
let calculateQuickLoanAmount = (amount) => {

    try {

        //return fixed deposit accounts
        let quickloanAmount = amount * (0.80)

        quickloanAmount = quickloanAmount * (1.14)

        return quickloanAmount

    } catch (error) {
        console.log(error.message)
    }

}

// get pending  qiuck loan
let getQuickLoan = async (mssId) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "select * from lamula where mssId = ? and  MONTH(borrowedDate) = MONTH(now()) and YEAR(borrowedDate) = YEAR(now()) limit 1"

            db.query(query, [mssId], (err, result) => {

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


let createQuickLoanCharge = async (clientAccount, amount, date) => {

    try {

        var data = {
            "chargeId": 22,
            "locale": "en",
            "amount": amount,
            "dateFormat": "dd MMMM yyyy",
            "dueDate": date
        }

        return await axios({
            method: "post",
            url: process.env.url + 'savingsaccounts/' + clientAccount + '/charges',
            withCredentials: true,
            crossdomain: true,
            data: data,
            headers: headersMusoni.headersMusoni()
        })

    } catch (error) {
        console.log(error)
    }
}

let payCharge = async (accountNo, chargeid, amount, date) => {

    //list all the 

    let data = {

        "dateFormat": "dd MMMM yyyy",
        "locale": "en",
        "amount": amount,
        "dueDate": date
    }


    try {

        return await axios({

            method: "post",
            //url: process.env.url + 'savingsaccounts/'+ accountNo +'/transactions/'+chargeid,
            url: process.env.url + 'savingsaccounts/' + accountNo + '/charges/' + chargeid + '?command=paycharge',
            withCredentials: true,
            crossdomain: true,
            data: data,
            headers: headersMusoni.headersMusoni()

        }).catch((error) => {
            console.log(error)
        })

    } catch (error) {
        console.log(error)
    }

}



module.exports = { calculateQuickLoanAmount, saveQuickLoan, getQuickLoan, createQuickLoanCharge, payCharge }