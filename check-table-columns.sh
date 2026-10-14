#!/bin/bash
export PGPASSWORD="cecbs123"
psql -h localhost -p 5432 -U cecbs -d cecbs -c "\d exporter_applications" > /home/guda/GoCBC/table-structure.txt 2>&1
echo "Query completed" >> /home/guda/GoCBC/table-structure.txt
