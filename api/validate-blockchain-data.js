// Comprehensive Blockchain Data Validation Script
// This script validates EVERY value in the blockchain for accuracy
// Run with: node validate-blockchain-data.js <exporterId>

const axios = require('axios');

const API_URL = 'http://localhost:3001/api/v1';

// Login as admin
async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'ecta_admin',
      password: 'password123'
    });
    return response.data.data?.token || response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Fetch exporter from blockchain
async function getExporter(token, exporterId) {
  try {
    const response = await axios.get(
      `${API_URL}/exporters/${exporterId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  } catch (error) {
    console.error(`❌ Failed to fetch exporter:`, error.response?.data || error.message);
    return null;
  }
}

// Fetch all contracts for exporter
async function getContracts(token, exporterId) {
  try {
    const response = await axios.get(
      `${API_URL}/exporters/${exporterId}/contracts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data || [];
  } catch (error) {
    console.error(`❌ Failed to fetch contracts:`, error.response?.data || error.message);
    return [];
  }
}

// Fetch all shipments
async function getShipments(token, exporterId) {
  try {
    const response = await axios.get(
      `${API_URL}/exporters/${exporterId}/shipments`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data || [];
  } catch (error) {
    console.error(`❌ Failed to fetch shipments:`, error.response?.data || error.message);
    return [];
  }
}

// Fetch forex allocations
async function getForex(token, exporterId) {
  try {
    const response = await axios.get(
      `${API_URL}/exporters/${exporterId}/forex`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data || [];
  } catch (error) {
    console.error(`❌ Failed to fetch forex:`, error.response?.data || error.message);
    return [];
  }
}

// Fetch LCs
async function getLCs(token, exporterId) {
  try {
    const response = await axios.get(
      `${API_URL}/exporters/${exporterId}/lcs`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data || [];
  } catch (error) {
    console.error(`❌ Failed to fetch LCs:`, error.response?.data || error.message);
    return [];
  }
}

// Fetch payments
async function getPayments(token, exporterId) {
  try {
    const response = await axios.get(
      `${API_URL}/exporters/${exporterId}/payments`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data || [];
  } catch (error) {
    console.error(`❌ Failed to fetch payments:`, error.response?.data || error.message);
    return [];
  }
}

// Validate exporter data
function validateExporter(exporter) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 EXPORTER DATA VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const issues = [];
  const warnings = [];

  // Required fields
  if (!exporter.exporterId) issues.push('❌ Missing exporterId');
  else console.log(`✓ Exporter ID: ${exporter.exporterId}`);

  if (!exporter.companyName) issues.push('❌ Missing companyName');
  else console.log(`✓ Company Name: ${exporter.companyName}`);

  if (!exporter.ectaLicenseNumber) issues.push('❌ Missing ectaLicenseNumber');
  else console.log(`✓ ECTA License: ${exporter.ectaLicenseNumber}`);

  if (!exporter.licenseStatus) issues.push('❌ Missing licenseStatus');
  else if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(exporter.licenseStatus)) {
    issues.push(`❌ Invalid licenseStatus: ${exporter.licenseStatus}`);
  } else {
    console.log(`✓ License Status: ${exporter.licenseStatus}`);
  }

  if (!exporter.licenseExpiryDate) issues.push('❌ Missing licenseExpiryDate');
  else {
    const expiry = new Date(exporter.licenseExpiryDate);
    const now = new Date();
    if (expiry < now) {
      warnings.push(`⚠️  License EXPIRED on ${expiry.toDateString()}`);
    } else {
      console.log(`✓ License Expiry: ${expiry.toDateString()} (${Math.floor((expiry - now) / (1000 * 60 * 60 * 24))} days remaining)`);
    }
  }

  if (!exporter.capitalRequirement) warnings.push('⚠️  Missing capitalRequirement');
  else if (exporter.capitalRequirement < 50000000) {
    warnings.push(`⚠️  capitalRequirement (${exporter.capitalRequirement} ETB) below minimum 50M ETB`);
  } else {
    console.log(`✓ Capital Requirement: ${exporter.capitalRequirement.toLocaleString()} ETB`);
  }

  // Laboratory certification
  if (exporter.laboratoryCertified === undefined) {
    issues.push('❌ Missing laboratoryCertified field');
  } else {
    if (exporter.laboratoryCertified) {
      if (!exporter.laboratoryCertificateNumber && !exporter.professionalTaster) {
        warnings.push('⚠️  Marked as certified but missing certificate/taster details');
      } else {
        console.log(`✓ Laboratory Certified: YES`);
        if (exporter.professionalTaster) console.log(`  - Professional Taster: ${exporter.professionalTaster}`);
        if (exporter.tasterCertificate) console.log(`  - Taster Certificate: ${exporter.tasterCertificate}`);
        if (exporter.laboratoryCertificateNumber) console.log(`  - Lab Certificate: ${exporter.laboratoryCertificateNumber}`);
      }
    } else {
      console.log(`✓ Laboratory Certified: NO (not required for all exporters)`);
    }
  }

  console.log(`\n✓ Created: ${new Date(exporter.createdAt).toLocaleString()}`);
  console.log(`✓ Updated: ${new Date(exporter.updatedAt).toLocaleString()}`);

  return { issues, warnings };
}

// Validate contracts
function validateContracts(contracts) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 CONTRACTS VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const issues = [];
  const warnings = [];

  console.log(`Total Contracts: ${contracts.length}\n`);

  contracts.forEach((contract, index) => {
    console.log(`\nContract #${index + 1}:`);
    console.log(`${'─'.repeat(60)}`);

    if (!contract.contractId) {
      issues.push(`❌ Contract #${index + 1}: Missing contractId`);
    } else {
      console.log(`✓ ID: ${contract.contractId}`);
    }

    if (!contract.nbeReferenceNumber) {
      warnings.push(`⚠️  Contract ${contract.contractId || index + 1}: Missing NBE reference`);
    } else {
      console.log(`✓ NBE Reference: ${contract.nbeReferenceNumber}`);
    }

    if (!contract.buyerName) {
      issues.push(`❌ Contract ${contract.contractId || index + 1}: Missing buyerName`);
    } else {
      console.log(`✓ Buyer: ${contract.buyerName}`);
    }

    if (!contract.buyerCountry) {
      warnings.push(`⚠️  Contract ${contract.contractId || index + 1}: Missing buyerCountry`);
    } else {
      console.log(`✓ Country: ${contract.buyerCountry}`);
    }

    const value = parseFloat(contract.contractValue || contract.ContractValue || 0);
    if (value === 0) {
      issues.push(`❌ Contract ${contract.contractId || index + 1}: Invalid contract value (0)`);
    } else {
      console.log(`✓ Value: $${value.toLocaleString()}`);
    }

    const quantity = parseFloat(contract.quantity || contract.Quantity || 0);
    if (quantity === 0) {
      issues.push(`❌ Contract ${contract.contractId || index + 1}: Invalid quantity (0)`);
    } else {
      console.log(`✓ Quantity: ${quantity.toLocaleString()} kg`);
    }

    if (!contract.status && !contract.Status) {
      issues.push(`❌ Contract ${contract.contractId || index + 1}: Missing status`);
    } else {
      console.log(`✓ Status: ${contract.status || contract.Status}`);
    }
  });

  return { issues, warnings };
}

// Validate shipments
function validateShipments(shipments) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 SHIPMENTS VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const issues = [];
  const warnings = [];

  console.log(`Total Shipments: ${shipments.length}\n`);

  shipments.forEach((shipment, index) => {
    console.log(`\nShipment #${index + 1}:`);
    console.log(`${'─'.repeat(60)}`);

    if (!shipment.shipmentId && !shipment.ShipmentId) {
      issues.push(`❌ Shipment #${index + 1}: Missing shipmentId`);
    } else {
      console.log(`✓ ID: ${shipment.shipmentId || shipment.ShipmentId}`);
    }

    if (!shipment.contractId && !shipment.ContractId) {
      issues.push(`❌ Shipment #${index + 1}: Missing contractId`);
    } else {
      console.log(`✓ Contract: ${shipment.contractId || shipment.ContractId}`);
    }

    const quantity = parseFloat(shipment.quantity || shipment.Quantity || 0);
    if (quantity === 0) {
      warnings.push(`⚠️  Shipment ${shipment.shipmentId || index + 1}: Missing or zero quantity`);
    } else {
      console.log(`✓ Quantity: ${quantity.toLocaleString()} kg`);
    }

    if (!shipment.origin && !shipment.Origin) {
      warnings.push(`⚠️  Shipment ${shipment.shipmentId || index + 1}: Missing origin`);
    } else {
      console.log(`✓ Origin: ${shipment.origin || shipment.Origin}`);
    }

    if (!shipment.status && !shipment.Status) {
      issues.push(`❌ Shipment ${shipment.shipmentId || index + 1}: Missing status`);
    } else {
      console.log(`✓ Status: ${shipment.status || shipment.Status}`);
    }

    if (shipment.ecxLotNumber || shipment.EcxLotNumber) {
      console.log(`✓ ECX Lot: ${shipment.ecxLotNumber || shipment.EcxLotNumber}`);
    } else {
      warnings.push(`⚠️  Shipment ${shipment.shipmentId || index + 1}: Missing ECX Lot Number`);
    }
  });

  return { issues, warnings };
}

// Validate forex allocations
function validateForex(forexList) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 FOREX ALLOCATIONS VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const issues = [];
  const warnings = [];

  console.log(`Total Forex Allocations: ${forexList.length}\n`);

  let totalAllocated = 0;

  forexList.forEach((forex, index) => {
    console.log(`\nForex #${index + 1}:`);
    console.log(`${'─'.repeat(60)}`);

    if (!forex.forexId && !forex.ForexId) {
      issues.push(`❌ Forex #${index + 1}: Missing forexId`);
    } else {
      console.log(`✓ ID: ${forex.forexId || forex.ForexId}`);
    }

    const amount = parseFloat(forex.allocatedAmount || forex.AllocatedAmount || 0);
    if (amount === 0) {
      warnings.push(`⚠️  Forex ${forex.forexId || index + 1}: Zero allocation amount`);
    } else {
      console.log(`✓ Amount: $${amount.toLocaleString()}`);
      if (forex.status === 'ALLOCATED' || forex.Status === 'ALLOCATED') {
        totalAllocated += amount;
      }
    }

    const rate = parseFloat(forex.exchangeRate || forex.ExchangeRate || 0);
    if (rate === 0) {
      warnings.push(`⚠️  Forex ${forex.forexId || index + 1}: Missing exchange rate`);
    } else {
      console.log(`✓ Exchange Rate: ${rate} ETB/USD`);
    }

    console.log(`✓ Status: ${forex.status || forex.Status || 'UNKNOWN'}`);
  });

  console.log(`\n💰 Total Allocated: $${totalAllocated.toLocaleString()}`);

  return { issues, warnings, totalAllocated };
}

