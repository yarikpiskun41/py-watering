require('dotenv').config();
const express = require("express");
const cors = require("cors");
const {
  registerUser,
  loginUser,
  addUserDevice,
  deleteUserDevice,
  addDeviceData,
  getLastDeviceData,
  minMaxDeviceHumidity,
  getUserDevices,
  changeDeviceName, changeMinMaxDeviceHumidity
} = require("./db");
const {sign, verify} = require('jsonwebtoken');
const {Users} = require("./db/schemes");
const app = express();


const port = process.env.PORT || 3005;

app.use(express.json())
app.use(cors());

app.post("/register", async (req, res) => {
  const {email = "", password = ""} = req.body;
  const userRequest = await registerUser(email, password)
  if (typeof userRequest === "object") {
    let token = signUser(userRequest)
    res.send(JSON.stringify({token}));
  } else {
    res.status(400);
    res.send(JSON.stringify({message: userRequest}))
  }
})
app.post("/login", async (req, res) => {
  const {email = "", password = ""} = req.body;
  const userRequest = await loginUser(email, password)
  if (typeof userRequest === "object") {
    let token = signUser(userRequest)
    res.send(JSON.stringify({token}));
  } else {
    res.status(422);
    res.send(JSON.stringify({message: userRequest}))
  }
})
app.get("/user-devices", async (req, res) => {
  const token = req.headers.authorization;
  const verifiedUser = await verifyUserByToken(token)
  if (verifiedUser) {
    const UserDevices = await getUserDevices(verifiedUser);
    res.send(JSON.stringify(UserDevices));
  } else {
    res.status(403);
    res.send(JSON.stringify({message: "Can not find user"}));
  }
})
app.post("/create-device", async (req, res) => {
  const token = req.headers.authorization;
  const verifiedUser = await verifyUserByToken(token)
  if (verifiedUser) {
    const createdDevice = await addUserDevice(verifiedUser);
    res.send(JSON.stringify({
      wateringHumidity: createdDevice.wateringHumidity,
      maxGroundHumidity: createdDevice.maxGroundHumidity,
      name: createdDevice.name,
      deviceId: createdDevice.deviceId
    }));
  } else {
    res.status(403);
    res.send(JSON.stringify({message: "Can not find user"}));
  }
})
app.delete("/delete-device", async (req, res) => {
  const token = req.headers.authorization;
  const verifiedUser = await verifyUserByToken(token)
  if (verifiedUser) {
    const {deviceId} = req.body || {};
    const isDeviceDeleted = await deleteUserDevice(deviceId);
    if (isDeviceDeleted) {
      res.sendStatus(200)
    } else {
      res.status(404);
      res.send(JSON.stringify({message: "Device was not found"}))
    }
  } else {
    res.status(403);
    res.send(JSON.stringify({message: "Can not find user"}));
  }
})
app.put("/change-device-name", async (req, res) => {
  const token = req.headers.authorization;
  const verifiedUser = await verifyUserByToken(token)
  if (verifiedUser) {
    const {deviceId, newName} = req.body || {};
    const updatedDevice = await changeDeviceName(deviceId, newName);
    if (updatedDevice) {
      res.send(JSON.stringify(updatedDevice))
    } else {
      res.status(404);
      res.send(JSON.stringify({message: "Device was not found"}))
    }
  } else {
    res.status(403);
    res.send(JSON.stringify({message: "Can not find user"}));
  }
})
app.post("/add-device-data", async (req, res) => {
  let {deviceId, groundHumidity, airHumidity, temperature, ultravioletIndex} = req.body || {};
  deviceId = deviceId.replaceAll("\t", "");
  deviceId = deviceId.replaceAll("\r", "");
  deviceId = deviceId.replaceAll("\n", "");
  const isDataWasAdded = await addDeviceData({deviceId, groundHumidity, airHumidity, temperature, ultravioletIndex})
  console.log("POST")
  if (isDataWasAdded) {
    res.send(JSON.stringify(isDataWasAdded));
  } else {
    res.sendStatus(400);
  }
})
app.get("/last-device-data/:id", async (req, res) => {
  const token = req.headers.authorization;
  const verifiedUser = await verifyUserByToken(token)
  if (verifiedUser) {
    const deviceId = req.params.id || "";
    const lastDeviceData = await getLastDeviceData(deviceId);
    if (lastDeviceData) {
      res.send(JSON.stringify(lastDeviceData))
    } else {
      res.status(404);
      res.send(JSON.stringify({message: "Device was not found"}))
    }
  } else {
    res.status(403);
    res.send(JSON.stringify({message: "Can not find user"}));
  }
})
app.get("/min-max-device-humidity/:id", async (req, res) => {
  let deviceId = req.params.id;
  deviceId = deviceId.replaceAll("\t", "");
  deviceId = deviceId.replaceAll("\r", "");
  deviceId = deviceId.replaceAll("\n", "");
  const minUserDeviceHumidity = await minMaxDeviceHumidity(deviceId)
  console.log("GET")
  if (minUserDeviceHumidity) {
    res.send(JSON.stringify(minUserDeviceHumidity));
  } else {
    res.sendStatus(404);
  }
})
app.put("/change-min-max-device-humidity/:deviceId/:wateringHumidity/:maxGroundHumidity", async (req, res) => {
  const {deviceId, wateringHumidity, maxGroundHumidity} = req.params;
  const newDeviceData = await changeMinMaxDeviceHumidity(deviceId, wateringHumidity, maxGroundHumidity)
  if (newDeviceData) {
    res.send(JSON.stringify(newDeviceData));
  } else {
    res.sendStatus(404);
  }
})


app.listen(port, () => console.log(`Started at ${port}`));


const signUser = (user) => 'Bearer ' + sign({
  sub: {
    id: user._id,
    username: user.email,
    createdAt: Date.now()
  }
}, process.env.JWT_KEY)
const verifyUserByToken = async (data) => {
  try {
    if (data && data.startsWith('Bearer ')) {
      const token = data.slice('Bearer '.length)
      let tokenData = verify(token, process.env.JWT_KEY)
      let user = await Users.findById(tokenData.sub.id)
      return user
    }
  } catch (e) {
    return undefined
  }

}
