/**
 * Test Setup for Saros SDK Documentation
 * 
 * This file configures the test environment for all documentation tests,
 * including network setup, mocking, and utility functions.
 */

import { TextEncoder, TextDecoder } from 'util';

// Setup global polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock fetch for tests that don't need real network calls
global.fetch = jest.fn();

// Setup console overrides for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Suppress routine log messages in tests
  log: jest.fn(),
  // Keep error and warn for debugging
  error: originalConsole.error,
  warn: originalConsole.warn,
  info: originalConsole.info,
  debug: originalConsole.debug,
};

// Test configuration constants
export const TEST_CONSTANTS = {
  // Standard Solana addresses for testing
  SYSTEM_PROGRAM_ID: '11111111111111111111111111111112',
  TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  
  // Common token mints (mainnet addresses)
  USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  SOL_MINT: 'So11111111111111111111111111111111111111112',
  USDT_MINT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  
  // Test amounts (in token decimals)
  SMALL_AMOUNT: 1 * 1e6,      // 1 USDC
  MEDIUM_AMOUNT: 100 * 1e6,   // 100 USDC  
  LARGE_AMOUNT: 10000 * 1e6,  // 10,000 USDC
  
  // Network configurations
  NETWORKS: {
    devnet: 'https://api.devnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com',
    testnet: 'https://api.testnet.solana.com'
  },
  
  // Test timeouts
  TIMEOUTS: {
    NETWORK_CALL: 10000,    // 10s for network calls
    TRANSACTION: 30000,     // 30s for transactions
    SETUP: 60000,          // 60s for test setup
  }
};

// Mock wallet for testing
export const createMockWallet = () => ({
  publicKey: { toString: () => '11111111111111111111111111111112' },
  signTransaction: jest.fn(),
  signAllTransactions: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
});

// Network connection helper
export const createTestConnection = (network: 'devnet' | 'mainnet' | 'testnet' = 'devnet') => {
  const { Connection } = require('@solana/web3.js');
  return new Connection(TEST_CONSTANTS.NETWORKS[network], {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: TEST_CONSTANTS.TIMEOUTS.NETWORK_CALL
  });
};

// Error handling test utilities
export const expectAsyncThrow = async (
  asyncFn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<void> => {
  try {
    await asyncFn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else {
        expect(error.message).toMatch(expectedError);
      }
    }
  }
};

// Performance testing utilities
export const measurePerformance = async <T>(
  fn: () => Promise<T>,
  label: string = 'Operation'
): Promise<{ result: T; duration: number }> => {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    console.log(`${label} completed in ${duration}ms`);
    
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`${label} failed after ${duration}ms:`, error.message);
    throw error;
  }
};

// Retry utility for flaky network operations
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('This should never be reached');
};

// Validation helpers for common patterns
export const validators = {
  publicKey: (value: any): boolean => {
    try {
      const { PublicKey } = require('@solana/web3.js');
      new PublicKey(value);
      return true;
    } catch {
      return false;
    }
  },
  
  positiveNumber: (value: number): boolean => {
    return typeof value === 'number' && value > 0 && Number.isFinite(value);
  },
  
  percentage: (value: number): boolean => {
    return typeof value === 'number' && value >= 0 && value <= 100;
  },
  
  basisPoints: (value: number): boolean => {
    return typeof value === 'number' && value >= 0 && value <= 10000;
  }
};

// Clean up after tests
afterAll(async () => {
  // Reset console
  global.console = originalConsole;
  
  // Clear any global state
  if (global.fetch && typeof global.fetch === 'object' && 'mockRestore' in global.fetch) {
    (global.fetch as any).mockRestore();
  }
});

console.log('Test setup completed - ready for Saros SDK documentation testing');