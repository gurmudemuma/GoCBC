#!/bin/bash
# Start all required services for GoCBC

echo "🚀 Starting GoCBC System..."
echo "====================================="
echo ""

# 1. Start PostgreSQL
echo "1️⃣  Starting PostgreSQL..."
if command -v systemctl &> /dev/null; then
  sudo systemctl start postgresql
  echo "✅ PostgreSQL started (systemd)"
elif command -v brew &> /dev/null; then
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
  echo "✅ PostgreSQL started (Homebrew)"
elif command -v pg_ctl &> /dev/null; then
  pg_ctl -D /usr/local/var/postgresql@14 start 2>/dev/null || pg_ctl -D /usr/local/var/postgres start 2>/dev/null
  echo "✅ PostgreSQL started (pg_ctl)"
else
  echo "❌ Could not find PostgreSQL"
fi

sleep 2

# Test PostgreSQL connection
if psql -U postgres -d cecbs -c "SELECT 1" &> /dev/null; then
  echo "✅ PostgreSQL is running and accessible"
else
  echo "⚠️  PostgreSQL may not be running correctly"
  echo "   Try: brew services start postgresql@14"
  echo "   Or: sudo systemctl start postgresql"
fi

echo ""

# 2. Check CouchDB
echo "2️⃣  Checking CouchDB..."
if curl -s http://localhost:5984 &> /dev/null; then
  echo "✅ CouchDB is running"
else
  echo "❌ CouchDB is not running"
  echo "   Start with: brew services start couchdb"
  echo "   Or: sudo systemctl start couchdb"
fi

echo ""

# 3. Check if API is running
echo "3️⃣  Checking API Server..."
if curl -s http://localhost:3001/api/v1/health &> /dev/null; then
  echo "✅ API server is running"
else
  echo "⚠️  API server may not be running"
  echo "   Start with: cd api && npm start &"
fi

echo ""

# 4. Check if UI is running
echo "4️⃣  Checking UI Server..."
if curl -s http://localhost:3000 &> /dev/null; then
  echo "✅ UI server is running"
else
  echo "⚠️  UI server may not be running"
  echo "   Start with: cd ui && npm run dev &"
fi

echo ""
echo "====================================="
echo "📋 System Status Summary"
echo "====================================="
echo ""
echo "Access points:"
echo "  🌐 UI:  http://localhost:3000"
echo "  🔌 API: http://localhost:3001"
echo "  💾 DB:  localhost:5432 (PostgreSQL)"
echo "  📊 CouchDB: http://localhost:5984"
echo ""
echo "====================================="
