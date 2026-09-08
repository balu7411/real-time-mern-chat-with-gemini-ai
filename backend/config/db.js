const mongoose = require("mongoose");

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/mern-ai-chat";
    await mongoose.connect(uri);
    console.log(`[db] MongoDB connected -> ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
