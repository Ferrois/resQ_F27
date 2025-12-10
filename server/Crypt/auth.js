const bcrypt = require("bcryptjs");

async function encryptPassword(password) {
  return await bcrypt.hash(password, 5);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

module.exports = { encryptPassword, comparePassword };
