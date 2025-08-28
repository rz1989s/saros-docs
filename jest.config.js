/**
 * Jest configuration for Saros SDK Documentation Tests
 * 
 * This configuration supports testing of TypeScript code examples,
 * integration tests with Solana networks, and validation of
 * documentation content.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.ts',
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Module path mapping
  moduleNameMapper: {
    '^@site/(.*)$': '<rootDir>/src/$1',
    '^@generated/(.*)$': '<rootDir>/.docusaurus/$1',
    '^@saros-finance/(.*)$': '<rootDir>/__mocks__/@saros-finance/$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Test timeout (important for network calls)
  testTimeout: 30000,
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'tests/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/theme/**/*', // Exclude swizzled Docusaurus theme files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/.docusaurus/'
  ],
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Verbose output for debugging
  verbose: true,
  
  // Test results processor
  // testResultsProcessor: 'jest-sonar-reporter',
  
  // Reporter configuration  
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
    }],
    ['jest-html-reporter', {
      pageTitle: 'Saros SDK Documentation Test Results',
      outputPath: './test-results/test-report.html',
    }]
  ],
};