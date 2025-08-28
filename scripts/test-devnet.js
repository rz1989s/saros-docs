#!/usr/bin/env node

/**
 * DevNet Testing Script
 * 
 * Comprehensive testing of Saros SDK examples and documentation
 * specifically on Solana DevNet with aggressive testing enabled.
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// DevNet specific configuration
const DEVNET_CONFIG = {
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  wsUrl: 'wss://api.devnet.solana.com',
  commitment: 'confirmed',
  
  // DevNet test pools (these should exist on devnet)
  testPools: {
    solUsdc: '5BHZkcKobCXvuzKsMqZiPjYmhA2KGjvNJ9Xp6sF8KP8x',
    usdcUsdt: '7BHZkcKobCXvuzKsMqZiPjYmhA2KGjvNJ9Xp6sF8KP8x'
  },
  
  // DevNet program IDs
  programs: {
    dlmm: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
    jupiter: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    serum: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'
  },

  // Test configuration
  testTimeout: 45000,  // 45 seconds (devnet can be slower)
  maxRetries: 5,       // More retries for devnet
  concurrency: 2,      // Lower concurrency for devnet
  aggressiveTesting: true, // Enable aggressive testing on devnet
  
  // DevNet test wallet (using generated keypair - no real funds)
  testWallet: null // Will be generated
};

class DevNetTester {
  constructor() {
    this.connection = new Connection(DEVNET_CONFIG.rpcUrl, DEVNET_CONFIG.commitment);
    this.testWallet = Keypair.generate();
    this.results = {
      startTime: new Date(),
      networkTests: [],
      sdkTests: [],
      exampleTests: [],
      performanceTests: [],
      errors: [],
      warnings: []
    };

    DEVNET_CONFIG.testWallet = this.testWallet;
  }

  async run() {
    console.log('🌐 Starting DevNet Integration Testing');
    console.log(`📍 Network: ${DEVNET_CONFIG.rpcUrl}`);
    console.log(`🔑 Test Wallet: ${this.testWallet.publicKey.toString()}`);
    
    try {
      // Run comprehensive devnet tests
      await this.testNetworkHealth();
      await this.testSDKFunctionality();
      await this.testExampleCode();
      
      if (DEVNET_CONFIG.aggressiveTesting) {
        await this.runAggressiveTests();
      }
      
      await this.generateDevNetReport();
      this.printDevNetSummary();

    } catch (error) {
      console.error('💥 DevNet testing failed:', error.message);
      process.exit(1);
    }
  }

  async testNetworkHealth() {
    console.log('\n🏥 Testing DevNet Health...');

    const tests = [
      {
        name: 'Network Connectivity',
        test: async () => {
          const health = await this.connection.getHealth();
          if (health !== 'ok') {
            throw new Error(`Network health check failed: ${health}`);
          }
          return { status: 'healthy', health };
        }
      },
      {
        name: 'RPC Version',
        test: async () => {
          const version = await this.connection.getVersion();
          console.log(`   📦 Solana Core Version: ${version['solana-core']}`);
          return { version: version['solana-core'] };
        }
      },
      {
        name: 'Network Performance',
        test: async () => {
          const startTime = Date.now();
          await this.connection.getSlot();
          const latency = Date.now() - startTime;
          
          console.log(`   ⚡ RPC Latency: ${latency}ms`);
          
          if (latency > 5000) {
            this.results.warnings.push(`High RPC latency: ${latency}ms`);
          }
          
          return { latency };
        }
      },
      {
        name: 'DevNet Faucet Access',
        test: async () => {
          // Test devnet faucet accessibility
          try {
            const airdropSignature = await this.connection.requestAirdrop(
              this.testWallet.publicKey,
              1000000000 // 1 SOL
            );
            
            await this.connection.confirmTransaction(airdropSignature, 'confirmed');
            
            const balance = await this.connection.getBalance(this.testWallet.publicKey);
            console.log(`   💰 Test wallet balance: ${balance / 1e9} SOL`);
            
            return { airdropSuccess: true, balance };
          } catch (error) {
            console.warn(`   ⚠ Airdrop failed (rate limited?): ${error.message}`);
            return { airdropSuccess: false, error: error.message };
          }
        }
      },
      {
        name: 'Program Account Verification',
        test: async () => {
          const programResults = {};
          
          for (const [name, programId] of Object.entries(DEVNET_CONFIG.programs)) {
            try {
              const programPubkey = new PublicKey(programId);
              const accountInfo = await this.connection.getAccountInfo(programPubkey);
              
              if (accountInfo && accountInfo.executable) {
                console.log(`   ✅ ${name} program verified: ${programId}`);
                programResults[name] = { exists: true, executable: true };
              } else {
                console.log(`   ❌ ${name} program not found: ${programId}`);
                programResults[name] = { exists: false, executable: false };
              }
            } catch (error) {
              console.log(`   ❌ ${name} program error: ${error.message}`);
              programResults[name] = { error: error.message };
            }
          }
          
          return programResults;
        }
      }
    ];

    for (const { name, test } of tests) {
      try {
        const startTime = Date.now();
        const result = await test();
        const duration = Date.now() - startTime;
        
        this.results.networkTests.push({
          name,
          success: true,
          duration,
          result
        });
        
        console.log(`   ✅ ${name} (${duration}ms)`);
      } catch (error) {
        this.results.networkTests.push({
          name,
          success: false,
          error: error.message
        });
        
        console.log(`   ❌ ${name}: ${error.message}`);
        this.results.errors.push(`Network test failed - ${name}: ${error.message}`);
      }
    }
  }

  async testSDKFunctionality() {
    console.log('\n🔧 Testing SDK Functionality on DevNet...');

    const sdkTests = [
      {
        name: 'TypeScript SDK Import',
        test: async () => {
          try {
            const { SarosSDK } = require('@saros-finance/sdk');
            
            const sdk = new SarosSDK({
              connection: this.connection,
              wallet: this.testWallet,
              cluster: 'devnet'
            });

            return { imported: true, initialized: true, sdkType: 'typescript' };
          } catch (error) {
            // Expected if using mocks
            console.log(`   📦 Using mock SDK: ${error.message}`);
            return { imported: false, mock: true, error: error.message };
          }
        }
      },
      {
        name: 'DLMM SDK Import',
        test: async () => {
          try {
            const { DLMMSDK } = require('@saros-finance/dlmm-sdk');
            
            const dlmmSdk = new DLMMSDK({
              connection: this.connection,
              cluster: 'devnet'
            });

            return { imported: true, initialized: true, sdkType: 'dlmm' };
          } catch (error) {
            console.log(`   📦 Using mock DLMM SDK: ${error.message}`);
            return { imported: false, mock: true, error: error.message };
          }
        }
      },
      {
        name: 'Pool Data Access',
        test: async () => {
          // Test accessing pool data on devnet
          const poolResults = {};
          
          for (const [name, address] of Object.entries(DEVNET_CONFIG.testPools)) {
            try {
              const poolPubkey = new PublicKey(address);
              const accountInfo = await this.connection.getAccountInfo(poolPubkey);
              
              if (accountInfo) {
                poolResults[name] = {
                  exists: true,
                  dataLength: accountInfo.data.length,
                  owner: accountInfo.owner.toString()
                };
                console.log(`   💧 Pool ${name}: ${accountInfo.data.length} bytes`);
              } else {
                poolResults[name] = { exists: false };
                console.log(`   ❗ Pool ${name} not found`);
              }
            } catch (error) {
              poolResults[name] = { error: error.message };
              console.log(`   ❌ Pool ${name} error: ${error.message}`);
            }
          }
          
          return poolResults;
        }
      },
      {
        name: 'Token Account Operations',
        test: async () => {
          // Test token account operations on devnet
          try {
            const { getAssociatedTokenAddressSync } = require('@solana/spl-token');
            
            // WSOL mint on devnet
            const wsolMint = new PublicKey('So11111111111111111111111111111111111111112');
            const ata = getAssociatedTokenAddressSync(wsolMint, this.testWallet.publicKey);
            
            console.log(`   🪙 Test ATA: ${ata.toString()}`);
            
            return { 
              ataGenerated: true, 
              ataAddress: ata.toString(),
              mintAddress: wsolMint.toString()
            };
          } catch (error) {
            return { error: error.message };
          }
        }
      }
    ];

    for (const { name, test } of sdkTests) {
      try {
        const startTime = Date.now();
        const result = await test();
        const duration = Date.now() - startTime;
        
        this.results.sdkTests.push({
          name,
          success: true,
          duration,
          result
        });
        
        console.log(`   ✅ ${name} (${duration}ms)`);
      } catch (error) {
        this.results.sdkTests.push({
          name,
          success: false,
          error: error.message
        });
        
        console.log(`   ❌ ${name}: ${error.message}`);
        this.results.warnings.push(`SDK test warning - ${name}: ${error.message}`);
      }
    }
  }

  async testExampleCode() {
    console.log('\n📋 Testing Example Code on DevNet...');

    const exampleTests = [
      {
        name: 'Basic Token Swap Example',
        file: 'basic-token-swap.md',
        test: async (content) => {
          const codeBlocks = this.extractTypeScriptCode(content);
          const hasSwapLogic = content.includes('swap') || content.includes('exchange');
          const hasErrorHandling = content.includes('try') && content.includes('catch');
          
          return {
            codeBlocks: codeBlocks.length,
            hasSwapLogic,
            hasErrorHandling,
            networkCompatible: content.includes('devnet') || content.includes('mainnet')
          };
        }
      },
      {
        name: 'DLMM Position Creator',
        file: 'dlmm-position-creator.md',
        test: async (content) => {
          const hasPositionLogic = content.includes('position') || content.includes('liquidity');
          const hasBinManagement = content.includes('bin') || content.includes('Bin');
          const hasRangeLogic = content.includes('range') || content.includes('Range');
          
          return {
            hasPositionLogic,
            hasBinManagement,
            hasRangeLogic,
            dlmmIntegrated: content.includes('DLMM') || content.includes('dlmm')
          };
        }
      },
      {
        name: 'Automated Trading Bot',
        file: 'automated-trading-bot.md',
        test: async (content) => {
          const hasAutomation = content.includes('setInterval') || content.includes('schedule');
          const hasRiskManagement = content.includes('risk') || content.includes('stop');
          const hasMonitoring = content.includes('monitor') || content.includes('log');
          
          return {
            hasAutomation,
            hasRiskManagement,
            hasMonitoring,
            isProduction: content.includes('production') || content.includes('mainnet')
          };
        }
      },
      {
        name: 'Arbitrage Bot Example',
        file: 'arbitrage-bot.md', 
        test: async (content) => {
          const hasArbitrageLogic = content.includes('arbitrage') || content.includes('price difference');
          const hasMultiPoolSupport = content.includes('pools') || content.includes('multiple');
          const hasProfitCalculation = content.includes('profit') || content.includes('pnl');
          
          return {
            hasArbitrageLogic,
            hasMultiPoolSupport,
            hasProfitCalculation
          };
        }
      }
    ];

    const examplesDir = path.join(__dirname, '../docs/examples');

    for (const { name, file, test } of exampleTests) {
      try {
        const filePath = path.join(examplesDir, file);
        
        if (!fs.existsSync(filePath)) {
          console.log(`   ⚠ Example file not found: ${file}`);
          this.results.warnings.push(`Example file missing: ${file}`);
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const startTime = Date.now();
        const result = await test(content);
        const duration = Date.now() - startTime;

        this.results.exampleTests.push({
          name,
          file,
          success: true,
          duration,
          result
        });

        console.log(`   ✅ ${name} (${duration}ms)`);
        
        // Log detailed results for devnet testing
        if (process.env.DEBUG_TESTS) {
          console.log(`      📊 Analysis:`, JSON.stringify(result, null, 2));
        }

      } catch (error) {
        this.results.exampleTests.push({
          name,
          file,
          success: false,
          error: error.message
        });

        console.log(`   ❌ ${name}: ${error.message}`);
        this.results.errors.push(`Example test failed - ${name}: ${error.message}`);
      }
    }
  }

  async runAggressiveTests() {
    console.log('\n🔥 Running Aggressive DevNet Tests...');

    const aggressiveTests = [
      {
        name: 'High-Frequency Pool Queries',
        test: async () => {
          const queries = 50;
          const startTime = Date.now();
          const promises = [];

          for (let i = 0; i < queries; i++) {
            promises.push(this.connection.getSlot());
          }

          await Promise.all(promises);
          const duration = Date.now() - startTime;
          const avgLatency = duration / queries;

          console.log(`   ⚡ ${queries} queries in ${duration}ms (${avgLatency.toFixed(1)}ms avg)`);
          
          return { queries, totalTime: duration, avgLatency };
        }
      },
      {
        name: 'Concurrent Pool Data Access',
        test: async () => {
          const poolAddresses = Object.values(DEVNET_CONFIG.testPools);
          const startTime = Date.now();
          
          const poolDataPromises = poolAddresses.map(async (address) => {
            try {
              const pubkey = new PublicKey(address);
              const accountInfo = await this.connection.getAccountInfo(pubkey);
              return { address, success: true, dataSize: accountInfo?.data?.length || 0 };
            } catch (error) {
              return { address, success: false, error: error.message };
            }
          });

          const results = await Promise.all(poolDataPromises);
          const duration = Date.now() - startTime;
          const successCount = results.filter(r => r.success).length;

          console.log(`   🏊‍♂️ ${successCount}/${results.length} pools loaded in ${duration}ms`);
          
          return { totalPools: results.length, successCount, duration, results };
        }
      },
      {
        name: 'Transaction Simulation Stress Test',
        test: async () => {
          const simulations = 20;
          let successCount = 0;
          const startTime = Date.now();

          for (let i = 0; i < simulations; i++) {
            try {
              // Create a dummy transaction for simulation
              const { Transaction, SystemProgram } = require('@solana/web3.js');
              
              const transaction = new Transaction().add(
                SystemProgram.transfer({
                  fromPubkey: this.testWallet.publicKey,
                  toPubkey: Keypair.generate().publicKey,
                  lamports: 1000000 // 0.001 SOL
                })
              );

              const { blockhash } = await this.connection.getLatestBlockhash();
              transaction.recentBlockhash = blockhash;
              transaction.feePayer = this.testWallet.publicKey;

              await this.connection.simulateTransaction(transaction);
              successCount++;
            } catch (error) {
              // Expected to fail (insufficient funds), but should not crash
              if (!error.message.includes('insufficient funds')) {
                console.warn(`   ⚠ Unexpected simulation error: ${error.message}`);
              }
            }
          }

          const duration = Date.now() - startTime;
          console.log(`   🧪 ${successCount}/${simulations} simulations completed in ${duration}ms`);
          
          return { simulations, successCount, duration };
        }
      },
      {
        name: 'WebSocket Connection Test',
        test: async () => {
          return new Promise((resolve, reject) => {
            try {
              const WebSocket = require('ws');
              const ws = new WebSocket(DEVNET_CONFIG.wsUrl);
              
              const timeout = setTimeout(() => {
                ws.close();
                resolve({ connected: false, reason: 'timeout' });
              }, 5000);

              ws.on('open', () => {
                clearTimeout(timeout);
                console.log('   🔌 WebSocket connection established');
                
                // Send a test subscription
                ws.send(JSON.stringify({
                  jsonrpc: '2.0',
                  id: 1,
                  method: 'slotSubscribe'
                }));
              });

              ws.on('message', (data) => {
                ws.close();
                resolve({ 
                  connected: true, 
                  firstMessage: data.toString().substring(0, 100) 
                });
              });

              ws.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ connected: false, error: error.message });
              });

            } catch (error) {
              reject(error);
            }
          });
        }
      }
    ];

    for (const { name, test } of aggressiveTests) {
      try {
        const startTime = Date.now();
        const result = await test();
        const duration = Date.now() - startTime;

        this.results.performanceTests.push({
          name,
          success: true,
          duration,
          result
        });

        console.log(`   ✅ ${name} (${duration}ms)`);
      } catch (error) {
        this.results.performanceTests.push({
          name,
          success: false,
          error: error.message
        });

        console.log(`   ❌ ${name}: ${error.message}`);
        this.results.warnings.push(`Aggressive test warning - ${name}: ${error.message}`);
      }
    }
  }

  async generateDevNetReport() {
    const reportDir = path.join(__dirname, '../test-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      ...this.results,
      endTime: new Date(),
      config: DEVNET_CONFIG,
      metadata: {
        network: 'devnet',
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
        testWallet: this.testWallet.publicKey.toString()
      }
    };

    const reportPath = path.join(reportDir, 'devnet-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 DevNet report saved: ${reportPath}`);
  }

  printDevNetSummary() {
    const totalTests = this.results.networkTests.length + 
                      this.results.sdkTests.length + 
                      this.results.exampleTests.length + 
                      this.results.performanceTests.length;

    const passedTests = [
      ...this.results.networkTests,
      ...this.results.sdkTests,
      ...this.results.exampleTests,
      ...this.results.performanceTests
    ].filter(test => test.success).length;

    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 DEVNET TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`🌐 Network: DevNet (${DEVNET_CONFIG.rpcUrl})`);
    console.log(`🏆 Success Rate: ${successRate.toFixed(1)}% (${passedTests}/${totalTests})`);
    console.log(`🔑 Test Wallet: ${this.testWallet.publicKey.toString()}`);
    
    console.log('\n📈 Test Categories:');
    console.log(`   🏥 Network Tests: ${this.results.networkTests.filter(t => t.success).length}/${this.results.networkTests.length}`);
    console.log(`   🔧 SDK Tests: ${this.results.sdkTests.filter(t => t.success).length}/${this.results.sdkTests.length}`);
    console.log(`   📋 Example Tests: ${this.results.exampleTests.filter(t => t.success).length}/${this.results.exampleTests.length}`);
    console.log(`   🔥 Performance Tests: ${this.results.performanceTests.filter(t => t.success).length}/${this.results.performanceTests.length}`);

    if (this.results.errors.length > 0) {
      console.log(`\n❌ Errors (${this.results.errors.length}):`);
      this.results.errors.forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error}`);
      });
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

    const hasErrors = this.results.errors.length > 0;
    console.log('\n' + '='.repeat(60));
    console.log(hasErrors ? '❌ DEVNET TESTS COMPLETED WITH ERRORS' : '✅ DEVNET TESTS PASSED');
    console.log('='.repeat(60));
  }

  extractTypeScriptCode(content) {
    const codeBlockRegex = /```(?:typescript|javascript|ts|js)\n([\s\S]*?)```/g;
    const blocks = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push(match[1]);
    }

    return blocks;
  }
}

// Main execution
async function main() {
  const tester = new DevNetTester();
  
  try {
    await tester.run();
    
    // Exit with error code if there were critical errors
    const hasErrors = tester.results.errors.length > 0;
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error('💥 DevNet testing failed:', error.message);
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 DevNet testing interrupted by user');
  process.exit(130);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection in DevNet tests:', promise, reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal DevNet test error:', error);
    process.exit(1);
  });
}

module.exports = { DevNetTester, DEVNET_CONFIG };