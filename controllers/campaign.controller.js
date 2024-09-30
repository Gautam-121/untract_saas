const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/errorHandler");
const fs = require("fs")
const OpenAI = require("openai");
const axios = require('axios');
const { validationResult } = require("express-validator")
const {
  UPLOAD_VIDEO_URL,
  HSL_BASE_URL,
  UPLOAD_VIDEO_FOLDER,
  LOCAL_VIDEO_STORAGE_BASE_URL,
} = require("../utils/constant.js");
const db = require("../db/dbConnection.js")
const Customer = db.customers
const Campaign = db.campaigns
const Analytic = db.analytics
const openAi = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Upload Video
exports.uploadVideo = async (req, res, next) => {
  try {

    console.log("Enter inside")
    const videoFilePath = req?.file;

    if (!videoFilePath) {
      return next(new ErrorHandler("Missing Video File.", 400));
    }

    const user = await Customer.findByPk(req.decodedToken.obj.obj.id, {
      include: [{ model: db.subscriptions, as: "subscriptions" }],
    });


    if (!user) {
      if (fs.existsSync(videoFilePath.path)) {
        fs.unlinkSync(videoFilePath.path);
      }
      return next(new ErrorHandler("customer not found", 400));
    }

    if (!user.isTrialActive) {
      const activeSubscriptions = user.subscriptions.filter(
        (plan) => new Date(plan.startDate) <= new Date() && new Date(plan.endDate) >= new Date()
      );

      if (activeSubscriptions.length === 0) {
        if (fs.existsSync(videoFilePath.path)) {
          fs.unlinkSync(videoFilePath.path);
        }
        return next(new ErrorHandler("Please renew your subscription plan. Your current subscription is expired.", 400));
      }
    } else if (user.isTrialActive && user.trialEndDate < new Date()) {
      if (fs.existsSync(videoFilePath.path)) {
        fs.unlinkSync(videoFilePath.path);
      }
      return next(new ErrorHandler("Your trial is expired, Please renew your plan", 400));
    }

    const url = `https://e1a4-106-51-37-219.ngrok-free.app/video//${videoFilePath.filename}`

    const data = {
      url : `https://e1a4-106-51-37-219.ngrok-free.app/video/${videoFilePath.filename}`,
      // url: `${LOCAL_VIDEO_STORAGE_BASE_URL}/video/${videoFilePath.filename}`,
      filename: videoFilePath.filename,
      folder: UPLOAD_VIDEO_FOLDER,
    };

    // Upload the video file to the CDN
    const uploadVideoFileOn5centCdn = await axios.post(UPLOAD_VIDEO_URL, data, {
      headers: {
        accept: "application/json",
        "X-API-Key": process.env.CDN_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (uploadVideoFileOn5centCdn?.data.result === "error") {
      if (fs.existsSync(videoFilePath.path)) {
        fs.unlinkSync(videoFilePath.path);
        console.log(`Successfully deleted local file: ${videoFilePath.path}`);
      }
      return next(new ErrorHandler("Something went wrong while uploading file on CDN", 500));
    }

    // Construct the video URL from the CDN response
    const videoUrl = `${HSL_BASE_URL}/${UPLOAD_VIDEO_FOLDER}/${uploadVideoFileOn5centCdn.data.filename}/playlist.m3u8`;
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify that the video exists on the CDN
    const verifyUrl = `https://api.5centscdn.com/v2/zones/vod/push/3987/filemanager/info?file=videoCampaign%2F${videoFilePath.filename}&media=1`;
    const verifyResponse = await axios.get(verifyUrl, {
      headers: {
        accept: "application/json",
        "X-API-Key": process.env.CDN_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!verifyResponse.data.media) {
      if (fs.existsSync(videoFilePath.path)) {
        fs.unlinkSync(videoFilePath.path);
        console.log(`Successfully deleted local file: ${videoFilePath.path}`);
      }
      return next(new ErrorHandler('Something went wrong while uploading file on CDN', 500));
    }

    // Safely delete the file from local storage after verifying upload to the CDN
    try {
      if (fs.existsSync(videoFilePath.path)) {
        fs.unlinkSync(videoFilePath.path);
        console.log(`Successfully deleted local file: ${videoFilePath.path}`);
      }
    } catch (unlinkError) {
      console.error(`Failed to delete the local file: ${unlinkError.message}`);
    }

    return res.status(201).json({
      success: true,
      message: "Video Uploaded Successfully",
      videoUrl: videoUrl,
    });
  } catch (error) {
    console.error('Error during video upload process:', error.message);

    // Handle errors and attempt to delete the local file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`Successfully deleted local file during error handling: ${req.file.path}`);
      } catch (unlinkError) {
        console.error(`Failed to delete the local file during error handling: ${unlinkError.message}`);
      }
    }

    return next(new ErrorHandler(error.message, 500));
  }
};

// Upload Thumbnails
exports.uploadThumb = async (req, res, next) => {
  try {
    const thumbnailFilePath = req?.file?.filename;

    if (!thumbnailFilePath) {
      return next(new ErrorHandler("Missing thumbnail file", 400));
    }

    return res.status(201).json({
      success: true,
      message: "Thumbnail uploaded successfully",
      thumbnailUrl: thumbnailFilePath,
    });
  } catch (error) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return next(new ErrorHandler(error.message, 500));
  }
};

// Create Campaign
exports.create = asyncHandler(async (req, res, next) => {
  try {

    const error = validationResult(req);
    if (!error.isEmpty()) {
      return res.status(400).json({ success: false, message: error.array({ onlyFirstError: true })});
    }

    const data = JSON.parse(JSON.stringify(req.body));

    const user = await Customer.findByPk(req.decodedToken.obj.obj.id, {
      include: [{ model: db.subscriptions, as: "subscriptions" }],
    });

    if (!user) {
      return next(new ErrorHandler("customer not found", 400));
    }

    if (!user.isTrialActive) {
      const activeSubscriptions = user.subscriptions.filter(
        (plan) =>
          new Date(plan.startDate) <= new Date() &&
          new Date(plan.endDate) >= new Date()
      );

      if (activeSubscriptions.length === 0) {
        return next(
          new ErrorHandler("Please renew your subscription plan. Your current subscription is expired.",400));
      }
    } else if (user.isTrialActive && user.trialEndDate < new Date()) {
      return next(new ErrorHandler("Your trial is expired, Please renew your plan", 400));
    }

    const campaign = await Campaign.create({
      title: data.title,
      videoFileUrl: data.videoFileUrl,
      videoData: data.videoData,
      videoSelectedFile: data.videoSelectedFile,
      videoLength: data.videoLength,
      customerId: req.decodedToken.obj.obj.id,
    });

    return res.status(201).json({
      success: true,
      message: "Campaign Created Successfully",
      videoData: campaign,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// Get All Campaign
exports.getAll = asyncHandler(async (req, res, next) => {
    try {

      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({success: false, error: errors.array({ onlyFirstError: true }),});
      }

      const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default to 10 items per page if not provided
  
      const offset = (page - 1) * pageSize;
  
      const campaigns = await Campaign.findAndCountAll({
        where: {
          customerId: req.decodedToken.obj.obj.id,
          isDeleted: false,
        },
        include: [
          {
            model: db.planRestricts,
            as: "plans",
          },
        ],
        limit: pageSize,
        offset: offset,
      });
  
      const totalPages = Math.ceil(campaigns.count / pageSize);
  
      return res.status(200).json({
        success: true,
        totalPages,
        currentPage: page,
        record_limit_per_page: pageSize,
        videoResult: campaigns.rows,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
});
  
// Get Campaign By Id
exports.getById = asyncHandler(async (req, res, next) => {
    try {
      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({success: false, error: errors.array({ onlyFirstError: true }),});
      }
  
      const { id } = req.params;
  
      // Fetch the Camapaign based on id and user
      const campaign = await Campaign.findOne({
        where: { 
          video_id: id,
          customerId: req.decodedToken.obj.obj.id,
          isDeleted: false,
        },
      });
  
      // Handle case when Campaign is not found
      if (!campaign) {
        return next(new ErrorHandler("campaign not Found", 404));
      }
  
      // Respond with the video data if found
      return res.status(200).json({
        success: true,
        message: "Data Sent Successfully",
        data: campaign,
      });
  
    } catch (error) {
      // Handle any unexpected errors
      return next(new ErrorHandler(error.message, 500));
    }
});
  
// Update Campaign
exports.update = asyncHandler(async (req, res, next) => {
  try {

    const error = validationResult(req);
    if (!error.isEmpty()) {
      return res.status(400).json({success: false,message: error.array({ onlyFirstError: true })});
    }
  
    const data = JSON.parse(JSON.stringify(req.body));
    const { id } = req.params;
  
    const user = await Customer.findByPk(req.decodedToken.obj.obj.id, {
      include: [{ model: db.subscriptions, as: "subscriptions" }],
    });
  
    if (!user) {
      return next(new ErrorHandler("customer not found", 400));
    }
  
    if (!user.isTrialActive) {
      const activeSubscriptions = user.subscriptions.filter(
        (plan) =>
          new Date(plan.startDate) <= new Date() &&
          new Date(plan.endDate) >= new Date()
      );
  
      if (activeSubscriptions.length === 0) {
        return next(new ErrorHandler("Please renew your subscription plan. Your current subscription is expired.",400));
      }
    } else if (user.isTrialActive && user.trialEndDate < new Date()) {
      return next(new ErrorHandler("Your trial is expired, Please renew your plan", 400));
    }
  
    const camapaign = await Campaign.findOne({
      where: {
        video_id: id,
        customerId: req.decodedToken.obj.obj.id,
        isDeleted: false,
      },
    });
  
    if (!camapaign) {
      return next(new ErrorHandler("Video not found", 404));
    }
  
    const [rowsUpdated, [updatedVideoData]] = await Campaign.update(
      {
        title: data.title,
        videoFileUrl: data.videoFileUrl,
        videoData: data.videoData,
        videoSelectedFile: data.videoSelectedFile,
        videoLength: data.videoLength,
      },
      {
        where: {
          video_id: id,
          customerId: req.decodedToken.obj.obj.id,
        },
        returning: true,
      }
    );
  
    if (rowsUpdated == 0) {
      return next(new ErrorHandler("Something went wrong while updating the videoData", 500));
    }
  
    return res.status(200).json({
      success: true,
      vidoData: updatedVideoData,
      message: "Updated the campaign successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message , 500))
  }
});

// Delete Campaign
exports.delete = asyncHandler(async (req, res, next) => {
    try {

    // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({success: false, error: errors.array({ onlyFirstError: true }),});
      }

      const { id } = req.params;
  
      // Find the Camapaign by id and customer ID
      const campaign = await Campaign.findOne({
        where: {
          video_id: id,
          customerId: req.decodedToken.obj.obj.id,
          isDeleted: false,
        },
      });
  
      // Handle case when the Campaign is not found
      if (!campaign) {
        return next(new ErrorHandler("campaign not found", 404));
      }
  
      // Mark the Camapaign as deleted
      const [deleteCampaign] = await Campaign.update(
        { isDeleted: true },
        {
          where: {
            video_id: id,
            customerId: req.decodedToken.obj.obj.id,
          },
        }
      );
  
      // Check if the deletion was successful
      if (deleteCampaign === 0) {
        return next(new ErrorHandler("Something went wrong while deleting the video", 500));
      }
  
      // Respond with a success message
      return res.status(200).json({
        success: true,
        message: "Campaign deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
});
  
// Update Campaign Shared
exports.updateShared = asyncHandler( async(req , res, next)=>{
try {

    // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({success: false, error: errors.array({ onlyFirstError: true }),});
     }
    
      const { isShared } = req.body
      const { id } = req.params
    
      const user = await Customer.findByPk(req.decodedToken.obj.obj.id, {
        include: [{ model: db.subscriptions, as: "subscriptions" }],
      });
  
      if (!user) {
        return next(new ErrorHandler("customer not found", 400));
      }
  
      if (!user.isTrialActive) {
        const activeSubscriptions = user.subscriptions.filter(
          (plan) => new Date(plan.startDate) <= new Date() && new Date(plan.endDate) >= new Date()
        );
  
        if (activeSubscriptions.length === 0) {
          return next(new ErrorHandler("Please renew your subscription plan. Your current subscription is expired.", 400));
        }
      } else if (user.isTrialActive && user.trialEndDate < new Date()) {
        return next(new ErrorHandler("Your trial is expired, Please renew your plan", 400));
      }
  
      const campaign = await Campaign.findOne({
        where:{
          video_id: id,
          customerId: req.decodedToken.obj.obj.id,
          isDeleted: false
        }
      })
    
      if(!campaign){
        return next(new ErrorHandler("campaign not found", 404))
      }
    
      await Campaign.update(
        {
          isShared: isShared
        },
        {
          where:{
            video_id: id,
            customerId: req.decodedToken.obj.obj.id,
          }
        }
      )
    
      return res.status(200).json({
        success: true,
        message: "Data update successfully"
      })
} catch (error) {
    return next(new ErrorHandler(error.message , 500))
}
})

// Get Analytic
exports.getAnalytic = asyncHandler(async (req, res, next) => {
  try {
    // Validate request parameters
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, error: errors.array({ onlyFirstError: true })});
    }

    const { id } = req.params;

    const data = await Analytic.findOne({
      where: {
        videoId: id,
      },
      include: [{
        model: db.campaigns,
        as: "campaigns",
        where: {
          customerId: req.decodedToken.obj.obj.id,
          isDeleted: false,
        },
      }],
    });

    if (!data) {
      return next(new ErrorHandler("No data found with videoId associated with admin", 404));
    }

    // Return the feedback as a response
    res.status(200).json({
      success: true,
      message: "Data sent successfully",
      data,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// Get Summery
exports.summery = async (req, res, next) => {
  try {
    // Validate request parameters
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array({ onlyFirstError: true }),
      });
    }

    const { id } = req.params

    const user = await Customer.findByPk(req.decodedToken.obj.obj.id, {
      include: [{ model: db.subscriptions, as: "subscriptions" }],
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 400));
    }

    if (!user.isTrialActive) {
      const activeSubscriptions = user.subscriptions.filter(
        (plan) =>
          new Date(plan.startDate) <= new Date() &&
          new Date(plan.endDate) >= new Date()
      );

      if (activeSubscriptions.length === 0) {
        return next(
          new ErrorHandler(
            "Please renew your subscription plan. Your current subscription is expired.",
            400
          )
        );
      }
    } else if (user.isTrialActive && user.trialEndDate < new Date()) {
      return next(
        new ErrorHandler("Your trial is expired, Please renew your plan", 400)
      );
    }

    const analyticResponse = await Analytic.findByPk(id, {
      include: [
        {
          model: db.campaigns,
          as: "campaigns",
          where: {
            customerId: req.decodedToken.obj.obj.id,
            isDeleted: false,
          },
          attributes: {
            include: ["title"],
          },
        },
      ],
      attributes: {
        exclude: ["id", "createdAt", "updatedAt", "videoId"],
      },
    });

    if (!analyticResponse) {
      return next(new ErrorHandler("analytic not found", 404));
    }

    const jsonString = JSON.stringify(analyticResponse);

    const completion = await openAi.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Summarize the key insights, common themes, and important points from the following survey questions and answers related to a product demo. Focus on capturing the most relevant and frequently mentioned information across the responses, while omitting unnecessary details or redundancies.
          Analyze and include the overall sentiment (positive, negative, or neutral) expressed in the responses to each question. If the survey includes numerical data, ratings, or quantitative feedback, incorporate relevant statistics or averages in the summary.
          The goal is to provide a concise yet comprehensive overview of the survey data, highlighting both the qualitative feedback and quantitative evaluations. Present the summary in a structured format, using paragraphs or bullet points as appropriate. The length of the summary should be approximately 300-400 words. ${jsonString}`,
        },
      ],
      model: "gpt-3.5-turbo",
    });

    return res.status(200).json({
      success: true,
      message: "Data sent successfully",
      content: completion.choices[0].message.content,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};


