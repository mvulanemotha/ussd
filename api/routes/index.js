const express = require('express')
const customer = require('../modal/customers')
const loans = require('../modal/loans')
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
const quickLoan = require('../modal/quickloan')

//REGISTER IF NOT REGISTRED
router.get('/', async (req, res) => {

    //var response = "SCBS -:-<br><br>Network Error.";
    var response = "NULL";

    try {

        let phoneNumber = req.query.Msisdn
        let text = req.query.input
        let sessionId = req.query.sessionID
        let newrequest = req.query.newrequest

        let dbText = ""

        // get functions to help track our progress
        // add new session in database

        if (newrequest === "1") {

            await customer.addNewsession(phoneNumber.slice(3), text, sessionId).then(dt => {
            })

        } else if (newrequest === "0") {

            // get phone session details 
            await customer.getSessionDeatails(phoneNumber.slice(3), sessionId).then(async (data) => {

                data.forEach(dt => {
                    dbText = dt["input"]
                })

                //try and remove the six digit password     

                text = dbText + "*" + text

                // update database with new appended text
                await customer.updateInputSession(phoneNumber.slice(3), sessionId, text).then(dtt => {
                    //console.log(dtt)
                })

            })
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

                        response = "SCBS -:-<br>Welcome " + customer_name + "<br>Enter your pin:";
                        closeOropenSession = 1

                    } else {

                        response = `SCBS -:-<br>Please note your user account has been locked.`;
                        closeOropenSession = 0

                    }
                } else {


                    //call function to check if customers is in the database if yes send an sms with a password and insert into customers


                    //check if user is a new customer

                    await customer.checkNewUser(contact).then(async (dt) => {

                        console.log(dt)

                        let account, username;

                        dt.forEach((e) => {
                            account = e["account"]
                            username = e["contact"]
                        })


                        if (dt.length > 0) {

                            //create a password and insert into customers

                            let password = Math.floor(100000 + Math.random() * 900000)

                            await customer.saveCustomers(account, username, 0, password).then(async saved => {

                                if (saved["affectedRows"] === 1) {

                                    //send sms to the client
                                    let message = "Please use this password on SCBS USSD " + password;

                                    await sms.sendMessage(contact, message)

                                    response = "SCBS -:- <br>Please use the password sent to you to login thanks.";
                                    closeOropenSession = 0

                                } else {

                                    response = "SCBS -:- <br>Please contact SCBS at +268 24171975 registration failed.";
                                    closeOropenSession = 0

                                }
                            })

                        } else {

                            response = "Sorry, you are not registered with Status Capital. Please visit the nearest branch to get registered or Call 24171975";
                            closeOropenSession = 0

                        }

                    })

                }
            })

        }


        if ((text !== "") && (text.indexOf('*') === -1)) { // when text only contains the paasword

            //auth logged in user

            await customer.login(contact, text).then(async data => {

                if (data.length > 0) {

                    //reset loggin attempts to zero incase there was a failed login
                    customer.resetLoginAttempts(contact)
                    response = " Menu -:-<br>1. My Accounts<br>2. MoMo <br>3. Utilities <br>4. Prepaid   <br>5. Settings <br><br>0. Exit";
                    closeOropenSession = 1

                } else {

                    //update status of being locked
                    await customer.updateFailedLogins(contact)

                    // get loggin attempts
                    response = `SCBS -:- Failed to login, you will be locked out.`;
                    closeOropenSession = 0
                }
            })


        }

        //try and remove the password on the text
        // dont touach
        text = text.slice(7)

        //check for MoMo Quick loan
        if ((text === "2")) {

            // viewing mtn momo
            // check if client has a 


            let contact = phoneNumber.slice(3)
            let customerCfi;
            let savings

            // get customer details
            await account.getClientAccount(contact).then(async (data) => {

                data.forEach(el => {
                    customerCfi = el["account"]
                })

                await account.clientsProducts(customerCfi).then(async dt => {

                    savings = dt.data.savingsAccounts

                    savings = savings.filter(el => {

                        if ((el["status"]["value"] === "Active") && (el["productName"].slice(0, 13) === "Fixed Deposit")) {
                            return true
                        }
                        return false
                    })
                })

            })


            response = "MoMo -:-<br><br>"
            response += "Transfer<br>"
            response += "1. From Savings<br>2. To Savings<br><br>"
            /*
            if (savings.length > 0) {
                response += "Quick Loan<br>"
                response += "3. View<br><br>"
            }
            */
            response += "00. Back<br>0. Exit";
            closeOropenSession = 1
        }


        // check 
        if (text === "2*3*2") {

            response = "SCBS -:-<br><br>"
            response += "Enter Amount<br><br>"
            response += "00. Back<br>0. Exit";
            closeOropenSession = 0

        }

        if ((text.indexOf("2*3*2") !== -1) && (text.length >= 7)) {

            let amountBorrowed = parseFloat(text.slice(6))

            let contact = phoneNumber.slice(3)
            let customerCfi;
            let mulaAccountNo;

            // get customer details
            await account.getClientAccount(contact).then(async (data) => {

                let totalAmount = 0

                data.forEach(el => {
                    customerCfi = el["account"]
                })

                await account.clientsProducts(customerCfi).then(async dt => {

                    let savings = dt.data.savingsAccounts

                    savings = savings.filter(el => {

                        if ((el["status"]["value"] === "Active") && (el["productName"].slice(0, 13) === "Fixed Deposit")) {
                            return true
                        }
                        return false
                    })

                    //calculate how much money is paid to a client montly

                    //let minPay = parseFloat(((this.investment) * ((1 + (percent / 360)) ** 28)).toFixed(2)) - this.investment
                    savings.forEach(el => {

                        totalAmount += parseFloat(el["accountBalance"])
                    })

                    let percent = (8 / 100)
                    let interestPosted = parseFloat(((totalAmount) * ((1 + (percent / 360)) ** 30)).toFixed(2)) - totalAmount

                    // calcu;late loan amount

                    let amountThatWeCanBorrow = quickLoan.calculateQuickLoanAmount(interestPosted)

                    //check if amount being borrowed is less than inputed amount

                    if (parseFloat(amountBorrowed) > parseFloat(amountThatWeCanBorrow)) {

                        response = "SCBS -:-"
                        response += "<br><br>"
                        response += "The amount you are borrowing is greater than that you can be offered."
                        response += "<br><br>00. Back<br>0. Exit";

                        closeOropenSession = 1;

                    } else {
                        //get mula accountNo
                        await account.clientsProducts(customerCfi).then(dt => {

                            let savings = dt.data.savingsAccounts

                            savings = savings.filter(el => {

                                if ((el["status"]["value"] === "Active") && (el["productName"] === "Mula Account")) {
                                    return true
                                }
                                return false
                            })

                            savings.forEach(ss => {

                                mulaAccountNo = ss["accountNo"]

                            })

                        })


                        await quickLoan.saveQuickLoan(contact, sessionId, mulaAccountNo, amountBorrowed).then(async dt => {

                            if (dt["affectedRows"] === 1) {

                                let newDate = time.getTime().slice(0, 10)

                                await quickLoan.createQuickLoanCharge(mulaAccountNo, amountBorrowed.toFixed(2), time.myDate(newDate)).then(async st => {

                                    if (st.status === 200) {

                                        //////////////////////////////////////////
                                        await quickLoan.payCharge(mulaAccountNo, st["data"]["resourceId"], amountBorrowed.toFixed(2), time.myDate(newDate)).then(async payed => {

                                            if (payed.status === 200) {

                                                //generate an uxxd 
                                                await disbursementHeader.token().then(async neWtoken => {

                                                    let token = neWtoken.data["access_token"]

                                                    // check if customer has enough money in his savings acccount

                                                    //create uxxID
                                                    uuID = uuid.v4();

                                                    await disbursment.requestToTransfer(uuID, token, amountBorrowed.toFixed(2), "268" + contact).then(async payRes => {

                                                        //check status
                                                        if (payRes["status"] === 202) {

                                                            //save request to pay details
                                                            await disbursment.saveDisbursmentRequest(token, uuID, amountBorrowed.toFixed(2), "268" + contact, mulaAccountNo, phoneNumber)

                                                            response = "SCBS -:-<br><br>"
                                                            response += "Quick Loan Approved"
                                                            closeOropenSession = 0

                                                        } else {

                                                            response = "Failed To Allocate Quick Loan."
                                                            closeOropenSession = 0
                                                        }

                                                    }).catch((err) => {

                                                        console.log(err.message)

                                                    })
                                                })
                                            }
                                        })
                                    }
                                })

                            } else {

                                response = "SCBS -:-<br>"
                                response += "Failed To Allocate You A Quick Loan"
                                closeOropenSession = 0
                            }

                        })  // end of saving a Money borrowed in database

                    }

                })
            })


        }

        //accept default amount
        if (text === "2*3*1") {

            let contact = phoneNumber.slice(3)
            let customerCfi;
            let mulaAccountNo;

            // get customer details
            await account.getClientAccount(contact).then(async (data) => {

                let totalAmount = 0

                data.forEach(el => {
                    customerCfi = el["account"]
                })

                await account.clientsProducts(customerCfi).then(async dt => {

                    let savings = dt.data.savingsAccounts

                    savings = savings.filter(el => {

                        if ((el["status"]["value"] === "Active") && (el["productName"].slice(0, 13) === "Fixed Deposit")) {
                            return true
                        }
                        return false
                    })

                    //calculate how much money is paid to a client montly

                    //let minPay = parseFloat(((this.investment) * ((1 + (percent / 360)) ** 28)).toFixed(2)) - this.investment
                    savings.forEach(el => {

                        totalAmount += parseFloat(el["accountBalance"])
                    })

                    let percent = (8 / 100)
                    let interestPosted = parseFloat(((totalAmount) * ((1 + (percent / 360)) ** 30)).toFixed(2)) - totalAmount

                    // calcu;late loan amount

                    let amountThatWeCanBorrow = quickLoan.calculateQuickLoanAmount(interestPosted)

                    //check balance of mula 
                    await account.clientsProducts(customerCfi).then(dt => {

                        let savings = dt.data.savingsAccounts

                        savings = savings.filter(el => {

                            if ((el["status"]["value"] === "Active") && (el["productName"] === "Mula Account")) {
                                return true
                            }
                            return false
                        })

                        savings.forEach(ss => {

                            mulaAccountNo = ss["accountNo"]

                        })

                    })


                    await quickLoan.saveQuickLoan(contact, sessionId, mulaAccountNo, amountThatWeCanBorrow).then(async dt => {

                        if (dt["affectedRows"] === 1) {

                            let newDate = time.getTime().slice(0, 10)

                            await quickLoan.createQuickLoanCharge(mulaAccountNo, amountThatWeCanBorrow.toFixed(2), time.myDate(newDate)).then(async st => {

                                if (st.status === 200) {

                                    //////////////////////////////////////////
                                    await quickLoan.payCharge(mulaAccountNo, st["data"]["resourceId"], amountThatWeCanBorrow.toFixed(2), time.myDate(newDate)).then(async payed => {

                                        if (payed.status === 200) {

                                            //generate an uxxd 
                                            await disbursementHeader.token().then(async neWtoken => {

                                                let token = neWtoken.data["access_token"]

                                                // check if customer has enough money in his savings acccount

                                                //create uxxID
                                                uuID = uuid.v4();

                                                await disbursment.requestToTransfer(uuID, token, amountThatWeCanBorrow.toFixed(2), "268" + contact).then(async payRes => {

                                                    //check status
                                                    if (payRes["status"] === 202) {

                                                        //save request to pay details
                                                        await disbursment.saveDisbursmentRequest(token, uuID, amountThatWeCanBorrow.toFixed(2), "268" + contact, mulaAccountNo, phoneNumber)

                                                        response = "SCBS -:-<br><br>"
                                                        response += "Quick Loan Approved"
                                                        closeOropenSession = 0

                                                    } else {

                                                        response = "Failed To Allocate Quick Loan."
                                                        closeOropenSession = 0
                                                    }

                                                }).catch((err) => {

                                                    console.log(err.message)

                                                })
                                            })
                                        }
                                    })
                                }
                            })

                        } else {

                            response = "SCBS -:-<br>"
                            response += "Failed To Allocate You A Quick Loan"
                            closeOropenSession = 0
                        }
                    })
                })
            })

        }


        //quick loan section
        if ((text === "2*3")) {

            let contact = phoneNumber.slice(3)
            let customerCfi;

            //check if this month loan is active
            await quickLoan.getQuickLoan(contact).then(async dt => {

                if (dt.length === 0) {

                    // get customer details
                    await account.getClientAccount(contact).then(async (data) => {

                        let totalAmount = 0

                        data.forEach(el => {
                            customerCfi = el["account"]
                        })

                        await account.clientsProducts(customerCfi).then(dt => {

                            let savings = dt.data.savingsAccounts

                            savings = savings.filter(el => {

                                if ((el["status"]["value"] === "Active") && (el["productName"].slice(0, 13) === "Fixed Deposit")) {
                                    return true
                                }
                                return false
                            })

                            //calculate how much money is paid to a client montly

                            //let minPay = parseFloat(((this.investment) * ((1 + (percent / 360)) ** 28)).toFixed(2)) - this.investment
                            savings.forEach(el => {

                                totalAmount += parseFloat(el["accountBalance"])
                            })

                            let percent = (8 / 100)
                            let interestPosted = parseFloat(((totalAmount) * ((1 + (percent / 360)) ** 30)).toFixed(2)) - totalAmount

                            // calcu;late loan amount

                            let amountThatWeCanBorrow = quickLoan.calculateQuickLoanAmount(interestPosted)

                            response = "SCBS -:-<br>"
                            response += "Borrow up to "
                            response += "E" + amountThatWeCanBorrow.toFixed(2)

                            response += "<br>1. Accept Amount"
                            response += "<br>2. Other Amount"

                            response += "<br><br>00. Back<br>0. Exit";
                            closeOropenSession = 1


                        })

                    })

                } else {

                    // get     

                    let pendingAmount = 0
                    let mulaAccountBalance = 0
                    let mulaAccountNo = 0


                    await account.getClientAccount(contact).then(async (data) => {

                        data.forEach(el => {
                            customerCfi = el["account"]
                        })

                        //check balance of mula 
                        await account.clientsProducts(customerCfi).then(dt => {

                            let savings = dt.data.savingsAccounts

                            savings = savings.filter(el => {

                                if ((el["status"]["value"] === "Active") && (el["productName"] === "Mula Account")) {
                                    return true
                                }
                                return false
                            })

                            savings.forEach(ss => {
                                mulaAccountNo = ss["accountNo"]
                            })
                        })
                    })

                    dt.forEach(el => {
                        pendingAmount = el["borrowedAmount"]

                    })

                    //check Mula account balance
                    await account.getAccountSavingsAccountBalance(mulaAccountNo).then(accBalance => {

                        mulaAccountBalance = accBalance["data"]["summary"]["accountBalance"]

                    })

                    response = "SCBS -:-<br>"
                    response += "Your Quick Loan<br>"
                    response += "E" + pendingAmount
                    response += "<br><br>Account Details<br>"
                    response += mulaAccountNo
                    response += "<br>E " + mulaAccountBalance
                    response += "<br><br>00. Back<br>0. Exit";
                    closeOropenSession = 1

                }
            })
        }


        // utilities
        if (text === "3") {

            response = "SCBS -:-<br><br>"
            response += "1. EWSC"

            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1

        }

        if (text === "3*1") {

            response = "SCBS -:-<br><br>"
            response += "Coming Soon"
            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1

        }

        //prepaid 
        if (text === "4") {

            response = "SCBS -:-<br>"
            response += "1. Airtime<br>"
            response += "2. Bundles <br>"
            response += "3. Electricity"

            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1

        }

        if (text === "4*1") {

            response = "SCBS -:-<br><br>"
            response += "Coming Soon"
            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1

        }


        if (text === "4*2") {

            response = "SCBS -:-<br><br>"
            response += "Coming Soon"
            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1

        }

        if (text === "4*3") {

            response = "SCBS -:-<br><br>"
            response += "Coming Soon"
            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1

        }

        // gives customer a menu of a change of password
        if (text == "5") {

            response = "SCBS -:-<br><br>"
            response += "1. My Profile<br>"
            response += "2. Change Password"
            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1

        }

        // enter new password and update password in the datanase
        if ((text == "5*2")) {

            response = "SCBS -:-<br>"
            response += "You are about to change your password."
            response += "<br><br>Enter New password"
            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1
        }

        //display client info
        if (text == "5*1") {


            let contact = phoneNumber.slice(3)
            // get customer details
            await account.getClientAccount(contact).then(async (data) => {

                let clientNumber;

                data.forEach(el => {
                    clientNumber = el["account"]
                })

                // call function to display customer info

                response = "My Profile -:-<br><br>"

                await customer.getClientDetails(clientNumber).then(dt => {

                    // return birthdate

                    let newDate = time.birthDate(dt.data.dateOfBirth[0], dt.data.dateOfBirth[1], dt.data.dateOfBirth[2])


                    response += dt.data.displayName + "<br>"
                    response += "D.O.B  " + newDate + "<br>"
                    response += dt.data.mobileNo + "<br>"
                    response += dt.data.emailAddress
                })

            }).catch(errr => {

                console.log(errr.message)

            })

            response += "<br><br>00 Back"
            response += "<br>0 Exit"

            closeOropenSession = 1

        }

        // change passwords

        if ((text.indexOf('5*2*') !== -1)) {

            //first check the number of characters from the strings
            let newPass = text.slice(4)
            let phone = phoneNumber.slice(3)

            //check if input is a six digit value

            if (text.slice(4).length !== 6) {

                response = "SCBS -:-<br><br>Password must have 6 charecters."
                closeOropenSession = 0

            } else {

                // update database with new password

                await customer.changePassword(phone, newPass).then((data) => {

                    if (data["affectedRows"] === 1) {

                        response = "SCBS -:-<br> Password Changed Successfully."

                    } else {

                        response = "SCBS -:-<br> Failed To Change Password."
                    }
                })

                closeOropenSession = 0;

            }

        }


        if (text === "2*1") { // get money from savings account to mobile money

            /*
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

                    response = "Select Acc No -:-<br><br>";

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
                        response += count + ". " + el["shortProductName"] + "  " + el["accountNo"] + "<br>E" + accountBalance + "<br>"

                        //save available accounts
                        tempAccounts.push({ "accountNo": el["accountNo"], row: count })

                    });

                    //save in database the new data
                    tempAccounts.forEach(async el => {
                        //callfunction to save into database the list of accounts
                        await account.storeSelectedAccount(sessionId, el["accountNo"], text, el["row"])

                    });

                    //response += "<br>Enter Amount.<br>";
                    response += "<br>00. Back<br>";
                    response += "0. Exit";

                    closeOropenSession = 1

                }).catch(err => {
                    console.log(err)
                })
            })

            */

            var activeAccounts;
            let mulaMatureacc;

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

                    //CHECK IF MATURED TO STOP ACCOUNT 

                    var MaturedAccounts = activeAccounts.filter((matured) => {

                        if (matured.productName === "Mula Account") {
                            return true;
                        }
                        return false
                    })

                    await MaturedAccounts.forEach(accM => {

                        mulaMatureacc = accM.accountNo
                        //mulaMatureacc
                    })
                    // await customer.maturedAcc()

                    await customer.maturedAcc(mulaMatureacc).then(async res => {

                        mulaMatureacc = res.length

                    })

                    // display accounts to the customer

                    response = "Select Acc No -:-<br><br>";

                    if (mulaMatureacc === 0) {

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
                            response += count + ". <span style = 'font-size: medium'>" + el["shortProductName"] + "  " + el["accountNo"] + "</span>"
                            response += "<br> <span style = 'font-size: small'>Balance E" + accountBalance + "</span><br>"
                            response += "<span style = 'font-size: small'> Available E" + (parseFloat(accountBalance) - (parseFloat(disbursment.disbursememtCharge(parseFloat(accountBalance))) + 0.95)).toFixed(2) + "</span><br><br>"

                            //save available accounts
                            tempAccounts.push({ "accountNo": el["accountNo"], row: count })

                        });

                        //save in database the new data
                        tempAccounts.forEach(async el => {
                            //callfunction to save into database the list of accounts
                            await account.storeSelectedAccount(sessionId, el["accountNo"], text, el["row"])

                        });

                        //response += "<br>Enter Amount.<br>";
                        response += "00. Back<br>";
                        response += "0. Exit";

                        closeOropenSession = 1

                    } else {

                        response = "SCBS -:-<br><br>"
                        //response += "Service not available at the moment."
                        response += "Your account is currently not allowed to transact."
                        response += "<br><br>00. Back<br>";
                        response += "0. Exit";

                        closeOropenSession = 0

                    }

                }).catch(err => {
                    console.log(err)
                })
            })

        }

        if (text === "2*1*1" || text === "2*1*2") {


            response = "Transfer For -:-<br><br>"
            response += "1. Self<br>"
            response += "2. Another MoMo Account"


            response += "<br><br>00 Back"
            response += "<br>0 Exit"
            closeOropenSession = 1;

        }


        // Enter amount to send to disbursememt

        if ((text.indexOf('2*1*') !== -1) && (text.length === 7) && (text.slice(6) !== "2")) {

            response = "Enter Amount To Transfer -:-<br><br>"

            response += "00. Back<br>";
            response += "0. Exit";

            closeOropenSession = 1

        }

        if ((text.indexOf('2*1*') !== -1) && (text.length === 7) && (text.slice(6) === "2") && (text.slice(0, 3) !== "2*2")) {


            response = "Enter MoMo Account -:- <br><br>"
            response += "00. Back<br>";
            response += "0. Exit";
            closeOropenSession = 1;

        }

        // Prompt Enter amount to transfer
        if ((text.length === 16) && (text.indexOf('2*1*') !== -1)) {

            let transferContact = text.slice(8, 16)
            let numberStatus
            //check if number is registred with mtn
            await token.token().then(async (data) => {

                let token = data.data

                //get a token then use it to make request
                await collections.momoStatus(token["access_token"], "268" + transferContact).then(status => {

                    numberStatus = status.data["result"]

                }).catch(err => {
                    console.log(err.message)
                })

            }).catch((err) => {
                console.log(err.message)
            })

            if (numberStatus === true) {


                response = "Confirm MoMo Account<br>"
                response += transferContact

                response += ".<br><br>"
                response += "1. YES<br>"

                response += "<br>00. Back<br>";
                response += "0. Exit";
                closeOropenSession = 1;

            } else {

                response = "Number has no Mtn MoMo"
                response += "<br><br>00. Back<br>";
                response += "0. Exit";
                closeOropenSession = 1;

            }





        }

        // sending money to a third party user
        if (((text.indexOf('2*1*') !== -1)) && (text.length === 18)) {

            response = "Enter Amount"

            response += "<br><br>00. Back<br>";
            response += "0. Exit";
            closeOropenSession = 1

        }


        // Send momo to another number

        if ((text.indexOf('2*1*') !== -1) && (text.length >= 20)) {

            closeOropenSession = 0

            let amount = text.slice(19)

            let thirdPartyContact = "268" + text.slice(8, 16)

            let accountNo
            let accountBalanceMusoni = 0
            let productName = ""

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
                productName = el["data"]["savingsProductName"]

            }).catch(err => {

                console.log(err.message)

            })

            // check if account has enough amount to perform task

            // also check after applying a charge the remaining balance should be greate than the minimum amount of available amount in an account

            // accountBalanceMusoni < amount

            let totalCharged = parseFloat(disbursment.disbursememtCharge(amount)) + parseFloat((amount))

            if ((!(disbursment.canWithDraw(productName, totalCharged, accountBalanceMusoni)))) {

                response = "SCBS -:-<br><br>You have insufficient funds."

                closeOropenSession = 0;

            } else {

                //generate an uxxd 
                await disbursementHeader.token().then(async neWtoken => {

                    let token = neWtoken.data["access_token"]

                    // check if customer has enough money in his savings acccount

                    //create uxxID
                    uuID = uuid.v4();

                    await disbursment.requestToTransfer(uuID, token, amount, thirdPartyContact).then(async payRes => {

                        //check status
                        if (payRes["status"] === 202) {

                            //save request to pay details
                            await disbursment.saveDisbursmentRequest(token, uuID, amount, thirdPartyContact, accountNo, phoneNumber)
                            // phoneNumber is a contact 


                            response = "Transfer Has Been Made."
                            closeOropenSession = 0

                        } else {

                            response = "Failed To Make Transfer."
                            closeOropenSession = 0
                        }

                    }).catch((err) => {

                        console.log(err.message)

                    })
                })
            } // end of transfer functions 

        }

        //after amount was entered  // disbursement panel

        if ((text.indexOf('2*1*') !== -1) && (text.length > 9) && (text.indexOf("2*2") === -1) && (text.slice(6) !== "1") && (text.length < 16) && (text.slice(5, 7) !== "*2")) {


            closeOropenSession = 0

            let amount = text.slice(8)

            let accountNo
            let accountBalanceMusoni = 0
            let productName = ""

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
                productName = el["data"]["savingsProductName"]

            }).catch(err => {

                console.log(err.message)

            })

            // check if account has enough amount to perform task

            // also check after applying a charge the remaining balance should be greate than the minimum amount of available amount in an account

            // accountBalanceMusoni < amount

            let totalCharged = parseFloat(disbursment.disbursememtCharge(amount)) + parseFloat((amount))

            if ((!(disbursment.canWithDraw(productName, totalCharged, accountBalanceMusoni)))) {

                response = "SCBS -:-<br><br>You have insufficient funds."

                closeOropenSession = 0;

            } else {

                //generate an uxxd 
                await disbursementHeader.token().then(async neWtoken => {

                    let token = neWtoken.data["access_token"]

                    // check if customer has enough money in his savings acccount

                    //create uxxID
                    uuID = uuid.v4();

                    await disbursment.requestToTransfer(uuID, token, amount, phoneNumber).then(async payRes => {

                        //check status
                        if (payRes["status"] === 202) {

                            //save request to pay details
                            await disbursment.saveDisbursmentRequest(token, uuID, amount, phoneNumber, accountNo, "12345678")

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

                    response = "Select Acc -:- <br><br>";

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
                        response += count + ". " + el["shortProductName"] + "  " + el["accountNo"] + "<br>E" + accountBalance + "<br>";

                        // save accounts that can be used to make a transfer
                        tempAccounts.push({ "accountNo": el["accountNo"], row: count })

                    });


                    tempAccounts.forEach(async el => {
                        //callfunction to save into database the list of accounts

                        await account.storeSelectedAccount(sessionId, el["accountNo"], text, el["row"])

                    });



                    //response += "<br>Enter Acc No.<br><br>";
                    response += "<br>00. Back<br>";
                    response += "0. Exit";

                    closeOropenSession = 1

                }).catch(err => {
                    console.log(err)
                })
            })
        }


        //transfer money in mobile money
        if ((text.indexOf('2*2*') !== -1) && (text.length === 5)) {

            response = "Enter Amount To Transfer -:-<br>"

            response += "<br>00. Back";
            response += "<br>0. Exit";

            closeOropenSession = 1

        }


        //transfer amount entered to make the transfer
        if ((text.slice(0, 4) === "2*2*") && (text.length > 5) && (text.length < 16)) {

            //CALL FUNCTION TO MAKE A TRANSFER FROM MOMO TO MY SAVINGS


            let accountNo
            let amount = text.slice(6)

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



                    if (data["status"] !== undefined) {

                        if (data["status"] === 202) {

                            //response = "Please make an approvals"

                            // store in database

                            await collections.saveRequestTransaction(token["access_token"], uuID, amount, phoneNumber, accountNo).then(async (dt) => {

                                if (dt["affectedRows"] === 1) {

                                    response = "SCBS -:- <br><br>Please make an approval from your MoMo account."
                                    closeOropenSession = 0

                                } else {

                                    response = "SCBS -:-<br>Failed to make transfer."
                                    closeOropenSession = 0

                                }


                            }).catch(err => {

                                console.log(err.message)

                            })

                        } else {

                            response = "SCBS -:- Failed to make transfer. Please check if you have enough money."
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
            var loansAcc = []

            await account.getClientAccount(contact).then(async (data) => {

                let clientNumber; // customer CFI

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

                    if (resAccounts.data.loanAccounts !== undefined) {

                        //loanAccounts
                        loansAcc = resAccounts.data.loanAccounts.filter((loan) => {

                            if ((loan.status.value === "Active") || (loan.status.value === "Restructured")) {
                                return true
                            }
                            return false
                        })

                    }
                    // display accounts to the customer

                    response = "My Accounts -:-<br><br>";
                    response += "Savings<br>"
                    let tempAccounts = []
                    let count = 0

                    activeAccounts.forEach(el => {

                        count = count + 1
                        response += count + ". " + el["shortProductName"] + "  " + el["accountNo"] + "<br>"

                        tempAccounts.push({ "accountNo": el["accountNo"], row: count, isLoan: 0 })

                    });

                    if (resAccounts.data.loanAccounts !== undefined) {

                        response += "<br>Loans<br>"

                        loansAcc.forEach(el => {

                            count = count + 1

                            response += count + ". " + el["shortProductName"] + "  " + el["accountNo"] + "<br>"

                            tempAccounts.push({ "accountNo": el["accountNo"], row: count, isLoan: 1 })

                        })
                    }

                    // we need to store 
                    tempAccounts.forEach(async el => {
                        //callfunction to save into database the list of accounts

                        await account.storeSelectedAccount(sessionId, el["accountNo"], text, el["row"], el["isLoan"])

                    });




                }).catch(err => {
                    console.log(err)
                })

                response += "<br>Select Acc No ";
                response += "<br><br>00. Back";
                response += "<br>0. Exit";

                closeOropenSession = 1

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

                let isLoan = 0

                let accountFound

                await account.getSelectedAccount(preSelected, sessionId, row).then(dt => {

                    dt.forEach(el => {

                        accountFound = el["accountNo"]
                        isLoan = el["isLoan"]

                    })

                })

                if (isLoan === 1) {

                    await loans.prePayment(accountFound).then(dat => {

                        response = "My Loan Details -:-<br><br>"
                        response += "Loan Amount: E " + dat.data["summary"]["principalDisbursed"]
                        response += "<br>Arreas Amount: E " + dat.data["summary"]["totalOverdue"]
                        response += "<br>Current Balance: E " + dat.data["foreClosureData"]["totalForeClosureAmount"]
                        response += "<br>Total Outstanding: E " + dat.data["summary"]["totalOutstanding"]

                        response += "<br><br>00. Back<br>"
                        response += "0. Exit";

                        closeOropenSession = 1

                    })

                }

                if (isLoan === 0) {

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

                        response = "My Account Info:<br>"//<br>Deposits: E" + this.totaldeposists + "<br>" //Withdrawals: E" + this.totalWithdrawals + "<br>"
                        //response += "Interest: E " + this.totalInterestPosted + "<br>"
                        response += "<br>Balance E " + this.accountBalance + "<br><br>"
                        response += "00. Back<br>"
                        response += "0. Exit";

                        closeOropenSession = 1
                    })

                }//end of a savings account info


            } catch (err) {
                console.log(err.message)
            }
        }


        //need a way to dertemine if we are closing the or the request is still open

        if (response === "NULL") {

            response = "Wrong Input Field Was Entered:<br><br>Menu -:- <br>1. My Accounts<br>2. MoMo <br>3. Utilities <br>4. Prepaid   <br>5. Settings <br><br>0. Exit";

            await customer.updateInputSession(phoneNumber.slice(3), sessionId, dbText.slice(0, 11)).then(dtt => {
                //console.log(dtt)
            })

            closeOropenSession = 1

        }



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

    await customer.saveClientNumbers(req.body.cfi, req.body.name, req.body.contact, 1).then((data) => {

        if (data["affectedRows"] > 0) {

            res.json({ message: "saved" })

        } else {

            res.json({ message: "failed" })

        }
    })

})

