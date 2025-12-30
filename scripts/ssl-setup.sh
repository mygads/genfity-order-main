#!/bin/bash
# ============================================
# GENFITY - SSL Certificate Setup Script
# Run this after DNS is configured and propagated
# ============================================

set -e

DOMAIN="order.genfity.com"
EMAIL="admin@genfity.com"

echo "🔒 Setting up SSL certificates for $DOMAIN..."

# Check if domain resolves to this server
echo "🔍 Checking DNS resolution..."
EXPECTED_IP=$(curl -s ifconfig.me)
ACTUAL_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$EXPECTED_IP" != "$ACTUAL_IP" ]; then
    echo "⚠️ Warning: DNS may not be properly configured!"
    echo "Expected IP: $EXPECTED_IP"
    echo "Resolved IP: $ACTUAL_IP"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Make sure certbot directories exist
mkdir -p certbot/conf certbot/www

# Stop nginx temporarily
echo "🔄 Stopping Nginx for certificate request..."
sudo docker compose stop nginx

# Request SSL certificate
echo "📜 Requesting SSL certificate..."
sudo docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN \
    -d www.$DOMAIN

# Check if certificate was obtained
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL certificate obtained successfully!"
    
    # Switch to HTTPS config
    echo "📝 Switching to HTTPS configuration..."
    cp nginx/conf.d/genfity.conf nginx/conf.d/active.conf
    rm nginx/conf.d/default.conf 2>/dev/null || true
    
    # Restart nginx with SSL
    echo "🔄 Restarting Nginx with SSL..."
    sudo docker compose up -d nginx
    
    echo ""
    echo "============================================"
    echo "✅ SSL setup complete!"
    echo "============================================"
    echo ""
    echo "Your app is now available at:"
    echo "  https://$DOMAIN"
    echo "  https://www.$DOMAIN"
    echo ""
    echo "SSL certificates will auto-renew via certbot container."
    echo ""
else
    echo "❌ Failed to obtain SSL certificate!"
    echo "Please check the certbot logs for details."
    
    # Restart nginx without SSL
    sudo docker compose up -d nginx
    exit 1
fi
