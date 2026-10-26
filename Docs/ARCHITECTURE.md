# CECBS Architecture

## Network Design Philosophy

### Consortium Members vs Client Applications

**Network Members (6 Organizations with Peers):**
- ECTA, ECX, Banks, NBE, Customs, Shipping
- Each runs their own peer node
- Participate in consensus and endorsement
- Have voting rights in network governance
- Host the blockchain ledger

**Client Applications (SDK Access):**
- Licensed Exporters (300+ companies)
- International Buyers (global coffee importers)
- Farmers/Cooperatives
- Warehouses
- Quality inspectors

**Why Exporters and Buyers are NOT Network Members:**
- **Scalability**: 300+ exporters + 1000+ international buyers would need individual peer nodes
- **Cost**: Running a peer requires $30K-36K/year per organization
- **Security**: Clients don't need to see all transactions, only their own
- **Governance**: External parties shouldn't have voting rights on network changes
- **Access Control**: SDK clients can be registered/revoked easily

## Access Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Exporter Companies                        │
│         (300+ licensed exporters as SDK clients)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Fabric SDK (gRPC)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Gateway API (Go Service)                    │
│              - Authentication & Authorization                │
│              - Rate Limiting                                 │
│              - Transaction Submission                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Connect to ECTA Peer
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    ECTA Peer Node                            │
│              - Endorses transactions                         │
│              - Maintains ledger copy                         │
│              - Manages exporter identities                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Gossip Protocol
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Hyperledger Fabric Network                      │
│   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│   │ ECX  │  │Banks │  │ NBE  │  │Custom│  │Shipping│       │
│   │ Peer │  │ Peer │  │ Peer │  │ Peer │  │ Peer  │        │
│   └──────┘  └──────┘  └──────┘  └──────┘  └──────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Identity Management

### ECTA Organization (100 Users)
```
ECTA MSP
├── Admin (network admin)
├── Peer (peer node identity)
└── Users (100 client identities)
    ├── exporter1@ecta.cecbs.et (50 exporters)
    ├── exporter2@ecta.cecbs.et
    ├── ...
    ├── buyer1@ecta.cecbs.et (50 buyers)
    ├── buyer2@ecta.cecbs.et
    └── ...
```

Each exporter/buyer gets:
- X.509 certificate issued by ECTA CA
- Private key for signing transactions
- Enrolled as ECTA client (not separate org)

### Certificate Enrollment Process

```bash
# ECTA admin enrolls a new exporter
fabric-ca-client register \
  --id.name exporter1 \
  --id.secret password123 \
  --id.type client \
  --id.affiliation ecta

# Exporter receives credentials and enrolls
fabric-ca-client enroll \
  -u https://exporter1:password123@ca.ecta.cecbs.et:7054
```

## Transaction Flow

### Example: Exporter Submits Shipment

1. **Exporter Application** (SDK client)
   ```go
   // Connect to gateway
   gw, err := gateway.Connect(
       gateway.WithIdentity(wallet, "exporter1"),
       gateway.WithEndpoint("peer0.ecta.cecbs.et:7051"),
   )
   
   // Submit transaction
   contract := network.GetContract("coffee")
   result, err := contract.SubmitTransaction(
       "CreateShipment",
       shipmentID, exporterID, buyerID, ...
   )
   ```

2. **Gateway API** validates request and forwards to ECTA peer

3. **ECTA Peer** endorses transaction (checks exporter identity)

4. **Endorsement Policy** requires:
   - ECTA (regulatory approval)
   - ECX (if ECX channel) or ECTA (if DSL channel)
   - Banks (for forex)

5. **Orderer** sequences transaction into block

6. **All Peers** validate and commit to ledger

7. **Event** emitted to subscribed clients

## Data Privacy

### Channel-Based Privacy
- **Main Channel**: All 7 organizations
- **Private Data Collections**: Sensitive data (prices, contracts)
  - Only shared between relevant parties
  - Hash stored on-chain for verification

### Access Control in Chaincode
```go
// Check if caller is authorized exporter
clientID, err := ctx.GetClientIdentity().GetID()
mspID, err := ctx.GetClientIdentity().GetMSPID()

if mspID != "ECTAMSP" {
    return fmt.Errorf("only ECTA clients can create shipments")
}

// Verify exporter owns this shipment
if shipment.ExporterID != getExporterID(clientID) {
    return fmt.Errorf("unauthorized access")
}
```

## Scalability Considerations

### Current Design (6 Peers)
- Block time: ~2 seconds
- TPS: ~500-1000 transactions/second
- Supports 1000+ concurrent exporters and buyers

### If Exporters+Buyers Were Network Members (1300 Peers)
- Block time: ~60+ seconds (massive gossip overhead)
- TPS: ~10-50 transactions/second
- Network would be unstable
- Infrastructure cost: $40M+/year

## Security Benefits

1. **Centralized Identity Management**: ECTA controls exporter enrollment
2. **Revocation**: Can revoke exporter certificates instantly
3. **Audit Trail**: All exporter actions logged with their identity
4. **Rate Limiting**: Gateway can throttle abusive clients
5. **DDoS Protection**: Gateway shields peer nodes

## Cost Comparison

### Network Member (Peer Node)
- Server: $500-1000/month
- Maintenance: $2000/month
- **Total per org: $30K-36K/year**

### SDK Client
- No infrastructure needed
- Gateway access: $50-100/month
- **Total per exporter: $600-1200/year**

**Savings for 300 exporters + 1000 buyers: $40M+/year**

## Implementation

### Gateway Service (services/gateway/)
```go
// Manages SDK client connections
// Handles authentication
// Submits transactions to ECTA peer
// Returns results to clients
```

### Exporter Portal (frontend/)
```javascript
// Web application for exporters
// Uses Fabric SDK (fabric-network)
// Connects to Gateway API
// Real-time shipment tracking
```

### ECTA Admin Portal
```javascript
// Manage exporter registrations
// Issue/revoke certificates
// Monitor network activity
// Generate reports
```

## Future Enhancements

1. **Multi-Gateway**: Deploy gateways in multiple regions
2. **Load Balancing**: Distribute exporter requests across ECTA peers
3. **Caching**: Redis cache for frequent queries
4. **Analytics**: Real-time dashboards for ECTA administrators

**Confidential** | Ethiopian Coffee Export Consortium | May 2026
