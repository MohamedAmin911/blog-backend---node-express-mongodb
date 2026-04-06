const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { buildPagination, buildSearchFilter } = require("../utils/queryHelpers");

function isSameUser(firstId, secondId) {
  return String(firstId) === String(secondId);
}

exports.getAllUsers = catchAsync(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);
  const filter = buildSearchFilter(req.query.keyword, ["username", "email"]) || {};

  const [users, total] = await Promise.all([
    User.find(filter).sort("-createdAt").skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: users.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
    data: {
      users,
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  const canAccess =
    isSameUser(req.user._id, user._id) || ["admin", "super-admin"].includes(req.user.role);

  if (!canAccess) {
    return next(new AppError("You do not have permission to view this user.", 403));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  const payload = {
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    role: req.user.role === "super-admin" ? req.body.role || "user" : "user",
  };

  if (req.user.role !== "super-admin" && req.body.role && req.body.role !== "user") {
    return next(new AppError("Only the super admin can assign elevated roles.", 403));
  }

  const user = await User.create(payload);

  res.status(201).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  if (req.body.password) {
    return next(
      new AppError("Password updates are not supported from this endpoint. Use auth flow instead.", 400)
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  const isSelf = isSameUser(req.user._id, user._id);
  const isPrivileged = ["admin", "super-admin"].includes(req.user.role);

  if (!isSelf && !isPrivileged) {
    return next(new AppError("You do not have permission to update this user.", 403));
  }

  if (req.body.role && req.user.role !== "super-admin") {
    return next(new AppError("Only the super admin can change roles.", 403));
  }

  if (req.user.role === "admin" && !isSelf && user.role !== "user") {
    return next(new AppError("Admins can only update regular users.", 403));
  }

  if (isSelf && req.body.role) {
    return next(new AppError("You cannot change your own role.", 403));
  }

  if (req.user.role === "super-admin" && isSelf && req.body.role === "user") {
    const superAdminsCount = await User.countDocuments({ role: "super-admin" });

    if (superAdminsCount === 1) {
      return next(new AppError("You cannot demote the last super admin.", 400));
    }
  }

  const allowedFields = ["username", "email", "role"];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  await user.save();

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  const isSelf = isSameUser(req.user._id, user._id);

  if (req.user.role === "super-admin") {
    if (user.role === "super-admin" && isSelf) {
      const superAdminsCount = await User.countDocuments({ role: "super-admin" });

      if (superAdminsCount === 1) {
        return next(new AppError("You cannot delete the last super admin.", 400));
      }
    }
  } else if (req.user.role === "admin") {
    if (!isSelf && user.role !== "user") {
      return next(new AppError("Admins can only delete regular users.", 403));
    }
  } else if (!isSelf) {
    return next(new AppError("You do not have permission to delete this user.", 403));
  }

  await user.deleteOne();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
