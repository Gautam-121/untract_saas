const express = require("express")
const router = express.Router()
const {authenticate,authorize}=require('../middlewares/auth.js');
const branding = require("../controllers/branding.controller.js")
const validation = require("../validations/branding.validation.js")
const { uploadAdminConfig, handleMulterError } = require("../middlewares/multer.middleware.js")

router.route("/").post( 
    authenticate,
    authorize(['CUSTOMER']),
    uploadAdminConfig.fields([
        {
            name: "logo",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount:1
        },
    ]),
    handleMulterError,
    validation.create,
    branding.create
) 

router.route("/").get(authenticate, authorize(["CUSTOMER"]) , branding.get); 

router.route("/update/details").put(
    authenticate,
    authorize(["CUSTOMER"]),
    validation.update,
    branding.update
); 

router.route("/update/coverImage").patch( 
    authenticate, 
    authorize(['CUSTOMER']) , 
    uploadAdminConfig.single("coverImage"),
    handleMulterError,
    branding.updateCoverImage
)

router.route("/update/logo").patch( 
    authenticate, 
    authorize(['CUSTOMER']) , 
    uploadAdminConfig.single("logo"),
    handleMulterError,
    branding.updateLogo
) 


module.exports = router
