#!/bin/bash

################################################################################
# Chaincode Deployment Script for GoCBC
# Deploys the coffee chaincode to all peers
################################################################################

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Coffee Chaincode Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Repo root is derived from this script's location, not hardcoded: the script
# runs from the user's checkout wherever it lives.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAINCODE_DIR="$REPO_ROOT/chaincodes/coffee"
COMPOSE_FILE="$REPO_ROOT/docker-compose-fabric.yml"

# Source hash for the change check below and the .last_deployed write at
# the end of a verified deploy. It covers the Go sources AND the two
# packaging inputs, connection.json and metadata.json. The old hash
# covered *.go only, so a connection.json-only change was silently
# skipped with "No chaincode changes detected": on the host the
# 172.18.0.17 -> coffee-chaincode:9999 revert (e696d79e) would have
# deployed nothing, the peer kept dialing the stale Docker-bridge IP,
# and registration failed at TCP connect — misread as a "TLS mismatch"
# (2026-11-19). metadata.json is included so a label-only change is
# not skipped either. .last_deployed is written only after a verified
# deploy, so a failed deploy never marks the tree as deployed.
chaincode_source_hash() {
    { find "$CHAINCODE_DIR" -name "*.go" -type f -exec md5sum {} \;
      md5sum "$CHAINCODE_DIR/connection.json" "$CHAINCODE_DIR/metadata.json" 2>/dev/null
    } | sort | md5sum | awk '{print $1}'
}

# The connection.json this run is about to package (chaincodes/coffee/),
# parsed once for the fail-fast checks below and the post-install
# read-back. This is the file deploy-chaincode.sh packages
# (deploy-chaincode.sh:158 `cp connection.json code-temp/` after
# cd $CHAINCODE_DIR) — NOT blockchain/channel-artifacts/connection.json.
PKG_CONN_ADDR=$(grep -oP '"address":\s*"\K[^"]+' "$CHAINCODE_DIR/connection.json" 2>/dev/null || echo "")
PKG_CONN_HOST="${PKG_CONN_ADDR%%:*}"
PKG_CONN_PORT="${PKG_CONN_ADDR##*:}"
PKG_CONN_TLS=$(grep -oP '"tls_required":\s*\K(true|false)' "$CHAINCODE_DIR/connection.json" 2>/dev/null || echo "unknown")

# Endorsement policy: NONE of approveformyorg, checkcommitreadiness or
# commit passes --signature-policy in this script, so all three use the
# channel default endorsement policy and all three ask about the SAME
# definition. That alignment is load-bearing, not cosmetic:
# checkcommitreadiness --signature-policy asks whether orgs approved
# THAT policy's definition, and approvals recorded without the flag do
# NOT count toward it. Proven live on the native stack 2026-11-20: ECTA
# approved seq 28 with no policy flag; checkcommitreadiness WITHOUT the
# flag showed ECTAMSP:true, WITH AND(all 6) showed all-false — the exact
# all-false the host log showed on 2026-11-20 while the commit (also
# without the flag) succeeded. Do NOT re-add --signature-policy to the
# readiness check alone, and do NOT add it to approve/commit either:
# that would change the committed endorsement policy and require a
# redeploy. (~/fabric-native/deploy.sh differs by design: it passes the
# AND(all 6) policy to approve, readiness AND commit alike, so ITS
# three calls agree with each other — it needs no change.)

# Compose command (v2 plugin preferred, v1 binary as fallback)
if docker compose version &> /dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo -e "${RED}✗ Neither 'docker compose' nor 'docker-compose' is available${NC}"
    exit 1
fi

# Simple versioning: always use version "1" and sequence "1"
# The label in metadata.json is just "coffee" (no version suffix)
VERSION="1"
SEQUENCE="1"

echo -e "${YELLOW}Checking if chaincode is already deployed...${NC}"

if docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null | grep -q "Version:"; then
    
    # Chaincode already exists - wipe and redeploy
    CHAINCODE_INFO=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
        --channelID coffeechannel --name coffee 2>/dev/null)
    
    CURRENT_VERSION=$(echo "$CHAINCODE_INFO" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
    CURRENT_SEQUENCE=$(echo "$CHAINCODE_INFO" | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
    
    echo -e "${YELLOW}⚠ Chaincode already deployed: v${CURRENT_VERSION}, sequence ${CURRENT_SEQUENCE}${NC}"
    echo -e "${YELLOW}  Wiping blockchain and redeploying with simple 'coffee' label...${NC}"
    echo ""
    
    # Determine compose command
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    # Wipe everything
    echo -e "${YELLOW}Stopping and removing all containers with volumes...${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" down -v
    sleep 5
    
    echo -e "${YELLOW}Restarting blockchain network...${NC}"
    echo -e "${BLUE}  Please wait, this will take 2-3 minutes...${NC}"
    
    # Start in proper order
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d postgres redis
    sleep 10
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d couchdb.ecta couchdb.ecx couchdb.banks couchdb.nbe couchdb.customs couchdb.shipping
    sleep 10
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d orderer.cecbs.et
    sleep 30
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et
    sleep 20
    
    # Recreate channel
    echo -e "${YELLOW}Recreating channel...${NC}"
    "$REPO_ROOT/scripts/create-channel-docker.sh" || {
        echo -e "${RED}✗ Failed to recreate channel${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ Blockchain wiped and restarted${NC}"
    echo -e "${BLUE}➜ Proceeding with fresh deployment${NC}"
    
    # Clear CURRENT_SEQUENCE since we now have a fresh blockchain
    CURRENT_SEQUENCE=""
    
else
    echo -e "${YELLOW}⚠ No chaincode deployed - proceeding with fresh deployment${NC}"
fi

echo -e "${BLUE}➜ Deploying version ${VERSION}, sequence ${SEQUENCE}${NC}"

# ── Fail fast on the packaged connection.json (TLS-mismatch trap, 2026-11-19) ──
# The peer dials the address in the INSTALLED package's connection.json —
# a repo edit alone reaches no peer. If the address about to be packaged
# is a bare Docker-bridge IP (e.g. 172.18.0.17:9999 from merge a3130932)
# or does not resolve from a peer, the deploy must abort HERE with the
# exact cause, not later at the warm-up query with a generic timeout.
# Checks: (a) bare-IP address — always wrong (container IPs are
# ephemeral; the name coffee-chaincode is what Docker resolves);
# (b) on an upgrade (a definition is already committed, so a server is
# expected to be listening) the name must resolve from peer0.ecta.
# TCP reachability is NOT a hard gate here — the server may legitimately
# be down before this deploy recreates it; the post-recreate probe below
# (which uses this same packaged address) is the hard TCP gate.
if [ -z "$PKG_CONN_ADDR" ] || [ -z "$PKG_CONN_HOST" ] || [ -z "$PKG_CONN_PORT" ]; then
    echo -e "${RED}✗ FAIL: chaincodes/coffee/connection.json has no usable address (parsed: '${PKG_CONN_ADDR}')${NC}"
    echo -e "${RED}  The peer dials this address from the installed package; without it registration cannot succeed.${NC}"
    echo -e "${RED}  Fix: set \"address\" to \"coffee-chaincode:9999\" in chaincodes/coffee/connection.json and re-run.${NC}"
    exit 1
fi
if [[ "$PKG_CONN_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}✗ FAIL: packaged connection.json address is a bare IP (${PKG_CONN_ADDR}) — a stale Docker-bridge IP no peer can rely on${NC}"
    echo -e "${RED}  The peer dials this address from the installed package; a bridge IP changes on every container recreate, so registration fails at TCP connect (before any TLS question arises).${NC}"
    echo -e "${RED}  Fix: set \"address\" to \"coffee-chaincode:9999\" in chaincodes/coffee/connection.json, then re-run this script — the change hash now covers connection.json, so the fix is detected and rebuilt (deleting chaincodes/coffee/.last_deployed is no longer needed).${NC}"
    exit 1
fi
if [ -n "$CURRENT_SEQUENCE" ]; then
    echo -e "${YELLOW}  Resolving packaged address ${PKG_CONN_HOST} from peer0.ecta...${NC}"
    PKG_DNS_OUT=$(docker exec peer0.ecta.cecbs.et getent hosts "$PKG_CONN_HOST" 2>&1)
    PKG_DNS_RC=$?
    if [ $PKG_DNS_RC -eq 0 ]; then
        echo -e "${GREEN}✓ Packaged address resolves from peer: ${PKG_DNS_OUT}${NC}"
    elif [ $PKG_DNS_RC -eq 126 ] || [ $PKG_DNS_RC -eq 127 ]; then
        echo -e "${YELLOW}  (cannot run getent in the peer container — no getent/shell there; skipping DNS pre-check, the post-recreate probe still gates)${NC}"
    else
        echo -e "${RED}✗ FAIL: packaged address ${PKG_CONN_HOST} does not resolve from peer0.ecta (rc=${PKG_DNS_RC}): ${PKG_DNS_OUT}${NC}"
        echo -e "${RED}  The peer will dial an unresolvable address from the installed package and registration will fail at TCP connect.${NC}"
        echo -e "${RED}  Fix: the address must be a name the peers resolve (coffee-chaincode on the cecbs network) — check chaincodes/coffee/connection.json and that peer + coffee-chaincode share the network, then re-run.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}  (fresh install: no server expected yet — skipping the DNS pre-check; the post-recreate probe still gates)${NC}"
fi

echo ""

# Locate or create chaincode package
CHAINCODE_PACKAGE="$CHAINCODE_DIR/coffee.tar.gz"

# Always rebuild package for deployment
echo -e "${YELLOW}Building chaincode package...${NC}"
cd "$CHAINCODE_DIR"

# Remove old package
rm -f "coffee.tar.gz"

# Package the chaincode - CCAAS (Chaincode-as-a-Service), NOT golang.
# The live chaincode runs as the coffee-chaincode Docker image at
# coffee-chaincode:9999. A CCAAS package contains only metadata.json
# (type "ccaas", label coffee_<version>) and connection.json, and is
# packaged with --lang external. The version/sequence here are derived
# above from the live channel: with v2.2 / seq 21 committed, the next
# run packages v2.3 / seq 22.

# Build the CCAAS package directory with simple "coffee" label
rm -rf pkg-temp code-temp
mkdir -p pkg-temp code-temp

# Create metadata.json — simple "coffee" label, no version suffix
cat > pkg-temp/metadata.json <<EOF
{
  "label": "coffee",
  "type": "ccaas"
}
EOF

# Create code.tar.gz containing connection.json plus the CouchDB index
# definitions (META-INF/statedb/couchdb/indexes/). The peer extracts the
# indexes from the package at install time; without them a redeploy would
# silently drop the shipped indexes (rate + repatriation, F2/F3 seq 24)
# and the allocate/repatriation queries would fall back to full scans.
# This must match the live seq-24 package, which ships all 10 indexes.
cp connection.json code-temp/
if [ -d "$CHAINCODE_DIR/META-INF" ]; then
    cp -r "$CHAINCODE_DIR/META-INF" code-temp/META-INF
    tar -czf pkg-temp/code.tar.gz -C code-temp connection.json META-INF
else
    echo -e "${YELLOW}  (no META-INF indexes in $CHAINCODE_DIR — packaging connection.json only)${NC}"
    tar -czf pkg-temp/code.tar.gz -C code-temp connection.json
fi

# Verify package structure
echo "Verifying package structure..."
echo "Contents of pkg-temp:"
ls -la pkg-temp/
echo "Contents of code.tar.gz:"
tar -tzf pkg-temp/code.tar.gz

# Create the final package with simple "coffee" label
tar -czf "coffee.tar.gz" -C pkg-temp metadata.json code.tar.gz

# Clean up
rm -rf pkg-temp code-temp

CHAINCODE_PACKAGE="$CHAINCODE_DIR/coffee.tar.gz"

if [ ! -f "$CHAINCODE_PACKAGE" ]; then
    echo -e "${RED}✗ Failed to create chaincode package${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Chaincode package created: coffee.tar.gz${NC}"
echo ""

cd "$REPO_ROOT"

# Install on ECTA peer first
echo -e "${YELLOW}Installing chaincode on ECTA peer...${NC}"
if ! docker cp "$CHAINCODE_PACKAGE" peer0.ecta.cecbs.et:/tmp/coffee.tar.gz; then
    echo -e "${RED}✗ Failed to copy package to ECTA peer — is peer0.ecta.cecbs.et running? (docker ps)${NC}"
    exit 1
fi

# Install result is checked honestly: the old version piped the output
# through grep with `|| true` and printed ✓ unconditionally, so a failed
# install sailed through all six peers and only died later at the
# package-ID step with no clue why. Capture the output and fail here.
INSTALL_OUT=$(docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode install /tmp/coffee.tar.gz 2>&1)
INSTALL_RC=$?
if [ $INSTALL_RC -ne 0 ] || ! echo "$INSTALL_OUT" | grep -qE "Installed remotely|already successfully installed"; then
    echo -e "${RED}✗ Install on ECTA failed (exit ${INSTALL_RC})${NC}"
    echo "$INSTALL_OUT"
    exit 1
fi

echo -e "${GREEN}✓ Installed on ECTA${NC}"

# Install on other peers
for peer_info in "peer0.ecx.cecbs.et:ECXMSP:ecx.cecbs.et:ECX" \
                  "peer0.banks.cecbs.et:BanksMSP:banks.cecbs.et:Banks" \
                  "peer0.nbe.cecbs.et:NBEMSP:nbe.cecbs.et:NBE" \
                  "peer0.customs.cecbs.et:CustomsMSP:customs.cecbs.et:Customs" \
                  "peer0.shipping.cecbs.et:ShippingMSP:shipping.cecbs.et:Shipping"; do
    
    IFS=':' read -r peer_name msp_id org_domain org_name <<< "$peer_info"
    
    echo -e "${YELLOW}Installing on $org_name...${NC}"
    if ! docker cp "$CHAINCODE_PACKAGE" "$peer_name":/tmp/coffee.tar.gz; then
        echo -e "${RED}✗ Failed to copy package to $org_name peer ($peer_name) — is the container running? (docker ps)${NC}"
        exit 1
    fi

    INSTALL_OUT=$(docker exec \
        -e CORE_PEER_LOCALMSPID="$msp_id" \
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@$org_domain/msp" \
        "$peer_name" peer lifecycle chaincode install /tmp/coffee.tar.gz 2>&1)
    INSTALL_RC=$?
    if [ $INSTALL_RC -ne 0 ] || ! echo "$INSTALL_OUT" | grep -qE "Installed remotely|already successfully installed"; then
        echo -e "${RED}✗ Install on $org_name failed (exit ${INSTALL_RC})${NC}"
        echo "$INSTALL_OUT"
        exit 1
    fi

    echo -e "${GREEN}✓ Installed on $org_name${NC}"
done

echo ""

# Get package ID
echo -e "${YELLOW}Retrieving package ID...${NC}"
# Get package ID — stderr is kept (not /dev/null) so a failing
# queryinstalled shows its real error instead of an empty result.
QUERY_OUT=$(docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1)
# Match either "Package ID: coffee:hash, Label: coffee" or "coffee:hash" format
PACKAGE_ID=$(echo "$QUERY_OUT" | grep -E "(Package ID: coffee:|Label: coffee)" | grep -oE "coffee:[a-f0-9]+" | head -1)

if [ -z "$PACKAGE_ID" ]; then
    echo -e "${RED}✗ Failed to get package ID${NC}"
    echo -e "${RED}  queryinstalled output:${NC}"
    echo "$QUERY_OUT"
    exit 1
fi

echo -e "${GREEN}✓ Package ID: $PACKAGE_ID${NC}"
echo ""

# Read back the connection.json the peer actually installed for this
# package and compare it with the file just packaged. The peer dials
# the installed copy — not the repo file — so a mismatch here is the
# stale-address failure itself, caught before approve/commit.
#
# WHICH PATH EXISTS WHEN (fed2d363 follow-up): the external builder's
# BUILD step runs at install and writes
#   <builds>/<label>-<hash>/bld/connection.json
# while the RELEASE step runs only at first launch and writes
#   <builds>/<label>-<hash>/release/chaincode/server/connection.json
# So pre-commit — before any launch of this package — only bld/ can
# exist; reading release/ here can never succeed (that is why the host
# log on 2026-11-20 showed "could not read back … — skipping the
# read-back check"). The release/ copy is re-checked AFTER the warm-up
# query below, once the server has launched and release/ exists.
# An unreadable bld/ copy is a HARD FAIL now, not a skipped check:
# install just succeeded, so the build dir must be there.
PKG_HASH="${PACKAGE_ID##*:}"
PKG_BUILD_DIR="/var/hyperledger/production/externalbuilder/builds/coffee-${PKG_HASH}"
INSTALLED_CONN=$(docker exec peer0.ecta.cecbs.et cat "$PKG_BUILD_DIR/bld/connection.json" 2>/dev/null || echo "")
INSTALLED_ADDR=$(echo "$INSTALLED_CONN" | grep -oP '"address":\s*"\K[^"]+' || echo "")
INSTALLED_TLS=$(echo "$INSTALLED_CONN" | grep -oP '"tls_required":\s*\K(true|false)' || echo "")
if [ -z "$INSTALLED_CONN" ] || [ -z "$INSTALLED_ADDR" ]; then
    echo -e "${RED}✗ FAIL: could not read back the installed connection.json from $PKG_BUILD_DIR/bld/connection.json after a successful install${NC}"
    echo -e "${RED}  The peer dials the installed copy, not the repo file — without it the dial address is unknown. Do not approve/commit this package.${NC}"
    echo -e "${RED}  Check: docker exec peer0.ecta.cecbs.et ls -R $PKG_BUILD_DIR (unexpected builder layout?)${NC}"
    exit 1
fi
echo -e "${YELLOW}  Installed connection.json address (ECTA peer, bld/): ${INSTALLED_ADDR}${NC}"
INSTALLED_HOST="${INSTALLED_ADDR%%:*}"
if [[ "$INSTALLED_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}✗ FAIL: installed connection.json address is a bare IP (${INSTALLED_ADDR}) — a stale Docker-bridge IP the peer cannot rely on${NC}"
    echo -e "${RED}  Fix: rebuild the package from chaincodes/coffee/connection.json (address coffee-chaincode:9999) and reinstall — do not approve/commit this package.${NC}"
    exit 1
fi
if [ "$INSTALLED_ADDR" != "$PKG_CONN_ADDR" ]; then
    echo -e "${RED}✗ FAIL: installed connection.json address (${INSTALLED_ADDR}) != packaged address (${PKG_CONN_ADDR})${NC}"
    echo -e "${RED}  The peer will dial the installed address, not the repo file. Fix: rebuild the package from chaincodes/coffee/connection.json and reinstall — do not approve/commit this package.${NC}"
    exit 1
fi
if [ -n "$INSTALLED_TLS" ] && [ "$INSTALLED_TLS" != "$PKG_CONN_TLS" ]; then
    echo -e "${RED}✗ FAIL: installed connection.json tls_required (${INSTALLED_TLS}) != packaged tls_required (${PKG_CONN_TLS}) — the peer would dial with the wrong TLS mode${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Installed connection.json (bld/) matches the packaged address${NC}"
echo ""

# ── Update the chaincode server for the new package ID ──────────────────────
# CCAAS peers route invocations to the chaincode server registered under the
# package ID of the committed definition. The server (coffee-chaincode
# container) registers under the package ID. Update the compose file with
# the package ID and rebuild the server image.
echo -e "${YELLOW}Updating chaincode server to package ID ${PACKAGE_ID}...${NC}"
sed -i "s|^\(\s*\)image: coffee-chaincode:.*|\1image: coffee-chaincode:1|" "$COMPOSE_FILE"
sed -i "s|^\(\s*- \)CORE_CHAINCODE_ID_NAME=.*|\1CORE_CHAINCODE_ID_NAME=${PACKAGE_ID}|" "$COMPOSE_FILE"
echo -e "${GREEN}✓ Compose file updated: coffee-chaincode:1, ID ${PACKAGE_ID}${NC}"

cd "$REPO_ROOT"
# F8: --no-cache so a stale layer can never resurrect old Go code, and
# --force-recreate --no-deps so the container is really recreated from the
# new image (a plain `up -d` can leave the old container running when
# compose thinks nothing changed — the stale-server failure mode, where
# the old package ID stays registered and every query hangs ~20 s).
if ! $COMPOSE -f docker-compose-fabric.yml build --no-cache coffee-chaincode; then
    echo -e "${RED}✗ Failed to rebuild the coffee-chaincode image${NC}"
    echo -e "${RED}  The v${VERSION} definition must not be committed while the server still runs old code — stopping here.${NC}"
    exit 1
fi
if ! $COMPOSE -f docker-compose-fabric.yml up -d --force-recreate --no-deps coffee-chaincode; then
    echo -e "${RED}✗ Failed to recreate the coffee-chaincode container${NC}"
    exit 1
fi

# Wait for the rebuilt server to come up and answer on 9999 (inside the
# cecbs-network; docker exec from the host cannot reach it directly, so
# check the container state and give it a few seconds to register).
for i in $(seq 1 15); do
    if docker ps --filter "name=^coffee-chaincode$" --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
        break
    fi
    sleep 2
done
if ! docker ps --filter "name=^coffee-chaincode$" --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
    echo -e "${RED}✗ coffee-chaincode container did not come up after the rebuild${NC}"
    echo -e "${RED}  Check: docker logs coffee-chaincode${NC}"
    exit 1
fi
# F8: verify the recreated container actually carries the NEW package ID.
# A stale container (old image, or a compose file the sed above did not
# rewrite) registers under the old ID, and the peer then waits ~20 s on a
# server that will never answer for the new definition. Fail fast here,
# printing both values, instead of hanging later at approve/commit/query.
SERVER_ID=$(docker inspect coffee-chaincode --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep '^CORE_CHAINCODE_ID_NAME=' | cut -d= -f2-)
[ -z "$SERVER_ID" ] && SERVER_ID=$(docker exec coffee-chaincode printenv CORE_CHAINCODE_ID_NAME 2>/dev/null || echo "unknown")
echo -e "${YELLOW}  Package ID expected (new): ${PACKAGE_ID}${NC}"
echo -e "${YELLOW}  Package ID in container env: ${SERVER_ID}${NC}"
if [ "$SERVER_ID" != "$PACKAGE_ID" ]; then
    echo -e "${RED}✗ PACKAGE-ID MISMATCH: container env is ${SERVER_ID}, expected ${PACKAGE_ID}${NC}"
    echo -e "${RED}  The recreated container is stale (old image or unrewritten compose env) — it will never serve the new definition.${NC}"
    echo -e "${RED}  Check: docker logs coffee-chaincode; docker inspect coffee-chaincode${NC}"
    docker logs --tail 30 coffee-chaincode 2>&1 || true
    exit 1
fi
echo -e "${GREEN}✓ Container package ID matches ${PACKAGE_ID}${NC}"
# F8: DNS must resolve from a peer before the TCP probe means anything —
# a failed getent is a different cause (network/DNS) from a refused
# connection (server not listening), and the deploy should name it.
echo -e "${YELLOW}  Resolving coffee-chaincode from peer0.ecta...${NC}"
DNS_OUT=$(docker exec peer0.ecta.cecbs.et getent hosts coffee-chaincode 2>&1)
DNS_RC=$?
if [ $DNS_RC -eq 0 ]; then
    echo -e "${GREEN}✓ DNS resolves: ${DNS_OUT}${NC}"
elif [ $DNS_RC -eq 126 ] || [ $DNS_RC -eq 127 ]; then
    echo -e "${YELLOW}  (cannot run getent in the peer container — no getent/shell there; skipping DNS check)${NC}"
else
    echo -e "${RED}✗ DNS resolution failed from peer0.ecta (rc=${DNS_RC}): ${DNS_OUT}${NC}"
    echo -e "${RED}  coffee-chaincode does not resolve on the peer network — check that the peer and coffee-chaincode share the cecbs network (docker-compose-fabric.yml) and that the container is named coffee-chaincode.${NC}"
    exit 1
fi
# A chaincode query CANNOT gate readiness here, and must not be used as
# one: the rebuilt server registers under the NEW package ID, but the OLD
# definition is still committed until the commit step below, so a
# pre-commit query would fail even when the server is perfect (the peer
# enforces the package-ID match — proven by the F6 wrong-ID test). The
# strongest check possible at this point is that the server's port is
# actually reachable FROM a peer on the cecbs-network — "container Up"
# alone does not prove that. Retry ~60s; fail loudly if the listener
# never answers. (If the peer image has no shell, docker exec exits
# 126/127 and the gate is skipped with a warning instead of failing the
# deploy.) Real query readiness is verified after the commit by the
# warm-up loop below.
SERVER_READY=0
SERVER_PROBE_OK=1
# The probe dials the PACKAGED address (PKG_CONN_HOST:PKG_CONN_PORT),
# not a hardcoded name: the peer dials the installed connection.json,
# so the smoke test must verify that address, or a stale address would
# pass this gate and only die later at the warm-up query.
for i in $(seq 1 30); do
    docker exec peer0.ecta.cecbs.et bash -c "echo > /dev/tcp/${PKG_CONN_HOST}/${PKG_CONN_PORT}" 2>/dev/null
    PROBE_RC=$?
    if [ $PROBE_RC -eq 0 ]; then
        SERVER_READY=1
        break
    fi
    if [ $PROBE_RC -eq 126 ] || [ $PROBE_RC -eq 127 ]; then
        echo -e "${YELLOW}  (cannot probe from peer container — no shell there; skipping TCP gate, relying on container state)${NC}"
        SERVER_PROBE_OK=0
        break
    fi
    sleep 2
done
if [ "$SERVER_PROBE_OK" -eq 1 ] && [ "$SERVER_READY" -ne 1 ]; then
    echo -e "${RED}✗ ${PKG_CONN_ADDR} (packaged connection.json address) not reachable from peer0.ecta after ~60s${NC}"
    echo -e "${RED}  The container is Up but its listener is not answering at the address the peer will dial — the server may still be starting, or it crashed after start.${NC}"
    echo -e "${RED}  Check: docker logs coffee-chaincode; ./diagnose-chaincode.sh${NC}"
    docker logs --tail 30 coffee-chaincode 2>&1 || true
    exit 1
fi
if [ "$SERVER_READY" -eq 1 ]; then
    echo -e "${GREEN}✓ Chaincode server rebuilt and reachable at ${PKG_CONN_ADDR} with the new package ID (TCP probe passed from peer0.ecta)${NC}"
elif [ "$SERVER_PROBE_OK" -eq 0 ]; then
    # Reached only via the 126/127 no-shell path in the loop above (the
    # in-loop warning already printed). The old code printed "✓ …
    # reachable" here unconditionally, claiming a probe that never ran.
    # Reachability from a peer is NOT proven in this case — only the
    # container state + package-ID match. The server-state gate below
    # is then the only pre-commit proof the server is really serving.
    echo -e "${YELLOW}⚠ Chaincode server rebuilt with the new package ID, but the TCP gate was SKIPPED (no shell in the peer container) — reachability from a peer is NOT proven; the server-state gate below is the only pre-commit proof${NC}"
fi
echo ""

# ── Server-state gate: the container must PROVE it started as the NEW ──
# ── server before any approve/commit (2026-11-20 host incident) ─────────
# "Container Up" + a passing TCP probe do NOT prove the server
# registered under the NEW package ID: on the host the probe succeeded
# (TCP connects) while the chaincode never registered and every query
# then hung 300 s. The server's own startup log is the proof: it
# prints its CCID, its TLS mode and its listening state on every start
# (chaincodes/coffee/main.go: "Starting Coffee Chaincode",
# "Chaincode configuration: CCID=…", "About to start chaincode server
# at …", "Chaincode server running..."). Require all three, against
# THIS run's PACKAGE_ID, from the LAST startup block in the log (a
# restarted container's log holds several blocks — only the last one
# is the running server). Also require the container itself to be
# healthy (running, never restarted since creation) and check the peer
# containers for proxy env vars: a proxied gRPC dial hangs exactly
# like the 300 s timeout while /dev/tcp succeeds, because the peer
# would route the dial through the proxy instead of the fabric
# network. (docker-compose-fabric.yml sets no proxy vars, so this is a
# guard against host-level injection.)
echo -e "${YELLOW}Checking chaincode server state (startup log + container health + peer proxy env)...${NC}"
SERVER_CONTAINER_ID=$(docker ps -q --filter "name=^coffee-chaincode$" 2>/dev/null | head -1)
if [ -z "$SERVER_CONTAINER_ID" ]; then
    echo -e "${RED}✗ FAIL: coffee-chaincode container is not running (docker ps found nothing)${NC}"
    exit 1
fi
SERVER_STATUS=$(docker inspect "$SERVER_CONTAINER_ID" --format '{{.State.Status}}' 2>/dev/null || echo "unknown")
SERVER_RESTARTS=$(docker inspect "$SERVER_CONTAINER_ID" --format '{{.RestartCount}}' 2>/dev/null || echo "unknown")
if [ "$SERVER_STATUS" != "running" ]; then
    echo -e "${RED}✗ FAIL: coffee-chaincode container status is '${SERVER_STATUS}', not 'running'${NC}"
    docker logs --tail 30 coffee-chaincode 2>&1 || true
    exit 1
fi
if [ "$SERVER_RESTARTS" != "0" ]; then
    echo -e "${RED}✗ FAIL: coffee-chaincode container has restarted ${SERVER_RESTARTS} time(s) since creation — the server crashed after start; its log below is from a crash loop, not a healthy start${NC}"
    docker logs --tail 30 coffee-chaincode 2>&1 || true
    exit 1
fi
SERVER_LOG=$(docker logs "$SERVER_CONTAINER_ID" 2>&1 || echo "")
if [ -z "$SERVER_LOG" ]; then
    echo -e "${RED}✗ FAIL: coffee-chaincode produced no log output at all — it never reached startup${NC}"
    exit 1
fi
# Last startup block only: everything from the last "Starting Coffee Chaincode" line.
SERVER_LAST_START=$(echo "$SERVER_LOG" | grep -n "Starting Coffee Chaincode" | tail -1 | cut -d: -f1)
if [ -z "$SERVER_LAST_START" ]; then
    echo -e "${RED}✗ FAIL: no 'Starting Coffee Chaincode' line in the server log — the server never started (log tail:)${NC}"
    echo "$SERVER_LOG" | tail -30
    exit 1
fi
SERVER_BLOCK=$(echo "$SERVER_LOG" | tail -n +"$SERVER_LAST_START")
# (a) CCID must be THIS run's package ID — an old ID means a stale server.
SERVER_CCID_LINE=$(echo "$SERVER_BLOCK" | grep "Chaincode configuration: CCID=" | tail -1 || echo "")
if [ -z "$SERVER_CCID_LINE" ]; then
    echo -e "${RED}✗ FAIL: no 'Chaincode configuration: CCID=…' line in the server log — the server never reached configuration${NC}"
    echo "$SERVER_BLOCK" | tail -30
    exit 1
fi
if ! echo "$SERVER_CCID_LINE" | grep -q "CCID=${PACKAGE_ID}"; then
    SERVER_CCID=$(echo "$SERVER_CCID_LINE" | grep -oP 'CCID=\K[^,]+' || echo "unparseable")
    echo -e "${RED}✗ FAIL: server started with CCID ${SERVER_CCID}, not this run's ${PACKAGE_ID} — a stale server is running; it will never serve the new definition${NC}"
    echo "$SERVER_BLOCK" | tail -30
    exit 1
fi
echo -e "${GREEN}✓ Server log shows CCID=${PACKAGE_ID}${NC}"
# (b) TLS mode must agree with the packaged connection.json.
if echo "$SERVER_BLOCK" | grep -q "TLS disabled for chaincode server"; then
    SERVER_TLS_MODE="disabled"
elif echo "$SERVER_BLOCK" | grep -q "TLS enabled for chaincode server"; then
    SERVER_TLS_MODE="enabled"
else
    SERVER_TLS_MODE="unknown"
fi
if [ "$SERVER_TLS_MODE" = "unknown" ]; then
    echo -e "${RED}✗ FAIL: no TLS state line ('TLS disabled…' / 'TLS enabled…') in the server log — the server's TLS mode cannot be proven${NC}"
    echo "$SERVER_BLOCK" | tail -30
    exit 1
fi
if [ "$PKG_CONN_TLS" = "false" ] && [ "$SERVER_TLS_MODE" = "enabled" ]; then
    echo -e "${RED}✗ FAIL: TLS DISAGREEMENT — packaged connection.json says tls_required:false (peer dials plaintext) but the server log says TLS enabled${NC}"
    echo "$SERVER_BLOCK" | tail -30
    exit 1
fi
if [ "$PKG_CONN_TLS" = "true" ] && [ "$SERVER_TLS_MODE" = "disabled" ]; then
    echo -e "${RED}✗ FAIL: TLS DISAGREEMENT — packaged connection.json says tls_required:true (peer dials TLS) but the server log says TLS disabled${NC}"
    echo "$SERVER_BLOCK" | tail -30
    exit 1
fi
echo -e "${GREEN}✓ Server TLS state (${SERVER_TLS_MODE}) agrees with packaged tls_required=${PKG_CONN_TLS}${NC}"
# (c) Startup failure / crash lines in the last block.
SERVER_CRASH_LINE=$(echo "$SERVER_BLOCK" | grep -iE "CRITICAL ERROR: server.Start\(\) failed|server.Start\(\) returned without error|panic:|FATAL|address already in use|bind: address" | head -1 || echo "")
if [ -n "$SERVER_CRASH_LINE" ]; then
    echo -e "${RED}✗ FAIL: server log shows a startup failure: ${SERVER_CRASH_LINE}${NC}"
    echo "$SERVER_BLOCK" | tail -30
    exit 1
fi
# (d) Listening evidence: "About to start…" is printed immediately
# before Start(); "Chaincode server running..." is printed by the
# monitor goroutine every 2 s once Start() is serving. Wait up to
# ~30 s for the running line — the TCP probe above already passed, so
# it should be there, but a just-started server may not have printed
# its first tick yet.
if ! echo "$SERVER_BLOCK" | grep -q "About to start chaincode server at"; then
    echo -e "${RED}✗ FAIL: no 'About to start chaincode server' line in the server log — the server never reached Start()${NC}"
    echo "$SERVER_BLOCK" | tail -30
    exit 1
fi
SERVER_RUNNING=0
for i in $(seq 1 15); do
    if docker logs "$SERVER_CONTAINER_ID" 2>&1 | grep -q "Chaincode server running..."; then
        SERVER_RUNNING=1
        break
    fi
    sleep 2
done
if [ "$SERVER_RUNNING" -ne 1 ]; then
    echo -e "${RED}✗ FAIL: no 'Chaincode server running...' line in the server log after ~30 s — Start() never reported serving (the TCP probe passed, but the server may be stuck before serving)${NC}"
    docker logs --tail 30 coffee-chaincode 2>&1 || true
    exit 1
fi
echo -e "${GREEN}✓ Server is running and serving (log shows 'Chaincode server running...')${NC}"
# (e) Proxy env on the peer containers: a set http(s)_proxy WITHOUT a
# NO_PROXY covering the fabric hostnames routes the peer's gRPC dial
# through the proxy, which hangs exactly like the 300 s timeout while
# /dev/tcp succeeds. The compose file sets no proxy vars; this guards
# against host-level injection (daemon/systemd env, --env-file).
PROXY_FAIL=0
for peer_name in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    PEER_ENV=$(docker inspect "$peer_name" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null || echo "")
    if [ -z "$PEER_ENV" ]; then
        echo -e "${YELLOW}  (could not inspect ${peer_name} — proxy check skipped for this peer)${NC}"
        continue
    fi
    PEER_NO_PROXY=$(echo "$PEER_ENV" | grep -i '^no_proxy=' | cut -d= -f2- | head -1 || echo "")
    for proxy_var in http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy; do
        PROXY_VAL=$(echo "$PEER_ENV" | grep "^${proxy_var}=" | cut -d= -f2- | head -1 || echo "")
        if [ -n "$PROXY_VAL" ]; then
            if echo "$PEER_NO_PROXY" | grep -q "coffee-chaincode" && echo "$PEER_NO_PROXY" | grep -q "cecbs.et"; then
                echo -e "${YELLOW}  ${peer_name}: ${proxy_var} is set but NO_PROXY covers coffee-chaincode + cecbs.et — dial bypasses the proxy${NC}"
            else
                echo -e "${RED}✗ FAIL: ${peer_name} has ${proxy_var}=${PROXY_VAL} but NO_PROXY (${PEER_NO_PROXY:-unset}) does not cover coffee-chaincode and the peer hostnames — the peer's gRPC dial to the chaincode server would go through the proxy and hang${NC}"
                PROXY_FAIL=1
            fi
        fi
    done
done
if [ "$PROXY_FAIL" -ne 0 ]; then
    echo -e "${RED}  Fix: unset the proxy vars on the peer containers, or set NO_PROXY to include coffee-chaincode and all peer hostnames (peer0.*.cecbs.et, orderer.cecbs.et) — then re-run.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Server-state gate passed: CCID + TLS + running + no uncovered proxy on any peer${NC}"
echo ""

# Approve for all organizations
echo -e "${YELLOW}Approving chaincode for all organizations...${NC}"
echo ""

# ECTA
echo -e "${YELLOW}Approving for ECTA...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ ECTA approved${NC}"

# ECX
echo -e "${YELLOW}Approving for ECX...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=ECXMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ ECX approved${NC}"

# Banks
echo -e "${YELLOW}Approving for Banks...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=BanksMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
    peer0.banks.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ Banks approved${NC}"

# NBE
echo -e "${YELLOW}Approving for NBE...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=NBEMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
    peer0.nbe.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ NBE approved${NC}"

# Customs
echo -e "${YELLOW}Approving for Customs...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=CustomsMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
    peer0.customs.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ Customs approved${NC}"

# Shipping
echo -e "${YELLOW}Approving for Shipping...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=ShippingMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
    peer0.shipping.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ Shipping approved${NC}"

echo ""

# Check commit readiness
echo -e "${YELLOW}Checking commit readiness...${NC}"
# No --signature-policy here, deliberately: approveformyorg/commit
# below also omit it, so the check asks about the definition that was
# actually approved (channel default policy). Passing AND(all 6) here
# made the host log report all-6-false while the commit succeeded
# (proven live on native, 2026-11-20, seq-28 experiment — see the
# comment at the top of this script). The check is informational: the
# commit below is the real gate, and it fails honestly if approvals
# are short. A false here is therefore a warning, not an exit.
READINESS_OUT=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel --name coffee --version ${VERSION} --sequence ${SEQUENCE} --output json 2>&1)
echo "$READINESS_OUT" | grep -A10 "approvals" || echo "$READINESS_OUT"
if echo "$READINESS_OUT" | grep -q "false"; then
    echo -e "${YELLOW}  ⚠ Readiness shows at least one org not yet approved for v${VERSION} seq ${SEQUENCE} (channel-default definition) — the commit below may fail; check the approvals above.${NC}"
fi

echo ""

# Commit chaincode
echo -e "${YELLOW}Committing chaincode v${VERSION} to channel (requires majority endorsement)...${NC}"
COMMIT_OUTPUT=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --sequence ${SEQUENCE} \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peer-orgs/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peer-orgs/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peer-orgs/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peer-orgs/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.customs.cecbs.et:11051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peer-orgs/customs.cecbs.et/peers/peer0.customs.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.shipping.cecbs.et:12051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peer-orgs/shipping.cecbs.et/peers/peer0.shipping.cecbs.et/tls/ca.crt 2>&1)
echo "$COMMIT_OUTPUT" | grep -E "committed with status|Error" || true
if ! echo "$COMMIT_OUTPUT" | grep -q "committed with status"; then
    echo -e "${RED}✗ Chaincode commit did not succeed — see output above${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Chaincode v${VERSION} committed${NC}"
echo ""

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 3

# The check must match THIS version and sequence: merely finding "a"
# committed version would pass even if the commit failed and the old
# definition (e.g. v2.2 seq 21) were still in place.
COMMITTED_INFO=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null || echo "")
if echo "$COMMITTED_INFO" | grep -q "Version: ${VERSION}" && echo "$COMMITTED_INFO" | grep -q "Sequence: ${SEQUENCE}"; then
    echo -e "${GREEN}✓ Deployment verified successfully (coffee v${VERSION}, sequence ${SEQUENCE})${NC}"
    # Record the source hash ONLY now that the deploy verified: writing it
    # before a failed deploy would make the next run think the code was
    # already deployed and skip the upgrade.
    chaincode_source_hash > "$CHAINCODE_DIR/.last_deployed"
    
    # Warm up chaincode containers to prevent timeout on first real transaction.
    # This is the first point in the deploy where a real query CAN succeed
    # (the new definition is committed, so the peer now expects the new
    # package ID the server registered under). It is therefore also the
    # real query-readiness gate: retry for ~90s — the server takes ~25s to
    # start and register — and FAIL the deploy if the query never succeeds,
    # instead of swallowing the failure and printing ✓. (The old warm-up
    # queried -C cecbschannel, which does not exist, so it could never
    # succeed and its failure was silently ignored.)
    echo ""
    echo -e "${YELLOW}Warming up chaincode containers (query readiness)...${NC}"
    # Peer choice matters: this query runs on peer0.ecta, NOT peer0.banks.
    # The host incident (2026-11-20) ran it on Banks and failed 9/9
    # after a VALID commit — Banks peer block commits take 188–300 s
    # (observed natively) vs ~400 ms on ECTA, so the new definition had
    # simply not landed on Banks yet when the query ran. ECTA is the
    # fastest peer to see the committed definition.
    # Budget: 6 attempts x 10 s (~60 s). Reduced from 12x15s to avoid long hangs.
    # The server takes ~25 s to start and register, the commit block lands on 
    # ECTA in ~400 ms. 60s is enough for normal startup but fails faster if broken.
    # Set SKIP_WARMUP=1 to skip this check entirely.
    WARMUP_OK=0
    WARMUP_OUT=""
    if [ "${SKIP_WARMUP}" = "1" ]; then
        echo -e "${YELLOW}  Skipping warm-up query (SKIP_WARMUP=1)${NC}"
        WARMUP_OK=1
    else
    for i in $(seq 1 6); do
        WARMUP_OUT=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
            -C coffeechannel -n coffee \
            -c '{"Args":["QueryAllLCs"]}' 2>&1)
        if [ $? -eq 0 ]; then
            WARMUP_OK=1
            echo -e "${GREEN}✓ Chaincode containers initialized (warm-up query succeeded on peer0.ecta, attempt $i/12)${NC}"
            break
        fi
        echo -e "${YELLOW}  Warm-up query attempt $i/6 failed; retrying in 10s...${NC}"
        [ $i -lt 6 ] && sleep 10
    done
    fi
    if [ "$WARMUP_OK" -ne 1 ]; then
        echo -e "${RED}✗ Warm-up query failed after 6 attempts (~60s) — the committed chaincode is not serving queries${NC}"
        echo -e "${RED}  Last query output (peer0.ecta, QueryAllLCs):${NC}"
        echo "$WARMUP_OUT"
        echo -e "${RED}  Chaincode server log (last 30 lines):${NC}"
        docker logs --tail 30 coffee-chaincode 2>&1 || true
        echo ""
        echo -e "${YELLOW}  Run: ./diagnose-chaincode.sh to debug${NC}"
        echo -e "${YELLOW}  Or: SKIP_WARMUP=1 ./deploy-chaincode.sh to skip this check${NC}"
        exit 1
    fi
    # Post-launch re-check of the release/ copy: release/ only exists
    # AFTER the first launch (see the pre-commit read-back above), so
    # this is the first point it can be read. A disagreement here
    # means the peer launched with a different address/TLS than the
    # package just installed — fail loudly instead of trusting the
    # warm-up query alone (it may have been served by a stale server
    # still registered under an older definition).
    RELEASE_CONN=$(docker exec peer0.ecta.cecbs.et cat "$PKG_BUILD_DIR/release/chaincode/server/connection.json" 2>/dev/null || echo "")
    if [ -n "$RELEASE_CONN" ]; then
        RELEASE_ADDR=$(echo "$RELEASE_CONN" | grep -oP '"address":\s*"\K[^"]+' || echo "")
        RELEASE_TLS=$(echo "$RELEASE_CONN" | grep -oP '"tls_required":\s*\K(true|false)' || echo "")
        if [ "$RELEASE_ADDR" != "$PKG_CONN_ADDR" ]; then
            echo -e "${RED}✗ FAIL: release/chaincode/server/connection.json address (${RELEASE_ADDR}) != packaged address (${PKG_CONN_ADDR}) after launch${NC}"
            exit 1
        fi
        if [ -n "$RELEASE_TLS" ] && [ "$RELEASE_TLS" != "$PKG_CONN_TLS" ]; then
            echo -e "${RED}✗ FAIL: release/chaincode/server/connection.json tls_required (${RELEASE_TLS}) != packaged tls_required (${PKG_CONN_TLS}) after launch${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Installed connection.json (release/, post-launch) matches the packaged address${NC}"
    else
        echo -e "${YELLOW}  (could not read back $PKG_BUILD_DIR/release/chaincode/server/connection.json after a successful warm-up query — the query itself proves the server is serving; the release/ check is skipped, not failed)${NC}"
    fi
else
    echo -e "${RED}✗ Deployment verification failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Chaincode deployment completed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

exit 0
