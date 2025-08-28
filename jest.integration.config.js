/**
 * Jest Configuration for Integration Tests
 * 
 * Specialized configuration for running comprehensive integration tests
 * that validate documentation examples with real SDK implementations.
 */

module.exports = {
  displayName: 'Integration Tests',
  testMatch: [
    '**/tests/integration/**/*.test.js',
    '**/tests/integration/**/*.spec.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testEnvironment: 'node',
  testTimeout: 60000, // 60 seconds for integration tests
  maxWorkers: 2, // Limit concurrency for network tests
  
  // Module resolution for SDK packages
  moduleNameMapping: {
    '^@saros-finance/sdk$': '<rootDir>/__mocks__/@saros-finance/sdk.js',
    '^@saros-finance/dlmm-sdk$': '<rootDir>/__mocks__/@saros-finance/dlmm-sdk.js'
  },

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          lib: ['es2020'],
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          skipLibCheck: true,
          strict: false, // More lenient for test files
        }
      }
    }]
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],

  // Coverage configuration for integration tests
  collectCoverageFrom: [
    'docs/**/*.{js,jsx,ts,tsx}',
    'scripts/**/*.{js,jsx,ts,tsx}',
    '!docs/**/*.d.ts',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],

  coverageDirectory: 'coverage/integration',
  
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],

  // Test result processors
  reporters: [
    'default',
    ['jest-html-reporter', {
      outputPath: 'test-results/integration-test-report.html',
      pageTitle: 'Saros SDK Integration Test Report',
      includeFailureMsg: true,
      includeSuiteFailure: true,
      theme: 'lightTheme'
    }],
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'integration-junit.xml',
      suiteName: 'Saros SDK Integration Tests',
      includeConsoleOutput: true
    }]
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/integration/global-setup.js',
  globalTeardown: '<rootDir>/tests/integration/global-teardown.js',

  // Verbose output for debugging
  verbose: process.env.DEBUG_TESTS === 'true',

  // Handle unhandled promise rejections
  unhandledRejections: 'strict',

  // Custom test environment variables
  setupFiles: ['<rootDir>/tests/integration/env-setup.js'],

  // Test execution order (run critical tests first)
  testSequencer: '<rootDir>/tests/integration/test-sequencer.js'
};