#!/bin/bash

# Check documents table structure
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "\d documents" 2>/dev/null || \
  PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "\d documents" 2>/dev/null || \
  echo "Could not connect to database"
