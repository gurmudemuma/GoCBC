#!/usr/bin/env pwsh
# Quick script to start ONLY the UI (for debugging)

$ErrorActionPreference = "Stop"
$UI_DIR = Join-Path $PSScriptRoot "ui"
$UI_PORT = 3000

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting UI Only (Debug Mode)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes on port 3000
Write-Host "▶ Clearing port 3000..." -ForegroundColor Blue
try {
    $port3000Process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($port3000Process) {
        foreach ($pid in $port3000Process) {
            Write-Host "  Killing process $pid..." -NoNewline
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host " done" -ForegroundColor Green
        }
    } else {
        Write-Host "  Port 3000 is free" -ForegroundColor Green
    }
} catch {
    Write-Host "  Port check skipped" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# Clean Next.js cache
$nextCache = Join-Path $UI_DIR ".next"
if (Test-Path $nextCache) {
    Write-Host "▶ Cleaning Next.js cache..." -ForegroundColor Blue
    Remove-Item $nextCache -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Cache cleaned" -ForegroundColor Green
}

# Navigate to UI directory
Set-Location $UI_DIR

# Ensure .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠ .env.local not found, copying from .env.example" -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
}

Write-Host ""
Write-Host "▶ Starting Next.js dev server..." -ForegroundColor Blue
Write-Host "  URL: http://localhost:$UI_PORT" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start the dev server
npm run dev
