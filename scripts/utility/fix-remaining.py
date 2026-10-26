#!/usr/bin/env python3
"""Fix remaining TypeScript errors"""

import re
import os

def add_api_import(filepath):
    """Add apiFetch import if missing"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'apiFetch' in content and "from '@/config/api.config'" not in content:
        # Find where to add import (after other imports)
        import_pattern = r"(import.*from '@/[^']+';)"
        matches = list(re.finditer(import_pattern, content))
        if matches:
            last_match = matches[-1]
            pos = last_match.end()
            content = content[:pos] + "\nimport { apiFetch, getAuthHeaders } from '@/config/api.config';" + content[pos:]
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    return False

def add_status_type(filepath):
    """Add StatusType if missing"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'StatusType' in content and 'type StatusType' not in content:
        # Add after imports
        interface_pos = content.find('interface ')
        if interface_pos > 0:
            type_def = "\n// Status type for chips\ntype StatusType = string;\n\n"
            content = content[:interface_pos] + type_def + content[interface_pos:]
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    return False

def fix_declaration_type(filepath):
    """Fix: e.target.value as any in CustomsPortal"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix: onChange={(e) => setForm({ ...form, declarationType: e.target.value })}
    pattern = r"declarationType: e\.target\.value\)"
    if re.search(pattern, content):
        # Add type assertion
        content = re.sub(
            r"declarationType: e\.target\.value\)",
            r"declarationType: e.target.value as 'STANDARD' | 'SIMPLIFIED' | 'EUDR_ENHANCED')"
            , content
        )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def fix_transport_mode_selector(filepath):
    """Fix transport mode selector type issue"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix: value={inspectionForm.transportMode}  should be  value={inspectionForm.transportMode || 'SEA'}
    pattern = r'<Select\s+value=\{inspectionForm\.transportMode\}'
    if re.search(pattern, content):
        content = re.sub(
            r'value=\{inspectionForm\.transportMode\}',
            r"value={inspectionForm.transportMode || 'SEA'}",
            content
        )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Files to fix
files = [
    ('c:/goCBC/ui/src/components/portals/PaymentInitiationDialog.tsx', add_api_import),
    ('c:/goCBC/ui/src/components/portals/CustomsInspection.tsx', add_status_type),
    ('c:/goCBC/ui/src/components/portals/PaymentDocuments.tsx', add_status_type),
    ('c:/goCBC/ui/src/components/portals/ShippingPortal.tsx', add_status_type),
    ('c:/goCBC/ui/src/components/portals/CustomsPortal.tsx', fix_declaration_type),
    ('c:/goCBC/ui/src/components/portals/QualityInspectionWorkflow.tsx', fix_transport_mode_selector),
]

print("Fixing remaining errors...")
for filepath, fix_func in files:
    if os.path.exists(filepath):
        if fix_func(filepath):
            print(f"✓ Fixed: {filepath}")
        else:
            print(f"- No changes: {filepath}")
    else:
        print(f"✗ Not found: {filepath}")

print("\nDone!")
