const express = require("express");
const webpush = require("web-push");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// ---- Replace these with your own VAPID keys ----
const publicVapidKey = "BEtAm8SNrwxSx8gEEwaSvNiXqZf3h_IaQdRjY_LOB328doR6PRfhrhiqhlLAhd_CjoRXPiiKpGr-wIMxueXBIig";
const privateVapidKey = "D3KJzWn_O-1Jq2bPhggE-XWuu7AYABI4VOAVElkQruM";

// Setup web-push
webpush.setVapidDetails(
    "mailto:dominicchia35@gmail.com",
    publicVapidKey,
    privateVapidKey
);

// Store subscriptions
let subscriptions = [];

app.get("/ping", (req, res) => {
    res.send("pong");
});

// Receive subscription from browser
app.post("/subscribe", (req, res) => {
    console.log(req.body)
    const subscription = req.body;
    subscriptions.push(subscription);

    console.log("New subscription:", subscription);

    res.status(201).json({});
});

// Trigger a push notification to all subscribed clients
app.post("/notify", async (req, res) => {
    console.log("RECEIED")
    console.log("Sending notifications with message:", req.body.message);
    const payload = JSON.stringify({
        title: "Emergency Alert",
        body: req.body.message || "Default message",
    });

    for (const sub of subscriptions) {
        try {
            await webpush.sendNotification(sub, payload);
            console.log("Successful push")
        } catch (err) {
            console.error("Push error:", err);
        }
    }

    res.json({ status: "Notifications sent" });
});

app.listen(3000, () => console.log("Server started on port 3000"));
