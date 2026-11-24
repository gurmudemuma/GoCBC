#!/bin/bash

################################################################################
# GoCBC Complete System Startup Script with Prerequisites Check
# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
#
# This script:
# 1. Checks all system prerequisites (incl. a strong JWT_SECRET in api/.env —
#    the API refuses to start without one since the auth fixes)
# 2. Validates environment configuration
# 3. **DETECTS PROCESSES ON REQUIRED PORTS — but never kills a healthy
#    API/UI it will not restart** (cleanup_ports skips ports 3000/3001
#    when the live API answers /health with "healthy" or the UI answers;
#    API/UI startup stays manual — see main())
# 4. Starts Hyperledger Fabric blockchain network (WITHOUT wiping data:
#    volumes are preserved unless --clean is passed)
# 5. Packages + deploys the chaincode at the CURRENT code version
#    (deploy-chaincode.sh detects source changes and upgrades, e.g. v2.2
#    seq 21 -> v2.3 seq 22; it also rebuilds the chaincode server image and
#    updates its package ID in the compose file, so invocations keep working)
# 6. Verifies the database is reachable (the API runs the tracked
#    migrations itself on startup — this script does not re-apply them,
#    and the final banner says SKIPPED when no migrations ran here)
# 7. Sets NBE data ONLY if the API is already healthy (Phase 7 runs
#    scripts/set-nbe-initial-data.sh and fails loudly on failure);
#    otherwise prints the exact manual command — the API never runs it
#    automatically, and this script never claims otherwise.
# 8. Checks IPFS (reports plainly that no IPFS service is defined) and
#    the Let's Encrypt certificate for nginx (check only — never starts
#    or configures nginx; cert-first step is printed when missing).
# 9. Prints manual startup instructions for the API and UI servers.
#    The auto-start calls are commented out in main() below — start
#    API/UI by hand in their own terminals.
# 10. (With the calls uncommented: starts API/UI and runs health checks)
#
# Port Cleanup Feature:
# - Scans the API/UI ports (3000, 3001) and the blockchain ports
# - NEVER kills a healthy API/UI: if port 3001 answers /health with
#   "healthy", or port 3000 answers as the UI, that process is left
#   running (this script does not auto-start API/UI, so a re-run must
#   not take down a live stack it cannot bring back up)
# - Terminates only stale/unhealthy processes on those ports
# - Cleans up orphaned PID files (except for a healthy live service)
# - Ensures clean startup every time
################################################################################

set -e  # Exit on error
# NOTE: no `set -o pipefail` at top level — deliberately. Phase 2 runs
# `npm run build 2>&1 | tail -5` and then checks ${PIPESTATUS[0]} so a
# failed build is only a warning ("API build had issues"); with pipefail
# the failing pipeline would abort the script under `set -e` before the
# PIPESTATUS check ever ran. The `grep -c` pipelines below are safe
# either way (they end in `|| true`), but that one build pipeline is
# not, so pipefail stays out. See audit gap 9.

# Step outcomes, set by the phases that actually run and read by
# show_manual_startup_instructions() so the final banner only claims
# steps that really ran and passed (audit gap 6/9). A step that was
# skipped (flag, missing file, container not running, API not up) leaves
# its flag false and the banner prints SKIPPED, never a checkmark.
BLOCKCHAIN_STARTED=false   # Phase 3: peers up AND count gate passed
CHAINCODE_DEPLOYED=false   # Phase 5: deploy + committed check + smoke test all passed
DATABASE_REACHABLE=false   # Phase 6: psql SELECT 1 succeeded
DATABASE_MIGRATED=false    # Phase 6: migrations actually ran in the API container
NBE_STATUS="not attempted" # Phase 7: applied | api-not-running | failed | script-missing
API_ALREADY_RUNNING=false  # Phase 1.5: healthy API found on 3001, left running
UI_ALREADY_RUNNING=false   # Phase 1.5: live UI found on 3000, left running
IPFS_STATUS="not checked"  # Phase 8 (IPFS/nginx check): no-service | healthy | unreachable
NGINX_CERT_STATUS="not checked" # Phase 8: present | missing

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
API_DIR="$PROJECT_ROOT/api"
UI_DIR="$PROJECT_ROOT/ui"
BLOCKCHAIN_DIR="$PROJECT_ROOT/blockchain"
CHAINCODE_DIR="$PROJECT_ROOT/chaincodes/coffee"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# Port definitions
POSTGRES_PORT=5432
ORDERER_PORT=7050
PEER_ECTA_PORT=7051
CHAINCODE_PORT=9999

# Peer / CouchDB host ports (from docker-compose-fabric.yml — these are
# the host-mapped ports; the in-container peer ports 7051-7062 in the old
# BLOCKCHAIN_PORTS list were never reachable from the host).
# Peers: ECTA 7051, ECX 8051, Banks 9051, NBE 10051, Customs 11051, Shipping 12051.
PEER_PORTS=(7051 8051 9051 10051 11051 12051)
# CouchDBs (each maps to :5984 in its container; /_up answers {"status":"ok"}):
# ECTA 5985, ECX 6984, Banks 7984, NBE 8984, Customs 9984, Shipping 10984.
COUCHDB_PORTS=(5985 6984 7984 8984 9984 10984)
# Every port Phase 3 probes for readiness (iterated in
# start_blockchain_network(); previously defined inside cleanup_ports
# and never iterated anywhere).
BLOCKCHAIN_PORTS=(
    "$POSTGRES_PORT"     # 5432 - PostgreSQL
    "$ORDERER_PORT"      # 7050 - Orderer
    7051 8051 9051 10051 11051 12051  # all 6 peers (host-mapped)
    5985 6984 7984 8984 9984 10984   # all 6 CouchDBs (host-mapped)
    "$CHAINCODE_PORT"    # 9999 - Chaincode server
)

# Colors for output
COLOR_RESET='\033[0m'
COLOR_BOLD='\033[1m'
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_MAGENTA='\033[0;35m'
COLOR_CYAN='\033[0;36m'

# Flags
SKIP_PREREQUISITES=false
SKIP_BUILD=false
SKIP_BLOCKCHAIN=false
SKIP_TESTS=false
CLEAN=false
VERBOSE=false

# Compose command (v2 plugin preferred, v1 binary as fallback). Detected once
# in main(); every compose call in this script uses $COMPOSE.
COMPOSE="docker compose"

detect_compose() {
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE="docker-compose"
    else
        write_error "Neither 'docker compose' nor 'docker-compose' is available"
        exit 1
    fi
    log_verbose "Using compose command: $COMPOSE"
}

# Parse command-line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-prerequisites)
                SKIP_PREREQUISITES=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-blockchain)
                SKIP_BLOCKCHAIN=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --clean)
                CLEAN=true
                shift
                ;;
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-prerequisites   Skip prerequisite checks (not recommended)"
    echo "  --skip-build          Skip npm install steps"
    echo "  --skip-blockchain     Skip blockchain network startup"
    echo "  --skip-tests          Skip health checks and tests"
    echo "  --clean               Wipe all data (Postgres + ledger volumes) before starting"
    echo "                        Default keeps existing data — a plain restart never deletes it"
    echo "  --verbose, -v         Show verbose output"
    echo "  --help, -h            Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start-all.sh                    # Full startup with all checks"
    echo "  ./start-all.sh --skip-build       # Skip npm install"
    echo "  ./start-all.sh --skip-blockchain  # Start only API and UI"
}

# Helper functions for pretty output
write_header() {
    echo ""
    echo -e "${COLOR_CYAN}${COLOR_BOLD}================================================================================${COLOR_RESET}"
    echo -e "${COLOR_CYAN}${COLOR_BOLD}  $1${COLOR_RESET}"
    echo -e "${COLOR_CYAN}${COLOR_BOLD}================================================================================${COLOR_RESET}"
    echo ""
}

write_step() {
    echo -e "${COLOR_BLUE}▶${COLOR_RESET} ${COLOR_BOLD}$1${COLOR_RESET}"
}

write_success() {
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} $1"
}

write_warning() {
    echo -e "${COLOR_YELLOW}⚠${COLOR_RESET} $1"
}

write_error() {
    echo -e "${COLOR_RED}✗${COLOR_RESET} ${COLOR_RED}$1${COLOR_RESET}"
}

write_info() {
    echo -e "${COLOR_MAGENTA}ℹ${COLOR_RESET} $1"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${COLOR_MAGENTA}[DEBUG]${COLOR_RESET} $1"
    fi
}

# Test if a port is open
test_port() {
    local port=$1
    local host=${2:-localhost}
    
    if command -v nc &> /dev/null; then
        nc -z "$host" "$port" 2>/dev/null
        return $?
    elif command -v timeout &> /dev/null; then
        timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null
        return $?
    else
        curl -s --max-time 1 "http://$host:$port" &>/dev/null
        return $?
    fi
}

# Wait for a port to become available
wait_for_port() {
    local port=$1
    local service=$2
    local timeout=${3:-60}
    local host=${4:-localhost}
    
    write_step "Waiting for $service on port $port..."
    local elapsed=0
    local interval=2
    
    while [ $elapsed -lt $timeout ]; do
        if test_port $port $host; then
            write_success "$service is ready on port $port"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        printf "."
    done
    
    echo ""
    write_error "$service failed to start on port $port after ${timeout}s"
    return 1
}

# Wait for HTTP endpoint to be healthy
wait_for_http() {
    local url=$1
    local service=$2
    local timeout=${3:-60}
    
    write_step "Waiting for $service at $url..."
    local elapsed=0
    local interval=2
    
    while [ $elapsed -lt $timeout ]; do
        if curl -s --max-time 2 "$url" >/dev/null 2>&1; then
            write_success "$service is responding"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        printf "."
    done
    
    echo ""
    write_error "$service failed to respond at $url after ${timeout}s"
    return 1
}

# Is the live API healthy? True only when /health answers with
# status "healthy" — any other response (including a bare TCP connect
# or a shutting_down body) is NOT healthy. Used by cleanup_ports (never
# kill a healthy API) and by Phase 7 (only run the NBE script when the
# API is really up). /health body (api/src/server.ts): {"status":
# "healthy", "services": {"database": bool, "blockchain": bool, ...}}.
is_api_healthy() {
    local body
    body=$(curl -s --max-time 2 "http://localhost:${API_PORT}/health" 2>/dev/null) || return 1
    printf '%s' "$body" | grep -q '"status"[[:space:]]*:[[:space:]]*"healthy"'
}

# Is the live UI answering? True when port 3000 returns an HTTP
# response carrying the Next.js marker (same check start_ui_server
# uses). Used by cleanup_ports only — never kill a live UI.
is_ui_running() {
    curl -s --max-time 2 -I "http://localhost:${UI_PORT}" 2>/dev/null | grep -qi "Next.js\|x-powered-by"
}

# CouchDB readiness: GET /_up must answer {"status":"ok"}. Retries
# briefly (CouchDB takes a few seconds after container start); returns
# non-zero when it never answers, so the caller can warn honestly.
check_couchdb() {
    local port=$1
    local attempt
    for attempt in $(seq 1 15); do
        if curl -s --max-time 2 "http://localhost:${port}/_up" 2>/dev/null | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'; then
            return 0
        fi
        sleep 2
    done
    return 1
}

################################################################################
# PHASE 1: Prerequisites Check
################################################################################

