export const getOtpTemplate = (otp, actionType) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { color: #2c3e50; margin: 0; font-size: 24px; }
          .content { text-align: center; color: #333; }
          .otp-box { background: #f8f9fa; border: 1px dashed #2c3e50; padding: 15px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2c3e50; margin: 20px 0; display: inline-block; border-radius: 5px; }
          .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
          .warning { color: #d9534f; font-size: 13px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗳️ VoteSphere Security</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request for <strong>${actionType}</strong> for your account.</p>
            <p>Use the code below to complete the process:</p>
            
            <div class="otp-box">${otp}</div>
            
            <p>This code is valid for <strong>10 minutes</strong>.</p>
            <p class="warning">If you did not request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VoteSphere Electronic Voting System</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };
  export const getReceiptTemplate = (receiptCode, electionName, date) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #007bff; margin: 0; font-size: 26px; }
          .success-icon { font-size: 48px; margin-bottom: 10px; display: block; text-align: center; }
          .details { margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #28a745; }
          .receipt-box { background: #e9ecef; padding: 15px; font-family: 'Courier New', Courier, monospace; font-weight: bold; color: #333; word-break: break-all; border-radius: 4px; margin-top: 10px; font-size: 14px; }
          .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Vote Recorded Successfully</h1>
          </div>
          
          <p>Hello,</p>
          <p>This email confirms that your vote has been securely cast and recorded in the <strong>VoteSphere</strong> system.</p>
          
          <div class="details">
            <p><strong>Election:</strong> ${electionName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Status:</strong> <span style="color: green; font-weight: bold;">CONFIRMED</span></p>
          </div>
  
          <p>Below is your cryptographic receipt ID. You can use this code to verify your vote's inclusion in the final tally audit.</p>
          
          <div class="receipt-box">
            ${receiptCode}
          </div>
  
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VoteSphere. Secure E-Voting Platform.</p>
            <p>Your vote is anonymous. We cannot see who you voted for.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };