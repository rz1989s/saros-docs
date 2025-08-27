/**
 * Simple validation tests for Saros SDK documentation
 * Tests that don't require external SDKs
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const TEST_CONFIG = {
  rpcUrl: 'https://api.devnet.solana.com',
  testAmount: 1000000, // 1 USDC
};

describe('Saros SDK Documentation Validation', () => {
  let connection: Connection;

  beforeAll(() => {
    connection = new Connection(TEST_CONFIG.rpcUrl, 'confirmed');
  });

  it.skip('should have valid network connection', async () => {
    const version = await connection.getVersion();
    expect(version).toBeDefined();
    expect(version['solana-core']).toBeDefined();
  });

  it('should validate PublicKey creation', () => {
    const validKeys = [
      '11111111111111111111111111111112', // System Program
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    ];

    for (const keyString of validKeys) {
      expect(() => new PublicKey(keyString)).not.toThrow();
    }
  });

  it('should validate example documentation files exist', () => {
    const exampleFiles = [
      'basic-token-swap.md',
      'arbitrage-bot.md', 
      'dlmm-position-creator.md',
      'liquidity-farming-strategy.md',
      'staking-rewards-automation.md',
      'portfolio-analytics-dashboard.md',
    ];

    for (const file of exampleFiles) {
      const filePath = path.join(__dirname, '../docs/examples', file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('should validate tutorial files exist', () => {
    const tutorialFiles = [
      'building-swap-interface.md',
      'liquidity-provider-dashboard.md',
    ];

    for (const file of tutorialFiles) {
      const filePath = path.join(__dirname, '../docs/tutorials', file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('should validate TypeScript code blocks in examples', () => {
    const exampleFile = path.join(__dirname, '../docs/examples/basic-token-swap.md');
    const content = fs.readFileSync(exampleFile, 'utf-8');
    
    // Check for TypeScript code blocks
    const typeScriptBlocks = content.match(/```typescript[\s\S]*?```/g);
    expect(typeScriptBlocks).toBeDefined();
    expect(typeScriptBlocks!.length).toBeGreaterThan(0);
    
    // Check that code blocks contain imports
    const hasImports = typeScriptBlocks!.some(block => 
      block.includes('import') && block.includes('@solana/web3.js')
    );
    expect(hasImports).toBe(true);
  });

  it('should validate API Explorer component exists', () => {
    const apiExplorerPath = path.join(__dirname, '../src/components/APIExplorer.tsx');
    expect(fs.existsSync(apiExplorerPath)).toBe(true);
    
    const content = fs.readFileSync(apiExplorerPath, 'utf-8');
    expect(content).toContain('APIExplorer');
    expect(content).toContain('React');
  });

  it('should validate configuration files', () => {
    const configFiles = [
      'docusaurus.config.ts',
      'package.json',
      'tsconfig.json',
    ];

    for (const file of configFiles) {
      const filePath = path.join(__dirname, '..', file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('should validate deployment files', () => {
    const deployFiles = [
      'Dockerfile',
      'docker-compose.yml',
      'vercel.json',
      'deploy.sh',
    ];

    for (const file of deployFiles) {
      const filePath = path.join(__dirname, '..', file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('should validate documentation structure', () => {
    const docsPath = path.join(__dirname, '../docs');
    
    // Check main documentation directories
    const requiredDirs = [
      'getting-started',
      'typescript-sdk',
      'dlmm-sdk', 
      'rust-sdk',
      'tutorials',
      'examples',
    ];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(docsPath, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    }
  });
});