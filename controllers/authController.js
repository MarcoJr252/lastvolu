const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");
const sendEmail = require("../utils/emailService");
const multer = require("multer");
const crypto = require("crypto");

// 🟢 User Registration with OTP
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, mobileNumber, gender } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { mobileNumber }] });

    if (existingUser) return res.status(400).json({ message: "Email or Mobile already exists" });

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ firstName, lastName, email, password: hashedPassword, mobileNumber, gender, otp, otpExpires });
    await newUser.save();

    await sendEmail(email, "Your OTP Code", `Your OTP code is: ${otp}`);
    res.status(201).json({ message: "User registered successfully. Please verify OTP sent to your email." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 🟢 Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.otp !== otp || new Date() > user.otpExpires) return res.status(400).json({ message: "Invalid or expired OTP" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully. Your account is now active." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 🟢 User Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.isVerified) return res.status(400).json({ message: "Invalid credentials or unverified account" });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 🟢 Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail(email, "Password Reset OTP", `Your password reset OTP is: ${otp}`);
    res.status(200).json({ message: "OTP sent to your email for password reset" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 🟢 Verify OTP for Password Reset
exports.verifyOTPForReset = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.status(200).json({ message: "OTP verified, you can reset your password now" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 🟢 Reset Password
// Reset Password (Only if OTP is valid)
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if OTP is valid
    if (!user.otp || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

     //Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


// 🟢 Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, mobileNumber, gender, DOB } = req.body;
    const userId = req.user.userId;

    let encryptedMobile = null;
    if (mobileNumber) {
      encryptedMobile = crypto.createCipher("aes-256-cbc", process.env.MOBILE_SECRET)
        .update(mobileNumber, "utf8", "hex") + 
        crypto.createCipher("aes-256-cbc", process.env.MOBILE_SECRET)
        .final("hex");
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { firstName, lastName, mobileNumber: encryptedMobile, gender, DOB }, { new: true });

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 🟢 Upload Profile Picture
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

exports.uploadProfilePic = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profilePic = req.file.path;

    await User.findByIdAndUpdate(userId, { profilePic });
    res.status(200).json({ message: "Profile picture uploaded successfully", profilePic });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 🟢 Delete Account
exports.deleteAccount = async (req, res) => {
  try {
    console.log("User Data:", req.user); // 🔹 تحقق من بيانات المستخدم

    const userId = req.user.userId; // تأكد أن `userId` موجود في `JWT`
    if (!userId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete Account Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};