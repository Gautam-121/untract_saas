const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.js");
const campaign = require("../controllers/campaign.controller.js");
const validation = require("../validations/campaign.validation.js");
const {
  uploadThumbnail,
  uploadVideos,
  uploadVideMiddleware,
  handleThumbnailMiddleware,
} = require("../middlewares/multer.middleware.js");

router.post(
  "/upload/media",
  authenticate,
  authorize(["CUSTOMER"]),
  uploadVideos.single("video"),
  uploadVideMiddleware,
  campaign.uploadVideo
);

router.post(
  "/upload/thumbnail",
  uploadThumbnail.single("thumbnail"),
  handleThumbnailMiddleware,
  campaign.uploadThumb
);

router.post(
  "/upload/multipleMedia",
  authenticate,
  authorize(["CUSTOMER"]),
  uploadVideos.any(),
  validation.create,
  campaign.create
);

router.get("/getAllVideo",
  authenticate,
  authorize(["CUSTOMER"]),
  validation.getAll,
  campaign.getAll
);

router.get(
  "/getVideoById/:id",
  authenticate,
  authorize(["CUSTOMER"]),
  validation.getById,
  campaign.getById
);

router.put(
  "/updateVideo/:id",
  authenticate,
  authorize(["CUSTOMER"]),
  uploadVideos.any(),
  validation.update,
  campaign.update
);

router.delete(
  "/deleteVideo/:id",
  authenticate,
  authorize(["CUSTOMER"]),
  validation.delete,
  campaign.delete
);

router.put(
  "/update/shared/:id",
  authenticate,
  authorize(["CUSTOMER"]),
  validation.updateShared,
  campaign.updateShared
);

router.get(
  "/analytic/feedback/:id",
  authenticate,
  authorize(["CUSTOMER"]),
  validation.getAnalytic,
  campaign.getAnalytic
);

router.get(
  "/analytic/feedback/summary/:id",
  authenticate,
  authorize(["CUSTOMER"]),
  validation.summery,
  campaign.summery
);

module.exports = router;
