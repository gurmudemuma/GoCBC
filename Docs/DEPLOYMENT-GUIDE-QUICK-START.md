# 🚀 CECBS Deployment Quick Start Guide

**Last Updated**: July 12, 2026  
**For**: Production Deployment to coffeex.cbe.com.et (10.3.15.7)

---

## ⚡ Quick Start (3 Steps)

### **Step 1: Run Pre-Deployment Preparation**

```bash
# On Windows
prepare-deployment.bat

# On Linux/Mac
bash prepare-deployment.sh
```

This script will:
- ✅ Check DNS configuration
- ✅ Generate production secrets
- ✅ Verify server software installation
- ✅ Configure firewall

### **Step 2: Complete the Checklist**

The script provides an interactive menu:

```
1) Check DNS Configuration
2) Generate Production Secrets
3) Check/Prepare Server
4) Configure Firewall
5) Run Full Pre-Deployment Check  ← Run this first
6) Deploy to Production           ← Then run this
7) View Generated Secrets
8) Settings (change IP/Domain)
```

**Recommended workflow**:
1. Run option **5** (Full Pre-Deployment Check)
2. Fix any issues found
3. Run option **5** again to verify
4. Run option **6** (Deploy to Production)

### **Step 3: Verify Deployment**

After deployment completes:

```bash
# Test HTTPS access
curl https://coffeex.cbe.com.et/health

# Test API
curl https://coffeex.cbe.com.et/api/v1/health

# Open in browser
# Visit: https://coffeex.cbe.com.et
```

---

## 📋 What Each Option Does

### **Option 1: Check DNS Configuration**

Verifies that `coffeex.cbe.com.et` points to `10.3.15.7`

**What it checks**:
- DNS A record exists
- Points to correct IP address
- DNS propagation complete

**If DNS not configured**:
- You'll see instructions to add A record
- Wait 5 minutes to 48 hours for propagation
- Run check again to verify

---

### **Option 2: Generate Production Secrets**

Creates secure secrets for production use

**What it generates**:
- JWT secret (32 characters)
- Session secret (32 characters)
- Document encryption key (64 characters)
- Database password (24 characters)
- Redis password (24 characters)

**Output file**: `production-secrets.txt`

**Contents**:
- Secure random values
- Complete API .env.production configuration
- Complete UI .env.production configuration
- Quick copy commands

**⚠️ IMPORTANT**: 
- File is saved with 600 permissions (owner only)
- Never commit this file to git
- Store in secure password manager
- Share only via secure channels

---

### **Option 3: Check/Prepare Server**

Verifies server has required software installed

**What it checks**:
1. SSH connection
2. Docker installation
3. Docker Compose installation
4. Node.js 18.x installation
5. Nginx installation
6. IPFS Kubo installation
7. Server resources (CPU, RAM, Disk)
8. Open ports

**For each missing item**:
- Shows installation command
- You can install manually or script can guide you

---

### **Option 4: Configure Firewall**

Sets up firewall rules for production

**What it does**:
- Detects firewall type (UFW or firewalld)
- Shows current rules
- Offers to configure automatically

**Ports configured**:
- Port 22 (SSH) - for remote access
- Port 80 (HTTP) - for Let's Encrypt validation
- Port 443 (HTTPS) - for production access

**Note**: All application ports (3000, 3001, 5001, 8080) remain internal (not exposed)

---

### **Option 5: Run Full Pre-Deployment Check**

Runs all checks in sequence with interactive prompts

**Process**:
1. DNS check → Fix if needed
2. Secrets check → Generate if missing
3. Server check → Install missing software
4. Firewall check → Configure if needed

**At the end**:
- Shows summary (passed/failed)
- Tells you if ready to deploy
- Guides you to next steps

**⚡ Recommended**: Run this before deployment

---

### **Option 6: Deploy to Production**

Runs the full deployment script

**What it does**:
- Runs `deploy-to-coffeex-cbe.sh`
- Copies files to server
- Builds and starts services
- Deploys nginx with SSL
- Verifies deployment

**Timeline**: 15-30 minutes

**Requirements**:
- All pre-deployment checks passed
- SSH access to server
- Server prepared with software

---

### **Option 7: View Generated Secrets**

