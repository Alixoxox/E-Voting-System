import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getOtpTemplate, getReceiptTemplate } from './emailTemplate.js';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_ID, // Your Gmail address
    pass: process.env.GMAIL_PASSWORD  // Your Gmail App Password
  }
});
export const sendOTP = async (toEmail, otp, purpose = "Account Verification") => {
  
  const htmlContent = getOtpTemplate(otp, purpose);

  const mailOptions = {
    from: `"VoteSphere Security" <${process.env.GMAIL_ID}>`,
    to: toEmail,
    subject: `${purpose} - VoteSphere Code: ${otp}`, // Subject includes OTP for quick notification view
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 OTP sent to ${toEmail} for ${purpose}`);
  } catch (error) {
    console.error("Email failed:", error);
    throw new Error('Failed to send OTP email');
  }
};

export const sendVoteReceipt = async (toEmail, receiptCode, electionName) => {
  const date = new Date().toLocaleString();
  const htmlContent = getReceiptTemplate(receiptCode, electionName, date);

  const mailOptions = {
    from: `"VoteSphere Elections" <${process.env.GMAIL_ID}>`,
    to: toEmail,
    subject: `Vote Confirmation - ${electionName}`,
    html: htmlContent
  };

  try {
    // Note: We await here to catch errors, but you can remove 'await' in controller call
    await transporter.sendMail(mailOptions); 
    console.log(`🧾 Receipt sent to ${toEmail}`);
  } catch (error) {
    console.error("Failed to send receipt:", error);
    // We usually don't throw here because the vote IS cast, only the email failed.
  }
};