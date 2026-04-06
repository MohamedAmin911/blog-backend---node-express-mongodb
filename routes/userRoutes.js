const express = require("express");

const userController = require("../controllers/userController");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateMiddleware");
const {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} = require("../validators/userValidators");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(restrictTo("admin", "super-admin"), userController.getAllUsers)
  .post(restrictTo("admin", "super-admin"), validate(createUserSchema), userController.createUser);

router
  .route("/:id")
  .get(validate(userIdParamSchema, "params"), userController.getUser)
  .patch(validate(userIdParamSchema, "params"), validate(updateUserSchema), userController.updateUser)
  .delete(validate(userIdParamSchema, "params"), userController.deleteUser);

module.exports = router;
