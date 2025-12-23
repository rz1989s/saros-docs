# Saros SDK Documentation

> Comprehensive developer documentation for Saros Finance SDKs on Solana

[![1st Place](https://img.shields.io/badge/Saros%20SDK%20Guide%20Challenge-1st%20Place%20%F0%9F%8F%86-gold)](https://saros-docs.rectorspace.com)
[![Deploy Status](https://img.shields.io/badge/deploy-automated-brightgreen)](https://github.com/saros-xyz/saros-sdk-docs/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D16-brightgreen)](https://nodejs.org/)

**Live Site**: [saros-docs.rectorspace.com](https://saros-docs.rectorspace.com)

## Award

**1st Place Winner** - Saros SDK Guide Challenge (December 2024) - 300 USDC

This documentation site provides comprehensive guides, tutorials, and API references for all Saros Finance SDKs, built with [Docusaurus 3](https://docusaurus.io/).

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/rz1989s/saros-docs.git
cd saros-docs

# Install dependencies
npm install

# Start development server
npm start

# Open http://localhost:3000
```

## 📚 What's Included

### 📖 Documentation Sections

- **Getting Started**: SDK overview, installation, and quick start guides
- **TypeScript SDK**: Complete guide for `@saros-finance/sdk`
- **DLMM SDK**: Concentrated liquidity with `@saros-finance/dlmm-sdk`  
- **Rust SDK**: High-performance DLMM with `saros-dlmm-sdk-rs`
- **Tutorials**: Step-by-step guides for building DeFi applications
- **Examples**: 6 complete, working code examples with tests
- **Tools**: Interactive API explorer for testing SDK methods

### 🛠️ Features

- **Interactive API Explorer**: Test Saros SDK methods directly in browser
- **Comprehensive Examples**: Working code for swaps, LP management, arbitrage, etc.
- **Multi-SDK Support**: Coverage of TypeScript, DLMM, and Rust SDKs
- **Search Functionality**: Powered by Algolia DocSearch
- **Responsive Design**: Mobile-friendly documentation
- **Dark Mode**: Full dark theme support
- **Performance Optimized**: Fast loading and excellent SEO

## 🔧 Development

### Requirements

- Node.js 18+ 
- npm or yarn
- Git

### Development Workflow

```bash
# Start development with hot reload
npm run dev

# Build for production
npm run build

# Test production build locally
npm run serve:build

# Type checking
npm run typecheck

# Linting and formatting
npm run lint:fix
npm run format

# Check for broken links
npm run test:links
```

## 🚀 Deployment

### Automated Deployment (Recommended)

The site automatically deploys via GitHub Actions on every push to main:

- **Vercel**: Primary deployment target
- **GitHub Pages**: Fallback deployment
- **Performance Testing**: Lighthouse CI integration

### Manual Deployment Options

#### Deploy to Vercel
```bash
npm run deploy:vercel
```

#### Deploy to Netlify  
```bash
npm run deploy:netlify
```

#### Deploy to GitHub Pages
```bash
npm run deploy:github
```

#### Docker Deployment
```bash
# Build and run production container
npm run docker:build
npm run docker:run

# Or use docker-compose
docker-compose --profile prod up -d
```

## 🔍 Search Configuration

The site supports Algolia DocSearch. See `SETUP.md` for configuration instructions.

## 📞 Support

- 💬 **Developer Support**: [Telegram](https://t.me/+DLLPYFzvTzJmNTJh)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/saros-xyz/saros-sdk-docs/issues)
- 🔗 **Saros Finance**: [saros.xyz](https://saros.xyz)

---

**Built with ❤️ by the Saros Finance team and community contributors.**
