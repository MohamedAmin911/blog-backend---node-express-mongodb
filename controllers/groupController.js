const Group = require("../models/Group");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { buildPagination, buildSearchFilter } = require("../utils/queryHelpers");

function normalizeIds(ids = []) {
  return [...new Set(ids.map((id) => String(id)))];
}

function containsUser(ids, userId) {
  return ids.some((id) => String(id) === String(userId));
}

function addIds(existingIds, idsToAdd) {
  return normalizeIds([...existingIds.map(String), ...idsToAdd.map(String)]);
}

function removeIds(existingIds, idsToRemove) {
  const removeSet = new Set(idsToRemove.map(String));
  return existingIds.filter((id) => !removeSet.has(String(id))).map(String);
}

async function ensureUsersExist(userIds) {
  if (!userIds.length) {
    return;
  }

  const count = await User.countDocuments({ _id: { $in: userIds } });

  if (count !== userIds.length) {
    throw new AppError("One or more provided users do not exist.", 404);
  }
}

async function findGroupWithAccess(groupId, user, requireAdmin = false) {
  const group = await Group.findById(groupId);

  if (!group) {
    throw new AppError("Group not found.", 404);
  }

  if (user.role === "super-admin") {
    return group;
  }

  const isAdmin = containsUser(group.admins, user._id);
  const isMember = containsUser(group.members, user._id);

  if (requireAdmin && !isAdmin) {
    throw new AppError("Only group admins can manage this group.", 403);
  }

  if (!requireAdmin && !isAdmin && !isMember) {
    throw new AppError("You do not have access to this group.", 403);
  }

  return group;
}

function groupQueryForUser(user) {
  if (user.role === "super-admin") {
    return {};
  }

  return {
    $or: [{ admins: user._id }, { members: user._id }],
  };
}

exports.getGroups = catchAsync(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);
  const searchFilter = buildSearchFilter(req.query.keyword, ["name", "description"]);
  const filter = searchFilter
    ? { $and: [groupQueryForUser(req.user), searchFilter] }
    : groupQueryForUser(req.user);

  const [groups, total] = await Promise.all([
    Group.find(filter)
      .populate("admins", "username email role")
      .populate("members", "username email role")
      .populate("permissions.postCreators", "username email role")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Group.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: groups.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
    data: {
      groups,
    },
  });
});

exports.getGroup = catchAsync(async (req, res) => {
  const group = await findGroupWithAccess(req.params.id, req.user);

  await group.populate("admins", "username email role");
  await group.populate("members", "username email role");
  await group.populate("permissions.postCreators", "username email role");

  res.status(200).json({
    status: "success",
    data: {
      group,
    },
  });
});

exports.createGroup = catchAsync(async (req, res) => {
  const requestedAdmins = normalizeIds(req.body.admins || []);
  const requestedMembers = normalizeIds(req.body.members || []);
  const creatorId = req.user._id.toString();

  await ensureUsersExist(requestedAdmins);
  await ensureUsersExist(requestedMembers);

  const admins = addIds(requestedAdmins, [creatorId]);
  const members = addIds([...requestedMembers, ...admins], []);

  const group = await Group.create({
    name: req.body.name,
    description: req.body.description || "",
    admins,
    members,
    permissions: {
      postCreators: admins,
    },
  });

  const populatedGroup = await Group.findById(group._id)
    .populate("admins", "username email role")
    .populate("members", "username email role")
    .populate("permissions.postCreators", "username email role");

  res.status(201).json({
    status: "success",
    data: {
      group: populatedGroup,
    },
  });
});

exports.updateGroup = catchAsync(async (req, res) => {
  const group = await findGroupWithAccess(req.params.id, req.user, true);

  if (req.body.name !== undefined) {
    group.name = req.body.name;
  }

  if (req.body.description !== undefined) {
    group.description = req.body.description || "";
  }

  await group.save();
  await group.populate("admins", "username email role");
  await group.populate("members", "username email role");
  await group.populate("permissions.postCreators", "username email role");

  res.status(200).json({
    status: "success",
    data: {
      group,
    },
  });
});

exports.deleteGroup = catchAsync(async (req, res) => {
  const group = await findGroupWithAccess(req.params.id, req.user, true);
  await group.deleteOne();

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.addMembers = catchAsync(async (req, res) => {
  const group = await findGroupWithAccess(req.params.id, req.user, true);
  const userIds = normalizeIds(req.body.userIds);

  await ensureUsersExist(userIds);

  group.members = addIds(group.members, userIds);
  await group.save();
  await group.populate("admins", "username email role");
  await group.populate("members", "username email role");
  await group.populate("permissions.postCreators", "username email role");

  res.status(200).json({
    status: "success",
    data: {
      group,
    },
  });
});

exports.removeMembers = catchAsync(async (req, res, next) => {
  const group = await findGroupWithAccess(req.params.id, req.user, true);
  const userIds = normalizeIds(req.body.userIds);

  const updatedAdmins = removeIds(group.admins, userIds);

  if (updatedAdmins.length === 0) {
    return next(new AppError("A group must always have at least one admin.", 400));
  }

  group.admins = updatedAdmins;
  group.members = removeIds(group.members, userIds);
  group.permissions.postCreators = removeIds(group.permissions.postCreators || [], userIds);

  await group.save();
  await group.populate("admins", "username email role");
  await group.populate("members", "username email role");
  await group.populate("permissions.postCreators", "username email role");

  res.status(200).json({
    status: "success",
    data: {
      group,
    },
  });
});

exports.addAdmins = catchAsync(async (req, res) => {
  const group = await findGroupWithAccess(req.params.id, req.user, true);
  const userIds = normalizeIds(req.body.userIds);

  await ensureUsersExist(userIds);

  group.admins = addIds(group.admins, userIds);
  group.members = addIds(group.members, userIds);
  group.permissions.postCreators = addIds(group.permissions.postCreators || [], userIds);

  await group.save();
  await group.populate("admins", "username email role");
  await group.populate("members", "username email role");
  await group.populate("permissions.postCreators", "username email role");

  res.status(200).json({
    status: "success",
    data: {
      group,
    },
  });
});

exports.removeAdmins = catchAsync(async (req, res, next) => {
  const group = await findGroupWithAccess(req.params.id, req.user, true);
  const userIds = normalizeIds(req.body.userIds);
  const updatedAdmins = removeIds(group.admins, userIds);

  if (updatedAdmins.length === 0) {
    return next(new AppError("A group must always have at least one admin.", 400));
  }

  group.admins = updatedAdmins;
  await group.save();
  await group.populate("admins", "username email role");
  await group.populate("members", "username email role");
  await group.populate("permissions.postCreators", "username email role");

  res.status(200).json({
    status: "success",
    data: {
      group,
    },
  });
});

exports.updatePostingPermissions = catchAsync(async (req, res) => {
  const group = await findGroupWithAccess(req.params.id, req.user, true);
  const userIds = normalizeIds(req.body.userIds);

  await ensureUsersExist(userIds);

  if (req.body.canPost) {
    group.permissions.postCreators = addIds(group.permissions.postCreators || [], userIds);
    group.members = addIds(group.members, userIds);
  } else {
    group.permissions.postCreators = removeIds(group.permissions.postCreators || [], userIds);
  }

  await group.save();
  await group.populate("admins", "username email role");
  await group.populate("members", "username email role");
  await group.populate("permissions.postCreators", "username email role");

  res.status(200).json({
    status: "success",
    data: {
      group,
    },
  });
});
