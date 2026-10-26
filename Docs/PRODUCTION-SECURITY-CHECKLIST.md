# Production Security Checklist

## 🔴 CRITICAL - Must Complete Before Production Deployment

### 1. Change All Default Passwords

#### Database Passwords
- [ ] PostgreSQL: Change from `cecbs123` to strong password
  ```bash
  # Update in docker-compose-fabric.yml
  POSTGRES_PASSWORD=<STRONG_PASSWORD>
  
  # Update in api/.env
  DATABASE_URL=postgresql://cecbs:<STRONG_PASSWORD>@localhost:5432/cecbs
  ```

- [ ] Redis: Change from `redis123` to strong password
  ```bash
  # Update in docker-compose-fabric.yml (if Redis auth is enabled)
  ```

#### JWT Secret
- [ ] Generate and set strong JWT secret
  ```bash
  # Generate a strong secret (64 characters recommended)
  openssl rand -hex 32
  
  # Update in api/.env
  JWT_SECRET=<GENERATED_SECRET>
  JWT_EXPIRY=24h  # Or adjust as needed
  ```

#### User Account Passwords
- [ ] Change admin password from `admin123`
- [ ] Change all portal admin passwords from `password123`
- [ ] Change exporter demo password from `password123`

```bash
# Run this script to reset all passwords:
node api/create-admin-postgres.js

# Then manually update passwords in database or via UI
```

### 2. Remove Hardcoded Credentials from Frontend

- [ ] Update `ui/src/pages/login.tsx` - Remove or comment out demo accounts dropdown for production
  ```typescript
  // Line 152-159: Comment out or remove organizations array
  // Or set via environment variable instead
  ```

### 3. Enable HTTPS/SSL

