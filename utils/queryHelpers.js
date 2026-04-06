function buildPagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function buildSearchFilter(keyword, fields) {
  if (!keyword) {
    return null;
  }

  return {
    $or: fields.map((field) => ({
      [field]: { $regex: keyword, $options: "i" },
    })),
  };
}

module.exports = {
  buildPagination,
  buildSearchFilter,
};
