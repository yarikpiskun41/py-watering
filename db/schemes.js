const {Schema} = require("mongoose");
const mongoose = require("mongoose");
const userSchema = new Schema({
  email: String,
  password: String
})

const deviceSchema = new Schema({
  deviceId: String,
  name: String,
  wateringHumidity: Number,
  maxGroundHumidity: Number,
  owner: {type: mongoose.Types.ObjectId, ref: "User"}
})

const deviceDataSchema = new Schema({
  date: Date,
  temperature: Number,
  airHumidity: Number,
  groundHumidity: Number,
  ultravioletIndex: Number,
  device: {type: mongoose.Types.ObjectId, ref: "Device"}
})

const Users = mongoose.model("User", userSchema);
const Devices = mongoose.model("Device", deviceSchema);
const DevicesData = mongoose.model("DevicesData", deviceDataSchema);
module.exports = {Users, Devices, DevicesData}
