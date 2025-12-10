require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 8080;
const cors = require("cors");
const mongoose = require("mongoose");
const dbURI = process.env.dbURI;
const server = require("http").createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });
const { authenticateSocket } = require("./Crypt/jwtHelper");
const { registerLocationHandlers } = require("./Socket/LocationControl");
const { registerSOSHandlers } = require("./Socket/SOSControl");

//Connect to MongoDB
mongoose.connect(`${dbURI}`).then((response) => {
    console.log("Connected to MongoDB. Link: " + response.connection.host);
})

//Cors Middleware
// app.use(
//   cors({
//     origin: "*",
//     methods: ["PUT", "GET", "POST", "DELETE"],
//     credentials: true,
//   })
// );
app.use(cors())

//Serve static files from the current directory & Middleware
app.use(express.static(__dirname));
app.use(express.json());

//Paths Import
// const authRoute = require("./Routes/Auth");
// const convoRoute = require("./Routes/Conversations");
// const messageRoute = require("./Routes/Message");
const userRoute = require("./Routes/User");
// const notificationRoute = require("./Routes/Notifications");
// const settingRoute = require("./Routes/Settings");

// //Path initialization
// app.use("/auth", authRoute);
// app.use("/convo", convoRoute);
// app.use("/messages", messageRoute)
app.use("/user", userRoute);
// app.use("/notifications", notificationRoute);
// app.use("/settings", settingRoute);

//Receive post request on the /api route
app.get("/ping", function (req, res) {
  console.log(req.body);
  res.send("pong");
});

// Socket
const locationNamespace = io.of("/socket");
locationNamespace.use(authenticateSocket);
registerLocationHandlers(locationNamespace);
registerSOSHandlers(locationNamespace);

//Listen on the port
server.listen(port, function () {
  console.log("Server started on port " + port);
});