// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Email Notification Service

import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ApprovalEmailData {
  exporterName: string;
  exporterId: string;
  licenseNumber: string;
  email: string;
  username: string;
  temporaryPassword: string;
  bankName?: string;
  bankBranch?: string;
  bankBranchCode?: string;
  loginUrl: string;
}

interface RejectionEmailData {
  exporterName: string;
  applicationId: string;
  email: string;
  reason: string;
  username: string;
  temporaryPassword: string;
  resubmitUrl: string;
}

interface ResubmissionNotificationData {
  exporterName: string;
  applicationId: string;
  email: string;
  originalSubmissionDate: string;
  rejectionDate: string;
  resubmissionDate: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initialize(): void {
    try {
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || '',
        },
      };

      // Check if email is configured
      if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        logger.warn('⚠️  Email service not configured. Set SMTP_USER and SMTP_PASSWORD in .env');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('❌ Email service verification failed:', error);
          this.isConfigured = false;
        } else {
          logger.info('✅ Email service initialized and ready');
          this.isConfigured = true;
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.warn('Email not sent - service not configured:', options.subject);
      return false;
    }

    try {
      const mailOptions = {
        from: `"ECTA - Ethiopian Coffee Export Consortium" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || '',
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Email sent successfully to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  public async sendApprovalEmail(data: ApprovalEmailData): Promise<boolean> {
    const subject = `🎉 Exporter Application Approved - ${data.exporterName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #078930 0%, #056622 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .success-badge { background: #4caf50; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 10px 0; }
    .credentials-box { background: #fff; border-left: 4px solid #078930; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .info-item { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
    .info-label { font-weight: bold; color: #078930; }
    .button { display: inline-block; background: #078930; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>☕ Ethiopian Coffee Export Consortium</h1>
      <h2>Application Approved!</h2>
    </div>
    
    <div class="content">
      <div class="success-badge">✅ Congratulations!</div>
      
      <p>Dear <strong>${data.exporterName}</strong>,</p>
      
      <p>We are pleased to inform you that your exporter application has been <strong>approved</strong> by the Ethiopian Coffee & Tea Authority (ECTA).</p>
      
      <h3>📋 Your Exporter Details:</h3>
      <div class="info-item">
        <span class="info-label">Exporter ID:</span> ${data.exporterId}
      </div>
      <div class="info-item">
        <span class="info-label">License Number:</span> ${data.licenseNumber}
      </div>
      <div class="info-item">
        <span class="info-label">Email:</span> ${data.email}
      </div>
      
      ${data.bankName ? `
      <h3>🏦 Banking Details:</h3>
      <div class="info-item">
        <span class="info-label">Bank:</span> ${data.bankName}
      </div>
      ${data.bankBranch ? `<div class="info-item"><span class="info-label">Branch:</span> ${data.bankBranch}</div>` : ''}
      ${data.bankBranchCode ? `<div class="info-item"><span class="info-label">Branch Code:</span> ${data.bankBranchCode}</div>` : ''}
      <div class="info-item">
        <span class="info-label">LC Processing:</span> This branch will approve Letters of Credit
      </div>
      ` : ''}
      
      <h3>🔐 Your Login Credentials:</h3>
      <div class="credentials-box">
        <div class="info-item">
          <span class="info-label">Username:</span> <strong>${data.username}</strong>
        </div>
        <div class="info-item">
          <span class="info-label">Temporary Password:</span> <strong>${data.temporaryPassword}</strong>
        </div>
        <div class="info-item">
          <span class="info-label">Portal URL:</span> <a href="${data.loginUrl}">${data.loginUrl}</a>
        </div>
      </div>
      
      <div class="warning">
        ⚠️ <strong>Important:</strong> Please change your password immediately after your first login for security purposes.
      </div>
      
      <a href="${data.loginUrl}" class="button">🚀 Access Exporter Portal</a>
      
      <h3>📝 Next Steps:</h3>
      <ol>
        <li><strong>Login to the Exporter Portal</strong> using the credentials above</li>
        <li><strong>Change your password</strong> to a secure password of your choice</li>
        <li><strong>View your license details</strong> and expiry date</li>
        <li><strong>Create sales contracts</strong> with buyers</li>
        <li><strong>Manage coffee shipments</strong> and exports</li>
        <li><strong>Track compliance</strong> and generate export documentation</li>
      </ol>
      
      <h3>📞 Support:</h3>
      <p>If you have any questions or need assistance, please contact:</p>
      <ul>
        <li><strong>ECTA Support:</strong> support@ecta.gov.et</li>
        <li><strong>Technical Support:</strong> tech@cecbs.et</li>
        <li><strong>Phone:</strong> +251-11-XXX-XXXX</li>
      </ul>
      
      <p>Welcome to the Ethiopian Coffee Export Consortium Blockchain System!</p>
      
      <p>Best regards,<br>
      <strong>Ethiopian Coffee & Tea Authority (ECTA)</strong></p>
    </div>
    
    <div class="footer">
      <p>This is an automated message from the Ethiopian Coffee Export Consortium Blockchain System (CECBS)</p>
      <p>Please do not reply to this email. For support, contact support@ecta.gov.et</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Ethiopian Coffee Export Consortium - Application Approved

Dear ${data.exporterName},

Your exporter application has been APPROVED by ECTA.

Exporter ID: ${data.exporterId}
License Number: ${data.licenseNumber}
Email: ${data.email}

Login Credentials:
Username: ${data.username}
Temporary Password: ${data.temporaryPassword}
Portal URL: ${data.loginUrl}

IMPORTANT: Please change your password after first login.

Next Steps:
1. Login at ${data.loginUrl}
2. Change your password
3. Access the Exporter Portal
4. Start creating sales contracts

For support, contact: support@ecta.gov.et

Best regards,
Ethiopian Coffee & Tea Authority (ECTA)
    `;

    return this.sendEmail({ to: data.email, subject, html, text });
  }

  public async sendRejectionEmail(data: RejectionEmailData): Promise<boolean> {
    const subject = `Application Status Update - ${data.exporterName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .warning-badge { background: #ff9800; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 10px 0; }
    .reason-box { background: #fff; border-left: 4px solid #f44336; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .credentials-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .info-item { margin: 10px 0; }
    .info-label { font-weight: bold; color: #f44336; }
    .button { display: inline-block; background: #2196f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .info-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>☕ Ethiopian Coffee Export Consortium</h1>
      <h2>Application Status Update</h2>
    </div>
    
    <div class="content">
      <div class="warning-badge">⚠️ Action Required</div>
      
      <p>Dear <strong>${data.exporterName}</strong>,</p>
      
      <p>Thank you for submitting your application to become a registered coffee exporter. After careful review, we regret to inform you that your application <strong>(${data.applicationId})</strong> requires corrections before it can be approved.</p>
      
      <h3>📋 Rejection Reason:</h3>
      <div class="reason-box">
        <p><strong>${data.reason}</strong></p>
      </div>
      
      <div class="info-box">
        ✅ <strong>Good News:</strong> You can correct the issues and resubmit your application!
      </div>
      
      <h3>🔐 Your Login Credentials:</h3>
      <div class="credentials-box">
        <p>We have created a temporary account for you to resubmit your corrected application:</p>
        <div class="info-item">
          <span class="info-label">Username:</span> <strong>${data.username}</strong>
        </div>
        <div class="info-item">
          <span class="info-label">Password:</span> <strong>${data.temporaryPassword}</strong>
        </div>
        <div class="info-item">
          <span class="info-label">Resubmit URL:</span> <a href="${data.resubmitUrl}">${data.resubmitUrl}</a>
        </div>
      </div>
      
      <a href="${data.resubmitUrl}" class="button">📝 Login & Resubmit Application</a>
      
      <h3>📝 How to Resubmit:</h3>
      <ol>
        <li><strong>Login</strong> using the credentials above</li>
        <li><strong>Review the rejection reason</strong> carefully</li>
        <li><strong>Update the incorrect information</strong> in the form</li>
        <li><strong>Ensure all data matches official documents</strong></li>
        <li><strong>Submit your corrected application</strong></li>
      </ol>
      
      <h3>ℹ️ Important Notes:</h3>
      <ul>
        <li>Your email and contact information cannot be changed during resubmission</li>
        <li>Make sure your TIN number and Business License match official records</li>
        <li>Provide accurate capital requirement information</li>
        <li>Ensure your professional taster certificate is valid</li>
      </ul>
      
      <h3>📞 Need Help?</h3>
      <p>If you have questions about the rejection reason or need clarification, please contact:</p>
      <ul>
        <li><strong>ECTA Application Support:</strong> applications@ecta.gov.et</li>
        <li><strong>Phone:</strong> +251-11-XXX-XXXX</li>
        <li><strong>Office Hours:</strong> Monday - Friday, 8:00 AM - 5:00 PM</li>
      </ul>
      
      <p>We look forward to receiving your corrected application.</p>
      
      <p>Best regards,<br>
      <strong>Ethiopian Coffee & Tea Authority (ECTA)</strong></p>
    </div>
    
    <div class="footer">
      <p>This is an automated message from the Ethiopian Coffee Export Consortium Blockchain System (CECBS)</p>
      <p>Please do not reply to this email. For support, contact applications@ecta.gov.et</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Ethiopian Coffee Export Consortium - Application Requires Correction

Dear ${data.exporterName},

Your application (${data.applicationId}) requires corrections before approval.

Rejection Reason:
${data.reason}

You can login and resubmit your corrected application:

Username: ${data.username}
Password: ${data.temporaryPassword}
Resubmit URL: ${data.resubmitUrl}

Steps to Resubmit:
1. Login at ${data.resubmitUrl}
2. Review the rejection reason
3. Update incorrect information
4. Submit corrected application

For assistance, contact: applications@ecta.gov.et

Best regards,
Ethiopian Coffee & Tea Authority (ECTA)
    `;

    return this.sendEmail({ to: data.email, subject, html, text });
  }

  public async sendResubmissionNotification(data: ResubmissionNotificationData): Promise<boolean> {
    const ectaEmail = process.env.ECTA_NOTIFICATION_EMAIL || 'admin@ecta.gov.et';
    const subject = `📬 Application Resubmitted - ${data.exporterName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-badge { background: #2196f3; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 10px 0; }
    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #2196f3; }
    .info-item { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
    .info-label { font-weight: bold; color: #2196f3; }
    .timeline { margin: 20px 0; padding: 20px; background: #fff; border-radius: 5px; }
    .timeline-item { margin: 10px 0; padding: 10px; border-left: 3px solid #2196f3; padding-left: 15px; }
    .button { display: inline-block; background: #2196f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>☕ ECTA Admin Notification</h1>
      <h2>Application Resubmitted</h2>
    </div>
    
    <div class="content">
      <div class="info-badge">🔄 Pending Review</div>
      
      <p>Dear ECTA Administrator,</p>
      
      <p>An exporter has resubmitted their corrected application and it is now pending your review.</p>
      
      <h3>📋 Application Details:</h3>
      <div class="info-box">
        <div class="info-item">
          <span class="info-label">Applicant:</span> ${data.exporterName}
        </div>
        <div class="info-item">
          <span class="info-label">Application ID:</span> ${data.applicationId}
        </div>
        <div class="info-item">
          <span class="info-label">Email:</span> ${data.email}
        </div>
      </div>
      
      <h3>📅 Timeline:</h3>
      <div class="timeline">
        <div class="timeline-item">
          <strong>Original Submission:</strong> ${new Date(data.originalSubmissionDate).toLocaleString()}
        </div>
        <div class="timeline-item">
          <strong>Rejection Date:</strong> ${new Date(data.rejectionDate).toLocaleString()}
        </div>
        <div class="timeline-item">
          <strong>Resubmission Date:</strong> ${new Date(data.resubmissionDate).toLocaleString()}
        </div>
      </div>
      
      <a href="http://localhost:3000/portals/ecta" class="button">📋 Review Application</a>
      
      <h3>✅ Action Required:</h3>
      <p>Please review the corrected application and:</p>
      <ul>
        <li>Verify that the issues have been addressed</li>
        <li>Check that all information is accurate</li>
        <li>Approve or reject the application accordingly</li>
      </ul>
      
      <p>The applicant is awaiting your decision.</p>
      
      <p>Best regards,<br>
      <strong>CECBS System</strong></p>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from the Ethiopian Coffee Export Consortium Blockchain System (CECBS)</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
ECTA Admin Notification - Application Resubmitted

An exporter has resubmitted their corrected application.

Applicant: ${data.exporterName}
Application ID: ${data.applicationId}
Email: ${data.email}

Timeline:
- Original Submission: ${new Date(data.originalSubmissionDate).toLocaleString()}
- Rejection Date: ${new Date(data.rejectionDate).toLocaleString()}
- Resubmission Date: ${new Date(data.resubmissionDate).toLocaleString()}

Please review the application at: http://localhost:3000/portals/ecta

Best regards,
CECBS System
    `;

    return this.sendEmail({ to: ectaEmail, subject, html, text });
  }
}

export default EmailService;
