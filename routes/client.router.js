const express = require("express")
const client = require("../controllers/client.controller");
const router = express.Router()
const {authenticate} = require("../middlewares/auth.js")

const validation = require("../validations/client.validation.js")

router.route("/auth/:id").post( validation.register , client.registerAndLogin) 

router.route("/social/auth/:id").post( validation.socialLogin , client.socialLogin) 

router.route("/verify-otp/:id").post( validation.verifyOtp , client.verifyOtp) 

router.route("/analytic/feedback/:videoId").post(  client.storeFeedback) 

router.route("/feedback/campaign/:id").get(  authenticate , validation.getFeedBack ,  client.getFeedBack ) 

router.get("/campaign/:id" , authenticate ,  validation.getCampaign , client.getCampaign ) // checked  -- logicalIssue

router.route("/branding/:id").get( validation.getBranding , client.getBranding )



module.exports = router