const { Joi, objectId } = require("./common");

const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(3).max(80).required(),
  description: Joi.string().trim().max(500).allow("", null),
  admins: Joi.array().items(objectId),
  members: Joi.array().items(objectId),
});

const updateGroupSchema = Joi.object({
  name: Joi.string().trim().min(3).max(80),
  description: Joi.string().trim().max(500).allow("", null),
}).min(1);

const groupIdParamSchema = Joi.object({
  id: objectId.required(),
});

const userIdsSchema = Joi.object({
  userIds: Joi.array().items(objectId).min(1).required(),
});

const postingPermissionSchema = Joi.object({
  userIds: Joi.array().items(objectId).min(1).required(),
  canPost: Joi.boolean().required(),
});

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  groupIdParamSchema,
  userIdsSchema,
  postingPermissionSchema,
};
