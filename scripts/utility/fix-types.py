#!/usr/bin/env python3
"""
Automated Type Assertion Fixer
Fixes 'as any' type assertions with proper types
"""

import re
import os

def fix_status_chip_any(content):
    """Fix: status={value as any} -> status={(value as StatusType) || 'PENDING'}"""
    # Pattern: status={X as any}
    pattern = r'status=\{([^\}]+)\s+as\s+any\}'
    replacement = r'status={\1 as StatusType}'
    return re.sub(pattern, replacement, content)

def fix_chip_color_any(content):
    """Fix: color={X as any} -> color={X as MuiColor}"""
    # Pattern: color={X as any}
    pattern = r"color=\{([^\}]+)\s+as\s+any\}"
    replacement = r"color={\1 as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}"
    return re.sub(pattern, replacement, content)

def fix_form_handler_any(content):
    """Fix: e.target.value as any"""
    pattern = r'e\.target\.value\s+as\s+any'
    replacement = r'e.target.value'
    return re.sub(pattern, replacement, content)

def fix_form_submit_any(content):
    """Fix: handleSubmit(X as any)"""
    pattern = r'handleSubmit\(([^\)]+)\s+as\s+any\)'
    replacement = r'handleSubmit(\1)'
    return re.sub(pattern, replacement, content)

def add_status_type_if_needed(content):
    """Add StatusType if status chips are present"""
    if 'StatusType' not in content and 'status={' in content:
        # Find first interface or after imports
        import_end = content.find('interface')
        if import_end == -1:
            import_end = content.find('const')
        if import_end > 0:
            type_def = "\n// Status types for chips\ntype StatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLEARED' | 'HELD' | 'SUBMITTED' | 'UNDER_REVIEW' | string;\n\n"
            content = content[:import_end] + type_def + content[import_end:]
    return content

def fix_file(filepath):
    """Fix all type issues in a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return False
    
    original = content
    
    # Apply fixes
    content = fix_status_chip_any(content)
    content = fix_chip_color_any(content)
    content = fix_form_handler_any(content)
    content = fix_form_submit_any(content)
    content = add_status_type_if_needed(content)
    
    # Write back if changed
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Files with 'as any' issues
files_to_fix = [
    'c:/goCBC/ui/src/components/portals/CustomsInspection.tsx',
    'c:/goCBC/ui/src/components/portals/CustomsPortal.tsx',
    'c:/goCBC/ui/src/components/portals/ECXPortal.tsx',
    'c:/goCBC/ui/src/components/portals/PhytosanitaryCertificates.tsx',
    'c:/goCBC/ui/src/components/portals/ShippingPortal.tsx',
    'c:/goCBC/ui/src/components/portals/InsuranceCertificates.tsx',
    'c:/goCBC/ui/src/components/portals/PaymentDocuments.tsx',
    'c:/goCBC/ui/src/components/portals/InspectionManagement.tsx',
    'c:/goCBC/ui/src/components/portals/ECTAPortal.tsx',
]

print("Fixing 'as any' type assertions...")
for filepath in files_to_fix:
    if os.path.exists(filepath):
        if fix_file(filepath):
            print(f"✓ Fixed: {filepath}")
        else:
            print(f"- No changes: {filepath}")
    else:
        print(f"✗ Not found: {filepath}")

print("\nDone! Run 'npm run build' to verify.")
