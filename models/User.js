const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true },
  gender: { type: String, enum: ["male", "female"], required: true },
  profilePic: { type: String, default: "" },
  coverPic: { type: String, default: "" },
  isDeleted: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },  // تأكيد الحساب
  otp: { type: String },  // كود OTP
  otpExpires: { type: Date } // صلاحية الـ OTP
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("User", UserSchema);
