const express = require("express");
const { register, login, verifyOTP } = require("../controllers/authController");

const router = express.Router();

// User Registration Route
router.post("/register", register);

// Verify OTP Route
router.post("/verify-otp", verifyOTP);

// User Login Route
router.post("/login", login);

module.exports = router;
