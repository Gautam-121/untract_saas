const db = require("../db/dbConnection.js")
const Customer = db.customers
const Camapaign = db.campaigns
const Client = db.clients
const Feedback = db.feedbacks
const Analytic = db.analytics
const Branding = db.brandings
const PlanRestrict = db.planRestricts
const ejs = require('ejs');
const path = require("path")
const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/errorHandler");
const sendEmail = require("../utils/sendEmail.js")
const sequelize = db.sequelize
const { validationResult } = require("express-validator")
const jwt = require("jsonwebtoken")

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign({ obj: user }, process.env.JWT_SECRET, {
    expiresIn: "72h", // expires in 24 hours
  });
};

// Helper email function for sending limit riched notification
const notifyUserApproachingVideoLimit = async (user, video) => {
    try {
      // Render the EJS template with dynamic data
      const templatePath = path.join(__dirname, '../views/videoLimitNotification.ejs');
      const limitReachedTemplate = await ejs.renderFile(templatePath, {
        userName: user.email,
        video: {
            videoId: video.videoId,
            title: video.title
        },
        upgradeLink: 'https://main--saas-subscription.netlify.app' // Replace with your actual upgrade link
      });
  
      const options = {
        email: user.email ,
        subject: 'Approaching Video Response Limit',
        message: limitReachedTemplate
      }
  
      // Send the notification email
      await sendEmail(options);
    } catch (error) {
      console.error('Error notifying user:', error);
    }
};

exports.registerAndLogin = asyncHandler(async (req, res, next) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, error: errors.array({ onlyFirstError: true })});
    }

    const { email } = req.body;
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return next(new ErrorHandler(`customer not found with id: ${id}`, 404));
    }

    const client = await Client.findOne({ where: { email: email.trim(), customerId: id } });

    if (client) {
      const otp = client.getOtp();
      await client.save({ validate: false });

      const templatePath = path.join(__dirname, '../views/register-client.ejs');
      const otpTemplate = await ejs.renderFile(templatePath, { otp: otp });

      try {
        await sendEmail({
          email: client.email,
          subject: "Your One-Time Password (OTP) for AiEngage App",
          html: otpTemplate
        });

        return res.status(200).json({
          success: true,
          message: `Email sent to ${client.email} successfully`,
        });

      } catch (error) {
        client.otp = null;
        client.otpExpire = null;
        await client.save({ validate: false });

        return next(new ErrorHandler("Something went wrong while sending OTP to their email", 500));
      }
    }

    const user = await Client.create({ email: email.trim(), customerId: id });
    if (!user) {
      return next(new ErrorHandler("Something went wrong while registering client", 400));
    }

    const otp = user.getOtp();
    await user.save({ validate: false });

    try {
      const templatePath = path.join(__dirname, '../views/register-client.ejs');
      const otpTemplate = await ejs.renderFile(templatePath, { otp: otp });

      await sendEmail({
        email: user.email,
        subject: "Your One-Time Password (OTP) for AiEngage App",
        html: otpTemplate
      });

      return res.status(200).json({
        success: true,
        message: `Email sent to ${user.email} successfully`,
      });

    } catch (error) {
      user.otp = null;
      user.otpExpire = null;
      await user.save({ validate: false });

      return next(new ErrorHandler("Something went wrong while sending OTP to their email", 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.verifyOtp = asyncHandler(async (req, res, next) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false,error: errors.array({ onlyFirstError: true })});
    }

    const { email, otp } = req.body;
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return next(new ErrorHandler(`customer not found with id: ${id}`, 404));
    }

    const client = await Client.findOne({ where: { email, customerId: id } });
    if (!client) {
      return next(new ErrorHandler("Client not found", 404));
    }

    if (client.otp !== otp) {
      return next(new ErrorHandler("Invalid OTP", 400));
    }

    if (client.otpExpire < Date.now()) {
      return next(new ErrorHandler("OTP has expired", 400));
    }

    client.otp = null;
    client.otpExpire = null;
    await client.save({ validate: false });

    const obj = {
      type: "CLIENT",
      obj: client,
    };

    const accessToken = generateToken(obj);

    return res.status(200).json({
      success: true,
      message: "Authentication successful",
      user: {
        id: client.id,
        email: client.email,
        customerId: client.customerId,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      },
      accessToken
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.socialLogin = asyncHandler(async (req, res, next) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array({ onlyFirstError: true })});
    }

    const { email } = req.body;
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return next(new ErrorHandler(`customer not found with id: ${id}`, 404));
    }

    const client = await Client.findOne({
      where: { email, customerId: id },
      attributes: { exclude: ["otp", "otpExpire"] }
    });

    if (client) {

      const obj = {
        type: "CLIENT",
        obj: client,
      };
  
      const accessToken = generateToken(obj);

      return res.status(200).json({
        success: true,
        message: "Authentication successful",
        user: client,
        accessToken
      });
    }

    const user = await Client.create({
      email: email.trim(),
      customerId: id
    });

    if (!user) {
      return next(new ErrorHandler("Something went wrong while registering the client", 500));
    }

    const obj = {
        type: "CLIENT",
        obj: user,
      };
  
    const accessToken = generateToken(obj);
    delete user.otp
    delete user.otpExpire

    return res.status(200).json({
      success: true,
      message: "Authentication successful",
      user:user,
      accessToken
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.getCampaign = asyncHandler(async (req, res, next) => { 
  try {

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array({ onlyFirstError: true })});
      }

      const { id } = req.params;
  
      const campaign = await Camapaign.findByPk(id);

      if (!campaign || campaign.isDeleted) {
          return next(new ErrorHandler(`Campaign data not found for id: ${id}`, 404));
      }

      if (campaign.customerId !== req.decodedToken.obj.obj.customerId) {
          return next(new ErrorHandler("Unauthorized to access the resource", 403));
      }
  
      return res.status(200).json({
          success: true,
          message: "Data sent successfully",
          data: campaign
      });
  } catch (error) {
      return next(new ErrorHandler(error.message, 500));
  }
});

