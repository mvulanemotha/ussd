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

            let query = 'select * from clientsnumbers where contact = ?';

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

                if(err){
                    return reject(err)
                }

                return resolve(result)

            })

        })

    } catch (error) {
        console.log(error)
    }

}



module.exports = { registerNewUser, isCustomer, login , updateFailedLogins  }