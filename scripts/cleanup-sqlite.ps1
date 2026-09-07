# Cleanup Script - Remove SQLite Files and Old Scripts (PowerShell)
# Run: powershell scripts/cleanup-sqlite.ps1

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   CECBS SQLite Cleanup Script" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Confirm with user
$confirm = Read-Host "⚠️  This will delete all SQLite files and old scripts. Continue? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Starting cleanup..." -ForegroundColor Yellow
Write-Host ""

# Remove SQLite database files
Write-Host "📁 Removing SQLite database files..." -ForegroundColor Yellow

$dbFiles = Get-ChildItem -Path . -Recurse -Include "*.db","*.db.backup*" -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike "*\node_modules\*" }

foreach ($file in $dbFiles) {
    Write-Host "   🗑️  Deleting: $($file.FullName)" -ForegroundColor Gray
    Remove-Item -Path $file.FullName -Force
}

# Remove old SQLite scripts
Write-Host ""
Write-Host "📁 Removing old SQLite scripts..." -ForegroundColor Yellow

$oldScripts = @(
    "scripts\migrate-db.js",
    "scripts\check-admin-role.js",
    "scripts\add-admin-user.js",
    "scripts\update-old-applications.js",
    "api\scripts\add-bank-columns.js",
    "api\scripts\add-new-columns.js"
)

foreach ($script in $oldScripts) {
    if (Test-Path $script) {
        Write-Host "   🗑️  Deleting: $script" -ForegroundColor Gray
        Remove-Item -Path $script -Force
    } else {
        Write-Host "   ⏭️  Not found: $script" -ForegroundColor DarkGray
    }
}

# Check for SQLite npm packages
Write-Host ""
Write-Host "📦 Checking for SQLite npm packages..." -ForegroundColor Yellow
Push-Location -Path "api" -ErrorAction SilentlyContinue

# Check if sqlite3 is installed
$hasSqlite3 = $false
$hasBetterSqlite3 = $false

try {
    $packageJson = Get-Content "package.json" -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json
    if ($packageJson.dependencies.sqlite3) {
        $hasSqlite3 = $true
    }
    if ($packageJson.dependencies.'better-sqlite3') {
        $hasBetterSqlite3 = $true
    }
} catch {
    # Ignore errors
}

if ($hasSqlite3) {
    Write-Host "   🗑️  Uninstalling sqlite3..." -ForegroundColor Gray
    npm uninstall sqlite3 2>&1 | Out-Null
}

if ($hasBetterSqlite3) {
    Write-Host "   🗑️  Uninstalling better-sqlite3..." -ForegroundColor Gray
    npm uninstall better-sqlite3 2>&1 | Out-Null
}

Pop-Location

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ Cleanup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 What was removed:" -ForegroundColor White
Write-Host "   • All .db files (SQLite databases)" -ForegroundColor Gray
Write-Host "   • All .db.backup* files" -ForegroundColor Gray
Write-Host "   • Old SQLite migration scripts" -ForegroundColor Gray
Write-Host "   • SQLite npm packages" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Your system now uses:" -ForegroundColor White
Write-Host "   • PostgreSQL (off-chain data)" -ForegroundColor Green
Write-Host "   • Hyperledger Fabric + CouchDB (blockchain)" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Migration complete!" -ForegroundColor Cyan
Write-Host ""
