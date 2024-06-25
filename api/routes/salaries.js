const express = require("express")
const router = express.Router()
const salaries = require("../modal/salaries")

//save pending salaries
router.post("/save", async (req, res) => {

    let data = req.body.data

    await salaries.saveSalaries(data.fileContent, data.processingTime).then(dataRes => {
        console.log(dataRes)
        res.status(201).json(dataRes)

    }).catch(err => {
        console.log(err.message)
    })

})

//get pending salaries
router.get("/pending", async (req, res) => {

    await salaries.pendingPayments().then(data => {
        res.status(200).json(data)
    })

})

router.delete("/:value", async (req, res) => {

    //console.log(req.params.value)
    await salaries.deletePendingPayment(req.params.value).then(data => {

        if (data.affectedRows === 1) {
            res.json({ "message": "deleted" })
        } else {
            res.json({ "message": "failed" })
        }
    })

})


module.exports = router