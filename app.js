const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const errorMiddleware = require("./middlewares/error.js");
require("dotenv").config({ path: "./.env" });
const app = express();
const cors = require("cors");
app.use(cookieParser());
const allowedOrigins =['https://aiengage.xircular.io','https://new-video-editor.vercel.app','http://localhost:3000',undefined ]

app.use(cors({
    origin: (origin, callback) => {
      console.log("origin coming",origin)
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    // credentials: true // Allow cookies to be sent and received
  }));

app.use(express.static("public/temp"));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.set('views', './views');
app.set('view engine', 'ejs');

// Routes Imports
const customerRouter = require("./routes/customerRouter.js");
const adminRouter = require("./routes/adminRouter.js");
const productRouter = require("./routes/productRouter.js");
const subscriptionRouter = require("./routes/subscriptionRouter.js");
const subscriptionPlanRouter = require("./routes/subscriptionPlanRouter.js");
const orderRouter = require("./routes/orderRouter.js");
const cashfreePaymentRouter = require("./routes/cashfreePaymentRouter.js");
// const stripeWebhookRouter = require('./routes/webhookrouter.js');
const brandingRouter = require("./routes/branding.router.js")
const clientRouter = require("./routes/client.router.js")
const camapaign = require("./routes/campaign.router.js")

//routes declaration
app.use("/api/v1/customer", customerRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/subscription_plan", subscriptionPlanRouter);
app.use("/api/v1/cashfree", cashfreePaymentRouter);
// app.use("/api/stripe/webhook", stripeWebhookRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/branding", brandingRouter)
app.use("/api/v1/client" , clientRouter)
app.use("/api/v1/camapaign" , camapaign)

// Middleware for error
app.use(errorMiddleware);

module.exports = app;
