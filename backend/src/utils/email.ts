import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using Resend API (preferred) or SMTP fallback
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Check for Resend API key first (preferred method)
    const resendApiKey = process.env.RESEND_KEY || process.env.RESEND_API_KEY;

    if (resendApiKey) {
      return await sendEmailWithResend(options, resendApiKey);
    }

    // Fallback to SMTP if Resend not configured
    const emailService = process.env.EMAIL_SERVICE || 'smtp';

    // Console mode for development (when explicitly set)
    if (emailService === 'console') {
      logger.info('📧 Email (Console Mode - not actually sent):', {
        to: options.to,
        subject: options.subject,
        html: options.html.substring(0, 200) + '...', // Truncate for logging
        text: options.text,
      });
      return true;
    }

    // Try SMTP as fallback
    return await sendEmailWithSMTP(options);
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
 * Send email using Resend API
 */
const sendEmailWithResend = async (options: EmailOptions, apiKey: string): Promise<boolean> => {
  try {
    const resend = new Resend(apiKey);

    const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev';

    // Extract email from "Name <email>" format if present
    const fromEmailAddress = fromEmail.includes('<') 
      ? fromEmail.match(/<(.+)>/)?.[1] || fromEmail
      : fromEmail;

    const result = await resend.emails.send({
      from: fromEmailAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });

    if (result.error) {
      logger.error('❌ Resend API error:', {
        error: result.error,
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    logger.info(`✅ Email sent successfully via Resend to ${options.to}:`, {
      id: result.data?.id,
      subject: options.subject,
    });

    return true;
  } catch (error) {
    logger.error('❌ Resend API failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
      subject: options.subject,
    });
    throw error;
  }
};

/**
 * Send email using SMTP (fallback method)
 */
const sendEmailWithSMTP = async (options: EmailOptions): Promise<boolean> => {
  try {
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
      logger.warn('📧 Email service not configured. Logging email to console instead:', {
        to: options.to,
        subject: options.subject,
      });
      logger.info('Email content (not sent):', {
        html: options.html.substring(0, 500) + '...',
      });
      return false;
    }

    const transporter = nodemailer.createTransport(smtpConfig);

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

    logger.info(`✅ Email sent successfully via SMTP to ${options.to}:`, {
      messageId: info.messageId,
      subject: options.subject,
      response: info.response,
    });

    return true;
  } catch (error) {
    logger.error('❌ SMTP failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
      subject: options.subject,
    });
    throw error;
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
