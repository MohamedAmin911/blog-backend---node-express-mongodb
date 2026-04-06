const path = require("path");
const multer = require("multer");
const { toFile } = require("@imagekit/nodejs");
const slugify = require("slugify");

const getImageKitClient = require("../config/imagekit");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }

  cb(new AppError("Only image files are allowed.", 400), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024,
  },
});

const uploadPostImages = upload.array("images", 10);

const uploadOnImageKit = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    req.uploadedImages = [];
    return next();
  }

  const imageKit = getImageKitClient();

  if (!imageKit) {
    return next(
      new AppError(
        "ImageKit is not configured. Please set IMAGEKIT_PRIVATE_KEY before uploading images.",
        500
      )
    );
  }

  const folder = `/blog-posts/${req.user._id}`;

  const uploads = await Promise.all(
    req.files.map(async (file) => {
      const extension = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, extension);
      const safeBaseName = slugify(baseName, { lower: true, strict: true }) || "image";
      const fileName = `${Date.now()}-${safeBaseName}${extension}`;

      const uploadResponse = await imageKit.files.upload({
        file: await toFile(file.buffer, fileName),
        fileName,
        folder,
        useUniqueFileName: true,
        isPublished: true,
      });

      return {
        url: uploadResponse.url,
        fileId: uploadResponse.fileId,
        filePath: uploadResponse.filePath,
        name: uploadResponse.name,
      };
    })
  );

  req.uploadedImages = uploads;
  next();
});

module.exports = {
  uploadPostImages,
  uploadOnImageKit,
};
