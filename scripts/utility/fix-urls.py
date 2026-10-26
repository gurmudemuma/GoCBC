#!/usr/bin/env python3
"""
Automated URL Fixer
Replaces hardcoded localhost URLs with apiFetch calls
"""

import re
import os

def fix_file(filepath):
    """Fix URLs in a single file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Pattern 1: fetch('http://localhost:3001/api/v1/XXX', { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }})
    # Replace with: apiFetch('/XXX')
    pattern1 = r"fetch\('http://localhost:3001/api/v1/([^']+)',\s*\{\s*method:\s*'GET',\s*headers:\s*\{\s*'Authorization':\s*`Bearer\s*\$\{token\}`\s*\}\s*\}\)"
    content = re.sub(pattern1, r"apiFetch('/\1')", content)
    
    # Pattern 2: fetch(`http://localhost:3001/api/v1/XXX`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }})
    pattern2 = r'fetch\(`http://localhost:3001/api/v1/([^`]+)`,\s*\{\s*method:\s*\'GET\',\s*headers:\s*\{\s*\'Authorization\':\s*`Bearer\s*\$\{token\}`\s*\}\s*\}\)'
    content = re.sub(pattern2, r"apiFetch('/\1')", content)
    
    # Pattern 3: fetch('http://localhost:3001/api/v1/XXX', { method: 'POST', ...
    pattern3 = r"fetch\('http://localhost:3001/api/v1/([^']+)',\s*\{"
    content = re.sub(pattern3, r"apiFetch('/\1', {", content)
    
    # Pattern 4: fetch(`http://localhost:3001/api/v1/XXX`, { method: 'POST', ...
    pattern4 = r'fetch\(`http://localhost:3001/api/v1/([^`]+)`,\s*\{'
    content = re.sub(pattern4, r"apiFetch('/\1', {", content)
    
    # Check if import needs to be added
    if content != original and 'apiFetch' not in original:
        # Find import section and add
        import_pattern = r"(import.*from '@/utils/api';)"
        if re.search(import_pattern, content):
            content = re.sub(
                import_pattern,
                r"\1\nimport { apiFetch, getAuthHeaders } from '@/config/api.config';",
                content
            )
    
    # Write back if changed
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Files to fix - ALL portal files
files_to_fix = [
    'c:/goCBC/ui/src/components/portals/AnalyticsDashboard.tsx',
    'c:/goCBC/ui/src/components/portals/BanksPortal.tsx',
    'c:/goCBC/ui/src/components/portals/CustomsClearedShipments.tsx',
    'c:/goCBC/ui/src/components/portals/CustomsPortal.tsx',
    'c:/goCBC/ui/src/components/portals/CustomsInspection.tsx',
    'c:/goCBC/ui/src/components/portals/ECTAPortal.tsx',
    'c:/goCBC/ui/src/components/portals/ExporterPortal.tsx',
    'c:/goCBC/ui/src/components/portals/ShippingPortal.tsx',
    'c:/goCBC/ui/src/components/portals/PaymentInitiationDialog.tsx',
    'c:/goCBC/ui/src/components/portals/DocumentUploadDialog.tsx',
]

print("Fixing hardcoded URLs...")
for filepath in files_to_fix:
    if os.path.exists(filepath):
        if fix_file(filepath):
            print(f"✓ Fixed: {filepath}")
        else:
            print(f"- No changes: {filepath}")
    else:
        print(f"✗ Not found: {filepath}")

print("\nDone! Run 'npm run build' to verify.")
