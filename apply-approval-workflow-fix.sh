#!/bin/bash
set -e
export PGPASSWORD="cecbs123"
echo "Adding missing approval workflow columns..."
psql -h localhost -p 5432 -U cecbs -d cecbs -f /home/guda/GoCBC/add-approval-workflow-columns.sql > /home/guda/GoCBC/migration-result.txt 2>&1
echo "Migration completed with exit code: $?" >> /home/guda/GoCBC/migration-result.txt
