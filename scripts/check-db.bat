@echo off
"C:\Program Files\Git\bin\bash.exe" -c "sqlite3 C:/goCBC/api/cecbs.db '.schema users'" > C:\goCBC\scripts\db-out.txt 2>&1
"C:\Program Files\Git\bin\bash.exe" -c "sqlite3 C:/goCBC/api/cecbs.db '.schema exporter_applications'" >> C:\goCBC\scripts\db-out.txt 2>&1
