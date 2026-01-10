import logger from '../config/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email - Currently logs to console/file
 * Can be extended to use SendGrid, AWS SES, Nodemailer, etc.
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const emailService = process.env.EMAIL_SERVICE || 'console';
    
    if (emailService === 'console' || process.env.NODE_ENV === 'development') {
      // Log email to console/file for development
      logger.info('📧 Email (Development Mode):', {
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      
      // In production, you can uncomment this to use a real email service
      // For now, return true to simulate successful sending
      return true;
    }

    // TODO: Integrate with real email service (SendGrid, AWS SES, etc.)
    // Example with Nodemailer:
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({...});
    
    logger.info(`📧 Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
};

/**
 * Generate password reset email content
 */
export const generatePasswordResetEmail = (
  resetToken: string,
  userName: string
): { subject: string; html: string; text: string } => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const expiresIn = process.env.PASSWORD_RESET_EXPIRY || '1 hour';

  const subject = 'Password Reset Request - NACL EMS System';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #15803d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background-color: #15803d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NACL EMS System</h1>
      <p>Password Reset Request</p>
    </div>
    <div class="content">
      <p>Hello ${userName},</p>
      <p>We received a request to reset your password for your NACL EMS System account.</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #15803d;">${resetUrl}</p>
      <div class="warning">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>This link will expire in ${expiresIn}</li>
          <li>If you didn't request this, please ignore this email</li>
          <li>Your password will not change until you click the link above</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>© 2024 NACL. All rights reserved.</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Password Reset Request - NACL EMS System

Hello ${userName},

We received a request to reset your password for your NACL EMS System account.

Please click the following link to reset your password:
${resetUrl}

This link will expire in ${expiresIn}.

If you didn't request this, please ignore this email. Your password will not change until you click the link above.

© 2024 NACL. All rights reserved.
This is an automated message, please do not reply.
  `;

  return { subject, html, text };
};
