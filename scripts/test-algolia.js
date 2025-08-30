#!/usr/bin/env node

/**
 * Algolia Search Configuration Validator
 * 
 * Tests Algolia DocSearch configuration and validates search functionality
 * for the Saros SDK documentation site.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Algolia configuration for testing
const ALGOLIA_CONFIG = {
  // Load from environment or use placeholders
  appId: process.env.ALGOLIA_APP_ID || 'SAROS_DOCS_APP_ID',
  searchApiKey: process.env.ALGOLIA_SEARCH_API_KEY || '1234567890abcdef1234567890abcdef',
  adminApiKey: process.env.ALGOLIA_ADMIN_API_KEY, // Optional, for advanced operations
  indexName: process.env.ALGOLIA_INDEX_NAME || 'saros-docs',
  
  // Test configuration
  testQueries: [
    'SDK',
    'TypeScript installation',
    'DLMM position',
    'Rust trading bot', 
    'swap tokens',
    'liquidity farming',
    'createPosition',
    'swapExactInput',
    'error handling'
  ],
  
  // Expected minimum results for quality check
  minResultsThreshold: {
    'SDK': 10,
    'TypeScript': 5,
    'DLMM': 5,
    'Rust': 3,
    'example': 8
  }
};

class AlgoliaValidator {
  constructor() {
    this.results = {
      startTime: new Date(),
      configValidation: [],
      searchTests: [],
      indexAnalysis: null,
      performanceMetrics: [],
      errors: [],
      warnings: []
    };
  }

  async run() {
    console.log('🔍 Starting Algolia Search Configuration Validation');
    console.log(`📊 App ID: ${this.maskCredential(ALGOLIA_CONFIG.appId)}`);
    console.log(`🔑 Search Key: ${this.maskCredential(ALGOLIA_CONFIG.searchApiKey)}`);
    console.log(`📁 Index: ${ALGOLIA_CONFIG.indexName}`);
    
    try {
      // Validate configuration
      await this.validateConfiguration();
      
      // Test search functionality  
      await this.testSearchFunctionality();
      
      // Analyze index if possible
      await this.analyzeSearchIndex();
      
      // Test performance
      await this.testSearchPerformance();
      
      // Generate report
      await this.generateAlgoliaReport();
      
      this.printAlgoliaSummary();
      
    } catch (error) {
      console.error('💥 Algolia validation failed:', error.message);
      process.exit(1);
    }
  }

  async validateConfiguration() {
    console.log('\n📋 Validating Algolia Configuration...');

    const validationTests = [
      {
        name: 'Environment Variables Check',
        test: async () => {
          const config = {
            hasAppId: !!process.env.ALGOLIA_APP_ID,
            hasSearchKey: !!process.env.ALGOLIA_SEARCH_API_KEY,
            hasIndexName: !!process.env.ALGOLIA_INDEX_NAME,
            hasAdminKey: !!process.env.ALGOLIA_ADMIN_API_KEY
          };

          const missingVars = [];
          if (!config.hasAppId) missingVars.push('ALGOLIA_APP_ID');
          if (!config.hasSearchKey) missingVars.push('ALGOLIA_SEARCH_API_KEY');
          if (!config.hasIndexName) missingVars.push('ALGOLIA_INDEX_NAME');

          if (missingVars.length > 0) {
            this.results.warnings.push(
              `Missing environment variables: ${missingVars.join(', ')} (using placeholders)`
            );
          }

          return config;
        }
      },
      {
        name: 'Docusaurus Configuration Check',
        test: async () => {
          const configPath = path.join(__dirname, '../docusaurus.config.ts');
          const configContent = fs.readFileSync(configPath, 'utf8');
          
          const checks = {
            hasAlgoliaConfig: configContent.includes('algolia:'),
            hasAppIdConfig: configContent.includes('process.env.ALGOLIA_APP_ID'),
            hasApiKeyConfig: configContent.includes('process.env.ALGOLIA_SEARCH_API_KEY'),
            hasIndexNameConfig: configContent.includes('process.env.ALGOLIA_INDEX_NAME'),
            hasSearchParameters: configContent.includes('searchParameters:'),
            hasPlaceholder: configContent.includes('placeholder:')
          };

          const configuredCorrectly = Object.values(checks).every(check => check === true);
          
          return { ...checks, configuredCorrectly };
        }
      },
      {
        name: 'Credentials Format Validation',
        test: async () => {
          const validation = {
            appIdFormat: /^[A-Z0-9]{10}$/.test(ALGOLIA_CONFIG.appId),
            searchKeyFormat: /^[a-f0-9]{32}$/.test(ALGOLIA_CONFIG.searchApiKey),
            indexNameFormat: /^[a-z0-9\-_]+$/.test(ALGOLIA_CONFIG.indexName)
          };

          // Don't validate placeholder credentials
          if (ALGOLIA_CONFIG.appId === 'SAROS_DOCS_APP_ID') {
            validation.appIdFormat = true; // Placeholder is acceptable
          }
          
          if (ALGOLIA_CONFIG.searchApiKey === '1234567890abcdef1234567890abcdef') {
            validation.searchKeyFormat = true; // Placeholder is acceptable
          }

          const allValid = Object.values(validation).every(v => v === true);
          
          return { ...validation, allValid };
        }
      }
    ];

    for (const { name, test } of validationTests) {
      try {
        const result = await test();
        
        this.results.configValidation.push({
          name,
          success: true,
          result
        });

        console.log(`   ✅ ${name}`);
        
        if (name === 'Environment Variables Check' && result.hasAppId) {
          console.log('      🎉 Real Algolia credentials detected!');
        }

      } catch (error) {
        this.results.configValidation.push({
          name,
          success: false,
          error: error.message
        });

        console.log(`   ❌ ${name}: ${error.message}`);
        this.results.errors.push(`Configuration validation failed - ${name}: ${error.message}`);
      }
    }
  }

  async testSearchFunctionality() {
    console.log('\n🔍 Testing Search Functionality...');

    // Only test if we have real credentials (not placeholders)
    if (ALGOLIA_CONFIG.appId === 'SAROS_DOCS_APP_ID' || 
        ALGOLIA_CONFIG.searchApiKey === '1234567890abcdef1234567890abcdef') {
      console.log('   ⚠ Using placeholder credentials - skipping live search tests');
      this.results.warnings.push('Search functionality not tested - using placeholder credentials');
      return;
    }

    for (const query of ALGOLIA_CONFIG.testQueries) {
      try {
        const startTime = Date.now();
        const searchResult = await this.performSearch(query);
        const duration = Date.now() - startTime;

        const expectedMinResults = ALGOLIA_CONFIG.minResultsThreshold[
          Object.keys(ALGOLIA_CONFIG.minResultsThreshold).find(key => 
            query.toLowerCase().includes(key.toLowerCase())
          )
        ] || 1;

        const qualityCheck = {
          query,
          totalHits: searchResult.hits.length,
          expectedMinResults,
          meetsThreshold: searchResult.hits.length >= expectedMinResults,
          avgRelevance: this.calculateRelevanceScore(searchResult.hits, query),
          duration
        };

        this.results.searchTests.push({
          query,
          success: true,
          duration,
          result: qualityCheck
        });

        const status = qualityCheck.meetsThreshold ? '✅' : '⚠';
        console.log(`   ${status} "${query}": ${qualityCheck.totalHits} results (${duration}ms)`);

        if (!qualityCheck.meetsThreshold) {
          this.results.warnings.push(
            `Low search result count for "${query}": ${qualityCheck.totalHits} < ${expectedMinResults}`
          );
        }

      } catch (error) {
        this.results.searchTests.push({
          query,
          success: false,
          error: error.message
        });

        console.log(`   ❌ "${query}": ${error.message}`);
        this.results.errors.push(`Search test failed for "${query}": ${error.message}`);
      }
    }
  }

  async analyzeSearchIndex() {
    console.log('\n📊 Analyzing Search Index...');

    if (ALGOLIA_CONFIG.appId === 'SAROS_DOCS_APP_ID') {
      console.log('   ⚠ Skipping index analysis - using placeholder credentials');
      return;
    }

    try {
      const indexStats = await this.getIndexStatistics();
      
      this.results.indexAnalysis = {
        totalRecords: indexStats.numberOfRecords || 0,
        indexSize: indexStats.dataSize || 0,
        lastUpdated: indexStats.updatedAt || null,
        settings: indexStats.settings || {}
      };

      console.log(`   📈 Total Records: ${indexStats.numberOfRecords || 0}`);
      console.log(`   💾 Index Size: ${this.formatBytes(indexStats.dataSize || 0)}`);
      
      if (indexStats.updatedAt) {
        const lastUpdate = new Date(indexStats.updatedAt);
        const daysSinceUpdate = (new Date() - lastUpdate) / (1000 * 60 * 60 * 24);
        console.log(`   🕒 Last Updated: ${Math.round(daysSinceUpdate)} days ago`);
        
        if (daysSinceUpdate > 7) {
          this.results.warnings.push(`Search index not updated in ${Math.round(daysSinceUpdate)} days`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Index analysis failed: ${error.message}`);
      this.results.warnings.push(`Could not analyze index: ${error.message}`);
    }
  }

  async testSearchPerformance() {
    console.log('\n⚡ Testing Search Performance...');

    if (ALGOLIA_CONFIG.appId === 'SAROS_DOCS_APP_ID') {
      console.log('   ⚠ Skipping performance tests - using placeholder credentials');
      return;
    }

    const performanceTests = [
      {
        name: 'Search Latency',
        test: async () => {
          const measurements = [];
          const testQuery = 'SDK';

          for (let i = 0; i < 5; i++) {
            const startTime = Date.now();
            await this.performSearch(testQuery);
            measurements.push(Date.now() - startTime);
          }

          const avgLatency = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
          const maxLatency = Math.max(...measurements);
          const minLatency = Math.min(...measurements);

          console.log(`   📊 Search Latency: avg ${avgLatency.toFixed(1)}ms, min ${minLatency}ms, max ${maxLatency}ms`);
          
          return { avgLatency, maxLatency, minLatency, measurements };
        }
      },
      {
        name: 'Concurrent Search Performance', 
        test: async () => {
          const concurrentQueries = 3;
          const query = 'typescript';
          
          const startTime = Date.now();
          const promises = Array(concurrentQueries).fill(0).map(() => this.performSearch(query));
          const results = await Promise.allSettled(promises);
          const duration = Date.now() - startTime;

          const successCount = results.filter(r => r.status === 'fulfilled').length;
          
          console.log(`   🔄 ${successCount}/${concurrentQueries} concurrent searches in ${duration}ms`);
          
          return { totalQueries: concurrentQueries, successCount, totalDuration: duration };
        }
      }
    ];

    for (const { name, test } of performanceTests) {
      try {
        const result = await test();
        
        this.results.performanceMetrics.push({
          name,
          success: true,
          result
        });

      } catch (error) {
        this.results.performanceMetrics.push({
          name,
          success: false,
          error: error.message
        });

        console.log(`   ❌ ${name}: ${error.message}`);
        this.results.warnings.push(`Performance test warning - ${name}: ${error.message}`);
      }
    }
  }

  async performSearch(query) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        query,
        hitsPerPage: 20,
        page: 0
      });

      const options = {
        hostname: `${ALGOLIA_CONFIG.appId.toLowerCase()}-dsn.algolia.net`,
        port: 443,
        path: `/1/indexes/${ALGOLIA_CONFIG.indexName}/query`,
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_CONFIG.appId,
          'X-Algolia-API-Key': ALGOLIA_CONFIG.searchApiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              resolve(result);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  async getIndexStatistics() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: `${ALGOLIA_CONFIG.appId.toLowerCase()}-dsn.algolia.net`,
        port: 443,
        path: `/1/indexes/${ALGOLIA_CONFIG.indexName}`,
        method: 'GET',
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_CONFIG.appId,
          'X-Algolia-API-Key': ALGOLIA_CONFIG.searchApiKey
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const stats = JSON.parse(data);
              resolve(stats);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.end();
    });
  }

  calculateRelevanceScore(hits, query) {
    if (hits.length === 0) return 0;

    let totalScore = 0;
    const queryLower = query.toLowerCase();

    hits.forEach((hit, index) => {
      let score = 0;
      
      // Position-based scoring (earlier results score higher)
      score += (hits.length - index) / hits.length * 0.3;
      
      // Title relevance
      if (hit._highlightResult?.hierarchy?.lvl0?.value?.toLowerCase().includes(queryLower)) {
        score += 0.4;
      }
      
      // Content relevance
      if (hit._highlightResult?.content?.value?.toLowerCase().includes(queryLower)) {
        score += 0.3;
      }

      totalScore += score;
    });

    return totalScore / hits.length;
  }

  async generateAlgoliaReport() {
    const reportDir = path.join(__dirname, '../test-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      ...this.results,
      endTime: new Date(),
      config: {
        appId: this.maskCredential(ALGOLIA_CONFIG.appId),
        indexName: ALGOLIA_CONFIG.indexName,
        hasRealCredentials: ALGOLIA_CONFIG.appId !== 'SAROS_DOCS_APP_ID'
      },
      metadata: {
        testType: 'algolia-search-validation',
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      }
    };

    const reportPath = path.join(reportDir, 'algolia-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Algolia report saved: ${reportPath}`);
  }

  printAlgoliaSummary() {
    const totalTests = this.results.configValidation.length + 
                      this.results.searchTests.length + 
                      this.results.performanceMetrics.length;

    const passedTests = [
      ...this.results.configValidation,
      ...this.results.searchTests,
      ...this.results.performanceMetrics
    ].filter(test => test.success).length;

    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const usingRealCredentials = ALGOLIA_CONFIG.appId !== 'SAROS_DOCS_APP_ID';

    console.log('\n' + '='.repeat(60));
    console.log('🔍 ALGOLIA CONFIGURATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`🏆 Validation Success Rate: ${successRate.toFixed(1)}% (${passedTests}/${totalTests})`);
    console.log(`🔐 Using Real Credentials: ${usingRealCredentials ? 'Yes' : 'No (Placeholders)'}`);
    console.log(`📁 Index Name: ${ALGOLIA_CONFIG.indexName}`);

    if (usingRealCredentials) {
      console.log(`🔑 App ID: ${this.maskCredential(ALGOLIA_CONFIG.appId)}`);
      
      if (this.results.indexAnalysis) {
        console.log(`📊 Index Records: ${this.results.indexAnalysis.totalRecords}`);
        console.log(`💾 Index Size: ${this.formatBytes(this.results.indexAnalysis.indexSize)}`);
      }
    } else {
      console.log('\n🔧 Setup Required:');
      console.log('   1. Apply for Algolia DocSearch: https://docsearch.algolia.com/apply/');
      console.log('   2. Set environment variables: ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, ALGOLIA_INDEX_NAME');
      console.log('   3. See docs/algolia-search-setup.md for detailed instructions');
    }

    console.log('\n📈 Test Categories:');
    console.log(`   📋 Configuration: ${this.results.configValidation.filter(t => t.success).length}/${this.results.configValidation.length}`);
    
    if (this.results.searchTests.length > 0) {
      console.log(`   🔍 Search Tests: ${this.results.searchTests.filter(t => t.success).length}/${this.results.searchTests.length}`);
    }
    
    if (this.results.performanceMetrics.length > 0) {
      console.log(`   ⚡ Performance: ${this.results.performanceMetrics.filter(t => t.success).length}/${this.results.performanceMetrics.length}`);
    }

    if (this.results.errors.length > 0) {
      console.log(`\n❌ Errors (${this.results.errors.length}):`);
      this.results.errors.forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error}`);
      });
    }

    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.results.warnings.length}):`);
      this.results.warnings.slice(0, 3).forEach((warning, idx) => {
        console.log(`   ${idx + 1}. ${warning}`);
      });
      
      if (this.results.warnings.length > 3) {
        console.log(`   ... and ${this.results.warnings.length - 3} more warnings`);
      }
    }

    const hasErrors = this.results.errors.length > 0;
    console.log('\n' + '='.repeat(60));
    
    if (!usingRealCredentials) {
      console.log('⚙️  ALGOLIA CONFIGURATION READY FOR SETUP');
      console.log('📖 Follow docs/algolia-search-setup.md to complete setup');
    } else if (hasErrors) {
      console.log('❌ ALGOLIA VALIDATION COMPLETED WITH ERRORS');
    } else {
      console.log('✅ ALGOLIA SEARCH FULLY CONFIGURED AND OPERATIONAL');
    }
    
    console.log('='.repeat(60));
  }

  maskCredential(credential) {
    if (credential === 'SAROS_DOCS_APP_ID' || credential === '1234567890abcdef1234567890abcdef') {
      return credential; // Show placeholders fully
    }
    
    return credential.length > 6 
      ? credential.substring(0, 4) + '*'.repeat(credential.length - 6) + credential.substring(credential.length - 2)
      : '***';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// CLI argument processing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    verbose: false,
    skipPerformance: false,
    configOnly: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        process.env.DEBUG_TESTS = 'true';
        break;
      case '--skip-performance':
        options.skipPerformance = true;
        break;
      case '--config-only':
        options.configOnly = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printUsage() {
  console.log(`
Algolia Search Configuration Validator

Usage: node test-algolia.js [options]

Options:
  -v, --verbose           Enable verbose output
  --skip-performance     Skip performance testing
  --config-only          Only test configuration, skip live search tests
  -h, --help             Show this help message

Environment Variables:
  ALGOLIA_APP_ID         Your Algolia application ID
  ALGOLIA_SEARCH_API_KEY Your Algolia search API key (public)
  ALGOLIA_INDEX_NAME     Your search index name
  ALGOLIA_ADMIN_API_KEY  Your admin API key (optional, for advanced features)

Examples:
  node test-algolia.js                    # Full Algolia validation
  node test-algolia.js --verbose          # Verbose output
  node test-algolia.js --config-only      # Configuration only
  ALGOLIA_DEBUG=true node test-algolia.js # Debug mode
`);
}

// Main execution
async function main() {
  const options = parseArgs();
  
  console.log('🔍 Algolia Search Configuration Validator');
  console.log(`🎯 Mode: ${options.configOnly ? 'Configuration Only' : 'Full Validation'}`);
  
  const validator = new AlgoliaValidator();
  
  try {
    await validator.run();
    
    // Exit with appropriate status
    const hasErrors = validator.results.errors.length > 0;
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Algolia validation failed:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Algolia validation interrupted by user');
  process.exit(130);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal Algolia test error:', error);
    process.exit(1);
  });
}

module.exports = { AlgoliaValidator, ALGOLIA_CONFIG };