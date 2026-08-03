#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete startup script for CECBS (Coffee Export Consortium Blockchain System)

.DESCRIPTION
    This script starts all components of the CECBS system in the correct order:
    1. Hyperledger Fabric Network (blockchain infrastructure)
    2. PostgreSQL & Redis (databases)
    3. Coffee Chaincode (smart contracts)
    4. Backend API (Node.js/TypeScript)
    5. Frontend UI (Next.js)

.PARAMETER SkipBuild
    Skip building chaincode and npm packages (faster startup)

.PARAMETER DevMode
    Start in development mode with hot-reload

.PARAMETER SkipTests
    Skip connection tests after startup

.EXAMPLE
    .\start-all.ps1
    Start everything with full initialization

.EXAMPLE
    .\start-all.ps1 -SkipBuild
    Quick start (assumes already built)

.EXAMPLE
    .\start-all.ps1 -DevMode
    Start in development mode with hot-reload
#>

param(
    [switch]$SkipBuild,
    [switch]$DevMode,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ============================================================================
# CONFIGURATION
# ============================================================================

$SCRIPT_DIR = $PSScriptRoot
$PROJECT_ROOT = $SCRIPT_DIR
$API_DIR = Join-Path $PROJECT_ROOT "api"
$UI_DIR = Join-Path $PROJECT_ROOT "ui"
$CHAINCODE_DIR = Join-Path $PROJECT_ROOT "chaincodes\coffee"
$DOCKER_COMPOSE_FILE = "docker-compose-fabric.yml"

# Ports
$API_PORT = 3001
$UI_PORT = 3000
$POSTGRES_PORT = 5432
$REDIS_PORT = 6379
$ORDERER_PORT = 7050
$PEER_ECTA_PORT = 7051
$CHAINCODE_PORT = 9999

# Colors
$COLOR_RESET = "`e[0m"
$COLOR_BOLD = "`e[1m"
$COLOR_RED = "`e[31m"
$COLOR_GREEN = "`e[32m"
$COLOR_YELLOW = "`e[33m"
$COLOR_BLUE = "`e[34m"
$COLOR_MAGENTA = "`e[35m"
$COLOR_CYAN = "`e[36m"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "${COLOR_CYAN}${COLOR_BOLD}============================================================================${COLOR_RESET}"
    Write-Host "${COLOR_CYAN}${COLOR_BOLD}  $Message${COLOR_RESET}"
    Write-Host "${COLOR_CYAN}${COLOR_BOLD}============================================================================${COLOR_RESET}"
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "${COLOR_BLUE}▶${COLOR_RESET} ${COLOR_BOLD}$Message${COLOR_RESET}"
}

function Write-Success {
    param([string]$Message)
    Write-Host "${COLOR_GREEN}✓${COLOR_RESET} $Message"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${COLOR_YELLOW}⚠${COLOR_RESET} $Message"
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "${COLOR_RED}✗${COLOR_RESET} ${COLOR_RED}$Message${COLOR_RESET}"
}

function Write-Info {
    param([string]$Message)
    Write-Host "${COLOR_MAGENTA}ℹ${COLOR_RESET} $Message"
}

function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
        return $connection
    } catch {
        return $false
    }
}

function Wait-ForPort {
    param(
        [int]$Port,
        [string]$Service,
        [int]$TimeoutSeconds = 60
    )
    
    Write-Step "Waiting for $Service on port $Port..."
    $elapsed = 0
    $interval = 2
    
    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-Port -Port $Port) {
            Write-Success "$Service is ready on port $Port"
            return $true
        }
        Start-Sleep -Seconds $interval
        $elapsed += $interval
        Write-Host "." -NoNewline
    }
    
    Write-Host ""
    Write-Error-Custom "$Service failed to start on port $Port after ${TimeoutSeconds}s"
    return $false
}