check_prerequisites() {
    if [ "$SKIP_PREREQUISITES" = true ]; then
        write_warning "Skipping prerequisites check (--skip-prerequisites flag)"
        return 0
    fi
    
    write_header "Phase 1: Checking Prerequisites"
    
    local all_good=true
    local warnings=()
    
    # Check Docker
    write_step "Checking Docker..."
    if command -v docker &> /dev/null; then
        docker_version=$(docker --version 2>/dev/null || echo "unknown")
        write_success "Docker installed: $docker_version"
        
        # Check if Docker daemon is running
        if docker ps &> /dev/null; then
            write_success "Docker daemon is running"
            
            # Check Docker version
            docker_ver=$(docker version --format '{{.Server.Version}}' 2>/dev/null | cut -d'.' -f1)
            if [ -n "$docker_ver" ] && [ "$docker_ver" -ge 20 ] 2>/dev/null; then
                log_verbose "Docker version $docker_ver is sufficient"
            else
                warnings+=("Docker version may be old. Recommended: >= 20.10")
            fi
        else
            write_error "Docker daemon is not running"
            write_info "Start with: sudo systemctl start docker"
            all_good=false
        fi
    else
        write_error "Docker is not installed"
        write_info "Install: https://docs.docker.com/engine/install/"
        all_good=false
    fi
    
    # Check Docker Compose
    write_step "Checking Docker Compose..."
    if command -v docker-compose &> /dev/null; then
        compose_version=$(docker-compose --version 2>/dev/null || echo "unknown")
        write_success "Docker Compose installed: $compose_version"
    elif docker compose version &> /dev/null 2>&1; then
        compose_version=$(docker compose version 2>/dev/null || echo "unknown")
        write_success "Docker Compose (plugin) installed: $compose_version"
    else
        write_error "Docker Compose is not installed"
        write_info "Install: https://docs.docker.com/compose/install/"
        all_good=false
    fi
    
    # Check Node.js
    write_step "Checking Node.js..."
    if command -v node &> /dev/null; then
        node_version=$(node --version 2>/dev/null)
        write_success "Node.js installed: $node_version"
        
        # Check Node version
        node_ver=$(echo "$node_version" | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_ver" -ge 18 ] 2>/dev/null; then
            log_verbose "Node.js version is sufficient (>= v18)"
        else
            warnings+=("Node.js version $node_version is old. Recommended: >= v18 (api/package.json engines)")
        fi
    else
        write_error "Node.js is not installed"
        write_info "Install: https://nodejs.org/ or use nvm"
        all_good=false
    fi
    
    # Check npm
    write_step "Checking npm..."
    if command -v npm &> /dev/null; then
        npm_version=$(npm --version 2>/dev/null)
        write_success "npm installed: v$npm_version"
    else
        write_error "npm is not installed"
        all_good=false
    fi
    
    # Check Go (optional but recommended for chaincode)
    write_step "Checking Go..."
    if command -v go &> /dev/null; then
        go_version=$(go version 2>/dev/null)
        write_success "Go installed: $go_version"
    else
        write_warning "Go is not installed (optional for chaincode development)"
        warnings+=("Go not found - chaincode modifications may require manual steps")
    fi
    
    # Check PostgreSQL client (optional but useful)
    write_step "Checking PostgreSQL client..."
    if command -v psql &> /dev/null; then
        psql_version=$(psql --version 2>/dev/null | head -1)
        write_success "PostgreSQL client installed: $psql_version"
    else
        write_warning "psql not installed (optional for database debugging)"
        write_info "Install: sudo apt-get install postgresql-client"
    fi
    
    # Check curl
    write_step "Checking curl..."
    if command -v curl &> /dev/null; then
        write_success "curl is installed"
    else
        write_warning "curl is not installed"
        warnings+=("curl not found - install with: sudo apt-get install curl")
    fi
    
    # Check jq (optional for JSON parsing)
    write_step "Checking jq..."
    if command -v jq &> /dev/null; then
        write_success "jq is installed"
    else
        write_info "jq not installed (optional for JSON parsing)"
        write_info "Install: sudo apt-get install jq"
    fi
    
    # Check available disk space
    write_step "Checking disk space..."
    available_space=$(df -BG "$PROJECT_ROOT" 2>/dev/null | tail -1 | awk '{print $4}' | sed 's/G//' || echo "0")
    if [ "$available_space" -ge 10 ] 2>/dev/null; then
        write_success "Available disk space: ${available_space}GB"
    else
        write_warning "Low disk space: ${available_space}GB (recommended: >= 10GB)"
        warnings+=("Low disk space may cause issues with Docker volumes")
    fi
    
    # Check project structure
    write_step "Checking project structure..."
    local missing_dirs=()
    for dir in "$API_DIR" "$UI_DIR" "$BLOCKCHAIN_DIR" "$CHAINCODE_DIR"; do
        if [ -d "$dir" ]; then
            log_verbose "Found: $dir"
        else
            write_error "Missing directory: $dir"
            missing_dirs+=("$dir")
            all_good=false
        fi
    done
    
    if [ ${#missing_dirs[@]} -eq 0 ]; then
        write_success "All required directories exist"
    fi
    
    # Check critical files
    write_step "Checking critical files..."
    local critical_files=(
        "$PROJECT_ROOT/docker-compose-fabric.yml"
        "$API_DIR/package.json"
        "$UI_DIR/package.json"
    )
    
    for file in "${critical_files[@]}"; do
        if [ -f "$file" ]; then
            log_verbose "Found: $file"
        else
            write_error "Missing file: $file"
            all_good=false
        fi
    done
    
    # Check environment files
    write_step "Checking environment configuration..."
    # api/.env is gitignored and is read by the API itself (dotenv in
    # server.ts), both on the host and inside the cecbs-api container
    # (./api is bind-mounted). The API refuses to start without a strong
    # JWT_SECRET since the auth fixes, so ensure one exists here.
    if [ ! -f "$API_DIR/.env" ]; then
        if [ -f "$API_DIR/.env.example" ]; then
            write_info "Creating $API_DIR/.env from .env.example"
            cp "$API_DIR/.env.example" "$API_DIR/.env"
        else
            write_error "No .env or .env.example found in API directory"
            all_good=false
        fi
    fi

    if [ -f "$API_DIR/.env" ]; then
        write_success "API .env file exists"

        # Validate DATABASE_URL
        if grep -q "DATABASE_URL" "$API_DIR/.env"; then
            log_verbose "DATABASE_URL is configured"
        else
            write_warning "DATABASE_URL not found in .env"
            warnings+=("DATABASE_URL should be configured in api/.env")
        fi

        # Validate JWT_SECRET — must be present, >= 32 chars, and not a
        # published/example value (api/src/config/env.validation.ts enforces
        # all three at API startup and refuses to start otherwise). The
        # .env.example placeholder is 64 chars but is a published phrase, so
        # length alone is not enough. Generate a fresh random one whenever
        # the value is missing, too short, a known-weak value, or identical
        # to the example's value; api/.env is gitignored, so the generated
        # secret never gets committed.
        JWT_VALUE=$(grep "^JWT_SECRET=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
        EXAMPLE_JWT=$(grep "^JWT_SECRET=" "$API_DIR/.env.example" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
        JWT_WEAK=false
        case "$JWT_VALUE" in
            ""|"cecbs-secret-key"|"your-secret-key-change-in-production"|"change-me"|"changeme"|"secret"|"test-secret"|"your-secret-key"|"jwt-secret") JWT_WEAK=true ;;
        esac
        if [ -n "$EXAMPLE_JWT" ] && [ "$JWT_VALUE" = "$EXAMPLE_JWT" ]; then JWT_WEAK=true; fi
        if [ "$JWT_WEAK" = false ] && [ -n "$JWT_VALUE" ] && [ "${#JWT_VALUE}" -ge 32 ]; then
            log_verbose "JWT_SECRET is configured (${#JWT_VALUE} chars)"
        else
            if command -v openssl &> /dev/null; then
                NEW_JWT=$(openssl rand -base64 48 | tr -d '\n')
                # Replace a weak/placeholder line, or append if absent
                if grep -q "^JWT_SECRET=" "$API_DIR/.env"; then
                    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$NEW_JWT|" "$API_DIR/.env"
                else
                    echo "JWT_SECRET=$NEW_JWT" >> "$API_DIR/.env"
                fi
                write_success "Generated a fresh JWT_SECRET in api/.env (gitignored, never committed)"
            else
                write_error "JWT_SECRET is missing or shorter than 32 chars and openssl is not available to generate one"
                write_info "Set a random 32+ char JWT_SECRET in $API_DIR/.env (openssl rand -base64 48)"
                all_good=false
            fi
        fi
    fi

    # REDIS_PASSWORD — the compose file requires it for the redis service
    # (docker-compose-fabric.yml: redis-server --requirepass
    # ${REDIS_PASSWORD:?set REDIS_PASSWORD}; compose fails fast if it is
    # unset). It used to be hard-coded in the compose file; the auth fixes
    # removed the hard-coded value but nothing ever supplied a replacement,
    # so `docker compose` failed at interpolation on any host without
    # REDIS_PASSWORD in its environment. Ensure one here, mirroring the
    # JWT_SECRET handling above: prefer the environment, else the root
    # .env file (which compose reads next to the compose file), else
    # generate a fresh random one and persist it there. The root .env is
    # gitignored, so the generated password never gets committed. Export
    # it so every compose invocation below sees it regardless of how
    # compose resolves the .env file.
    REDIS_VALUE="${REDIS_PASSWORD:-}"
    if [ -z "$REDIS_VALUE" ] && [ -f "$PROJECT_ROOT/.env" ]; then
        REDIS_VALUE=$(grep "^REDIS_PASSWORD=" "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    fi
    EXAMPLE_REDIS=$(grep "^REDIS_PASSWORD=" "$API_DIR/.env.example" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    REDIS_WEAK=false
    case "$REDIS_VALUE" in
        ""|"password"|"redis"|"changeme"|"change-me"|"secret") REDIS_WEAK=true ;;
    esac
    if [ -n "$EXAMPLE_REDIS" ] && [ "$REDIS_VALUE" = "$EXAMPLE_REDIS" ]; then REDIS_WEAK=true; fi
    if [ "$REDIS_WEAK" = false ] && [ -n "$REDIS_VALUE" ] && [ "${#REDIS_VALUE}" -ge 16 ]; then
        log_verbose "REDIS_PASSWORD is configured (${#REDIS_VALUE} chars)"
    else
        if command -v openssl &> /dev/null; then
            NEW_REDIS=$(openssl rand -base64 32 | tr -d '\n')
            # Replace a weak/placeholder line, or append if absent
            if grep -q "^REDIS_PASSWORD=" "$PROJECT_ROOT/.env" 2>/dev/null; then
                sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$NEW_REDIS|" "$PROJECT_ROOT/.env"
            else
                echo "REDIS_PASSWORD=$NEW_REDIS" >> "$PROJECT_ROOT/.env"
            fi
            REDIS_VALUE="$NEW_REDIS"
            write_success "Generated a fresh REDIS_PASSWORD in .env (gitignored, never committed)"
        else
            write_error "REDIS_PASSWORD is missing or too short and openssl is not available to generate one"
            write_info "Set a random 16+ char REDIS_PASSWORD in $PROJECT_ROOT/.env (openssl rand -base64 32)"
            all_good=false
        fi
    fi
    export REDIS_PASSWORD="$REDIS_VALUE"

    # The compose API loads Fabric connection settings from this file.
    # It is gitignored (untracked since the secrets cleanup), so a pull /
    # reset that moves the branch can DELETE the host's copy — the compose
    # file then fails hard on the missing env_file. If it is gone, try to
    # recover it from the local git history first, and do the same for
    # api/.env.blockchain (the two files are identical). If neither is
    # recoverable, warn with the manual steps; compose will fail at the
    # env_file, so the user must restore from their backup.
    for _bc_file in ".env.blockchain.fixed" ".env.blockchain"; do
        if [ -f "$API_DIR/$_bc_file" ]; then
            log_verbose "Fabric env file api/$_bc_file exists"
            continue
        fi
        _recovered=false
        # Newest commit in any branch history whose tree still contains
        # the file. NOTE: HEAD@{1} does NOT work here — the file has been
        # untracked since the secrets cleanup, so every HEAD since then
        # (including HEAD@{1}) lacks it, and `git log -g -- <path>`
        # returns nothing when no reflog entry touched the file. The
        # rev-list walk below skips the commit that deleted the file
        # (e1c333b2) and takes the newest commit that actually has it
        # (b016b957 for .fixed, 0194c54f for .env.blockchain).
        for _c in $(git -C "$PROJECT_ROOT" rev-list --all -- "api/$_bc_file" 2>/dev/null); do
            if git -C "$PROJECT_ROOT" cat-file -e "$_c:api/$_bc_file" 2>/dev/null; then
                if git -C "$PROJECT_ROOT" show "$_c:api/$_bc_file" > "$API_DIR/$_bc_file" 2>/dev/null && [ -s "$API_DIR/$_bc_file" ]; then
                    _recovered=true
                else
                    rm -f "$API_DIR/$_bc_file"
                fi
                break
            fi
        done
        if [ "$_recovered" = true ]; then
            write_success "Recovered api/$_bc_file from git history (it was deleted by the pull/reset — back it up outside the repo)"
        else
            write_warning "api/$_bc_file not found — the API's Fabric connection settings come from it"
            warnings+=("Restore api/$_bc_file from your backup outside the repo")
        fi
    done
    
    # Summary
    echo ""
    if [ "$all_good" = false ]; then
        write_error "Prerequisites check FAILED!"
        echo ""
        echo "Please fix the errors above before starting the system."
        echo ""
        exit 1
    fi
    
    if [ ${#warnings[@]} -gt 0 ]; then
        echo ""
        write_warning "${#warnings[@]} warning(s) found:"
        for warning in "${warnings[@]}"; do
            echo "  • $warning"
        done
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Startup cancelled by user."
            exit 0
        fi
    fi
    
    echo ""
    write_success "All critical prerequisites met!"
}

################################################################################
# PHASE 1.5: Clean Up Ports (Kill processes using required ports)
################################################################################

cleanup_ports() {
    write_header "Phase 1.5: Cleaning Up Ports"
    
    # Focus on API and UI ports for manual startup
    local CRITICAL_PORTS=(
        $API_PORT          # 3001 - API Server
        $UI_PORT           # 3000 - UI Server
    )
    
    # Blockchain ports are NOT killed here — only probed for readiness in
    # Phase 3. The port list lives at the top level as BLOCKCHAIN_PORTS
    # (with PEER_PORTS / COUCHDB_PORTS) and start_blockchain_network()
    # iterates it; cleanup_ports touches only the API/UI ports above.
    
    local ports_cleaned=0
    local ports_already_free=0
    local ports_left_running=0

    write_step "Checking critical ports (API & UI)..."
    write_info "A healthy API/UI is NEVER killed here: this script does not auto-start"
    write_info "API/UI (see main()), so a re-run must not take down a live stack."

    # Clean critical ports first (API and UI) — but skip a port whose
    # occupant is the healthy live service. Anything else on the port
    # (stale dev server, leftover process) is still killed.
    for port in "${CRITICAL_PORTS[@]}"; do
        local pids=$(lsof -ti:$port 2>/dev/null || true)

        if [ -z "$pids" ]; then
            write_success "Port $port is already free"
            ports_already_free=$((ports_already_free + 1))
            continue
        fi

        # Healthy live service on this port? Leave it alone UNLESS --clean is used.
        if [ "$CLEAN" != true ]; then
            if [ "$port" -eq "$API_PORT" ] && is_api_healthy; then
                write_warning "Port $port is in use by the HEALTHY live API (PID(s): $pids) — leaving it running"
                write_info "  └─ Re-run will NOT restart it; the API stays up. (API/UI startup is manual.)"
                API_ALREADY_RUNNING=true
                ports_left_running=$((ports_left_running + 1))
                continue
            fi
            if [ "$port" -eq "$UI_PORT" ] && is_ui_running; then
                write_warning "Port $port is in use by the live UI (PID(s): $pids) — leaving it running"
                write_info "  └─ Re-run will NOT restart it; the UI stays up. (API/UI startup is manual.)"
                UI_ALREADY_RUNNING=true
                ports_left_running=$((ports_left_running + 1))
                continue
            fi
        fi

        write_step "Port $port is in use by PID(s): $pids (not the healthy live service — terminating)"

        # Get process names for information
        for pid in $pids; do
            local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            write_info "  └─ PID $pid: $process_name"
        done

        # Kill the processes (stale ts-node-dev API server, Next.js UI server)
        write_step "  └─ Terminating processes on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null || true

        # Also kill known API/UI dev processes (narrow patterns only, so
        # unrelated node processes are not touched). These run ONLY on
        # the kill path above — never when a healthy service was skipped.
        pkill -9 -f "ts-node.*server.ts" 2>/dev/null || true
        pkill -9 -f "node dist/server.js" 2>/dev/null || true
        pkill -9 -f "next-server" 2>/dev/null || true

        # Verify port is now free
        sleep 1
        if ! lsof -ti:$port &>/dev/null; then
            write_success "  └─ Port $port is now FREE and ready for manual startup"
            ports_cleaned=$((ports_cleaned + 1))
        else
            write_warning "  └─ Port $port may still be in use - trying force kill..."
            sudo fuser -k ${port}/tcp 2>/dev/null || true
            sleep 1
            if ! lsof -ti:$port &>/dev/null; then
                write_success "  └─ Port $port is now FREE"
                ports_cleaned=$((ports_cleaned + 1))
            fi
        fi
    done

    echo ""
    if [ "$ports_left_running" -gt 0 ]; then
        write_success "Critical ports checked: $ports_left_running live service(s) left running, $ports_cleaned cleaned, $ports_already_free already free"
    else
        write_success "Critical ports (API: $API_PORT, UI: $UI_PORT) are ready"
    fi
    
    # Clean up any orphaned PID files — but never kill the PID of a
    # healthy live service (that PID file may simply be its own record).
    write_step "Cleaning up orphaned PID files..."
    local pid_files=("$PROJECT_ROOT/.api.pid" "$PROJECT_ROOT/.ui.pid")
    for pid_file in "${pid_files[@]}"; do
        if [ -f "$pid_file" ]; then
            local old_pid=$(cat "$pid_file" 2>/dev/null)
            if [ -n "$old_pid" ]; then
                # .api.pid belongs to the API, .ui.pid to the UI: skip the
                # kill when that service is healthy and running.
                local pid_is_live_service=false
                case "$pid_file" in
                    *.api.pid) is_api_healthy && pid_is_live_service=true ;;
                    *.ui.pid)  is_ui_running && pid_is_live_service=true ;;
                esac
                if [ "$pid_is_live_service" = true ]; then
                    write_info "PID file $pid_file points at the healthy live service (PID $old_pid) — leaving the process running, removing only the stale file"
                elif ps -p "$old_pid" &>/dev/null; then
                    write_step "Killing orphaned process (PID: $old_pid)..."
                    kill -9 "$old_pid" 2>/dev/null || true
                fi
            fi
            rm -f "$pid_file"
        fi
    done
    
    write_success "Port cleanup complete - ready for manual API and UI startup"
}

################################################################################
# PHASE 2: Install Dependencies
################################################################################

install_dependencies() {
    if [ "$SKIP_BUILD" = true ]; then
        write_info "Skipping dependency installation (--skip-build flag)"
        return 0
    fi
    
    write_header "Phase 2: Installing Dependencies"
    
    # Install API dependencies
    write_step "Installing API dependencies..."
    cd "$API_DIR"
    if [ ! -d "node_modules" ] || [ "$PROJECT_ROOT/package-lock.json" -nt "node_modules" ]; then
        npm install --prefer-offline --no-audit
        write_success "API dependencies installed"
    else
        write_info "API dependencies already installed (skipping)"
    fi
    cd "$PROJECT_ROOT"
    
    # Build API if TypeScript
    if [ -f "$API_DIR/tsconfig.json" ]; then
        write_step "Building API (TypeScript compilation)..."
        cd "$API_DIR"
        npm run build 2>&1 | tail -5
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            write_success "API built successfully"
        else
            write_warning "API build had issues (may be normal if already built)"
        fi
        cd "$PROJECT_ROOT"
    fi
    
    # Install UI dependencies
    write_step "Installing UI dependencies..."
    cd "$UI_DIR"
    if [ ! -d "node_modules" ] || [ "$PROJECT_ROOT/package-lock.json" -nt "node_modules" ]; then
        npm install --prefer-offline --no-audit
        write_success "UI dependencies installed"
    else
        write_info "UI dependencies already installed (skipping)"
    fi
    cd "$PROJECT_ROOT"
}

################################################################################
# PHASE 3: Start Blockchain Network
################################################################################

start_blockchain_network() {
    if [ "$SKIP_BLOCKCHAIN" = true ]; then
        write_info "Skipping blockchain network startup (--skip-blockchain flag)"
        return 0
    fi
    
    write_header "Phase 3: Starting Hyperledger Fabric Blockchain"
    
    # CRITICAL: Create configuration files BEFORE starting containers
    # (called once — an earlier duplicate second call was removed;
    # both functions are idempotent, so the extra call only wasted time)
    ensure_peer_configuration
    setup_external_builders
    
    # ALWAYS restart peers to ensure builder scripts are loaded
    # (Builder scripts are bind-mounted, but peers cache them on startup)
    local need_restart=true
    if [ "${PEER_CONFIG_CHANGED:-false}" = true ] || [ "${BUILDERS_CHANGED:-false}" = true ]; then
        write_warning "Configuration or builder scripts were updated"
    fi
    write_info "Peer containers will be restarted to ensure latest builder scripts are loaded"
    
    # Check if already running
    write_step "Checking if blockchain network is already running..."
    if docker ps 2>/dev/null | grep -q "peer0.ecta"; then
        write_info "Blockchain network is already running"

        # ALWAYS restart peers to load builder scripts (they may have been updated)
        write_warning "⚠️  RESTARTING all peer containers to ensure latest external builders are loaded..."
        cd "$PROJECT_ROOT"
        
        # Restart all 6 peer containers in parallel for speed. A failed
        # restart is fatal — it used to be masked by `|| true` and then
        # reported as "✅ All 6 peer containers restarted and ready".
        write_step "Restarting all 6 peer containers..."
        if ! docker restart peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et \
                      peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et \
                      >/dev/null 2>&1; then
            write_error "Failed to restart peer containers — check: docker ps -a | grep peer0"
            return 1
        fi

        write_info "⏳ Waiting for peers to fully restart (20 seconds)..."
        sleep 20
        # Verify the restart actually brought the peers back before
        # claiming they are ready (TCP probe on every peer port).
        local restarted_ok=true
        for peer_port in "${PEER_PORTS[@]}"; do
            if ! test_port "$peer_port"; then
                write_error "Peer port $peer_port is not listening after restart"
                restarted_ok=false
            fi
        done
        if [ "$restarted_ok" = false ]; then
            write_info "Check: docker logs peer0.ecta.cecbs.et (and the other peers)"
            return 1
        fi
        write_success "✅ All 6 peer containers restarted and responding"
        
        # Verify external builders are accessible after restart
        write_step "Verifying external builders after restart..."
        if docker exec peer0.ecta.cecbs.et test -x /builders/ccaas/bin/detect 2>/dev/null; then
            write_success "External builders are accessible in restarted containers"
        else
            write_error "External builders not accessible after restart!"
            return 1
        fi
    else
        # Clean up and start fresh
        write_step "Cleaning up old containers (if any)..."
        cd "$PROJECT_ROOT"
        if [ "$CLEAN" = true ]; then
            write_warning "--clean: removing ALL data volumes (Postgres + ledger)"
            $COMPOSE -f docker-compose-fabric.yml down -v 2>/dev/null || true
        else
            $COMPOSE -f docker-compose-fabric.yml down 2>/dev/null || true
        fi
        sleep 2

        # Start Fabric network. The failure check tests the command
        # directly: the old `if [ $? -ne 0 ]` after this line could never
        # run, because `set -e` exits at the failing command first.
        write_step "Starting Fabric network containers..."
        if ! $COMPOSE -f docker-compose-fabric.yml up -d; then
            write_error "Failed to start Fabric network containers"
            write_info "Check: $COMPOSE -f docker-compose-fabric.yml logs"
            exit 1
        fi
        
        write_success "Fabric containers started"
        
        # Wait for critical services
        write_step "Waiting for blockchain services to initialize..."
        sleep 15
    fi
    
    wait_for_port $POSTGRES_PORT "PostgreSQL" 45 || write_warning "PostgreSQL may not be ready"
    wait_for_port $ORDERER_PORT "Orderer" 60 || write_warning "Orderer may not be ready"
    wait_for_port $PEER_ECTA_PORT "ECTA Peer" 60 || write_warning "ECTA Peer may not be ready"

    # Readiness is not just the ECTA peer: probe ALL 6 peers (host ports
    # 7051/8051/9051/10051/11051/12051) and ALL 6 CouchDBs (/_up must
    # answer {"status":"ok"}). A peer/CouchDB that never answers is a
    # warning here, not a silent pass — the container-count gate below
    # is still the hard gate.
    write_step "Probing all 6 peer ports..."
    for peer_port in "${PEER_PORTS[@]}"; do
        wait_for_port "$peer_port" "Peer on port $peer_port" 30 || write_warning "Peer on port $peer_port may not be ready"
    done
    write_step "Checking all 6 CouchDBs (/_up)..."
    local couchdb_names=(ECTA ECX Banks NBE Customs Shipping)
    local couchdb_idx=0
    for couchdb_port in "${COUCHDB_PORTS[@]}"; do
        if check_couchdb "$couchdb_port"; then
            write_success "CouchDB ${couchdb_names[$couchdb_idx]} is up on port $couchdb_port"
        else
            write_warning "CouchDB ${couchdb_names[$couchdb_idx]} on port $couchdb_port did not answer /_up"
        fi
        couchdb_idx=$((couchdb_idx + 1))
    done
    # Actually iterate BLOCKCHAIN_PORTS (it used to be defined in
    # cleanup_ports and never used anywhere): every listed port must be
    # listening now that the waits above have run.
    write_step "Verifying every blockchain port is listening..."
    for blockchain_port in "${BLOCKCHAIN_PORTS[@]}"; do
        if ! test_port "$blockchain_port"; then
            write_warning "Blockchain port $blockchain_port is not listening"
        fi
    done

    # Verify containers
    write_step "Verifying container health..."
    # NOTE: `grep -c` already prints 0 when nothing matches — the old
    # `|| echo "0"` appended a SECOND 0, so PEER_COUNT became "0\n0"
    # and the -lt test below died with "integer expression expected".
    PEER_COUNT=$(docker ps 2>/dev/null | grep -c "peer0\." || true)
    ORDERER_COUNT=$(docker ps 2>/dev/null | grep -c "orderer\." || true)

    echo ""
    write_info "Running containers:"
    echo "  • Peers: $PEER_COUNT/6"
    echo "  • Orderer: $ORDERER_COUNT/1"

    if [ "$PEER_COUNT" -lt 6 ] || [ "$ORDERER_COUNT" -lt 1 ]; then
        write_error "Not all required containers are running!"
        write_info "Check logs: $COMPOSE -f docker-compose-fabric.yml logs"
        exit 1
    fi

    BLOCKCHAIN_STARTED=true
    write_success "Blockchain network is operational"
    
    # Verify external builders are accessible inside containers.
    # Fatal, like the restart branch above: a chaincode deploy later
    # in this run cannot succeed without the builders mounted, so
    # continuing here used to end in "✅ Blockchain network is
    # operational" followed by a deploy failure.
    write_step "Verifying external builders in peer containers..."
    if docker exec peer0.ecta.cecbs.et test -x /builders/ccaas/bin/detect 2>/dev/null; then
        write_success "External builders are accessible in peer containers"
    else
        write_error "External builders not accessible in peer containers!"
        write_info "Check: docker exec peer0.ecta.cecbs.et ls -la /builders/ccaas/bin/"
        return 1
    fi
}

ensure_peer_configuration() {
    write_step "Ensuring peer configuration files are properly set..."
    
    local peer_config_dir="$PROJECT_ROOT/blockchain/peer-config"
    local core_yaml="$peer_config_dir/core.yaml"
    local config_changed=false
    
    # Create directory if it doesn't exist
    mkdir -p "$peer_config_dir"
    
    # Check if core.yaml exists and has proper configuration (BCCSP + ledger + external builders)
    # This file is mounted to ALL 6 peers via docker-compose-fabric.yml
    if [ ! -f "$core_yaml" ] || ! grep -q "BCCSP:" "$core_yaml" 2>/dev/null || ! grep -q "externalBuilders:" "$core_yaml" 2>/dev/null; then
        write_warning "core.yaml missing or incomplete, creating proper configuration..."
        config_changed=true
        
        cat > "$core_yaml" << 'EOF'
peer:
  BCCSP:
    Default: SW
    SW:
      Hash: SHA2
      Security: 256
      FileKeyStore:
        KeyStore:

ledger:
  snapshots:
    rootDir: /var/hyperledger/production/snapshots

chaincode:
  system:
    cscc: enable
    lscc: enable
    qscc: enable
    _lifecycle: enable
  externalBuilders:
    - name: ccaas_builder
      path: /builders/ccaas
      propagateEnvironment:
        - CHAINCODE_AS_A_SERVICE_BUILDER_CONFIG
EOF
        
        write_success "Created core.yaml with proper BCCSP, ledger, and chaincode configuration"
    else
        log_verbose "core.yaml already properly configured"
    fi
    
    write_success "All 6 peers will use the same core.yaml (mounted from blockchain/peer-config/)"
    
    # Return status via global variable (bash limitation)
    if [ "$config_changed" = true ]; then
        export PEER_CONFIG_CHANGED=true
    fi
}

setup_external_builders() {
    write_step "Setting up external builders for CCAAS chaincode..."
    
    local builders_dir="$PROJECT_ROOT/builders/ccaas/bin"
    local builders_changed=false
    
    # Check if builders already exist and are correct
    if [ ! -d "$builders_dir" ] || [ ! -x "$builders_dir/detect" ] || [ ! -x "$builders_dir/build" ] || [ ! -x "$builders_dir/release" ]; then
        builders_changed=true
    fi
    
    # Always recreate to ensure scripts are correct and executable
    mkdir -p "$builders_dir"
    
    # Create detect script - Check parent directory for code.tar.gz
    cat > "$builders_dir/detect" << 'BUILDER_EOF'
#!/bin/bash
set -euo pipefail

# For Fabric 2.5 CCAAS packages:
# Fabric creates: /tmp/fabric-xxx/metadata/metadata.json
#                 /tmp/fabric-xxx/code.tar.gz (or src/)
# And passes /tmp/fabric-xxx/metadata as METADIR
# $1 = BUILD_OUTPUT_DIR (not used in detect)  
# $2 = METADATA_DIR - the /metadata subdirectory

METADIR=$2
PARENT_DIR=$(dirname "$METADIR")

# Debug: log what we're checking
echo "DETECT: Checking METADIR=$METADIR" >&2
echo "DETECT: PARENT_DIR=$PARENT_DIR" >&2
ls -la "$METADIR" >&2 || true
echo "DETECT: Parent directory contents:" >&2
ls -la "$PARENT_DIR" >&2 || true

# Check if connection.json is directly in METADIR
if [ -f "$METADIR/connection.json" ]; then
   echo "DETECT: connection.json found in METADIR - SUCCESS" >&2
   exit 0
fi

# Check if code.tar.gz exists in parent and extract it
if [ -f "$PARENT_DIR/code.tar.gz" ]; then
   echo "DETECT: code.tar.gz found in parent, extracting to check contents" >&2
   # Extract to temp and check for connection.json
   TEMP_EXTRACT=$(mktemp -d)
   tar -xzf "$PARENT_DIR/code.tar.gz" -C "$TEMP_EXTRACT" 2>/dev/null || true
   if [ -f "$TEMP_EXTRACT/connection.json" ]; then
      echo "DETECT: connection.json found in code.tar.gz - SUCCESS" >&2
      rm -rf "$TEMP_EXTRACT"
      exit 0
   fi
   rm -rf "$TEMP_EXTRACT"
fi

# Check src directory
if [ -f "$PARENT_DIR/src/connection.json" ]; then
   echo "DETECT: connection.json found in src/ - SUCCESS" >&2
   exit 0
fi

echo "DETECT: connection.json NOT found anywhere" >&2
exit 1
BUILDER_EOF
    
    # Create build script - Extract code.tar.gz from parent directory
    cat > "$builders_dir/build" << 'BUILDER_EOF'
#!/bin/bash
set -euo pipefail

# For Fabric 2.5 CCAAS packages:
# $1 = CHAINCODE_SOURCE_DIR (not used)
# $2 = METADATA_DIR - the /metadata subdirectory
# $3 = BUILD_OUTPUT_DIR - where to extract connection.json

METADIR=$2
PARENT_DIR=$(dirname "$METADIR")
BUILD_OUTPUT_DIR=$3

echo "BUILD: METADIR=$METADIR" >&2
echo "BUILD: PARENT_DIR=$PARENT_DIR" >&2
echo "BUILD: BUILD_OUTPUT_DIR=$BUILD_OUTPUT_DIR" >&2

# Extract code.tar.gz from parent directory to BUILD_OUTPUT_DIR
if [ -f "$PARENT_DIR/code.tar.gz" ]; then
    echo "BUILD: Extracting code.tar.gz to $BUILD_OUTPUT_DIR" >&2
    tar -xzf "$PARENT_DIR/code.tar.gz" -C "$BUILD_OUTPUT_DIR"
    echo "BUILD: Extraction successful" >&2
    exit 0
fi

# Check if already extracted in src/
if [ -f "$PARENT_DIR/src/connection.json" ]; then
    echo "BUILD: Copying from src/" >&2
    cp "$PARENT_DIR/src/connection.json" "$BUILD_OUTPUT_DIR/"
    exit 0
fi

echo "BUILD ERROR: code.tar.gz not found in $PARENT_DIR" >&2
exit 1
BUILDER_EOF
    
    # Create release script - prepares for execution
    cat > "$builders_dir/release" << 'BUILDER_EOF'
#!/bin/bash
set -euo pipefail

# For Fabric 2.5 CCAAS packages:
# $1 = BUILD_OUTPUT_DIR - contains connection.json from build step
# $2 = RELEASE_OUTPUT_DIR - final location for chaincode metadata

BUILD_OUTPUT_DIR=$1
RELEASE_OUTPUT_DIR=$2

echo "RELEASE: BUILD_OUTPUT_DIR=$BUILD_OUTPUT_DIR" >&2
echo "RELEASE: RELEASE_OUTPUT_DIR=$RELEASE_OUTPUT_DIR" >&2
echo "RELEASE: Contents of BUILD_OUTPUT_DIR:" >&2
ls -la "$BUILD_OUTPUT_DIR" >&2 || true

# Copy everything from build output to release output
if [ -d "$BUILD_OUTPUT_DIR" ] && [ "$(ls -A $BUILD_OUTPUT_DIR)" ]; then
    cp -a "$BUILD_OUTPUT_DIR"/* "$RELEASE_OUTPUT_DIR/"
    echo "RELEASE: Files copied successfully" >&2
    ls -la "$RELEASE_OUTPUT_DIR" >&2 || true
    exit 0
else
    echo "RELEASE ERROR: BUILD_OUTPUT_DIR is empty or doesn't exist" >&2
    exit 1
fi
BUILDER_EOF
    
    # Create run script - for CCAAS, this doesn't launch anything (chaincode runs externally)
    cat > "$builders_dir/run" << 'BUILDER_EOF'
#!/bin/bash
set -euo pipefail

# For CCAAS (Chaincode-as-a-Service), the chaincode runs as an external service.
# This script is called by Fabric to "launch" the chaincode, but since the chaincode
# is already running externally, this script just needs to stay alive as a stub.
#
# The peer monitors this process - if it exits, the peer thinks the chaincode stopped.
# So we need to keep running (sleep) until killed by Fabric.
#
# Parameters:
# $1 = BUILD_OUTPUT_DIR (contains connection.json from release step)
# $2 = RUN_METADATA_DIR (where peer stores runtime info)

BUILD_OUTPUT_DIR=$1
RUN_METADATA_DIR=$2

echo "RUN: CCAAS chaincode - keeping stub process alive" >&2
echo "RUN: BUILD_OUTPUT_DIR=$BUILD_OUTPUT_DIR" >&2
echo "RUN: RUN_METADATA_DIR=$RUN_METADATA_DIR" >&2
echo "RUN: The actual chaincode server is running externally" >&2

# Keep this process alive - the peer monitors it to know if chaincode is "running"
# We sleep in a loop so the script can be terminated cleanly
while true; do
    sleep 3600  # Sleep for 1 hour at a time
done
BUILDER_EOF
    
    chmod +x "$builders_dir"/*
    
    # Verify all scripts exist and are executable
    local missing=0
    for script in detect build release run; do
        if [ ! -x "$builders_dir/$script" ]; then
            write_error "Builder script $script is not executable"
            missing=1
        fi
    done
    
    if [ $missing -eq 0 ]; then
        write_success "External builders configured at ./builders/ccaas/bin/"
        log_verbose "Scripts: detect, build, release, run (all executable)"
    else
        write_error "External builder setup failed"
        return 1
    fi
    
    # Track if builders were changed
    if [ "$builders_changed" = true ]; then
        export BUILDERS_CHANGED=true
    fi
}

################################################################################
# PHASE 4: Create and Join Channel
################################################################################

create_channel() {
    if [ "$SKIP_BLOCKCHAIN" = true ]; then
        return 0
    fi
    
    write_header "Phase 4: Creating and Joining Blockchain Channel"
    
    # Check if channel already exists
    write_step "Checking if channel already exists..."
    CHANNEL_CHECK=$(docker exec peer0.ecta.cecbs.et peer channel list 2>/dev/null | grep "coffeechannel" || echo "NOT_FOUND")
    
    if echo "$CHANNEL_CHECK" | grep -q "coffeechannel"; then
        write_success "Channel 'coffeechannel' already exists"
        
        # Verify all peers have joined
        write_step "Verifying peer channel membership..."
        local peers_joined=0
        for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
            if docker exec $peer peer channel list 2>/dev/null | grep -q "coffeechannel"; then
                peers_joined=$((peers_joined + 1))
            fi
        done
        
        write_info "Peers joined to channel: $peers_joined/6"
        
        if [ $peers_joined -ge 6 ]; then
            write_success "All peers are members of the channel"
            return 0
        else
            write_warning "Not all peers have joined the channel, re-running channel creation..."
        fi
    else
        write_info "Channel not found, creating it..."
    fi
    
    # Run the channel creation script
    if [ -f "$SCRIPTS_DIR/create-channel-docker.sh" ]; then
        write_step "Running channel creation script..."
        bash "$SCRIPTS_DIR/create-channel-docker.sh"
        
        if [ $? -eq 0 ]; then
            write_success "Channel created and peers joined successfully"
            
            # Verify channel is active
            sleep 5
            VERIFY_CHECK=$(docker exec peer0.ecta.cecbs.et peer channel list 2>/dev/null | grep "coffeechannel" || echo "")
            if [ -n "$VERIFY_CHECK" ]; then
                write_success "Channel verification passed"
            else
                write_error "Channel creation verification failed"
                return 1
            fi
        else
            write_error "Channel creation failed"
            write_info "Check: docker logs orderer.cecbs.et"
            return 1
        fi
    else
        write_error "Channel creation script not found: $SCRIPTS_DIR/create-channel-docker.sh"
        return 1
    fi
}

################################################################################
# PHASE 5: Initialize and Verify Chaincode
################################################################################

initialize_chaincode() {
    if [ "$SKIP_BLOCKCHAIN" = true ]; then
        return 0
    fi

    write_header "Phase 5: Packaging + Deploying Chaincode"

    # Do NOT short-circuit here when a version is already committed: the
    # code in chaincodes/coffee may be newer than what is on the channel
    # (e.g. v2.2 seq 21 committed, source now carries the v2.3 fixes).
    # deploy-chaincode.sh hashes the Go sources plus connection.json and
    # metadata.json, skips the redeploy when nothing changed, and upgrades
    # (minor version +1, sequence +1) when it did. It also rebuilds the
    # chaincode server image and updates its package ID in the compose
    # file, which is required for invocations to keep working after an
    # upgrade (the server registers by package ID).
    if [ -f "$PROJECT_ROOT/deploy-chaincode.sh" ]; then
        write_step "Running chaincode deploy (detects changes, upgrades if needed)..."
        # Test the command directly: the old `bash ...; if [ $? -eq 0 ]`
        # could never take its failure branch, because `set -e` exits at
        # the failing command first.
        if bash "$PROJECT_ROOT/deploy-chaincode.sh"; then
            write_success "Chaincode deploy step completed"
        else
            write_error "Chaincode deployment failed"
            write_info "You may need to deploy manually: bash deploy-chaincode.sh"
            return 1
        fi
    else
        write_error "deploy-chaincode.sh not found"
        write_info "Chaincode must be deployed manually"
        return 1
    fi

    # Verify what is actually committed on the channel
    write_step "Verifying committed chaincode..."
    CHAINCODE_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
        --channelID coffeechannel --name coffee 2>/dev/null || echo "NOT_FOUND")

    if echo "$CHAINCODE_CHECK" | grep -q "Version:"; then
        CURRENT_VERSION=$(echo "$CHAINCODE_CHECK" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
        CURRENT_SEQUENCE=$(echo "$CHAINCODE_CHECK" | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
        write_success "Chaincode committed on coffeechannel:"
        echo "  • Name: coffee"
        echo "  • Version: $CURRENT_VERSION"
        echo "  • Sequence: $CURRENT_SEQUENCE"
        log_verbose "deploy-chaincode.sh automatically detects code changes and upgrades the version/sequence"
    else
        write_error "No chaincode committed on coffeechannel after deploy"
        return 1
    fi

    # Verify chaincode container is running with correct package ID
    write_step "Verifying chaincode server container..."
    CC_CONTAINER=$(docker ps --filter "name=coffee-chaincode" --format "{{.Names}}" 2>/dev/null)
    if [ -n "$CC_CONTAINER" ]; then
        write_success "Chaincode server container is running: $CC_CONTAINER"
        log_verbose "Container logs: docker logs $CC_CONTAINER"
    else
        write_warning "Chaincode server container not found (may use embedded mode)"
    fi

    test_chaincode_basic
    CHAINCODE_DEPLOYED=true
}

# Smoke test: a real read-only query against the committed chaincode. This
# exercises the full path (peer -> chaincode server at coffee-chaincode:9999),
# so it fails if the server was not rebuilt/restarted with the new package
# ID after an upgrade. QueryAllLCs returns [] on an empty ledger, which is
# a pass — only a connection/endorsement error is a failure.
# RETRY (F6, 2026-11-19): the server takes ~25s to start and register after
# a rebuild and connection.json dial_timeout is 10s, so a single query fired
# immediately after deploy-chaincode.sh returns races the still-starting
# server and fails even when everything is correct. Retry for ~90s and
# succeed on the first good response. On final failure, print the real
# error, the package ID the peer has for the committed version vs the ID
# the server registered under, and the server's recent logs — the old
# single-shot "may not be serving" message carried zero evidence.
test_chaincode_basic() {
    write_step "Testing chaincode with a read query (QueryAllLCs)..."
    local attempt=1 max_attempts=9 query_rc=0
    QUERY_RESULT=""
    while [ $attempt -le $max_attempts ]; do
        QUERY_RESULT=$(docker exec \
            -e CORE_PEER_LOCALMSPID=ECTAMSP \
            -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
            peer0.ecta.cecbs.et peer chaincode query \
            -C coffeechannel -n coffee \
            -c '{"function":"QueryAllLCs","Args":[]}' 2>&1)
        query_rc=$?
        # Success: peer CLI exited 0 and the response is the JSON array
        # QueryAllLCs returns (possibly "[]"). Anything else is a failure
        # of this attempt only, not yet of the check.
        if [ $query_rc -eq 0 ] && printf '%s' "$QUERY_RESULT" | grep -qE '^\s*\['; then
            write_success "Chaincode is responding to queries (attempt $attempt/$max_attempts)"
            return 0
        fi
        log_verbose "Query attempt $attempt/$max_attempts failed (rc=$query_rc); retrying in 10s..."
        attempt=$((attempt + 1))
        [ $attempt -le $max_attempts ] && sleep 10
    done

    # All retries exhausted: fail LOUD with evidence, not the vague
    # "may not be serving" message.
    write_error "Chaincode query failed after $max_attempts attempts (~90s) — the chaincode server is not serving the committed version"
    log_verbose "Last error: $QUERY_RESULT"
    COMMITTED_INFO=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>&1 || echo "")
    COMMITTED_VERSION=$(echo "$COMMITTED_INFO" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
    COMMITTED_SEQUENCE=$(echo "$COMMITTED_INFO" | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
    # Expected package ID: recompute it from the package tar the deploy
    # just built (newest coffee_*.tar.gz in chaincodes/coffee — the deploy
    # rewrites it on every run, so it is the current package). Do NOT grep
    # queryinstalled by the lifecycle Version (2.3): the package label is
    # coffee_2.13, so that grep matches nothing; and several same-label
    # packages stay installed, so picking one from that list is a guess.
    # calculatepackageid on the tar is exact. If the tar is absent the
    # comparison is skipped (prints unknown) — the query retries above are
    # the gate, this is diagnostic evidence only.
    EXPECTED_ID=""
    PKG_TAR=$(ls -t "$PROJECT_ROOT/chaincodes/coffee"/coffee_*.tar.gz 2>/dev/null | head -1)
    if [ -n "$PKG_TAR" ] && docker cp "$PKG_TAR" peer0.ecta.cecbs.et:/tmp/diag-package.tar.gz 2>/dev/null; then
        EXPECTED_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode calculatepackageid /tmp/diag-package.tar.gz 2>/dev/null | grep -oP 'coffee_[^ ]+' | head -1)
    fi
    SERVER_ID=$(docker inspect coffee-chaincode --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep '^CORE_CHAINCODE_ID_NAME=' | cut -d= -f2-)
    [ -z "$SERVER_ID" ] && SERVER_ID=$(docker exec coffee-chaincode printenv CORE_CHAINCODE_ID_NAME 2>/dev/null || echo "unknown")
    write_info "Committed definition: coffee v${COMMITTED_VERSION} seq ${COMMITTED_SEQUENCE}"
    write_info "Package ID expected for the committed definition (from ${PKG_TAR:-no package tar found}): ${EXPECTED_ID:-unknown}"
    write_info "Package ID the server registered under (CORE_CHAINCODE_ID_NAME): ${SERVER_ID:-unknown}"
    if [ -n "$EXPECTED_ID" ] && [ -n "$SERVER_ID" ] && [ "$EXPECTED_ID" != "$SERVER_ID" ]; then
        write_error "PACKAGE-ID MISMATCH: the server registered under $SERVER_ID but the committed package is $EXPECTED_ID — rebuild/recreate coffee-chaincode with the new package ID (see deploy-chaincode.sh)"
    fi
    write_info "Last 50 lines of docker logs coffee-chaincode:"
    docker logs --tail 50 coffee-chaincode 2>&1 | while IFS= read -r line; do log_verbose "  $line"; done
    write_info "Check: docker logs coffee-chaincode"
    write_info "Diagnose further with: ./diagnose-chaincode.sh  (committed definition, installed package ID per peer, server package ID, DNS/TCP probes, log tails)"
    return 1
}

################################################################################
# PHASE 6: Initialize Database
################################################################################

initialize_database() {
    write_header "Phase 6: Initializing Database & Running Migrations"
    
    # Check if database is accessible
    write_step "Checking database connection..."

    # Honesty note (audit gap 4): on the normal manual path there is no
    # cecbs-api container, so this script applies ZERO migrations — the
    # API itself runs them on startup (api/src/server.ts:509-517 calls
    # runMigrations() and refuses to start on failure). Every skip path
    # below says so plainly, and DATABASE_MIGRATED stays false so the
    # final banner prints SKIPPED instead of "Database is initialized".
    if [ ! -f "$API_DIR/.env" ]; then
        write_warning "No .env file found, skipping database initialization"
        write_info "Migrations were NOT applied: they run when the API starts (api/src/server.ts runMigrations)"
        write_info "Start the API for migrations to apply — the API refuses to start on migration failure"
        return 0
    fi

    # Extract DATABASE_URL
    DATABASE_URL=$(grep "^DATABASE_URL=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")

    if [ -z "$DATABASE_URL" ]; then
        write_warning "DATABASE_URL not configured in .env"
        write_info "Migrations were NOT applied: they run when the API starts — start the API for migrations to apply"
        return 0
    fi

    # Test database connection
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
            write_success "Database connection successful"
            DATABASE_REACHABLE=true

            # Run migrations using Node.js migration runner
            write_step "Running database migrations..."
            cd "$API_DIR"
            
            # Build the API first to ensure migrations are up to date
            if [ ! -d "$API_DIR/dist" ]; then
                write_step "Building API..."
                npm run build >/dev/null 2>&1 || write_warning "API build failed"
            fi
            
            # Check if API container is running
            if docker ps --format '{{.Names}}' | grep -q "cecbs-api"; then
                # Run migrations inside the Docker container where pg module is available
                write_step "Running migrations inside API container..."
                
                # Create migration script on host, then copy to container
                cat > /tmp/run-migrations-host.js << 'MIGRATION_EOF'
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    const databaseUrl = process.env.DATABASE_URL || process.argv[2];
    const migrationsDir = path.join('/app', 'dist', 'migrations');
    
    if (!databaseUrl) {
        console.error('DATABASE_URL not provided');
        process.exit(1);
    }
    
    const pool = new Pool({ connectionString: databaseUrl });
    
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS _schema_migrations (
                migration_name VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        const { rows: applied } = await pool.query(
            'SELECT migration_name FROM _schema_migrations ORDER BY migration_name'
        );
        const appliedSet = new Set(applied.map(r => r.migration_name));
        
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();
        
        console.log(`Found ${files.length} migration file(s)`);
        
        let appliedCount = 0;
        let skippedCount = 0;
        
        for (const file of files) {
            const migrationName = file.replace('.sql', '');
            
            if (appliedSet.has(migrationName)) {
                console.log(`  Skipping: ${migrationName}`);
                skippedCount++;
                continue;
            }
            
            console.log(`  Applying: ${migrationName}`);
            
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            
            try {
                await pool.query('BEGIN');
                await pool.query(sql);
                await pool.query(
                    'INSERT INTO _schema_migrations (migration_name) VALUES ($1)',
                    [migrationName]
                );
                await pool.query('COMMIT');
                console.log(`  Applied: ${migrationName}`);
                appliedCount++;
            } catch (error) {
                await pool.query('ROLLBACK');
                console.error(`  Failed: ${migrationName}`);
                console.error(`  Error: ${error.message}`);
                process.exit(1);
            }
        }
        
        if (appliedCount > 0) {
            console.log(`\nSuccessfully applied ${appliedCount} migration(s)`);
        } else {
            console.log(`\nAll migrations up to date (${skippedCount} already applied)`);
        }
        
    } catch (error) {
        console.error('Migration error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
MIGRATION_EOF
                
                # Copy script to container's working directory and run it
                docker cp /tmp/run-migrations-host.js cecbs-api:/app/run-migrations.js
                docker exec -w /app cecbs-api node run-migrations.js "$DATABASE_URL"
                local migration_result=$?
                
                # Cleanup
                docker exec cecbs-api rm -f /app/run-migrations.js 2>/dev/null
                rm -f /tmp/run-migrations-host.js
                
                if [ $migration_result -eq 0 ]; then
                    write_success "All migrations completed successfully"
                    DATABASE_MIGRATED=true
                else
                    write_error "Migration failed! Check the output above"
                    write_info "You may need to fix migration files and re-run"
                    return 1
                fi
            else
                write_warning "API container not running, skipping database migrations"
                write_info "Migrations were NOT applied by this script: they run when the API starts"
                write_info "(api/src/server.ts runMigrations — the API refuses to start on migration failure)"
                write_info "Start the API for migrations to apply; the final banner will show this step as SKIPPED"
            fi
            cd "$PROJECT_ROOT"

            # Check if users table exists and has data
            write_step "Checking for seed data..."
            USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE status='active';" 2>/dev/null | tr -d ' ' || echo "0")
            
            if [ "$USER_COUNT" -gt 0 ]; then
                write_success "Found $USER_COUNT active users in database"
            else
                write_info "No users found, seeding database..."
                
                # Prefer the JS seeding script as it handles password hashing properly.
                # NOTE: seed-users.js needs the native `bcrypt` binding
                # (api/node_modules/bcrypt). If that binding is missing or was
                # never built for the installed Node version, the JS seed fails
                # at require time — that is NOT fatal: fall back to
                # seed-users.sql, which carries pre-computed bcrypt hashes.
                # Both scripts only refresh password_hash on conflict for the
                # portal admins; neither fixes a wrong role on an existing row
                # (e.g. a legacy BANK row stays BANK until fixed by hand).
                SEEDED=false
                if [ -f "$SCRIPTS_DIR/seed-users.js" ]; then
                    cd "$PROJECT_ROOT"
                    SEED_LOG="$(mktemp /tmp/seed-users-js.XXXXXX.log)"
                    if node "$SCRIPTS_DIR/seed-users.js" >"$SEED_LOG" 2>&1; then
                        write_success "Database seeded with test users"
                        write_info "Default login: admin / admin123"
                        SEEDED=true
                        rm -f "$SEED_LOG"
                    else
                        write_warning "JS seed failed — falling back to SQL seed"
                        write_info "JS seed output (last 20 lines; full log kept at $SEED_LOG):"
                        tail -n 20 "$SEED_LOG"
                    fi
                fi
                if [ "$SEEDED" = false ]; then
                    if [ -f "$SCRIPTS_DIR/seed-users.sql" ]; then
                        SQL_LOG="$(mktemp /tmp/seed-users-sql.XXXXXX.log)"
                        if psql "$DATABASE_URL" -f "$SCRIPTS_DIR/seed-users.sql" >"$SQL_LOG" 2>&1; then
                            write_success "Database seeded with test users (SQL)"
                            write_info "Default login: admin / admin123"
                            rm -f "$SQL_LOG"
                        else
                            write_error "Database seeding failed: the SQL seed failed too"
                            write_info "SQL seed output (last 20 lines; full log kept at $SQL_LOG):"
                            tail -n 20 "$SQL_LOG"
                            write_info "No test users were created — fix the seed scripts and re-run"
                            return 1
                        fi
                    else
                        write_error "Database seeding failed: no seed script found at $SCRIPTS_DIR/"
                        return 1
                    fi
                fi
            fi
        else
            write_warning "Cannot connect to database (it may not be ready yet)"
            write_info "Database was NOT initialized and migrations were NOT applied by this script"
            write_info "They run when the API starts (api/src/server.ts runMigrations) — start the API for migrations to apply"
        fi
    else
        write_info "psql not installed, skipping database check"
        write_info "Migrations were NOT applied by this script: they run when the API starts — start the API for migrations to apply"
    fi
}

################################################################################
# PHASE 7: Start API Server
################################################################################

start_api_server() {
    write_header "Phase 7: Starting API Server"
    
    # Check if API container exists and use it
    if docker ps -a --format '{{.Names}}' | grep -q '^cecbs-api$'; then
        write_step "Using API from Docker container..."
        
        # Check if container is running
        if docker ps --format '{{.Names}}' | grep -q '^cecbs-api$'; then
            write_info "API container is already running"
            
            # Check if it's healthy
            if curl -s --max-time 2 "http://localhost:$API_PORT/health" 2>/dev/null | grep -q '"status"'; then
                write_success "API server is already healthy on http://localhost:$API_PORT"
                return 0
            else
                write_warning "API container is running but not healthy, restarting..."
                docker restart cecbs-api >/dev/null 2>&1
                sleep 5
            fi
        else
            write_step "Starting API container..."
            docker start cecbs-api >/dev/null 2>&1
            sleep 3
        fi
        
        # Wait for API to be ready with extended timeout
        write_step "Waiting for API to initialize (this may take a minute)..."
        
        # Give it more time for npm install and startup
        local attempt=0
        local max_attempts=40  # 80 seconds total
        local interval=2
        
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --max-time 2 "http://localhost:$API_PORT/health" >/dev/null 2>&1; then
                write_success "API server is running on http://localhost:$API_PORT (Docker)"
                return 0
            fi
            sleep $interval
            attempt=$((attempt + 1))
            printf "."
        done
        
        echo ""
        write_error "API container failed to start properly after $((max_attempts * interval)) seconds"
        write_info "Checking container logs..."
        docker logs cecbs-api --tail 30 2>&1 | tail -10
        echo ""
        write_info "Full logs: docker logs cecbs-api"
        write_info "Diagnostic tool: ./fix-api-container.sh"
        write_warning "Falling back to host-based API startup..."
        
        # Stop the problematic container
        docker stop cecbs-api 2>/dev/null || true
        
        # Fall through to host-based startup
    fi
    
    # Host-based API startup (if container doesn't exist or failed)
    write_step "Checking if API server is already running on host..."
    if curl -s --max-time 2 "http://localhost:$API_PORT/health" 2>/dev/null | grep -q '"status"'; then
        write_success "API server is already running on port $API_PORT"
        return 0
    fi
    
    # Kill any existing process on the port
    write_step "Ensuring port $API_PORT is available..."
    lsof -ti:$API_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
    
    # Start API
    write_step "Starting API server on host..."
    cd "$API_DIR"
    
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Start in background
    if [ -f "dist/server.js" ]; then
        # Production mode
        nohup node dist/server.js > "$PROJECT_ROOT/logs/api.log" 2>&1 &
        API_PID=$!
        echo $API_PID > "$PROJECT_ROOT/.api.pid"
        write_info "API started in production mode (PID: $API_PID)"
    else
        # Development mode
        nohup npm run dev > "$PROJECT_ROOT/logs/api.log" 2>&1 &
        API_PID=$!
        echo $API_PID > "$PROJECT_ROOT/.api.pid"
        write_info "API started in development mode (PID: $API_PID)"
    fi
    
    cd "$PROJECT_ROOT"
    
    # Wait for API to be ready
    wait_for_http "http://localhost:$API_PORT/health" "API Server" 60
    
    if [ $? -eq 0 ]; then
        write_success "API server is running on http://localhost:$API_PORT"
    else
        write_error "API server failed to start"
        write_info "Check logs: tail -f logs/api.log"
        return 1
    fi
}

################################################################################
# PHASE 8: Start UI Server
################################################################################

start_ui_server() {
    write_header "Phase 8: Starting UI Server"
    
    # Check if already running
    write_step "Checking if UI server is already running..."
    if curl -s --max-time 2 -I "http://localhost:$UI_PORT" 2>/dev/null | grep -qi "Next.js\|x-powered-by"; then
        write_success "UI server is already running on port $UI_PORT"
        return 0
    fi
    
    # Kill any existing process on the port
    write_step "Ensuring port $UI_PORT is available..."
    lsof -ti:$UI_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
    
    # Start UI
    write_step "Starting UI server..."
    cd "$UI_DIR"
    
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Start in background
    if [ -d ".next" ] && [ -f "package.json" ]; then
        nohup npm run dev > "$PROJECT_ROOT/logs/ui.log" 2>&1 &
        UI_PID=$!
        echo $UI_PID > "$PROJECT_ROOT/.ui.pid"
        write_info "UI started in development mode (PID: $UI_PID)"
    else
        write_warning ".next directory not found, building UI first..."
        npm run build
        nohup npm run dev > "$PROJECT_ROOT/logs/ui.log" 2>&1 &
        UI_PID=$!
        echo $UI_PID > "$PROJECT_ROOT/.ui.pid"
        write_info "UI started (PID: $UI_PID)"
    fi
    
    cd "$PROJECT_ROOT"
    
    # Wait for UI to be ready
    wait_for_http "http://localhost:$UI_PORT" "UI Server" 60
    
    if [ $? -eq 0 ]; then
        write_success "UI server is running on http://localhost:$UI_PORT"
    else
        write_error "UI server failed to start"
        write_info "Check logs: tail -f logs/ui.log"
        return 1
    fi
}

################################################################################
# PHASE 9: System Health Checks
################################################################################

run_health_checks() {
    if [ "$SKIP_TESTS" = true ]; then
        write_info "Skipping health checks (--skip-tests flag)"
        return 0
    fi
    
    write_header "Phase 9: Running Health Checks"
    
    local all_healthy=true
    
    # Check API health — "healthy" only. The old code also accepted any
    # body containing "status" as a success, so a degraded API passed.
    write_step "Testing API health endpoint..."
    API_HEALTH=$(curl -s --max-time 5 "http://localhost:$API_PORT/health" 2>/dev/null)
    if echo "$API_HEALTH" | jq -e '.status == "healthy"' &>/dev/null 2>&1; then
        write_success "API is healthy"
    elif echo "$API_HEALTH" | grep -q '"status"'; then
        write_warning "API is responding but NOT healthy: $API_HEALTH"
        all_healthy=false
    else
        write_warning "API health check returned unexpected response"
        all_healthy=false
    fi
    
    # Check API auth endpoint
    write_step "Testing API authentication endpoint..."
    AUTH_RESPONSE=$(curl -s --max-time 5 -X POST "http://localhost:$API_PORT/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}' 2>/dev/null)
    
    if echo "$AUTH_RESPONSE" | grep -q '"token"'; then
        write_success "Authentication endpoint is working"
    else
        write_warning "Authentication test failed (database may not be seeded)"
        write_info "Login with: admin / admin123"
        all_healthy=false
    fi
    
    # Check UI — require the Next.js marker (same check is_ui_running
    # uses), not just any HTTP response on the port.
    write_step "Testing UI server..."
    if is_ui_running; then
        write_success "UI server is responding"
    else
        write_warning "UI server is not responding"
        all_healthy=false
    fi
    
    # Check blockchain if not skipped
    if [ "$SKIP_BLOCKCHAIN" = false ]; then
        write_step "Testing blockchain network..."
        PEER_STATUS=$(docker ps --filter "name=peer0.ecta" --format "{{.Status}}" 2>/dev/null | head -1)
        if echo "$PEER_STATUS" | grep -q "Up"; then
            write_success "Blockchain network is running"
        else
            write_warning "Blockchain network status unclear"
            all_healthy=false
        fi
    fi
    
    echo ""
    if [ "$all_healthy" = true ]; then
        write_success "All health checks passed!"
        return 0
    else
        # This function used to ALWAYS return 0 (success) even when
        # checks failed, so a caller could never fail on it. It now
        # returns 1 on failure. It stays UNCALLED from main() (manual
        # startup discipline) — run it by hand after starting API/UI.
        write_warning "Some health checks failed - system may still be initializing"
        write_info "Check logs for details"
        return 1
    fi
}

################################################################################
# PHASE 9: Display System Status
################################################################################

# NOTE (audit gap 6/9): show_final_status() lived here and was deleted.
# It was dead code — defined but never called — and its "GoCBC System
# Successfully Started!" banner competed with the real final output,
# show_manual_startup_instructions(). The honest banner is now that one
# function, which prints a checkmark only for steps that actually ran
# and passed (see the BLOCKCHAIN_STARTED / CHAINCODE_DEPLOYED /
# DATABASE_* / NBE_STATUS flags) and SKIPPED for the rest.
# The closing line in main() still says "System preparation completed",
# not "System up" — that wording is deliberately unchanged.

################################################################################
# PHASE 7: Initialize NBE Data (If API is Running)
################################################################################

initialize_nbe_data() {
    write_header "Phase 7: Initializing NBE Exchange Rate & Retention Policy"

    # One source of truth (audit gap 1): NBE data is set ONLY by running
    # scripts/set-nbe-initial-data.sh, and ONLY this phase runs it — and
    # only when the API is already up and healthy. The API does NOT run
    # it on startup: there is no startup hook for it anywhere in
    # api/src, and initializeDefaultRates() has no callers. The old
    # wording ("The API will run ... on first startup") was false and
    # is deleted here and in the final instructions below.
    write_info "NBE data is set by scripts/set-nbe-initial-data.sh — run by this phase"
    write_info "only when the API is already healthy, otherwise by hand after the API starts."
    echo ""

    write_step "Checking if API is already running and healthy..."

    # Healthy only: is_api_healthy() requires /health to answer
    # {"status":"healthy"} — a bare TCP connect is not enough.
    if is_api_healthy; then
        write_success "API is running and healthy - setting NBE data now..."

        # Run the NBE initialization script and report its REAL result.
        # A failure is a failure: it is never swallowed as "already
        # configured" (the old code did that for every failure, including
        # login/API errors). Fail loudly so a bad rate/policy cannot hide.
        if [ -f "$SCRIPTS_DIR/set-nbe-initial-data.sh" ]; then
            if bash "$SCRIPTS_DIR/set-nbe-initial-data.sh"; then
                write_success "NBE data set successfully"
                NBE_STATUS="applied"
            else
                local nbe_rc=$?
                write_error "NBE initialization FAILED (exit $nbe_rc) — NBE data was NOT set"
                write_info "Fix the cause and re-run: bash scripts/set-nbe-initial-data.sh"
                write_info "(Do not assume the data is already set — verify the NBE rates in the portal/API.)"
                NBE_STATUS="failed"
                return 1
            fi
        else
            write_error "NBE initialization script not found at $SCRIPTS_DIR/set-nbe-initial-data.sh — NBE data was NOT set"
            NBE_STATUS="script-missing"
            return 1
        fi
    else
        NBE_STATUS="api-not-running"
        write_warning "API is not running (or not healthy) — NBE data was NOT set by this phase"
        write_info "Nothing will set it automatically: the API has no startup hook for it."
        echo ""
        write_step "REQUIRED manual step — run AFTER starting the API:"
        echo "  cd $PROJECT_ROOT"
        echo "  bash scripts/set-nbe-initial-data.sh"
        echo ""
        write_info "Required for banks to allocate forex. Skipping it causes forex-allocation failures later."
    fi
}

################################################################################
# PHASE 8: IPFS + nginx/certificate check (checks and instructions ONLY)
################################################################################

check_ipfs_and_nginx() {
    write_header "Phase 8: Checking IPFS + nginx / Certificate"

    # --- IPFS (audit gap 7) ---
    # There is NO IPFS service in docker-compose-fabric.yml (grep ipfs
    # returns nothing) and none is started by this script. Say so
    # plainly instead of silently passing: document/IPFS features will
    # not work until an IPFS service exists. If one is ever added to the
    # compose file, health-check its gateway (8080) and API (5001).
    if grep -qi "ipfs" "$PROJECT_ROOT/docker-compose-fabric.yml" 2>/dev/null; then
        write_info "An IPFS service is defined in docker-compose-fabric.yml — checking it..."
        local ipfs_ok=true
        test_port 8080 || { write_warning "IPFS gateway (8080) is not listening"; ipfs_ok=false; }
        test_port 5001 || { write_warning "IPFS API (5001) is not listening"; ipfs_ok=false; }
        if [ "$ipfs_ok" = true ]; then
            write_success "IPFS gateway (8080) and API (5001) are listening"
            IPFS_STATUS="healthy"
        else
            write_warning "IPFS is defined but not fully reachable — document/IPFS features may fail"
            IPFS_STATUS="unreachable"
        fi
    else
        write_warning "No IPFS service is defined in docker-compose-fabric.yml — IPFS is NOT part of this stack"
        write_info "Document/IPFS features (gateway 8080, API 5001) will not work until an IPFS service is added"
        IPFS_STATUS="no-service"
    fi

    # --- nginx + Let's Encrypt certificate (audit gap 8) ---
    # Check ONLY: this script never starts, reloads, or configures
    # nginx. HTTPS on 443 needs a certificate first, so verify the
    # Let's Encrypt cert exists and tell the operator the exact step
    # when it does not.
    echo ""
    write_step "Checking nginx certificate..."
    local cert_file="/etc/letsencrypt/live/coffeex.cbe.com.et/fullchain.pem"
    if [ -f "$cert_file" ]; then
        write_success "Let's Encrypt certificate present: $cert_file"
        if command -v openssl &>/dev/null; then
            local cert_expiry
            cert_expiry=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2- || echo "unknown")
            write_info "Certificate expires: ${cert_expiry:-unknown}"
        fi
        NGINX_CERT_STATUS="present"
    else
        write_warning "No Let's Encrypt certificate at $cert_file — nginx HTTPS (443) will NOT start"
        write_info "Get the certificate first (run from the repo root, on the host):"
        echo "  nginx-configs/deploy-cecbs-nginx.sh --ssl letsencrypt"
        write_info "This script does not start or configure nginx itself."
        NGINX_CERT_STATUS="missing"
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    clear
    
    echo ""
    echo -e "${COLOR_CYAN}${COLOR_BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                       ║"
    echo "║   Ethiopian Coffee Export Consortium Blockchain System (CECBS)       ║"
    echo "║                     Complete System Startup                          ║"
    echo "║                                                                       ║"
    echo "╚═══════════════════════════════════════════════════════════════════════╝"
    echo -e "${COLOR_RESET}"
    
    # Parse arguments
    parse_arguments "$@"

    # Which compose binary to use (v2 plugin preferred, v1 fallback)
    detect_compose

    # Start time
    START_TIME=$(date +%s)

    # Execute phases
    check_prerequisites
    cleanup_ports
    install_dependencies
    start_blockchain_network
    create_channel
    initialize_chaincode
    initialize_database
    initialize_nbe_data
    check_ipfs_and_nginx

    # SKIP AUTOMATIC API AND UI STARTUP - start them manually
    # start_api_server    # COMMENTED OUT - Manual startup
    # start_ui_server     # COMMENTED OUT - Manual startup
    # run_health_checks   # COMMENTED OUT - Run after manual startup

    show_manual_startup_instructions
    
    # Calculate duration
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo -e "${COLOR_GREEN}✅ System preparation completed in ${DURATION} seconds${COLOR_RESET}"
    echo ""
}

################################################################################
# Display Manual Startup Instructions
################################################################################

show_manual_startup_instructions() {
    write_header "Manual Startup Instructions"

    # Honest banner (audit gap 6/9): a checkmark ONLY for a step that
    # actually ran and passed in this run. Anything skipped prints
    # SKIPPED, never a checkmark. The flags are set by the phases above.
    echo ""
    if [ "$SKIP_BLOCKCHAIN" = true ]; then
        write_info "⏭ SKIPPED: Blockchain network (--skip-blockchain flag)"
    elif [ "$BLOCKCHAIN_STARTED" = true ]; then
        write_success "✅ Blockchain network is running (6 peers + orderer verified)"
    else
        write_warning "⚠ Blockchain network status NOT confirmed by this run"
    fi
    if [ "$SKIP_BLOCKCHAIN" = true ]; then
        write_info "⏭ SKIPPED: Chaincode (--skip-blockchain flag)"
    elif [ "$CHAINCODE_DEPLOYED" = true ]; then
        write_success "✅ Chaincode is deployed and responding to queries"
    else
        write_warning "⚠ Chaincode deployment NOT confirmed by this run"
    fi
    if [ "$DATABASE_MIGRATED" = true ]; then
        write_success "✅ Database migrations applied (in the API container)"
    elif [ "$DATABASE_REACHABLE" = true ]; then
        write_warning "⚠ Database is reachable but migrations were NOT applied by this script"
        write_info "    Migrations run when the API starts (api/src/server.ts runMigrations) — start the API"
    else
        write_info "⏭ SKIPPED: Database migrations not verified (see Phase 6 output — the API applies them on startup)"
    fi
    if [ "$API_ALREADY_RUNNING" = true ] && [ "$UI_ALREADY_RUNNING" = true ]; then
        write_success "✅ API (port $API_PORT) and UI (port $UI_PORT) were already running — left untouched, still up"
    elif [ "$API_ALREADY_RUNNING" = true ]; then
        write_success "✅ API (port $API_PORT) was already running — left untouched, still up"
        write_success "✅ Port $UI_PORT is FREE and ready"
    elif [ "$UI_ALREADY_RUNNING" = true ]; then
        write_success "✅ UI (port $UI_PORT) was already running — left untouched, still up"
        write_success "✅ Port $API_PORT is FREE and ready"
    else
        write_success "✅ Ports ${API_PORT} and ${UI_PORT} are FREE and ready"
    fi
    case "$NBE_STATUS" in
        applied)
            write_success "✅ NBE data set by Phase 7"
            ;;
        api-not-running)
            write_info "⏭ SKIPPED: NBE data NOT set — run this AFTER starting the API (required for forex): bash scripts/set-nbe-initial-data.sh"
            ;;
        failed|script-missing)
            write_error "✗ NBE data NOT set (Phase 7 status: $NBE_STATUS) — re-run bash scripts/set-nbe-initial-data.sh after fixing the cause"
            ;;
        *)
            write_info "⏭ SKIPPED: NBE data status unknown ($NBE_STATUS)"
            ;;
    esac
    case "$IPFS_STATUS" in
        healthy)
            write_success "✅ IPFS gateway (8080) and API (5001) are listening"
            ;;
        no-service)
            write_info "⏭ SKIPPED: No IPFS service in docker-compose-fabric.yml — IPFS features will not work"
            ;;
        unreachable)
            write_warning "⚠ IPFS is defined but not fully reachable"
            ;;
        *)
            write_info "⏭ SKIPPED: IPFS not checked ($IPFS_STATUS)"
            ;;
    esac
    case "$NGINX_CERT_STATUS" in
        present)
            write_success "✅ Let's Encrypt certificate present for coffeex.cbe.com.et"
            ;;
        missing)
            write_info "⏭ SKIPPED: No Let's Encrypt certificate — run nginx-configs/deploy-cecbs-nginx.sh --ssl letsencrypt before nginx HTTPS will work"
            ;;
        *)
            write_info "⏭ SKIPPED: nginx certificate not checked ($NGINX_CERT_STATUS)"
            ;;
    esac
    echo ""

    # Show what version was deployed
    if [ "$SKIP_BLOCKCHAIN" = false ] && [ "$CHAINCODE_DEPLOYED" = true ]; then
        DEPLOYED_VERSION=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
            --channelID coffeechannel --name coffee 2>/dev/null | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
        DEPLOYED_SEQUENCE=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
            --channelID coffeechannel --name coffee 2>/dev/null | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
        write_info "📦 Chaincode deployed: coffee v${DEPLOYED_VERSION} (sequence ${DEPLOYED_SEQUENCE})"
        write_info "   └─ deploy-chaincode.sh auto-detects code changes and upgrades automatically"
        echo ""
    fi
    
    write_step "Next steps - Start API and UI manually:"
    echo ""
    
    echo -e "${COLOR_CYAN}${COLOR_BOLD}Terminal 1 - Start API Server:${COLOR_RESET}"
    echo -e "  ${COLOR_YELLOW}cd $API_DIR${COLOR_RESET}"
    echo -e "  ${COLOR_YELLOW}npm run dev${COLOR_RESET}"
    echo ""
    echo -e "  ${COLOR_MAGENTA}Expected output:${COLOR_RESET}"
    echo -e "  ${COLOR_GREEN}✅ Successfully connected to Hyperledger Fabric network${COLOR_RESET}"
    echo -e "  ${COLOR_GREEN}🚀 CECBS API Gateway started on port ${API_PORT}${COLOR_RESET}"
    echo ""
    
    echo -e "${COLOR_CYAN}${COLOR_BOLD}Terminal 2 - Start UI Server:${COLOR_RESET}"
    echo -e "  ${COLOR_YELLOW}cd $UI_DIR${COLOR_RESET}"
    echo -e "  ${COLOR_YELLOW}npm run dev${COLOR_RESET}"
    echo ""
    echo -e "  ${COLOR_MAGENTA}Expected output:${COLOR_RESET}"
    echo -e "  ${COLOR_GREEN}▲ Next.js 14.x.x${COLOR_RESET}"
    echo -e "  ${COLOR_GREEN}- Local:        http://localhost:${UI_PORT}${COLOR_RESET}"
    echo ""
    
    echo -e "${COLOR_CYAN}${COLOR_BOLD}Access Points:${COLOR_RESET}"
    echo -e "  ${COLOR_BLUE}UI:${COLOR_RESET}              http://localhost:${UI_PORT}"
    echo -e "  ${COLOR_BLUE}API:${COLOR_RESET}             http://localhost:${API_PORT}"
    echo -e "  ${COLOR_BLUE}API Health:${COLOR_RESET}      http://localhost:${API_PORT}/health"
    echo -e "  ${COLOR_BLUE}API Docs:${COLOR_RESET}        http://localhost:${API_PORT}/api-docs"
    echo ""
    
    # NBE step — one source of truth with Phase 7 (audit gap 1): if
    # Phase 7 already applied it (API was up), say so; otherwise the
    # manual command below is REQUIRED, not optional, and nothing
    # applies it automatically. The old text implied it was a
    # first-time-only nicety; it is required for banks to allocate forex.
    if [ "$NBE_STATUS" = "applied" ]; then
        echo -e "${COLOR_CYAN}${COLOR_BOLD}NBE Data: already set by Phase 7 (API was running):${COLOR_RESET}"
        echo -e "  ${COLOR_GREEN}No action needed — re-run only to re-initialize:${COLOR_RESET} bash scripts/set-nbe-initial-data.sh"
    else
        echo -e "${COLOR_CYAN}${COLOR_BOLD}After API starts - Initialize NBE Data (REQUIRED, not automatic):${COLOR_RESET}"
        echo -e "  ${COLOR_YELLOW}bash scripts/set-nbe-initial-data.sh${COLOR_RESET}"
        echo -e "  ${COLOR_MAGENTA}The API does NOT run this on startup — run it by hand once the API is healthy.${COLOR_RESET}"
    fi
    echo -e "  ${COLOR_MAGENTA}This sets:${COLOR_RESET}"
    echo -e "    • Exchange Rate: ~57.25 ETB/USD (buying 57.00 / selling 57.50)"
    echo -e "    • Retention Policy: 40% USD, 60% ETB"
    echo -e "  ${COLOR_MAGENTA}Required for banks to allocate forex${COLOR_RESET}"
    echo ""
    
    echo -e "${COLOR_CYAN}${COLOR_BOLD}Default Login Credentials:${COLOR_RESET}"
    echo -e "  ${COLOR_BLUE}Username:${COLOR_RESET} admin"
    echo -e "  ${COLOR_BLUE}Password:${COLOR_RESET} admin123"
    echo ""
    
    echo -e "${COLOR_CYAN}${COLOR_BOLD}Debugging Tips:${COLOR_RESET}"
    echo -e "  ${COLOR_MAGENTA}Monitor chaincode logs:${COLOR_RESET}  docker logs -f peer0.ecta.cecbs.et 2>&1 | grep --line-buffered -E '(STEP|ERROR|RegisterSalesContractWithPaymentMethod)'"
    echo -e "  ${COLOR_MAGENTA}Check chaincode container:${COLOR_RESET}  docker logs coffee-chaincode"
    echo -e "  ${COLOR_MAGENTA}View all peer logs:${COLOR_RESET}        docker logs -f peer0.ecta.cecbs.et"
    echo -e "  ${COLOR_MAGENTA}Check blockchain status:${COLOR_RESET}   $COMPOSE -f docker-compose-fabric.yml ps"
    echo ""
    
    write_info "Tip: Keep both terminals open to monitor logs"
    write_info "Tip: Press Ctrl+C in each terminal to stop the servers"
    write_info "Tip: Enhanced logging is now active in chaincode for debugging 503 errors"
    echo ""
}

# Run main function
main "$@"
