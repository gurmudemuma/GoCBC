# 🚀 CECBS Production Deployment

**Coffee Export Consortium Blockchain System v1.30**  
**Status**: ✅ Production Ready  
**Target**: https://coffeex.cbe.com.et (10.3.15.7)

---

## ⚡ Quick Deploy (3 Commands)

```bash
# 1. Run pre-deployment preparation
bash prepare-deployment.sh
# → Select option 5 (Full Pre-Deployment Check)

# 2. Deploy to production
# (From the same menu, select option 6)
# OR run directly:
bash deploy-to-coffeex-cbe.sh

# 3. Verify
curl https://coffeex.cbe.com.et/health
```

**That's it!** 🎉

---

## 📋 What You Need

### **Before Starting**

1. **Server** at 10.3.15.7
   - Ubuntu 20.04+ / Debian 11+ / RHEL 8+
   - 8GB RAM minimum (16GB recommended)
   - 100GB+ SSD storage
   - SSH access

2. **DNS** (for production)
   - A Record: coffeex.cbe.com.et → 10.3.15.7
   - Wait for propagation (5 min - 48 hours)

3. **Your local machine**
   - Bash shell (Git Bash on Windows, or WSL)
   - SSH access to server
   - Internet connection

---

## 🛠️ Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| **prepare-deployment.sh** | Pre-deployment checks & setup | `bash prepare-deployment.sh` |
| **prepare-deployment.bat** | Windows wrapper | `prepare-deployment.bat` |
| **deploy-to-coffeex-cbe.sh** | Full automated deployment | `bash deploy-to-coffeex-cbe.sh` |

---

## 📖 Step-by-Step Guide

### **Option A: Interactive (Recommended)**

**1. Start preparation script**
```bash
# Windows
prepare-deployment.bat

# Linux/Mac
bash prepare-deployment.sh
```

**2. Follow the menu**
```
Select option 5: Run Full Pre-Deployment Check
→ Checks DNS
→ Generates secrets
→ Verifies server
→ Configures firewall
```

**3. Deploy**
```
Select option 6: Deploy to Production
→ Runs deployment automatically
→ 15-30 minutes to complete
```

**4. Done!**
```bash
Visit: https://coffeex.cbe.com.et
```

---

### **Option B: Manual Commands**

**1. Check DNS**
```bash
nslookup coffeex.cbe.com.et
# Should return: 10.3.15.7
```

**2. Generate secrets**
```bash
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
DOC_KEY=$(openssl rand -hex 32)
echo "Save these somewhere secure!"
```

**3. Deploy**
```bash
bash deploy-to-coffeex-cbe.sh
```

---

## 🎯 What Gets Deployed

### **Infrastructure**
- ✅ Blockchain network (6 peers + 1 orderer)
- ✅ Chaincode v1.30 (100% MSP accountability)
- ✅ API server (Node.js/Express on port 3001)
- ✅ Frontend UI (Next.js/React on port 3000)
- ✅ IPFS daemon (Kubo 0.31.0)
- ✅ Nginx reverse proxy with SSL
- ✅ PostgreSQL database (optional)
- ✅ Redis cache (optional)

### **Services Running**
```
https://coffeex.cbe.com.et/           → Frontend UI
https://coffeex.cbe.com.et/api/v1/    → API server
https://coffeex.cbe.com.et/ipfs/<CID> → IPFS gateway
wss://coffeex.cbe.com.et/socket.io    → WebSocket
```

