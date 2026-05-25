import mongoose from "mongoose";
import config from "../config/config.js";


// Function to connect to the database 

async function connectDB() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("Connected to Database Successfully ✅");
  } catch (err) {
    console.error("Error connecting to Database ❌", err);
    throw err;
  }
}

export default connectDB;
