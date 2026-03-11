const nodemailer = require('nodemailer');

// Configure transporter — uses SMTP env vars
// For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=you@gmail.com, SMTP_PASS=app-password
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, code) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@classcost.com';

  await transporter.sendMail({
    from: `"ClassCost" <${from}>`,
    to: email,
    subject: `Your ClassCost login code: ${code}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:420px;margin:0 auto;padding:32px;background:#f8f7ff;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:36px;margin-bottom:8px">🎓</div>
          <h1 style="color:#312e81;font-size:22px;margin:0">ClassCost</h1>
          <p style="color:#64748b;font-size:13px;margin-top:4px">Education Expense Manager</p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:24px;text-align:center;border:1px solid #e2e8f0">
          <p style="color:#475569;font-size:14px;margin:0 0 16px">Your verification code is:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f46e5;font-family:monospace;padding:12px;background:#eef2ff;border-radius:12px;display:inline-block">${code}</div>
          <p style="color:#94a3b8;font-size:12px;margin-top:16px">This code expires in 10 minutes.</p>
        </div>
        <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:20px">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { generateOTP, sendOTPEmail };
