const express = require("express");

const groupController = require("../controllers/groupController");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateMiddleware");
const {
  createGroupSchema,
  updateGroupSchema,
  groupIdParamSchema,
  userIdsSchema,
  postingPermissionSchema,
} = require("../validators/groupValidators");

const router = express.Router();

router.use(protect);

router.route("/").get(groupController.getGroups).post(validate(createGroupSchema), groupController.createGroup);

router
  .route("/:id")
  .get(validate(groupIdParamSchema, "params"), groupController.getGroup)
  .patch(
    validate(groupIdParamSchema, "params"),
    validate(updateGroupSchema),
    groupController.updateGroup
  )
  .delete(validate(groupIdParamSchema, "params"), groupController.deleteGroup);

router.post(
  "/:id/members",
  validate(groupIdParamSchema, "params"),
  validate(userIdsSchema),
  groupController.addMembers
);

router.delete(
  "/:id/members",
  validate(groupIdParamSchema, "params"),
  validate(userIdsSchema),
  groupController.removeMembers
);

router.post(
  "/:id/admins",
  validate(groupIdParamSchema, "params"),
  validate(userIdsSchema),
  groupController.addAdmins
);

router.delete(
  "/:id/admins",
  validate(groupIdParamSchema, "params"),
  validate(userIdsSchema),
  groupController.removeAdmins
);

router.patch(
  "/:id/permissions/posting",
  validate(groupIdParamSchema, "params"),
  validate(postingPermissionSchema),
  groupController.updatePostingPermissions
);

module.exports = router;
