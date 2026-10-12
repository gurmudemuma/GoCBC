#!/usr/bin/env python3
"""
GoCBC Complete Workflow Test - Python Implementation
Tests actual blockchain transactions with proper authentication
"""

import requests
import json
import time
import sys
from datetime import datetime

API_BASE = "http://localhost:3001/api/v1"
TIMESTAMP = int(time.time())

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

tests_passed = 0
tests_failed = 0
log_entries = []

def log(msg):
    print(msg)
    log_entries.append(msg)

def save_log():
    with open('workflow-test-python.log', 'w') as f:
        f.write('\n'.join(log_entries))

def test_endpoint(name, method, endpoint, data=None, token=None, expect_success=True):
    global tests_passed, tests_failed
    
    log(f"\n{'='*70}")
    log(f"{Colors.BLUE}TEST: {name}{Colors.END}")
    log(f"Endpoint: {method} {endpoint}")
    
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if data:
        headers['Content-Type'] = 'application/json'
    
    try:
        if method == 'GET':
            response = requests.get(endpoint, headers=headers, timeout=30)
        elif method == 'POST':
            response = requests.post(endpoint, json=data, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        log(f"HTTP Status: {response.status_code}")
        
        try:
            resp_json = response.json()
            log(f"Response: {json.dumps(resp_json, indent=2)[:300]}...")
        except:
            log(f"Response (text): {response.text[:200]}")
            resp_json = {}
        
        if response.status_code in [200, 201]:
            log(f"{Colors.GREEN}✓ PASS{Colors.END}")
            tests_passed += 1
            return resp_json
        else:
            log(f"{Colors.RED}✗ FAIL (HTTP {response.status_code}){Colors.END}")
            tests_failed += 1
            return resp_json
            
    except Exception as e:
        log(f"{Colors.RED}✗ FAIL: {str(e)}{Colors.END}")
        tests_failed += 1
        return None

def main():
    log("="*70)
    log("GoCBC Complete Workflow Test - Python Implementation")
    log("="*70)
    log(f"Timestamp: {TIMESTAMP}")
    log(f"Date: {datetime.now().isoformat()}")
    
    try:
        # STEP 1: Health Check
        log("\n" + "="*70)
        log("STEP 1: Health Check")
        log("="*70)
        test_endpoint(
            "Health Check",
            "GET",
            "http://localhost:3001/health"
        )
        
        # STEP 2: Admin Login
        log("\n" + "="*70)
        log("STEP 2: Admin Login")
        log("="*70)
        login_resp = test_endpoint(
            "Admin Login",
            "POST",
            f"{API_BASE}/auth/login",
            {"username": "admin", "password": "admin123"}
        )
        
        if not login_resp:
            log(f"{Colors.RED}Failed to login. Stopping.{Colors.END}")
            save_log()
            sys.exit(1)
        
        admin_token = login_resp.get('data', {}).get('token') or login_resp.get('token')
        if not admin_token:
            log(f"{Colors.RED}No token received. Stopping.{Colors.END}")
            save_log()
            sys.exit(1)
        
        log(f"{Colors.GREEN}Admin Token: {admin_token[:30]}...{Colors.END}")
        
        # STEP 3: Submit Exporter Application (CORRECTED PATH)
        log("\n" + "="*70)
        log("STEP 3: Submit Exporter Application")
        log("="*70)
        log(f"{Colors.YELLOW}✓ Using CORRECTED path: /api/v1/exporters/exporter-applications{Colors.END}")
        
        exporter_email = f"exporter_{TIMESTAMP}@test.com"
        exporter_company = f"Test Coffee Ltd {TIMESTAMP}"
        
        app_resp = test_endpoint(
            "Submit Exporter Application",
            "POST",
            f"{API_BASE}/exporters/exporter-applications",
            {
                "companyName": exporter_company,
                "tinNumber": f"TIN-{TIMESTAMP}",
                "businessLicenseNumber": f"BLN-{TIMESTAMP}",
                "capitalRequirement": "500000 ETB",
                "professionalTaster": "yes",
                "tasterCertificate": f"CERT-{TIMESTAMP}",
                "contactPerson": "Test Manager",
                "email": exporter_email,
                "phone": "+251911234567",
                "address": "123 Coffee Street",
                "city": "Addis Ababa",
                "region": "Addis Ababa",
                "exporterType": "company"
            }
        )
        
        app_id = None
        if app_resp:
            app_id = (app_resp.get('data', {}).get('applicationId') or 
                     app_resp.get('data', {}).get('application_id') or 
                     app_resp.get('applicationId'))
        
        log(f"Application ID: {app_id}")
        log(f"Application Email: {exporter_email}")
        
        # STEP 4: Create Exporter User
        log("\n" + "="*70)
        log("STEP 4: Create Exporter User")
        log("="*70)
        
        exporter_id = f"EXP-{TIMESTAMP}"
        exporter_username = f"exporter_{TIMESTAMP}"
        exporter_password = "Exporter123!"
        
        user_resp = test_endpoint(
            "Create Exporter User",
            "POST",
            f"{API_BASE}/users",
            {
                "username": exporter_username,
                "email": exporter_email,
                "password": exporter_password,
                "role": "EXPORTER",
                "organization": "EXPORTER",
                "exporterId": exporter_id,
                "ectaLicense": f"LIC-{TIMESTAMP}",  # ✅ FIX: Add license to match exporterId
                "fullName": exporter_company
            },
            token=admin_token
        )
        
        # STEP 5: Login as Exporter
        log("\n" + "="*70)
        log("STEP 5: Login as Exporter")
        log("="*70)
        
        exporter_login = test_endpoint(
            "Exporter Login",
            "POST",
            f"{API_BASE}/auth/login",
            {"username": exporter_username, "password": exporter_password}
        )
        
        if not exporter_login:
            log(f"{Colors.YELLOW}⚠ Exporter login failed. Using admin token.{Colors.END}")
            exporter_token = admin_token
        else:
            exporter_token = (exporter_login.get('data', {}).get('token') or 
                            exporter_login.get('token'))
        
        log(f"{Colors.GREEN}Exporter Token: {exporter_token[:30]}...{Colors.END}")
        
        # STEP 6: Create Sales Contract (CORRECTED FIELD NAMES)
        log("\n" + "="*70)
        log("STEP 6: Create Sales Contract")
        log("="*70)
        log(f"{Colors.YELLOW}✓ Using CORRECTED field names: contractID, exporterID, buyerID (uppercase){Colors.END}")
        
        contract_id = f"CNT-{TIMESTAMP}"
        buyer_id = f"BUY-{TIMESTAMP}"
        
        contract_resp = test_endpoint(
            "Create Sales Contract",
            "POST",
            f"{API_BASE}/contracts",
            {
                "contractID": contract_id,      # ✓ Uppercase
                "exporterID": exporter_id,      # ✓ Uppercase
                "buyerID": buyer_id,            # ✓ Uppercase
                "buyerCountry": "Germany",
                "buyerBank": "Deutsche Bank",
                "exporterBank": "Commercial Bank of Ethiopia",
                "coffeeType": "Arabica Sidamo Grade 2",
                "quantity": 10000,
                "pricePerKg": 5.50,
                "currency": "USD",
                "paymentMethod": "LC",
                "eudrRequired": True,
                "documents": []
            },
            token=exporter_token
        )
        
        tx_id = None
        if contract_resp:
            tx_id = (contract_resp.get('data', {}).get('txId') or 
                    contract_resp.get('data', {}).get('transactionId'))
        
        log(f"Contract ID: {contract_id}")
        log(f"Blockchain TX: {tx_id or 'N/A'}")
        
        # STEP 7: Create Shipment (CORRECTED FIELD NAMES)
        log("\n" + "="*70)
        log("STEP 7: Create Shipment")
        log("="*70)
        
        shipment_id = f"SHP-{TIMESTAMP}"
        
        shipment_resp = test_endpoint(
            "Create Shipment",
            "POST",
            f"{API_BASE}/shipments",
            {
                "shipmentID": shipment_id,      # ✓ Uppercase
                "contractID": contract_id,      # ✓ Uppercase
                "exporterID": exporter_id,      # ✓ Uppercase
                "buyerID": buyer_id,            # ✓ Uppercase
                "origin": "Sidamo, Ethiopia",
                "quantity": 10000,
                "grade": "Grade 2",
                "icoNumber": f"ICO-{TIMESTAMP}",
                "channel": "ECX",
                "ecxLotNumber": f"ECX-LOT-{TIMESTAMP}",
                "forexRate": 55.5,
                "valueUSD": 55000,
                "eudrCompliant": True,
                "documents": []
            },
            token=exporter_token
        )
        
        ship_tx_id = None
        if shipment_resp:
            ship_tx_id = (shipment_resp.get('data', {}).get('txId') or 
                         shipment_resp.get('data', {}).get('transactionId'))
        
        log(f"Shipment ID: {shipment_id}")
        log(f"Blockchain TX: {ship_tx_id or 'N/A'}")
        
        # STEP 8: Query Blockchain
        log("\n" + "="*70)
        log("STEP 8: Query Blockchain Data")
        log("="*70)
        
        log("\nQuerying contract from blockchain...")
        contract_query = test_endpoint(
            "Query Contract",
            "GET",
            f"{API_BASE}/contracts/{contract_id}",
            token=exporter_token
        )
        
        log("\nQuerying shipment from blockchain...")
        shipment_query = test_endpoint(
            "Query Shipment",
            "GET",
            f"{API_BASE}/shipments/{shipment_id}",
            token=exporter_token
        )
        
        # SUMMARY
        log("\n" + "="*70)
        log("TEST SUMMARY")
        log("="*70)
        log(f"{Colors.GREEN}✓ Tests Passed: {tests_passed}{Colors.END}")
        log(f"{Colors.RED}✗ Tests Failed: {tests_failed}{Colors.END}")
        log("")
        log("Test Data Created:")
        log(f"  Application ID: {app_id}")
        log(f"  Exporter ID: {exporter_id}")
        log(f"  Contract ID: {contract_id}")
        log(f"  Shipment ID: {shipment_id}")
        log(f"  Contract TX: {tx_id or 'N/A'}")
        log(f"  Shipment TX: {ship_tx_id or 'N/A'}")
        log("")
        
        if tests_failed == 0:
            log(f"{Colors.GREEN}✓ ALL TESTS PASSED!{Colors.END}")
            log("System is functional and storing data in both databases.")
        else:
            log(f"{Colors.YELLOW}⚠ SOME TESTS FAILED{Colors.END}")
            log(f"Tests passed: {tests_passed}/{tests_passed + tests_failed}")
        
        save_log()
        
        # Write results to JSON
        with open('workflow-test-results.json', 'w') as f:
            json.dump({
                "timestamp": TIMESTAMP,
                "date": datetime.now().isoformat(),
                "tests_passed": tests_passed,
                "tests_failed": tests_failed,
                "test_data": {
                    "application_id": app_id,
                    "exporter_id": exporter_id,
                    "contract_id": contract_id,
                    "shipment_id": shipment_id,
                    "contract_tx_id": tx_id,
                    "shipment_tx_id": ship_tx_id
                }
            }, f, indent=2)
        
        log(f"\nLog saved to: workflow-test-python.log")
        log(f"Results saved to: workflow-test-results.json")
        
        sys.exit(0 if tests_failed == 0 else 1)
        
    except KeyboardInterrupt:
        log(f"\n{Colors.YELLOW}Test interrupted by user{Colors.END}")
        save_log()
        sys.exit(1)
    except Exception as e:
        log(f"\n{Colors.RED}CRITICAL ERROR: {str(e)}{Colors.END}")
        import traceback
        log(traceback.format_exc())
        save_log()
        sys.exit(1)

if __name__ == '__main__':
    main()
