import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_ID, // Your Gmail address
    pass: process.env.GMAIL_PASSWORD  // Your Gmail App Password
  }
});

export const sendOTP = async (toEmail, otp) => {
  const mailOptions = {
    from: `"VoteSphere Security" <${process.env.GMAIL_ID}>`,
    to: toEmail,
    subject: 'Your Verification Code',
    html: `<h3>Your OTP code is: <b style="font-size: 24px;">${otp}</b></h3><p>This code expires in 10 minutes.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 OTP sent to ${toEmail}`);
  } catch (error) {
    console.error("Email failed:", error);
    throw new Error('Failed to send OTP email');}
};