//from client app check if number of client match the one in Musoni
//status
router.get('/checkmomoappnumber', async (req, res) => {

    let number = "268" + req.query.number

    await token.token().then(async (data) => {

        let token = data.data

        //get a token then use it to make request
        await collections.momoStatus(token["access_token"], number).then(status => {

            res.json({
                status: status.data["result"],
                phone: number
            })

        }).catch(err => {
            console.log(err.message)
        })

    }).catch((err) => {
        console.log(err.message)
    })

})

// transfer to account on app from momo
router.post("/clientappmomorequesttopay", async (req, res) => {
    /*
    //expects a json format data
    
    let accountNo = req.body.account
    let amount = req.body.amount
    let cellphone = req.body.cellphone
    
    
    
    //deposit to this account
    uuID = uuid.v4();
    
    
    await token.token().then(async (data) => {
        
        let token = data.data
        
        //get a token then use it to make request
        
        await collections.requestToPay(uuID, token["access_token"], amount, cellphone).then(async (data) => {
            
            //console.log(data)
            
            if (data["status"] !== undefined) {
                
                if (data["status"] === 202) {
                    
                    //response = "Please make an approvals"
                    
                    // store in database
                    
                    await collections.saveRequestTransaction(token["access_token"], uuID, amount, cellphone, accountNo).then(async (dt) => {
                        
                        if (dt["affectedRows"] === 1) {
                            
                            res.json({ message: "transfered" })
                        
                        } else {
                            res.json({ message: "failed" })
                        
                        }
                    
                    
                    }).catch(err => {
                        
                        console.log(err.message)
                    
                    })
                
                } else {
                    res.json({ message: "failed" })
                }
            
            }
        
        
        }).catch((err) => {
            
            console.log(err)
        
        })
    
    
    }).catch((err) => {
        
        console.log(err)
    
    })
    
    */
})

