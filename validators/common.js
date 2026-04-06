const Joi = require("joi");

const objectId = Joi.string().trim().length(24).hex();

module.exports = {
  Joi,
  objectId,
};
