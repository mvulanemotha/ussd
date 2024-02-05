const db = require("../../db/database");
const headers = require("../modal/disburstmentHeader");
const headersMusoni = require("./header");
const dotenv = require("dotenv");
const { default: axios } = require("axios");
dotenv.config();

//get balance of client

let requestToTransfer = async (uuid, token, amount, msisdn) => {
  try {
    let data = {
      amount: amount,
      currency: "SZL",
      externalId: "234284587",
      payee: {
        partyIdType: "MSISDN",
        partyId: msisdn,
      },
      payerMessage: "SCBS MOMO TRANSFER",
      payeeNote: "SCBS MOMO TRANSFER",
    };

    return await axios({
      method: "post",
      url: "https://proxy.momoapi.mtn.com/disbursement/v1_0/transfer",
      withCredentials: true,
      crossdomain: true,
      headers: headers.apiCallsHeader(uuid, token),
      data: data,
    });
  } catch (error) {
    console.log(error);
  }
};

// make a deposit
let makeWithdrawal = async (amount, accountNo, phoneNumber, withdrawalDate) => {
  try {
    //let url = 'https://api.live.irl.musoniservices.com/v1/'

    let data = {
      locale: "en",
      dateFormat: "dd MMMM yyyy",
      transactionDate: withdrawalDate,
      transactionAmount: amount,
      paymentTypeId: 223,
      accountNumber: accountNo,
      receiptNumber: "Withdrawal by " + phoneNumber + " Momo Account",
      bankNumber: "SCBS",
    };

    return await axios({
      method: "post",
      url:
        process.env.url +
        "savingsaccounts/" +
        accountNo +
        "/transactions?command=withdrawal",
      withCredentials: true,
      crossdomain: true,
      headers: headersMusoni.headersMusoni(),
      data: data,
    });
  } catch (error) {
    console.log(error);
  }
};

// store a disbursement request

let saveDisbursmentRequest = async (
  token,
  xxid,
  amount,
  phone,
  accountNo,
  thirdpartyNumber
) => {
  try {
    return await new Promise((resolve, reject) => {
      let query =
        "insert into disbursmentrequest(token , xxid , amount, phone , accountNo , thirdpartyNumber ) select ?,?,?,?,?,? where not exists (select xxid from disbursmentrequest where xxid = ? limit 1) ";

      db.query(
        query,
        [token, xxid, amount, phone, accountNo, thirdpartyNumber, xxid],
        (err, result) => {
          if (err) {
            return reject(err);
          }

          return resolve(result);
        }
      );
    });
  } catch (error) {
    console.log(error.message);
  }
};

//get data from database to get payment status
let getTransferStatus = async () => {
  try {
    return await new Promise((resolve, reject) => {
      let query = "select * from disbursmentrequest where status = 0 limit 1";

      db.query(query, [], (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result);
      });
    });
  } catch (error) {
    console.log(error);
  }
};

// update database to a failed response
let updateTransferRequest = async (status, token, xxid) => {
  try {
    return await new Promise((resolve, reject) => {
      let query;

      //succesfully
      if (status === 1) {
        query =
          "update disbursmentrequest set status = 1 where token = ? and xxid = ? limit 1";
      }

      //failed request
      if (status === 2) {
        query =
          "update disbursmentrequest set status = 2 where token = ? and xxid = ? limit 1";
      }

      db.query(query, [token, xxid], (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result);
      });
    });
  } catch (error) {
    console.log(error);
  }
};

// check status
let transferStatus = async (xreference, token) => {
  try {
    return await axios({
      method: "get",
      url:
        "https://proxy.momoapi.mtn.com/disbursement/v1_0/transfer/" +
        xreference,
      withCredentials: true,
      crossdomain: true,
      headers: headers.apiCallsHeader(xreference, token),
    });
  } catch (error) {
    //console.log(error)
  }
};

// calculate charge
let disbursememtCharge = (amount) => {

  try {
    if (amount > 4000) {
      return (1.2 / 100) * amount;
    }

    if (amount <= 250) {
      return 10;
    }

    if (amount > 250 && amount <= 500) {
      return 15;
    }

    if (amount > 500 && amount <= 750) {

      return 17;
    }

    if (amount > 750 && amount <= 1200) {
      return 22;
    }

    if (amount > 1200 && amount <= 2200) {
      return 32;
    }

    if (amount > 2200 && amount <= 4000) {
      return 48;
    }
  } catch (error) {
    console.log(error.message);
  }
};

// check if minimum amount is left on the account
let canWithDraw = (productName, withdrawnAmount, accountBalance) => {

  console.log(withdrawnAmount + "Testing")

  withdrawnAmount = parseFloat(withdrawnAmount)

  let availableBalance = 0.0;

  if (productName === "Bronze Savings") {

    availableBalance = accountBalance - withdrawnAmount;

    if (availableBalance >= 300) {
      return true;
    } else {
      return false;
    }
  }

  if (productName === "Silver Savings") {

    availableBalance = accountBalance - withdrawnAmount;

    if (availableBalance >= 500) {
      return true;
    } else {
      return false;
    }
  }

  if (productName === "Golden Savings") {

    availableBalance = accountBalance - withdrawnAmount;

    if (availableBalance >= 1000) {
      return true;
    } else {
      return false;
    }
  }

  if (productName === "Mula Account") {

    availableBalance = accountBalance - withdrawnAmount;

    if (availableBalance >= 0) {
      return true;
    } else {
      return false;
    }
  }
};

let payMoMoCharge = async (clientAccount, amount, date) => {
  try {
    var data = {
      chargeId: 20,
      locale: "en",
      amount: amount,
      dateFormat: "dd MMMM yyyy",
      dueDate: date,
    };

    return await axios({
      method: "post",
      url: process.env.url + "savingsaccounts/" + clientAccount + "/charges",
      withCredentials: true,
      crossdomain: true,
      data: data,
      headers: headersMusoni.headersMusoni(),
    });
  } catch (error) {
    console.log(error);
  }
};

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
      url:
        process.env.url +
        "savingsaccounts/" +
        accountNo +
        "/charges/" +
        chargeid +
        "?command=paycharge",
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

// maximum amount that can be withdrawn

let maxDisbursment = (amount) => {
  if (amount > 5000) {
    return true;
  } else {
    return false;
  }
};

module.exports = {
  maxDisbursment,
  canWithDraw,
  payMoMoCharge,
  payCharge,
  disbursememtCharge,
  makeWithdrawal,
  requestToTransfer,
  saveDisbursmentRequest,
  updateTransferRequest,
  getTransferStatus,
  transferStatus,
};
