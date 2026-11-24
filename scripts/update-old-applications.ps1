# PowerShell script to update old approved applications
# Updates applications with missing license numbers and expiry dates

Write-Host "🔄 Starting database migration..." -ForegroundColor Cyan
Write-Host "📁 Database: api/cecbs.db" -ForegroundColor Gray

# Define SQL queries
$checkQuery = @"
SELECT application_id, company_name, exporter_id, approved_at 
FROM exporter_applications 
WHERE status = 'approved' 
AND (ecta_license_number IS NULL OR ecta_license_number = '')
"@

# Generate license number function
function Get-LicenseNumber {
    param([int]$Index)
    $year = Get-Date -Format "yyyy"
    $num = $Index.ToString().PadLeft(3, '0')
    return "ECTA-LIC-$year-$num"
}

# Generate expiry date (1 year from now)
function Get-ExpiryDate {
    $date = (Get-Date).AddYears(1)
    return $date.ToString("yyyy-MM-dd")
}

Write-Host "`n📊 Applications that need updating:" -ForegroundColor Yellow
Write-Host "Run this SQL in your database tool to view:" -ForegroundColor Gray
Write-Host $checkQuery -ForegroundColor White

Write-Host "`n📝 To update the applications, run these SQL commands:" -ForegroundColor Yellow

# Generate update commands for first 10 records
for ($i = 1; $i -le 10; $i++) {
    $license = Get-LicenseNumber -Index $i
    $expiry = Get-ExpiryDate
    
    $updateQuery = @"
UPDATE exporter_applications 
SET ecta_license_number = '$license',
    license_expiry_date = '$expiry',
    exporter_type = COALESCE(exporter_type, 'private')
WHERE status = 'approved' 
AND (ecta_license_number IS NULL OR ecta_license_number = '')
AND rowid = (
    SELECT rowid FROM exporter_applications 
    WHERE status = 'approved' 
    AND (ecta_license_number IS NULL OR ecta_license_number = '')
    LIMIT 1 OFFSET $($i-1)
);
"@
    
    Write-Host "`n-- Update Application #$i" -ForegroundColor Green
    Write-Host $updateQuery -ForegroundColor White
}

Write-Host "`n✅ SQL commands generated!" -ForegroundColor Green
Write-Host "📋 Copy these commands and run them in DB Browser for SQLite or similar tool" -ForegroundColor Cyan
Write-Host "📁 Database location: $PWD\api\cecbs.db" -ForegroundColor Gray
