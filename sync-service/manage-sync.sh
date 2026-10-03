#!/bin/bash
##################################################################
# CouchDB → PostgreSQL Sync Service Management
##################################################################

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_FILE="$SCRIPT_DIR/sync-continuous.log"
PID_FILE="$SCRIPT_DIR/sync-service.pid"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

case "$1" in
    start)
        echo -e "${BLUE}Starting CouchDB → PostgreSQL Sync Service...${NC}"
        
        # Check if already running
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if ps -p $PID > /dev/null 2>&1; then
                echo -e "${YELLOW}Service is already running (PID: $PID)${NC}"
                exit 0
            fi
        fi
        
        # Start service
        cd "$SCRIPT_DIR"
        nohup node couchdb-postgres-sync.js --watch > "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
        
        sleep 2
        
        if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Service started successfully (PID: $(cat "$PID_FILE"))${NC}"
            echo ""
            echo "  View logs:    tail -f $LOG_FILE"
            echo "  Stop service: $0 stop"
            echo "  Check status: $0 status"
        else
            echo -e "${RED}❌ Failed to start service${NC}"
            exit 1
        fi
        ;;
        
    stop)
        echo -e "${BLUE}Stopping CouchDB → PostgreSQL Sync Service...${NC}"
        
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if ps -p $PID > /dev/null 2>&1; then
                kill $PID
                rm "$PID_FILE"
                echo -e "${GREEN}✅ Service stopped${NC}"
            else
                echo -e "${YELLOW}Service is not running${NC}"
                rm "$PID_FILE" 2>/dev/null
            fi
        else
            # Try to find and kill by process name
            PIDS=$(ps aux | grep "couchdb-postgres-sync.js --watch" | grep -v grep | awk '{print $2}')
            if [ ! -z "$PIDS" ]; then
                echo "Found running processes: $PIDS"
                kill $PIDS
                echo -e "${GREEN}✅ Service stopped${NC}"
            else
                echo -e "${YELLOW}Service is not running${NC}"
            fi
        fi
        ;;
        
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        echo -e "${BLUE}CouchDB → PostgreSQL Sync Service Status${NC}"
        echo "════════════════════════════════════════"
        echo ""
        
        # Check if running
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if ps -p $PID > /dev/null 2>&1; then
                echo -e "Status: ${GREEN}RUNNING${NC}"
                echo "PID: $PID"
                echo ""
                
                # Show process info
                ps -p $PID -o pid,etime,rss,cmd | tail -1
                echo ""
                
                # Show last sync
                if [ -f "$LOG_FILE" ]; then
                    echo "Last sync activity:"
                    echo "-------------------"
                    tail -20 "$LOG_FILE" | grep -E "(Synchronization Summary|Total documents synced|sync completed)" | tail -5
                fi
            else
                echo -e "Status: ${RED}STOPPED${NC} (stale PID file)"
                rm "$PID_FILE"
            fi
        else
            # Check if process exists without PID file
            PIDS=$(ps aux | grep "couchdb-postgres-sync.js --watch" | grep -v grep | awk '{print $2}')
            if [ ! -z "$PIDS" ]; then
                echo -e "Status: ${YELLOW}RUNNING (no PID file)${NC}"
                echo "PID: $PIDS"
            else
                echo -e "Status: ${RED}STOPPED${NC}"
            fi
        fi
        echo ""
        ;;
        
    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            echo -e "${RED}Log file not found: $LOG_FILE${NC}"
            exit 1
        fi
        ;;
        
    test)
        echo -e "${BLUE}Testing Sync Service...${NC}"
        echo ""
        
        # Test CouchDB
        echo "CouchDB Instances:"
        for port in 5984 6984 7984 8984 9984 10984; do
            if curl -s -u admin:adminpw http://localhost:$port/_up > /dev/null 2>&1; then
                echo -e "  ✓ Port $port: ${GREEN}Online${NC}"
            else
                echo -e "  ✗ Port $port: ${RED}Offline${NC}"
            fi
        done
        echo ""
        
        # Test PostgreSQL
        echo "PostgreSQL:"
        if docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT 1;" > /dev/null 2>&1; then
            echo -e "  ✓ ${GREEN}Connected${NC}"
            
            # Show data count
            count=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM blockchain_shipments;" 2>/dev/null | xargs)
            echo "  📦 Shipments synced: $count"
            
            sync_count=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM sync_status;" 2>/dev/null | xargs)
            echo "  📊 Sync records: $sync_count"
        else
            echo -e "  ✗ ${RED}Connection failed${NC}"
        fi
        echo ""
        ;;
        
    *)
        echo "CouchDB → PostgreSQL Sync Service Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|test}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the sync service"
        echo "  stop     - Stop the sync service"
        echo "  restart  - Restart the sync service"
        echo "  status   - Show service status"
        echo "  logs     - Follow service logs (Ctrl+C to exit)"
        echo "  test     - Test connectivity and show data counts"
        echo ""
        exit 1
        ;;
esac

exit 0
