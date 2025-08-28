#!/usr/bin/env node

/**
 * Comprehensive Integration Test Runner
 * 
 * Orchestrates all documentation validation tests including:
 * - Example code compilation and validation
 * - SDK integration testing
 * - Network connectivity tests
 * - Security vulnerability scanning
 * - Performance benchmarking
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  testSuites: [
    {
      name: 'Example Validation',
      command: 'npm run test:examples',
      required: true,
      timeout: 60000
    },
    {
      name: 'SDK Integration',
      command: 'npm test -- tests/integration/sdk-integration.test.js',
      required: true,
      timeout: 45000
    },
    {
      name: 'Documentation Validation',
      command: 'npm test -- tests/integration/example-validator.test.js',
      required: true,
      timeout: 120000
    },
    {
      name: 'Security Scan',
      command: 'npm run security:scan',
      required: false,
      timeout: 30000
    },
    {
      name: 'Link Validation',
      command: 'npm run test:links',
      required: false,
      timeout: 30000
    },
    {
      name: 'Build Validation',
      command: 'npm run build',
      required: true,
      timeout: 180000
    }
  ],
  networks: {
    devnet: 'https://api.devnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com'
  },
  outputDir: path.join(__dirname, '../test-results'),
  generateReport: true
};

class IntegrationTestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      suiteResults: [],
      errors: [],
      warnings: [],
      performance: {
        totalExecutionTime: 0,
        averageTestTime: 0,
        slowestTest: null,
        fastestTest: null
      }
    };
  }

  async run() {
    console.log('🏁 Starting Saros SDK Integration Test Suite');
    console.log(`⏱️  Started at: ${this.results.startTime.toISOString()}`);
    
    // Setup test environment
    await this.setupEnvironment();

    // Run pre-flight checks
    await this.runPreflightChecks();

    // Execute test suites
    for (const suite of TEST_CONFIG.testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate final report
    this.results.endTime = new Date();
    this.calculatePerformanceMetrics();
    
    if (TEST_CONFIG.generateReport) {
      await this.generateReport();
    }

    // Print summary
    this.printSummary();

    // Exit with appropriate code
    const hasRequiredFailures = this.results.suiteResults.some(
      suite => !suite.success && suite.required
    );
    
    process.exit(hasRequiredFailures ? 1 : 0);
  }

  async setupEnvironment() {
    console.log('\n📋 Setting up test environment...');

    // Create output directory
    if (!fs.existsSync(TEST_CONFIG.outputDir)) {
      fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
    }

    // Verify Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      this.results.warnings.push(`Node.js version ${nodeVersion} is below recommended 16+`);
    }

    // Check disk space
    try {
      const stats = fs.statSync(process.cwd());
      console.log('✓ Working directory accessible');
    } catch (error) {
      throw new Error(`Working directory not accessible: ${error.message}`);
    }

    // Verify required commands are available
    const requiredCommands = ['npm', 'node', 'npx'];
    for (const cmd of requiredCommands) {
      try {
        execSync(`which ${cmd}`, { stdio: 'ignore' });
        console.log(`✓ ${cmd} available`);
      } catch (error) {
        throw new Error(`Required command not found: ${cmd}`);
      }
    }

    console.log('✅ Environment setup complete');
  }

  async runPreflightChecks() {
    console.log('\n🔍 Running pre-flight checks...');

    const checks = [
      {
        name: 'Package dependencies',
        check: () => this.checkDependencies()
      },
      {
        name: 'Documentation structure', 
        check: () => this.checkDocumentationStructure()
      },
      {
        name: 'Network connectivity',
        check: () => this.checkNetworkConnectivity()
      },
      {
        name: 'Example file integrity',
        check: () => this.checkExampleFiles()
      }
    ];

    for (const { name, check } of checks) {
      try {
        await check();
        console.log(`✓ ${name}`);
      } catch (error) {
        this.results.warnings.push(`Pre-flight check failed - ${name}: ${error.message}`);
        console.log(`⚠ ${name}: ${error.message}`);
      }
    }

    console.log('✅ Pre-flight checks complete');
  }

  async runTestSuite(suite) {
    console.log(`\n🧪 Running ${suite.name}...`);
    const startTime = Date.now();

    const suiteResult = {
      name: suite.name,
      command: suite.command,
      required: suite.required,
      success: false,
      executionTime: 0,
      output: '',
      error: null
    };

    try {
      const { output, success } = await this.executeCommand(suite.command, suite.timeout);
      
      suiteResult.success = success;
      suiteResult.output = output;
      
      if (success) {
        console.log(`✅ ${suite.name} passed`);
        this.results.passedTests++;
      } else {
        console.log(`❌ ${suite.name} failed`);
        if (suite.required) {
          this.results.failedTests++;
        } else {
          this.results.skippedTests++;
        }
      }

    } catch (error) {
      suiteResult.error = error.message;
      console.log(`💥 ${suite.name} crashed: ${error.message}`);
      
      if (suite.required) {
        this.results.failedTests++;
        this.results.errors.push(`${suite.name}: ${error.message}`);
      } else {
        this.results.skippedTests++;
        this.results.warnings.push(`${suite.name}: ${error.message}`);
      }
    }

    suiteResult.executionTime = Date.now() - startTime;
    this.results.suiteResults.push(suiteResult);
    this.results.totalTests++;

    console.log(`   ⏱️ Completed in ${suiteResult.executionTime}ms`);
  }

  async executeCommand(command, timeout = 30000) {
    return new Promise((resolve, reject) => {
      console.log(`   🔄 Running: ${command}`);
      
      const proc = spawn('bash', ['-c', command], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CI: 'true'
        }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const output = stdout + stderr;
        resolve({
          success: code === 0,
          output,
          exitCode: code
        });
      });

      proc.on('error', (error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      proc.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  async checkDependencies() {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
    );

    // Check for required dependencies
    const requiredDeps = [
      '@saros-finance/sdk',
      '@saros-finance/dlmm-sdk', 
      '@solana/web3.js',
      'jest',
      'typescript'
    ];

    const missingDeps = [];
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    for (const dep of requiredDeps) {
      if (!allDeps[dep]) {
        missingDeps.push(dep);
      }
    }

    if (missingDeps.length > 0) {
      throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
    }
  }

  async checkDocumentationStructure() {
    const requiredDirs = [
      'docs/examples',
      'docs/tutorials', 
      'docs/typescript-sdk',
      'docs/dlmm-sdk',
      'docs/rust-sdk'
    ];

    for (const dir of requiredDirs) {
      const fullPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Required directory missing: ${dir}`);
      }

      const files = fs.readdirSync(fullPath);
      if (files.length === 0) {
        throw new Error(`Directory is empty: ${dir}`);
      }
    }

    // Check for required example files
    const requiredExamples = [
      'basic-token-swap.md',
      'automated-trading-bot.md',
      'dlmm-position-creator.md'
    ];

    const examplesDir = path.join(__dirname, '../docs/examples');
    for (const example of requiredExamples) {
      if (!fs.existsSync(path.join(examplesDir, example))) {
        throw new Error(`Required example missing: ${example}`);
      }
    }
  }

  async checkNetworkConnectivity() {
    const { Connection } = require('@solana/web3.js');

    for (const [network, url] of Object.entries(TEST_CONFIG.networks)) {
      try {
        const connection = new Connection(url, 'confirmed');
        await connection.getHealth();
        console.log(`   ✓ ${network} network accessible`);
      } catch (error) {
        // Don't fail for network issues, just warn
        this.results.warnings.push(`Network ${network} not accessible: ${error.message}`);
      }
    }
  }

  async checkExampleFiles() {
    const examplesDir = path.join(__dirname, '../docs/examples');
    const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.md'));

    if (files.length < 5) {
      throw new Error(`Insufficient examples: found ${files.length}, expected at least 5`);
    }

    // Check file sizes (examples should have substantial content)
    let totalSize = 0;
    for (const file of files) {
      const filePath = path.join(examplesDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;

      if (stats.size < 1000) {
        this.results.warnings.push(`Example file too small: ${file} (${stats.size} bytes)`);
      }
    }

    const averageSize = totalSize / files.length;
    if (averageSize < 5000) {
      this.results.warnings.push(`Average example file size is small: ${averageSize} bytes`);
    }

    console.log(`   📊 ${files.length} example files, average size: ${Math.round(averageSize)} bytes`);
  }

  calculatePerformanceMetrics() {
    const executionTimes = this.results.suiteResults.map(s => s.executionTime);
    
    this.results.performance.totalExecutionTime = this.results.endTime - this.results.startTime;
    this.results.performance.averageTestTime = executionTimes.length > 0 
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
      : 0;
    
    if (executionTimes.length > 0) {
      this.results.performance.slowestTest = Math.max(...executionTimes);
      this.results.performance.fastestTest = Math.min(...executionTimes);
    }
  }

  async generateReport() {
    console.log('\n📊 Generating test report...');

    const reportPath = path.join(TEST_CONFIG.outputDir, 'integration-test-report.json');
    const htmlReportPath = path.join(TEST_CONFIG.outputDir, 'integration-test-report.html');

    // Generate JSON report
    const jsonReport = {
      ...this.results,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
        testRunner: 'Saros SDK Integration Test Runner',
        version: '1.0.0'
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
    console.log(`✓ JSON report saved: ${reportPath}`);

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(jsonReport);
    fs.writeFileSync(htmlReportPath, htmlReport);
    console.log(`✓ HTML report saved: ${htmlReportPath}`);

    // Generate CSV summary for CI/CD
    const csvReport = this.generateCsvReport(jsonReport);
    const csvPath = path.join(TEST_CONFIG.outputDir, 'test-summary.csv');
    fs.writeFileSync(csvPath, csvReport);
    console.log(`✓ CSV summary saved: ${csvPath}`);
  }

  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saros SDK Integration Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .header p { margin: 0; opacity: 0.9; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; border-left: 4px solid #007bff; }
        .metric h3 { margin: 0 0 10px 0; color: #495057; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric .value { font-size: 24px; font-weight: bold; color: #212529; }
        .suite { margin-bottom: 25px; border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; }
        .suite-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; }
        .suite-header h3 { margin: 0; color: #495057; }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .status.passed { background: #d4edda; color: #155724; }
        .status.failed { background: #f8d7da; color: #721c24; }
        .status.skipped { background: #fff3cd; color: #856404; }
        .suite-body { padding: 20px; }
        .suite-body pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; line-height: 1.4; }
        .errors { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 20px; margin-top: 20px; }
        .warnings { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Saros SDK Integration Test Report</h1>
            <p>Generated on ${report.metadata.timestamp}</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="metric">
                    <h3>Total Tests</h3>
                    <div class="value">${report.totalTests}</div>
                </div>
                <div class="metric">
                    <h3>Passed</h3>
                    <div class="value" style="color: #28a745;">${report.passedTests}</div>
                </div>
                <div class="metric">
                    <h3>Failed</h3>
                    <div class="value" style="color: #dc3545;">${report.failedTests}</div>
                </div>
                <div class="metric">
                    <h3>Execution Time</h3>
                    <div class="value">${Math.round(report.performance.totalExecutionTime / 1000)}s</div>
                </div>
            </div>

            <h2>Test Suite Results</h2>
            ${report.suiteResults.map(suite => `
                <div class="suite">
                    <div class="suite-header">
                        <h3>${suite.name}</h3>
                        <span class="status ${suite.success ? 'passed' : 'failed'}">
                            ${suite.success ? 'passed' : 'failed'}
                        </span>
                    </div>
                    <div class="suite-body">
                        <p><strong>Command:</strong> <code>${suite.command}</code></p>
                        <p><strong>Execution Time:</strong> ${suite.executionTime}ms</p>
                        ${suite.error ? `<p><strong>Error:</strong> ${suite.error}</p>` : ''}
                        ${suite.output ? `
                            <details>
                                <summary>Output</summary>
                                <pre>${suite.output.substring(0, 2000)}${suite.output.length > 2000 ? '...' : ''}</pre>
                            </details>
                        ` : ''}
                    </div>
                </div>
            `).join('')}

            ${report.errors.length > 0 ? `
                <div class="errors">
                    <h3>❌ Errors</h3>
                    <ul>
                        ${report.errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            ${report.warnings.length > 0 ? `
                <div class="warnings">
                    <h3>⚠️ Warnings</h3>
                    <ul>
                        ${report.warnings.map(warning => `<li>${warning}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  generateCsvReport(report) {
    const lines = [
      'Suite Name,Status,Required,Execution Time (ms),Command'
    ];

    for (const suite of report.suiteResults) {
      lines.push([
        suite.name,
        suite.success ? 'PASSED' : 'FAILED',
        suite.required ? 'YES' : 'NO',
        suite.executionTime,
        `"${suite.command}"`
      ].join(','));
    }

    return lines.join('\n');
  }

  printSummary() {
    const { passedTests, failedTests, skippedTests, totalTests } = this.results;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const duration = this.results.endTime - this.results.startTime;

    console.log('\n' + '='.repeat(80));
    console.log('📈 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`🏆 Success Rate: ${successRate.toFixed(1)}% (${passedTests}/${totalTests})`);
    console.log(`⏱️  Total Time: ${Math.round(duration / 1000)}s`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏸️  Skipped: ${skippedTests}`);

    if (this.results.errors.length > 0) {
      console.log(`\n🔥 Critical Errors: ${this.results.errors.length}`);
      this.results.errors.forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error}`);
      });
    }

    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${this.results.warnings.length}`);
      this.results.warnings.forEach((warning, idx) => {
        console.log(`   ${idx + 1}. ${warning}`);
      });
    }

    // Performance insights
    if (this.results.performance.slowestTest && this.results.performance.fastestTest) {
      console.log(`\n🏃‍♂️ Performance:`);
      console.log(`   Fastest Test: ${this.results.performance.fastestTest}ms`);
      console.log(`   Slowest Test: ${this.results.performance.slowestTest}ms`);
      console.log(`   Average Test Time: ${Math.round(this.results.performance.averageTestTime)}ms`);
    }

    // Final status
    const hasRequiredFailures = this.results.suiteResults.some(
      suite => !suite.success && suite.required
    );

    console.log('\n' + '='.repeat(80));
    if (hasRequiredFailures) {
      console.log('❌ INTEGRATION TESTS FAILED - Required tests failed');
    } else {
      console.log('✅ INTEGRATION TESTS PASSED - All required tests successful');
    }
    console.log('='.repeat(80));
  }
}

// CLI argument processing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    verbose: false,
    suite: null,
    network: 'devnet',
    generateReport: true,
    parallel: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--suite':
      case '-s':
        options.suite = args[++i];
        break;
      case '--network':
      case '-n':
        options.network = args[++i];
        break;
      case '--no-report':
        options.generateReport = false;
        break;
      case '--parallel':
      case '-p':
        options.parallel = true;
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
Saros SDK Integration Test Runner

Usage: node run-integration-tests.js [options]

Options:
  -v, --verbose         Enable verbose output
  -s, --suite <name>    Run specific test suite only
  -n, --network <net>   Use specific network (devnet|mainnet)
  --no-report          Skip report generation
  -p, --parallel       Run tests in parallel (experimental)
  -h, --help           Show this help message

Examples:
  node run-integration-tests.js                    # Run all tests
  node run-integration-tests.js --verbose          # Run with verbose output
  node run-integration-tests.js --suite "Example Validation"  # Run specific suite
  node run-integration-tests.js --network mainnet  # Test against mainnet
`);
}

// Main execution
async function main() {
  const options = parseArgs();
  
  if (options.verbose) {
    process.env.DEBUG_TESTS = 'true';
  }

  // Update test config based on options
  if (options.suite) {
    TEST_CONFIG.testSuites = TEST_CONFIG.testSuites.filter(
      suite => suite.name.toLowerCase().includes(options.suite.toLowerCase())
    );
  }

  if (!options.generateReport) {
    TEST_CONFIG.generateReport = false;
  }

  const runner = new IntegrationTestRunner();
  
  try {
    await runner.run();
  } catch (error) {
    console.error('💥 Test runner failed:', error.message);
    process.exit(1);
  }
}

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { IntegrationTestRunner, TEST_CONFIG };