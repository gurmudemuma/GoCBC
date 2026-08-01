#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete shutdown script for CECBS (Coffee Export Consortium Blockchain System)

.DESCRIPTION
    This script stops all components of the CECBS system:
    1. Frontend UI (Next.js)
    2. Backend API (Node.js)
    3. Hyperledger Fabric Network (all containers)

.PARAMETER KeepData
    Keep volumes and data (don't remove with -v flag)

.EXAMPLE
    .\stop-all.ps1
    Stop everything and remove volumes

.EXAMPLE
    .\stop-all.ps1 -KeepData
    Stop everything but keep data volumes
#>

param(
    [switch]$KeepData
)

$ErrorActionPreference = "Stop"

# Colors
$COLOR_RESET = "`e[0m"
$COLOR_BOLD = "`e[1m"
$COLOR_RED = "`e[31m"
$COLOR_GREEN = "`e[32m"
$COLOR_YELLOW = "`e[33m"
$COLOR_BLUE = "`e[34m"
$COLOR_CYAN = "`e[36m"

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

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "${COLOR_YELLOW}⚠${COLOR_RESET} $Message"
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "${COLOR_RED}✗${COLOR_RESET} ${COLOR_RED}$Message${COLOR_RESET}"
}

Write-Header "Stopping CECBS System"

# Stop Node.js processes (API & UI)
Write-Step "Stopping Node.js processes (API & UI)..."
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Success "Stopped $($nodeProcesses.Count) Node.js process(es)"
    } else {
        Write-Warning-Custom "No Node.js processes found"
    }
} catch {
    Write-Warning-Custom "Error stopping Node.js processes: $($_.Exception.Message)"
}

# Stop PowerShell background jobs
Write-Step "Stopping background jobs..."
try {
    $jobs = Get-Job -ErrorAction SilentlyContinue
    if ($jobs) {
        $jobs | Stop-Job -ErrorAction SilentlyContinue
        $jobs | Remove-Job -ErrorAction SilentlyContinue
        Write-Success "Stopped $($jobs.Count) background job(s)"
    } else {
        Write-Warning-Custom "No background jobs found"
    }
} catch {
    Write-Warning-Custom "Error stopping background jobs: $($_.Exception.Message)"
}

# Stop Docker containers
Write-Step "Stopping Docker containers..."
try {
    if ($KeepData) {
        Write-Warning-Custom "Keeping data volumes (--KeepData flag)"
        docker-compose -f docker-compose-fabric.yml down
    } else {
        Write-Step "Removing containers and volumes..."
        docker-compose -f docker-compose-fabric.yml down -v
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker containers stopped"
    } else {
        Write-Error-Custom "Error stopping Docker containers"
    }
} catch {
    Write-Error-Custom "Error with Docker Compose: $($_.Exception.Message)"
}

# Show remaining containers (if any)
Write-Step "Checking for remaining containers..."
$remainingContainers = docker ps -a --filter "name=cecbs" --filter "name=coffee" --filter "name=peer" --filter "name=orderer" --filter "name=couchdb" --format "{{.Names}}"

if ($remainingContainers) {
    Write-Warning-Custom "Some containers are still running:"
    $remainingContainers | ForEach-Object { Write-Host "  - $_" }
    Write-Host ""
    $response = Read-Host "Force remove these containers? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        $remainingContainers | ForEach-Object {
            docker rm -f $_ 2>$null
        }
        Write-Success "Forced removal complete"
    }
} else {
    Write-Success "No CECBS containers running"
}

Write-Host ""
Write-Success "CECBS system stopped successfully!"
Write-Host ""

# Show summary
Write-Header "Summary"
Write-Host "${COLOR_GREEN}All services have been stopped.${COLOR_RESET}"
Write-Host ""
Write-Host "To start the system again, run:"
Write-Host "  ${COLOR_CYAN}.\start-all.ps1${COLOR_RESET}"
Write-Host ""

if (-not $KeepData) {
    Write-Warning-Custom "Note: Data volumes were removed. Database will be re-initialized on next start."
} else {
    Write-Host "${COLOR_GREEN}Data volumes were preserved.${COLOR_RESET}"
}
Write-Host ""
