const { Joi, objectId } = require("./common");

const createPostSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  content: Joi.string().trim().min(10).required(),
  group: objectId.allow(null, ""),
});

const updatePostSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150),
  content: Joi.string().trim().min(10),
});

const postIdParamSchema = Joi.object({
  id: objectId.required(),
});

const userPostsParamSchema = Joi.object({
  userId: objectId.required(),
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  postIdParamSchema,
  userPostsParamSchema,
};
