# 🚀 DEPLOYMENT GUIDE
## Ethiopian Coffee Export Consortium Blockchain System (CECBS)

---

## 📋 **PREREQUISITES**

### **System Requirements**
- **OS**: Ubuntu 20.04+ / Windows 10+ with WSL2 / macOS 12+
- **CPU**: 4+ cores recommended
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 100GB+ available space
- **Network**: Stable internet connection

### **Required Software**
- **Docker**: v20.10+ with Docker Compose v2.0+
- **Node.js**: v18.0+ with npm v9.0+
- **Go**: v1.20+ (for chaincode development)
- **Git**: v2.30+

---

## 🔧 **INSTALLATION STEPS**

### **1. Clone Repository**
```bash
git clone https://github.com/your-org/cecbs.git
cd cecbs
```

### **2. Install Hyperledger Fabric Binaries**
```bash
# Download Fabric binaries and Docker images
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5

# Add binaries to PATH
export PATH=$PATH:$(pwd)/bin
```

### **3. Generate Blockchain Artifacts**
```bash
# Generate crypto materials
cd blockchain
../bin/cryptogen generate --config=crypto-config.yaml

# Generate genesis block and channel artifacts
../bin/configtxgen -profile SixOrgsOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block
../bin/configtxgen -profile SixOrgsChannel -outputCreateChannelTx ./channel-artifacts/coffeechannel.tx -channelID coffeechannel

# Generate anchor peer transactions
../bin/configtxgen -profile SixOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/ECTAMSPanchors.tx -channelID coffeechannel -asOrg ECTAMSP
../bin/configtxgen -profile SixOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/ECXMSPanchors.tx -channelID coffeechannel -asOrg ECXMSP
../bin/configtxgen -profile SixOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/NBEMSPanchors.tx -channelID coffeechannel -asOrg NBEMSP
../bin/configtxgen -profile SixOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/BanksMSPanchors.tx -channelID coffeechannel -asOrg BanksMSP
../bin/configtxgen -profile SixOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/CustomsMSPanchors.tx -channelID coffeechannel -asOrg CustomsMSP
../bin/configtxgen -profile SixOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/ShippingMSPanchors.tx -channelID coffeechannel -asOrg ShippingMSP

cd ..
```

### **4. Start Blockchain Network**
```bash
# Start all containers
docker-compose -f docker-compose-fabric.yml up -d

# Verify all containers are running
docker ps

# Expected: 13 containers (1 orderer + 6 peers + 6 CAs)
```

### **5. Create and Join Channel**
```bash
# Create channel
docker exec peer0.ecta.cecbs.et peer channel create \
  -o orderer.cecbs.et:7050 \
  -c coffeechannel \
  -f /etc/hyperledger/configtx/coffeechannel.tx \
  --tls --cafile /etc/hyperledger/orderer/tls/ca.crt

# Join all peers to channel
docker exec peer0.ecta.cecbs.et peer channel join -b coffeechannel.block
docker exec peer0.ecx.cecbs.et peer channel join -b coffeechannel.block
docker exec peer0.nbe.cecbs.et peer channel join -b coffeechannel.block
docker exec peer0.banks.cecbs.et peer channel join -b coffeechannel.block
docker exec peer0.customs.cecbs.et peer channel join -b coffeechannel.block
docker exec peer0.shipping.cecbs.et peer channel join -b coffeechannel.block

# Update anchor peers
docker exec peer0.ecta.cecbs.et peer channel update \
  -o orderer.cecbs.et:7050 \
  -c coffeechannel \
  -f /etc/hyperledger/configtx/ECTAMSPanchors.tx \
  --tls --cafile /etc/hyperledger/orderer/tls/ca.crt
```

### **6. Deploy Chaincode (CaaS Mode)**
```bash
# Build chaincode Docker image
cd chaincodes/coffee
docker build -t coffee-chaincode:1.2 .

# Package chaincode
cd ../..
peer lifecycle chaincode package coffee_1.2.tar.gz \
  --path ./chaincodes/coffee \
  --lang golang \
  --label coffee_1.2

# Install on all peers
peer lifecycle chaincode install coffee_1.2.tar.gz --peerAddresses peer0.ecta.cecbs.et:7051
peer lifecycle chaincode install coffee_1.2.tar.gz --peerAddresses peer0.ecx.cecbs.et:8051
peer lifecycle chaincode install coffee_1.2.tar.gz --peerAddresses peer0.nbe.cecbs.et:9051
peer lifecycle chaincode install coffee_1.2.tar.gz --peerAddresses peer0.banks.cecbs.et:10051
peer lifecycle chaincode install coffee_1.2.tar.gz --peerAddresses peer0.customs.cecbs.et:11051
peer lifecycle chaincode install coffee_1.2.tar.gz --peerAddresses peer0.shipping.cecbs.et:12051

# Approve for all organizations
peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version 1.2 \
  --package-id <PACKAGE_ID> \
  --sequence 1 \
  --tls --cafile /path/to/orderer/ca.crt

# Commit chaincode
peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version 1.2 \
  --sequence 1 \
  --tls --cafile /path/to/orderer/ca.crt \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --peerAddresses peer0.ecx.cecbs.et:8051 \
  --peerAddresses peer0.nbe.cecbs.et:9051 \
  --peerAddresses peer0.banks.cecbs.et:10051
```