exports.getBranding = asyncHandler(async (req, res, next) => { 
  try {

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array({ onlyFirstError: true })});
      }

      const { id } = req.params;

      const customer = await Customer.findByPk(id);

      if (!customer) {
          return next(new ErrorHandler("customer not found", 404));
      }

      const branding = await Branding.findOne({ where: { customerId: id } });

      if (!branding) {
          return next(new ErrorHandler(`Branding not found with id ${id}`, 404));
      }

      return res.status(200).json({
          success: true,
          message: "Data sent successfully",
          data: branding
      });
  } catch (error) {
      return next(new ErrorHandler(error.message, 500));
  }
});

exports.storeFeedback = asyncHandler(async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
      const { response } = req.body;
      const apiKey = req.headers["x-api-key"]

      if (!req.params.videoId) {
        return next(new ErrorHandler("videoId is missing", 400));
      }

      if (!apiKey) {
        return next(new ErrorHandler("Misiing Api key", 401));
      }

      if (!IsValidUUID(req.params.videoId)) {
        return next(new ErrorHandler("Must be valid UUID", 400));
      }

      if (!response || response.length == 0) {
        return next(new ErrorHandler("Provide all fields", 400));
      }

      const videoQuestion = await Video.findByPk(req.params.videoId, {
        transaction,
      });

      if (!videoQuestion || videoQuestion.isDeleted) {
        return next(new ErrorHandler("Video Data not found", 404));
      }

      const isResponseAlreadyExist = await Feedback.findOne({
        where: {
          videoId: req.params.videoId,
        },
        include: [
          {
            model: Client,
            as: "clientRes",
            where: {
              email: req.user.email,
            },
          },
        ],
        transaction,
      });

      if (isResponseAlreadyExist) {
        return next(new ErrorHandler("Response already stored", 409));
      }

      let analyticResponse = await Analytic.findOne({
        where: {
          videoId: req.params.videoId,
        },
        transaction,
      });

      if (!analyticResponse) {
        let finalProccessData = [];

        videoQuestion.videoData.forEach((item) => {
          const processedData = item.questions
            ? item.questions.map((question) => {
                const responses = {};
                question.answers.forEach((answer) => {
                  responses[answer.answer] = 0;
                });

                return {
                  id: question.id,
                  question: question.question,
                  responses: responses,
                  multiple: question.multiple,
                  skip: question.skip,
                  noOfSkip: 0,
                };
              })
            : [];

          finalProccessData = finalProccessData.concat(processedData);
        });

        analyticResponse = await Analytic.create(
          {
            videoId: req.params.videoId,
            analyticData: finalProccessData,
            totalResponse: 0, // Changed to 0 since we will increment it later
          },
          { transaction }
        );
      }

      response.forEach((res) => {
        const questionToUpdate = analyticResponse.analyticData.find(
          (item) => item.id === res.id
        );

        if (questionToUpdate) {
          if (res.skip) {
            questionToUpdate.noOfSkip++;
          } else {
            res.ans.forEach((answer) => {
              if (questionToUpdate.responses.hasOwnProperty(answer)) {
                questionToUpdate.responses[answer]++;
              }
            });
          }
        }
      });

      // fetch User subscription
      const subscription = await getUserSubscriptions(apiKey);

      if (!subscription) {
        return next(new ErrorHandler("User subscription not found", 400));
      }

      console.log("videoQuestion", videoQuestion);
      const videoLength = videoQuestion.videoLength / 60;

      // Subscription under trial-period
      if (subscription.isTrialActive) {
        console.log("Enter inside trial period");
        if (new Date() > new Date(subscription.trialEndDate)) {
          return next(
            new ErrorHandler(
              "Free trial has expired, please renew the plan",
              400
            )
          );
        }

        let earlyExpiredPlan = await PlanRestrict.findOne({
          where: {
            videoId: req.params.videoId,
          },
          transaction,
        });

        if (!earlyExpiredPlan) {
          earlyExpiredPlan = await PlanRestrict.create(
            {
              videoId: req.params.videoId,
              plans: [
                {
                  planId: "Free Plan",
                  totalUsedResponses: 0,
                  expired: subscription.trialEndDate,
                  maxLimit: subscription.freeTrialFeature.totalResponse,
                },
              ],
            },
            { transaction }
          );
        }

        // Checked plan has riched limit
        if (
          earlyExpiredPlan.plans[0].totalUsedResponses >=
          Math.ceil(subscription.freeTrialFeature.totalResponse / videoLength)
        ) {
          return next(
            new ErrorHandler(
              "Plan limit has exceeded, please renew your plan",
              400
            )
          );
        }

        await Analytic.update(
          {
            totalResponse: analyticResponse.totalResponse + 1,
            analyticData: analyticResponse.analyticData,
          },
          {
            where: {
              id: analyticResponse.id,
            },
            transaction,
          }
        );

        const feedbackRes = await Feedback.create(
          {
            clientId: req.user.id,
            videoId: req.params.videoId,
            response: response,
          },
          { transaction }
        );

        earlyExpiredPlan.plans[0].totalUsedResponses += 1;
        earlyExpiredPlan.changed("plans", true);
        await earlyExpiredPlan.save({ validate: false, transaction });

        // checked plan has riched 90% of there overvall limit
        if (
          Math.ceil(subscription.freeTrialFeature.totalResponse / videoLength) -
            earlyExpiredPlan.plans[0].totalUsedResponses <=
          Math.ceil(
            ((subscription.freeTrialFeature.totalResponse + 1) / videoLength) *
              0.1
          )
        ) {
          await notifyUserApproachingVideoLimit(subscription, videoQuestion);
        }

        await transaction.commit();

        return res.status(200).json({
          success: true,
          message: "Feedback received successfully",
          feedbackRes: feedbackRes,
        });
      }

      if (subscription?.subscriptions.length == 0) {
        return next(new ErrorHandler("No active plan found", 400));
      }

      const currentDate = new Date();
      let activePlans = subscription.subscriptions
        .filter((plan) => new Date(plan.endDate) >= currentDate)
        .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

      if (activePlans.length === 0) {
        return next(new ErrorHandler("No active plan found", 400));
      }

      let earlyExpiredPlan = await PlanRestrict.findOne({
        where: {
          videoId: req.params.videoId,
        },
        transaction,
      });

      if(earlyExpiredPlan){
        // check free plan is there if there remove it 
        earlyExpiredPlan.plans = earlyExpiredPlan.plans.filter(plan => plan.planId !== "Free Plan")
      }
      
      if (!earlyExpiredPlan) {
        earlyExpiredPlan = await PlanRestrict.create(
          {
            videoId: req.params.videoId,
            plans: [
              {
                planId: activePlans[0].id,
                totalUsedResponses: 0,
                expired: activePlans[0].endDate,
                maxLimit: activePlans[0].features.totalResponse,
              },
            ],
          },
          { transaction }
        );
      }

      earlyExpiredPlan.plans.sort(
        (a, b) => new Date(a.expired) - new Date(b.expired)
      );
      const findFirstValidPlan = (
        earlyExpiredPlan,
        activePlans,
        videoLength
      ) => {
        for (let i = 0; i < activePlans.length; i++) {
          const planExist = earlyExpiredPlan.plans.find(
            (plan) => plan.planId === activePlans[i].id
          );
          const hasReachedTheLimit = planExist
            ? planExist.totalUsedResponses >=
              Math.ceil(planExist.maxLimit / videoLength)
            : null;
          if (planExist && !hasReachedTheLimit) {
            return { valid: true, plan: planExist };
          } else if (!planExist) {
            return { valid: false, plan: activePlans[i] };
          }
        }
        return { valid: false, plan: "Limit Reached" };
      };


      // Find first valid plan
      let planCheck = findFirstValidPlan(earlyExpiredPlan,activePlans,videoLength);

      if (planCheck.plan === "Limit Reached") {
        return next(
          new ErrorHandler(
            "Plan limit has exceeded, please renew your plan",
            400
          )
        );
      }

      let planExist;
      if (!planCheck.valid) {
        planExist = {
          planId: planCheck.plan.id,
          totalUsedResponses: 0,
          expired: planCheck.plan.endDate,
          maxLimit: planCheck.plan.features.totalResponse,
        };
        const existingData = earlyExpiredPlan.plans.filter(
          (plan) => new Date() <= new Date(plan.expired)
        );
        existingData.push(planExist);
        earlyExpiredPlan.plans = existingData;
      } else {
        planExist = planCheck.plan;
      }

      // From all avtive subscription plan filter those have not riched the limit
      const validActivePlans = activePlans.filter((plan) => {
        const earlyPlan = earlyExpiredPlan.plans.find(
          (p) => p.planId === plan.id
        );
        const hasReachedTheLimit = earlyPlan
          ? earlyPlan.totalUsedResponses >=
            Math.ceil(earlyPlan.maxLimit / videoLength)
          : null;
        return earlyPlan && !hasReachedTheLimit;
      });

      if (validActivePlans.length === 1) {
        const plan = validActivePlans[0];
        const earlyPlan = earlyExpiredPlan.plans.find(
          (p) => p.planId === plan.id
        );

        if (earlyPlan.totalUsedResponses >= Math.ceil(plan.features.totalResponse / videoLength)) {
          return next(
            new ErrorHandler(
              "Plan limit has exceeded, please renew your plan",
              400
            )
          );
        }

        if ((Math.ceil(plan.features.totalResponse / videoLength) - earlyPlan.totalUsedResponses) <= Math.ceil((plan.features.totalResponse + 1 / videoLength) * 0.1)) {
          await notifyUserApproachingVideoLimit(subscription, videoQuestion);
        }
      }

      await Analytic.update(
        {
          totalResponse: analyticResponse.totalResponse + 1,
          analyticData: analyticResponse.analyticData,
        },
        {
          where: {
            id: analyticResponse.id,
          },
          transaction,
        }
      );

      console.log("before all plans", earlyExpiredPlan.plans);

      const feedbackRes = await Feedback.create(
        {
          clientId: req.user.id,
          videoId: req.params.videoId,
          response: response,
        },
        { transaction }
      );

      planExist.totalUsedResponses += 1;
      earlyExpiredPlan.changed("plans", true);
      await earlyExpiredPlan.save({ validate: false, transaction });

      console.log("After increament", earlyExpiredPlan.plans);

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: "Feedback received successfully",
        feedbackRes: feedbackRes,
      });
    } catch (error) {
        await transaction.rollback();
        return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
});

exports.getFeedBack = asyncHandler(async (req, res, next) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array({ onlyFirstError: true }) });
    }

    const { id } = req.params;
    const campaign = await Camapaign.findByPk(id);

    if (!campaign || campaign.isDeleted) {
      return next(new ErrorHandler(`Campaign not exist with id ${id}`, 404));
    }

    const feedback = await Feedback.findOne({
      where: {
        videoId: id,
        clientId: req.decodedToken.obj.obj.customerId,
      },
    });

    if (!feedback) {
      return next(new ErrorHandler("No feedback found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Data sent successfully",
      data: feedback,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});








