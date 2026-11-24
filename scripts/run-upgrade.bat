@echo off
SET MSYS_NO_PATHCONV=1
SET MSYS2_ARG_CONV_EXCL=*
"C:\Program Files\Git\bin\bash.exe" -c "cd /c/goCBC && bash scripts/upgrade-chaincode.sh" > C:\goCBC\scripts\upgrade-out.txt 2>&1
