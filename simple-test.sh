#!/bin/bash
printf "Test line 1\n"
printf "Test line 2\n"
curl -s http://localhost:3001/api/v1/health
printf "\nDone\n"
