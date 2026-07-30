# Email Notifications Setup Guide

## Overview

The CECBS system now sends automated email notifications to exporters for:
1. **Application Approved** - with login credentials
2. **Application Rejected** - with resubmission instructions  
3. **Application Resubmitted** - notification to ECTA admins

---

## Email Service Features

### 1. Approval Email
**Sent to**: Exporter (applicant)
**Triggered by**: ECTA admin approves application
**Contains**:
- ✅ Exporter ID and License Number
- ✅ Banking details (if provided)
- ✅ Login credentials (username & temporary password)
- ✅ Portal URL
- ✅ Step-by-step instructions
- ✅ Support contact information

### 2. Rejection Email
**Sent to**: Exporter (applicant)
**Triggered by**: ECTA admin rejects application
**Contains**:
- ⚠️ Rejection reason
- ✅ Login credentials for resubmission
- ✅ Instructions on how to correct and resubmit
- ✅ Link to resubmission page
- ✅ Support contact information

### 3. Resubmission Notification
**Sent to**: ECTA admins
**Triggered by**: Exporter resubmits corrected application
**Contains**:
- 📋 Applicant details
- 📅 Timeline (original submission, rejection, resubmission dates)
- 🔗 Link to review the application
- ✅ Action required notice

---

## Configuration

### Step 1: Update .env File

Add the following configuration to your `.env` file in the API directory (`c:\goCBC\api\.env`):

```env
# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# ECTA admin email for notifications
ECTA_NOTIFICATION_EMAIL=admin@ecta.gov.et
```

### Step 2: Gmail Configuration (Recommended for Testing)

If using Gmail:

1. **Enable 2-Factor Authentication** on your Google Account
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate an App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)"
   - Name it: "CECBS API"
   - Click "Generate"
   - Copy the 16-character password

3. **Update .env**
   ```env
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App password from step 2
   ```

### Step 3: Other SMTP Providers

#### Microsoft Outlook / Office 365
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### Custom SMTP Server
```env
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@your-domain.com
SMTP_PASSWORD=your-secure-password
```

#### Amazon SES (Production Recommended)
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

---

## Testing Email Service

### Test 1: Check Email Service Status

The API logs will show if email is configured:

```bash
# Email NOT configured
warn: ⚠️  Email service not configured. Set SMTP_USER and SMTP_PASSWORD in .env

# Email CONFIGURED
info: ✅ Email service initialized and ready
```

### Test 2: Approve an Application

1. Login as ECTA admin: `http://localhost:3000/login`
   - Username: `ecta_admin`
   - Password: `password123`

2. Go to "Exporter Applications" tab

3. Find a pending application

4. Click "Approve"

5. Fill in approval details

6. Click "Submit Approval"

7. **Check**:
   - API logs should show: `✅ Email sent successfully to <email>: 🎉 Exporter Application Approved`
   - Exporter should receive email with credentials

### Test 3: Reject an Application

1. As ECTA admin, find a pending application

2. Click "Reject"

3. Enter rejection reason: "TIN number requires verification"

4. Click "Submit Rejection"

5. **Check**:
   - API logs should show: `✅ Email sent successfully to <email>: Application Status Update`
   - Exporter should receive email with resubmission instructions

### Test 4: Resubmit Application

1. Login with rejected user credentials (from rejection email)

2. Update the application fields

3. Click "Resubmit Corrected Application"

4. **Check**:
   - API logs should show: `✅ Email sent successfully to admin@ecta.gov.et: 📬 Application Resubmitted`
   - ECTA admin should receive notification email

---

## Email Templates

### Approval Email Preview

```
Subject: 🎉 Exporter Application Approved - [Company Name]

Dear [Company Name],

Your exporter application has been APPROVED by ECTA.

Exporter ID: EXP8206239
License Number: ECTA-LIC-2026-878
Email: exporter@example.com

Banking Details:
• Bank: Commercial Bank of Ethiopia
• Branch: Jimma Branch
• Branch Code: CBE-301

Login Credentials:
• Username: EXP8206239
• Temporary Password: EXP8206239@xyz123
• Portal URL: http://localhost:3000/login

IMPORTANT: Please change your password after first login.

Next Steps:
1. Login at http://localhost:3000/login
2. Change your password
3. View license details and expiry date
4. Create sales contracts with buyers
5. Manage coffee shipments
6. Track exports and compliance

Welcome to the Ethiopian Coffee Export Consortium!

Best regards,
Ethiopian Coffee & Tea Authority (ECTA)
```

### Rejection Email Preview

```
Subject: Application Status Update - [Company Name]

Dear [Company Name],

Your application (APP-12345678) requires corrections before approval.

Rejection Reason:
TIN number does not match business license records

Good News: You can correct the issues and resubmit!

Login Credentials:
• Username: [temporary_username]
• Password: Rejectedxyz123!
• Resubmit URL: http://localhost:3000/login

Steps to Resubmit:
1. Login using the credentials above
2. Review the rejection reason
3. Update incorrect information
4. Submit corrected application

For assistance, contact: applications@ecta.gov.et

Best regards,
Ethiopian Coffee & Tea Authority (ECTA)
```