### **Security**
- ✅ TLS/SSL encryption (Let's Encrypt)
- ✅ JWT authentication
- ✅ MSP identity validation
- ✅ Document encryption (AES-256)
- ✅ Rate limiting
- ✅ Firewall configured
- ✅ Security headers

---

## 📊 Deployment Timeline

```
Preparation:     5-15 minutes (one-time setup)
Deployment:      15-30 minutes (automated)
Verification:    5-10 minutes (testing)
────────────────────────────────────────────
Total:           25-55 minutes
```

**Fastest path**: If DNS already configured and server prepared, deployment takes just 15-20 minutes!

---

## ✅ Verification Checklist

After deployment, verify:

```bash
# 1. System health
curl https://coffeex.cbe.com.et/health
# → Should return: healthy

# 2. API health  
curl https://coffeex.cbe.com.et/api/v1/health
# → Should return: {"status":"healthy"}

# 3. SSL certificate
openssl s_client -connect coffeex.cbe.com.et:443 < /dev/null
# → Should show valid certificate

# 4. Open in browser
# Visit: https://coffeex.cbe.com.et
# → Should load login page

# 5. Test login
# Login with credentials
# → Should access dashboard
```

---

## 🚨 Troubleshooting

### **DNS not configured?**
```bash
# Add A record in DNS provider
Name: coffeex.cbe.com.et
Type: A
Value: 10.3.15.7

# Wait 5-60 minutes, then verify
nslookup coffeex.cbe.com.et
```

### **Can't SSH to server?**
```bash
# Test connection
ping 10.3.15.7

# Try with password
ssh root@10.3.15.7

# Or setup SSH key
ssh-copy-id root@10.3.15.7
```

### **Deployment fails?**
```bash
# Check pre-deployment
bash prepare-deployment.sh
# → Select option 5

# Check logs on server
ssh root@10.3.15.7
tail -f /var/log/nginx/cecbs-error.log
```

### **Services not starting?**
```bash
# On server
docker ps  # Check blockchain
ps aux | grep node  # Check API/UI
systemctl status nginx  # Check nginx

# Restart if needed
cd /opt/cecbs
./restart-services.sh
```

---

## 📚 Documentation

### **For Quick Start**
- ✅ **DEPLOY-README.md** (this file) - Quick overview
- ✅ **DEPLOYMENT-GUIDE-QUICK-START.md** - Detailed walkthrough

### **For Technical Details**
- SYSTEM-READINESS-CHECK.md - Component status
- PRODUCTION-READY-SUMMARY.md - Complete guide
- ENVIRONMENT-SETUP-GUIDE.md - Server setup

### **For Leadership**
- EXECUTIVE-BRIEFING.md - Business overview
- WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md - Business case
- PROJECT-COMPLETE-SUMMARY.md - Implementation summary

### **For Users**
- PORTAL-DOCUMENTATION-INDEX.md - User guides
- Individual portal guides (6 organizations)
- QUICK-START.md - User getting started

---

## 🎓 Learning Path

### **First-Time User**
1. Read DEPLOY-README.md (this file) ← You are here
2. Read DEPLOYMENT-GUIDE-QUICK-START.md
3. Run `prepare-deployment.sh`
4. Deploy!

### **Technical User**
1. Review SYSTEM-READINESS-CHECK.md
2. Review PRODUCTION-READY-SUMMARY.md
3. Customize deployment as needed
4. Deploy!

### **Leadership**
1. Review EXECUTIVE-BRIEFING.md
2. Approve deployment
3. Delegate to technical team
4. Review deployment success

---

## 💡 Pro Tips

### **Fastest Deployment**
```bash
# If everything is ready
bash deploy-to-coffeex-cbe.sh
# → 15 minutes to production!
```

### **Test First**
```bash
# Deploy to IP first (no SSL)
cd nginx-configs
./deploy-cecbs-nginx.sh --ip 10.3.15.7
# → Test at http://10.3.15.7
# → Then add SSL later
```

### **Staged Rollout**
```bash
# 1. Deploy to test environment
# 2. Verify with test users
# 3. Deploy to production
# 4. Monitor closely for 24 hours
```

### **Backup First**
```bash
# Before production deployment
ssh root@10.3.15.7
tar -czf /root/backup-$(date +%Y%m%d).tar.gz /opt/cecbs
```

---

## 🎉 Success!

**After deployment, you'll have**:

✅ Production blockchain network running  
✅ 100% MSP identity accountability  
✅ HTTPS access with valid SSL  
✅ 6 organization portals operational  
✅ IPFS document storage working  
✅ Real-time WebSocket updates  
✅ Complete audit trail  
✅ EUDR compliance ready  

**Access your system at**: https://coffeex.cbe.com.et

---

## 📞 Need Help?

**Documentation**: Review the docs listed above  
**Logs**: Check `/var/log/nginx/cecbs-error.log` on server  
**Status**: Run health checks (see Verification section)  
**Rollback**: Stop services, fix issues, re-deploy  

---

## 🚀 Ready to Deploy?

```bash
# Let's go!
bash prepare-deployment.sh
```

**Good luck with your deployment!** 🎊

---

**System Version**: v1.30  
**Document Version**: 1.0  
**Last Updated**: July 12, 2026  
**Status**: Production Ready ✅
