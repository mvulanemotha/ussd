const dotenv = require('dotenv');
const db = require('../../db/database')
const { default: axios } = require('axios');
const headers = require("../modal/header")
dotenv.config();



// get client products 

let clientsProducts = async (accountNo) => {


    return await axios({

        method: "get",
        url: process.env.url + "clients/" + accountNo + "/accounts",
        withCredentials: true,
        crossdomain: true,
        headers: headers.headersMusoni()
    })
}

// check savings account details
let getAccountSavingsAccountBalance = async (accountNo) => {
    
    try {
        
        return await axios({
            
            method: "get",
            url: process.env.url + "savingsaccounts/" + accountNo,
            withCredentials: true,
            crossdomain: true,
            headers: headers.headersMusoni()
        
        })
    
    } catch (error) {
        console.log(error.message)
    }

}


//get client accounts where 
let getClientAccount = async (username) => {
    
    try {

        return await new Promise((resolve, reject) => {

            let query = "select * from customers where username = ? limit 1"

            db.query(query, [username], (err, result) => {

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


// GET FULLY ACCOUNT DETAILS
let accountDetails = async (accountNo) => {

    try {


        return await axios({

            method: "get",
            url: process.env.url + "savingsaccounts/" + accountNo,
            withCredentials: true,
            crossdomain: true,
            headers: headers.headersMusoni()
        })

    } catch (error) {
        console.log(error)
    }

}

//store selected account from multiple accounts

let storeSelectedAccount = async (sessionId, accountNo, input, row, isloan = 0) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "insert into selectedAccounts (sessionId , accountNo , input , selectedRow , isLoan) select ?,?,?,?,? "
                + " where not exists ( select sessionId , accountNo , input , selectedRow from selectedAccounts "
                + " where sessionId = ? and accountNo = ? and input = ? and selectedRow = ?)"

            db.query(query, [sessionId, accountNo, input, row, isloan, sessionId, accountNo, input, row], (err, result) => {

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

// retrive selected account
let getSelectedAccount = async (input, sessionId, row) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "select * from selectedAccounts where sessionId = ? and input = ? and selectedRow = ?"

            db.query(query, [sessionId, input, row], (err, result) => {

                if (err) {
                    return reject(err)
                }

                return resolve(result)

            })

        })

    } catch (error) {
        console.log()
    }

}


module.exports = { getSelectedAccount, storeSelectedAccount, clientsProducts, getClientAccount, accountDetails, getAccountSavingsAccountBalance }