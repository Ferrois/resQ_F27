require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 8080;
const cors = require("cors");
const mongoose = require("mongoose");
const dbURI = process.env.dbURI;
const server = require("http").createServer(app);
// const io_chat = require("socket.io")(server, { cors: { origin: "*" } }).of("/chat");
// io_chat.use(require("./Helper/authenticateToken").verifyToken);
// const {  addUserListener, removeUserListener } = require("./Socket/online");


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
// const { privateChatListener } = require("./Socket/chat");

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
// io_chat.on("connection", (socket) => {
//   console.log("Socket Connected: " + socket.id);
//   addUserListener(io_chat,socket)
//   removeUserListener(io_chat,socket)
//   privateChatListener(io_chat,socket)
// });

//Listen on the port
server.listen(port, function () {
  console.log("Server started on port " + port);
});