// transfer funds to momo account
router.post("/sendmoneytomomo", async (req, res) => {

    //check balance 

    //{ cellphone: '26876431551', amount: 10, account: '000004192' }
    /*
    let amount = req.body.amount
    let phoneNumber = req.body.cellphone
    let accountNo = req.body.account
    
    await disbursementHeader.token().then(async neWtoken => {
        
        let token = neWtoken.data["access_token"]
        
        // check if customer has enough money in his savings acccount
        
        //create uxxID
        uuID = uuid.v4();
        
        await disbursment.requestToTransfer(uuID, token, amount, phoneNumber).then(payRes => {
            
            //check status
            if (payRes["status"] === 202) {
                
                //save request to pay details
                disbursment.saveDisbursmentRequest(token, uuID, amount, phoneNumber, accountNo , "12345678")
                
                res.json({ "message": "transfred" })
            
            } else {
                res.json({ "message": "failed" })
            }
        
        
        }).catch((err) => {
            console.log(err.message)
        })
    })
    */

})



//check status of transfer

setInterval(async () => {

    try {

        let newDate = time.getTime().slice(0, 10)

        //get saved disbursement details
        await disbursment.getTransferStatus().then(async data => {


            if (data.length > 0) {

                let xxid
                let token
                let accountNo
                let amount
                let phone
                let No
                let thirdpartyNumber

                data.forEach(values => {

                    xxid = values["xxid"]
                    token = values["token"]
                    accountNo = values["accountNo"]
                    amount = values["amount"]
                    phone = values["phone"]
                    No = values["No"]
                    thirdpartyNumber = values["thirdpartyNumber"]

                })


                //let status = dt.data["status"]
                await disbursment.transferStatus(xxid, token).then(async status => {

                    if (status === undefined) {
                        return
                    }

                    //check 
                    if (status.data["status"] === "FAILED") {

                        // update database when the transaction failed    
                        await disbursment.updateTransferRequest(2, token, xxid)

                    }

                    //check if the trasaction was a successs
                    if (status.data["status"] === "SUCCESSFUL") {

                        //update database to show that request was succesfully
                        await disbursment.updateTransferRequest(1, token, xxid)

                        //send sms to client

                        let message
                        let thirdpartyMessage

                        if (thirdpartyNumber !== "12345678") {

                            thirdpartyMessage = "You have received SZL" + amount + " MTN MoMo from " + thirdpartyNumber + " at " + time.getTime() + ". Ref: SCBS" + No + " Contact Center: 24171975"
                            //You have received SZL480.00-MTN MoMo from 7612 9356 Transaction ID: SCBS 2334556 on 10/10/23 12:34:28 helpline 2417 1975
                            message = "Your Acc xxx" + accountNo.slice(5) + " has been debited with SZL" + amount + " on " + time.getTime() + ". Ref: " + No + " Contact Center: 24171975"
                        } else {
                            message = "Your Acc xxx" + accountNo.slice(5) + " has been debited with SZL" + amount + " on " + time.getTime() + ". Ref: " + No + " Contact Center: 24171975"
                        }



                        //withdraw from Musoni
                        await disbursment.makeWithdrawal(amount, accountNo, phone, time.myDate(newDate)).then(async wdata => {

                            //console.log(wdata)
                            if (wdata.data !== undefined) {
                                //console.log(wdata.data)

                                // withdraw from the 000004257
                                await disbursment.makeWithdrawal(amount, "000004257", phone, time.myDate(newDate)).then(indata => {

                                    if (indata.data !== undefined) {
                                        //console.log(wdata.data)
                                    }

                                }).catch(err => {
                                    console.log(err.message)
                                })


                                // sending sms to third party customer
                                if (thirdpartyNumber !== "12345678") {

                                    await sms.sendMessage(phone, thirdpartyMessage)   //phone is for third party since we saved as the contact it was directed to
                                    await sms.sendMessage(thirdpartyNumber, message)

                                } else {

                                    await sms.sendMessage(phone, message)

                                }


                                //post sms charge
                                await sms.smsCharge(accountNo, time.myDate(newDate)).then(async paySms => {

                                    // pay sms charge
                                    let data = paySms.data
                                    let resourceID = data["resourceId"]

                                    //pay sms charge
                                    await disbursment.payCharge(accountNo, resourceID, 0.95, time.myDate(newDate)).then(tt => {
                                        //console.log(tt)
                                    })
                                })
                            }


                            //create momo charge
                            await disbursment.payMoMoCharge(accountNo, disbursment.disbursememtCharge(parseFloat(amount).toFixed(2)), time.myDate(newDate)).then(async payMoMo => {

                                let data = payMoMo.data

                                var resourceID = data["resourceId"]

                                // pay charge created
                                await disbursment.payCharge(accountNo, resourceID, disbursment.disbursememtCharge(parseFloat(amount)).toFixed(2), time.myDate(newDate)).then(tt => {

                                    //console.log(tt)

                                })
                            })

                        }).catch(err => {
                            console.log(err.message)
                        })
                    }
                }).catch(err => {
                    console.log(err.message)
                })
            }  //testing what we get from the database
        })

    } catch (error) {
        console.log(error.message)
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
                let No = 0

                data.forEach(values => {

                    xxid = values["xxid"]
                    token = values["token"]
                    accountNo = values["accountNo"]
                    amount = values["amount"]
                    phone = values["phone"]
                    No = values["No"]

                })


                await collections.paymentStatus(xxid, token).then(async (dt) => {

                    //CHECKING IF WE HAVE DATA

                    let status = dt.data["status"]

                    if (status === 'FAILED') {
                        await collections.updatepaymentRequest(2, token, xxid)
                    }


                    if (status === 'SUCCESSFUL') {

                        // 1 means transaction was succesfully
                        await collections.updatepaymentRequest(1, token, xxid)

                        // make a deposit to mula account
                        await collections.makeDeposit(amount, '000004258', phone, time.myDate(newDate))

                        await collections.makeDeposit(amount, accountNo, phone, time.myDate(newDate)).then(async data => {

                            // sms from status after a succesfully transaction
                            let smsAccount = accountNo
                            accountNo = accountNo.replace(/00000/, 'xxxxx')

                            //let message = 'SCBS -:- A Credit of E' + amount + ' has been made to Acc ' + accountNo + ' on ' + time.getTime() + ''

                            let message = "Your Acc xxx" + accountNo.slice(5) + " has been credited with SZL" + amount + " on " + time.getTime() + ". Ref: " + No + " Contact Center: 24171975"


                            await sms.sendMessage(phone, message)

                            await sms.smsCharge(smsAccount, time.myDate(newDate)).then(async paySms => {

                                //pay sms charge
                                await disbursment.payCharge(smsAccount, paySms["data"]["resourceId"], 0.95, time.myDate(newDate)).then(tt => {

                                    console.log(tt.data)

                                })
                            })
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

}, 5000)

module.exports = router