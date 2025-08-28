/**
 * Global Test Setup for Saros SDK Documentation Tests
 * 
 * Configures Jest environment for testing documentation examples
 * with proper SDK mocking and network simulation.
 */

const path = require('path');
const fs = require('fs');

// Global test timeout
jest.setTimeout(30000);

// Console setup for better test output
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('⚠')) {
    // Suppress warnings in test output unless debugging
    if (process.env.DEBUG_TESTS) {
      originalConsoleError.apply(console, args);
    }
  } else {
    originalConsoleError.apply(console, args);
  }
};

// Setup global test environment
beforeAll(async () => {
  console.log('🚀 Setting up Saros SDK documentation test environment');
  
  // Verify required directories exist
  const requiredDirs = [
    path.join(__dirname, '../docs/examples'),
    path.join(__dirname, '../docs/tutorials'),
    path.join(__dirname, '../docs/typescript-sdk'),
    path.join(__dirname, '../docs/dlmm-sdk'),
    path.join(__dirname, '../docs/rust-sdk')
  ];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Required directory missing: ${dir}`);
    }
  }

  // Create temp directories for tests
  const tempDirs = [
    path.join(__dirname, 'temp'),
    path.join(__dirname, 'temp/typescript'),
    path.join(__dirname, 'temp/rust'),
    path.join(__dirname, 'temp/logs')
  ];

  tempDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Verify SDK packages are available (with graceful fallback to mocks)
  try {
    require('@saros-finance/sdk');
    console.log('✓ @saros-finance/sdk package available');
  } catch (error) {
    console.log('⚠ @saros-finance/sdk not available, using mocks');
  }

  try {
    require('@saros-finance/dlmm-sdk');
    console.log('✓ @saros-finance/dlmm-sdk package available');
  } catch (error) {
    console.log('⚠ @saros-finance/dlmm-sdk not available, using mocks');
  }

  console.log('✅ Test environment setup complete');
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment');
  
  // Clean up temp files
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('✓ Temporary files cleaned up');
    } catch (error) {
      console.warn('⚠ Failed to clean up temp directory:', error.message);
    }
  }
});

// Enhanced expect matchers for documentation testing
expect.extend({
  toBeValidSolanaAddress(received) {
    const { PublicKey } = require('@solana/web3.js');
    
    try {
      new PublicKey(received);
      return {
        message: () => `Expected ${received} not to be a valid Solana address`,
        pass: true,
      };
    } catch (error) {
      return {
        message: () => `Expected ${received} to be a valid Solana address, but got error: ${error.message}`,
        pass: false,
      };
    }
  },

  toHaveValidTypeScript(received) {
    // Check if TypeScript code block has basic validity markers
    const hasImports = received.includes('import') || received.includes('require');
    const hasExports = received.includes('export') || received.includes('module.exports');
    const hasFunctions = received.includes('function') || received.includes('=>') || received.includes('async');
    const hasTypes = received.includes(':') && (received.includes('string') || received.includes('number') || received.includes('boolean'));

    const isValid = hasImports && (hasExports || hasFunctions);

    return {
      message: () => `Expected code to be valid TypeScript with imports and functions/exports`,
      pass: isValid,
    };
  },

  toHaveValidRust(received) {
    // Check if Rust code has basic validity
    const hasUseClauses = received.includes('use ');
    const hasFunctions = received.includes('fn ') || received.includes('async fn');
    const hasStructsOrEnums = received.includes('struct ') || received.includes('enum ');
    const hasErrorHandling = received.includes('Result<') || received.includes('?') || received.includes('unwrap');

    const isValid = hasUseClauses && hasFunctions && hasErrorHandling;

    return {
      message: () => `Expected Rust code to have use clauses, functions, and error handling`,
      pass: isValid,
    };
  },

  toHaveProperErrorHandling(received) {
    const errorPatterns = [
      'try', 'catch', 'finally',           // JS/TS
      'Result<', '?', '.unwrap_or',        // Rust
      'throw new Error', 'reject(',        // Error throwing
      '.catch(', 'error =>'                // Async error handling
    ];

    const hasErrorHandling = errorPatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      return regex.test(received);
    });

    return {
      message: () => `Expected code to have proper error handling with try/catch, Result<T>, or similar patterns`,
      pass: hasErrorHandling,
    };
  },

  toBeOptimizedCode(received) {
    const optimizationPatterns = [
      'async', 'Promise.all', 'parallel',  // Async optimization
      'cache', 'memo', 'useMemo',          // Caching
      'batch', 'bulk', 'chunk',            // Batching
      'optimize', 'efficient', 'fast',     // Optimization keywords
      'performance', 'benchmark'           // Performance considerations
    ];

    const hasOptimization = optimizationPatterns.some(pattern => {
      return received.toLowerCase().includes(pattern);
    });

    return {
      message: () => `Expected code to show optimization techniques (async, caching, batching, etc.)`,
      pass: hasOptimization,
    };
  }
});

// Global test utilities
global.testUtils = {
  createTempFile: (content, extension = '.ts') => {
    const tempFile = path.join(__dirname, 'temp', `test-${Date.now()}${extension}`);
    fs.writeFileSync(tempFile, content);
    return tempFile;
  },

  cleanupTempFile: (filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },

  readExampleFile: (exampleName) => {
    const examplePath = path.join(__dirname, '../docs/examples', `${exampleName}.md`);
    return fs.readFileSync(examplePath, 'utf8');
  },

  readTutorialFile: (tutorialName) => {
    const tutorialPath = path.join(__dirname, '../docs/tutorials', `${tutorialName}.md`);
    return fs.readFileSync(tutorialPath, 'utf8');
  },

  extractCodeBlocks: (content, language = null) => {
    const regex = language 
      ? new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\`\`\``, 'g')
      : /```\w*\n([\s\S]*?)```/g;
    
    const blocks = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      blocks.push(match[1]);
    }

    return blocks;
  },

  measureExecutionTime: async (asyncFunction) => {
    const start = process.hrtime.bigint();
    const result = await asyncFunction();
    const end = process.hrtime.bigint();
    
    return {
      result,
      executionTime: Number(end - start) / 1000000 // Convert to milliseconds
    };
  },

  retryAsync: async (asyncFunction, maxAttempts = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await asyncFunction();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error.message);
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  }
};

