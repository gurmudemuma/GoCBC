#!/bin/bash

# GoCBC System Backup Script
# Backs up PostgreSQL database and important files

BACKUP_DIR="/home/guda/GoCBC/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="gocbc_backup_$DATE"

echo "=== GoCBC Backup Starting ==="
echo "Backup: $BACKUP_NAME"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup PostgreSQL database
echo "1. Backing up PostgreSQL database..."
docker exec $(docker ps -q -f name=postgres) pg_dump -U cecbs cecbs > "$BACKUP_DIR/$BACKUP_NAME/database.sql"
if [ $? -eq 0 ]; then
    echo "   ✓ Database backup complete"
else
    echo "   ✗ Database backup failed"
    exit 1
fi

# Backup .env file
echo "2. Backing up configuration..."
cp /home/guda/GoCBC/.env "$BACKUP_DIR/$BACKUP_NAME/.env" 2>/dev/null || echo "   ⚠ .env not found"

# Backup docker-compose files
cp /home/guda/GoCBC/docker-compose*.yml "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null

# Create backup info
cat > "$BACKUP_DIR/$BACKUP_NAME/backup_info.txt" << BACKUP_INFO
GoCBC System Backup
Date: $(date)
Version: 1.21
Database: cecbs
Size: $(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
BACKUP_INFO

# Compress backup
echo "3. Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

echo ""
echo "=== Backup Complete ==="
echo "Location: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "Size: $(du -sh "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)"

# Keep only last 7 backups
echo ""
echo "Cleaning old backups (keeping last 7)..."
ls -t "$BACKUP_DIR"/gocbc_backup_*.tar.gz | tail -n +8 | xargs rm -f 2>/dev/null
echo "Done."
