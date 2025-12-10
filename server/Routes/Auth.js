const UserSchema = require("../Models/user");
const express = require("express");
const router = express.Router();
const createJWT = require("../Helper/createJWT");
const { encryptPassword, comparePassword } = require("../Helper/auth");
const { genderEncoder } = require("../Helper/genderEncoder");
const { authenticateToken } = require("../Helper/authenticateToken");
const { returnUserInfo } = require("../Helper/User/returnUserInfo");
const v4 = require("uuid").v4;

router.post("/register", async (req, res) => {
  // Destructure request body
  let { username, password, gender, email, relationshipStatus } = req.body;
  username = username.toLowerCase();

  // Check that user does not exist
  const existingUsername = await UserSchema.findOne({ username: username });
  if (existingUsername)
    return res
      .status(400)
      .json({ type: "error", message: "User already exists!" });

  const existingEmail = await UserSchema.findOne({ email: email });
  if (existingEmail)
    return res
      .status(400)
      .json({ type: "error", message: "Email already exists!" });

  // Guard clauses
  if (username.length < 4)
    return res.status(400).json({
      type: "error",
      message: "Username must be at least 4 characters!",
    });
  if (password.length < 8)
    return res.status(400).json({
      type: "error",
      message: "Password must be at least 8 characters!",
    });
  if (username.includes(" "))
    return res
      .status(400)
      .json({ type: "error", message: "Username cannot contain spaces!" });
  if (gender !== "male" && gender !== "female" && gender !== "others")
    return res.status(400).json({ type: "error", message: "Invalid Gender!" });

  // Display name generator
  const encodedGender = genderEncoder(gender);
  const displayName = `${encodedGender}/${username}`;
  const UID = v4();

  const hash = await encryptPassword(password);
  console.log(relationshipStatus, "asdf")

  // Create new User
  const user = new UserSchema({
    UID,
    gender,
    username,
    hash,
    displayName,
    email,
    relationshipStatus,
  });

  // Save User to Database
  try {
    const savedUser = await user.save();
    savedUser.hash = undefined;
    
    // Send back JWT token and status
    const accessToken = createJWT(UID);
    const message = "User successfully registered!";
    res.status(200).json({ type: "success", savedUser, accessToken, message });
  } catch (err) {
    console.log(err);
    res.status(500).json({ type: "error", message: "Internal Server Error" });
  }
});

router.post("/login", async (req, res) => {
  // Destructure request body
  let { username, password } = req.body;
  username = username.toLowerCase();

  // Check that user exists
  const existingUser = await UserSchema.findOne({ username: username });

  //Guard clauses
  if (!existingUser)
    return res
      .status(401)
      .json({ type: "failure", message: "User does not exist!" });

  const hash = existingUser.hash;
  const validated = await comparePassword(password, hash);
  if (!validated)
    return res
      .status(401)
      .json({ type: "failure", message: "Incorrect password!" });

  // Send back JWT token and status
  const accessToken = createJWT(existingUser.UID);
  const message = "User successfully logged in!";
  const savedUser = existingUser;
  savedUser.hash = undefined;

  res.status(200).json({ type: "success", accessToken, message, savedUser });
});

router.get("/", authenticateToken, async (req, res) => {
  // Get user information from DB
  const user = await returnUserInfo(req.user.UID);

  // Exclude password from response (Safety)
  user.hash = undefined;

  // Send back user information
  res.json(user);
});

module.exports = router;
