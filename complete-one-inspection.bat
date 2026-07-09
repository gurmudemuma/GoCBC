@echo off
REM Complete a single pending inspection for testing

set API=http://localhost:3001/api/v1
set INSPECTION_ID=%1
set SHIPMENT_ID=%2

if "%INSPECTION_ID%"=="" (
    echo Usage: complete-one-inspection.bat INSPECTION_ID SHIPMENT_ID
    echo Example: complete-one-inspection.bat INSPECTION_SHIP-FULL-L-1783229896446 SHIP-FULL-L-1783229896446
    exit /b 1
)

if "%SHIPMENT_ID%"=="" (
    set SHIPMENT_ID=%INSPECTION_ID:~11%
)

echo.
echo Completing quality inspection: %INSPECTION_ID%
echo Shipment: %SHIPMENT_ID%
echo.

curl -X POST "%API%/quality/%INSPECTION_ID%/certify" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d "{\"shipmentId\":\"%SHIPMENT_ID%\",\"contractId\":\"CONTRACT-001\",\"exporterId\":\"EXP-H828546\",\"inspectorID\":\"ECTA-01\",\"inspectorName\":\"ECTA Quality Lab\",\"sampleSize\":100,\"moistureContent\":11.2,\"defects\":3,\"screenSize\":\"17\",\"beanSize\":\"17\",\"color\":\"Green\",\"odor\":\"Clean\",\"classification\":\"WASHED\",\"cupping\":87,\"overall\":87,\"certifiedBy\":\"ECTA Quality Director\",\"qualityCertId\":\"QC-%RANDOM%\",\"certificateNo\":\"QC-%RANDOM%\",\"pesticideTest\":\"PASSED\",\"heavyMetalTest\":\"PASSED\",\"mycotoxinTest\":\"PASSED\",\"remarks\":\"Quality certification completed\"}"

echo.
echo Done!
