const dns = require("dns");
const mongoose = require("mongoose");

let cachedConnection = null;
let cachedPromise = null;

function configureDnsServers() {
  const configuredServers = process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(",").map((server) => server.trim()).filter(Boolean)
    : null;

  if (configuredServers && configuredServers.length > 0) {
    dns.setServers(configuredServers);
    return;
  }

  const currentServers = dns.getServers();
  const usesLocalStubOnly =
    currentServers.length === 1 &&
    (currentServers[0] === "127.0.0.1" || currentServers[0] === "::1");

  if (usesLocalStubOnly && process.env.MONGO_URI && process.env.MONGO_URI.startsWith("mongodb+srv://")) {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }
}

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  configureDnsServers();

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(process.env.MONGO_URI).then((mongooseInstance) => {
      cachedConnection = mongooseInstance;
      return mongooseInstance;
    });
  }

  return cachedPromise;
}

module.exports = connectDB;
