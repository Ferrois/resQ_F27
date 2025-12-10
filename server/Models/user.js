const mongoose = require("mongoose");

const MedicalHistorySchema = mongoose.Schema({
  condition: {
    type: String,
    required: true
  },
  treatment: {
    type: String,
  },
  remarks: {
    type: String,
  }
});

const DependenciesSchema = mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  }
});

const SkillsSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  level: {
    type: String,
    enum: ["adequate", "proficient", "professional"],
    required: true
  }
});

const UserSchema = mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  medical: {
    type: [MedicalHistorySchema],
    required: true
  },
  skills: {
    type: [SkillsSchema],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  dependencies: {
    type: [DependenciesSchema],
    required: true
  }
});

module.exports = mongoose.model("user", UserSchema);
