const express = require('express')
const customer = require('../modal/customers')
const router = express.Router()
const account = require('../modal/accounts')
const ussdR = require('ussd-router')


//REGISTER IF NOT REGISTRED
router.get('/', async (req, res) => {
    
    var response = "Comming soon :)";
    
    try {
        
        
        let phoneNumber = req.query.Msisdn
        let text = req.query.input
        let sessionId = req.query.sessionID
        let newrequest = req.query.newrequest
        
        let dbText = ""
        
        // get functions to help track our progress
        
        //getSessionDeatails, updateInputSession, addNewsession
        
        
        // if newrequest === 0 then its a new request
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
        
        console.log(text)
        
        text = ussdR.ussdRouter(text)
        
        let contact = phoneNumber.slice(3)
        
        if (text == "") {
            
            //check if user is registered
            await customer.isCustomer(contact).then((data) => {
                
                let customer_name;
                let attempts;
                
                // checking if there we recods found in the database
                if (data.length > 0) {
                    
                    data.forEach(el => {
                        customer_name = el["name"]
                        attempts = el['attempts']
                    });
                    
                    if (attempts < 3) {
                        
                        response = "SCBS:)<br>Welcome " + customer_name + "<br>Enter your pin:";
                        closeOropenSession = 1
                    } else {
                        response = `SCBS:)Please note user account has been locked.`;
                        closeOropenSession = 0
                    }
                
                } else {
                    response = "Welcome to SCBS please contact 24171975 for more info.";
                    closeOropenSession = 0
                }
            })
        
        } else if ((text !== "") && (text.indexOf('*') === -1)) {
            
            //auth logged in user
            
            await customer.login(contact, text).then(data => {
                
                if (data.length > 0) {
                    
                    //reset loggin attempts to zero incase there was a failed login
                    customer.resetLoginAttempts(contact)
                    
                    response = "Menu:<br>1. My Accounts<br>2. Mobile Money<br><br>00. Exit";
                    closeOropenSession = 1
                
                } else {
                    
                    //update status of being locked
                    customer.updateFailedLogins(contact)
                    
                    // get loggin attempts
                    response = `SCBS:) Failed to login, you will be locked out.`;
                    closeOropenSession = 0
                }
            })
        
        
        } else if (text == '1*0') { //Have viewed my products now i want to view see my menu again
            
            response = "Menu:<br>1. My Accounts<br>2. Mobile Money<br><br>00. Exit";
            
            closeOropenSession = 1
        
        } else if ((text.indexOf('*2') !== -1) && (text.indexOf('*2*1') === -1) && (text.indexOf('*2*2') === -1)) { // viewing mtn momo
            
            response = "Transfer:<br>"
            response += "1. From Savings<br>2. To Savings<br><br>00. Back<br>0. Exit";
            closeOropenSession = 1
        }
        
        if (text.indexOf('2*1') !== -1) { // get money from savings account to mobile money
            
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
                    
                    response = "Select Acc No:<br>";
                    
                    let count = 0
                    let accountBalance = 0
                    
                    activeAccounts.forEach(el => {
                        
                        
                        if (el["accountBalance"] === undefined) {
                            accountBalance = 0
                        } else {
                            accountBalance = el["accountBalance"]
                        }
                        
                        count = count + 1
                        response += el["accountNo"] + " E" + accountBalance + "<br>"
                    
                    });
                    
                    response += "<br>Acc No/Amount<br>";
                    response += "00. Back<br>";
                    response += "0. Exit";
                    
                    closeOropenSession = 1
                
                }).catch(err => {
                    console.log(err)
                })
            })
        
        }
        
        if ((text.indexOf('*2*2') !== -1)) {  // from momo account to savings account
            
            
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
                    
                    response = "Select Acc No: <br>";
                    
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
                    
                    response += "<br>Acc No/Amount<br>";
                    response += "00. Back<br>";
                    response += "0. Exit";
                    
                    closeOropenSession = 1
                
                }).catch(err => {
                    console.log(err)
                })
            })
        
        
        }
        
        if ((text.indexOf('*1') !== -1) && (text.indexOf('*1*') === -1)) {   //// if 1 from menu is selected
            
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
                    
                    response = "My Accounts:<br>";
                    
                    let count = 0
                    activeAccounts.forEach(el => {
                        count = count + 1
                        response +=  el["accountNo"] + "<br>"
                    
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
        
        if (text.indexOf('*1*') !== -1) {  // view account deatails
            
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
                    
                    response = "Acc Info:<br>Deposits: E" + this.totaldeposists + "<br>" //Withdrawals: E" + this.totalWithdrawals + "<br>"
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

module.exports = router