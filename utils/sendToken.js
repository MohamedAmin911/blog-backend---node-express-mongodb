function sendToken(user, statusCode, res) {
  const token = user.generateAuthToken();

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user: user.toJSON(),
    },
  });
}

module.exports = sendToken;