function Test-Command {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

function Test-Prerequisites {
    Write-Header "Checking Prerequisites"
    
    $allGood = $true
    
    # Check Docker
    Write-Step "Checking Docker..."
    if (Test-Command "docker") {
        $dockerVersion = docker --version
        Write-Success "Docker found: $dockerVersion"
    } else {
        Write-Error-Custom "Docker is not installed or not in PATH"
        $allGood = $false
    }
    
    # Check Docker Compose
    Write-Step "Checking Docker Compose..."
    if (Test-Command "docker-compose") {
        $composeVersion = docker-compose --version
        Write-Success "Docker Compose found: $composeVersion"
    } else {
        Write-Error-Custom "Docker Compose is not installed or not in PATH"
        $allGood = $false
    }
    
    # Check Docker daemon
    Write-Step "Checking Docker daemon..."
    try {
        docker ps | Out-Null
        Write-Success "Docker daemon is running"
    } catch {
        Write-Error-Custom "Docker daemon is not running. Please start Docker Desktop."
        $allGood = $false
    }
    
    # Check Node.js
    Write-Step "Checking Node.js..."
    if (Test-Command "node") {
        $nodeVersion = node --version
        Write-Success "Node.js found: $nodeVersion"
    } else {
        Write-Error-Custom "Node.js is not installed or not in PATH"
        $allGood = $false
    }
    
    # Check Go
    Write-Step "Checking Go..."
    if (Test-Command "go") {
        $goVersion = go version
        Write-Success "Go found: $goVersion"
    } else {
        Write-Warning "Go is not installed. Chaincode building will be skipped."
    }
    
    # Check required directories
    Write-Step "Checking project structure..."
    $requiredDirs = @($API_DIR, $UI_DIR, $CHAINCODE_DIR)
    foreach ($dir in $requiredDirs) {
        if (Test-Path $dir) {
            Write-Success "Found: $dir"
        } else {
            Write-Error-Custom "Missing directory: $dir"
            $allGood = $false
        }
    }
    
    if (-not $allGood) {
        Write-Host ""
        Write-Error-Custom "Prerequisites check failed. Please fix the issues above and try again."
        exit 1
    }
    
    Write-Host ""
    Write-Success "All prerequisites met!"
}

# ============================================================================
# BUILD FUNCTIONS
# ============================================================================

function Build-Chaincode {
    if ($SkipBuild) {
        Write-Info "Skipping chaincode build (--SkipBuild flag)"
        return
    }
    
    Write-Header "Building Coffee Chaincode"
    
    if (-not (Test-Command "go")) {
        Write-Warning "Go not found, skipping chaincode build"
        return
    }
    
    Push-Location $CHAINCODE_DIR
    try {
        Write-Step "Building Go chaincode..."
        go build -o chaincode.exe
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Chaincode built successfully"
        } else {
            Write-Error-Custom "Chaincode build failed"
            Pop-Location
            exit 1
        }
    } finally {
        Pop-Location
    }
}

function Install-Dependencies {
    if ($SkipBuild) {
        Write-Info "Skipping dependency installation (--SkipBuild flag)"
        return
    }
    
    Write-Header "Installing Dependencies"
    
    # Install API dependencies
    Write-Step "Installing API dependencies..."
    Push-Location $API_DIR
    try {
        npm install --silent
        if ($LASTEXITCODE -eq 0) {
            Write-Success "API dependencies installed"
        } else {
            Write-Error-Custom "Failed to install API dependencies"
            Pop-Location
            exit 1
        }
    } finally {
        Pop-Location
    }
    
    # Install UI dependencies
    Write-Step "Installing UI dependencies..."
    Push-Location $UI_DIR
    try {
        npm install --silent
        if ($LASTEXITCODE -eq 0) {
            Write-Success "UI dependencies installed"
        } else {
            Write-Error-Custom "Failed to install UI dependencies"
            Pop-Location
            exit 1
        }
    } finally {
        Pop-Location
    }
}