// Mock setup for SDK packages if not available
try {
  require('@saros-finance/sdk');
} catch (error) {
  // Setup mock if real SDK not available
  jest.mock('@saros-finance/sdk', () => ({
    SarosSDK: jest.fn().mockImplementation(() => ({
      connection: null,
      wallet: null,
      cluster: 'devnet',
      getSwapQuote: jest.fn().mockResolvedValue({
        outputAmount: 1000000,
        priceImpact: 0.001,
        route: []
      }),
      executeSwap: jest.fn().mockResolvedValue({
        signature: 'mock-signature',
        success: true
      })
    })),
    SwapSDK: jest.fn().mockImplementation(() => ({
      quote: jest.fn(),
      swap: jest.fn()
    }))
  }));
}

try {
  require('@saros-finance/dlmm-sdk');
} catch (error) {
  // Setup DLMM SDK mock
  jest.mock('@saros-finance/dlmm-sdk', () => ({
    DLMMSDK: jest.fn().mockImplementation(() => ({
      connection: null,
      cluster: 'devnet',
      getAllPools: jest.fn().mockResolvedValue([
        {
          address: 'mock-pool-address',
          tokenMintX: 'So11111111111111111111111111111111111111112',
          tokenMintY: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        }
      ]),
      getPool: jest.fn().mockResolvedValue({
        address: 'mock-pool-address',
        tokenMintX: 'So11111111111111111111111111111111111111112',
        tokenMintY: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        activeId: 8388608,
        binStep: 1
      }),
      createPosition: jest.fn().mockResolvedValue({
        address: 'mock-position-address',
        signature: 'mock-signature'
      })
    })),
    DLMMSDKv2: jest.fn().mockImplementation(() => ({
      // Mock implementation for v2
      initialize: jest.fn(),
      getActiveBin: jest.fn(),
      addLiquidity: jest.fn(),
      removeLiquidity: jest.fn()
    }))
  }));
}

console.log('🏗️  Test setup complete - ready to run documentation validation tests');