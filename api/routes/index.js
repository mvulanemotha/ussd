const express = require('express')
const customer = require('../modal/customers')
const router = express.Router()
const account = require('../modal/accounts')
const ussdR = require('ussd-router')
const uuid = require('uuid')
const collections = require('../modal/collections')
const token = require('../modal/headerCollections')
const disbursment = require('../modal/disbursment')
const disbursementHeader = require('../modal/disburstmentHeader')

const sms = require('../modal/sms')
const time = require('../modal/datetime')

//REGISTER IF NOT REGISTRED
router.get('/', async (req, res) => {

    var response = "SCBS :-) Wrong input fields were entered :)";

    try {


        let phoneNumber = req.query.Msisdn
        let text = req.query.input
        let sessionId = req.query.sessionID
        let newrequest = req.query.newrequest

        let dbText = ""

        // get functions to help track our progress

        // add new session in database

        if (newrequest === "1") {

            await customer.addNewsession(phoneNumber.slice(3), text, sessionId)

        } else if (newrequest === "0") {

            // get phone session details 
            await customer.getSessionDeatails(phoneNumber.slice(3), sessionId).then((data) => {

                data.forEach(dt => {

                    dbText = dt["input"]

                })
            })

            text = dbText + "*" + text

            // update database with new appended text

            await customer.updateInputSession(phoneNumber.slice(3), sessionId, text)

        }


        let closeOropenSession = 0

        // removing the first for characters of a //text e.g 7227 
        text = text.slice(5)

        text = ussdR.ussdRouter(text)

        let contact = phoneNumber.slice(3)

        if (text == "") {

            //check if user is registered
            await customer.isCustomer(contact).then(async (data) => {

                let customer_name;
                let attempts;

                // checking if there we recods found in the database
                if (data.length > 0) {

                    data.forEach(el => {
                        customer_name = el["name"]
                        attempts = el['attempts']
                    });

                    if (attempts < 3) {

                        response = "SCBS :-)<br>Welcome " + customer_name + "<br>Enter your pin:";
                        closeOropenSession = 1

                    } else {

                        response = `SCBS :-)Please note user account has been locked.`;
                        closeOropenSession = 0

                    }
                } else {


                    //call function to check if customers is in the database if yes send an sms with a password and insert into customers


                    //check if user is a new customer

                    await customer.checkNewUser(contact).then(async (dt) => {

                        let account, username;

                        dt.forEach((e) => {
                            account = e["account"]
                            username = e["contact"]
                        })


                        if (dt.length > 0) {

                            //create a password and insert into customers

                            let password = Math.floor(100000 + Math.random() * 900000)

                            await customer.saveCustomers(account, username, 0, password).then(saved => {



                                response = "SCBS :-) <br><br> Please use the password sent to you to login thanks.";
                                closeOropenSession = 0

                            })

                        } else {

                            response = "Welcome to SCBS please contact 24171975 for more info.";
                            closeOropenSession = 0

                        }

                    })

                }
            })

        } else if ((text !== "") && (text.indexOf('*') === -1)) {

            //auth logged in user

            await customer.login(contact, text).then(data => {

                if (data.length > 0) {

                    //reset loggin attempts to zero incase there was a failed login
                    customer.resetLoginAttempts(contact)

                    response = " Menu :-)<br>1. My Accounts<br>2. Mtn Momo Transfers <br>3. Change Password <br><br>00. Exit";
                    closeOropenSession = 1

                } else {

                    //update status of being locked
                    customer.updateFailedLogins(contact)

                    // get loggin attempts
                    response = `SCBS :-) Failed to login, you will be locked out.`;
                    closeOropenSession = 0
                }
            })


        } else if (text == '1*0') { //Have viewed my products now i want to view see my menu again

            response = " Menu :-)<br>1. My Accounts<br>2. Mtn Momo Transfers <br>3. Change Password <br><br>00. Exit";

            closeOropenSession = 1

        } else if ((text.indexOf('*2') !== -1) && (text.indexOf('*2*1') === -1) && (text.indexOf('*2*2') === -1)) { // viewing mtn momo

            response = "Transfer :-)<br>"
            response += "1. From Savings<br>2. To Savings<br><br>00. Back<br>0. Exit";
            closeOropenSession = 1
        }


        //change user password
        if (((text.indexOf('*3')) !== -1) && (text.indexOf('*3*') === -1)) {

            response = "Enter Old Password."
            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1

        }

        // enter new password and update password in the datanase
        if ((text.indexOf('*3*') !== -1)) {


            response = "Enter New password"
            response += "<br><br>00 Back"
            response += "<br>0 Exit"

        }


        // change passwords

        if ((text.indexOf('*3*') !== -1) && (countString(text, '*') === 3) && (text.length === 22)) {

            //first check the number of characters from the strings
            let newPass = text.slice(16)
            let phone = phoneNumber.slice(3)

            // update database with new password

            await customer.changePassword(phone, newPass).then((data) => {

                if (data["affectedRows"] === 1) {

                    response = "SCBS :-)<br> Password Changed Successfully."

                } else {

                    response = "SCBS :-)<br> Failed To Change Password."
                }
            })

            closeOropenSession = 0;

        }


        if ((text.indexOf('2*1') !== -1) && (text.indexOf('*2*2*') === -1) && (text.indexOf('*2*1*') === -1)) { // get money from savings account to mobile money

            var activeAccounts;

            await account.getClientAccount(contact).then(async (data) => {

                let clientNumber;

                data.forEach(el => {
                    clientNumber = el["account"]
                })

                // call function to get account numbers

                await account.clientsProducts(clientNumber).then(resAccounts => {

                    activeAccounts = resAccounts.data.savingsAccounts.filter((acc) => {

                        if ((acc.status.value === 'Active') && (!(acc.productName === 'Perm Suspense Account')) && (!(acc.productName === 'FP Saving Account'))) {
                            return true
                        }
                        return false
                    })


                    activeAccounts = activeAccounts.filter((acc) => {

                        if (acc.productName === 'Mula Account' || acc.productName === 'Bronze Savings' || acc.productName === 'SIlver Savings' || acc.productName === 'Golden Savings' || acc.productName === 'Subscription shares') {
                            return true
                        }
                        return false

                    })


                    // display accounts to the customer

                    response = "Select Acc No :-)<br>";

                    let count = 0
                    let accountBalance = 0

                    activeAccounts.forEach(el => {


                        if (el["accountBalance"] === undefined) {
                            accountBalance = 0
                        } else {
                            accountBalance = el["accountBalance"]
                        }

                        count = count + 1
                        response += el["accountNo"] + "<br> E" + accountBalance + "<br><br>"

                    });

                    //response += "<br>Enter Amount.<br>";
                    response += "00. Back<br>";
                    response += "0. Exit";

                    closeOropenSession = 1

                }).catch(err => {
                    console.log(err)
                })
            })

        }

        // Enter amount to send to disbursememtn
        console.log(text.length)
        if ((text.indexOf('*2*1*') !== -1) && ((text.length === 20)) && (text.indexOf('*2*1*00000') !== 0)) {


            response = "Enter Amount To Transfer :-)<br><br>"

            response += "00. Back<br>";
            response += "0. Exit";

            closeOropenSession = 1
        
        }
        
        //after amount was entered
        if ((text.indexOf('*2*1*') !== -1) && (text.length > 20)) {
            
            response = "SCBS :-) Coming soon"
            closeOropenSession = 0
            /*
            //generate an uxxd 
            await disbursementHeader.token().then(async neWtoken => {
                
                let token = neWtoken.data["access_token"]
                let amount = text.slice(21)
                
                //create uxxID
                uuID = uuid.v4();
                
                await disbursment.requestToTransfer(uuID, token, amount, phoneNumber).then(payRes => {
                    
                    console.log(payRes)
                
                
                })
            })
            */

            console.log(text)
            //have functions that will withdraw from the musoni account

        }


        if ((text.indexOf('*2*2') !== -1) && (text.indexOf('*2*2*') === -1)) {  // from momo account to savings account


            var activeAccounts;

            await account.getClientAccount(contact).then(async (data) => {

                let clientNumber;

                data.forEach(el => {
                    clientNumber = el["account"]
                })

                // call function to get account numbers

                await account.clientsProducts(clientNumber).then(resAccounts => {

                    activeAccounts = resAccounts.data.savingsAccounts.filter((acc) => {

                        if ((acc.status.value === 'Active') && (!(acc.productName === 'Perm Suspense Account')) && (!(acc.productName === 'FP Saving Account'))) {
                            return true
                        }
                        return false
                    })

                    // filter accounts that are needed

                    activeAccounts = activeAccounts.filter((acc) => {

                        if (acc.productName === 'Mula Account' || acc.productName === 'Bronze Savings' || acc.productName === 'SIlver Savings' || acc.productName === 'Golden Savings' || acc.productName === 'Subscription shares') {
                            return true
                        }

                        return false

                    })

                    // display accounts to the customer

                    response = "Select Acc No :-) <br>";

                    let accountBalance = 0
                    let count = 0
                    activeAccounts.forEach(el => {

                        if (el["accountBalance"] === undefined) {
                            accountBalance = 0
                        } else {
                            accountBalance = el["accountBalance"]
                        }

                        count = count + 1
                        response += el["accountNo"] + "<br>E" + accountBalance + "<br>";

                    });

                    response += "<br>Enter Acc No.<br><br>";
                    response += "00. Back<br>";
                    response += "0. Exit";

                    closeOropenSession = 1

                }).catch(err => {
                    console.log(err)
                })
            })


        }


        //transfer money in mobile money
        if ((text.indexOf('*2*2*') !== -1) && (text.indexOf('*2*2*00000') !== -1) && ((text.length === 20))) {

            response = "Enter Amount :-)<br>"

            response += "<br>00. Back";
            response += "<br>0. Exit";

            closeOropenSession = 1

        }


        //transfer amount entered to make the transfer
        if ((text.indexOf('*2*2*') !== -1) && (text.indexOf('*2*2*00000') !== -1) && (text.length >= 22)) {

            //CALL FUNCTION TO MAKE A TRANSFER FROM MOMO TO MY SAVINGS

            let accountNo = text.slice(11, 20)
            let amount = text.slice(21)

            //deposit to this account
            uuID = uuid.v4();

            await token.token().then(async (data) => {

                let token = data.data

                //get a token then use it to make request

                await collections.requestToPay(uuID, token["access_token"], amount, phoneNumber).then(async (data) => {

                    //console.log(data)

                    if (data["status"] !== undefined) {

                        console.log(data)

                        if (data["status"] === 202) {

                            //response = "Please make an approvals"

                            // store in database

                            await collections.saveRequestTransaction(token["access_token"], uuID, amount, phoneNumber, accountNo).then(async (dt) => {

                                if (dt["affectedRows"] === 1) {

                                    response = "SCBS :-) Thank you valued customer please remember to approve your transaction on your momo account."
                                    closeOropenSession = 0

                                } else {

                                    response = "SCBS :-) Failed to make transfer."
                                    closeOropenSession = 0

                                }


                            }).catch(err => {

                                console.log(err.message)

                            })

                        } else {

                            response = "SCBS :-) Failed to make transfer. Please check if you have enough money."
                            closeOropenSession = 0
                        }

                    }


                }).catch((err) => {

                    console.log(err)

                })


            }).catch((err) => {

                console.log(err)

            })

        }




        if ((text.indexOf('*1') !== -1) && (text.indexOf('*1*') === -1) && (text.indexOf('*2*2*') === -1) && (text.indexOf('*2*1') === -1) && ((text.indexOf('*3')) === -1)) {   //// if 1 from menu is selected

            // get client products

            var activeAccounts;

            await account.getClientAccount(contact).then(async (data) => {

                let clientNumber;

                data.forEach(el => {
                    clientNumber = el["account"]
                })

                //get account numbers

                await account.clientsProducts(clientNumber).then(resAccounts => {

                    activeAccounts = resAccounts.data.savingsAccounts.filter((acc) => {

                        if ((acc.status.value === 'Active') && (!(acc.productName === 'Perm Suspense Account')) && (!(acc.productName === 'FP Saving Account'))) {
                            return true
                        }
                        return false
                    })

                    // display accounts to the customer

                    response = "My Accounts :-)<br>";

                    let count = 0
                    activeAccounts.forEach(el => {
                        count = count + 1
                        response += el["accountNo"] + "<br>"

                    });

                    response += "<br>Type Acc No:";
                    response += "<br>00. Back";
                    response += "<br>0. Exit";

                    closeOropenSession = 1

                }).catch(err => {
                    console.log(err)
                })
            })


        }

        if ((text.indexOf('*1*') !== -1) && (text.indexOf('*2*1*') === -1)) {  // view account deatails

            try {

                let totaldeposists = 0
                let totalFeeCharge = 0
                let totalWithdrawals = 0
                let totalInterestPosted = 0

                await account.accountDetails(text.slice(-4)).then(data => {

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

                    response = "My Account Info :-) <br>Deposits: E" + this.totaldeposists + "<br>" //Withdrawals: E" + this.totalWithdrawals + "<br>"
                    response += "Interest: E " + this.totalInterestPosted + "<br>"
                    response += "Balance: E " + this.accountBalance + "<br><br>"
                    response += "00. Back<br>"
                    response += "0. Exit";

                    closeOropenSession = 1
                })
            } catch (err) {
                console.log(err)
            }
        }


        //need a way to dertemine if we are closing the or the request is still open

        if (closeOropenSession === 1) {

            res.writeHead(200, {
                'Freeflow': 'FC',
                'Content-Type': 'text/plain'
            });

        } else {

            res.writeHead(200, {
                'Freeflow': 'FB',
                'Content-Type': 'text/plain'
            });

        }

        res.write(response)
        res.end();

    } catch (err) {
        console.log(err)
    }

})

