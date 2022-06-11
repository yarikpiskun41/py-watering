const bcrypt = require('bcrypt');
const mongoose = require("mongoose");
const {Users, Devices, DevicesData} = require("./schemes");
const crypto = require("crypto");


const url = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.kr1vb.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
mongoose.connect(url, {useNewUrlParser: true}, (error) => error ? console.error(error) : console.log("Connection Ok"));
let db = mongoose.connection

const registerUser = async (email, password) => {
  try {
    if (!email || !password) {
      throw "Invalid Data"
    }

    const foundedUser = await Users.findOne({email})
    if (foundedUser) {
      throw "User is existed"
    }

    const salt = bcrypt.genSaltSync(5);
    const hashPassword = bcrypt.hashSync(password, salt);
    const newUser = await Users.create({email, password: hashPassword})
    await newUser.save();
    return newUser;
  } catch (e) {
    return e;
  }
}

const loginUser = async (email, password) => {
  try {
    if (!email || !password) {
      throw "Invalid Data"
    }

    const foundedUser = await Users.findOne({email})
    if (foundedUser && bcrypt.compareSync(password, foundedUser.password)) {
      return foundedUser;
    }
    throw "Invalid credentials"
  } catch (e) {
    return e;
  }
}

const addUserDevice = async (User) => {
  const Device = await Devices.create({
    deviceId: crypto.randomUUID(),
    name: "",
    wateringHumidity: 0,
    maxGroundHumidity: 0,
    owner: User
  })
  return Device
}

const getUserDevices = async (User) => {
  const UserDevices = await Devices.find({owner: User}, "deviceId name maxGroundHumidity wateringHumidity").exec()
  return UserDevices
}

const deleteUserDevice = async (deviceId) => {
  const DeletedDevice = await Devices.deleteOne({deviceId})
  if (DeletedDevice && DeletedDevice.deletedCount && DeletedDevice.deletedCount === 1) {
    return true
  }
  return false
}

const changeDeviceName = async (deviceId, newName) => {
  const Device = await Devices.findOne({deviceId})
  if (Device) {
    Device.name = newName;
    await Device.save();
    return {deviceId: Device.deviceId, name: Device.name, wateringHumidity: Device.wateringHumidity, maxGroundHumidity: Device.maxGroundHumidity}
  }
  return false
}

const addDeviceData = async ({deviceId, groundHumidity, airHumidity, temperature, ultravioletIndex}) => {
  const device = await Devices.findOne({deviceId})
  if (device) {
    const deviceData = await DevicesData.create({
      date: Date.now(),
      temperature,
      airHumidity,
      groundHumidity,
      ultravioletIndex,
      device
    })
    await deviceData.save();
    return {wateringHumidity: device.wateringHumidity, maxGroundHumidity:device.maxGroundHumidity};
  }
  return false
}

const getLastDeviceData = async (deviceId) => {
  const device = await Devices.findOne({deviceId})
  if (device) {
    const deviceData = await DevicesData.findOne({device}).sort({date: -1})
    if (deviceData) {
      return {
        temperature: deviceData.temperature || 0,
        airHumidity: deviceData.airHumidity || 0,
        groundHumidity: deviceData.groundHumidity || 0,
        ultravioletIndex: deviceData.ultravioletIndex || 0,
        wateringHumidity: device.wateringHumidity,
        maxGroundHumidity: device.maxGroundHumidity,
        deviceId
      };
    } else return {
      temperature: 0,
      airHumidity: 0,
      groundHumidity: 0,
      ultravioletIndex: 0,
      wateringHumidity: device.wateringHumidity,
      maxGroundHumidity: device.maxGroundHumidity,
      deviceId
    }

  }
  return undefined
}

const minMaxDeviceHumidity = async (deviceId) => {
  const device = await Devices.findOne({deviceId})
  if (device) return {wateringHumidity: device.wateringHumidity, maxGroundHumidity:device.maxGroundHumidity};
  return undefined
}

const changeMinMaxDeviceHumidity = async (deviceId, newMin, newMax) => {
  const device = await Devices.findOne({deviceId})
  if (device && newMin && newMax) {
    device.wateringHumidity = newMin;
    device.maxGroundHumidity = newMax;
    await device.save();
    return {wateringHumidity: device.wateringHumidity, maxGroundHumidity: device.maxGroundHumidity};
  }
  return undefined
}


module.exports = {
  registerUser,
  loginUser,
  addUserDevice,
  deleteUserDevice,
  addDeviceData,
  getLastDeviceData,
  minMaxDeviceHumidity,
  changeMinMaxDeviceHumidity,
  getUserDevices,
  changeDeviceName
}
