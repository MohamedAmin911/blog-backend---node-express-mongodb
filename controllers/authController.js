const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const sendToken = require("../utils/sendToken");

exports.register = catchAsync(async (req, res, next) => {
  const usersCount = await User.countDocuments();

  const user = await User.create({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    role: usersCount === 0 ? "super-admin" : "user",
  });

  sendToken(user, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("Incorrect email or password.", 401));
  }

  sendToken(user, 200, res);
});
