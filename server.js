const dotenv = require("dotenv");

dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");

const port = process.env.PORT || 3000;

async function ensureDatabaseConnection() {
  await connectDB();
}

if (process.env.VERCEL) {
  module.exports = async (req, res) => {
    await ensureDatabaseConnection();
    return app(req, res);
  };
} else {
  ensureDatabaseConnection()
    .then(() => {
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    })
    .catch((error) => {
      console.error("Failed to start server:", error.message);
      process.exit(1);
    });
}