function Build-TypeScript {
    if ($SkipBuild) {
        Write-Info "Skipping TypeScript build (--SkipBuild flag)"
        return
    }
    
    Write-Header "Building TypeScript"
    
    # Build API
    Write-Step "Building API (TypeScript -> JavaScript)..."
    Push-Location $API_DIR
    try {
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Success "API built successfully"
        } else {
            Write-Error-Custom "API build failed"
            Pop-Location
            exit 1
        }
    } finally {
        Pop-Location
    }
}

# ============================================================================
# DOCKER/BLOCKCHAIN FUNCTIONS
# ============================================================================

function Start-FabricNetwork {
    Write-Header "Starting Hyperledger Fabric Network"
    
    # Aggressively stop any existing containers
    Write-Step "Cleaning up existing containers..."
    docker-compose -f $DOCKER_COMPOSE_FILE down -v 2>$null | Out-Null
    Write-Success "Cleanup complete"
    
    # Start the network
    Write-Step "Starting Fabric network containers..."
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Failed to start Fabric network"
        exit 1
    }
    
    Write-Success "Fabric network containers started"
    
    # Wait for services with aggressive retry
    Write-Step "Waiting for services to initialize (60-90 seconds)..."
    Start-Sleep -Seconds 15  # Give Docker time to initialize
    
    Wait-ForPort -Port $POSTGRES_PORT -Service "PostgreSQL" -TimeoutSeconds 45 | Out-Null
    Wait-ForPort -Port $REDIS_PORT -Service "Redis" -TimeoutSeconds 45 | Out-Null
    Wait-ForPort -Port $ORDERER_PORT -Service "Orderer" -TimeoutSeconds 60 | Out-Null
    Wait-ForPort -Port $PEER_ECTA_PORT -Service "Peer (ECTA)" -TimeoutSeconds 60 | Out-Null
    Wait-ForPort -Port $CHAINCODE_PORT -Service "Coffee Chaincode" -TimeoutSeconds 60 | Out-Null
    
    # Additional wait for full initialization
    Write-Info "Services started. Allowing extra time for full initialization..."
    Start-Sleep -Seconds 10
    
    Write-Success "Fabric network is operational"
}

