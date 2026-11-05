#!/usr/bin/env python3
import http.client
import json
import sys

try:
    print("Connecting to localhost:3001...")
    conn = http.client.HTTPConnection('localhost', 3001, timeout=10)
    
    payload = json.dumps({'username': 'admin', 'password': 'admin123'})
    headers = {'Content-Type': 'application/json'}
    
    print("Sending POST request to /api/v1/auth/login...")
    conn.request('POST', '/api/v1/auth/login', payload, headers)
    
    print("Getting response...")
    response = conn.getresponse()
    
    print(f"\n✅ Status: {response.status} {response.reason}")
    
    body = response.read().decode('utf-8')
    print(f"\n📄 Response Body:")
    
    try:
        parsed = json.loads(body)
        print(json.dumps(parsed, indent=2))
        
        if parsed.get('success'):
            print("\n✅ ✅ ✅ LOGIN SUCCESSFUL! ✅ ✅ ✅")
            print(f"\nToken: {parsed['data']['token'][:50]}...")
            print(f"User: {parsed['data']['user']['username']}")
            print(f"Role: {parsed['data']['user']['role']}")
        else:
            print(f"\n❌ Login failed: {parsed.get('error', {}).get('message')}")
    except:
        print(body)
        
except Exception as e:
    print(f"\n❌ Error: {type(e).__name__}: {e}")
    sys.exit(1)
finally:
    try:
        conn.close()
    except:
        pass
