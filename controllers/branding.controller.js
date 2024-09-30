const ErrorHandler = require("../utils/errorHandler.js");
const asyncHandler = require("../utils/asyncHandler.js");
const removeUploadedFiles = require("../utils/removeUploadedFile.js")
const { validationResult } = require("express-validator")
const db = require("../db/dbConnection.js");
const Customer = db.customers;
const Branding = db.brandings
const fs = require("fs")

exports.create = asyncHandler(async (req, res, next) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      removeUploadedFiles(req.files);
      return res.status(400).json({ success: false, error: errors.array({ onlyFirstError: true }) });
    }

    const user = await Customer.findByPk(req.decodedToken.obj.obj.id, {
      include: [
        { model: db.subscriptions, as: "subscriptions",},
      ],
    });

    if (!user) {
      removeUploadedFiles(req.files); 
      return next(new ErrorHandler("customer not found", 400));
    }

    if (!user.isTrialActive) {
      const activeSubscriptions = user.subscriptions
        .filter(plan => new Date(plan.startDate) <= new Date() && new Date(plan.endDate) >= new Date());

      if (activeSubscriptions.length === 0) {
        removeUploadedFiles(req.files); 
        return next(new ErrorHandler("Please renew your subscription plan. Your current subscription is expired.", 400));
      }
    } else if (user.isTrialActive && user.trialEndDate < new Date()) {
      removeUploadedFiles(req.files); 
      return next(new ErrorHandler("Your trial is expired, Please renew your plan", 400));
    }

    const branding = await Branding.findOne({where:{customerId:req.decodedToken.obj.obj.id}})

    if (branding) {
      removeUploadedFiles(req.files); 
      return next(new ErrorHandler("Branding already exists", 409));
    }

    if (!(req.files && req.files.logo && req.files.logo[0].path)) {
      removeUploadedFiles(req.files); 
      return next(new ErrorHandler("Logo is required and must be a file.", 400));
    }

    if (!(req.files && req.files.coverImage && req.files.coverImage[0].path)) {
      removeUploadedFiles(req.files); 
      return next(new ErrorHandler("Cover image is required and must be a file.", 400));
    }

    const brandings = await Branding.create({
      brandName: req.body.brandName.trim(),
      description: req.body.description.trim(),
      logo: req.files.logo[0].filename,
      url: req.body?.url,
      coverImage: req.files.coverImage[0].filename,
      customerId: user.id,
    });

    return res.status(201).json({
      success: true,
      message: "AppBranding created successfully",
      data: brandings,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message , 500));
  }
});

