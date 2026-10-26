// Applicant Credentials Service
// Generates temporary credentials for exporter applicants to track their application status

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseService } from './databaseService';

const db = DatabaseService.getInstance();

interface TemporaryCredentials {
  username: string;
  password: string;
  applicationId: number;
}

class ApplicantCredentialsService {
  /**
   * Generate temporary credentials for an applicant
   * Username: applicant_[ID] or email-based
   * Password: Random secure password
   */
  async generateCredentials(applicationId: number, email: string, companyName: string): Promise<TemporaryCredentials> {
    // Generate username from email or application ID
    const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const username = `applicant_${emailPrefix}_${applicationId}`;
    
    // Generate secure random password
    const password = this.generateSecurePassword();
    
    // Hash password for storage
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Store credentials in exporter_applications table
    await db.run(
      `UPDATE exporter_applications 
       SET temp_username = $1, temp_password = $2, temp_credentials_sent = true 
       WHERE id = $3`,
      [username, hashedPassword, applicationId]
    );
    
    // Also create a temporary user in the users table so they can login via regular endpoint
    await db.run(
      `INSERT INTO users (username, email, password_hash, full_name, role, organization, status, exporter_id)
       VALUES ($1, $2, $3, $4, 'EXPORTER', 'EXPORTER', 'inactive', NULL)
       ON CONFLICT (username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         email = EXCLUDED.email`,
      [username, email, hashedPassword, companyName]
    );
    
    return {
      username,
      password, // Return plain password for email
      applicationId,
    };
  }

  /**
   * Generate a secure random password
   */
  private generateSecurePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // Fill remaining characters
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Verify applicant credentials
   */
  async verifyCredentials(username: string, password: string): Promise<{ valid: boolean; applicationId?: number; status?: string }> {
    const result = await db.get(
      `SELECT id, temp_password, status FROM exporter_applications WHERE temp_username = $1`,
      [username]
    );
    
    if (!result) {
      return { valid: false };
    }
    
    const passwordValid = await bcrypt.compare(password, result.temp_password);
    
    if (!passwordValid) {
      return { valid: false };
    }
    
    return {
      valid: true,
      applicationId: result.id,
      status: result.status,
    };
  }

  /**
   * Convert temporary account to full exporter account upon approval
   * Updates username from temporary format (applicant_xxx) to standard format (exporterId)
   */
  async convertToFullAccount(applicationId: number, exporterId: string): Promise<void> {
    // Get application details
    const app = await db.get(
      `SELECT company_name, email, temp_username FROM exporter_applications WHERE id = $1`,
      [applicationId]
    );
    
    if (!app) {
      throw new Error('Application not found');
    }
    
    // Get password from application
    const pwdResult = await db.get(
      `SELECT temp_password FROM exporter_applications WHERE id = $1`,
      [applicationId]
    );
    
    if (!pwdResult) {
      throw new Error('Application password not found');
    }
    
    // Check if user exists with temporary username
    const existingUser = await db.get(
      `SELECT id FROM users WHERE username = $1`,
      [app.temp_username]
    );
    
    if (existingUser) {
      // ✅ Update existing user: change username from temporary to exporterId
      await db.run(
        `UPDATE users 
         SET username = $1, 
             role = 'EXPORTER', 
             exporter_id = $1, 
             status = 'active', 
             organization = 'EXPORTER'
         WHERE username = $2`,
        [exporterId, app.temp_username]
      );
    } else {
      // Create new user with exporterId as username
      await db.run(
        `INSERT INTO users (username, email, password_hash, full_name, role, organization, exporter_id, status)
         VALUES ($1, $2, $3, $4, 'EXPORTER', 'EXPORTER', $1, 'active')
         ON CONFLICT (username) DO UPDATE SET
           role = 'EXPORTER',
           exporter_id = $1,
           status = 'active',
           organization = 'EXPORTER'`,
        [exporterId, app.email, pwdResult.temp_password, app.company_name]
      );
    }
    
    // Mark application as account converted
    await db.run(
      `UPDATE exporter_applications SET account_created = true WHERE id = $1`,
      [applicationId]
    );
  }
}

export default new ApplicantCredentialsService();
