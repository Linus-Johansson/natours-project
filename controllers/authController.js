const { promisify } = require("util");
const User = require("./../models/userModel");
const jwt = require("jsonwebtoken");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const sendEmail = require("./../utils/email");
const crypto = require("crypto");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  /* if application is running in prod, set the security to true. */
  if (process.env.NODE_ENV === "production") {
    cookieOptions.secure = true;
  }
  res.cookie("jwt", token, cookieOptions);
  // removes password from output.
  user.password = undefined;
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

// signup  a user..
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  createAndSendToken(newUser, 201, res);
});

//login a existing user..
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1: check if email and password exists..
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  // 2: check if email and password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password!", 401));
  }
  // 3: If everything is ok, send token to client
  createAndSendToken(user, 200, res);
});

// middleware that checks if user is authenticated to access specific route.
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1: Get the token and check if its there.
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new AppError("You are not logged in!, please login to get access.", 401)
    );
  }

  // 2: verification of the token, checks to see if the token payload has not been manipulated.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3: check if the user still exists. Gets current user from decoded payload.
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    // if current user dosent exsists...
    return next(
      new AppError(
        "The user belonging to this token does no longer exsist.",
        401
      )
    );
  }
  // 4: check if user changed password after token was issued
  if (currentUser.passwordChangedAfter(decoded.iat)) {
    // if a change has happend..
    return next(
      new AppError(
        "The user recently changed their password! Please login again.",
        401
      )
    );
  }
  // grant access to protected route!..
  req.user = currentUser; // current user is assigned to req.user, so it can be used the next middleware func..
  next();
});
// this middleware restricts access to the delete function.
// Only an user with an admin or lead-guide will be given permission to delete tours
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array, ex: [admin, lead-guide]. role ="user"
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next(); // if the role is within the roles array the request continues to the deletehandlerroute.
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // get user based on posted email.
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // if email dosent exsist throw error message.
    return next(new AppError("There is no user with that email"), 404);
  }
  //generate random token.
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // this deactiviates all validators in the schema

  //send it back as a email.
  const resetURL = `${req.protocol}//${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password submit a PATCH request  with your new password and password confirm
   to ${resetURL}.\n If you didn't forget your password, Please ignore this email. `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password resetToken (valid for 10 minutes)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("There was an error sending the email. Try again later "),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1. get user based on the token.
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2. if token has not expired, and there is a user, set the new password.
  if (!user) {
    return next(new AppError("token is invalid or has expired"), 400);
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3. update changedPasswordAt property for the user.

  //4. log the user in, send JWT
  createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1. Get user from collection
  const user = await User.findById(req.user.id).select("+password");

  //2. check is posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong"), 401);
  }
  //3. if password is correct, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4. Log in user, send JWT
  createAndSendToken(user, 200, res);
});
