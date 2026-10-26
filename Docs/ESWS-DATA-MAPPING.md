# ESWS Complete Data Mapping for CECBS

**Purpose:** Ensure CECBS captures every data field that ESWS collects for coffee exporters

---

## 📋 **Complete ESWS Exporter Data Fields**

### **1. Company Registration Data**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Company Legal Name | String | Yes | companyName | Full registered name |
| Company Trade Name | String | No | tradeName | DBA name |
| TIN Number | String(10) | Yes | tinNumber | Tax Identification |
| Business License Number | String | Yes | businessLicenseNumber | From Ministry of Trade |
| Business License Issue Date | Date | Yes | businessLicenseIssueDate | |
| Business License Expiry Date | Date | Yes | businessLicenseExpiryDate | |
| Company Registration Date | Date | Yes | companyRegistrationDate | |
| Company Type | Enum | Yes | companyType | Private/PLC/Share/Cooperative |
| Ownership Type | Enum | Yes | ownershipType | Local/Foreign/Joint |
| Number of Shareholders | Number | No | numberOfShareholders | For companies |
| Paid-up Capital | Number | Yes | paidUpCapital | In ETB |
| Registration Authority | String | Yes | registrationAuthority | e.g., "Addis Ababa City Admin" |

### **2. ECTA Coffee Export License**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| ECTA License Number | String | Yes | ectaLicenseNumber | e.g., ECTA-LIC-2026-001 |
| License Issue Date | Date | Yes | licenseIssueDate | |
| License Expiry Date | Date | Yes | licenseExpiryDate | Annual renewal |
| License Type | Enum | Yes | licenseType | Exporter/Processor/Both |
| License Status | Enum | Yes | licenseStatus | ACTIVE/SUSPENDED/EXPIRED/REVOKED |
| Suspension Reason | String | No | suspensionReason | If suspended |
| Suspension Date | Date | No | suspensionDate | |
| Capital Requirement Met | Boolean | Yes | capitalRequirementMet | Min 15M ETB |
| Capital Amount | Number | Yes | capitalAmount | In ETB |

### **3. Coffee Processing Facility**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Has Processing Facility | Boolean | Yes | hasProcessingFacility | |
| Facility Location | String | No | facilityLocation | City/Region |
| Facility Address | String | No | facilityAddress | Full address |
| Facility GPS Coordinates | String | No | facilityGPSCoordinates | Lat,Long |
| Processing Capacity | Number | No | processingCapacityKg | kg per year |
| Machinery List | Array | No | machineryList | Equipment details |
| Facility License Number | String | No | facilityLicenseNumber | From municipality |
| Environmental Certificate | String | No | environmentalCertificate | EPA certificate |

### **4. Quality Assurance**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Has Laboratory | Boolean | Yes | hasLaboratory | Own/Partner/None |
| Laboratory Certified | Boolean | Yes | laboratoryCertified | ECTA certified |
| Laboratory Certificate Number | String | No | laboratoryCertificateNumber | |
| Laboratory Location | String | No | laboratoryLocation | |
| Professional Taster Name | String | Yes | professionalTasterName | Q-Grader |
| Taster Certificate Number | String | Yes | tasterCertificateNumber | |
| Taster Certificate Issuer | String | Yes | tasterCertificateIssuer | CQI/SCAA/Other |
| Taster Certificate Issue Date | Date | Yes | tasterCertificateIssueDate | |
| Taster Certificate Expiry Date | Date | Yes | tasterCertificateExpiryDate | |
| Quality Manager Name | String | No | qualityManagerName | |
| Quality Manager Qualification | String | No | qualityManagerQualification | |

### **5. Contact Information**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Primary Contact Person | String | Yes | contactPersonName | Full name |
| Contact Person Title | String | Yes | contactPersonTitle | CEO/Manager/etc |
| Contact Person ID Number | String | Yes | contactPersonIdNumber | National ID |
| Office Phone | String | Yes | officePhone | Landline |
| Mobile Phone | String | Yes | mobilePhone | Primary mobile |
| Alternative Phone | String | No | alternativePhone | Secondary |
| Email Address | String | Yes | emailAddress | Primary email |
| Alternative Email | String | No | alternativeEmailAddress | |
| Website | String | No | websiteUrl | |
| Fax Number | String | No | faxNumber | If available |

