# 🚀 Quick Start: Test 2026 Compliance in 5 Minutes

**Status:** ✅ READY | **Version:** 1.3 | **Date:** June 2, 2026

---

## ⚡ 60-Second Test

### 1️⃣ Register Exporter (2 min)
```
URL: http://localhost:3000/register-exporter

Fill out:
- Company: "Test Coffee PLC"
- Type: "company" ⭐
- Capital: "5000000"
- Lab Cert: "ECTA-LAB-2026-999" ⭐
- Other fields: [any valid data]

Click: Submit
```

### 2️⃣ Login as Admin (30 sec)
```
URL: http://localhost:3000/login

Username: ecta_admin
Password: ecta123

Click: Login
```

### 3️⃣ Approve Application (1 min)
```
Portal: ECTA Portal → Pending Applications

Click: View/Approve on your test application

Enter:
- Exporter ID: "EXP-TEST-001"
- License: "LIC-TEST-001"
- Expiry: "2027-06-02"

Click: Approve
```

### 4️⃣ Verify Result (30 sec)
```bash
curl http://localhost:3001/api/exporters/EXP-TEST-001
```

**Look for:**
```json
{
  "ExporterType": "company",  ← 2026 field ✅
  "LaboratoryCertificateNumber": "ECTA-LAB-2026-999"  ← 2026 field ✅
}
```

**✅ SUCCESS!** Both 2026 fields are in the blockchain!

---

## 🎯 What to Look For

### ✅ Registration Form
- [ ] "Exporter Type" dropdown (private/company/individual)
- [ ] "Laboratory Certificate Number" input field
- [ ] Capital validation based on exporter type
- [ ] Form submits without errors

### ✅ ECTA Portal
- [ ] Application shows exporter type
- [ ] Application shows lab certificate number
- [ ] Approve button works
- [ ] Success message with transaction ID

### ✅ Blockchain Query
- [ ] `ExporterType` field present
- [ ] `LaboratoryCertificateNumber` field present
- [ ] All 9 parameters stored correctly
- [ ] No errors in response

---

## 🔍 Quick Verification Commands

### Check System Status
```bash
# Chaincode container
docker ps --filter name=coffee-chaincode

# API server
curl http://localhost:3001/health

# Run full test
.\scripts\test-v1.3-deployment.ps1
```

### Check Logs
```bash
# Chaincode logs
docker logs coffee-chaincode --tail 20

# API logs
# (Check terminal where npm run dev is running)
```

### Query Blockchain
```bash
# Via API
curl http://localhost:3001/api/exporters/EXP-TEST-001

# Direct query
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"ReadExporter","Args":["EXP-TEST-001"]}'
```

---

## 📊 Test Data Templates

### Company Exporter
```json
{
  "companyName": "Highland Coffee Exports PLC",
  "exporterType": "company",
  "capitalRequirement": "5000000",
  "laboratoryCertificateNumber": "ECTA-LAB-2026-100"
}
```

### Private Exporter
```json
{
  "companyName": "Sidama Coffee Private Export",
  "exporterType": "private",
  "capitalRequirement": "500000",
  "laboratoryCertificateNumber": "ECTA-LAB-2026-101"
}
```

### Individual Exporter
```json
{
  "companyName": "Ahmed Mohammed (Individual)",
  "exporterType": "individual",
  "capitalRequirement": "0",
  "laboratoryCertificateNumber": "ECTA-LAB-2026-102"
}
```

---

## 🐛 Troubleshooting

### Problem: Form won't submit
**Solution:** Check all required fields are filled

### Problem: Approval fails
**Solution:** 
```bash
# Check API logs
# Look for "RegisterExporter with 9 args"

# Check chaincode container
docker logs coffee-chaincode
```

### Problem: Query returns old structure (no 2026 fields)
**Solution:** You queried an old exporter. Only newly approved exporters have 2026 fields.

### Problem: Container not running
**Solution:**
```bash
docker start coffee-chaincode
cd api
npm run dev
```

---

## 📞 Quick Links

| Resource | URL |
|----------|-----|
| Registration Form | http://localhost:3000/register-exporter |
| Login | http://localhost:3000/login |
| ECTA Portal | http://localhost:3000/portals/ecta |
| API Health | http://localhost:3001/health |
| API Docs | http://localhost:3001/api-docs |

---

## ✅ Success Checklist

After testing, you should see:

- [x] Form collects exporter type and lab certificate
- [x] Database stores both 2026 fields
- [x] ECTA portal displays both fields
- [x] Approval succeeds without errors
- [x] Blockchain query shows both fields
- [x] Transaction ID returned

---

## 🎉 What's Different from v1.2?

**v1.2 (Old):** 7 parameters
```
✗ No exporter type
✗ No laboratory certificate
✗ No capital validation
✗ No license suspension
```

**v1.3 (New):** 9 parameters
```
✅ Exporter type classification
✅ Laboratory certificate tracking
✅ Capital requirement validation
✅ License status management
```

---

## 📚 More Documentation

Need more details? Read:

1. **READY-FOR-TESTING.md** - Complete test workflow
2. **DEPLOYMENT-SUCCESS.md** - Deployment summary
3. **ALIGNMENT-COMPLETE.md** - Technical details
4. **EXPORTER-REQUIREMENTS-2026.md** - Compliance requirements

---

**Ready to test?** 🚀

Start here: http://localhost:3000/register-exporter

**Status:** 🟢 ALL SYSTEMS OPERATIONAL

---

*Last Updated: June 2, 2026, 21:15 EAT*
