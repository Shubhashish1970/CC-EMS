import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

// Email service configuration: Uses Resend API (preferred) or SMTP fallback

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

    logger.info('📧 Email service check:', {
      hasResendKey: !!resendApiKey,
      resendKeyLength: resendApiKey?.length || 0,
      emailService: process.env.EMAIL_SERVICE,
    });

    if (resendApiKey) {
      logger.info('📧 Using Resend API for email sending');
      const result = await sendEmailWithResend(options, resendApiKey);
      if (!result) {
        logger.warn('⚠️ Resend failed, will not fallback to SMTP (Resend was explicitly configured)');
      }
      return result;
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
    logger.info('📧 Attempting to send email via Resend:', {
      to: options.to,
      subject: options.subject,
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
    });

    const resend = new Resend(apiKey);

    const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev';

    // Extract email from "Name <email>" format if present
    const fromEmailAddress = fromEmail.includes('<') 
      ? fromEmail.match(/<(.+)>/)?.[1] || fromEmail
      : fromEmail;

    logger.info('📧 Resend email configuration:', {
      from: fromEmailAddress,
      to: options.to,
      subject: options.subject,
    });

    // Prepare email payload
    const emailPayload = {
      from: fromEmailAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    logger.info('📧 Resend email payload (before send):', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      hasHtml: !!emailPayload.html,
      hasText: !!emailPayload.text,
    });

    const result = await resend.emails.send(emailPayload);

    // Log full result for debugging
    logger.info('📧 Resend API response (raw):', {
      result: result,
      resultType: typeof result,
      resultKeys: result ? Object.keys(result) : 'null/undefined',
      hasError: result && 'error' in result ? !!result.error : false,
      hasData: result && 'data' in result ? !!result.data : false,
    });

    // Resend SDK returns { data: {...}, error: null } on success
    // Or { data: null, error: {...} } on error
    if (result && result.error) {
      const errorDetails = result.error as any;
      logger.error('❌ Resend API error:', {
        error: errorDetails,
        errorMessage: errorDetails?.message || JSON.stringify(errorDetails),
        errorName: errorDetails?.name,
        errorType: typeof errorDetails,
        errorString: JSON.stringify(errorDetails),
        fullError: JSON.stringify(errorDetails, Object.getOwnPropertyNames(errorDetails)),
        to: options.to,
        subject: options.subject,
        from: fromEmailAddress,
      });
      return false;
    }

    // Check if data exists (successful send)
    if (!result || !result.data) {
      logger.error('❌ Resend API returned no data (unexpected response):', {
        result: result,
        resultType: typeof result,
        resultString: JSON.stringify(result),
        to: options.to,
        subject: options.subject,
        from: fromEmailAddress,
      });
      return false;
    }

    // Success - email was sent
    const emailId = result.data?.id || 'unknown';
    logger.info(`✅ Email sent successfully via Resend to ${options.to}:`, {
      id: emailId,
      subject: options.subject,
      from: fromEmailAddress,
      data: result.data,
    });

    return true;
  } catch (error) {
    logger.error('❌ Resend API exception:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      to: options.to,
      subject: options.subject,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    return false; // Don't throw, return false so caller can handle gracefully
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
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@kwekareach.com',
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
 * Uses Kweka Reach branding with dark slate + lime green theme
 */
export const generatePasswordResetEmail = (
  resetToken: string,
  userName: string
): { subject: string; html: string; text: string } => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const expiresIn = process.env.PASSWORD_RESET_EXPIRY || '1 hour';
  const currentYear = new Date().getFullYear();

  const subject = 'Password Reset Request - Kweka Reach';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      line-height: 1.6; 
      color: #1e293b; 
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      background-color: #f8fafc;
      padding: 40px 20px;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header { 
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white; 
      padding: 40px 30px; 
      text-align: center;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background-color: #a3e635;
      border-radius: 12px;
      margin-bottom: 16px;
    }
    .logo svg {
      width: 32px;
      height: 32px;
      color: #0f172a;
    }
    .header h1 { 
      margin: 0 0 4px 0; 
      font-size: 24px; 
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .header p { 
      margin: 0; 
      font-size: 14px; 
      color: #94a3b8;
    }
    .content { 
      padding: 40px 30px; 
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .message {
      color: #475569;
      margin-bottom: 24px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button { 
      display: inline-block; 
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff !important; 
      padding: 16px 32px; 
      text-decoration: none; 
      border-radius: 12px; 
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      box-shadow: 0 4px 14px 0 rgba(15, 23, 42, 0.3);
    }
    .button:hover {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    }
    .link-section {
      background-color: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      margin: 24px 0;
    }
    .link-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .link-url {
      word-break: break-all; 
      color: #a3e635;
      font-size: 13px;
      font-weight: 500;
    }
    .warning { 
      background-color: #fefce8; 
      border-left: 4px solid #a3e635; 
      padding: 16px; 
      margin: 24px 0;
      border-radius: 0 12px 12px 0;
    }
    .warning-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .warning ul {
      margin: 0;
      padding-left: 20px;
      color: #475569;
    }
    .warning li {
      margin-bottom: 4px;
    }
    .footer { 
      text-align: center; 
      padding: 24px 30px; 
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .footer p { 
      margin: 4px 0;
      color: #94a3b8; 
      font-size: 12px; 
    }
    .footer-brand {
      font-weight: 600;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
        </div>
        <h1>Kweka Reach</h1>
        <p>Farmer Engagement Platform</p>
      </div>
      <div class="content">
        <p class="greeting">Hello ${userName},</p>
        <p class="message">We received a request to reset your password for your Kweka Reach account. Click the button below to create a new password.</p>
        
        <div class="button-container">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        
        <div class="link-section">
          <p class="link-label">Or copy this link to your browser:</p>
          <p class="link-url">${resetUrl}</p>
        </div>
        
        <div class="warning">
          <p class="warning-title">
            <span>⚠️</span> Important Security Information
          </p>
          <ul>
            <li>This link will expire in <strong>${expiresIn}</strong></li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Your password will remain unchanged until you use this link</li>
          </ul>
        </div>
      </div>
      <div class="footer">
        <p class="footer-brand">© ${currentYear} Kweka Reach. All rights reserved.</p>
        <p>This is an automated message, please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Password Reset Request - Kweka Reach
=====================================

Hello ${userName},

We received a request to reset your password for your Kweka Reach account.

Please click the following link to reset your password:
${resetUrl}

IMPORTANT:
• This link will expire in ${expiresIn}
• If you didn't request this reset, please ignore this email
• Your password will remain unchanged until you use this link

-------------------------------------
© ${currentYear} Kweka Reach. All rights reserved.
Farmer Engagement Platform

This is an automated message, please do not reply.
  `;

  return { subject, html, text };
};
