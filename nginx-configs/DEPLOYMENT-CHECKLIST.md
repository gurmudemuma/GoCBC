# CECBS Nginx Deployment Checklist

Complete this checklist before and during deployment to ensure a smooth setup.

---

## 📋 Pre-Deployment Checklist

### Server Preparation
- [ ] Server OS: Ubuntu 20.04+, Debian 11+, or RHEL/CentOS 8+
- [ ] Server has minimum 4GB RAM, 2 CPU cores
- [ ] Server has at least 50GB free disk space
- [ ] Root or sudo access confirmed
- [ ] Server IP address noted: `10.3.___.___`
- [ ] Domain name (if using): `________________`
- [ ] SSH access working: `ssh root@10.3.___.___`

### Backend Services
- [ ] CECBS application files deployed to server
- [ ] Node.js installed (v16+ recommended)
- [ ] npm/yarn packages installed for UI
- [ ] npm/yarn packages installed for API
- [ ] Environment variables configured (`.env` files)
- [ ] Database accessible (if separate)
- [ ] Blockchain network accessible

### Test Backend Locally
```bash
# On the server, test these:
curl http://localhost:3000/          # UI should respond
curl http://localhost:3001/api/v1/health  # API health check
curl http://localhost:5001/api/v0/version # IPFS (if using)
```

- [ ] UI responds on port 3000
- [ ] API responds on port 3001
- [ ] IPFS daemon running (ports 5001, 8080)

### Files Prepared
- [ ] `cecbs-production.conf` downloaded
- [ ] `deploy-cecbs-nginx.sh` downloaded
- [ ] Server IP updated in configs (if manual deployment)
- [ ] Deployment documentation reviewed

---

## 🚀 Deployment Steps

### Step 1: Copy Files to Server
```bash
scp cecbs-production.conf root@10.3.___.___:/root/
scp deploy-cecbs-nginx.sh root@10.3.___.___:/root/
```

- [ ] Files copied successfully
- [ ] Files readable on server: `ls -l /root/`

### Step 2: SSH to Server
```bash
ssh root@10.3.___.___
```

- [ ] Connected successfully
- [ ] In `/root` directory: `pwd`

### Step 3: Run Deployment Script
```bash
chmod +x deploy-cecbs-nginx.sh
./deploy-cecbs-nginx.sh --ip 10.3.___.___
```

Or with domain and SSL:
```bash
./deploy-cecbs-nginx.sh --ip 10.3.___.___--domain coffee.cecbs.et --ssl letsencrypt
```

- [ ] Script executed without errors
- [ ] Nginx installed
- [ ] Configuration deployed
- [ ] Firewall configured
- [ ] Nginx started successfully

### Step 4: Verify Nginx
```bash
sudo systemctl status nginx
sudo nginx -t
```

- [ ] Nginx is running
- [ ] Configuration test passed

---

## ✅ Post-Deployment Verification

### Test from Server
```bash
curl http://localhost/health
curl http://localhost/api/v1/health
curl -I http://localhost/
```

- [ ] Health endpoint returns "healthy"
- [ ] API health check returns success
- [ ] Frontend returns HTML (status 200)

### Test from Another Machine
```bash
curl http://10.3.___.___/health
curl http://10.3.___.___/api/v1/health
```

- [ ] External access works
- [ ] API accessible externally
- [ ] No 502/504 errors

### Test in Browser
Open these URLs in browser:
```
http://10.3.___.___/
http://10.3.___.___/api/v1/health
```

- [ ] Frontend loads in browser
- [ ] No console errors (F12)
- [ ] API endpoint returns JSON
- [ ] Can log in to system

### Test Specific Features
- [ ] User authentication works
- [ ] Dashboard loads data
- [ ] Document upload works
- [ ] IPFS documents accessible (if using)
- [ ] Real-time updates work (WebSocket)

---

## 🔒 Security Checklist

### Firewall
```bash
# Check firewall status
sudo ufw status  # Ubuntu/Debian
sudo firewall-cmd --list-all  # RHEL/CentOS
```

- [ ] Port 22 (SSH) open
- [ ] Port 80 (HTTP) open
- [ ] Port 443 (HTTPS) open
- [ ] Backend ports (3000, 3001) NOT exposed externally
- [ ] IPFS ports (5001, 8080) NOT exposed externally

### SSL/TLS (if configured)
```bash
# Check certificate
sudo certbot certificates
```

