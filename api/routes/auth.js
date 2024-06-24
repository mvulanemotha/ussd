const express = require('express')
const router = express.Router()
const auth = require("../modal/auth")

//auth user
router.post("/", async (req, res) => {


    await auth.authUser(req.body.username, req.body.password).then((data) => {

        if (data.status === 200) {
            res.json({ "message": "logged" })
        } else {
            res.json({ "message": "failed" })
        }

    }).catch(err => {

        res.json({ "message": "failed" })

    })

})


module.exports = router;