### **6. Physical Address**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Office Address Line 1 | String | Yes | addressLine1 | Street address |
| Office Address Line 2 | String | No | addressLine2 | Building/Floor |
| City | String | Yes | city | |
| Sub-City | String | No | subCity | For Addis Ababa |
| Woreda | String | No | woreda | District |
| Region | String | Yes | region | State/Region |
| Zone | String | No | zone | If applicable |
| Postal Code | String | No | postalCode | P.O. Box |
| Country | String | Yes | country | Default: Ethiopia |
| GPS Coordinates | String | No | gpsCoordinates | Lat,Long |

### **7. Banking Information**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Primary Bank Name | String | Yes | primaryBankName | |
| Bank Branch | String | Yes | bankBranch | |
| Bank Account Number | String | Yes | bankAccountNumber | Local account |
| Bank Swift Code | String | No | bankSwiftCode | For intl. transfers |
| Account Type | Enum | Yes | accountType | Savings/Current |
| Foreign Currency Account | Boolean | No | hasForeignCurrencyAccount | |
| FC Account Number | String | No | foreignCurrencyAccountNumber | If yes |
| FC Account Currency | String | No | foreignCurrencyAccountCurrency | USD/EUR |

### **8. Export History (From ESWS)**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Years in Export Business | Number | Yes | yearsInBusiness | |
| First Export Year | Number | No | firstExportYear | |
| Annual Export Volume | Number | No | annualExportVolumeKg | Last year |
| Annual Export Value | Number | No | annualExportValueUSD | Last year |
| Primary Export Markets | Array | No | primaryExportMarkets | Countries |
| Export Destinations Count | Number | No | exportDestinationsCount | |
| Previous ECTA Violations | Boolean | No | hasPreviousViolations | |
| Violation Details | String | No | violationDetails | If yes |
| Previous License Suspensions | Number | No | previousSuspensionsCount | |

### **9. Certifications & Compliance**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| ISO Certification | Boolean | No | hasISOCertification | |
| ISO Certificate Number | String | No | isoCertificateNumber | |
| ISO Certificate Type | String | No | isoCertificateType | ISO 9001/22000/etc |
| Organic Certification | Boolean | No | hasOrganicCertification | |
| Organic Certifier | String | No | organicCertifier | USDA/EU/etc |
| Organic Certificate Number | String | No | organicCertificateNumber | |
| Fair Trade Certification | Boolean | No | hasFairTradeCertification | |
| Fair Trade Certificate Number | String | No | fairTradeCertificateNumber | |
| Rainforest Alliance Cert | Boolean | No | hasRainforestCertification | |
| UTZ Certification | Boolean | No | hasUTZCertification | |
| C.A.F.E. Practices | Boolean | No | hasCAFECertification | Starbucks |
| 4C Certification | Boolean | No | has4CCertification | |
| Other Certifications | Array | No | otherCertifications | List |

### **10. Legal & Compliance**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Tax Clearance Certificate | String | Yes | taxClearanceNumber | Annual |
| Tax Clearance Issue Date | Date | Yes | taxClearanceIssueDate | |
| Tax Clearance Expiry Date | Date | Yes | taxClearanceExpiryDate | |
| Chamber of Commerce Member | Boolean | Yes | isChamberMember | |
| Chamber Membership Number | String | No | chamberMembershipNumber | If yes |
| Export Association Member | Boolean | No | isExportAssociationMember | |
| Association Name | String | No | exportAssociationName | |
| Legal Representative Name | String | Yes | legalRepresentativeName | |
| Legal Representative ID | String | Yes | legalRepresentativeId | |
| Power of Attorney Document | String | No | powerOfAttorneyDocument | If applicable |

### **11. Employment Information**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Total Employees | Number | Yes | totalEmployees | |
| Permanent Employees | Number | Yes | permanentEmployees | |
| Seasonal Employees | Number | No | seasonalEmployees | |
| Female Employees | Number | No | femaleEmployees | |
| Disabled Employees | Number | No | disabledEmployees | |
| Professional Staff | Number | No | professionalStaff | |
| Technical Staff | Number | No | technicalStaff | |
| Administrative Staff | Number | No | administrativeStaff | |

