const { Joi, objectId } = require("./common");

const userBodySchema = Joi.object({
  username: Joi.string().trim().min(3).max(30),
  email: Joi.string().trim().email(),
  role: Joi.string().valid("user", "admin", "super-admin"),
});

const createUserSchema = userBodySchema
  .append({
    password: Joi.string().min(8).max(64).required(),
  })
  .fork(["username", "email"], (schema) => schema.required());

const updateUserSchema = userBodySchema.min(1);

const userIdParamSchema = Joi.object({
  id: objectId.required(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
};
