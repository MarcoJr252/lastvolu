const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");
const sendEmail = require("../utils/emailService");

// User Registration with OTP
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, mobileNumber, gender } = req.body;

    // Check if email or mobile number already exists
    const existingUser = await User.findOne({ $or: [{ email }, { mobileNumber }] });
    if (existingUser) return res.status(400).json({ message: "Email or Mobile already exists" });

    // Generate OTP
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });

    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10); // OTP valid for 10 minutes

    // Create user with OTP (not verified yet)
    const newUser = new User({ firstName, lastName, email, password, mobileNumber, gender, otp, otpExpires });
    await newUser.save();

    // Send OTP via email
    await sendEmail(email, "Your OTP Code", `Your OTP code is: ${otp}`);

    res.status(201).json({ message: "User registered successfully. Please verify OTP sent to your email." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    // Check OTP validity
    if (user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully. Your account is now active." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// User Login (only if verified)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid email or password" });
    if (!user.isVerified) return res.status(400).json({ message: "Please verify your email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
