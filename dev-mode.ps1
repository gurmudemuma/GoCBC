#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start CECBS in development mode with separate terminals

.DESCRIPTION
    Opens multiple Windows Terminal tabs for development:
    - Tab 1: Backend API with hot-reload
    - Tab 2: Frontend UI with hot-reload
    - Tab 3: Docker logs viewer
    - Tab 4: System status monitor

.EXAMPLE
    .\dev-mode.ps1
#>

$ErrorActionPreference = "Stop"

# Colors
$COLOR_CYAN = "`e[36m"
$COLOR_GREEN = "`e[32m"
$COLOR_YELLOW = "`e[33m"
$COLOR_BOLD = "`e[1m"
$COLOR_RESET = "`e[0m"

Write-Host ""
Write-Host "${COLOR_CYAN}${COLOR_BOLD}Starting CECBS Development Environment${COLOR_RESET}"
Write-Host ""

# Check if Windows Terminal is installed
$wtInstalled = Get-Command "wt.exe" -ErrorAction SilentlyContinue

if (-not $wtInstalled) {
    Write-Host "${COLOR_YELLOW}Windows Terminal not found. Starting services in current terminal...${COLOR_RESET}"
    Write-Host ""
    Write-Host "Install Windows Terminal for better experience:"
    Write-Host "  https://aka.ms/terminal"
    Write-Host ""
    
    # Fallback: Start in current terminal
    Write-Host "Starting blockchain infrastructure first..."
    .\start-all.ps1 -SkipBuild
    
    Write-Host ""
    Write-Host "${COLOR_GREEN}Infrastructure started!${COLOR_RESET}"
    Write-Host ""
    Write-Host "Now open separate terminals and run:"
    Write-Host "  Terminal 1: ${COLOR_CYAN}cd api && npm run dev${COLOR_RESET}"
    Write-Host "  Terminal 2: ${COLOR_CYAN}cd ui && npm run dev${COLOR_RESET}"
    Write-Host ""
    
    exit 0
}

# Get project root
$projectRoot = $PSScriptRoot

Write-Host "${COLOR_GREEN}✓${COLOR_RESET} Windows Terminal detected"
Write-Host ""

# First, start the infrastructure in the background
Write-Host "Step 1: Starting blockchain infrastructure..."
Write-Host "  (This will take about 60 seconds)"
Write-Host ""

# Start infrastructure in background job
$infraJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    & "$root\start-all.ps1" -SkipBuild 2>&1
} -ArgumentList $projectRoot

# Wait for infrastructure with progress
$elapsed = 0
$maxWait = 120
Write-Host "Waiting for infrastructure to start..." -NoNewline
while ($infraJob.State -eq "Running" -and $elapsed -lt $maxWait) {
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 5
    $elapsed += 5
}
Write-Host ""

if ($infraJob.State -eq "Failed") {
    Write-Host "${COLOR_YELLOW}⚠${COLOR_RESET} Infrastructure startup had issues. Check the output:"
    Receive-Job $infraJob
    Remove-Job $infraJob
    Write-Host ""
    Write-Host "You can still continue - opening development terminals..."
    Start-Sleep -Seconds 3
} else {
    Write-Host "${COLOR_GREEN}✓${COLOR_RESET} Infrastructure started"
    Remove-Job $infraJob -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Step 2: Opening development terminals..."
Write-Host ""

# Build Windows Terminal command
$wtCommand = @"
wt.exe --window 0 ``
new-tab --title "API Dev Server" --suppressApplicationTitle powershell -NoExit -Command "cd '$projectRoot\api'; Write-Host ''; Write-Host 'Backend API Development Server' -ForegroundColor Cyan; Write-Host '================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Starting with hot-reload...' -ForegroundColor Yellow; Write-Host ''; npm run dev" ``; ``
new-tab --title "UI Dev Server" --suppressApplicationTitle powershell -NoExit -Command "cd '$projectRoot\ui'; Write-Host ''; Write-Host 'Frontend UI Development Server' -ForegroundColor Cyan; Write-Host '===============================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Starting with hot-reload...' -ForegroundColor Yellow; Write-Host ''; npm run dev" ``; ``
new-tab --title "Docker Logs" --suppressApplicationTitle powershell -NoExit -Command "cd '$projectRoot'; Write-Host ''; Write-Host 'Docker Container Logs' -ForegroundColor Cyan; Write-Host '=====================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Watching all container logs...' -ForegroundColor Yellow; Write-Host ''; Start-Sleep -Seconds 2; docker-compose -f docker-compose-fabric.yml logs -f" ``; ``
new-tab --title "System Monitor" --suppressApplicationTitle powershell -NoExit -Command "cd '$projectRoot'; Write-Host ''; Write-Host 'CECBS System Monitor' -ForegroundColor Cyan; Write-Host '====================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Commands:' -ForegroundColor Yellow; Write-Host '  .\status.ps1          - Check system status'; Write-Host '  .\stop-all.ps1        - Stop all services'; Write-Host '  .\restart-all.ps1     - Restart services'; Write-Host ''; Write-Host 'Checking initial status...' -ForegroundColor Yellow; Write-Host ''; Start-Sleep -Seconds 3; .\status.ps1"
"@

# Execute the command
Invoke-Expression $wtCommand

Write-Host ""
Write-Host "${COLOR_GREEN}${COLOR_BOLD}✓ Development environment ready!${COLOR_RESET}"
Write-Host ""
Write-Host "${COLOR_CYAN}Opened 4 terminal tabs:${COLOR_RESET}"
Write-Host "  1. ${COLOR_GREEN}API Dev Server${COLOR_RESET}    - Backend with hot-reload"
Write-Host "  2. ${COLOR_GREEN}UI Dev Server${COLOR_RESET}     - Frontend with hot-reload"
Write-Host "  3. ${COLOR_GREEN}Docker Logs${COLOR_RESET}       - Container log viewer"
Write-Host "  4. ${COLOR_GREEN}System Monitor${COLOR_RESET}    - Status and controls"
Write-Host ""
Write-Host "${COLOR_CYAN}Access Points:${COLOR_RESET}"
Write-Host "  Frontend: ${COLOR_GREEN}http://localhost:3000${COLOR_RESET}"
Write-Host "  Backend:  ${COLOR_GREEN}http://localhost:3001${COLOR_RESET}"
Write-Host "  API Docs: ${COLOR_GREEN}http://localhost:3001/api-docs${COLOR_RESET}"
Write-Host ""
Write-Host "${COLOR_YELLOW}Pro Tips:${COLOR_RESET}"
Write-Host "  • API and UI will auto-reload on file changes"
Write-Host "  • Watch Docker Logs tab for blockchain events"
Write-Host "  • Use System Monitor tab to check status anytime"
Write-Host "  • Press Ctrl+C in any tab to stop that service"
Write-Host ""
Write-Host "Happy coding! 🚀"
Write-Host ""