exports.get = asyncHandler(async (req, res, next) => {
  try {

    const branding = await Branding.findOne({
      where: {
        customerId: req.decodedToken.obj.obj.id ,
      },
    });

    if (!branding) {
      return next(new ErrorHandler("Branding is not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Data sent successfully",
      data: branding,
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.update = asyncHandler(async (req, res, next) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) 
      return res.status(400).json({ success: false, error: errors.array({ onlyFirstError: true }) });

    const user = await Customer.findByPk(req.decodedToken.obj.obj.id, {
      include: [
        { model: db.subscriptions, as: "subscriptions" },
      ],
    });

    if (!user){
      return next(new ErrorHandler("customer not found", 400));
    }
      
    if (!user.isTrialActive) {
      const activeSubscriptions = user.subscriptions.filter(plan => 
        new Date(plan.startDate) <= new Date() && new Date(plan.endDate) >= new Date()
      );

      if (activeSubscriptions.length === 0) 
        return next(new ErrorHandler("Please renew your subscription plan. Your current subscription is expired.", 400));
    } 
    else if (user.isTrialActive && user.trialEndDate < new Date()) {
      return next(new ErrorHandler("Your trial is expired, Please renew your plan", 400));
    }

    const branding = await Branding.findOne({where:{customerId: req.decodedToken.obj.obj.id}})

    if (!branding) {
      return next(new ErrorHandler("Branding is not found", 404));
    }

    const updateFields = {};
    if (req.body.brandName !== undefined) updateFields.brandName = req.body.brandName.trim();
    if (req.body.description !== undefined) updateFields.description = req.body.description.trim();
    if (req.body.url !== undefined) updateFields.url = req.body.url;

    await Branding.update(updateFields, {
      where: { customerId: req.decodedToken.obj.obj.id },
      returning: true,
    });

    return res.status(200).json({ success: true, message: "Data Updated Successfully" });
  } catch (error) {
    return next(new ErrorHandler(error.message || "Something went wrong", 500));
  }
});

exports.updateLogo = asyncHandler(async (req, res, next) => {
  try {
    const logoLocalPath = req.file?.filename;

    if (!logoLocalPath) 
      return next(new ErrorHandler("Logo image must be a file", 400));

    const user = await Customer.findByPk(req.decodedToken.obj.obj.id, {
      include: [
        { model: db.subscriptions, as: "subscriptions" },
      ],
    });

    if (!user) {
      fs.unlinkSync(req.file.path)
      return next(new ErrorHandler("customer not found", 400));
    }

    if (!user.isTrialActive) {
      const activeSubscriptions = user.subscriptions.filter(plan => 
        new Date(plan.startDate) <= new Date() && new Date(plan.endDate) >= new Date()
      );

      if (activeSubscriptions.length === 0) {
        fs.unlinkSync(req.file.path)
        return next(new ErrorHandler("Please renew your subscription plan. Your current subscription is expired.", 400));
      }
    } 
    else if (user.isTrialActive && user.trialEndDate < new Date()) {
      fs.unlinkSync(req.file.path)
      return next(new ErrorHandler("Your trial is expired, Please renew your plan", 400));
    }

    const branding = await Branding.findOne({where:{customerId:req.decodedToken.obj.obj.id}})

    if (!branding) {
      fs.unlinkSync(req.file.path)
      return next(new ErrorHandler("Branding is not found", 404));
    }
      
    await Branding.update(
      { logo: logoLocalPath },
      { where: { customerId: req.decodedToken.obj.obj.id } }
    );

    // Remove the existing cover image file
    const existingLogoImagePath = branding.logo;
    if (existingLogoImagePath) {
      const logoImagePath = "public/temp/admin/" + existingLogoImagePath;
      if (fs.existsSync(logoImagePath)) fs.unlinkSync(logoImagePath);
    }

    return res.status(200).json({
      success: true,
      message: "Logo updated successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.updateCoverImage = asyncHandler(async (req, res, next) => {
  try {

    const coverImageLocalPath = req.file?.filename;

    if (!coverImageLocalPath) 
      return next(new ErrorHandler("Cover image must be a file.", 400));

    const user = await Customer.findByPk(req.decodedToken.obj.obj.id, {
      include: [
        { model: db.subscriptions, as: "subscriptions" }
      ],
    });

    if (!user) {
      fs.unlinkSync(req.file.path);
      return next(new ErrorHandler("customer not found", 400));
    }

    if (!user.isTrialActive) {
      const activeSubscriptions = user.subscriptions.filter(plan =>
        new Date(plan.startDate) <= new Date() && new Date(plan.endDate) >= new Date()
      );

      if (activeSubscriptions.length === 0) {
        fs.unlinkSync(req.file.path);
        return next(new ErrorHandler("Please renew your subscription plan. Your current subscription is expired.", 400));
      }
    } else if (user.isTrialActive && user.trialEndDate < new Date()) {
      fs.unlinkSync(req.file.path);
      return next(new ErrorHandler("Your trial is expired, Please renew your plan", 400));
    }

    const branding = await Branding.findOne({where:{customerId:req.decodedToken.obj.obj.id}})

    if (!branding) {
      fs.unlinkSync(req.file.path);
      return next(new ErrorHandler("Branding is not found", 404));
    }

    await Branding.update(
      { coverImage: coverImageLocalPath },
      { where: { customerId: req.decodedToken.obj.obj.id } }
    );

    console.log(user)
    // Remove the existing cover image file
    const existingCoverImagePath = branding.coverImage;
    if (existingCoverImagePath) {
      const coverImagePath = "public/temp/admin/" + existingCoverImagePath;
      if (fs.existsSync(coverImagePath)) fs.unlinkSync(coverImagePath);
    }

    return res.status(200).json({
      success: true,
      message: "Cover image updated successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});