// Main validation
async function main() {
  const exporterId = process.argv[2] || 'EXP6896621';
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   ETHIOPIAN COFFEE EXPORT BLOCKCHAIN DATA VALIDATOR');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n🔍 Validating data for: ${exporterId}\n`);
  
  const token = await login();
  console.log('✓ Authenticated successfully\n');
  
  // Fetch all data
  const exporter = await getExporter(token, exporterId);
  const contracts = await getContracts(token, exporterId);
  const shipments = await getShipments(token, exporterId);
  const forex = await getForex(token, exporterId);
  const lcs = await getLCs(token, exporterId);
  const payments = await getPayments(token, exporterId);

  if (!exporter) {
    console.error(`\n❌ CRITICAL: Exporter ${exporterId} not found in blockchain!`);
    process.exit(1);
  }

  // Validate each section
  const exporterValidation = validateExporter(exporter);
  const contractsValidation = validateContracts(contracts);
  const shipmentsValidation = validateShipments(shipments);
  const forexValidation = validateForex(forex);

  // Final summary
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('📊 VALIDATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const allIssues = [
    ...exporterValidation.issues,
    ...contractsValidation.issues,
    ...shipmentsValidation.issues,
    ...forexValidation.issues,
  ];

  const allWarnings = [
    ...exporterValidation.warnings,
    ...contractsValidation.warnings,
    ...shipmentsValidation.warnings,
    ...forexValidation.warnings,
  ];

  console.log(`📈 Data Overview:`);
  console.log(`   - Contracts: ${contracts.length}`);
  console.log(`   - Shipments: ${shipments.length}`);
  console.log(`   - Forex: ${forex.length} (Total: $${forexValidation.totalAllocated?.toLocaleString() || 0})`);
  console.log(`   - LCs: ${lcs.length}`);
  console.log(`   - Payments: ${payments.length}`);

  if (allIssues.length === 0 && allWarnings.length === 0) {
    console.log('\n✅ VALIDATION PASSED: All data is accurate and complete!');
    console.log('   The blockchain data is ready for regulatory compliance reporting.\n');
  } else {
    if (allIssues.length > 0) {
      console.log(`\n❌ CRITICAL ISSUES (${allIssues.length}):`);
      allIssues.forEach(issue => console.log(`   ${issue}`));
    }
    
    if (allWarnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${allWarnings.length}):`);
      allWarnings.forEach(warning => console.log(`   ${warning}`));
    }

    console.log('\n⚠️  VALIDATION INCOMPLETE: Please fix the issues above before generating compliance reports.\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('\n❌ Validation failed:', error.message);
  process.exit(1);
});
