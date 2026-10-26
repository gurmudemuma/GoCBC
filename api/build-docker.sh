#!/bin/bash
set -e

echo "🐳 Building Docker image for cecbs-api..."
echo "=========================================="

cd "$(dirname "$0")"

# Step 1: Build TypeScript locally
echo ""
echo "📦 Step 1: Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ TypeScript build failed"
    exit 1
fi
echo "✅ TypeScript build complete"

# Step 2: Prune to production dependencies
echo ""
echo "🌳 Step 2: Pruning to production dependencies..."
npm prune --omit=dev --no-audit
echo "✅ Dependencies pruned"

# Step 3: Use appropriate dockerignore
echo ""
echo "📝 Step 3: Configuring dockerignore..."
cp .dockerignore.prebuild .dockerignore
echo "✅ dockerignore configured"

# Step 4: Build Docker image
echo ""
echo "🔨 Step 4: Building Docker image..."
docker build -f Dockerfile.prebuild -t cecbs-api:local .
if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo ""
echo "✅ Docker image built successfully!"
echo ""
echo "📊 Image details:"
docker images | grep cecbs-api | head -1

echo ""
echo "🚀 Next steps:"
echo "   docker-compose -f ../docker-compose-app.yml up -d cecbs-api"
