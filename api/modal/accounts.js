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
        headers: headers.headers()
    })
}


//get client accounts where 
let getClientAccount = async (username) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "select account from customers where username = ? limit 1"

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
            headers: headers.headers()
        })

    } catch (error) {
        console.log(error)
    }

}


module.exports = { clientsProducts, getClientAccount , accountDetails }