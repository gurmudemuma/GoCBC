Start-Process -FilePath "C:\goCBC\scripts\run-upgrade.bat" -Wait -NoNewWindow
Start-Sleep 3
Get-Content "C:\goCBC\scripts\upgrade-out.txt"
