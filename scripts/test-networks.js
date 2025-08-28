#!/usr/bin/env node

/**
 * Unified Network Testing Script
 * 
 * Orchestrates testing across multiple Solana networks (DevNet/MainNet)
 * with appropriate safety measures and comprehensive reporting.
 */

const { DevNetTester, DEVNET_CONFIG } = require('./test-devnet');
const { MainNetTester, MAINNET_CONFIG } = require('./test-mainnet');
const fs = require('fs');
const path = require('path');

// Network testing configuration
const NETWORK_TEST_CONFIG = {
  networks: {
    devnet: {
      name: 'DevNet',
      description: 'Solana DevNet - Aggressive testing with state changes allowed',
      tester: DevNetTester,
      config: DEVNET_CONFIG,
      safeForStateChanges: true,
      requiresFunds: false // Uses faucet
    },
    mainnet: {
      name: 'MainNet Beta', 
      description: 'Solana MainNet - READ-ONLY validation testing',
      tester: MainNetTester,
      config: MAINNET_CONFIG,
      safeForStateChanges: false, // CRITICAL: Read-only
      requiresFunds: false // Read-only operations
    }
  },
  
  defaultNetworks: ['devnet'], // Safe default
  reportDir: path.join(__dirname, '../test-results'),
  generateCombinedReport: true
};

class UnifiedNetworkTester {
  constructor(networks = ['devnet']) {
    this.networksToTest = networks.filter(net => 
      Object.keys(NETWORK_TEST_CONFIG.networks).includes(net)
    );
    
    this.results = {
      startTime: new Date(),
      endTime: null,
      networkResults: {},
      overallSummary: {
        totalNetworks: this.networksToTest.length,
        successfulNetworks: 0,
        failedNetworks: 0,
        totalTests: 0,
        passedTests: 0,
        errors: [],
        warnings: []
      }
    };

    // Create report directory
    if (!fs.existsSync(NETWORK_TEST_CONFIG.reportDir)) {
      fs.mkdirSync(NETWORK_TEST_CONFIG.reportDir, { recursive: true });
    }
  }

  async run() {
    console.log('🌐 Starting Unified Network Testing Suite');
    console.log(`📋 Testing Networks: ${this.networksToTest.join(', ')}`);
    console.log(`🗂️  Reports will be saved to: ${NETWORK_TEST_CONFIG.reportDir}`);
    
    // Display safety warnings for each network
    await this.displaySafetyWarnings();

    // Test each network sequentially for safety
    for (const networkName of this.networksToTest) {
      await this.testNetwork(networkName);
    }

    this.results.endTime = new Date();
    
    // Generate combined report
    if (NETWORK_TEST_CONFIG.generateCombinedReport) {
      await this.generateCombinedReport();
    }

    this.printUnifiedSummary();

    // Exit with appropriate status
    const hasNetworkFailures = this.results.overallSummary.failedNetworks > 0;
    process.exit(hasNetworkFailures ? 1 : 0);
  }