### Resubmission Notification Preview

```
Subject: 📬 Application Resubmitted - [Company Name]

Dear ECTA Administrator,

An exporter has resubmitted their corrected application.

Applicant: [Company Name]
Application ID: APP-12345678
Email: exporter@example.com

Timeline:
- Original Submission: [date]
- Rejection Date: [date]
- Resubmission Date: [date]

Please review the application and approve or reject accordingly.

Review Application: http://localhost:3000/portals/ecta

Best regards,
CECBS System
```

---

## Troubleshooting

### Issue 1: Emails Not Sending

**Check 1**: Verify SMTP configuration
```bash
# Check API logs on startup
info: ✅ Email service initialized and ready
```

**Check 2**: Test SMTP connection manually
```javascript
// In Node.js REPL or test script
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});
```

**Check 3**: Gmail specific - App Password
- Make sure you're using an App Password, not your regular Gmail password
- App passwords are 16 characters with spaces: `xxxx xxxx xxxx xxxx`

### Issue 2: Emails Going to Spam

**Solution 1**: Verify sender domain
- Use a verified email address
- Configure SPF and DKIM records for your domain

**Solution 2**: Use a professional SMTP service
- Amazon SES
- SendGrid
- Mailgun
- Postmark

### Issue 3: "Authentication Failed" Error

**Causes**:
- Wrong username or password
- App password not generated (for Gmail)
- 2FA not enabled (for Gmail)
- SMTP settings incorrect

**Solution**:
1. Double-check SMTP_USER and SMTP_PASSWORD in .env
2. For Gmail: Generate new App Password
3. Restart API after changing .env

---

## Production Deployment

### Recommended Setup

1. **Use Amazon SES** (or similar professional service)
   ```env
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<your-ses-username>
   SMTP_PASSWORD=<your-ses-password>
   ```

2. **Verify Sender Email**
   - Verify your domain with SES
   - Or verify specific email addresses

3. **Monitor Email Delivery**
   - Set up bounce and complaint notifications
   - Monitor delivery rates
   - Check spam reports

4. **Update Email Templates**
   - Customize branding and colors
   - Add your organization's logo
   - Update contact information
   - Translate to local language (Amharic)

5. **Set Production URL**
   ```env
   FRONTEND_URL=https://coffeex.cbe.com.et
   ECTA_NOTIFICATION_EMAIL=admin@ecta.gov.et
   ```

---

## Customization

### Modify Email Templates

Email templates are in: `c:\goCBC\api\src\services\emailService.ts`

**To change approval email**:
Edit the `sendApprovalEmail` method (line ~110)

**To change rejection email**:
Edit the `sendRejectionEmail` method (line ~300)

**To change resubmission notification**:
Edit the `sendResubmissionNotification` method (line ~490)

### Add More Email Types

```typescript
// In emailService.ts
public async sendCustomEmail(data: CustomEmailData): Promise<boolean> {
  const subject = `Your Custom Subject`;
  
  const html = `
<!DOCTYPE html>
<html>
  <!-- Your HTML template here -->
</html>
  `;
  
  const text = `Plain text version`;
  
  return this.sendEmail({ to: data.email, subject, html, text });
}
```

---

## Security Best Practices

1. **Never commit .env file** - it contains sensitive SMTP credentials
2. **Use App Passwords** - not your main Gmail password
3. **Rotate credentials** - change SMTP password periodically
4. **Limit permissions** - use dedicated SMTP accounts
5. **Monitor usage** - watch for unusual email activity
6. **Rate limiting** - prevent email spam/abuse
7. **Validate email addresses** - before sending
8. **Use HTTPS** - for all email links in production

---

## API Logs

### Successful Email
```
info: ✅ Email sent successfully to exporter@example.com: 🎉 Exporter Application Approved
```

### Failed Email
```
error: Failed to send email to exporter@example.com: Error: Invalid login
```

### Email Not Configured
```
warn: Email not sent - service not configured: Application Status Update
```

---

## Support

### Email Not Working?

1. Check API logs for error messages
2. Verify .env configuration
3. Test SMTP connection manually
4. Check firewall/network settings
5. Contact your SMTP provider support

### Need Help?

- **Technical Support**: tech@cecbs.et
- **ECTA Support**: support@ecta.gov.et
- **Documentation**: Check this file and code comments

---

## Summary

✅ **Email service implemented** for approval, rejection, and resubmission
✅ **Beautiful HTML templates** with responsive design
✅ **Graceful fallback** - API works even if email not configured
✅ **Easy configuration** - just update .env file
✅ **Production ready** - supports all major SMTP providers

**Status**: Ready for testing and deployment

**Date**: July 18, 2026
