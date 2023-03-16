const express = require('express')
const customer = require('../modal/customers')
const router = express.Router()
const account = require('../modal/accounts')
const ussdR = require('ussd-router')


//REGISTER IF NOT REGISTRED
router.post('/', (req, res) => {

    // console.log(req.body)

    try {

        let { phoneNumber, serviceCode, text, sessionId } = req.body

        console.log(phoneNumber)

        console.log(text)
        text = ussdR.ussdRouter(text)

        let contact = phoneNumber.slice(4)

        let response;

        console.log(text)

        //when a customer visits for the same time 

        if (text === '') {
            //check if user is registered
            customer.isCustomer(contact).then((data) => {

                // checking if we have any records in the database
                // if > 0 is a customer

                let customer_name;

                data.forEach(el => {
                    customer_name = el["name"]
                });

                if (data.length > 0) {

                    response = `CON SCBS:)<br> Welcome <b>${customer_name}</b> <br>Enter your pin:`
                    // customer should login
                    res.send(response)
                } else {
                    response = "END Welcome to SCBS visit our site scbs.co.sz to view our products."
                    res.send(response)
                }
            })


        } else if ((text !== '') && (text.indexOf('*') === -1)) {

            //auth logged in user

            customer.login(contact, text).then(data => {

                if (data.length > 0) {

                    response = `CON Menu:
                               1. My Products
                               2. Momo Mtn
                               00. Exit
                               `
                    res.send(response)
                    res.end()

                } else {


                    //update status of being locked
                    customer.updateFailedLogins(contact)

                    response = `END SCBS:) Failed to login, After 3 attempts your account will be locked.`
                    res.send(response)
                }
            })


        } else if (text === '1*0') { //Have viewed my products now i want to view see my menu again

            response = `CON Menu:
                               1. My Products
                               2. Momo Mtn
                               00. Exit
                               `
            res.send(response)




        } else if ((text.indexOf('*2') !== -1) && (text.indexOf('*2*1') === -1) && (text.indexOf('*2*2') === -1)) { // viewing mtn momo

            response = `CON 
                        1. Get money from Savings
                        2. Save money to Savings
                        00. Back
                        0. Exit
            `
            res.send(response)

        } else if (text.indexOf('2*1') !== -1) { // get money from savings account to mobile money


            var activeAccounts;

            account.getClientAccount(contact).then(data => {

                let clientNumber;

                data.forEach(el => {
                    clientNumber = el["account"]
                })

                // call function to get account numbers

                account.clientsProducts(clientNumber).then(resAccounts => {

                    activeAccounts = resAccounts.data.savingsAccounts.filter((acc) => {

                        if ((acc.status.value === 'Active') && (!(acc.productName === 'Perm Suspense Account')) && (!(acc.productName === 'FP Saving Account'))) {
                            return true
                        }
                        return false
                    })

                    // display accounts to the customer

                    response = `CON Select Acc No: <br> <span style ="font-size: 13px;">`;

                    let count = 0
                    activeAccounts.forEach(el => {
                        count = count + 1
                        //response += count + '. ' + el["productName"] + `<br>`
                        response += `` + count + `.  ` + el["accountNo"] + `<b> E ` + el["accountBalance"] + `</b> ` + `<br>`
                        //response += `Acc:` + el["accountNo"].substring(5, 9) + '<br>'

                    });

                    response += `00. Back`
                    response += `<br>0. Exit`
                    response += `<br><b>Acc No/Amount</b></span>`
                    res.send(response)

                }).catch(err => {
                    console.log(err)
                })
            })

        } else if ((text.indexOf('*2*2') !== -1)) {  // from momo account to savings account


            var activeAccounts;

            account.getClientAccount(contact).then(data => {

                let clientNumber;

                data.forEach(el => {
                    clientNumber = el["account"]
                })

                // call function to get account numbers

                account.clientsProducts(clientNumber).then(resAccounts => {

                    activeAccounts = resAccounts.data.savingsAccounts.filter((acc) => {

                        if ((acc.status.value === 'Active') && (!(acc.productName === 'Perm Suspense Account')) && (!(acc.productName === 'FP Saving Account'))) {
                            return true
                        }
                        return false
                    })

                    // display accounts to the customer

                    response = `CON Select Acc No: <br> <span style ="font-size: 13px;">`;

                    let count = 0
                    activeAccounts.forEach(el => {
                        count = count + 1
                        //response += count + '. ' + el["productName"] + `<br>`
                        response += `` + count + `.  ` + el["accountNo"] + `<b> E ` + el["accountBalance"] + `</b> ` + `<br>`
                        //response += `Acc:` + el["accountNo"].substring(5, 9) + '<br>'

                    });

                    response += `00. Back`
                    response += `<br>0. Exit`
                    response += `<br><b>Acc No/Amount.</b></span>`
                    res.send(response)

                }).catch(err => {
                    console.log(err)
                })
            })


        } else if ((text.indexOf('*1') !== -1) && (text.indexOf('*1*') === -1)) {   //// if 1 from menu is selected

            // get client products

            var activeAccounts;

            account.getClientAccount(contact).then(data => {

                let clientNumber;

                data.forEach(el => {
                    clientNumber = el["account"]
                })

                // call function to get account numbers

                account.clientsProducts(clientNumber).then(resAccounts => {

                    activeAccounts = resAccounts.data.savingsAccounts.filter((acc) => {

                        if ((acc.status.value === 'Active') && (!(acc.productName === 'Perm Suspense Account')) && (!(acc.productName === 'FP Saving Account'))) {
                            return true
                        }

                        return false
                    })

                    // display accounts to the customer

                    response = `CON My products: <br> <span style ="font-size: 13px;">`;

                    let count = 0
                    activeAccounts.forEach(el => {
                        count = count + 1
                        //response += count + '. ' + el["productName"] + `<br>`
                        response += el["productName"] + ` ( Acc: ` + el["accountNo"].substring(5, 9) + `)  <br>`
                        //response += `Acc:` + el["accountNo"].substring(5, 9) + '<br>'

                    });

                    response += `<br>00. Back`
                    response += `<br>0. Exit`
                    response += `<br>Enter <b>Acc No.</b> to view account details</span>`
                    res.send(response)

                }).catch(err => {
                    console.log(err)
                })
            })


        } else if (text.indexOf('*1*') !== -1) {  // view account deatails

            try {

                let totaldeposists = 0
                let totalFeeCharge = 0
                let totalWithdrawals = 0
                let totalInterestPosted = 0

                account.accountDetails(text.substring(9)).then(data => {

                    console.log(data.data.summary)

                    //totalWithdrawals = data.data.summary.totalWithdrawals

                    totaldeposists = +data.data.summary.totalDeposits || 0
                    totalFeeCharge = +data.data.summary.totalFeeCharge || 0
                    totalWithdrawals = +data.data.summary.totalWithdrawals || 0
                    totalInterestPosted = +data.data.summary.totalInterestPosted || 0



                    if (data.data["savingsProductName"].indexOf("Fixed Period Shares") >= 0) {
                        this.accountBalance = ((totaldeposists) + (totalInterestPosted) - (totalFeeCharge)).toFixed(2)
                    } else {
                        this.accountBalance = ((totaldeposists) + (totalInterestPosted) - (totalFeeCharge) - (totalWithdrawals)).toFixed(2)
                    }

                    //this.accountBalance = (+(response["summary"]["accountBalance"]) + +(response["summary"]["totalInterestPosted"]) - +(response["summary"]["totalWithdrawals"])).toFixed(2)

                    this.totaldeposists = data.data["summary"]["totalDeposits"]
                    this.totalCharge = data.data["summary"]["totalFeeCharge"]
                    this.totalInterestPosted = data.data["summary"]["totalInterestPosted"]
                    this.interest = data.data["nominalAnnualInterestRate"]


                    if (this.totaldeposists === undefined) {
                        this.totaldeposists = 0
                    }

                    if (this.totalWithdrawals === undefined) {
                        this.totalWithdrawals = 0
                    }

                    if (this.totalInterestPosted === undefined) {
                        this.totalInterestPosted = 0
                    }

                    if (this.accountBalance === undefined) {
                        this.accountBalance = 0
                    }

                    response = `CON Account Details<br>`
                    response += `Total deposits: E ` + this.totaldeposists + `<br>`
                    response += `Total withdrawals: E ` + this.totalWithdrawals + `<br>`
                    response += `Total Interest: E ` + this.totalInterestPosted + `<br><br>`
                    response += `Balance: E ` + this.accountBalance + `<br><br>`
                    response += `00. Back<br>`
                    response += `0. Exit`

                    res.send(response)
                    res.end()

                })
            } catch (err) {
                console.log(err)
            }
        }

    } catch (err) {
        console.log(err)
    }
})



module.exports = router