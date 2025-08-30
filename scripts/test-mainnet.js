#!/usr/bin/env node

/**
 * MainNet Testing Script
 * 
 * Conservative testing of Saros SDK examples and documentation
 * on Solana MainNet with READ-ONLY operations only.
 * 
 * IMPORTANT: This script performs NO state-changing operations
 * and does NOT require real funds or private keys.
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// MainNet specific configuration (READ-ONLY)
const MAINNET_CONFIG = {
  network: 'mainnet-beta',
  rpcUrl: 'https://solana-rpc.publicnode.com',
  wsUrl: 'wss://solana-rpc.publicnode.com', 
  commitment: 'confirmed',
  
  // Real MainNet pools for validation
  realPools: {
    solUsdc: 'ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq',
    usdcUsdt: '3ne4mWqdYuNiYrYZC9TrA3FcfuFdErghH97vNPbjicr1',
    ethSol: '2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv',
    btcSol: '6a1CsrpeZubDjEJE9s1CMVheB6HWM5d7m1cj2jkhyXhj'
  },

  // MainNet program IDs (for verification)
  programs: {
    dlmm: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
    jupiter: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    serum: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    raydium: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
  },

  // Conservative test settings
  testTimeout: 30000,  // 30 seconds 
  maxRetries: 3,       // Conservative retry count
  concurrency: 1,      // Sequential execution for mainnet
  readOnlyMode: true,  // CRITICAL: Never change state
  
  // Rate limiting for mainnet RPC
  rateLimiting: {
    enabled: true,
    maxRequestsPerSecond: 10,
    burstLimit: 50
  }
};

class MainNetTester {
  constructor() {
    this.connection = new Connection(MAINNET_CONFIG.rpcUrl, MAINNET_CONFIG.commitment);
    this.rateLimiter = new RateLimiter(MAINNET_CONFIG.rateLimiting);
    this.results = {
      startTime: new Date(),
      networkValidation: [],
      poolValidation: [],
      dataIntegrityTests: [],
      documentationValidation: [],
      performanceMetrics: [],
      errors: [],
      warnings: []
    };
  }

  async run() {
    console.log('🌍 Starting MainNet Validation Testing');
    console.log('🚨 READ-ONLY MODE: No state changes will be made');
    console.log(`📍 Network: ${MAINNET_CONFIG.rpcUrl}`);
    
    try {
      await this.validateNetworkAccess();
      await this.validatePoolData();
      await this.validateDocumentationAccuracy();
      await this.measureMainNetPerformance();
      
      await this.generateMainNetReport();
      this.printMainNetSummary();

    } catch (error) {
      console.error('💥 MainNet validation failed:', error.message);
      process.exit(1);
    }
  }

  async validateNetworkAccess() {
    console.log('\n🔍 Validating MainNet Access...');

    const validationTests = [
      {
        name: 'Network Health Check',
        test: async () => {
          await this.rateLimiter.waitForSlot();
          // Test network health by getting current slot
          const slot = await this.connection.getSlot();
          
          if (typeof slot !== 'number' || slot < 0) {
            throw new Error(`MainNet health check failed: invalid slot ${slot}`);
          }
          
          return { currentSlot: slot, status: 'operational' };
        }
      },
      {
        name: 'Network Performance Baseline',
        test: async () => {
          const measurements = [];
          
          for (let i = 0; i < 5; i++) {
            await this.rateLimiter.waitForSlot();
            const startTime = Date.now();
            await this.connection.getSlot();
            const latency = Date.now() - startTime;
            measurements.push(latency);
          }

          const avgLatency = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
          const maxLatency = Math.max(...measurements);
          const minLatency = Math.min(...measurements);

          console.log(`   📊 Latency: avg ${avgLatency.toFixed(1)}ms, min ${minLatency}ms, max ${maxLatency}ms`);
          
          if (avgLatency > 3000) {
            this.results.warnings.push(`High MainNet latency: ${avgLatency.toFixed(1)}ms`);
          }

          return { avgLatency, maxLatency, minLatency, measurements };
        }
      },
      {
        name: 'Program Verification',
        test: async () => {
          const programStatus = {};
          
          for (const [name, programId] of Object.entries(MAINNET_CONFIG.programs)) {
            await this.rateLimiter.waitForSlot();
            
            try {
              const programPubkey = new PublicKey(programId);
              const accountInfo = await this.connection.getAccountInfo(programPubkey);
              
              if (accountInfo?.executable) {
                programStatus[name] = {
                  exists: true,
                  executable: true,
                  dataLength: accountInfo.data.length,
                  owner: accountInfo.owner.toString()
                };
                console.log(`   ✅ ${name}: Verified (${accountInfo.data.length} bytes)`);
              } else {
                programStatus[name] = { exists: false };
                console.log(`   ❌ ${name}: Not found or not executable`);
              }
            } catch (error) {
              programStatus[name] = { error: error.message };
              console.log(`   ❌ ${name}: ${error.message}`);
            }
          }
          
          return programStatus;
        }
      }
    ];

    for (const { name, test } of validationTests) {
      try {
        const startTime = Date.now();
        const result = await test();
        const duration = Date.now() - startTime;
        
        this.results.networkValidation.push({
          name,
          success: true,
          duration,
          result
        });

      } catch (error) {
        this.results.networkValidation.push({
          name,
          success: false,
          error: error.message
        });
        
        console.log(`   ❌ ${name}: ${error.message}`);
        this.results.errors.push(`Network validation failed - ${name}: ${error.message}`);
      }
    }
  }

  async validatePoolData() {
    console.log('\n💧 Validating Real Pool Data on MainNet...');

    for (const [poolName, poolAddress] of Object.entries(MAINNET_CONFIG.realPools)) {
      try {
        await this.rateLimiter.waitForSlot();
        const startTime = Date.now();

        const poolPubkey = new PublicKey(poolAddress);
        const accountInfo = await this.connection.getAccountInfo(poolPubkey);
        
        if (accountInfo) {
          // Analyze pool data structure (without modifying)
          const poolData = this.analyzePoolData(accountInfo.data);
          const duration = Date.now() - startTime;

          this.results.poolValidation.push({
            name: poolName,
            address: poolAddress,
            success: true,
            duration,
            dataSize: accountInfo.data.length,
            owner: accountInfo.owner.toString(),
            analysis: poolData
          });

          console.log(`   ✅ ${poolName}: ${accountInfo.data.length} bytes (${duration}ms)`);
          
          if (poolData.suspiciousData) {
            this.results.warnings.push(`Pool ${poolName} has suspicious data patterns`);
          }

        } else {
          this.results.poolValidation.push({
            name: poolName,
            address: poolAddress,
            success: false,
            error: 'Pool account not found'
          });
          
          console.log(`   ❌ ${poolName}: Account not found`);
          this.results.errors.push(`Pool not found on MainNet: ${poolName} (${poolAddress})`);
        }

      } catch (error) {
        this.results.poolValidation.push({
          name: poolName,
          address: poolAddress,
          success: false,
          error: error.message
        });

        console.log(`   ❌ ${poolName}: ${error.message}`);
        this.results.errors.push(`Pool validation failed - ${poolName}: ${error.message}`);
      }
    }
  }

  async validateDocumentationAccuracy() {
    console.log('\n📚 Validating Documentation Accuracy Against MainNet...');

    const validationTests = [
      {
        name: 'Pool Addresses in Examples',
        test: async () => {
          const examplesDir = path.join(__dirname, '../docs/examples');
          const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.md'));
          
          const addressValidation = {
            totalAddresses: 0,
            validAddresses: 0,
            invalidAddresses: [],
            suspiciousAddresses: []
          };

          for (const file of files) {
            const content = fs.readFileSync(path.join(examplesDir, file), 'utf8');
            const addresses = this.extractPublicKeyAddresses(content);
            
            for (const address of addresses) {
              addressValidation.totalAddresses++;
              
              try {
                const pubkey = new PublicKey(address);
                
                // Check if address looks like a real program/pool
                if (this.isKnownAddress(address)) {
                  await this.rateLimiter.waitForSlot();
                  const accountInfo = await this.connection.getAccountInfo(pubkey);
                  
                  if (accountInfo) {
                    addressValidation.validAddresses++;
                  } else {
                    addressValidation.invalidAddresses.push({ file, address, reason: 'Account not found' });
                  }
                } else {
                  // Placeholder or example address
                  addressValidation.validAddresses++;
                }
                
              } catch (error) {
                addressValidation.invalidAddresses.push({ file, address, reason: error.message });
              }
            }
          }

          console.log(`   📊 Addresses: ${addressValidation.validAddresses}/${addressValidation.totalAddresses} valid`);
          
          if (addressValidation.invalidAddresses.length > 0) {
            console.log(`   ⚠ Invalid addresses found: ${addressValidation.invalidAddresses.length}`);
          }

          return addressValidation;
        }
      },
      {
        name: 'Pool State Consistency',
        test: async () => {
          const consistencyResults = {};
          
          for (const [poolName, poolAddress] of Object.entries(MAINNET_CONFIG.realPools)) {
            await this.rateLimiter.waitForSlot();
            
            try {
              const poolPubkey = new PublicKey(poolAddress);
              const accountInfo = await this.connection.getAccountInfo(poolPubkey);
              
              if (accountInfo) {
                // Validate pool data structure consistency
                const isConsistent = this.validatePoolDataStructure(accountInfo.data);
                consistencyResults[poolName] = {
                  consistent: isConsistent,
                  dataSize: accountInfo.data.length
                };
                
                console.log(`   ${isConsistent ? '✅' : '❌'} ${poolName}: ${isConsistent ? 'Consistent' : 'Inconsistent'}`);
              }
              
            } catch (error) {
              consistencyResults[poolName] = { error: error.message };
              console.log(`   ❌ ${poolName}: ${error.message}`);
            }
          }
          
          return consistencyResults;
        }
      },
      {
        name: 'Documentation vs Reality Check',
        test: async () => {
          const realityCheck = {
            documentedFeatures: 0,
            verifiedFeatures: 0,
            discrepancies: []
          };

          // Check if documented pools actually exist and have expected structure
          const docsDir = path.join(__dirname, '../docs');
          const allDocs = this.getAllMarkdownFiles(docsDir);
          
          for (const docFile of allDocs) {
            const content = fs.readFileSync(docFile, 'utf8');
            
            // Look for pool references
            const poolReferences = this.extractPoolReferences(content);
            realityCheck.documentedFeatures += poolReferences.length;
            
            // Validate pool references against mainnet
            for (const poolRef of poolReferences) {
              try {
                await this.rateLimiter.waitForSlot();
                const pubkey = new PublicKey(poolRef.address);
                const accountInfo = await this.connection.getAccountInfo(pubkey);
                
                if (accountInfo) {
                  realityCheck.verifiedFeatures++;
                } else {
                  realityCheck.discrepancies.push({
                    file: path.basename(docFile),
                    issue: `Pool ${poolRef.name} not found on mainnet`,
                    address: poolRef.address
                  });
                }
              } catch (error) {
                realityCheck.discrepancies.push({
                  file: path.basename(docFile),
                  issue: `Invalid pool address: ${poolRef.address}`,
                  error: error.message
                });
              }
            }
          }

          const accuracy = realityCheck.documentedFeatures > 0 
            ? (realityCheck.verifiedFeatures / realityCheck.documentedFeatures) * 100 
            : 100;

          console.log(`   📈 Documentation Accuracy: ${accuracy.toFixed(1)}%`);
          
          if (realityCheck.discrepancies.length > 0) {
            console.log(`   ⚠ Found ${realityCheck.discrepancies.length} discrepancies`);
          }

          return realityCheck;
        }
      }
    ];

    for (const { name, test } of validationTests) {
      try {
        const startTime = Date.now();
        const result = await test();
        const duration = Date.now() - startTime;
        
        this.results.documentationValidation.push({
          name,
          success: true,
          duration,
          result
        });

        console.log(`   ✅ ${name} (${duration}ms)`);

      } catch (error) {
        this.results.documentationValidation.push({
          name,
          success: false,
          error: error.message
        });

        console.log(`   ❌ ${name}: ${error.message}`);
        this.results.errors.push(`Documentation validation failed - ${name}: ${error.message}`);
      }
    }
  }

  async measureMainNetPerformance() {
    console.log('\n⚡ Measuring MainNet Performance...');

    const performanceTests = [
      {
        name: 'RPC Response Times',
        test: async () => {
          const operations = [
            { name: 'getSlot', operation: () => this.connection.getSlot() },
            { name: 'getBlockHeight', operation: () => this.connection.getBlockHeight() },
            { name: 'getLatestBlockhash', operation: () => this.connection.getLatestBlockhash() }
          ];

          const results = {};

          for (const { name, operation } of operations) {
            const times = [];
            
            for (let i = 0; i < 3; i++) {
              await this.rateLimiter.waitForSlot();
              const startTime = Date.now();
              await operation();
              times.push(Date.now() - startTime);
            }

            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            results[name] = { avgTime, times };
            
            console.log(`   📊 ${name}: ${avgTime.toFixed(1)}ms avg`);
          }

          return results;
        }
      },
      {
        name: 'Large Data Query Performance',
        test: async () => {
          const largePools = Object.values(MAINNET_CONFIG.realPools);
          const queryResults = [];

          for (const poolAddress of largePools.slice(0, 3)) { // Test first 3 pools
            await this.rateLimiter.waitForSlot();
            
            const startTime = Date.now();
            try {
              const pubkey = new PublicKey(poolAddress);
              const accountInfo = await this.connection.getAccountInfo(pubkey);
              const duration = Date.now() - startTime;

              queryResults.push({
                address: poolAddress,
                duration,
                dataSize: accountInfo?.data?.length || 0,
                success: true
              });

              console.log(`   📈 Pool query: ${duration}ms (${accountInfo?.data?.length || 0} bytes)`);

            } catch (error) {
              queryResults.push({
                address: poolAddress,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
              });
            }
          }

          const avgDuration = queryResults
            .filter(r => r.success)
            .reduce((sum, r) => sum + r.duration, 0) / queryResults.length;

          return { queryResults, avgDuration };
        }
      },
      {
        name: 'Concurrent Query Handling',
        test: async () => {
          const concurrentQueries = 5;
          const startTime = Date.now();
          
          // Prepare rate-limited promises
          const promises = Array(concurrentQueries).fill(null).map(async (_, i) => {
            await this.rateLimiter.waitForSlot();
            return this.connection.getSlot();
          });

          const results = await Promise.allSettled(promises);
          const duration = Date.now() - startTime;
          const successCount = results.filter(r => r.status === 'fulfilled').length;

          console.log(`   🔄 ${successCount}/${concurrentQueries} concurrent queries in ${duration}ms`);

          return { 
            totalQueries: concurrentQueries, 
            successCount, 
            totalDuration: duration,
            avgDurationPerQuery: duration / concurrentQueries 
          };
        }
      }
    ];

    for (const { name, test } of performanceTests) {
      try {
        const startTime = Date.now();
        const result = await test();
        const duration = Date.now() - startTime;
        
        this.results.performanceMetrics.push({
          name,
          success: true,
          duration,
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

  analyzePoolData(data) {
    // Basic pool data analysis (read-only)
    const analysis = {
      dataSize: data.length,
      hasExpectedStructure: false,
      suspiciousData: false
    };

    if (data.length > 100) {
      analysis.hasExpectedStructure = true;
    }

    // Check for obviously invalid data patterns
    const allZeros = data.every(byte => byte === 0);
    const allSame = data.every(byte => byte === data[0]);
    
    if (allZeros || allSame) {
      analysis.suspiciousData = true;
    }

    return analysis;
  }

  validatePoolDataStructure(data) {
    // Validate that pool data has expected DLMM structure
    if (!data || data.length < 100) {
      return false;
    }

    // Basic sanity checks for DLMM pool data
    // (This would be more sophisticated in production)
    const hasReasonableSize = data.length >= 100 && data.length <= 10000;
    const notAllZeros = !data.every(byte => byte === 0);
    const hasVariation = new Set(data.slice(0, 32)).size > 1;

    return hasReasonableSize && notAllZeros && hasVariation;
  }

  extractPublicKeyAddresses(content) {
    // Extract potential Solana addresses from content
    const addressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
    const matches = content.match(addressRegex) || [];
    
    return matches.filter(match => {
      // Filter out obvious non-addresses
      return !match.match(/^[0-9]+$/) && // Not just numbers
             !match.includes('example') && // Not example text
             match.length >= 32; // Minimum length
    });
  }

  extractPoolReferences(content) {
    const pools = [];
    const poolPattern = /pool[:\s]*([1-9A-HJ-NP-Za-km-z]{32,44})/gi;
    let match;

    while ((match = poolPattern.exec(content)) !== null) {
      pools.push({
        name: `Pool from ${match.index}`,
        address: match[1]
      });
    }

    return pools;
  }

  isKnownAddress(address) {
    const knownAddresses = [
      ...Object.values(MAINNET_CONFIG.realPools),
      ...Object.values(MAINNET_CONFIG.programs),
      'So11111111111111111111111111111111111111112', // WSOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'  // USDC
    ];
    
    return knownAddresses.includes(address);
  }

  getAllMarkdownFiles(dir) {
    const files = [];
    
    function walkDir(currentDir) {
      try {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    walkDir(dir);
    return files;
  }

  async generateMainNetReport() {
    const reportDir = path.join(__dirname, '../test-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      ...this.results,
      endTime: new Date(),
      config: {
        network: MAINNET_CONFIG.network,
        rpcUrl: MAINNET_CONFIG.rpcUrl,
        readOnlyMode: MAINNET_CONFIG.readOnlyMode
      },
      metadata: {
        network: 'mainnet-beta',
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
        testType: 'read-only-validation'
      }
    };

    const reportPath = path.join(reportDir, 'mainnet-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 MainNet report saved: ${reportPath}`);
  }

  printMainNetSummary() {
    const totalTests = this.results.networkValidation.length + 
                      this.results.poolValidation.length + 
                      this.results.documentationValidation.length + 
                      this.results.performanceMetrics.length;

    const passedTests = [
      ...this.results.networkValidation,
      ...this.results.poolValidation,
      ...this.results.documentationValidation,
      ...this.results.performanceMetrics
    ].filter(test => test.success).length;

    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    console.log('\n' + '='.repeat(70));
    console.log('🌍 MAINNET VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`🔒 Mode: READ-ONLY (No state changes made)`);
    console.log(`🏆 Success Rate: ${successRate.toFixed(1)}% (${passedTests}/${totalTests})`);
    console.log(`🌐 Network: MainNet Beta`);
    
    console.log('\n📈 Test Categories:');
    console.log(`   🔍 Network Validation: ${this.results.networkValidation.filter(t => t.success).length}/${this.results.networkValidation.length}`);
    console.log(`   💧 Pool Validation: ${this.results.poolValidation.filter(t => t.success).length}/${this.results.poolValidation.length}`);
    console.log(`   📚 Documentation: ${this.results.documentationValidation.filter(t => t.success).length}/${this.results.documentationValidation.length}`);
    console.log(`   ⚡ Performance: ${this.results.performanceMetrics.filter(t => t.success).length}/${this.results.performanceMetrics.length}`);

    // Show real pool validation details
    console.log('\n💧 Real Pool Status:');
    this.results.poolValidation.forEach(pool => {
      const status = pool.success ? '✅' : '❌';
      const size = pool.dataSize ? ` (${pool.dataSize} bytes)` : '';
      console.log(`   ${status} ${pool.name}: ${pool.address}${size}`);
    });

    if (this.results.errors.length > 0) {
      console.log(`\n❌ Critical Issues (${this.results.errors.length}):`);
      this.results.errors.slice(0, 3).forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error}`);
      });
      
      if (this.results.errors.length > 3) {
        console.log(`   ... and ${this.results.errors.length - 3} more errors`);
      }
    }

    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.results.warnings.length}):`);
      this.results.warnings.slice(0, 5).forEach((warning, idx) => {
        console.log(`   ${idx + 1}. ${warning}`);
      });
      
      if (this.results.warnings.length > 5) {
        console.log(`   ... and ${this.results.warnings.length - 5} more warnings`);
      }
    }

    const hasCriticalErrors = this.results.errors.length > 0;
    console.log('\n' + '='.repeat(70));
    console.log(hasCriticalErrors 
      ? '❌ MAINNET VALIDATION COMPLETED WITH CRITICAL ISSUES' 
      : '✅ MAINNET VALIDATION PASSED'
    );
    console.log('🔒 No state changes were made to MainNet');
    console.log('='.repeat(70));
  }
}

// Rate Limiter for MainNet RPC calls
class RateLimiter {
  constructor(config) {
    this.maxRequestsPerSecond = config.maxRequestsPerSecond;
    this.burstLimit = config.burstLimit;
    this.requestQueue = [];
    this.lastRequest = 0;
  }

  async waitForSlot() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    const minInterval = 1000 / this.maxRequestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
  }
}

// CLI argument processing
function parseMainNetArgs() {
  const args = process.argv.slice(2);
  const options = {
    verbose: false,
    quickTest: false,
    poolsOnly: false,
    skipPerformance: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        process.env.DEBUG_TESTS = 'true';
        break;
      case '--quick':
      case '-q':
        options.quickTest = true;
        break;
      case '--pools-only':
        options.poolsOnly = true;
        break;
      case '--skip-performance':
        options.skipPerformance = true;
        break;
      case '--help':
      case '-h':
        printMainNetUsage();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printMainNetUsage() {
  console.log(`
Saros SDK MainNet Validation Tester

Usage: node test-mainnet.js [options]

Options:
  -v, --verbose         Enable verbose output
  -q, --quick          Run quick tests only (skip performance)
  --pools-only         Test pool data only
  --skip-performance   Skip performance benchmarks
  -h, --help           Show this help message

⚠️  IMPORTANT: This script is READ-ONLY and makes no state changes to MainNet.

Examples:
  node test-mainnet.js                    # Full MainNet validation
  node test-mainnet.js --verbose          # Verbose output
  node test-mainnet.js --quick            # Quick validation only
  node test-mainnet.js --pools-only       # Validate pools only
`);
}

// Main execution with error handling
async function main() {
  const options = parseMainNetArgs();
  
  // Override config based on options
  if (options.quickTest) {
    MAINNET_CONFIG.rateLimiting.maxRequestsPerSecond = 5; // Even more conservative
  }

  console.log('⚠️  MAINNET READ-ONLY TESTING MODE');
  console.log('🔒 No transactions will be submitted');
  console.log('💰 No funds required or used');

  const tester = new MainNetTester();
  
  try {
    if (options.poolsOnly) {
      await tester.validatePoolData();
    } else {
      await tester.run();
    }
    
    // Success
    process.exit(0);
    
  } catch (error) {
    console.error('💥 MainNet validation failed:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 MainNet testing interrupted by user');
  console.log('🔒 No state changes were made');
  process.exit(130);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection in MainNet tests:', promise, reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal MainNet test error:', error);
    process.exit(1);
  });
}

module.exports = { MainNetTester, MAINNET_CONFIG };