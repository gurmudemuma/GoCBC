#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Restart CECBS system

.DESCRIPTION
    Stops and then starts all CECBS components

.PARAMETER KeepData
    Keep volumes and data during restart

.PARAMETER SkipBuild
    Skip building chaincode and npm packages

.PARAMETER DevMode
    Start in development mode

.EXAMPLE
    .\restart-all.ps1
    Full restart with clean state

.EXAMPLE
    .\restart-all.ps1 -KeepData -SkipBuild
    Quick restart keeping data
#>

param(
    [switch]$KeepData,
    [switch]$SkipBuild,
    [switch]$DevMode
)

Write-Host ""
Write-Host "🔄 Restarting CECBS System..." -ForegroundColor Cyan
Write-Host ""

# Stop everything
if ($KeepData) {
    & .\stop-all.ps1 -KeepData
} else {
    & .\stop-all.ps1
}

Write-Host ""
Write-Host "Waiting 5 seconds before restart..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start everything
$startParams = @()
if ($SkipBuild) { $startParams += "-SkipBuild" }
if ($DevMode) { $startParams += "-DevMode" }

& .\start-all.ps1 @startParams