Displays the generated secrets file

**Useful for**:
- Copying secrets to clipboard
- Verifying secrets are generated
- Reviewing configuration

**Security reminder**: Never share secrets via unsecured channels

---

### **Option 8: Settings**

Change deployment target configuration

**Can change**:
- Server IP (default: 10.3.15.7)
- Domain (default: coffeex.cbe.com.et)
- Server user (default: root)

**⚠️ Note**: After changing settings, regenerate secrets (option 2) to update configuration files with new domain

---

## 🔍 Detailed Walkthrough

### **First-Time Deployment**

**Step-by-step process**:

1. **Start the script**
   ```bash
   bash prepare-deployment.sh
   ```

2. **Select option 5** (Full Pre-Deployment Check)
   - Script will check DNS
   - If DNS not configured, follow instructions, wait, then re-run
   - Script will generate secrets (choose 'yes')
   - Script will check server
   - If software missing, install manually (commands provided)
   - Script will configure firewall (choose 'yes')

3. **Review summary**
   - If all passed → Ready to deploy!
   - If some failed → Fix issues and re-run option 5

4. **Select option 6** (Deploy to Production)
   - Confirm deployment when prompted
   - Wait 15-30 minutes
   - Deployment script will show progress

5. **Verify deployment**
   ```bash
   curl https://coffeex.cbe.com.et/health
   # Should return: healthy
   
   curl https://coffeex.cbe.com.et/api/v1/health
   # Should return: {"status":"healthy"}
   ```

6. **Open in browser**
   - Visit: https://coffeex.cbe.com.et
   - Login with credentials
   - Test functionality

---

## 📁 Generated Files

### **production-secrets.txt**

**Location**: Project root directory

**Contents**:
```
# Secure secrets
JWT_SECRET=<32-char-random>
SESSION_SECRET=<32-char-random>
DOCUMENT_ENCRYPTION_KEY=<64-char-random>
DB_PASSWORD=<24-char-random>
REDIS_PASSWORD=<24-char-random>

# Complete API .env.production
[Full API configuration]

# Complete UI .env.production
[Full UI configuration]

# Quick copy commands
[Commands to copy to server]
```

**Permissions**: 600 (owner read/write only)

**Usage**:
- Copy API section to `api/.env.production`
- Copy UI section to `ui/.env.production`
- Or use deployment script which does this automatically

---

## 🔐 Security Best Practices

### **Handling Secrets**

**DO**:
- ✅ Keep `production-secrets.txt` with 600 permissions
- ✅ Store in secure password manager
- ✅ Share via encrypted channels only
- ✅ Generate new secrets for each environment
- ✅ Rotate secrets periodically

**DON'T**:
- ❌ Commit secrets to git
- ❌ Share via email or Slack
- ❌ Reuse secrets from development
- ❌ Share secrets in screenshots
- ❌ Store secrets in plain text documents

### **Server Access**

**DO**:
- ✅ Use SSH keys (not passwords)
- ✅ Disable root SSH login (after setup)
- ✅ Use sudo for administrative tasks
- ✅ Keep SSH keys encrypted
- ✅ Use different keys per environment

**DON'T**:
- ❌ Share SSH keys
- ❌ Store SSH keys unencrypted
- ❌ Use same key for multiple servers
- ❌ Leave root SSH enabled long-term

---

## 🛠️ Troubleshooting

### **DNS Check Fails**

**Problem**: DNS doesn't point to correct IP

**Solution**:
1. Add A record in DNS provider:
   - Name: coffeex.cbe.com.et
   - Type: A
   - Value: 10.3.15.7
   - TTL: 3600

2. Wait for propagation (5 min - 48 hours)

3. Verify with: `nslookup coffeex.cbe.com.et`

4. Re-run check

---

### **SSH Connection Fails**

**Problem**: Cannot connect to server

**Solutions**:

**Check 1: Server accessible**
```bash
ping 10.3.15.7
```

**Check 2: SSH port open**
```bash
telnet 10.3.15.7 22
```

**Check 3: SSH key configured**
```bash
ssh-copy-id root@10.3.15.7
```

**Check 4: Correct user**
- Default user is 'root'
- Change in settings (option 8) if different

