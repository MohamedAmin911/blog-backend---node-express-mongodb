const Group = require("../models/Group");
const Post = require("../models/Post");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { buildPagination, buildSearchFilter } = require("../utils/queryHelpers");

function containsUser(ids, userId) {
  return ids.some((id) => String(id) === String(userId));
}

async function getAccessibleGroupIds(user) {
  if (user.role === "super-admin") {
    return null;
  }

  const groups = await Group.find({
    $or: [{ admins: user._id }, { members: user._id }],
  }).select("_id");

  return groups.map((group) => group._id);
}

function buildAccessiblePostsFilter(user, accessibleGroupIds) {
  if (user.role === "super-admin") {
    return {};
  }

  return {
    $or: [
      { group: null },
      {
        group: {
          $in: accessibleGroupIds,
        },
      },
    ],
  };
}

function mergeFilters(...filters) {
  const validFilters = filters.filter(Boolean);

  if (validFilters.length === 0) {
    return {};
  }

  if (validFilters.length === 1) {
    return validFilters[0];
  }

  return { $and: validFilters };
}

async function getGroupAndCheckPostingPermission(groupId, user) {
  const group = await Group.findById(groupId);

  if (!group) {
    throw new AppError("Group not found.", 404);
  }

  if (user.role === "super-admin") {
    return group;
  }

  const canPost =
    containsUser(group.admins, user._id) || containsUser(group.permissions.postCreators || [], user._id);

  if (!canPost) {
    throw new AppError("You do not have permission to create posts in this group.", 403);
  }

  return group;
}

function canManagePost(post, user) {
  return user.role === "super-admin" || String(post.author) === String(user._id);
}

exports.getAllPosts = catchAsync(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);
  const accessibleGroupIds = await getAccessibleGroupIds(req.user);
  const accessFilter = buildAccessiblePostsFilter(req.user, accessibleGroupIds || []);
  const searchFilter = buildSearchFilter(req.query.keyword, ["title", "content"]);
  const filter = mergeFilters(accessFilter, searchFilter);

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate("author", "username email role")
      .populate("group", "name description")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Post.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: posts.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
    data: {
      posts,
    },
  });
});

exports.getPost = catchAsync(async (req, res, next) => {
  const accessibleGroupIds = await getAccessibleGroupIds(req.user);
  const accessFilter = buildAccessiblePostsFilter(req.user, accessibleGroupIds || []);
  const filter = mergeFilters(accessFilter, { _id: req.params.id });

  const post = await Post.findOne(filter)
    .populate("author", "username email role")
    .populate("group", "name description");

  if (!post) {
    return next(new AppError("Post not found or not accessible.", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      post,
    },
  });
});

exports.getUserPosts = catchAsync(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);
  const accessibleGroupIds = await getAccessibleGroupIds(req.user);
  const accessFilter = buildAccessiblePostsFilter(req.user, accessibleGroupIds || []);
  const filter = mergeFilters(accessFilter, { author: req.params.userId });

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate("author", "username email role")
      .populate("group", "name description")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Post.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: posts.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
    data: {
      posts,
    },
  });
});

exports.getMyPosts = catchAsync(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);
  const filter = { author: req.user._id };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate("author", "username email role")
      .populate("group", "name description")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Post.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: posts.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
    data: {
      posts,
    },
  });
});

exports.createPost = catchAsync(async (req, res, next) => {
  if (!req.uploadedImages || req.uploadedImages.length === 0) {
    return next(new AppError("Each post must include at least one uploaded image.", 400));
  }

  let groupId = req.body.group;

  if (groupId === "") {
    groupId = null;
  }

  if (groupId) {
    await getGroupAndCheckPostingPermission(groupId, req.user);
  }

  const post = await Post.create({
    title: req.body.title,
    content: req.body.content,
    images: req.uploadedImages,
    author: req.user._id,
    group: groupId || null,
  });

  const populatedPost = await Post.findById(post._id)
    .populate("author", "username email role")
    .populate("group", "name description");

  res.status(201).json({
    status: "success",
    data: {
      post: populatedPost,
    },
  });
});

exports.updatePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(new AppError("Post not found.", 404));
  }

  if (!canManagePost(post, req.user)) {
    return next(new AppError("You can only update your own posts.", 403));
  }

  const hasBodyUpdates = req.body.title !== undefined || req.body.content !== undefined;
  const hasNewImages = Array.isArray(req.uploadedImages) && req.uploadedImages.length > 0;

  if (!hasBodyUpdates && !hasNewImages) {
    return next(new AppError("Provide post data or new images to update the post.", 400));
  }

  if (req.body.title !== undefined) {
    post.title = req.body.title;
  }

  if (req.body.content !== undefined) {
    post.content = req.body.content;
  }

  if (hasNewImages) {
    post.images = [...post.images, ...req.uploadedImages];
  }

  await post.save();

  const populatedPost = await Post.findById(post._id)
    .populate("author", "username email role")
    .populate("group", "name description");

  res.status(200).json({
    status: "success",
    data: {
      post: populatedPost,
    },
  });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(new AppError("Post not found.", 404));
  }

  if (!canManagePost(post, req.user)) {
    return next(new AppError("You can only delete your own posts.", 403));
  }

  await post.deleteOne();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