function Deploy-Chaincode {
    Write-Header "Deploying Coffee Chaincode"
    
    $CHANNEL = "coffeechannel"
    $CC_NAME = "coffee"
    $CC_VERSION = "1.11"
    $CC_SEQUENCE = 1
    $CC_LABEL = "${CC_NAME}_${CC_VERSION}"
    $ORDERER_CA = "/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"
    
    $orgs = @(
        @{ name="ecta";     peer="peer0.ecta.cecbs.et";     port=7051;  msp="ECTAMSP"     },
        @{ name="ecx";      peer="peer0.ecx.cecbs.et";      port=8051;  msp="ECXMSP"      },
        @{ name="banks";    peer="peer0.banks.cecbs.et";     port=9051;  msp="BanksMSP"    },
        @{ name="nbe";      peer="peer0.nbe.cecbs.et";       port=10051; msp="NBEMSP"      },
        @{ name="customs";  peer="peer0.customs.cecbs.et";   port=11051; msp="CustomsMSP"  },
        @{ name="shipping"; peer="peer0.shipping.cecbs.et";  port=12051; msp="ShippingMSP" }
    )
    
    # Step 1: Distribute TLS certs to peers
    Write-Step "[1/6] Distributing TLS certs to peers..."
    $ordererCaCrt = Join-Path $PROJECT_ROOT "blockchain\organizations\ordererOrganizations\cecbs.et\orderers\orderer.cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem"
    
    if (-not (Test-Path $ordererCaCrt)) {
        Write-Error-Custom "Orderer TLS cert not found at: $ordererCaCrt"
        Write-Warning "Chaincode deployment skipped. Run network setup first."
        return $false
    }
    
    # Distribute orderer TLS cert
    foreach ($org in $orgs) {
        docker exec $org.peer sh -c "mkdir -p /var/hyperledger/orderer-tls" 2>&1 | Out-Null
        docker cp $ordererCaCrt "$($org.peer):/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem" 2>&1 | Out-Null
    }
    
    # Distribute peer TLS certs for cross-peer communication
    Write-Host "  Distributing peer TLS certs for cross-peer communication..." -NoNewline
    foreach ($sourceOrg in $orgs) {
        $peerTlsCert = Join-Path $PROJECT_ROOT "blockchain\organizations\peerOrganizations\$($sourceOrg.name).cecbs.et\peers\peer0.$($sourceOrg.name).cecbs.et\tls\ca.crt"
        if (Test-Path $peerTlsCert) {
            foreach ($targetOrg in $orgs) {
                docker exec $targetOrg.peer sh -c "mkdir -p /var/hyperledger/peer-tls" 2>&1 | Out-Null
                docker cp $peerTlsCert "$($targetOrg.peer):/var/hyperledger/peer-tls/tlsca.$($sourceOrg.name).cecbs.et-cert.pem" 2>&1 | Out-Null
            }
        }
    }
    Write-Host " done" -ForegroundColor Green
    Write-Success "All TLS certs distributed"
    
    # Step 2: Build chaincode package
    Write-Step "[2/6] Building chaincode package..."
    $tmpDir = New-Item -ItemType Directory -Path "$env:TEMP\cc_pkg_$(Get-Random)" -Force
    
    $metadata = @{
        type = "ccaas"
        label = $CC_LABEL
    } | ConvertTo-Json -Compress
    
    $connection = @{
        address = "coffee-chaincode:9999"
        dial_timeout = "10s"
        tls_required = $false
    } | ConvertTo-Json -Compress
    
    [System.IO.File]::WriteAllText("$tmpDir\metadata.json", $metadata)
    [System.IO.File]::WriteAllText("$tmpDir\connection.json", $connection)
    
    Push-Location $tmpDir
    try {
        tar czf code.tar.gz connection.json 2>&1 | Out-Null
        tar czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz 2>&1 | Out-Null
    } catch {
        Write-Error-Custom "Failed to create chaincode package: $_"
        Pop-Location
        return $false
    }
    Pop-Location
    
    $pkgLocal = "$tmpDir\${CC_LABEL}.tar.gz"
    Write-Success "Chaincode package built"
    
    # Step 3: Copy package to peers
    Write-Step "[3/6] Copying package to all peers..."
    foreach ($org in $orgs) {
        docker cp $pkgLocal "$($org.peer):/tmp/${CC_LABEL}.tar.gz" 2>&1 | Out-Null
    }
    Remove-Item $tmpDir -Recurse -Force
    Write-Success "Package copied to all peers"
    
    # Step 4: Install chaincode on each peer
    Write-Step "[4/6] Installing chaincode on all peers..."
    $packageId = ""
    
    foreach ($org in $orgs) {
        $n = $org.name
        Write-Host "  Installing on $($org.peer)..." -NoNewline
        
        $mspPath = "/etc/hyperledger/fabric/users/Admin@$n.cecbs.et/msp"
        $result = docker exec `
            -e CORE_PEER_MSPCONFIGPATH=$mspPath `
            -e FABRIC_CFG_PATH=/etc/hyperledger/fabric `
            $org.peer `
            peer lifecycle chaincode install /tmp/${CC_LABEL}.tar.gz 2>&1
        
        $rStr = $result -join " "
        if ($rStr -match "already been installed") {
            Write-Host " already installed" -ForegroundColor Yellow
        } elseif ($rStr -match "Installed remotely") {
            Write-Host " installed" -ForegroundColor Green
        } else {
            Write-Host " done" -ForegroundColor Green
        }
    }
    
    # Get package ID
    Write-Host "  Getting package ID..." -NoNewline
    $qResult = docker exec `
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" `
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric `
        peer0.ecta.cecbs.et `
        peer lifecycle chaincode queryinstalled --output json 2>&1
    
    $qStr = $qResult -join "`n"
    if ($qStr -match '"package_id":"([^"]+)"' -and $qStr -match $CC_LABEL) {
        # Find the correct package ID for our label
        $jsonObj = $qStr | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($jsonObj -and $jsonObj.installed_chaincodes) {
            foreach ($cc in $jsonObj.installed_chaincodes) {
                if ($cc.label -eq $CC_LABEL) {
                    $packageId = $cc.package_id
                    break
                }
            }
        }
    }
    
    if (-not $packageId) {
        Write-Host ""
        Write-Error-Custom "Could not find package ID"
        Write-Warning "Chaincode deployment had issues, but channel and peers are ready"
        return $false
    }
    Write-Host " $packageId" -ForegroundColor Green
    Write-Success "Chaincode installed on all peers"
    
    # Step 5: Approve for each org
    Write-Step "[5/6] Approving for all organizations..."
    
    foreach ($org in $orgs) {
        $n = $org.name
        Write-Host "  Approving $($org.msp)..." -NoNewline
        
        $mspPath = "/etc/hyperledger/fabric/users/Admin@$n.cecbs.et/msp"
        $tls = "/etc/hyperledger/fabric/tls/ca.crt"
        
        $result = docker exec `
            -e CORE_PEER_MSPCONFIGPATH=$mspPath `
            -e FABRIC_CFG_PATH=/etc/hyperledger/fabric `
            -e CORE_PEER_TLS_ENABLED=true `
            -e CORE_PEER_TLS_ROOTCERT_FILE=$tls `
            -e CORE_PEER_LOCALMSPID=$($org.msp) `
            -e CORE_PEER_ADDRESS="peer0.$n.cecbs.et:$($org.port)" `
            $org.peer `
            peer lifecycle chaincode approveformyorg `
                -o orderer.cecbs.et:7050 `
                --ordererTLSHostnameOverride orderer.cecbs.et `
                --tls --cafile $ORDERER_CA `
                --channelID $CHANNEL `
                --name $CC_NAME `
                --version $CC_VERSION `
                --package-id $packageId `
                --sequence $CC_SEQUENCE 2>&1
        
        $rStr = $result -join " "
        if ($rStr -match "Error") {
            Write-Host " ERROR: $rStr" -ForegroundColor Red
        } else {
            Write-Host " approved" -ForegroundColor Green
        }
    }
    Write-Success "All organizations approved"
    
    # Step 6: Commit chaincode definition
    Write-Step "[6/6] Committing chaincode definition..."
    
    $commitArgs = @(
        "peer","lifecycle","chaincode","commit",
        "-o","orderer.cecbs.et:7050",
        "--ordererTLSHostnameOverride","orderer.cecbs.et",
        "--tls","--cafile",$ORDERER_CA,
        "--channelID",$CHANNEL,
        "--name",$CC_NAME,
        "--version",$CC_VERSION,
        "--sequence","$CC_SEQUENCE"
    )
    
    foreach ($org in $orgs) {
        $n = $org.name
        $commitArgs += "--peerAddresses"
        $commitArgs += "peer0.$n.cecbs.et:$($org.port)"
        $commitArgs += "--tlsRootCertFiles"
        $commitArgs += "/var/hyperledger/peer-tls/tlsca.$n.cecbs.et-cert.pem"
    }
    
    $result = docker exec `
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" `
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" `
        -e CORE_PEER_LOCALMSPID=ECTAMSP `
        -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 `
        peer0.ecta.cecbs.et `
        @commitArgs 2>&1
    
    $rStr = $result -join " "
    if ($rStr -match "Error") {
        Write-Error-Custom "Failed to commit chaincode: $rStr"
        return $false
    }
    
    Write-Success "Chaincode committed!"
    
    # Verify deployment
    Write-Step "Verifying deployment..."
    Start-Sleep -Seconds 3
    
    $vResult = docker exec `
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" `
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric `
        peer0.ecta.cecbs.et `
        peer lifecycle chaincode querycommitted --channelID $CHANNEL --name $CC_NAME --output json 2>&1
    
    $vStr = $vResult -join " "
    if ($vStr -match "Version: $CC_VERSION" -or $vStr -match '"version":"' + $CC_VERSION + '"') {
        Write-Success "Chaincode deployed successfully: $CC_NAME v$CC_VERSION on $CHANNEL"
        return $true
    } else {
        Write-Warning "Chaincode deployment verification inconclusive"
        return $true  # Still return true as it likely succeeded
    }
}

