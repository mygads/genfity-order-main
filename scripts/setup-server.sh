#!/bin/bash
# ============================================
# GENFITY - Server Setup & Deployment Script
# Run this script on the GCP VM
# ============================================

set -e

echo "🚀 Starting Genfity Server Setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Install Git
echo "📂 Installing Git..."
sudo apt-get install -y git

# Clone repository
echo "📥 Cloning Genfity repository..."
cd /home/$USER
if [ -d "genfity-online-ordering" ]; then
    echo "Repository already exists, pulling latest..."
    cd genfity-online-ordering
    git pull origin main
else
    git clone https://github.com/mygads/genfity-online-ordering.git
    cd genfity-online-ordering
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p certbot/conf certbot/www

# Copy environment file
echo "⚙️ Setting up environment..."
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "✅ Environment file created from .env.production"
else
    echo "⚠️ .env.production not found. Please create .env manually!"
fi

echo ""
echo "============================================"
echo "✅ Basic setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual credentials"
echo "2. Run: ./deploy.sh"
echo ""
