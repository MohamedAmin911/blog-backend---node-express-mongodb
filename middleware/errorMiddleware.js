const multer = require("multer");

const AppError = require("../utils/AppError");

function handleCastError(error) {
  return new AppError(`Invalid ${error.path}: ${error.value}`, 400);
}

function handleDuplicateFields(error) {
  const duplicateValue = Object.values(error.keyValue || {})[0];
  return new AppError(`Duplicate field value: ${duplicateValue}. Please use another value.`, 400);
}

function handleValidationError(error) {
  const messages = Object.values(error.errors).map((item) => item.message);
  return new AppError(`Invalid input data. ${messages.join(" ")}`, 400);
}

function handleJWTError() {
  return new AppError("Invalid token. Please log in again.", 401);
}

function handleJWTExpiredError() {
  return new AppError("Your token has expired. Please log in again.", 401);
}

function sendErrorDev(error, res) {
  res.status(error.statusCode || 500).json({
    status: error.status || "error",
    message: error.message,
    stack: error.stack,
    error,
  });
}

function sendErrorProd(error, res) {
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  }

  console.error("UNEXPECTED ERROR:", error);

  return res.status(500).json({
    status: "error",
    message: "Something went wrong.",
  });
}

module.exports = (error, req, res, next) => {
  let currentError = error;
  currentError.statusCode = currentError.statusCode || 500;
  currentError.status = currentError.status || "error";

  if (currentError instanceof multer.MulterError) {
    currentError = new AppError(currentError.message, 400);
  } else if (currentError.name === "CastError") {
    currentError = handleCastError(currentError);
  } else if (currentError.code === 11000) {
    currentError = handleDuplicateFields(currentError);
  } else if (currentError.name === "ValidationError") {
    currentError = handleValidationError(currentError);
  } else if (currentError.name === "JsonWebTokenError") {
    currentError = handleJWTError();
  } else if (currentError.name === "TokenExpiredError") {
    currentError = handleJWTExpiredError();
  }

  if (process.env.NODE_ENV === "production") {
    return sendErrorProd(currentError, res);
  }

  return sendErrorDev(currentError, res);
};
