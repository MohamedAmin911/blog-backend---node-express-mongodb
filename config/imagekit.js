const ImageKit = require("@imagekit/nodejs");

let client = null;

function getImageKitClient() {
  if (client) {
    return client;
  }

  if (!process.env.IMAGEKIT_PRIVATE_KEY) {
    return null;
  }

  client = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  });

  return client;
}

module.exports = getImageKitClient;
