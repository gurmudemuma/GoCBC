#!/bin/bash

echo "=== Testing Authentication ===" > /tmp/auth-test.txt
echo "" >> /tmp/auth-test.txt

# Test 1: Login with username/password
echo "1. Testing login with username/password..." >> /tmp/auth-test.txt
LOGIN1=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta","password":"password123"}')
echo "Response:" >> /tmp/auth-test.txt
echo "$LOGIN1" | jq . >> /tmp/auth-test.txt 2>&1
echo "" >> /tmp/auth-test.txt

# Test 2: Check what users exist in DB
echo "2. Checking users in database..." >> /tmp/auth-test.txt
docker exec cecbs-postgres psql -U cecbs_user -d cecbs -c "SELECT user_id, username, email, organization, role FROM users LIMIT 10;" >> /tmp/auth-test.txt 2>&1
echo "" >> /tmp/auth-test.txt

# Test 3: Try logging in with email instead
echo "3. Testing login with email..." >> /tmp/auth-test.txt
LOGIN2=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ecta@example.com","password":"password123"}')
echo "Response:" >> /tmp/auth-test.txt
echo "$LOGIN2" | jq . >> /tmp/auth-test.txt 2>&1
echo "" >> /tmp/auth-test.txt

# Test 4: Check the workflow test script's authentication
echo "4. How does the workflow script authenticate?" >> /tmp/auth-test.txt
grep -A 10 "Step 1: Authenticating" /home/guda/GoCBC/continue-workflow-from-existing.sh | head -20 >> /tmp/auth-test.txt

cat /tmp/auth-test.txt