---

### **Software Missing on Server**

**Problem**: Docker/Node.js/etc. not installed

**Solution**: Script shows installation commands for each missing item

**Example for Docker**:
```bash
# SSH to server
ssh root@10.3.15.7

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Verify
docker --version
```

**Then re-run check** (option 3)

---

### **Firewall Configuration Fails**

**Problem**: Cannot configure firewall

**Solution**:

**Check 1: Firewall installed**
```bash
# Check UFW (Ubuntu)
ufw --version

# Check firewalld (RHEL)
firewall-cmd --version
```

**Check 2: Sufficient permissions**
- Script needs sudo/root access
- Run as root or with sudo

**Check 3: Manual configuration**
```bash
# UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

### **Deployment Fails**

**Problem**: Deployment script errors out

**Check**:
1. All pre-deployment checks passed?
2. Secrets generated?
3. Server accessible via SSH?
4. Sufficient disk space on server?
5. DNS propagated (if using domain)?

**Common issues**:

**Issue**: SSL certificate fails
- **Cause**: DNS not propagated yet
- **Solution**: Wait longer or use self-signed for testing

**Issue**: Services fail to start
- **Cause**: Ports already in use
- **Solution**: Stop existing services or change ports

**Issue**: Out of disk space
- **Cause**: Insufficient storage
- **Solution**: Free up space or provision larger disk

---

## 📞 Getting Help

### **Check Logs**

**Preparation script**: Output shown in terminal

**Deployment script**: Shows progress in terminal

**After deployment**:
```bash
# On server
tail -f /var/log/nginx/cecbs-error.log
tail -f /opt/cecbs/api/logs/error.log
docker logs coffee-chaincode
```

### **Verify System Status**

```bash
# Check all services
docker ps  # Blockchain containers
ps aux | grep node  # API and UI
systemctl status nginx  # Nginx
ps aux | grep ipfs  # IPFS

# Test endpoints
curl https://coffeex.cbe.com.et/health
curl https://coffeex.cbe.com.et/api/v1/health
```

### **Rollback if Needed**

If deployment has issues:

1. **Stop services**
   ```bash
   systemctl stop nginx
   pkill -f node
   docker-compose down
   ```

2. **Fix issues**

3. **Re-run deployment**
   ```bash
   bash deploy-to-coffeex-cbe.sh
   ```

---

## ✅ Final Checklist

Before running deployment:

- [ ] DNS configured and verified (option 1)
- [ ] Production secrets generated (option 2)
- [ ] Server has all required software (option 3)
- [ ] Firewall configured (option 4)
- [ ] Full pre-deployment check passed (option 5)
- [ ] Backup plan ready (if needed)
- [ ] Support team notified
- [ ] Monitoring prepared

After deployment:

- [ ] HTTPS access works
- [ ] API health check returns healthy
- [ ] Login functionality works
- [ ] Document upload/download works
- [ ] No errors in logs
- [ ] SSL certificate valid
- [ ] WebSocket connected
- [ ] All 6 organization portals accessible

---

## 🎯 Success Criteria

**Deployment is successful when**:

✅ https://coffeex.cbe.com.et/ loads  
✅ Can login with credentials  
✅ Can navigate between pages  
✅ Can upload documents  
✅ Can view documents via IPFS  
✅ Blockchain operations work  
✅ MSP identity captured  
✅ No errors in browser console  
✅ No errors in server logs  

---

## 📚 Additional Resources

**Documentation**:
- SYSTEM-READINESS-CHECK.md - Detailed technical assessment
- PRODUCTION-READY-SUMMARY.md - Complete deployment guide
- EXECUTIVE-BRIEFING.md - Business overview
- WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md - Business case

**Scripts**:
- `prepare-deployment.sh` - Pre-deployment preparation (this guide)
- `deploy-to-coffeex-cbe.sh` - Full deployment automation
- `chaincode.sh` - Chaincode management
- `nginx-configs/deploy-cecbs-nginx.sh` - Nginx deployment

---

**Ready to deploy?** Run `bash prepare-deployment.sh` and select option 5! 🚀

---

**Document Version**: 1.0  
**Last Updated**: July 12, 2026  
**Status**: Production Ready
