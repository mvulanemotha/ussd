const dotenv = require('dotenv');
const db = require('../../db/database')
const { default: axios } = require('axios');
dotenv.config();




//register a new user if the user exists in the database
// update a user that exists within our database
let registerNewUser = async (username, password) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = 'insert into customers select ?,?'

            db.query(query, [username, password], (err, result) => {

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

//login to the ussd

let login = async (username, password) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "select * from customers where username = ? and password = ?"

            db.query(query, [username, password], (err, result) => {

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


// check if user is a customer

let isCustomer = async (contact) => {

    try {

        return await new Promise((resolve, reject) => {

            //let query = 'select * from clientsnumbers where contact = ? limit 1';

            let query = 'select clNos.name as name, cust.loginattempts as attempts from clientsnumbers as clNos inner join customers as cust on clNos.contact = cust.username where clNos.contact = ? limit 1'

            db.query(query, [contact], (err, result) => {

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

// update login times 
let updateFailedLogins = async (contact) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "update customers set loginattempts = loginattempts + 1 where username = ? limit 1"

            db.query(query, [contact], (err, result) => {

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


// reset login attemots incase login attempts were made which failed

let resetLoginAttempts = async (contact) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = 'update customers set loginattempts = 0 where username = ? limit 1'

            db.query(query, [contact], (err, result) => {

                if (err) {
                    return reject(err)
                }

                return resolve(result)

            })
        })

    } catch (error) {

    }

}

// hangle sessions 

let getSessionDeatails = async (phone, session) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = " select * from sessions where phone = ?  and sessionId = ? limit 1"

            db.query(query, [phone, session], (err, result) => {

                if (err) {
                    return reject(err)
                }

                return resolve(result)

            })

        })

    } catch (error) {

    }

}

// create a new session for a new user to trace his/her activity

let addNewsession = async (phone, input, sessionId) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "insert into sessions(phone,sessionId,input) select ?,?,?"
            
            db.query(query, [phone, sessionId, input], (err, result) => {

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

// update ongoing session

let updateInputSession = async (phone, session, input) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "update sessions set input = ? where sessionId = ?  and phone = ? limit 1"

            db.query(query, [input, session, phone], (err, result) => {

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

module.exports = { addNewsession, getSessionDeatails, updateInputSession, registerNewUser, isCustomer, login, updateFailedLogins, resetLoginAttempts }