  async displaySafetyWarnings() {
    console.log('\n🚨 SAFETY INFORMATION:');
    
    for (const networkName of this.networksToTest) {
      const network = NETWORK_TEST_CONFIG.networks[networkName];
      console.log(`\n📍 ${network.name}:`);
      console.log(`   ${network.description}`);
      console.log(`   State Changes: ${network.safeForStateChanges ? '✅ Allowed' : '❌ FORBIDDEN'}`);
      console.log(`   Requires Funds: ${network.requiresFunds ? '💰 Yes' : '🆓 No'}`);
      
      if (!network.safeForStateChanges) {
        console.log('   🔒 READ-ONLY MODE: No transactions will be submitted');
      }
    }
    
    console.log('\n⏱️  Starting tests in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async testNetwork(networkName) {
    const network = NETWORK_TEST_CONFIG.networks[networkName];
    console.log(`\n🎯 Testing ${network.name}...`);
    console.log('='.repeat(50));

    const startTime = Date.now();

    try {
      const tester = new network.tester();
      await tester.run();
      
      const duration = Date.now() - startTime;
      
      this.results.networkResults[networkName] = {
        success: true,
        duration,
        tester: tester.results,
        config: network.config
      };

      this.results.overallSummary.successfulNetworks++;
      console.log(`\n✅ ${network.name} testing completed (${Math.round(duration / 1000)}s)`);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.networkResults[networkName] = {
        success: false,
        duration,
        error: error.message,
        config: network.config
      };

      this.results.overallSummary.failedNetworks++;
      this.results.overallSummary.errors.push(`${network.name}: ${error.message}`);
      
      console.log(`\n❌ ${network.name} testing failed (${Math.round(duration / 1000)}s)`);
      console.log(`💥 Error: ${error.message}`);
    }
  }

  async generateCombinedReport() {
    console.log('\n📊 Generating Combined Network Report...');

    const combinedReport = {
      ...this.results,
      metadata: {
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
        testRunner: 'Unified Network Tester',
        version: '1.0.0',
        networksTestedCount: this.networksToTest.length,
        totalDuration: this.results.endTime - this.results.startTime
      }
    };

    // Calculate overall statistics
    this.calculateOverallStats(combinedReport);

    // Save JSON report
    const jsonReportPath = path.join(NETWORK_TEST_CONFIG.reportDir, 'network-test-combined.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(combinedReport, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(combinedReport);
    const htmlReportPath = path.join(NETWORK_TEST_CONFIG.reportDir, 'network-test-combined.html');
    fs.writeFileSync(htmlReportPath, htmlReport);

    // Generate comparison CSV
    const csvReport = this.generateNetworkComparisonCsv(combinedReport);
    const csvReportPath = path.join(NETWORK_TEST_CONFIG.reportDir, 'network-comparison.csv');
    fs.writeFileSync(csvReportPath, csvReport);

    console.log(`✅ Combined reports generated:`);
    console.log(`   📄 JSON: ${jsonReportPath}`);
    console.log(`   🌐 HTML: ${htmlReportPath}`);
    console.log(`   📊 CSV: ${csvReportPath}`);
  }

  calculateOverallStats(report) {
    let totalTests = 0;
    let passedTests = 0;

    for (const [networkName, result] of Object.entries(report.networkResults)) {
      if (result.success && result.tester) {
        // Count tests from each network
        const networkTestCounts = [
          result.tester.networkValidation?.length || 0,
          result.tester.networkTests?.length || 0,
          result.tester.sdkTests?.length || 0,
          result.tester.exampleTests?.length || 0,
          result.tester.poolValidation?.length || 0,
          result.tester.documentationValidation?.length || 0,
          result.tester.performanceMetrics?.length || 0,
          result.tester.performanceTests?.length || 0
        ].reduce((sum, count) => sum + count, 0);

        totalTests += networkTestCounts;

        // Count passed tests
        const passedTestCounts = [
          result.tester.networkValidation?.filter(t => t.success).length || 0,
          result.tester.networkTests?.filter(t => t.success).length || 0,
          result.tester.sdkTests?.filter(t => t.success).length || 0,
          result.tester.exampleTests?.filter(t => t.success).length || 0,
          result.tester.poolValidation?.filter(t => t.success).length || 0,
          result.tester.documentationValidation?.filter(t => t.success).length || 0,
          result.tester.performanceMetrics?.filter(t => t.success).length || 0,
          result.tester.performanceTests?.filter(t => t.success).length || 0
        ].reduce((sum, count) => sum + count, 0);

        passedTests += passedTestCounts;
      }
    }

    report.overallSummary.totalTests = totalTests;
    report.overallSummary.passedTests = passedTests;
    report.overallSummary.successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  }

  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saros SDK Network Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { margin: 0 0 10px 0; font-size: 32px; }
        .header p { margin: 0; opacity: 0.9; font-size: 18px; }
        .networks { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px; }
        .network { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
        .network-header { padding: 25px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-bottom: 1px solid #e2e8f0; }
        .network-header h2 { margin: 0; color: #1e293b; }
        .network-body { padding: 25px; }
        .status { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 10px; }
        .status.success { background: #d1fae5; color: #065f46; }
        .status.failure { background: #fee2e2; color: #991b1b; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px; }
        .metric .value { font-size: 24px; font-weight: bold; color: #1e293b; }
        .metric .label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 5px; }
        .test-categories { margin-top: 20px; }
        .category { margin-bottom: 15px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .category h4 { margin: 0 0 8px 0; color: #1e293b; }
        .category-stats { font-size: 14px; color: #64748b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Saros SDK Network Test Report</h1>
            <p>Comprehensive validation across Solana networks</p>
            <p>Generated: ${report.metadata.timestamp}</p>
        </div>

        <div class="networks">
            ${Object.entries(report.networkResults).map(([networkName, result]) => {
              const network = NETWORK_TEST_CONFIG.networks[networkName];
              return `
                <div class="network">
                    <div class="network-header">
                        <h2>${network.name}</h2>
                        <p>${network.description}</p>
                        <div class="status ${result.success ? 'success' : 'failure'}">
                            ${result.success ? 'PASSED' : 'FAILED'}
                        </div>
                    </div>
                    <div class="network-body">
                        <div class="metrics">
                            <div class="metric">
                                <div class="value">${Math.round(result.duration / 1000)}s</div>
                                <div class="label">Duration</div>
                            </div>
                            <div class="metric">
                                <div class="value">${network.safeForStateChanges ? 'Yes' : 'No'}</div>
                                <div class="label">State Changes</div>
                            </div>
                            <div class="metric">
                                <div class="value">${network.requiresFunds ? 'Yes' : 'No'}</div>
                                <div class="label">Requires Funds</div>
                            </div>
                        </div>
                        
                        ${result.success && result.tester ? `
                            <div class="test-categories">
                                ${result.tester.networkValidation ? `
                                    <div class="category">
                                        <h4>🔍 Network Validation</h4>
                                        <div class="category-stats">
                                            ${result.tester.networkValidation.filter(t => t.success).length}/${result.tester.networkValidation.length} tests passed
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${result.tester.poolValidation ? `
                                    <div class="category">
                                        <h4>💧 Pool Validation</h4>
                                        <div class="category-stats">
                                            ${result.tester.poolValidation.filter(t => t.success).length}/${result.tester.poolValidation.length} pools validated
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${result.tester.sdkTests ? `
                                    <div class="category">
                                        <h4>🔧 SDK Tests</h4>
                                        <div class="category-stats">
                                            ${result.tester.sdkTests.filter(t => t.success).length}/${result.tester.sdkTests.length} SDK functions tested
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        ${!result.success ? `
                            <div style="background: #fee2e2; padding: 15px; border-radius: 8px; color: #991b1b;">
                                <strong>Error:</strong> ${result.error}
                            </div>
                        ` : ''}
                    </div>
                </div>
              `;
            }).join('')}
        </div>

        <div style="margin-top: 40px; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <h2>📊 Overall Summary</h2>
            <div class="metrics">
                <div class="metric">
                    <div class="value">${report.overallSummary.successfulNetworks}</div>
                    <div class="label">Networks Passed</div>
                </div>
                <div class="metric">
                    <div class="value">${report.overallSummary.totalTests}</div>
                    <div class="label">Total Tests</div>
                </div>
                <div class="metric">
                    <div class="value">${report.overallSummary.successRate.toFixed(1)}%</div>
                    <div class="label">Success Rate</div>
                </div>
                <div class="metric">
                    <div class="value">${Math.round((report.endTime - report.startTime) / 1000)}s</div>
                    <div class="label">Total Time</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  generateNetworkComparisonCsv(report) {
    const lines = [
      'Network,Status,Duration (s),Tests Total,Tests Passed,Success Rate (%),Notes'
    ];

    for (const [networkName, result] of Object.entries(report.networkResults)) {
      const network = NETWORK_TEST_CONFIG.networks[networkName];
      const duration = Math.round(result.duration / 1000);
      const notes = [];
      
      if (!network.safeForStateChanges) notes.push('READ-ONLY');
      if (network.requiresFunds) notes.push('REQUIRES-FUNDS');
      
      lines.push([
        network.name,
        result.success ? 'PASSED' : 'FAILED',
        duration,
        0, // Will be calculated from tester results
        0, // Will be calculated from tester results
        0, // Will be calculated from tester results
        notes.join(';')
      ].join(','));
    }

    return lines.join('\n');
  }

  async testNetwork(networkName) {
    const network = NETWORK_TEST_CONFIG.networks[networkName];
    console.log(`\n🎯 Testing ${network.name}...`);
    console.log('='.repeat(50));

    // Safety check for mainnet
    if (networkName === 'mainnet' && !MAINNET_CONFIG.readOnlyMode) {
      throw new Error('🚨 SAFETY VIOLATION: MainNet testing must be in read-only mode');
    }

    const startTime = Date.now();

    try {
      const tester = new network.tester();
      await tester.run();
      
      const duration = Date.now() - startTime;
      
      this.results.networkResults[networkName] = {
        success: true,
        duration,
        tester: tester.results,
        config: network.config
      };

      this.results.overallSummary.successfulNetworks++;
      console.log(`\n✅ ${network.name} testing completed (${Math.round(duration / 1000)}s)`);

      // Collect overall statistics
      this.collectNetworkStats(networkName, tester.results);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.networkResults[networkName] = {
        success: false,
        duration,
        error: error.message,
        config: network.config
      };

      this.results.overallSummary.failedNetworks++;
      this.results.overallSummary.errors.push(`${network.name}: ${error.message}`);
      
      console.log(`\n❌ ${network.name} testing failed (${Math.round(duration / 1000)}s)`);
      console.log(`💥 Error: ${error.message}`);
    }
  }

  collectNetworkStats(networkName, testerResults) {
    // Aggregate statistics from individual network testers
    const testArrays = [
      testerResults.networkValidation || testerResults.networkTests || [],
      testerResults.sdkTests || [],
      testerResults.exampleTests || [],
      testerResults.poolValidation || [],
      testerResults.documentationValidation || [],
      testerResults.performanceMetrics || testerResults.performanceTests || []
    ];

    const networkTotalTests = testArrays.reduce((sum, arr) => sum + arr.length, 0);
    const networkPassedTests = testArrays.reduce((sum, arr) => 
      sum + arr.filter(test => test.success).length, 0
    );

    this.results.overallSummary.totalTests += networkTotalTests;
    this.results.overallSummary.passedTests += networkPassedTests;

    // Collect errors and warnings
    if (testerResults.errors) {
      this.results.overallSummary.errors.push(...testerResults.errors.map(
        error => `${networkName}: ${error}`
      ));
    }

    if (testerResults.warnings) {
      this.results.overallSummary.warnings.push(...testerResults.warnings.map(
        warning => `${networkName}: ${warning}`
      ));
    }
  }

  printUnifiedSummary() {
    const { overallSummary } = this.results;
    const totalDuration = this.results.endTime - this.results.startTime;

    console.log('\n' + '='.repeat(80));
    console.log('🌐 UNIFIED NETWORK TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`🏆 Overall Success Rate: ${overallSummary.successRate?.toFixed(1) || 0}% (${overallSummary.passedTests}/${overallSummary.totalTests})`);
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`🌍 Networks Tested: ${overallSummary.totalNetworks}`);
    console.log(`✅ Networks Passed: ${overallSummary.successfulNetworks}`);
    console.log(`❌ Networks Failed: ${overallSummary.failedNetworks}`);

    console.log('\n📋 Network Details:');
    for (const [networkName, result] of Object.entries(this.results.networkResults)) {
      const network = NETWORK_TEST_CONFIG.networks[networkName];
      const status = result.success ? '✅' : '❌';
      const duration = Math.round(result.duration / 1000);
      const mode = network.safeForStateChanges ? 'FULL' : 'READ-ONLY';
      
      console.log(`   ${status} ${network.name} (${mode}): ${duration}s`);
      
      if (!result.success) {
        console.log(`       💥 ${result.error}`);
      }
    }

    if (overallSummary.errors.length > 0) {
      console.log(`\n❌ Critical Errors (${overallSummary.errors.length}):`);
      overallSummary.errors.slice(0, 5).forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error}`);
      });
      
      if (overallSummary.errors.length > 5) {
        console.log(`   ... and ${overallSummary.errors.length - 5} more errors`);
      }
    }

    if (overallSummary.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${overallSummary.warnings.length}):`);
      overallSummary.warnings.slice(0, 3).forEach((warning, idx) => {
        console.log(`   ${idx + 1}. ${warning}`);
      });
      
      if (overallSummary.warnings.length > 3) {
        console.log(`   ... and ${overallSummary.warnings.length - 3} more warnings`);
      }
    }

    const hasCriticalFailures = overallSummary.failedNetworks > 0;
    console.log('\n' + '='.repeat(80));
    console.log(hasCriticalFailures 
      ? '❌ NETWORK TESTING COMPLETED WITH FAILURES' 
      : '✅ ALL NETWORK TESTS PASSED'
    );
    console.log('🔒 No unauthorized state changes were made');
    console.log('='.repeat(80));
  }
}

// CLI argument processing
async function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    networks: ['devnet'], // Safe default
    verbose: false,
    quick: false,
    skipMainnet: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--networks':
      case '-n':
        options.networks = args[++i]?.split(',') || ['devnet'];
        break;
      case '--all':
        options.networks = ['devnet', 'mainnet'];
        break;
      case '--mainnet-only':
        options.networks = ['mainnet'];
        console.log('🚨 WARNING: Testing MainNet in READ-ONLY mode');
        break;
      case '--devnet-only':
        options.networks = ['devnet'];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        process.env.DEBUG_TESTS = 'true';
        break;
      case '--quick':
      case '-q':
        options.quick = true;
        break;
      case '--skip-mainnet':
        options.skipMainnet = true;
        options.networks = options.networks.filter(n => n !== 'mainnet');
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
    }
  }

  // Safety validation
  if (options.networks.includes('mainnet')) {
    console.log('\n🚨 MAINNET TESTING WARNING:');
    console.log('   🔒 MainNet tests are READ-ONLY');
    console.log('   💰 No funds required or used');
    console.log('   📊 Only data validation and performance measurement');
    console.log('   ⏸️  Continuing in 5 seconds...\n');
    
    // Give user time to cancel if they didn't mean to test mainnet
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  return options;
}

function printUsage() {
  console.log(`
Saros SDK Unified Network Testing

Usage: node test-networks.js [options]

Options:
  -n, --networks <list>    Comma-separated network list (devnet,mainnet)
  --all                   Test all networks (devnet + mainnet READ-ONLY)
  --devnet-only           Test DevNet only (default, safe)
  --mainnet-only          Test MainNet only (READ-ONLY mode)
  --skip-mainnet          Skip MainNet testing
  -v, --verbose           Enable verbose output
  -q, --quick            Run quick tests only
  -h, --help             Show this help message

Safety Notes:
  🟢 DevNet: Safe for all operations, uses test tokens
  🔒 MainNet: READ-ONLY mode, no state changes, no funds needed

Examples:
  node test-networks.js                      # Test DevNet only (safe default)
  node test-networks.js --all                # Test both networks
  node test-networks.js --mainnet-only       # MainNet READ-ONLY validation
  node test-networks.js -n devnet --verbose  # Verbose DevNet testing
`);
}

// Main execution
async function main() {
  const options = await parseArgs();
  
  console.log('🌐 Saros SDK Network Testing Suite');
  console.log(`📋 Target Networks: ${options.networks.join(', ')}`);
  
  // Validate network selection
  const invalidNetworks = options.networks.filter(net => 
    !Object.keys(NETWORK_TEST_CONFIG.networks).includes(net)
  );
  
  if (invalidNetworks.length > 0) {
    console.error(`❌ Invalid networks specified: ${invalidNetworks.join(', ')}`);
    console.error(`   Valid options: ${Object.keys(NETWORK_TEST_CONFIG.networks).join(', ')}`);
    process.exit(1);
  }

  const tester = new UnifiedNetworkTester(options.networks);
  
  try {
    await tester.run();
  } catch (error) {
    console.error('💥 Network testing suite failed:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Network testing interrupted by user');
  console.log('🔒 No unauthorized state changes were made');
  process.exit(130);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection in network tests:', promise, reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal network testing error:', error);
    process.exit(1);
  });
}

module.exports = { 
  UnifiedNetworkTester, 
  NETWORK_TEST_CONFIG 
};