- [ ] Obtain SSL certificates (Let's Encrypt recommended)
- [ ] Configure Nginx with SSL
  ```bash
  # Use existing config: nginx-configs/cecbs-production.conf
  # Update with your domain and SSL certificate paths
  ```

- [ ] Update all HTTP URLs to HTTPS in:
  - [ ] `ui/.env.production`
  - [ ] `api/.env.production`
  - [ ] Frontend API base URL configuration

### 4. Secure Environment Variables

- [ ] Never commit `.env` files to git
- [ ] Use secrets management system (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] Set environment variables via hosting platform (not in code)

### 5. Email Service Security

- [ ] Remove Gmail credentials from `.env`
- [ ] Use environment variables or secrets manager
- [ ] Consider using transactional email service (SendGrid, AWS SES, Mailgun)

### 6. Blockchain Network Security

- [ ] Change Fabric CA admin credentials
- [ ] Secure crypto material (certificates, private keys)
- [ ] Restrict peer ports to internal network only
- [ ] Enable mutual TLS for all peer communications (already configured)

---

## 🟡 HIGH PRIORITY - Recommended for Production

### 7. Rate Limiting

- [ ] Verify rate limiting is active
  ```bash
  # Check in api/src/server.ts
  # Ensure rate limiter middleware is uncommented
  ```

- [ ] Adjust rate limits based on expected traffic
  ```env
  RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
  RATE_LIMIT_MAX_REQUESTS=100   # requests per window
  ```

### 8. Database Backups

- [ ] Set up automated PostgreSQL backups
  ```bash
  # Example: Daily backups at 2 AM
  0 2 * * * pg_dump -U cecbs cecbs > /backups/cecbs_$(date +\%Y\%m\%d).sql
  ```

- [ ] Test backup restoration procedure
- [ ] Store backups offsite (S3, Azure Blob, etc.)

### 9. Monitoring & Alerting

- [ ] Set up application monitoring (Prometheus, Grafana, DataDog, New Relic)
- [ ] Configure error tracking (Sentry, Rollbar)
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure log aggregation (ELK Stack, Splunk, CloudWatch)

### 10. API Documentation

- [ ] Ensure Swagger/OpenAPI docs are up to date
- [ ] Document all API endpoints
- [ ] Add authentication examples
- [ ] Document rate limits and quotas

---

## 🟢 MEDIUM PRIORITY - Quality Improvements

### 11. Error Handling

- [ ] Implement global error handler
- [ ] Standardize error response format
- [ ] Add error monitoring and alerting
- [ ] Never expose stack traces in production

### 12. Session Management

- [ ] Implement session timeout (JWT expiry already configured)
- [ ] Add refresh token mechanism
- [ ] Implement "remember me" functionality
- [ ] Add concurrent session management

### 13. Input Validation

- [ ] Validate all user inputs
- [ ] Sanitize data before database insertion
- [ ] Implement file upload size limits
- [ ] Validate file types for uploads

### 14. CORS Configuration

- [ ] Update ALLOWED_ORIGINS to production domains only
  ```env
  ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  ```

### 15. Content Security Policy

- [ ] Add CSP headers to Nginx config
  ```nginx
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";
  ```

---

## ⚪ LOW PRIORITY - Nice to Have

### 16. Performance Optimization

- [ ] Enable Nginx gzip compression
- [ ] Add CDN for static assets
- [ ] Implement Redis caching for API responses
- [ ] Optimize database queries with indexes

### 17. Compliance

- [ ] Add privacy policy
- [ ] Add terms of service
- [ ] Implement GDPR compliance (if applicable)
- [ ] Add audit logging for all sensitive operations

### 18. User Experience

- [ ] Add session timeout warnings
- [ ] Implement "forgot password" functionality
- [ ] Add email verification for new accounts
- [ ] Implement 2FA/MFA (Two-Factor Authentication)

---

## Deployment Verification Checklist

After deployment, verify:

- [ ] All services start successfully
- [ ] Database connections work
- [ ] Blockchain network is operational
- [ ] Login works with production credentials
- [ ] SSL certificates are valid
- [ ] All API endpoints return expected responses
- [ ] Email notifications work
- [ ] File uploads work
- [ ] Backup procedures work
- [ ] Monitoring dashboards show data

---

## Emergency Procedures

### If Production Database is Compromised:
1. Immediately rotate all database passwords
2. Audit database access logs
3. Restore from last known good backup
4. Force password reset for all users
5. Notify affected parties

### If JWT Secret is Compromised:
1. Generate new JWT secret
2. Invalidate all existing sessions
3. Force all users to re-login
4. Audit access logs for suspicious activity

### If SSL Certificate Expires:
1. Have renewal process automated (Let's Encrypt auto-renewal)
2. Set up expiry alerts (30 days before expiry)
3. Have manual renewal procedure documented

---

## Production Environment Variables Template

Create `api/.env.production`:

```env
# Server Configuration
NODE_ENV=production
PORT=3001
API_BASE_URL=https://api.yourdomain.com/api/v1

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# JWT Configuration (CHANGE THESE!)
JWT_SECRET=<GENERATE_STRONG_SECRET_HERE>
JWT_EXPIRY=24h

# Database Configuration (CHANGE PASSWORD!)
DATABASE_URL=postgresql://cecbs:<STRONG_PASSWORD>@postgres:5432/cecbs

# Fabric Configuration
FABRIC_ENABLED=true
FABRIC_REQUIRED=true
FABRIC_AS_LOCALHOST=false
FABRIC_WALLET_PATH=./wallet
FABRIC_CCP_PATH=../blockchain/organizations/peerOrganizations/ecta.cecbs.et/connection-ecta.json
FABRIC_CHANNEL_NAME=coffeechannel
FABRIC_CHAINCODE_NAME=coffee
FABRIC_MSP_ID=ECTAMSP

# Email Configuration (USE SECRETS MANAGER!)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<USE_SECRETS_MANAGER>
SMTP_PASS=<USE_SECRETS_MANAGER>
SMTP_FROM=noreply@yourdomain.com

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Redis (if using)
REDIS_URL=redis://<STRONG_PASSWORD>@redis:6379
```

Create `ui/.env.production`:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_NAME=CECBS
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## Password Requirements for Production

### Minimum Password Policy:
- Minimum length: 12 characters
- Must contain: uppercase, lowercase, numbers, special characters
- No dictionary words
- No username/email in password
- Password history: Last 5 passwords cannot be reused
- Password expiry: 90 days (optional but recommended)

### Suggested Strong Passwords Generation:
```bash
# Generate strong password (20 characters)
openssl rand -base64 20

# Generate strong password (32 characters, hex)
openssl rand -hex 32

# Generate strong password with special characters
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
```

---

## Automated Security Scan

Run these scans before production:

```bash
# Check for hardcoded secrets
npm install -g secretlint
secretlint "**/*"

# Dependency vulnerability scan
cd api && npm audit
cd ui && npm audit

# Check for outdated dependencies
npm outdated

# Static code analysis
npm install -g eslint
eslint . --ext .ts,.tsx,.js

# Docker image security scan
docker scan cecbs/coffee-chaincode:latest
```

---

## Contact Information for Security Issues

**Security Contact**: security@cecbs.et  
**Emergency Contact**: +251-XXX-XXX-XXX  
**Incident Response Team**: devops@cecbs.et

---

## Version History

- v1.0 - 2026-08-03 - Initial production security checklist
- Updated: Check this file regularly and update as security requirements evolve

---

**Remember**: Security is not a one-time setup but an ongoing process. Regularly review and update security measures.