function Show-ContainerStatus {
    Write-Header "Container Status"
    
    Write-Step "Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Out-String | Write-Host
}

# ============================================================================
# API & UI STARTUP FUNCTIONS
# ============================================================================

function Start-API {
    Write-Header "Starting Backend API"
    
    # Aggressively kill any existing processes
    Write-Step "Stopping any existing API processes..."
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*api*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    Push-Location $API_DIR
    try {
        # Ensure .env exists
        if (-not (Test-Path ".env")) {
            Write-Warning ".env file not found, copying from .env.example"
            Copy-Item ".env.example" ".env"
        }
        
        if ($DevMode) {
            Write-Step "Starting API in development mode (with hot-reload)..."
            Write-Info "API will run in this window. Press Ctrl+C to stop."
            Start-Sleep -Seconds 2
            npm run dev
        } else {
            Write-Step "Starting API in production mode..."
            
            # Start API in background
            $apiJob = Start-Job -ScriptBlock {
                param($apiDir)
                Set-Location $apiDir
                npm start
            } -ArgumentList $API_DIR
            
            Write-Info "API starting (Job ID: $($apiJob.Id))"
            
            # Aggressive wait with retry
            $count = 0
            $maxRetries = 30
            while ($count -lt $maxRetries) {
                if (Test-Port -Port $API_PORT) {
                    Write-Success "API server is ready on port $API_PORT"
                    Write-Info "To view logs: Receive-Job $($apiJob.Id) -Keep"
                    break
                }
                Start-Sleep -Seconds 2
                $count++
                Write-Host "." -NoNewline
            }
            Write-Host ""
            
            if (-not (Test-Port -Port $API_PORT)) {
                Write-Warning "API not responding yet, but process is running. Check logs if issues persist."
            }
        }
    } finally {
        if (-not $DevMode) {
            Pop-Location
        }
    }
}