### **12. Sourcing & Supply Chain**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Coffee Sourcing Method | Enum | Yes | sourcingMethod | Direct/ECX/Mixed |
| Works with Cooperatives | Boolean | No | worksWithCooperatives | |
| Number of Cooperatives | Number | No | numberOfCooperatives | If yes |
| Cooperative Names | Array | No | cooperativeNames | List |
| Sourcing Regions | Array | Yes | sourcingRegions | Coffee regions |
| Coffee Varieties Handled | Array | Yes | coffeeVarieties | Arabica types |
| Processing Methods | Array | Yes | processingMethods | Washed/Natural/Honey |
| Storage Capacity | Number | No | storageCapacityKg | In kg |
| Has Warehouse | Boolean | Yes | hasWarehouse | |
| Warehouse Location | String | No | warehouseLocation | |

### **13. Technology & Systems**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Uses Traceability System | Boolean | No | usesTraceabilitySystem | |
| Traceability System Name | String | No | traceabilitySystemName | |
| ERP System | String | No | erpSystemName | |
| Uses Digital Payments | Boolean | No | usesDigitalPayments | |
| Has ESWS Account | Boolean | Yes | hasESWSAccount | Always true |
| ESWS User ID | String | Yes | eswsUserId | Their ESWS ID |

### **14. Insurance & Risk**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Has Cargo Insurance | Boolean | No | hasCargoInsurance | |
| Insurance Company | String | No | insuranceCompanyName | |
| Insurance Policy Number | String | No | insurancePolicyNumber | |
| Insurance Coverage Amount | Number | No | insuranceCoverageAmount | In USD |
| Has Credit Insurance | Boolean | No | hasCreditInsurance | |

### **15. References & Verification**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| Bank Reference Letter | Boolean | No | hasBankReference | |
| Trade References | Array | No | tradeReferences | 3 references |
| Reference Contact 1 Name | String | No | reference1Name | |
| Reference Contact 1 Company | String | No | reference1Company | |
| Reference Contact 1 Phone | String | No | reference1Phone | |
| Reference Contact 2 Name | String | No | reference2Name | |
| Reference Contact 2 Company | String | No | reference2Company | |
| Reference Contact 2 Phone | String | No | reference2Phone | |

### **16. ESWS System Metadata**

| ESWS Field | Data Type | Required | CECBS Field | Notes |
|------------|-----------|----------|-------------|-------|
| ESWS Exporter ID | String | Yes | eswsExporterId | Primary link |
| ESWS Registration Date | DateTime | Yes | eswsRegistrationDate | |
| ESWS Last Update Date | DateTime | Yes | eswsLastUpdateDate | |
| ESWS Status | Enum | Yes | eswsStatus | ACTIVE/INACTIVE |
| ESWS Profile Complete | Boolean | Yes | eswsProfileComplete | % complete |
| ESWS Verification Status | Enum | Yes | eswsVerificationStatus | VERIFIED/PENDING |
| ESWS Risk Rating | Enum | No | eswsRiskRating | LOW/MEDIUM/HIGH |

---

## 📊 **Total Data Fields**

- **ESWS Captures:** ~180+ fields
- **CECBS Must Capture:** All 180+ fields
- **Mandatory Fields:** ~60 fields
- **Optional Fields:** ~120 fields

---

## 🔄 **Data Sync Strategy**

### **Initial Registration:**
```
ESWS → CECBS (Full Profile)
All 180+ fields transferred
Blockchain record created
```

### **Updates:**
```
ESWS → CECBS (Changed fields only)
Delta sync every 15 minutes
Blockchain updated
Audit trail maintained
```

### **Verification:**
```
CECBS → ESWS (Validation)
Verify critical fields
Check license status
Confirm exporter exists
```

---

## 💾 **Database Schema Impact**

### **Current Exporter Table:** ~20 fields  
### **Required Exporter Table:** ~180 fields

**Action Required:** Expand database schema to accommodate all ESWS fields

---

**Next Steps:**
1. Update chaincode `RegisterExporter` function to accept all fields
2. Expand database schema (add columns)
3. Update API endpoints to handle full data
4. Update UI registration forms
5. Implement ESWS API integration

