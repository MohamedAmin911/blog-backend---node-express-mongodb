const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    fileId: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Post title is required"],
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
      minlength: 10,
    },
    images: {
      type: [imageSchema],
      validate: {
        validator(images) {
          return Array.isArray(images) && images.length > 0;
        },
        message: "Each post must have at least one image.",
      },
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
