@echo off
REM Check PostgreSQL Database
set PGPASSWORD=cecbs123
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U cecbs -d cecbs -c "SELECT COUNT(*) as user_count FROM users;"
echo.
echo Listing all users:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U cecbs -d cecbs -c "SELECT id, username, email, role, organization, status, created_at FROM users ORDER BY id;"