### **7. Setup API Gateway**
```bash
# Install dependencies
cd api
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Build TypeScript
npm run build

# Start API server
npm run dev
```

### **8. Setup Web UI**
```bash
# Install dependencies
cd ../ui
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your configuration
nano .env.local

# Start development server
npm run dev
```

---

## 🧪 **TESTING**

### **Test Blockchain Network**
```bash
# Test chaincode invocation
docker exec peer0.ecta.cecbs.et peer chaincode invoke \
  -o orderer.cecbs.et:7050 \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"InitLedger","Args":[]}' \
  --tls --cafile /etc/hyperledger/orderer/tls/ca.crt

# Test chaincode query
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"QueryAllAssets","Args":[]}'
```

### **Test API Gateway**
```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta.admin","password":"password123"}'

# Get exporters
curl http://localhost:3001/api/v1/exporters \
  -H "Authorization: Bearer <TOKEN>"
```

### **Test Web UI**
```bash
# Open browser
open http://localhost:3000

# Test portal access
# Navigate to each organization portal and verify functionality
```

---

## 🔒 **SECURITY CONFIGURATION**

### **1. Generate Strong Secrets**
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32

# Update .env files with generated secrets
```

### **2. Configure TLS Certificates**
```bash
# Ensure all TLS certificates are properly distributed
# Copy orderer TLS cert to all peers
# Copy peer TLS certs to all other peers
```

### **3. Set Up Firewall Rules**
```bash
# Allow only necessary ports
sudo ufw allow 7050/tcp  # Orderer
sudo ufw allow 7051/tcp  # Peer0 ECTA
sudo ufw allow 8051/tcp  # Peer0 ECX
sudo ufw allow 9051/tcp  # Peer0 NBE
sudo ufw allow 10051/tcp # Peer0 Banks
sudo ufw allow 11051/tcp # Peer0 Customs
sudo ufw allow 12051/tcp # Peer0 Shipping
sudo ufw allow 3000/tcp  # Web UI
sudo ufw allow 3001/tcp  # API Gateway
sudo ufw enable
```

---

## 📊 **MONITORING**

### **Container Health**
```bash
# Check container status
docker ps -a

# View container logs
docker logs -f peer0.ecta.cecbs.et
docker logs -f orderer.cecbs.et

# Monitor resource usage
docker stats
```

### **Application Logs**
```bash
# API Gateway logs
tail -f api/logs/combined.log

# Chaincode logs
docker logs -f coffee-chaincode
```

---

## 🔄 **BACKUP & RECOVERY**

### **Backup Blockchain Data**
```bash
# Backup ledger data
docker exec peer0.ecta.cecbs.et tar czf /tmp/ledger-backup.tar.gz /var/hyperledger/production

# Copy backup to host
docker cp peer0.ecta.cecbs.et:/tmp/ledger-backup.tar.gz ./backups/

# Backup crypto materials
tar czf crypto-backup.tar.gz blockchain/organizations/
```

### **Backup Database**
```bash
# PostgreSQL backup
pg_dump -U cecbs_user cecbs > cecbs_backup.sql

# Restore
psql -U cecbs_user cecbs < cecbs_backup.sql
```

---

## 🚀 **PRODUCTION DEPLOYMENT**

### **1. Use Production Environment Variables**
```bash
# Set NODE_ENV to production
export NODE_ENV=production

# Use production database
# Use production secrets
# Enable HTTPS
```

### **2. Set Up Load Balancer**
```bash
# Use nginx or HAProxy for load balancing
# Configure SSL/TLS termination
# Set up health checks
```

### **3. Configure Auto-Scaling**
```bash
# Use Kubernetes for container orchestration
# Configure horizontal pod autoscaling
# Set up monitoring and alerting
```

### **4. Enable Monitoring**
```bash
# Set up Prometheus for metrics
# Configure Grafana dashboards
# Enable ELK stack for logging
```

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues**

#### **Containers Not Starting**
```bash
# Check Docker daemon
sudo systemctl status docker

# Check logs
docker-compose logs

# Restart containers
docker-compose restart
```

#### **Chaincode Invocation Fails**
```bash
# Check endorsement policy
# Verify TLS certificates
# Check peer connectivity
docker exec peer0.ecta.cecbs.et peer channel list
```

#### **API Connection Issues**
```bash
# Verify Fabric connection profile
# Check wallet credentials
# Test network connectivity
```

---

## 📞 **SUPPORT**

For technical support:
- **Email**: support@cecbs.et
- **Documentation**: https://docs.cecbs.et
- **Issue Tracker**: https://github.com/your-org/cecbs/issues

---

**🎉 Deployment Complete!**  
Your CECBS system is now ready for production use.

*Ethiopian Coffee Export Consortium Blockchain System - Deployment Guide*
