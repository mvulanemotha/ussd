const dotenv = require('dotenv');
const db = require('../../db/database')
const { default: axios } = require('axios');
const headersMusoni = require("../modal/header")
const time = require("../modal/datetime")
const sms = require("../modal/sms")

dotenv.config();

//save pending salaries

const saveSalaries = async (data, processingTime) => {

    try {

        let saved = 0

        for (let el of data) {

            await new Promise((resolve, reject) => {

                let query = `insert into salaries (Name , AccountNo , ChargeAmount , amount , processingTime , Contact)
                 select ? , ? , ? , ? ,? , ? where not exists 
                 (select AccountNo from salaries where AccountNo = ? and Month(created_at) = MONTH(CURDATE()) );`;

                db.query(query, [el["Name"], el["Account Number"], el["Charge"], el["Amount"], processingTime, el["Contact"], el["Account Number"]], (err, result) => {

                    if (err) {
                        return reject(err)
                    }

                    if (result.affectedRows === 1) {
                        saved++;
                    }

                    return resolve(result)

                })
            })
        }

        return saved

    } catch (error) {
        console.log(error.message)
    }
}

// updatePayedSalaries
let updateSalaries = async (accountNo) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = `update salaries set status = 1 where AccountNo = ? limit 1`

            db.query(query, [accountNo], (err, result) => {

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


let salaryCharge = async (clientAccount, amount, chargeId) => {

    try {

        let newDate = time.getTime().slice(0, 10);

        var data = {
            "chargeId": chargeId,
            "locale": "en",
            "amount": amount,
            "dateFormat": "dd MMMM yyyy",
            "dueDate": time.myDate(newDate)
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

//make a deposite
let deposit = async (accountNo, date, amount) => {

    try {

        let data = {

            "locale": "en",
            "dateFormat": "dd MMMM yyyy",
            "transactionDate": date,
            "transactionAmount": amount,
            "paymentTypeId": 177,
            "accountNumber": accountNo,
            "receiptNumber": "Salary",

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


let payCharge = async (accountNo, chargeid, amount, date) => {
    //list all the

    let data = {
        dateFormat: "dd MMMM yyyy",
        locale: "en",
        amount: amount,
        dueDate: date,
    };

    try {
        return await axios({
            method: "post",
            //url: process.env.url + 'savingsaccounts/'+ accountNo +'/transactions/'+chargeid,
            url: process.env.url + "savingsaccounts/" + accountNo + "/charges/" + chargeid + "?command=paycharge",
            withCredentials: true,
            crossdomain: true,
            data: data,
            headers: headersMusoni.headersMusoni(),
        }).catch((error) => {
            console.log(error);
        });

    } catch (error) {
        console.log(error);
    }
};

//return Pending Payments
let pendingPayments = async () => {

    try {

        return await new Promise((resolve, reject) => {

            let query = `SELECT * FROM scbs_ussd.salaries where Status = 0`;

            db.query(query, (err, result) => {
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


let newDate = time.getTime().slice(0, 10);

setInterval(async () => {

    //time.myDate(newDate)
    try {
        await selectPending().then(async data => {

            if (data.length > 0) {

                await deposit(data[0].AccountNo, time.myDate(newDate), data[0].amount).then(async dt => {

                    if (dt.status === 200) {

                        //update database to turn status to 1
                        await updateSalaries(data[0].AccountNo).then(async update => {

                            await salaryCharge(data[0].AccountNo, data[0].ChargeAmount, 21).then(async (trans) => {

                                //console.log(trans)
                                if (trans.status === 200) {

                                    await payCharge(data[0].AccountNo, trans.data.resourceId, data[0].ChargeAmount, time.myDate(newDate)).then(payChargeRes => {

                                        console.log("Account Processed Succesfully")

                                    })

                                    // send an sms
                                    let message = `Your account xxxxx${data[0].AccountNo} has been credited with SZL ${data[0].amount}`
                                    await sms.sendMessage(data[0].Contact, message)

                                    //create sms charge
                                    await salaryCharge(data[0].AccountNo, 0.95, 13).then(async smsCharge => {

                                        //console.log(smsCharge.data.resourceId)
                                        await payCharge(data[0].AccountNo, smsCharge.data.resourceId, 0.95, time.myDate(newDate))

                                    })

                                    //paysms charge

                                }

                            })

                        })

                    }
                })
            } else {
                //console.log("All Payments Made")
            }
        })
    } catch (err) {
        console.log(err.message)
    }

}, 8000);


let selectPending = async () => {

    try {

        let timeDB = time.getTime()

        return await new Promise((resolve, reject) => {

            let query = `select AccountNo , ChargeAmount , amount , Contact from salaries where Status = 0 and Hour(?) = Hour(processingTime)
            and Month(?) = Month(processingTime) and Year(?) = Year(processingTime) and Day(?) = Day(processingTime) limit 1`

            db.query(query, [timeDB, timeDB, timeDB, timeDB], (err, result) => {

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

//delete a pending payment 
let deletePendingPayment = async (No) => {

    try {

        return await new Promise((resolve, reject) => {

            let query = "delete from salaries where No = ? limit 1"

            db.query(query, [No], (err, result) => {

                if (err) {
                    return reject(err)
                }

                return resolve(result)

            })

        })

    } catch (err) {
        console.log(err.message)
    }


}



module.exports = { deletePendingPayment, saveSalaries, salaryCharge, updateSalaries, deposit, pendingPayments }