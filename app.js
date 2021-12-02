/* request is received here, based on the route is either goes to
 * tours or user. (app) ==> (tourRouter) ==> (controller) ==> makes the call and sends back response
 *@Linus
 */
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const helmet = require("helmet");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const app = express();

//1)GLOBAL MIDDLEWARES

/*Set Security HTTP headers*/
app.use(helmet());

/*Development logging */
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
/*this will limit the amount of request from the same IP to 100 reqs in 1H */
const limiter = rateLimit({
  max: 100,
  windowMS: 60 * 60 * 1000,
  message: "To manny request from this IP, please please wait for one hour.",
});
app.use("/api", limiter);

/*BODY PARSER, reading data from body into req.body */
app.use(express.json({ limit: "10kb" })); // middleware, needed so that the data from the body is added to the request-obj

// Data sanitazation against NoSQL query injection.
app.use(mongoSanitize());

// Data sanitazation against XSS-attacks, cleans malicious html-code
app.use(xss());

/*prevents parameter pollution, but allowing parameters from the whitelist*/
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

/*Serving static files*/
app.use(express.static(`${__dirname}/public`));

/*Test middleware.*/
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 2) ROUTES
app.use("/api/v1/tours", tourRouter); // mounting the router
app.use("/api/v1/users", userRouter); // mounting the router

app.all("*", (req, res, next) => {
  /*
  const err = new Error(`Cant find ${req.originalUrl} on this server!`);
  err.status = "fail";
  err.statusCode = 404;
  next(err);*/
  next(new AppError(`Cant find ${req.originalUrl} on this server!`, 404));
});
app.use(globalErrorHandler);
module.exports = app;
