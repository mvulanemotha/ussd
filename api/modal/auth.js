const dotenv = require('dotenv');
const { default: axios } = require('axios');
const headers = require('../modal/header');

dotenv.config();



let authUser = async (username, password) => {

    try {

        return await axios({

            method: "post",
            url: process.env.url + "authentication?username=" + username + "&password=" + password,
            withCredentials: true,
            crossdomain: true,
            headers: headers.headersMusoni()

        })

    } catch (error) {
        console.log(error.message)
    }

}

module.exports = { authUser }