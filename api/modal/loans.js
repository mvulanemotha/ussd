const db = require('../../db/database')
const headersMusoni = require('./header')
const dotenv = require('dotenv');
const { default: axios } = require('axios');
dotenv.config();



//get prepay details
let prePayment = async (accountNo) => {

    try {

        return await axios({

            method: "get",
            //url: "https://api.live.irl.musoniservices.com/v1/loans/" + accountNo + "?associations=all", //process.env.url + "rescheduleloans",
            url: "https://api.live.irl.musoniservices.com/v1/loans/" + accountNo + "?associations=all",
            withCredentials: true,
            crossdomain: true,
            headers: headersMusoni.headersMusoni(),
        })
    
    } catch (error) {
        console.log(error.message)
    }

}





module.exports = { prePayment }