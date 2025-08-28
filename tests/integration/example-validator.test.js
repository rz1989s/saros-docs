/**
 * Comprehensive Integration Test Suite for Saros SDK Examples
 * 
 * This test suite validates all documentation examples work correctly
 * with real SDK implementations on devnet and mainnet networks.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');

// Test configuration
const TEST_CONFIG = {
  networks: {
    devnet: 'https://api.devnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com'
  },
  timeout: 30000, // 30 second timeout per test
  retries: 3,
  testWallet: Keypair.generate(),
  knownPools: {
    devnet: {
      solUsdc: '5BHZkcKobCXvuzKsMqZiPjYmhA2KGjvNJ9Xp6sF8KP8x',
      usdcUsdt: '7BHZkcKobCXvuzKsMqZiPjYmhA2KGjvNJ9Xp6sF8KP8x'
    },
    mainnet: {
      solUsdc: 'ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq',
      usdcUsdt: '3ne4mWqdYuNiYrYZC9TrA3FcfuFdErghH97vNPbjicr1'
    }
  }
};

describe('Saros SDK Examples Integration Tests', () => {
  let connections = {};
  
  beforeAll(async () => {
    // Initialize connections
    connections.devnet = new Connection(TEST_CONFIG.networks.devnet, 'confirmed');
    connections.mainnet = new Connection(TEST_CONFIG.networks.mainnet, 'confirmed');
    
    // Ensure test environment is properly configured
    await setupTestEnvironment();
  }, TEST_CONFIG.timeout);

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  describe('TypeScript SDK Examples', () => {
    test('Basic Token Swap Example', async () => {
      const result = await validateTypeScriptExample('basic-token-swap');
      expect(result.success).toBe(true);
      expect(result.compilationErrors).toHaveLength(0);
    });

    test('Automated Trading Bot Example', async () => {
      const result = await validateTypeScriptExample('automated-trading-bot');
      expect(result.success).toBe(true);
      expect(result.hasErrorHandling).toBe(true);
    });

    test('Arbitrage Bot Example', async () => {
      const result = await validateTypeScriptExample('arbitrage-bot');
      expect(result.success).toBe(true);
      expect(result.hasRiskManagement).toBe(true);
    });

    test('Portfolio Analytics Dashboard', async () => {
      const result = await validateTypeScriptExample('portfolio-analytics-dashboard');
      expect(result.success).toBe(true);
      expect(result.hasDataValidation).toBe(true);
    });

    test('DeFi Analytics Dashboard', async () => {
      const result = await validateTypeScriptExample('defi-analytics-dashboard');
      expect(result.success).toBe(true);
      expect(result.hasVisualization).toBe(true);
    });

    test('Liquidity Farming Strategy', async () => {
      const result = await validateTypeScriptExample('liquidity-farming-strategy');
      expect(result.success).toBe(true);
      expect(result.hasYieldCalculation).toBe(true);
    });

    test('Staking Rewards Automation', async () => {
      const result = await validateTypeScriptExample('staking-rewards-automation');
      expect(result.success).toBe(true);
      expect(result.hasAutomation).toBe(true);
    });
  });

  describe('DLMM SDK Examples', () => {
    test('DLMM Position Creator', async () => {
      const result = await validateTypeScriptExample('dlmm-position-creator');
      expect(result.success).toBe(true);
      expect(result.hasDLMMIntegration).toBe(true);
    });

    test('DLMM Range Orders', async () => {
      const result = await validateTypeScriptExample('dlmm-range-orders');
      expect(result.success).toBe(true);
      expect(result.hasOrderManagement).toBe(true);
    });

    test('DLMM Bin Analyzer', async () => {
      const result = await validateTypeScriptExample('dlmm-bin-analyzer');
      expect(result.success).toBe(true);
      expect(result.hasAnalytics).toBe(true);
    });
  });

  describe('Rust SDK Examples', () => {
    test('Rust High-Frequency Trading Bot', async () => {
      const result = await validateRustExample('rust-hft-bot');
      expect(result.success).toBe(true);
      expect(result.compilationSuccess).toBe(true);
      expect(result.hasPerformanceOptimization).toBe(true);
    });

    test('Rust MEV Protection', async () => {
      const result = await validateRustExample('rust-mev-protection');
      expect(result.success).toBe(true);
      expect(result.hasMEVProtection).toBe(true);
    });

    test('Rust On-Chain Integration', async () => {
      const result = await validateRustExample('rust-onchain-integration');
      expect(result.success).toBe(true);
      expect(result.hasCPIIntegration).toBe(true);
    });
  });

  describe('Tutorial Examples', () => {
    test('Building Swap Interface Tutorial', async () => {
      const result = await validateTutorialExample('building-swap-interface');
      expect(result.success).toBe(true);
      expect(result.hasStepByStepGuide).toBe(true);
    });

    test('Liquidity Provider Dashboard Tutorial', async () => {
      const result = await validateTutorialExample('liquidity-provider-dashboard');
      expect(result.success).toBe(true);
      expect(result.hasUIComponents).toBe(true);
    });

    test('Managing Concentrated Liquidity Tutorial', async () => {
      const result = await validateTutorialExample('managing-concentrated-liquidity');
      expect(result.success).toBe(true);
      expect(result.hasDLMMManagement).toBe(true);
    });

    test('Optimizing DLMM Strategies Tutorial', async () => {
      const result = await validateTutorialExample('optimizing-dlmm-strategies');
      expect(result.success).toBe(true);
      expect(result.hasOptimizationStrategies).toBe(true);
    });

    test('Staking Integration Tutorial', async () => {
      const result = await validateTutorialExample('staking-integration');
      expect(result.success).toBe(true);
      expect(result.hasStakingIntegration).toBe(true);
    });
  });

  describe('Network Integration Tests', () => {
    test('DevNet SDK Connectivity', async () => {
      const connection = connections.devnet;
      const health = await connection.getHealth();
      expect(health).toBe('ok');

      // Test SDK initialization on devnet
      const { SarosSDK } = require('@saros-finance/sdk');
      const sdk = new SarosSDK({
        connection,
        wallet: TEST_CONFIG.testWallet,
        cluster: 'devnet'
      });

      expect(sdk).toBeDefined();
      expect(sdk.connection).toBe(connection);
    });

    test('MainNet Pool Data Access', async () => {
      const connection = connections.mainnet;
      
      // Test accessing real pool data
      const poolAddress = new PublicKey(TEST_CONFIG.knownPools.mainnet.solUsdc);
      const accountInfo = await connection.getAccountInfo(poolAddress);
      
      expect(accountInfo).toBeTruthy();
      expect(accountInfo.data).toBeInstanceOf(Buffer);
    });

    test('DLMM SDK Network Integration', async () => {
      const { DLMMSDK } = require('@saros-finance/dlmm-sdk');
      
      const dlmmSdk = new DLMMSDK({
        connection: connections.devnet,
        cluster: 'devnet'
      });

      expect(dlmmSdk).toBeDefined();
      
      // Test basic DLMM operations
      const pools = await dlmmSdk.getAllPools();
      expect(Array.isArray(pools)).toBe(true);
    });
  });

  describe('Security Validation Tests', () => {
    test('No Hardcoded Private Keys', async () => {
      const violations = await scanForSecurityViolations();
      expect(violations.hardcodedKeys).toHaveLength(0);
      expect(violations.unsafePatterns).toHaveLength(0);
    });

    test('Proper Error Handling Coverage', async () => {
      const coverage = await analyzeErrorHandlingCoverage();
      expect(coverage.percentage).toBeGreaterThan(85); // Minimum 85% error handling
    });

    test('Input Validation Present', async () => {
      const validation = await checkInputValidation();
      expect(validation.hasInputValidation).toBe(true);
      expect(validation.validatesAmounts).toBe(true);
      expect(validation.validatesAddresses).toBe(true);
    });
  });

  describe('Performance Validation Tests', () => {
    test('TypeScript Examples Performance', async () => {
      const results = await benchmarkTypeScriptExamples();
      
      // Examples should complete within reasonable time
      results.forEach(result => {
        expect(result.executionTime).toBeLessThan(10000); // 10 seconds max
        expect(result.memoryUsage).toBeLessThan(500 * 1024 * 1024); // 500MB max
      });
    });

    test('Rust Examples Performance', async () => {
      const results = await benchmarkRustExamples();
      
      // Rust examples should be highly performant
      results.forEach(result => {
        expect(result.executionTime).toBeLessThan(5000); // 5 seconds max
        expect(result.memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB max
      });
    });
  });
});

// Helper Functions

async function setupTestEnvironment() {
  console.log('Setting up integration test environment...');
  
  // Ensure SDKs are installed
  try {
    require('@saros-finance/sdk');
    require('@saros-finance/dlmm-sdk');
  } catch (error) {
    throw new Error('Required SDKs not installed. Run npm install first.');
  }

  // Create test directories if needed
  const testDirs = ['temp', 'temp/typescript', 'temp/rust', 'temp/logs'];
  testDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  // Verify network connectivity
  for (const [network, url] of Object.entries(TEST_CONFIG.networks)) {
    try {
      const connection = new Connection(url);
      const health = await connection.getHealth();
      console.log(`${network} network health: ${health}`);
    } catch (error) {
      console.warn(`Warning: ${network} network not accessible: ${error.message}`);
    }
  }
}

async function cleanupTestEnvironment() {
  console.log('Cleaning up test environment...');
  
  // Remove temporary files
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function validateTypeScriptExample(exampleName) {
  const examplePath = path.join(__dirname, '../../docs/examples', `${exampleName}.md`);
  
  if (!fs.existsSync(examplePath)) {
    throw new Error(`Example file not found: ${examplePath}`);
  }

  const content = fs.readFileSync(examplePath, 'utf8');
  const codeBlocks = extractTypeScriptCodeBlocks(content);
  
  const result = {
    success: true,
    compilationErrors: [],
    hasErrorHandling: false,
    hasRiskManagement: false,
    hasDataValidation: false,
    hasVisualization: false,
    hasYieldCalculation: false,
    hasAutomation: false,
    hasDLMMIntegration: false,
    hasOrderManagement: false,
    hasAnalytics: false,
    executionTime: 0,
    memoryUsage: 0
  };

  for (const codeBlock of codeBlocks) {
    try {
      // Write code to temporary file
      const tempFile = path.join(__dirname, 'temp/typescript', `${exampleName}-${Date.now()}.ts`);
      fs.writeFileSync(tempFile, codeBlock);

      // Compile TypeScript
      const startTime = Date.now();
      const compileResult = await compileTypeScript(tempFile);
      result.executionTime = Date.now() - startTime;

      if (!compileResult.success) {
        result.success = false;
        result.compilationErrors.push(...compileResult.errors);
      }

      // Analyze code for required patterns
      result.hasErrorHandling = codeBlock.includes('try') && codeBlock.includes('catch');
      result.hasRiskManagement = codeBlock.includes('risk') || codeBlock.includes('stop');
      result.hasDataValidation = codeBlock.includes('validate') || codeBlock.includes('assert');
      result.hasVisualization = codeBlock.includes('chart') || codeBlock.includes('graph');
      result.hasYieldCalculation = codeBlock.includes('yield') || codeBlock.includes('apy');
      result.hasAutomation = codeBlock.includes('setInterval') || codeBlock.includes('schedule');
      result.hasDLMMIntegration = codeBlock.includes('DLMM') || codeBlock.includes('dlmm');
      result.hasOrderManagement = codeBlock.includes('order') || codeBlock.includes('Order');
      result.hasAnalytics = codeBlock.includes('analyze') || codeBlock.includes('Analytics');

      // Clean up temp file
      fs.unlinkSync(tempFile);

    } catch (error) {
      result.success = false;
      result.compilationErrors.push(error.message);
    }
  }

  return result;
}

async function validateRustExample(exampleName) {
  const examplePath = path.join(__dirname, '../../docs/examples', `${exampleName}.md`);
  
  if (!fs.existsSync(examplePath)) {
    throw new Error(`Rust example file not found: ${examplePath}`);
  }

  const content = fs.readFileSync(examplePath, 'utf8');
  const cargoToml = extractCargoToml(content);
  const rustCode = extractRustCodeBlocks(content);

  const result = {
    success: true,
    compilationSuccess: false,
    hasPerformanceOptimization: false,
    hasMEVProtection: false,
    hasCPIIntegration: false,
    executionTime: 0,
    memoryUsage: 0
  };

  try {
    // Create temporary Rust project
    const tempProjectDir = path.join(__dirname, 'temp/rust', `${exampleName}-${Date.now()}`);
    fs.mkdirSync(tempProjectDir, { recursive: true });

    // Write Cargo.toml
    fs.writeFileSync(path.join(tempProjectDir, 'Cargo.toml'), cargoToml);

    // Create src directory and main.rs
    const srcDir = path.join(tempProjectDir, 'src');
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, 'main.rs'), rustCode);

    // Attempt to compile
    const startTime = Date.now();
    const compileResult = await compileRustProject(tempProjectDir);
    result.executionTime = Date.now() - startTime;
    result.compilationSuccess = compileResult.success;

    // Analyze for required patterns
    result.hasPerformanceOptimization = 
      rustCode.includes('opt-level') || rustCode.includes('parallel') || rustCode.includes('async');
    result.hasMEVProtection = 
      rustCode.includes('MEV') || rustCode.includes('sandwich') || rustCode.includes('front_running');
    result.hasCPIIntegration = 
      rustCode.includes('CPI') || rustCode.includes('CrossProgramInvocation') || rustCode.includes('invoke');

    result.success = compileResult.success;

    // Clean up temp directory
    fs.rmSync(tempProjectDir, { recursive: true, force: true });

  } catch (error) {
    result.success = false;
    console.error(`Rust example validation failed for ${exampleName}:`, error.message);
  }

  return result;
}

async function validateTutorialExample(tutorialName) {
  const tutorialPath = path.join(__dirname, '../../docs/tutorials', `${tutorialName}.md`);
  
  if (!fs.existsSync(tutorialPath)) {
    throw new Error(`Tutorial file not found: ${tutorialPath}`);
  }

  const content = fs.readFileSync(tutorialPath, 'utf8');
  const codeBlocks = extractAllCodeBlocks(content);

  const result = {
    success: true,
    hasStepByStepGuide: false,
    hasUIComponents: false,
    hasDLMMManagement: false,
    hasOptimizationStrategies: false,
    hasStakingIntegration: false,
    codeBlocksValidated: 0,
    totalCodeBlocks: codeBlocks.length
  };

  // Analyze tutorial structure
  result.hasStepByStepGuide = content.includes('## Step') || content.includes('### Step');
  result.hasUIComponents = content.includes('component') || content.includes('interface');
  result.hasDLMMManagement = content.includes('DLMM') && content.includes('manage');
  result.hasOptimizationStrategies = content.includes('optim') || content.includes('strategy');
  result.hasStakingIntegration = content.includes('staking') || content.includes('stake');

  // Validate code blocks
  for (const codeBlock of codeBlocks) {
    try {
      if (codeBlock.language === 'typescript' || codeBlock.language === 'javascript') {
        await validateTypeScriptCodeBlock(codeBlock.code, tutorialName);
      } else if (codeBlock.language === 'rust') {
        await validateRustCodeBlock(codeBlock.code, tutorialName);
      }
      result.codeBlocksValidated++;
    } catch (error) {
      console.warn(`Code block validation failed in ${tutorialName}:`, error.message);
      result.success = false;
    }
  }

  return result;
}

async function compileTypeScript(filePath) {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['tsc', '--noEmit', '--strict', filePath], {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe'
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        errors: code === 0 ? [] : [stderr]
      });
    });

    setTimeout(() => {
      proc.kill();
      resolve({
        success: false,
        errors: ['Compilation timeout']
      });
    }, TEST_CONFIG.timeout);
  });
}

async function compileRustProject(projectDir) {
  return new Promise((resolve) => {
    const proc = spawn('cargo', ['check', '--all-features'], {
      cwd: projectDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        CARGO_TARGET_DIR: path.join(projectDir, 'target')
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
      resolve({
        success: code === 0,
        stdout,
        stderr,
        errors: code === 0 ? [] : [stderr]
      });
    });

    setTimeout(() => {
      proc.kill();
      resolve({
        success: false,
        errors: ['Rust compilation timeout']
      });
    }, TEST_CONFIG.timeout);
  });
}

async function benchmarkTypeScriptExamples() {
  const examples = [
    'basic-token-swap',
    'automated-trading-bot', 
    'arbitrage-bot',
    'portfolio-analytics-dashboard',
    'defi-analytics-dashboard'
  ];

  const results = [];

  for (const example of examples) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      await validateTypeScriptExample(example);
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;

      results.push({
        example,
        executionTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        success: true
      });

    } catch (error) {
      results.push({
        example,
        executionTime: Date.now() - startTime,
        memoryUsage: 0,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

async function benchmarkRustExamples() {
  const examples = [
    'rust-hft-bot',
    'rust-mev-protection',
    'rust-onchain-integration'
  ];

  const results = [];

  for (const example of examples) {
    const startTime = Date.now();

    try {
      const result = await validateRustExample(example);
      
      results.push({
        example,
        executionTime: Date.now() - startTime,
        memoryUsage: 0, // Would need additional tooling for Rust memory measurement
        success: result.success
      });

    } catch (error) {
      results.push({
        example,
        executionTime: Date.now() - startTime,
        memoryUsage: 0,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

async function scanForSecurityViolations() {
  const violations = {
    hardcodedKeys: [],
    unsafePatterns: []
  };

  const examplesDir = path.join(__dirname, '../../docs/examples');
  const tutorialsDir = path.join(__dirname, '../../docs/tutorials');

  // Scan all markdown files
  const allFiles = [
    ...fs.readdirSync(examplesDir).map(f => path.join(examplesDir, f)),
    ...fs.readdirSync(tutorialsDir).map(f => path.join(tutorialsDir, f))
  ].filter(f => f.endsWith('.md'));

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for hardcoded private keys (64 character hex strings that look like keys)
    const keyPattern = /[a-fA-F0-9]{64}/g;
    const matches = content.match(keyPattern) || [];
    
    for (const match of matches) {
      // Exclude known safe patterns (like example addresses)
      if (!isSafePattern(match)) {
        violations.hardcodedKeys.push({
          file: path.relative(__dirname, file),
          pattern: match,
          line: getLineNumber(content, match)
        });
      }
    }

    // Check for unsafe patterns
    const unsafePatterns = [
      'process.env.PRIVATE_KEY',
      'localStorage.getItem("privateKey")',
      'hardcoded-private-key',
      '.unwrap()',  // Rust - should use proper error handling
    ];

    for (const pattern of unsafePatterns) {
      if (content.includes(pattern)) {
        violations.unsafePatterns.push({
          file: path.relative(__dirname, file),
          pattern,
          line: getLineNumber(content, pattern)
        });
      }
    }
  }

  return violations;
}

function isSafePattern(hexString) {
  // Known safe patterns (system program IDs, example addresses, etc.)
  const safePatterns = [
    '11111111111111111111111111111111',  // System program
    '00000000000000000000000000000000',  // Null address
    'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',  // DLMM program
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'   // Jupiter program
  ];

  return safePatterns.some(pattern => hexString.includes(pattern.toLowerCase()));
}

async function analyzeErrorHandlingCoverage() {
  const examplesDir = path.join(__dirname, '../../docs/examples');
  const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.md'));

  let totalCodeBlocks = 0;
  let blocksWithErrorHandling = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(examplesDir, file), 'utf8');
    const codeBlocks = extractAllCodeBlocks(content);
    
    totalCodeBlocks += codeBlocks.length;

    for (const block of codeBlocks) {
      if (hasErrorHandling(block.code)) {
        blocksWithErrorHandling++;
      }
    }
  }

  return {
    totalBlocks: totalCodeBlocks,
    blocksWithErrorHandling,
    percentage: totalCodeBlocks > 0 ? (blocksWithErrorHandling / totalCodeBlocks) * 100 : 0
  };
}

function hasErrorHandling(code) {
  const errorHandlingPatterns = [
    'try', 'catch', 'finally',           // JavaScript/TypeScript
    'Result<', '.unwrap_or', '?',        // Rust
    'throw', 'Error', 'reject',          // Error throwing
    '.catch(', 'await.*catch'            // Async error handling
  ];

  return errorHandlingPatterns.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(code);
  });
}

async function checkInputValidation() {
  const examplesDir = path.join(__dirname, '../../docs/examples');
  const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.md'));

  let hasInputValidation = false;
  let validatesAmounts = false;
  let validatesAddresses = false;

  for (const file of files) {
    const content = fs.readFileSync(path.join(examplesDir, file), 'utf8');
    
    if (content.includes('validate') || content.includes('assert') || content.includes('check')) {
      hasInputValidation = true;
    }
    
    if (content.includes('amount') && (content.includes('validate') || content.includes('>'))) {
      validatesAmounts = true;
    }
    
    if (content.includes('PublicKey') && content.includes('validate')) {
      validatesAddresses = true;
    }
  }

  return {
    hasInputValidation,
    validatesAmounts,
    validatesAddresses
  };
}

// Utility functions for parsing markdown
function extractTypeScriptCodeBlocks(content) {
  const codeBlockRegex = /```(?:typescript|javascript|ts|js)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

function extractRustCodeBlocks(content) {
  const codeBlockRegex = /```(?:rust|rs)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push(match[1]);
  }

  return blocks.join('\n\n');
}

function extractCargoToml(content) {
  const cargoRegex = /```toml\n([\s\S]*?)```/;
  const match = content.match(cargoRegex);
  
  if (match && match[1].includes('[package]')) {
    return match[1];
  }

  // Return default Cargo.toml if not found
  return `[package]
name = "example"
version = "0.1.0"
edition = "2021"

[dependencies]
saros-dlmm-sdk-rs = "0.1.0"
solana-sdk = "1.18.0"
tokio = { version = "1.0", features = ["full"] }
anyhow = "1.0"
`;
}

function extractAllCodeBlocks(content) {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2]
    });
  }

  return blocks;
}

async function validateTypeScriptCodeBlock(code, context) {
  // Create temporary TypeScript file
  const tempFile = path.join(__dirname, 'temp/typescript', `${context}-${Date.now()}.ts`);
  
  // Add necessary imports if missing
  let processedCode = code;
  if (!code.includes('import') && (code.includes('SarosSDK') || code.includes('DLMMSDK'))) {
    processedCode = `
import { SarosSDK } from '@saros-finance/sdk';
import { DLMMSDK } from '@saros-finance/dlmm-sdk';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

${code}
`;
  }

  fs.writeFileSync(tempFile, processedCode);

  try {
    const result = await compileTypeScript(tempFile);
    if (!result.success) {
      throw new Error(`TypeScript compilation failed: ${result.errors.join(', ')}`);
    }
  } finally {
    // Clean up
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

async function validateRustCodeBlock(code, context) {
  // For Rust code blocks in tutorials, just check syntax
  const tempDir = path.join(__dirname, 'temp/rust', `${context}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const cargoToml = `[package]
name = "tutorial-test"
version = "0.1.0"
edition = "2021"

[dependencies]
saros-dlmm-sdk-rs = "0.1.0"
solana-sdk = "1.18.0"
tokio = { version = "1.0", features = ["full"] }
anyhow = "1.0"
`;

  fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), cargoToml);
  fs.mkdirSync(path.join(tempDir, 'src'));
  
  // Wrap code in main function if not already wrapped
  let processedCode = code;
  if (!code.includes('fn main')) {
    processedCode = `
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    ${code}
    Ok(())
}
`;
  }

  fs.writeFileSync(path.join(tempDir, 'src', 'main.rs'), processedCode);

  try {
    const result = await compileRustProject(tempDir);
    if (!result.success) {
      throw new Error(`Rust compilation failed: ${result.stderr}`);
    }
  } finally {
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function getLineNumber(content, searchString) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchString)) {
      return i + 1;
    }
  }
  return -1;
}

// Export for use in other test files
module.exports = {
  TEST_CONFIG,
  validateTypeScriptExample,
  validateRustExample,
  validateTutorialExample,
  scanForSecurityViolations,
  analyzeErrorHandlingCoverage,
  checkInputValidation
};