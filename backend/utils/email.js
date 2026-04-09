const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.secure,
      auth: {
        user: env.email.user,
        pass: env.email.password,
      },
    });
  }
  return transporter;
}

async function sendEmail(to, subject, html, text) {
  try {
    if (!env.email.host || !env.email.user) {
      console.warn("Email configuration not set. Email not sent:", { to, subject });
      return { success: false, message: "Email service not configured" };
    }

    const mailOptions = {
      from: env.email.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    };

    const info = await getTransporter().sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
}

async function sendOTPEmail(email, otp, purpose = "REGISTRATION") {
  const subjectMap = {
    REGISTRATION: "Verify Your Email - Frap Pay Shop",
    EMAIL_VERIFICATION: "Email Verification Code",
    PASSWORD_RESET: "Password Reset Code",
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-box { background: white; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>FrayPay</h1>
        </div>
        <div class="content">
          <h2>${subjectMap[purpose] || "Verification Code"}</h2>
          <p>Your verification code is:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p>This code will expire in 10 minutes. Please do not share this code with anyone.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} FrayPay. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subjectMap[purpose] || "Verification Code", html);
}

async function sendRegistrationWelcomeEmail(email, name) {
  const subject = "Welcome to FrayPay!";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to FrayPay!</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Thank you for registering with FrayPay! We're excited to have you on board.</p>
          <p>Start exploring our vast collection of books and happy reading!</p>
          <p>Best regards,<br>The FrayPay Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
}

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendRegistrationWelcomeEmail,
};


