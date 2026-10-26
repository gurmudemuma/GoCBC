#!/usr/bin/env node
/**
 * Test Payment Release Filtering
 * Checks if LC1789460822330 appears in payment release list
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testPaymentRelease() {
  try {
    console.log('🔐 Logging in as nbeAdmin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'nbeAdmin',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');
    
    console.log('📋 Fetching LCs...');
    const lcsResponse = await axios.get(`${API_BASE}/banking/lc`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const lcs = lcsResponse.data.data || lcsResponse.data.lcs || [];
    console.log(`✅ Fetched ${lcs.length} LCs\n`);
    
    // Find LC1789460822330
    const targetLC = lcs.find(lc => lc.lcId === 'LC1789460822330' || lc.lc_id === 'LC1789460822330');
    
    if (!targetLC) {
      console.log('❌ LC1789460822330 not found in response');
      return;
    }
    
    console.log('📦 LC1789460822330 Details:');
    console.log('  Status:', targetLC.status);
    console.log('  Documents count:', targetLC.documents?.length || 0);
    console.log('  Customs clearance status:', targetLC.customsClearanceStatus);
    console.log('  Customs cleared:', targetLC.customsCleared);
    console.log('  Contract ID:', targetLC.contractId);
    console.log('');
    
    if (targetLC.documents && targetLC.documents.length > 0) {
      const sample = targetLC.documents[0];
      console.log('📄 Sample Document:');
      console.log('  Type:', sample.documentType || sample.document_type);
      console.log('  Verification status:', sample.verificationStatus || sample.verification_status);
      console.log('  Requires multi-party approval:', sample.requiresMultiPartyApproval);
      console.log('  Approval workflow complete:', sample.approvalWorkflowComplete);
      console.log('');
      
      // Check all documents
      const allVerified = targetLC.documents.every(d => {
        const status = d.verificationStatus || d.verification_status || '';
        return status === 'verified' || status === 'approved' || status === 'compliant';
      });
      console.log('  All documents verified:', allVerified);
      
      const allApproved = targetLC.documents.every(d => {
        if (d.requiresMultiPartyApproval) {
          return d.approvalWorkflowComplete === true;
        }
        return true;
      });
      console.log('  All approvals complete:', allApproved);
    }
    
    console.log('\n🎯 Payment Release Qualification:');
    console.log('  ✓ Status is UTILIZED:', targetLC.status === 'UTILIZED');
    console.log('  ✓ Has documents:', targetLC.documents && targetLC.documents.length > 0);
    console.log('  ✓ Documents verified:', targetLC.documents?.every(d => {
      const status = d.verificationStatus || d.verification_status || '';
      return status === 'verified' || status === 'approved' || status === 'compliant';
    }));
    console.log('  ✓ Customs cleared:', targetLC.customsCleared === true || targetLC.customsClearanceStatus === 'CLEARED' || targetLC.customsClearanceStatus === 'cleared');
    
    const qualifies = 
      targetLC.status === 'UTILIZED' &&
      targetLC.documents && targetLC.documents.length > 0 &&
      targetLC.documents.every(d => {
        const status = d.verificationStatus || d.verification_status || '';
        return status === 'verified' || status === 'approved' || status === 'compliant';
      }) &&
      (targetLC.customsCleared === true || targetLC.customsClearanceStatus === 'CLEARED' || targetLC.customsClearanceStatus === 'cleared');
    
    console.log('\n' + (qualifies ? '✅ LC QUALIFIES for payment release' : '❌ LC DOES NOT QUALIFY for payment release'));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testPaymentRelease();
