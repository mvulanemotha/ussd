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

    var response = "SCBS :-) Network Error";

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

                //try and remove the six digit password            

            })

            text = dbText + "*" + text

            // update database with new appended text

            await customer.updateInputSession(phoneNumber.slice(3), sessionId, text)

        }


        let closeOropenSession = 0

        // removing the first four characters of a //text e.g 7227 
        text = text.slice(5)

        text = ussdR.ussdRouter(text)

        let contact = phoneNumber.slice(3)

        //remove the pasword

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

                                if (saved["affectedRows"] === 1) {

                                    //send sms to the client
                                    let message = "Please use this password on SCBS USSD " + password;

                                    sms.sendMessage(contact, message)

                                    response = "SCBS :-) <br>Please use the password sent to you to login thanks.";
                                    closeOropenSession = 0

                                } else {

                                    response = "SCBS :-) <br>Please SCBS at +268 24171975 registration failed.";
                                    closeOropenSession = 0

                                }

                            })

                        } else {

                            response = "Welcome to SCBS please contact 24171975 for more info.";
                            closeOropenSession = 0

                        }

                    })

                }
            })

        }


        if ((text !== "") && (text.indexOf('*') === -1)) { // when text only contains the paasword

            //auth logged in user

            await customer.login(contact, text).then(data => {

                if (data.length > 0) {

                    //reset loggin attempts to zero incase there was a failed login
                    customer.resetLoginAttempts(contact)
                    console.log("check")
                    response = " Menu :-)<br>1. My Accounts<br>2. MoMo Transfers <br>3. Change Password <br><br>00. Exit";
                    closeOropenSession = 1

                } else {

                    //update status of being locked
                    customer.updateFailedLogins(contact)

                    // get loggin attempts
                    response = `SCBS :-) Failed to login, you will be locked out.`;
                    closeOropenSession = 0
                }
            })


        }

        //try and remove the password on the text

        text = text.slice(7)
        /*
        if (text == '1*0') { //Have viewed my products now i want to view see my menu again
            
            response = " Menu :-)<br>1. My Accounts<br>2. MOMO Transfers <br>3. Change Password <br><br>00. Exit";
            
            closeOropenSession = 1
        
        }
        */

        if ((text === "2")) { // viewing mtn momo

            response = "Transfer :-)<br>"
            response += "1. From Savings<br>2. To Savings<br><br>00. Back<br>0. Exit";
            closeOropenSession = 1
        }

        /*
        //change user password
        if (((text.indexOf('*3')) !== -1) && (text.indexOf('*3*') === -1)) {
            
            response = "Enter Old Password."
            response += "<br><br>00 Back"
            response += "<br>0 Exit"
            
            closeOropenSession = 1
        
        }
        
        */

        // enter new password and update password in the datanase
        if ((text == "3")) {


            response = "Enter New password"
            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1

        }


        // change passwords

        if ((text.indexOf('3*') !== -1)) {

            //first check the number of characters from the strings
            let newPass = text.slice(2)
            let phone = phoneNumber.slice(3)

            //check if input is a six digit value

            if (text.slice(2).length !== 6) {

                console.log("length error")
                response = "SCBS :-) Password should be a 6 digit value"
                closeOropenSession = 0

            } else {

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

        }


        if (text === "2*1") { // get money from savings account to mobile money

            var activeAccounts;

            await account.getClientAccount(contact).then(async (data) => {

                let clientNumber;

                data.forEach(el => {
                    clientNumber = el["account"]
                })

                // call function to get account numbers

                await account.clientsProducts(clientNumber).then(async resAccounts => {

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
                    let tempAccounts = []

                    await activeAccounts.forEach(el => {


                        if (el["accountBalance"] === undefined) {
                            accountBalance = 0
                        } else {
                            accountBalance = el["accountBalance"]
                        }

                        count = count + 1
                        response += "1. " + el["accountNo"] + "<br> E" + accountBalance + "<br><br>"

                        //save available accounts
                        tempAccounts.push({ "accountNo": el["accountNo"], row: count })

                    });

                    //save in database the new data
                    tempAccounts.forEach(el => {
                        //callfunction to save into database the list of accounts
                        account.storeSelectedAccount(sessionId, el["accountNo"], text, el["row"])

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

        // Enter amount to send to disbursememt
        console.log(text.length)

        if ((text.indexOf('2*1*') !== -1) && (text.length === 5)) {


            response = "Enter Amount To Transfer :-)<br><br>"

            response += "00. Back<br>";
            response += "0. Exit";

            closeOropenSession = 1

        }

        //after amount was entered  // disbursement panel
        if ((text.indexOf('2*1*') !== -1) && (text.length > 5) && (text.indexOf("2*2") === -1)) {

            closeOropenSession = 0

            let amount = text.slice(6)
            let accountNo
            let accountBalanceMusoni = 0

            let row = text[4]  //getting a row
            let input = text.slice(0, 3)
            //get saved inputes to retrieve account to send to



            await account.getSelectedAccount(input, sessionId, row).then(dt => {

                dt.forEach(el => {

                    accountNo = el["accountNo"]

                })

            })



            await account.getAccountSavingsAccountBalance(accountNo).then(el => {

                accountBalanceMusoni = el["data"]["summary"]["accountBalance"]

            }).catch(err => {

                console.log(err)

            })

            if (accountBalanceMusoni < amount) {
                console.log("test")
                response = "SCBS :-) You have insuffient funds."
                closeOropenSession = 0;

            } else {

                //generate an uxxd 
                await disbursementHeader.token().then(async neWtoken => {

                    let token = neWtoken.data["access_token"]

                    // check if customer has enough money in his savings acccount

                    //create uxxID
                    uuID = uuid.v4();

                    await disbursment.requestToTransfer(uuID, token, amount, phoneNumber).then(payRes => {

                        //check status
                        if (payRes["status"] === 202) {

                            //save request to pay details
                            disbursment.saveDisbursmentRequest(token, uuID, amount, phoneNumber, accountNo)

                            response = "Transfer Has Been Made."
                            closeOropenSession = 0

                        } else {

                            response = "Failed To Make Transfer."
                            closeOropenSession = 0
                        }


                    }).catch((err) => {

                        // console.log(err.message)

                    })
                })
            } // end of transfer functions


        }


        if (text === "2*2") {  // from momo account to savings account


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

                    response = "Select Acc :-) <br>";

                    let accountBalance = 0
                    let count = 0

                    let tempAccounts = []

                    activeAccounts.forEach(el => {

                        if (el["accountBalance"] === undefined) {
                            accountBalance = 0
                        } else {
                            accountBalance = el["accountBalance"]
                        }

                        count = count + 1
                        response += "1. " + el["accountNo"] + "<br>E" + accountBalance + "<br>";

                        // save accounts that can be used to make a transfer
                        tempAccounts.push({ "accountNo": el["accountNo"], row: count })

                    });


                    tempAccounts.forEach(el => {
                        //callfunction to save into database the list of accounts

                        account.storeSelectedAccount(sessionId, el["accountNo"], text, el["row"])

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
        if ((text.indexOf('2*2*') !== -1) && (text.length === 5)) {

            response = "Enter Amount To Transfer :-)<br>"

            response += "<br>00. Back";
            response += "<br>0. Exit";

            closeOropenSession = 1

        }


        //transfer amount entered to make the transfer
        if ((text.indexOf('2*2*') !== -1) && (text.length > 5)) {

            //CALL FUNCTION TO MAKE A TRANSFER FROM MOMO TO MY SAVINGS


            let accountNo
            let amount = text.slice(6)

            console.log(amount)

            //get row and input 
            let input = text.slice(0, 3)
            let row = text[4]

            //get account that was selected
            await account.getSelectedAccount(input, sessionId, row).then((dt) => {

                // get account number that was selected
                dt.forEach(el => {

                    accountNo = el["accountNo"]

                })

            })

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

                                    response = "SCBS :-) Please make an approval on your momo account."
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

        if (text === "1") {   //// if 1 from menu is selected

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

                    let tempAccounts = []
                    let count = 0
                    activeAccounts.forEach(el => {
                        count = count + 1
                        response += count + ". " + el["accountNo"] + "<br>"

                        tempAccounts.push({ "accountNo": el["accountNo"], row: count })

                    });

                    // we need to store 
                    tempAccounts.forEach(el => {
                        //callfunction to save into database the list of accounts

                        account.storeSelectedAccount(sessionId, el["accountNo"], text, el["row"])

                    });


                    response += "<br>Select Acc No:";
                    response += "<br><br>00. Back";
                    response += "<br>0. Exit";

                    closeOropenSession = 1

                }).catch(err => {
                    console.log(err)
                })
            })


        }

        if ((text.indexOf('1*') !== -1) && (text.length === 3)) {  // view account deatails

            try {

                let totaldeposists = 0
                let totalFeeCharge = 0
                let totalWithdrawals = 0
                let totalInterestPosted = 0

                //get account number from database that was selected

                let preSelected = text[0]
                let row = text[2]


                let accountFound

                await account.getSelectedAccount(preSelected, sessionId, row).then(dt => {

                    dt.forEach(el => {

                        accountFound = el["accountNo"]

                    })

                })


                await account.accountDetails(accountFound).then(data => {

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
                //console.log(err)
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

    customer.saveClientNumbers(req.body.cfi, req.body.name, req.body.contact, 1).then((data) => {

        if (data["affectedRows"] > 0) {

            res.json({ message: "saved" })

        } else {

            res.json({ message: "failed" })

        }


    })
    
    //ussdName ussdNumber ussdCFI

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

//check status of transfer

setInterval(async () => {


    try {

        let newDate = time.getTime().slice(0, 10)

        /*console.log(newDate)
        console.log(time.myDate(newDate))*/

        //06 June 2023


        //get saved disbursement details
        await disbursment.getTransferStatus().then(async data => {

            if (data.length > 0) {

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


                //let status = dt.data["status"]
                await disbursment.transferStatus(xxid, token).then(async status => {

                    //console.log(status)

                    //console.log(status.data["status"])

                    if (status === undefined) {
                        return
                    }

                    //check 
                    if (status.data["status"] === "FAILED") {

                        console.log(status.data["status"])
                        // update database when the transaction failed    
                        disbursment.updateTransferRequest(2, token, xxid)

                    }

                    //check if the trasaction was a successs
                    if (status.data["status"] === "SUCCESSFUL") {

                        console.log(status.data["status"])

                        //send sms to client
                        let message = 'SCBS :-) A Deposit of SZL' + amount + ' has been made to your momo account on ' + time.getTime() + ''
                        sms.sendMessage(phone, message)

                        disbursment.updateTransferRequest(1, token, xxid)

                        //console.log("we are in")

                        //withdraw from Musoni
                        await disbursment.makeWithdrawal(amount, accountNo, phone, time.myDate(newDate)).then(wdata => {

                            //console.log(wdata)
                            if (wdata.data !== undefined) {
                                console.log(wdata.data)
                            }

                        }).catch(err => {
                            console.log(err.message)
                        })

                        // withdraw from the 000004257
                        await disbursment.makeWithdrawal(amount, "000004257", phone, time.myDate(newDate)).then(wdata => {

                            if (wdata.data !== undefined) {
                                console.log(wdata.data)
                            }

                        }).catch(err => {
                            console.log(err.message)
                        })
                    }
                }).catch(err => {
                    console.log(err.message)
                })
            }
        })

    } catch (error) {
        //console.log(error)
    }

}, 5000);


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

                            let message = 'SCBS :-) A Credit of E' + amount + ' has been made to Acc ' + accountNo + ' on ' + time.getTime() + ''
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