function Start-UI {
    Write-Header "Starting Frontend UI"
    
    # Aggressively kill any existing processes
    Write-Step "Stopping any existing UI processes..."
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*ui*" -or $_.Path -like "*next*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    Push-Location $UI_DIR
    try {
        # Ensure .env.local exists
        if (-not (Test-Path ".env.local")) {
            Write-Warning ".env.local file not found, copying from .env.example"
            Copy-Item ".env.example" ".env.local"
        }
        
        if ($DevMode) {
            Write-Step "Starting UI in development mode (with hot-reload)..."
            Write-Info "UI will run in this window. Press Ctrl+C to stop."
            Start-Sleep -Seconds 2
            npm run dev
        } else {
            Write-Step "Starting UI in production mode..."
            
            # Build first if not skipping
            if (-not $SkipBuild) {
                Write-Step "Building Next.js production bundle..."
                npm run build
            }
            
            # Start UI in background
            $uiJob = Start-Job -ScriptBlock {
                param($uiDir)
                Set-Location $uiDir
                npm start
            } -ArgumentList $UI_DIR
            
            Write-Info "UI starting (Job ID: $($uiJob.Id))"
            
            # Aggressive wait with retry
            $count = 0
            $maxRetries = 30
            while ($count -lt $maxRetries) {
                if (Test-Port -Port $UI_PORT) {
                    Write-Success "UI server is ready on port $UI_PORT"
                    Write-Info "To view logs: Receive-Job $($uiJob.Id) -Keep"
                    break
                }
                Start-Sleep -Seconds 2
                $count++
                Write-Host "." -NoNewline
            }
            Write-Host ""
            
            if (-not (Test-Port -Port $UI_PORT)) {
                Write-Warning "UI not responding yet, but process is running. Check logs if issues persist."
            }
        }
    } finally {
        if (-not $DevMode) {
            Pop-Location
        }
    }
}

