@echo off
echo ========================================
echo PostgreSQL Data Persistence Diagnosis
echo ========================================
echo.

echo Step 1: Checking PostgreSQL Service Status
sc query postgresql-x64-16
echo.

echo Step 2: Checking PostgreSQL Data Directory
set PGPASSWORD=cecbs123
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U cecbs -d cecbs -c "SHOW data_directory;"
echo.

echo Step 3: Checking Current User Count
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U cecbs -d cecbs -c "SELECT COUNT(*) as user_count, string_agg(username, ', ') as usernames FROM users;"
echo.

echo Step 4: Checking Database Persistence Settings
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U cecbs -d cecbs -c "SELECT name, setting FROM pg_settings WHERE name IN ('fsync', 'synchronous_commit', 'wal_level');"
echo.

echo Step 5: Checking if running in Docker
docker ps | findstr postgres
echo.

echo ========================================
echo Diagnosis Complete
echo ========================================
echo.
echo IMPORTANT: If PostgreSQL is running in Docker without volumes, 
echo data will be lost on container restart!
echo.
pause