- [ ] SSL certificate installed
- [ ] Certificate valid and not expired
- [ ] HTTPS redirects working
- [ ] No browser certificate warnings

### Access Control
- [ ] Hidden files blocked (`.env`, `.git`)
- [ ] IPFS API restricted to localhost
- [ ] IPFS WebUI restricted to internal network
- [ ] Nginx status page restricted

### Rate Limiting
- [ ] API rate limits active
- [ ] Auth endpoints rate limited
- [ ] Upload endpoints rate limited
- [ ] Test rate limits: rapid requests return 429

---

## 📊 Monitoring Setup

### Log Access
```bash
# Test log access
sudo tail -n 10 /var/log/nginx/cecbs-access.log
sudo tail -n 10 /var/log/nginx/cecbs-error.log
```

- [ ] Access log readable
- [ ] Error log readable
- [ ] Logs show recent activity

### System Status
```bash
# Check system resources
free -h
df -h
```

- [ ] Sufficient RAM available
- [ ] Sufficient disk space
- [ ] CPU usage normal

### Monitoring Commands Documented
- [ ] Team knows how to check logs
- [ ] Team knows how to check nginx status
- [ ] Team knows how to restart services

---

## 📝 Documentation

### Update Internal Docs
- [ ] Server IP documented
- [ ] Domain name documented (if used)
- [ ] SSL certificate renewal date noted
- [ ] Access credentials secured
- [ ] Emergency contact list updated

### Service URLs
Document these URLs for your team:
```
Frontend: http://10.3.___.___/
API: http://10.3.___.___/api/v1/
Health: http://10.3.___.___/health
IPFS: http://10.3.___.___/ipfs/<CID>
```

- [ ] URLs documented
- [ ] URLs tested and working
- [ ] Team notified of new URLs

---

## 🔄 Maintenance Planning

### Backup Schedule
- [ ] Nginx config backup scheduled
- [ ] SSL certificates backup scheduled
- [ ] Application data backup scheduled
- [ ] Backup restoration tested

### Update Schedule
- [ ] Nginx update schedule defined
- [ ] OS security updates schedule defined
- [ ] SSL certificate renewal reminder set
- [ ] Application update procedure documented

### Monitoring Setup
- [ ] Log rotation configured
- [ ] Disk space monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Alert recipients defined

---

## 🆘 Emergency Contacts

### Technical Team
- Server Admin: ___________________
- Application Admin: ___________________
- Network Admin: ___________________
- On-call Contact: ___________________

### Service Providers
- Hosting Provider: ___________________
- Domain Registrar: ___________________
- SSL Provider: ___________________

---

## 📞 Support Resources

### Quick Commands
```bash
# Restart nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/cecbs-error.log

# Test config
sudo nginx -t
```

### Documentation Files
- Full Guide: `CECBS-NGINX-DEPLOYMENT.md`
- Quick Reference: `CECBS-QUICK-REFERENCE.md`
- Config File: `cecbs-production.conf`

---

## ✅ Final Sign-Off

### Deployment Team
- [ ] Deployed by: ___________________ Date: ___________
- [ ] Reviewed by: ___________________ Date: ___________
- [ ] Approved by: ___________________ Date: ___________

### Production Readiness
- [ ] All pre-deployment checks passed
- [ ] All deployment steps completed
- [ ] All post-deployment verifications passed
- [ ] All security measures implemented
- [ ] Monitoring and backup configured
- [ ] Documentation updated
- [ ] Team trained on maintenance

### Go-Live Approval
- [ ] **System is ready for production use**
- [ ] **Users can be granted access**
- [ ] **Monitoring is active**

---

## 📅 Post-Deployment Schedule

### First 24 Hours
- [ ] Monitor error logs continuously
- [ ] Check system resources every 2 hours
- [ ] Test all major features
- [ ] Gather user feedback

### First Week
- [ ] Daily log review
- [ ] Daily performance check
- [ ] Weekly backup verification
- [ ] Document any issues and resolutions

### First Month
- [ ] Weekly system review
- [ ] Monthly backup test
- [ ] Review and optimize rate limits
- [ ] Plan capacity upgrades if needed

---

## 🎉 Deployment Complete!

Date: _______________  
Time: _______________  
Server IP: _______________  
Domain (if used): _______________  
Deployed by: _______________

**Status**: Production Ready ✅

---

**Notes:**
- Keep this checklist for future reference
- Update it based on lessons learned
- Share with your team
- Use for future deployments

**Next Deployment:** _______________
