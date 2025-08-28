/**
 * Environment Setup for Integration Tests
 * 
 * Configures test environment variables and global settings
 * for consistent integration test execution.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CI = process.env.CI || 'false';

// Default test configuration
process.env.TEST_TIMEOUT = process.env.TEST_TIMEOUT || '30000';
process.env.MAX_RETRIES = process.env.MAX_RETRIES || '3';
process.env.TEST_NETWORK = process.env.TEST_NETWORK || 'devnet';

// Solana test configuration
process.env.SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
process.env.SOLANA_WS_URL = process.env.SOLANA_WS_URL || 'wss://api.devnet.solana.com';

// SDK test configuration
process.env.USE_MOCK_SDKS = process.env.USE_MOCK_SDKS || 'true';
process.env.SDK_DEBUG = process.env.SDK_DEBUG || 'false';

// Performance test settings
process.env.PERFORMANCE_THRESHOLD_MS = process.env.PERFORMANCE_THRESHOLD_MS || '10000';
process.env.MEMORY_THRESHOLD_MB = process.env.MEMORY_THRESHOLD_MB || '500';

// Logging configuration for tests
if (process.env.DEBUG_TESTS !== 'true') {
  // Suppress console.log in tests unless debugging
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    if (args[0]?.includes?.('✓') || args[0]?.includes?.('❌') || args[0]?.includes?.('⚠')) {
      originalConsoleLog.apply(console, args);
    }
  };
}

console.log('🔧 Integration test environment configured');
console.log(`   Network: ${process.env.TEST_NETWORK}`);
console.log(`   RPC URL: ${process.env.SOLANA_RPC_URL}`);
console.log(`   Mock SDKs: ${process.env.USE_MOCK_SDKS}`);