import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Create email transporter based on environment variables
 */
const createTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE || 'smtp';

  // SMTP Configuration (supports Gmail, Outlook, custom SMTP, etc.)
  if (emailService === 'smtp' || emailService === 'gmail') {
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
      },
    };

    // Validate SMTP config
    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      logger.error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.');
      return null;
    }

    return nodemailer.createTransport(smtpConfig);
  }

  // SendGrid configuration (if using SendGrid API)
  if (emailService === 'sendgrid') {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      logger.error('SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable.');
      return null;
    }

    // Note: For SendGrid, you'd typically use @sendgrid/mail package
    // This is a placeholder - implement SendGrid if needed
    logger.warn('SendGrid integration not yet implemented. Using SMTP fallback.');
    return null;
  }

  return null;
};

/**
 * Send email using configured email service
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const emailService = process.env.EMAIL_SERVICE || 'smtp';

    // Console mode for development (when explicitly set or no SMTP configured)
    if (emailService === 'console') {
      logger.info('📧 Email (Console Mode - not actually sent):', {
        to: options.to,
        subject: options.subject,
        html: options.html.substring(0, 200) + '...', // Truncate for logging
        text: options.text,
      });
      return true;
    }

    // Try to create transporter
    const transporter = createTransporter();

    if (!transporter) {
      logger.warn('📧 Email service not configured. Logging email to console instead:', {
        to: options.to,
        subject: options.subject,
      });
      logger.info('Email content (not sent):', {
        html: options.html.substring(0, 500) + '...',
      });
      return false;
    }

    // Prepare email message
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@nacl.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    logger.info(`✅ Email sent successfully to ${options.to}:`, {
      messageId: info.messageId,
      subject: options.subject,
      response: info.response,
    });

    return true;
  } catch (error) {
    logger.error('❌ Failed to send email:', {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
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
