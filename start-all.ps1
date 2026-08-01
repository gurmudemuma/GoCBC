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
    Write-Header "🎉 CECBS System Started Successfully!"
    
    Write-Host ""
    Write-Host "${COLOR_BOLD}${COLOR_GREEN}Access Points:${COLOR_RESET}"
    Write-Host "  ${COLOR_CYAN}Frontend UI:${COLOR_RESET}     http://localhost:$UI_PORT"
    Write-Host "  ${COLOR_CYAN}Backend API:${COLOR_RESET}     http://localhost:$API_PORT"
    Write-Host "  ${COLOR_CYAN}API Docs:${COLOR_RESET}        http://localhost:$API_PORT/api-docs"
    Write-Host "  ${COLOR_CYAN}PostgreSQL:${COLOR_RESET}      localhost:$POSTGRES_PORT"
    Write-Host "  ${COLOR_CYAN}Redis:${COLOR_RESET}           localhost:$REDIS_PORT"
    Write-Host ""
    
    Write-Host "${COLOR_BOLD}${COLOR_GREEN}Default Login Credentials:${COLOR_RESET}"
    Write-Host "  ${COLOR_YELLOW}ECTA Admin:${COLOR_RESET}      ecta_admin / password123"
    Write-Host "  ${COLOR_YELLOW}NBE Officer:${COLOR_RESET}     nbe_admin / password123"
    Write-Host "  ${COLOR_YELLOW}Bank Officer:${COLOR_RESET}    bank_admin / password123"
    Write-Host "  ${COLOR_YELLOW}Customs Officer:${COLOR_RESET} customs_admin / password123"
    Write-Host "  ${COLOR_YELLOW}Exporter:${COLOR_RESET}        EXP1087072 / password123"
    Write-Host ""
    
    Write-Host "${COLOR_BOLD}${COLOR_GREEN}Useful Commands:${COLOR_RESET}"
    Write-Host "  ${COLOR_CYAN}View all containers:${COLOR_RESET}  docker ps"
    Write-Host "  ${COLOR_CYAN}View logs:${COLOR_RESET}            docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    Write-Host "  ${COLOR_CYAN}Stop system:${COLOR_RESET}          .\stop-all.ps1"
    Write-Host "  ${COLOR_CYAN}System status:${COLOR_RESET}        .\scripts\check-system-status.ps1"
    Write-Host ""
    
    Write-Host "${COLOR_BOLD}${COLOR_GREEN}Background Jobs:${COLOR_RESET}"
    Get-Job | Format-Table -AutoSize | Out-String | Write-Host
    
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
    
    Show-Summary
    
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