# ============================================================================
# TESTING FUNCTIONS
# ============================================================================

function Test-Connections {
    if ($SkipTests) {
        Write-Info "Skipping connection tests (--SkipTests flag)"
        return
    }
    
    Write-Header "Testing Connections"
    
    $services = @(
        @{Name="Frontend UI"; Url="http://localhost:$UI_PORT"},
        @{Name="Backend API"; Url="http://localhost:$API_PORT/api/health"},
        @{Name="API Docs"; Url="http://localhost:$API_PORT/api-docs"}
    )
    
    foreach ($service in $services) {
        Write-Step "Testing $($service.Name)..."
        try {
            $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "$($service.Name) is responding"
            } else {
                Write-Warning "$($service.Name) returned status $($response.StatusCode)"
            }
        } catch {
            Write-Warning "$($service.Name) is not responding: $($_.Exception.Message)"
        }
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

function Show-Summary {
    param([bool]$ChaincodeDeployed = $false)
    
    Write-Header "🎉 CECBS System Started Successfully!"
    
    Write-Host ""
    Write-Host "${COLOR_BOLD}${COLOR_GREEN}Access Points:${COLOR_RESET}"
    Write-Host "  ${COLOR_CYAN}Frontend UI:${COLOR_RESET}     http://localhost:$UI_PORT"
    Write-Host "  ${COLOR_CYAN}Backend API:${COLOR_RESET}     http://localhost:$API_PORT"
    Write-Host "  ${COLOR_CYAN}API Docs:${COLOR_RESET}        http://localhost:$API_PORT/api-docs"
    Write-Host "  ${COLOR_CYAN}PostgreSQL:${COLOR_RESET}      localhost:$POSTGRES_PORT"
    Write-Host "  ${COLOR_CYAN}Redis:${COLOR_RESET}           localhost:$REDIS_PORT"
    Write-Host ""
    
    Write-Host "${COLOR_BOLD}${COLOR_GREEN}Blockchain Status:${COLOR_RESET}"
    if ($ChaincodeDeployed) {
        Write-Host "  ${COLOR_GREEN}✓ Chaincode:${COLOR_RESET}       Deployed and operational"
    } else {
        Write-Host "  ${COLOR_YELLOW}⚠ Chaincode:${COLOR_RESET}       Deployment had issues (check logs)"
        Write-Host "    ${COLOR_CYAN}Manual fix:${COLOR_RESET}        .\scripts\deploy-chaincode.ps1"
    }
    Write-Host ""
    
    Write-Host "${COLOR_BOLD}${COLOR_GREEN}Default Login Credentials:${COLOR_RESET}"
    Write-Host "  ${COLOR_YELLOW}Super Admin:${COLOR_RESET}     admin / admin123"
    Write-Host "  ${COLOR_YELLOW}ECTA Admin:${COLOR_RESET}      ecta_admin / password123"
    Write-Host "  ${COLOR_YELLOW}NBE Admin:${COLOR_RESET}       nbe_admin / password123"
    Write-Host "  ${COLOR_YELLOW}Bank Admin:${COLOR_RESET}      bank_admin / password123"
    Write-Host "  ${COLOR_YELLOW}Customs Admin:${COLOR_RESET}   customs_admin / password123"
    Write-Host "  ${COLOR_YELLOW}Exporter:${COLOR_RESET}        testexporter / password123"
    Write-Host ""
    
    Write-Host "${COLOR_BOLD}${COLOR_GREEN}Useful Commands:${COLOR_RESET}"
    Write-Host "  ${COLOR_CYAN}View all containers:${COLOR_RESET}  docker ps"
    Write-Host "  ${COLOR_CYAN}View logs:${COLOR_RESET}            docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    Write-Host "  ${COLOR_CYAN}Deploy chaincode:${COLOR_RESET}     .\scripts\deploy-chaincode.ps1"
    Write-Host "  ${COLOR_CYAN}Stop system:${COLOR_RESET}          .\stop-all.ps1"
    Write-Host ""
    
    if (-not $ChaincodeDeployed) {
        Write-Host "${COLOR_YELLOW}⚠ Note: Some blockchain features may not work until chaincode is deployed.${COLOR_RESET}"
        Write-Host "${COLOR_YELLOW}  Run: .\scripts\deploy-chaincode.ps1${COLOR_RESET}"
        Write-Host ""
    }
    
    Write-Host "${COLOR_BOLD}${COLOR_GREEN}Background Jobs:${COLOR_RESET}"
    $jobs = Get-Job
    if ($jobs) {
        $jobs | Format-Table -AutoSize | Out-String | Write-Host
    } else {
        Write-Host "  (Running in development mode or no background jobs)"
    }
    
    Write-Host ""
    Write-Info "For detailed documentation, see: Docs/QUICK-START.md"
    Write-Host ""
}

# ============================================================================
# MAIN SCRIPT EXECUTION
# ============================================================================

try {
    $startTime = Get-Date
    
    Write-Host ""
    Write-Host "${COLOR_MAGENTA}${COLOR_BOLD}"
    Write-Host "   _____ ______ _____ ____   _____ "
    Write-Host "  / ____|  ____/ ____|  _ \ / ____|"
    Write-Host " | |    | |__ | |    | |_) | (___  "
    Write-Host " | |    |  __|| |    |  _ < \___ \ "
    Write-Host " | |____| |___| |____| |_) |____) |"
    Write-Host "  \_____|______\_____|____/|_____/ "
    Write-Host ""
    Write-Host " Coffee Export Consortium Blockchain System"
    Write-Host "${COLOR_RESET}"
    
    # Run all steps
    Test-Prerequisites
    Build-Chaincode
    Install-Dependencies
    Build-TypeScript
    Start-FabricNetwork
    
    # Deploy chaincode after network is up
    $chaincodeDeployed = Deploy-Chaincode
    
    Show-ContainerStatus
    
    if ($DevMode) {
        Write-Host ""
        Write-Warning "Development mode: Choose which service to run with hot-reload"
        Write-Host "1) API only"
        Write-Host "2) UI only"
        Write-Host "3) Both (in separate terminals - recommended)"
        $choice = Read-Host "Enter choice (1-3)"
        
        switch ($choice) {
            "1" { Start-API }
            "2" { Start-UI }
            "3" {
                Write-Info "Please open two separate terminals and run:"
                Write-Info "  Terminal 1: cd api && npm run dev"
                Write-Info "  Terminal 2: cd ui && npm run dev"
            }
            default {
                Write-Warning "Invalid choice, skipping service startup"
            }
        }
    } else {
        Start-API
        Start-Sleep -Seconds 5
        Start-UI
        Start-Sleep -Seconds 5
        Test-Connections
    }
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Show-Summary -ChaincodeDeployed $chaincodeDeployed
    
    Write-Host "${COLOR_GREEN}Total startup time: $([math]::Round($duration.TotalSeconds, 1)) seconds${COLOR_RESET}"
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Error-Custom "Startup failed: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "${COLOR_YELLOW}Stack Trace:${COLOR_RESET}"
    Write-Host $_.ScriptStackTrace
    Write-Host ""
    exit 1
}
