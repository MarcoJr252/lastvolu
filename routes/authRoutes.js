const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/auth");

const { 
  register, 
  login, 
  verifyOTP, 
  forgotPassword, 
  verifyOTPForReset, 
  resetPassword, 
  updateProfile,      // ✅ تحديث بيانات الحساب
  uploadProfilePic,   // ✅ رفع صورة الملف الشخصي
  deleteAccount       // ✅ حذف الحساب
} = require("../controllers/authController");

const router = express.Router();

// إعداد multer لتخزين الصور في الذاكرة
const storage = multer.memoryStorage();
const upload = multer({ storage });

// User Registration Route
router.post("/register", register);

// Verify OTP Route
router.post("/verify-otp", verifyOTP);

// User Login Route
router.post("/login", login);

// Forgot Password Route
router.post("/forgot-password", forgotPassword);

// Verify OTP for Password Reset Route
router.post("/verify-reset-otp", verifyOTPForReset);

// Reset Password Route
router.post("/reset-password", resetPassword);

// Update Profile Route 🔹

router.put("/update-profile", authMiddleware, updateProfile);

// Upload Profile Picture Route 🔹
router.post("/upload-profile-pic", authMiddleware, upload.single("profilePic"), uploadProfilePic);

// Delete Account Route 🔹
router.delete("/delete-account", authMiddleware, deleteAccount);

module.exports = router;
