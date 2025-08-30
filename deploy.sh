#!/bin/bash

# Saros SDK Documentation Deployment Script
# This script builds and deploys the documentation site

set -e  # Exit on any error

echo "🚀 Starting Saros SDK Documentation Deployment"
echo "============================================="

# Check if we're in the correct directory
if [ ! -f "docusaurus.config.ts" ]; then
    echo "❌ Error: Not in the correct directory. Please run this script from the project root."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "16" ]; then
    echo "❌ Error: Node.js version 16 or higher is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run build
echo "🔨 Building documentation site..."
npm run build

# Verify build output
if [ ! -d "build" ]; then
    echo "❌ Error: Build directory not found. Build may have failed."
    exit 1
fi

echo "✅ Build completed successfully"

# Check for deployment method
DEPLOY_METHOD=${1:-"help"}

case $DEPLOY_METHOD in
    "vercel")
        echo "🚀 Deploying to Vercel..."
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo "📥 Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        # Deploy to Vercel
        if [ -n "$VERCEL_TOKEN" ]; then
            vercel --prod --token "$VERCEL_TOKEN" --yes
        else
            echo "⚠️  VERCEL_TOKEN not found, deploying with interactive login..."
            vercel --prod
        fi
        
        echo "✅ Deployed to Vercel successfully!"
        ;;
        
    "github-pages")
        echo "🚀 Preparing for GitHub Pages deployment..."
        
        # Create gh-pages branch if it doesn't exist
        if ! git show-ref --verify --quiet refs/heads/gh-pages; then
            git checkout --orphan gh-pages
            git rm -rf .
            git commit --allow-empty -m "Initial gh-pages commit"
            git checkout main
        fi
        
        # Deploy to gh-pages branch
        npx gh-pages -d build
        
        echo "✅ Pushed to gh-pages branch. Enable GitHub Pages in repository settings."
        ;;
        
    "netlify")
        echo "🚀 Deploying to Netlify..."
        
        # Check if Netlify CLI is installed
        if ! command -v netlify &> /dev/null; then
            echo "📥 Installing Netlify CLI..."
            npm install -g netlify-cli
        fi
        
        # Deploy to Netlify
        netlify deploy --prod --dir=build
        
        echo "✅ Deployed to Netlify successfully!"
        ;;
        
    "docker")
        echo "🐳 Building Docker image..."
        
        # Build Docker image
        docker build -t saros-docs:latest .
        
        # Option to run locally
        read -p "Run Docker container locally? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🌐 Starting local Docker container on port 8080..."
            docker run -p 8080:80 saros-docs:latest &
            echo "📖 Documentation available at: http://localhost:8080"
        fi
        ;;
        
    "static")
        echo "📁 Static file deployment preparation..."
        echo "📋 Build files are ready in the 'build' directory"
        echo "📤 Upload the contents of the 'build' folder to your static hosting provider"
        echo "🌐 Supported hosts: Nginx, Apache, AWS S3, GCP Storage, etc."
        ;;
        
    "test")
        echo "🧪 Testing built site locally..."
        
        # Install serve if not available
        if ! command -v serve &> /dev/null; then
            echo "📥 Installing serve..."
            npm install -g serve
        fi
        
        echo "🌐 Starting local test server on port 3000..."
        echo "📖 Open http://localhost:3000 to test the built site"
        echo "⏹️  Press Ctrl+C to stop the server"
        serve -s build -p 3000
        ;;
        
    "help"|*)
        echo "📖 Saros SDK Documentation Deployment Help"
        echo ""
        echo "Usage: ./deploy.sh [METHOD]"
        echo ""
        echo "Available deployment methods:"
        echo "  vercel         Deploy to Vercel (recommended)"
        echo "  github-pages   Deploy to GitHub Pages"  
        echo "  netlify        Deploy to Netlify"
        echo "  docker         Build Docker image"
        echo "  static         Prepare for static hosting"
        echo "  test           Test built site locally"
        echo "  help           Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./deploy.sh vercel          # Deploy to Vercel"
        echo "  ./deploy.sh test            # Test locally"
        echo "  ./deploy.sh static          # Prepare static files"
        echo ""
        echo "Environment Variables:"
        echo "  VERCEL_TOKEN               Vercel deployment token"
        echo "  NETLIFY_AUTH_TOKEN         Netlify authentication token"
        echo "  ALGOLIA_APP_ID            Algolia application ID"
        echo "  ALGOLIA_API_KEY           Algolia search API key"
        echo ""
        echo "For more detailed instructions, see SETUP.md"
        ;;
esac

echo ""
echo "🎉 Deployment script completed!"
echo "📚 Documentation: https://saros-docs.rectorspace.com"
echo "🔗 Repository: https://github.com/rz1989s/saros-docs"