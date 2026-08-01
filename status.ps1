#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Check CECBS system status

.DESCRIPTION
    Displays the current status of all CECBS components
#>

$ErrorActionPreference = "SilentlyContinue"

# Colors
$COLOR_RESET = "`e[0m"
$COLOR_GREEN = "`e[32m"
$COLOR_RED = "`e[31m"
$COLOR_YELLOW = "`e[33m"
$COLOR_CYAN = "`e[36m"
$COLOR_BOLD = "`e[1m"

function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
        return $connection
    } catch {
        return $false
    }
}

function Get-StatusIcon {
    param([bool]$IsRunning)
    if ($IsRunning) {
        return "${COLOR_GREEN}●${COLOR_RESET}"
    } else {
        return "${COLOR_RED}○${COLOR_RESET}"
    }
}

Write-Host ""
Write-Host "${COLOR_CYAN}${COLOR_BOLD}CECBS System Status${COLOR_RESET}"
Write-Host "${COLOR_CYAN}══════════════════════════════════════${COLOR_RESET}"
Write-Host ""

# Check services
$services = @(
    @{Name="Frontend UI (Next.js)"; Port=3000; Url="http://localhost:3000"},
    @{Name="Backend API"; Port=3001; Url="http://localhost:3001/api/health"},
    @{Name="PostgreSQL"; Port=5432},
    @{Name="Redis"; Port=6379},
    @{Name="Orderer"; Port=7050},
    @{Name="Peer ECTA"; Port=7051},
    @{Name="Coffee Chaincode"; Port=9999}
)

Write-Host "${COLOR_BOLD}Service Status:${COLOR_RESET}"
foreach ($service in $services) {
    $isRunning = Test-Port -Port $service.Port
    $icon = Get-StatusIcon -IsRunning $isRunning
    $status = if ($isRunning) { "${COLOR_GREEN}Running${COLOR_RESET}" } else { "${COLOR_RED}Stopped${COLOR_RESET}" }
    
    Write-Host "$icon $($service.Name.PadRight(30)) $status"
    
    if ($isRunning -and $service.Url) {
        Write-Host "   └─ $($service.Url)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "${COLOR_BOLD}Docker Containers:${COLOR_RESET}"

$containers = docker ps --format "table {{.Names}}\t{{.Status}}" 2>$null

if ($containers) {
    $containers | Select-Object -Skip 1 | ForEach-Object {
        $parts = $_ -split "`t"
        $name = $parts[0]
        $status = $parts[1]
        
        if ($status -like "*Up*") {
            Write-Host "${COLOR_GREEN}●${COLOR_RESET} $name" -NoNewline
            Write-Host " - $status" -ForegroundColor DarkGray
        } else {
            Write-Host "${COLOR_YELLOW}◐${COLOR_RESET} $name" -NoNewline
            Write-Host " - $status" -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "${COLOR_RED}No Docker containers running${COLOR_RESET}"
}

Write-Host ""
Write-Host "${COLOR_BOLD}Node.js Processes:${COLOR_RESET}"
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "${COLOR_GREEN}● $($nodeProcesses.Count) Node.js process(es) running${COLOR_RESET}"
    $nodeProcesses | ForEach-Object {
        $memory = [math]::Round($_.WorkingSet64 / 1MB, 2)
        Write-Host "   └─ PID: $($_.Id) | Memory: ${memory}MB" -ForegroundColor DarkGray
    }
} else {
    Write-Host "${COLOR_RED}○ No Node.js processes running${COLOR_RESET}"
}

Write-Host ""
Write-Host "${COLOR_BOLD}Background Jobs:${COLOR_RESET}"
$jobs = Get-Job -ErrorAction SilentlyContinue
if ($jobs) {
    $jobs | ForEach-Object {
        $statusColor = switch ($_.State) {
            "Running" { $COLOR_GREEN }
            "Completed" { $COLOR_CYAN }
            "Failed" { $COLOR_RED }
            default { $COLOR_YELLOW }
        }
        Write-Host "${statusColor}● Job $($_.Id): $($_.Name) - $($_.State)${COLOR_RESET}"
    }
} else {
    Write-Host "${COLOR_YELLOW}No background jobs${COLOR_RESET}"
}

Write-Host ""
Write-Host "${COLOR_CYAN}══════════════════════════════════════${COLOR_RESET}"

# Overall status
$uiRunning = Test-Port -Port 3000
$apiRunning = Test-Port -Port 3001
$dbRunning = Test-Port -Port 5432

if ($uiRunning -and $apiRunning -and $dbRunning) {
    Write-Host ""
    Write-Host "${COLOR_GREEN}${COLOR_BOLD}✓ System is fully operational${COLOR_RESET}"
    Write-Host ""
    Write-Host "Access the system at: ${COLOR_CYAN}http://localhost:3000${COLOR_RESET}"
} elseif ($apiRunning -or $uiRunning -or $dbRunning) {
    Write-Host ""
    Write-Host "${COLOR_YELLOW}${COLOR_BOLD}⚠ System is partially running${COLOR_RESET}"
    Write-Host ""
    Write-Host "To start all services: ${COLOR_CYAN}.\start-all.ps1${COLOR_RESET}"
} else {
    Write-Host ""
    Write-Host "${COLOR_RED}${COLOR_BOLD}✗ System is not running${COLOR_RESET}"
    Write-Host ""
    Write-Host "To start the system: ${COLOR_CYAN}.\start-all.ps1${COLOR_RESET}"
}

Write-Host ""
