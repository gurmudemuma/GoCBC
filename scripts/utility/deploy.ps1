#!/usr/bin/env pwsh
# CECBS - Complete Deployment Script
# Run: .\deploy.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CECBS Complete Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if docker is running
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if network is already running
$peers = docker ps --filter "name=peer" --format "{{.Names}}" | Measure-Object | Select-Object -ExpandProperty Count

if ($peers -gt 0) {
    Write-Host "✓ Blockchain network is already running ($peers peers)" -ForegroundColor Green
} else {
    Write-Host "Starting blockchain network..." -ForegroundColor Yellow
    Set-Location $ScriptDir
    docker-compose -f docker-compose-fabric.yml up -d
    Start-Sleep -Seconds 30
    Write-Host "✓ Blockchain network started" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  Start services: .\start-services.ps1" -ForegroundColor White
Write-Host "  Or manually:" -ForegroundColor White
Write-Host "    cd api && npm start" -ForegroundColor White
Write-Host "    cd ui && npm run dev" -ForegroundColor White
Write-Host ""