//save ussd customers
router.post('/', async (req, res) => {


    // save a new client 


    //

})


let countString = (str, letter) => {
    let count = 0;

    // looping through the items
    for (let i = 0; i < str.length; i++) {

        // check if the character is at that position
        if (str.charAt(i) == letter) {
            count += 1;
        }
    }
    return count;
}


// function to check payment status
setInterval(async () => {

    try {


        let newDate = time.getTime().slice(0, 10)

        await collections.getPaymentStatus().then(async (data) => {

            if (data.length > 0) {
                //get payment status

                let xxid
                let token
                let accountNo
                let amount
                let phone

                data.forEach(values => {

                    xxid = values["xxid"]
                    token = values["token"]
                    accountNo = values["accountNo"]
                    amount = values["amount"]
                    phone = values["phone"]

                })


                await collections.paymentStatus(xxid, token).then((dt) => {

                    //CHECKING IF WE HAVE DATA

                    let status = dt.data["status"]

                    if (status === 'FAILED') {
                        collections.updatepaymentRequest(2, token, xxid)
                    }


                    if (status === 'SUCCESSFUL') {

                        // 1 means transaction was succesfully
                        collections.updatepaymentRequest(1, token, xxid)

                        // make a deposit to mula account
                        collections.makeDeposit(amount, '000004258', phone, time.myDate(newDate))

                        collections.makeDeposit(amount, accountNo, phone, time.myDate(newDate)).then(data => {

                            // sms from status after a succesfully transaction

                            accountNo = accountNo.replace(/00000/, 'xxxxx')

                            let message = ':-) A Credit of E' + amount + ' has been made to Acc ' + accountNo + ' on ' + time.getTime() + ''
                            sms.sendMessage(phone, message)

                        })
                    }


                })

            } else {
                //console.log("Nothing To get")
            }

        })

    } catch (err) {
        console.log(err.message)
    }

}, 20000)


module.exports = router