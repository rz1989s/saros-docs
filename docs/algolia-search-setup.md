# Algolia Search Configuration Guide

This guide explains how to configure Algolia DocSearch for the Saros SDK documentation site to enable powerful search functionality.

## Overview

Algolia DocSearch provides fast, typo-tolerant search for documentation sites. The Saros SDK documentation is pre-configured to work with Algolia, requiring only credential setup.

## Prerequisites

- **Live Documentation Site**: Your documentation must be publicly accessible
- **Algolia Account**: Free DocSearch program application  
- **Domain Ownership**: Must own the domain where docs are hosted

## Step 1: Apply for Algolia DocSearch

### Application Process

1. Visit the [Algolia DocSearch Application](https://docsearch.algolia.com/apply/)
2. Fill out the application form with these details:

```
Website URL: https://saros-docs.rectorspace.com
Email: your-email@example.com
Repository: https://github.com/saros-xyz/saros-docs
Description: Comprehensive documentation for Saros Finance SDKs on Solana, 
including TypeScript, DLMM, and Rust SDKs with examples and tutorials.
```

3. **Important Requirements**:
   - Site must be **publicly accessible** (not behind authentication)
   - Must be **production ready** (not development/staging)  
   - Content should be **documentation** (not marketing pages)
   - Must have **substantial content** (multiple pages)

### Application Tips

- **Response Time**: Applications typically processed within 1-2 weeks
- **Auto-Approval**: Technical documentation sites are usually auto-approved
- **Follow-up**: Check email for approval notification and next steps

## Step 2: Environment Configuration

### Development Environment

Create environment files for different stages:

```bash
# .env.development
ALGOLIA_APP_ID=your_dev_app_id
ALGOLIA_SEARCH_API_KEY=your_dev_search_key
ALGOLIA_INDEX_NAME=saros-docs-dev
ALGOLIA_DEBUG=true
NODE_ENV=development
```

```bash
# .env.production  
ALGOLIA_APP_ID=your_production_app_id
ALGOLIA_SEARCH_API_KEY=your_production_search_key
ALGOLIA_INDEX_NAME=saros-docs
ALGOLIA_DEBUG=false
NODE_ENV=production
```

### Platform-Specific Configuration

#### Vercel Deployment
```bash
# Set environment variables in Vercel dashboard or CLI
vercel env add ALGOLIA_APP_ID production
# Enter your Algolia App ID when prompted

vercel env add ALGOLIA_SEARCH_API_KEY production  
# Enter your Algolia Search API Key when prompted

vercel env add ALGOLIA_INDEX_NAME production
# Enter: saros-docs
```

#### Netlify Deployment
```bash
# Using Netlify CLI
netlify env:set ALGOLIA_APP_ID your_production_app_id
netlify env:set ALGOLIA_SEARCH_API_KEY your_production_search_key
netlify env:set ALGOLIA_INDEX_NAME saros-docs

# Or configure in Netlify dashboard:
# Site settings → Environment variables → Add variable
```

#### GitHub Actions / Other CI/CD
```yaml
# .github/workflows/deploy.yml
env:
  ALGOLIA_APP_ID: ${{ secrets.ALGOLIA_APP_ID }}
  ALGOLIA_SEARCH_API_KEY: ${{ secrets.ALGOLIA_SEARCH_API_KEY }}
  ALGOLIA_INDEX_NAME: saros-docs
```

## Step 3: Received Credentials Setup

### Understanding Algolia Credentials

When approved, you'll receive:

1. **Application ID** (e.g., `BH4D9OD16A`)
   - Public identifier for your Algolia application
   - Safe to include in client-side code
   
2. **Search API Key** (e.g., `25626fae796133dc1fb2c62b85c77cb5`)
   - Public key for search operations only
   - Safe to expose in frontend code
   - Cannot modify index data

3. **Admin API Key** (Secret - DO NOT COMMIT)
   - Private key for index management
   - Used only for crawler configuration
   - Keep secure, never expose publicly

4. **Index Name** (e.g., `saros-docs`)
   - Name of your search index
   - Usually matches your site name

### Credential Validation

Test your credentials with this script:

```javascript
// scripts/test-algolia.js
const algoliasearch = require('algoliasearch/lite');

async function testAlgoliaConnection() {
  const client = algoliasearch(
    process.env.ALGOLIA_APP_ID,
    process.env.ALGOLIA_SEARCH_API_KEY
  );
  
  const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME);
  
  try {
    // Test search functionality
    const { hits } = await index.search('SDK');
    console.log(`✅ Algolia connection successful: ${hits.length} results found`);
    return true;
  } catch (error) {
    console.error(`❌ Algolia connection failed: ${error.message}`);
    return false;
  }
}

testAlgoliaConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  });
```

Run the test:
```bash
npm install algoliasearch
ALGOLIA_APP_ID=your_app_id ALGOLIA_SEARCH_API_KEY=your_search_key ALGOLIA_INDEX_NAME=your_index node scripts/test-algolia.js
```

## Step 4: Advanced Search Configuration

### Custom DocSearch Configuration

Create `.algolia/config.json` for the crawler:

```json
{
  "index_name": "saros-docs",
  "start_urls": [
    {
      "url": "https://saros-docs.rectorspace.com/docs/",
      "selectors_key": "docs",
      "tags": ["documentation"],
      "page_rank": 3
    },
    {
      "url": "https://saros-docs.rectorspace.com/docs/examples/",
      "selectors_key": "examples", 
      "tags": ["examples"],
      "page_rank": 2
    },
    {
      "url": "https://saros-docs.rectorspace.com/docs/tutorials/",
      "selectors_key": "tutorials",
      "tags": ["tutorials"], 
      "page_rank": 2
    }
  ],
  "sitemap_urls": [
    "https://saros-docs.rectorspace.com/sitemap.xml"
  ],
  "selectors": {
    "docs": {
      "lvl0": {
        "selector": ".markdown h1",
        "default_value": "Documentation"
      },
      "lvl1": ".markdown h2",
      "lvl2": ".markdown h3", 
      "lvl3": ".markdown h4",
      "lvl4": ".markdown h5",
      "lvl5": ".markdown h6",
      "text": ".markdown p, .markdown li, .markdown td:not(.property)"
    },
    "examples": {
      "lvl0": {
        "selector": ".markdown h1",
        "default_value": "Examples"
      },
      "lvl1": ".markdown h2",
      "lvl2": ".markdown h3",
      "text": ".markdown p, .markdown li, .markdown code"
    },
    "tutorials": {
      "lvl0": {
        "selector": ".markdown h1", 
        "default_value": "Tutorials"
      },
      "lvl1": ".markdown h2",
      "lvl2": ".markdown h3",
      "text": ".markdown p, .markdown li"
    }
  },
  "selectors_exclude": [
    ".hash-link",
    ".anchor", 
    ".table-of-contents",
    ".navbar",
    ".footer",
    ".breadcrumbs",
    "nav",
    "footer"
  ],
  "custom_settings": {
    "attributesForFaceting": [
      "type",
      "lang", 
      "language",
      "version",
      "sdk",
      "tags"
    ],
    "attributesToRetrieve": [
      "hierarchy",
      "content",
      "anchor", 
      "url",
      "type",
      "tags"
    ],
    "attributesToHighlight": [
      "hierarchy",
      "content"
    ],
    "attributesToSnippet": [
      "content:20"
    ],
    "camelCaseAttributes": [
      "hierarchy"
    ],
    "searchableAttributes": [
      "unordered(hierarchy.lvl0)",
      "unordered(hierarchy.lvl1)",
      "unordered(hierarchy.lvl2)",
      "unordered(hierarchy.lvl3)",
      "unordered(hierarchy.lvl4)",
      "unordered(hierarchy.lvl5)",
      "content"
    ],
    "distinct": true,
    "attributeForDistinct": "url",
    "customRanking": [
      "desc(weight.page_rank)",
      "desc(weight.level)",
      "asc(weight.position)"
    ],
    "ranking": [
      "words",
      "filters",
      "typo", 
      "attribute",
      "proximity",
      "exact",
      "custom"
    ],
    "highlightPreTag": "<span class='algolia-docsearch-suggestion--highlight'>",
    "highlightPostTag": "</span>",
    "minWordSizefor1Typo": 3,
    "minWordSizefor2Typos": 7,
    "allowTyposOnNumericTokens": false,
    "minProximity": 1,
    "ignorePlurals": true,
    "advancedSyntax": true,
    "analytics": true,
    "enableRules": true
  }
}
```

### Search Analytics Configuration

Enable search analytics to understand user behavior:

```javascript
// src/theme/SearchBar/index.js (if customizing)
import {useAlgoliaContextualFacetFilters} from '@docusaurus/theme-search-algolia/client';
import {useSearchPage} from '@docusaurus/theme-search-algolia/client';

// Custom search analytics
function trackSearchEvent(query, results) {
  // Track search queries for improvement
  if (typeof gtag !== 'undefined') {
    gtag('event', 'search', {
      search_term: query,
      results_count: results.length
    });
  }
  
  // Send to Algolia Insights
  if (window.aa) {
    window.aa('trackSearch', {
      query,
      results: results.length
    });
  }
}
```

## Step 5: Testing and Validation

### Local Testing

Test Algolia integration locally:

```bash
# Set test credentials
export ALGOLIA_APP_ID=your_test_app_id
export ALGOLIA_SEARCH_API_KEY=your_test_search_key
export ALGOLIA_INDEX_NAME=saros-docs-test
export ALGOLIA_DEBUG=true

# Start development server
npm run dev

# Test search functionality in browser
open http://localhost:3000
```

### Production Testing

Validate production search:

```bash
# Test production search API
curl -X POST \
  "https://your_app_id-dsn.algolia.net/1/indexes/saros-docs/query" \
  -H "X-Algolia-Application-Id: YOUR_APP_ID" \
  -H "X-Algolia-API-Key: YOUR_SEARCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SDK",
    "hitsPerPage": 5
  }'
```

### Search Quality Testing

Test search quality with these queries:

```bash
# Test SDK-specific searches
- "typescript sdk installation"
- "DLMM position management"  
- "rust trading bot example"
- "swap tokens tutorial"
- "liquidity farming guide"

# Test code-specific searches
- "createPosition"
- "swapExactInput"
- "addLiquidity" 
- "removeLiquidity"
- "getPoolData"

# Test error handling searches
- "error handling"
- "try catch"
- "Result type"
- "unwrap_or"
```

## Step 6: Advanced Features

### Custom Search UI

Customize search appearance:

```css
/* src/css/custom.css */

/* Algolia search styling */
.DocSearch {
  --docsearch-primary-color: #667eea;
  --docsearch-text-color: #1c1e21;
  --docsearch-muted-color: #969faf;
  --docsearch-container-background: rgba(101, 108, 133, 0.8);
}

/* Custom search highlight */
.search-highlight {
  background: linear-gradient(90deg, #667eea33, #764ba233);
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 600;
}

/* SDK-specific search styling */
.algolia-docsearch-suggestion--wrapper {
  border-radius: 6px;
}

.algolia-docsearch-suggestion--subcategory-column {
  font-weight: 600;
}

/* Search modal customization */
.DocSearch-Modal {
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.DocSearch-SearchBar {
  border-radius: 8px;
}
```

### Search Result Tracking

Track search performance:

```javascript
// src/components/SearchAnalytics.js
import { useEffect } from 'react';

export function SearchAnalytics() {
  useEffect(() => {
    // Track search modal opens
    const searchButton = document.querySelector('.DocSearch-Button');
    if (searchButton) {
      searchButton.addEventListener('click', () => {
        // Track search modal open
        if (typeof gtag !== 'undefined') {
          gtag('event', 'search_modal_open', {
            event_category: 'search',
            event_label: 'docsearch'
          });
        }
      });
    }

    // Track search queries
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const searchInput = document.querySelector('.DocSearch-Input');
          if (searchInput && !searchInput.dataset.tracked) {
            searchInput.dataset.tracked = 'true';
            
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
              clearTimeout(searchTimeout);
              searchTimeout = setTimeout(() => {
                if (e.target.value.length >= 3) {
                  // Track meaningful search queries
                  if (typeof gtag !== 'undefined') {
                    gtag('event', 'search_query', {
                      event_category: 'search',
                      event_label: e.target.value.length > 50 
                        ? e.target.value.substring(0, 50) + '...'
                        : e.target.value
                    });
                  }
                }
              }, 500);
            });
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
```

## Step 7: Monitoring and Optimization

### Search Analytics Dashboard

Monitor search performance:

1. **Algolia Dashboard**: View search analytics at https://www.algolia.com/apps/YOUR_APP_ID/analytics
2. **Top Searches**: Identify most common search queries
3. **No Results**: Find queries that return no results
4. **Click-Through Rate**: Measure search result effectiveness

### Search Index Optimization

Optimize your search index:

```javascript
// scripts/optimize-search-index.js
const algoliasearch = require('algoliasearch');

async function optimizeSearchIndex() {
  const client = algoliasearch(
    process.env.ALGOLIA_APP_ID,
    process.env.ALGOLIA_ADMIN_API_KEY // Admin key required for optimization
  );
  
  const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME);

  // Configure custom ranking for SDK documentation
  await index.setSettings({
    customRanking: [
      'desc(custom_ranking.page_rank)',
      'desc(custom_ranking.importance)', 
      'asc(custom_ranking.position)'
    ],
    
    // Boost SDK-specific content
    attributesToIndex: [
      'unordered(hierarchy.lvl0)',
      'unordered(hierarchy.lvl1)',
      'unordered(hierarchy.lvl2)', 
      'unordered(hierarchy.lvl3)',
      'content',
      'unordered(sdk_type)', // Custom attribute for SDK categorization
      'unordered(example_type)' // Custom attribute for example categorization
    ],

    // Search-specific optimizations
    removeWordsIfNoResults: 'allOptional',
    disableTypoToleranceOnWords: ['SDK', 'API', 'DLMM', 'Saros'],
    
    // Advanced configuration for code documentation
    separatorsToIndex: '.-_',
    queryLanguages: ['en'],
    indexLanguages: ['en'],
    
    // Performance settings
    maxValuesPerFacet: 20,
    maxFacetHits: 10
  });

  console.log('✅ Search index optimization completed');
}

if (require.main === module) {
  optimizeSearchIndex().catch(console.error);
}
```

### Crawl Configuration

Configure the Algolia crawler:

```json
{
  "index_name": "saros-docs",
  "start_urls": [
    {
      "url": "https://saros-docs.rectorspace.com/docs/getting-started/",
      "selectors_key": "getting-started",
      "tags": ["getting-started"],
      "page_rank": 5
    },
    {
      "url": "https://saros-docs.rectorspace.com/docs/typescript-sdk/",
      "selectors_key": "typescript",
      "tags": ["typescript", "sdk"],
      "page_rank": 4
    },
    {
      "url": "https://saros-docs.rectorspace.com/docs/dlmm-sdk/", 
      "selectors_key": "dlmm",
      "tags": ["dlmm", "sdk"],
      "page_rank": 4
    },
    {
      "url": "https://saros-docs.rectorspace.com/docs/rust-sdk/",
      "selectors_key": "rust", 
      "tags": ["rust", "sdk"],
      "page_rank": 4
    },
    {
      "url": "https://saros-docs.rectorspace.com/docs/examples/",
      "selectors_key": "examples",
      "tags": ["examples"],
      "page_rank": 3
    },
    {
      "url": "https://saros-docs.rectorspace.com/docs/tutorials/",
      "selectors_key": "tutorials",
      "tags": ["tutorials"],
      "page_rank": 3
    }
  ],
  "sitemap_urls": [
    "https://saros-docs.rectorspace.com/sitemap.xml"
  ],
  "stop_urls": [
    "https://saros-docs.rectorspace.com/search"
  ],
  "selectors": {
    "getting-started": {
      "lvl0": ".markdown h1",
      "lvl1": ".markdown h2",
      "lvl2": ".markdown h3", 
      "text": ".markdown p, .markdown li",
      "lang": {
        "selector": "/html/@lang",
        "type": "xpath",
        "global": true
      }
    },
    "typescript": {
      "lvl0": ".markdown h1",
      "lvl1": ".markdown h2", 
      "lvl2": ".markdown h3",
      "text": ".markdown p, .markdown li, .markdown code",
      "code": ".markdown pre code"
    },
    "dlmm": {
      "lvl0": ".markdown h1",
      "lvl1": ".markdown h2",
      "lvl2": ".markdown h3", 
      "text": ".markdown p, .markdown li, .markdown code",
      "code": ".markdown pre code"
    },
    "rust": {
      "lvl0": ".markdown h1",
      "lvl1": ".markdown h2",
      "lvl2": ".markdown h3",
      "text": ".markdown p, .markdown li, .markdown code",
      "code": ".markdown pre code"
    },
    "examples": {
      "lvl0": ".markdown h1",
      "lvl1": ".markdown h2",
      "text": ".markdown p, .markdown li, .markdown code, .markdown pre"
    },
    "tutorials": {
      "lvl0": ".markdown h1", 
      "lvl1": ".markdown h2",
      "lvl2": ".markdown h3",
      "text": ".markdown p, .markdown li"
    }
  },
  "custom_settings": {
    "separatorsToIndex": ".-_",
    "attributeForDistinct": "url",
    "distinct": true,
    "attributesForFaceting": [
      "filterOnly(type)",
      "filterOnly(tags)", 
      "filterOnly(hierarchy.lvl0)"
    ],
    "optionalWords": [
      "SDK", "API", "DLMM", "Rust", "TypeScript", 
      "example", "tutorial", "guide", "how", "to"
    ],
    "disableTypoToleranceOnWords": [
      "SDK", "API", "DLMM", "Saros", "Solana",
      "TypeScript", "JavaScript", "Rust", 
      "npm", "cargo", "install"
    ],
    "minWordSizefor1Typo": 4,
    "minWordSizefor2Typos": 8
  },
  "js_render": true,
  "use_anchors": true,
  "nb_hits": 46
}
```

## Step 8: Production Deployment

### Environment Variable Setup

**For Production Deployment:**

```bash
# Required environment variables
ALGOLIA_APP_ID=your_production_app_id
ALGOLIA_SEARCH_API_KEY=your_production_search_key
ALGOLIA_INDEX_NAME=saros-docs

# Optional environment variables
ALGOLIA_DEBUG=false
ALGOLIA_ANALYTICS_ENABLED=true
```

### Deployment Validation

After deployment, validate search functionality:

```bash
# Test search endpoint
curl "https://your_app_id-dsn.algolia.net/1/indexes/saros-docs/query" \
  -X POST \
  -H "X-Algolia-Application-Id: your_app_id" \
  -H "X-Algolia-API-Key: your_search_key" \
  -H "Content-Type: application/json" \
  -d '{"query":"typescript sdk","hitsPerPage":5}'
```

## Troubleshooting

### Common Issues

#### Search Not Working
```bash
# Check environment variables
node -e "console.log({
  appId: process.env.ALGOLIA_APP_ID,
  hasApiKey: !!process.env.ALGOLIA_SEARCH_API_KEY,
  indexName: process.env.ALGOLIA_INDEX_NAME
})"

# Verify index exists
curl "https://your_app_id-dsn.algolia.net/1/indexes" \
  -H "X-Algolia-Application-Id: your_app_id" \
  -H "X-Algolia-API-Key: your_search_key"
```

#### No Search Results
1. **Check Index Population**: Verify crawler has run successfully
2. **Verify Configuration**: Check selector configuration matches your HTML structure
3. **Test Queries**: Try broader search terms first

#### Search Performance Issues
1. **Check Network**: Verify Algolia servers are accessible
2. **Review Index Size**: Large indices may need optimization
3. **Optimize Queries**: Use more specific search parameters

### Debug Mode

Enable debug mode to troubleshoot:

```bash
# Enable Algolia debug mode
export ALGOLIA_DEBUG=true
export NODE_ENV=development

# Start development server with debug logging
npm run dev
```

### Crawler Issues

If the crawler isn't indexing content:

1. **Check robots.txt**: Ensure Algolia crawler is allowed
2. **Verify Sitemap**: Confirm sitemap.xml is accessible
3. **Review Selectors**: Ensure CSS selectors match your content structure
4. **Contact Support**: Reach out to Algolia support if issues persist

## Step 9: Maintenance

### Regular Maintenance Tasks

#### Weekly
- Review search analytics for popular queries
- Check for "no results" queries to improve content

#### Monthly  
- Update search index configuration if site structure changes
- Review and optimize search performance metrics
- Update excluded URLs if necessary

#### Quarterly
- Review Algolia usage and upgrade plan if needed
- Analyze search user behavior and optimize accordingly
- Update search result ranking based on user feedback

### Backup and Recovery

```bash
# Export search index for backup
curl "https://your_app_id-dsn.algolia.net/1/indexes/saros-docs/browse" \
  -H "X-Algolia-Application-Id: your_app_id" \
  -H "X-Algolia-API-Key: your_admin_key" > search-index-backup.json

# Restore from backup if needed (use admin key)
curl "https://your_app_id-dsn.algolia.net/1/indexes/saros-docs/batch" \
  -X POST \
  -H "X-Algolia-Application-Id: your_app_id" \
  -H "X-Algolia-API-Key: your_admin_key" \
  -d @search-index-backup.json
```

## Quick Setup Checklist

- [ ] Apply for Algolia DocSearch at https://docsearch.algolia.com/apply/
- [ ] Receive credentials via email (app ID, search key, index name)
- [ ] Set environment variables in deployment platform
- [ ] Test search functionality locally
- [ ] Deploy and test in production
- [ ] Configure custom crawler settings if needed
- [ ] Set up search analytics monitoring
- [ ] Create backup of search index
- [ ] Document credentials for team (securely)

## Support Resources

- **Algolia DocSearch Documentation**: https://docsearch.algolia.com/docs/what-is-docsearch
- **Docusaurus Search Guide**: https://docusaurus.io/docs/search
- **Algolia Community**: https://discourse.algolia.com/
- **Support**: For issues with search functionality, contact Algolia support

With proper Algolia configuration, users will have powerful search capabilities across all Saros SDK documentation, examples, and tutorials.