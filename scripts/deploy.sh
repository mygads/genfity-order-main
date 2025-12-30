#!/bin/bash
# ============================================
# GENFITY - Deployment Script
# Run this after setup-server.sh
# ============================================

set -e

echo "🚀 Starting Genfity Deployment..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.production to .env and configure it."
    exit 1
fi

# Create necessary directories
mkdir -p certbot/conf certbot/www nginx/conf.d

# Use initial HTTP-only config for first deployment
echo "📝 Setting up initial Nginx config (HTTP only)..."
cp nginx/conf.d/default.conf nginx/conf.d/active.conf

# Build and start containers
echo "🐳 Building and starting Docker containers..."
sudo docker compose down --remove-orphans 2>/dev/null || true
sudo docker compose build --no-cache
sudo docker compose up -d db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
sudo docker compose run --rm app npx prisma db push --accept-data-loss

# Start all services
echo "🚀 Starting all services..."
sudo docker compose up -d

# Check container status
echo ""
echo "📊 Container Status:"
sudo docker compose ps

echo ""
echo "============================================"
echo "✅ Initial deployment complete!"
echo "============================================"
echo ""
echo "Your app is now running at: http://$(curl -s ifconfig.me)"
echo ""
echo "Next steps:"
echo "1. Point your DNS (order.genfity.com) to: $(curl -s ifconfig.me)"
echo "2. Wait for DNS propagation (5-30 minutes)"
echo "3. Run: ./ssl-setup.sh to obtain SSL certificates"
echo ""
