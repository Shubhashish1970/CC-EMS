# Email Configuration Guide

This guide explains how to configure email sending for password reset and other email notifications in the NACL EMS System.

## Email Service Options

The system supports SMTP email sending using nodemailer. You can use any SMTP service:

1. **Gmail** (easiest to set up)
2. **Outlook/Office 365**
3. **Custom SMTP server**
4. **SendGrid** (future support)
5. **AWS SES** (future support)

## Configuration

### 1. Gmail Setup (Recommended for testing)

#### Step 1: Enable 2-Factor Authentication
- Go to your Google Account settings
- Enable 2-Step Verification

#### Step 2: Generate App Password
- Go to: https://myaccount.google.com/apppasswords
- Select "Mail" and "Other (Custom name)"
- Enter "NACL EMS" as the name
- Copy the generated 16-character password

#### Step 3: Set GitHub Secrets

Go to: `https://github.com/Shubhashish1970/CC-EMS/settings/secrets/actions`

Add these secrets:

```
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=NACL EMS <your-email@gmail.com>
FRONTEND_URL=https://cc-ems-dev.web.app
```

### 2. Outlook/Office 365 Setup

```
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
EMAIL_FROM=NACL EMS <your-email@outlook.com>
FRONTEND_URL=https://cc-ems-dev.web.app
```

### 3. Custom SMTP Setup

```
EMAIL_SERVICE=smtp
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASSWORD=your-password
EMAIL_FROM=NACL EMS <noreply@yourdomain.com>
FRONTEND_URL=https://cc-ems-dev.web.app
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EMAIL_SERVICE` | Email service type | `smtp` or `console` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` (TLS) or `465` (SSL) |
| `SMTP_SECURE` | Use SSL/TLS | `false` (port 587) or `true` (port 465) |
| `SMTP_USER` | SMTP username/email | `your-email@gmail.com` |
| `SMTP_PASSWORD` | SMTP password/app password | `your-password` |
| `EMAIL_FROM` | Sender email address | `NACL EMS <noreply@nacl.com>` |
| `FRONTEND_URL` | Frontend URL for reset links | `https://cc-ems-dev.web.app` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PASSWORD_RESET_EXPIRY` | Token expiry time | `1 hour` |

## Testing Email

### Local Development

1. Set environment variables in `.env` file:

```env
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=NACL EMS <your-email@gmail.com>
FRONTEND_URL=http://localhost:3000
```

2. Test password reset:

```bash
# Request password reset
curl -X POST http://localhost:5001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Production

1. Add secrets to GitHub Actions (as shown above)
2. Deploy backend
3. Test password reset from frontend

## Troubleshooting

### Emails not sending

1. **Check SMTP credentials**: Verify username and password are correct
2. **Check SMTP port**: Use 587 for TLS, 465 for SSL
3. **Check firewall**: Ensure SMTP ports are not blocked
4. **Check logs**: Check Cloud Run logs for email errors
5. **Gmail App Password**: Must use App Password, not regular password
6. **Less secure apps**: Some providers require enabling "Less secure app access"

### Gmail-specific issues

- **"Less secure app access"**: This is deprecated. Use App Password instead.
- **App Password required**: Enable 2FA and generate App Password
- **Rate limiting**: Gmail has daily sending limits (500 emails/day for free accounts)

### Security Best Practices

1. **Never commit credentials**: Always use secrets/environment variables
2. **Use App Passwords**: For Gmail, use App Passwords instead of main password
3. **Rotate passwords**: Change SMTP passwords regularly
4. **Monitor logs**: Check email sending logs for suspicious activity
5. **Use dedicated email**: Consider using a dedicated service account email

## Console Mode (Development Only)

For local development without SMTP:

```env
EMAIL_SERVICE=console
```

This will log emails to console instead of sending them.

## Production Recommendations

1. **Use dedicated email service**: SendGrid, AWS SES, or Mailgun
2. **Domain authentication**: Set up SPF, DKIM, DMARC records
3. **Monitor delivery rates**: Track bounce and spam rates
4. **Rate limiting**: Implement rate limiting for password reset requests
5. **Email templates**: Customize email templates for branding

## Support

For email configuration issues:
1. Check Cloud Run logs: `gcloud logging read "resource.type=cloud_run_revision"`
2. Test SMTP connection: Use a tool like `telnet` or `openssl`
3. Verify secrets: Check GitHub Actions secrets are set correctly
