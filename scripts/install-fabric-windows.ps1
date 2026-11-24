# PowerShell script to install Hyperledger Fabric binaries on Windows

$FABRIC_VERSION = "2.5.4"
$CA_VERSION = "1.5.7"

Write-Host "Installing Hyperledger Fabric binaries for Windows..." -ForegroundColor Green

# Create bin directory
New-Item -ItemType Directory -Force -Path "bin" | Out-Null

# Download Fabric binaries
Write-Host "Downloading Fabric binaries v$FABRIC_VERSION..." -ForegroundColor Yellow
$fabricUrl = "https://github.com/hyperledger/fabric/releases/download/v$FABRIC_VERSION/hyperledger-fabric-windows-amd64-$FABRIC_VERSION.tar.gz"
Invoke-WebRequest -Uri $fabricUrl -OutFile "fabric.tar.gz"

# Download Fabric CA binaries
Write-Host "Downloading Fabric CA binaries v$CA_VERSION..." -ForegroundColor Yellow
$caUrl = "https://github.com/hyperledger/fabric-ca/releases/download/v$CA_VERSION/hyperledger-fabric-ca-windows-amd64-$CA_VERSION.tar.gz"
Invoke-WebRequest -Uri $caUrl -OutFile "fabric-ca.tar.gz"

# Extract using tar (available in Windows 10+)
Write-Host "Extracting binaries..." -ForegroundColor Yellow
tar -xzf fabric.tar.gz
tar -xzf fabric-ca.tar.gz

# Clean up
Remove-Item fabric.tar.gz
Remove-Item fabric-ca.tar.gz

Write-Host ""
Write-Host "Fabric binaries installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Binaries location: $PWD\bin" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add to PATH by running:" -ForegroundColor Yellow
Write-Host "  `$env:Path += `";$PWD\bin`"" -ForegroundColor White
Write-Host ""
Write-Host "Or permanently add to PATH:" -ForegroundColor Yellow
Write-Host "  [Environment]::SetEnvironmentVariable('Path', `$env:Path + ';$PWD\bin', 'User')" -ForegroundColor White
Write-Host ""
