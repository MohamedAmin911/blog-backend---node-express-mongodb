const express = require("express");

const postController = require("../controllers/postController");
const { protect } = require("../middleware/authMiddleware");
const { uploadPostImages, uploadOnImageKit } = require("../middleware/uploadMiddleware");
const validate = require("../middleware/validateMiddleware");
const {
  createPostSchema,
  updatePostSchema,
  postIdParamSchema,
  userPostsParamSchema,
} = require("../validators/postValidators");

const router = express.Router();

router.use(protect);

router.get("/my-posts", postController.getMyPosts);

router.get(
  "/user/:userId",
  validate(userPostsParamSchema, "params"),
  postController.getUserPosts
);

router
  .route("/")
  .get(postController.getAllPosts)
  .post(uploadPostImages, validate(createPostSchema), uploadOnImageKit, postController.createPost);

router
  .route("/:id")
  .get(validate(postIdParamSchema, "params"), postController.getPost)
  .patch(
    validate(postIdParamSchema, "params"),
    uploadPostImages,
    validate(updatePostSchema),
    uploadOnImageKit,
    postController.updatePost
  )
  .delete(validate(postIdParamSchema, "params"), postController.deletePost);

module.exports = router;
