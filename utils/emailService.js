const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, message, type = "default") => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // 📌 قالب HTML احترافي
    const emailTemplate = `
      <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
        <h2 style="color: #2c3e50; text-align: center;">${
          type === "otp" ? "🔑 OTP Verification" : type === "reset" ? "🔒 Reset Password" : "📢 Notification"
        }</h2>
        <p style="font-size: 16px; color: #555;">${message}</p>
        ${
          type === "otp"
            ? `<p style="text-align: center; font-size: 22px; font-weight: bold; color: #e74c3c;">${message}</p>`
            : ""
        }
        ${
          type === "reset"
            ? `<a href="${message}" style="display: block; width: 200px; text-align: center; margin: 20px auto; padding: 10px; background: #3498db; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>`
            : ""
        }
        <hr style="margin: 20px 0; border: 0.5px solid #ddd;">
        <p style="text-align: center; font-size: 14px; color: #888;">Volunteer App - All Rights Reserved</p>
      </div>
    `;

    const mailOptions = {
      from: `"Volunteer App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: message, // النص العادي (للدعم)
      html: emailTemplate, // HTML متجاوب وجميل
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully to: ${to}, Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;
