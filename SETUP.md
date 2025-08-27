# Saros Documentation Setup Guide

This guide explains how to set up the complete Saros SDK documentation site, including search functionality, deployment, and maintenance.

## 🔍 Setting Up Algolia DocSearch

The documentation site is configured to use Algolia DocSearch for powerful search capabilities. Follow these steps to enable search:

### 1. Apply for DocSearch

1. Visit [Algolia DocSearch Application](https://docsearch.algolia.com/apply/)
2. Fill out the form with these details:
   - **Website URL**: `https://saros-docs.rectorspace.com`
   - **GitHub Repository**: `https://github.com/saros-xyz/saros-sdk-docs` (or your repo)
   - **Email**: Your contact email
   - **Documentation Type**: Technical documentation for developers

3. Submit the application and wait for approval (typically 1-2 weeks)

### 2. Configure Algolia Credentials

Once approved, you'll receive:
- Application ID (`appId`)
- Search API Key (`apiKey`) 
- Index Name (`indexName`)

Update the configuration in `docusaurus.config.ts`:

```typescript
algolia: {
  appId: 'YOUR_ACTUAL_APP_ID',           // Replace with provided App ID
  apiKey: 'YOUR_ACTUAL_SEARCH_API_KEY',  // Replace with provided API key
  indexName: 'saros-sdk-docs',           // Confirm index name with Algolia
  contextualSearch: true,
  searchPagePath: 'search',
},
```

### 3. Test Search Functionality

After configuration:

1. Build the site: `npm run build`
2. Serve locally: `npm run serve`
3. Test the search bar in the navbar
4. Verify search results are relevant and up-to-date

### 4. Alternative: Local Search Plugin

If you prefer not to use Algolia or want to get started immediately, use the local search plugin:

```bash
npm install @easyops-cn/docusaurus-search-local
```

```typescript
// In docusaurus.config.ts
plugins: [
  [
    require.resolve('@easyops-cn/docusaurus-search-local'),
    {
      hashed: true,
      language: ['en'],
      indexDocs: true,
      indexBlog: false,
      indexPages: false,
      docsRouteBasePath: '/docs',
    },
  ],
],
```

## 🚀 Deployment Configuration

### Deploy to saros-docs.rectorspace.com

The site is configured to deploy to `saros-docs.rectorspace.com`. Here's how to set it up:

#### Option 1: Vercel Deployment (Recommended)

1. **Connect Repository**:
   - Create GitHub repository for the documentation
   - Connect to Vercel at [vercel.com](https://vercel.com)
   - Import the project

2. **Configure Custom Domain**:
   ```bash
   # In Vercel dashboard, add custom domain:
   saros-docs.rectorspace.com
   ```

3. **Environment Variables**:
   ```
   ALGOLIA_APP_ID=your_app_id
   ALGOLIA_API_KEY=your_api_key
   ```

4. **Build Settings**:
   ```
   Build Command: npm run build
   Output Directory: build
   Install Command: npm install
   ```

#### Option 2: Self-hosted Deployment

```bash
# Install dependencies
npm install

# Build the site
npm run build

# The build folder can be served by any static host
# Example with nginx:
sudo cp -r build/* /var/www/saros-docs/
```

#### Option 3: GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

env:
  NODE_VERSION: 18

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build website
        run: npm run build
        
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: build

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### DNS Configuration

For the custom domain `saros-docs.rectorspace.com`:

```
# DNS Records (add to your DNS provider)
Type: CNAME
Name: saros-docs
Value: your-vercel-deployment.vercel.app

# Or for self-hosted:
Type: A
Name: saros-docs  
Value: YOUR_SERVER_IP
```

## 📦 Installation and Setup

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/saros-docs
cd saros-docs

# Install dependencies
npm install

# Start development server
npm run start

# Open browser to http://localhost:3000
```

### Production Build

```bash
# Create production build
npm run build

# Test production build locally
npm run serve

# Deploy build folder to your hosting provider
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build and run Docker container
docker build -t saros-docs .
docker run -p 80:80 saros-docs
```

## 🔧 Development Tools

### VS Code Extensions

Recommended extensions for editing the documentation:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode", 
    "ms-vscode.vscode-json",
    "yzhang.markdown-all-in-one",
    "davidanson.vscode-markdownlint",
    "rust-lang.rust-analyzer"
  ]
}
```

### Pre-commit Hooks

```bash
# Install husky for git hooks
npm install --save-dev husky lint-staged

# Setup pre-commit formatting
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
// package.json
{
  "lint-staged": {
    "**/*.{ts,tsx,js,jsx,md,mdx}": [
      "prettier --write",
      "git add"
    ],
    "**/*.{ts,tsx}": [
      "eslint --fix",
      "git add"
    ]
  }
}
```

## 📝 Content Guidelines

### Writing Documentation

1. **Use clear headings** for navigation
2. **Include code examples** for every concept
3. **Add troubleshooting sections** for complex topics
4. **Cross-reference related topics** with links
5. **Keep examples working** and test regularly

### Code Example Standards

```typescript
// ✅ Good: Complete, runnable example
import { Connection, PublicKey } from '@solana/web3.js';
import { SarosSDK } from '@saros-finance/sdk';

async function swapTokens() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const sdk = new SarosSDK(connection);
  
  try {
    const quote = await sdk.getQuote({
      inputMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      outputMint: new PublicKey('So11111111111111111111111111111111111111112'),
      amount: 1000000, // 1 USDC
      slippageBps: 100 // 1%
    });
    
    console.log('Output amount:', quote.outAmount);
    return quote;
  } catch (error) {
    console.error('Swap failed:', error);
    throw error;
  }
}
```

```typescript
// ❌ Bad: Incomplete, non-runnable example
const quote = sdk.getQuote(params);
console.log(quote.outAmount);
```

## 🧪 Testing Documentation

### Link Testing

```bash
# Install markdown link checker
npm install --save-dev markdown-link-check

# Check all markdown files
find docs -name "*.md" -exec markdown-link-check {} \;
```

### Code Example Testing

```typescript
// test/docs-examples.test.ts
import { describe, it, expect } from '@jest/globals';

describe('Documentation Examples', () => {
  it('should have working basic swap example', async () => {
    // Extract and test code from docs/examples/basic-token-swap.md
    // This ensures examples stay working
  });
  
  it('should have valid TypeScript in all code blocks', () => {
    // Parse all .md files and validate TypeScript code blocks
  });
});
```

## 🔐 Security Considerations

### Protecting Sensitive Information

1. **Never commit private keys** in documentation
2. **Use placeholder addresses** in examples
3. **Sanitize user inputs** in interactive components  
4. **Validate all API calls** before execution

### Safe Example Practices

```typescript
// ✅ Good: Use placeholder or environment variables
const EXAMPLE_WALLET = new PublicKey('11111111111111111111111111111112'); // System program
const wallet = process.env.WALLET_PRIVATE_KEY 
  ? Keypair.fromSecretKey(/* load from env */)
  : EXAMPLE_WALLET;

// ❌ Bad: Never include real private keys
const wallet = Keypair.fromSecretKey([1,2,3,4,...]); // Real private key
```

## 📊 Analytics and Monitoring

### Google Analytics Setup

```typescript
// In docusaurus.config.ts
module.exports = {
  plugins: [
    [
      '@docusaurus/plugin-google-gtag',
      {
        trackingID: 'G-XXXXXXXXXX',
        anonymizeIP: true,
      },
    ],
  ],
};
```

### Performance Monitoring

```typescript
// Add to src/theme/Layout/index.js
import { useEffect } from 'react';

export default function Layout(props) {
  useEffect(() => {
    // Track page load performance
    if (typeof window !== 'undefined' && window.performance) {
      const loadTime = window.performance.timing.loadEventEnd - 
                      window.performance.timing.navigationStart;
      
      console.log('Page load time:', loadTime, 'ms');
      
      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'page_load_time', {
          value: loadTime,
          metric_id: 'docs_performance'
        });
      }
    }
  }, []);
  
  return <OriginalLayout {...props} />;
}
```

## 🔄 Maintenance

### Regular Tasks

#### Weekly
- [ ] Check for broken links
- [ ] Test all code examples
- [ ] Review and respond to community feedback
- [ ] Update dependencies

#### Monthly  
- [ ] Review analytics data
- [ ] Update SDK version compatibility
- [ ] Refresh performance benchmarks
- [ ] Check search functionality

#### Quarterly
- [ ] Major content review and updates
- [ ] SEO optimization review
- [ ] User experience improvements
- [ ] Performance audit

### Automated Maintenance

```yaml
# .github/workflows/maintenance.yml
name: Documentation Maintenance

on:
  schedule:
    - cron: '0 0 * * 1' # Weekly on Monday

jobs:
  link-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check links
        uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          use-quiet-mode: 'yes'
          
  dependency-update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update dependencies
        run: |
          npm update
          npm audit fix
          git commit -am "Update dependencies" || exit 0
```

---

This setup guide ensures the Saros documentation site is properly configured, deployed, and maintained for optimal developer experience. Follow the steps in order and customize as needed for your specific requirements.