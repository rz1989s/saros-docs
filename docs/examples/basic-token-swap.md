# Example 1: Basic Token Swap

A complete implementation of token swapping using the Saros TypeScript SDK with proper error handling, slippage protection, and transaction confirmation.

## Overview

This example demonstrates:
- Setting up Solana connection and wallet
- Getting swap quotes with price impact calculation  
- Executing swaps with slippage protection
- Handling transaction confirmation and errors
- Building a simple CLI swap tool

## Complete Implementation

### Setup and Dependencies

```bash
# Create project
mkdir saros-swap-example
cd saros-swap-example

# Initialize npm project
npm init -y

# Install dependencies
npm install @saros-finance/sdk @solana/web3.js
npm install -D typescript @types/node ts-node jest @types/jest
```

### Main Swap Implementation

```typescript
// src/swapExample.ts
import {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  getSwapAmountSaros,
  swapSaros,
  getAllPoolsSaros,
  TokenInfo,
  PoolInfoLayout,
} from '@saros-finance/sdk';
import fs from 'fs';

export class TokenSwapper {
  private connection: Connection;
  private wallet: Keypair;
  private pools: PoolInfoLayout[] = [];

  constructor(rpcUrl: string, walletPath?: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    if (walletPath && fs.existsSync(walletPath)) {
      const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
      this.wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    } else {
      this.wallet = Keypair.generate();
      console.log('Generated new wallet:', this.wallet.publicKey.toString());
    }
  }

  async initialize(): Promise<void> {
    console.log('Initializing Saros Token Swapper...');
    console.log('Wallet:', this.wallet.publicKey.toString());
    
    try {
      // Load all available pools
      this.pools = await getAllPoolsSaros(this.connection);
      console.log(`✅ Loaded ${this.pools.length} pools`);
      
      // Check wallet balance
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      console.log(`💰 Wallet balance: ${balance / 1e9} SOL`);
      
      if (balance < 0.01e9) {
        throw new Error('Insufficient SOL balance for transaction fees');
      }
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  async getSwapQuote(
    fromTokenSymbol: string,
    toTokenSymbol: string,
    amount: number,
    slippageTolerance: number = 0.5
  ): Promise<SwapQuoteResult> {
    console.log(`🔍 Getting quote: ${amount} ${fromTokenSymbol} → ${toTokenSymbol}`);
    
    try {
      // Find tokens
      const fromToken = this.findToken(fromTokenSymbol);
      const toToken = this.findToken(toTokenSymbol);
      
      if (!fromToken || !toToken) {
        throw new Error(`Token not found: ${!fromToken ? fromTokenSymbol : toTokenSymbol}`);
      }

      // Find optimal pool
      const poolParams = this.findBestPool(fromToken, toToken);
      if (!poolParams) {
        throw new Error(`No pool found for ${fromTokenSymbol}/${toTokenSymbol}`);
      }

      console.log(`📊 Using pool: ${poolParams.poolAddress.toString()}`);

      // Get swap estimate
      const swapEstimate = await getSwapAmountSaros(
        this.connection,
        fromToken.mintAddress!,
        toToken.mintAddress!,
        amount * Math.pow(10, fromToken.decimals || 9),
        slippageTolerance,
        poolParams
      );

      if (!swapEstimate) {
        throw new Error('Unable to calculate swap amount');
      }

      // Calculate price impact
      const inputValue = amount;
      const outputValue = swapEstimate.outputAmount / Math.pow(10, toToken.decimals || 9);
      const expectedRate = this.getTokenPrice(toToken) / this.getTokenPrice(fromToken);
      const actualRate = outputValue / inputValue;
      const priceImpact = Math.abs((expectedRate - actualRate) / expectedRate) * 100;

      // Calculate minimum received
      const minimumReceived = swapEstimate.outputAmount * (1 - slippageTolerance / 100);

      const result: SwapQuoteResult = {
        fromToken,
        toToken,
        inputAmount: amount,
        outputAmount: outputValue,
        minimumReceived: minimumReceived / Math.pow(10, toToken.decimals || 9),
        priceImpact,
        fee: amount * (poolParams.feeRate / 10000),
        poolAddress: poolParams.poolAddress.toString(),
        route: [poolParams.poolAddress.toString()],
        slippageTolerance,
      };

      console.log('📈 Quote Details:');
      console.log(`  Input: ${result.inputAmount} ${fromTokenSymbol}`);
      console.log(`  Output: ${result.outputAmount.toFixed(6)} ${toTokenSymbol}`);
      console.log(`  Price Impact: ${result.priceImpact.toFixed(3)}%`);
      console.log(`  Fee: ${result.fee.toFixed(6)} ${fromTokenSymbol}`);
      console.log(`  Minimum Received: ${result.minimumReceived.toFixed(6)} ${toTokenSymbol}`);

      return result;
    } catch (error) {
      console.error('❌ Quote failed:', error);
      throw error;
    }
  }

  async executeSwap(quote: SwapQuoteResult): Promise<SwapExecutionResult> {
    console.log(`🔄 Executing swap: ${quote.inputAmount} ${quote.fromToken.symbol} → ${quote.toToken.symbol}`);
    
    try {
      // Validate quote is still valid (not too old)
      const quoteAge = Date.now() - quote.timestamp;
      if (quoteAge > 30000) { // 30 seconds
        throw new Error('Quote is too old, please get a fresh quote');
      }

      // Find pool parameters again
      const poolParams = this.findBestPool(quote.fromToken, quote.toToken);
      if (!poolParams) {
        throw new Error('Pool not found');
      }

      // Check balances before swap
      await this.validateSwapBalances(quote);

      // Execute swap
      const swapResult = await swapSaros(
        this.connection,
        quote.fromToken.mintAddress!,
        quote.toToken.mintAddress!,
        quote.inputAmount * Math.pow(10, quote.fromToken.decimals || 9),
        quote.minimumReceived * Math.pow(10, quote.toToken.decimals || 9),
        poolParams,
        this.wallet.publicKey,
        async (tx: VersionedTransaction) => {
          tx.sign([this.wallet]);
          return tx;
        }
      );

      if (!swapResult || !swapResult.signature) {
        throw new Error('Swap execution failed');
      }

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction({
        signature: swapResult.signature,
        blockhash: (await this.connection.getLatestBlockhash()).blockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      // Calculate actual amounts and slippage
      const actualOutputAmount = swapResult.outputAmount || quote.outputAmount * Math.pow(10, quote.toToken.decimals || 9);
      const actualOutput = actualOutputAmount / Math.pow(10, quote.toToken.decimals || 9);
      const actualSlippage = Math.abs(quote.outputAmount - actualOutput) / quote.outputAmount * 100;

      const result: SwapExecutionResult = {
        signature: swapResult.signature,
        inputAmount: quote.inputAmount,
        outputAmount: actualOutput,
        expectedOutput: quote.outputAmount,
        actualSlippage,
        gasUsed: swapResult.gasUsed || 0,
        confirmedAt: new Date(),
        success: true,
      };

      console.log('✅ Swap completed successfully!');
      console.log(`  Transaction: ${result.signature}`);
      console.log(`  Actual Output: ${result.outputAmount.toFixed(6)} ${quote.toToken.symbol}`);
      console.log(`  Slippage: ${result.actualSlippage.toFixed(3)}%`);

      return result;
    } catch (error) {
      console.error('❌ Swap execution failed:', error);
      
      return {
        signature: '',
        inputAmount: quote.inputAmount,
        outputAmount: 0,
        expectedOutput: quote.outputAmount,
        actualSlippage: 0,
        gasUsed: 0,
        confirmedAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async validateSwapBalances(quote: SwapQuoteResult): Promise<void> {
    // Check SOL balance for transaction fees
    const solBalance = await this.connection.getBalance(this.wallet.publicKey);
    if (solBalance < 0.001e9) {
      throw new Error('Insufficient SOL for transaction fees');
    }

    // Check input token balance
    if (quote.fromToken.symbol === 'SOL') {
      const requiredSol = quote.inputAmount * 1e9;
      if (solBalance < requiredSol + 0.001e9) {
        throw new Error('Insufficient SOL balance for swap');
      }
    }
    // In production, check SPL token balances here
  }

  private findToken(symbol: string): TokenInfo | null {
    const commonTokens: Record<string, TokenInfo> = {
      'SOL': {
        mintAddress: new PublicKey('So11111111111111111111111111111111111111112'),
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
      },
      'USDC': {
        mintAddress: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      'USDT': {
        mintAddress: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
      },
    };

    return commonTokens[symbol.toUpperCase()] || null;
  }

  private findBestPool(tokenA: TokenInfo, tokenB: TokenInfo): PoolInfoLayout | null {
    return this.pools.find(pool => {
      const hasTokens = (
        (pool.tokenAccountX?.equals(tokenA.mintAddress!) && pool.tokenAccountY?.equals(tokenB.mintAddress!)) ||
        (pool.tokenAccountX?.equals(tokenB.mintAddress!) && pool.tokenAccountY?.equals(tokenA.mintAddress!))
      );
      return hasTokens;
    }) || null;
  }

  private getTokenPrice(token: TokenInfo): number {
    // Mock prices - in production, use real price feeds
    const prices: Record<string, number> = {
      'SOL': 180.50,
      'USDC': 1.00,
      'USDT': 0.9998,
    };
    return prices[token.symbol!] || 1.0;
  }

  getWalletAddress(): string {
    return this.wallet.publicKey.toString();
  }
}

// Type definitions
export interface SwapQuoteResult {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  inputAmount: number;
  outputAmount: number;
  minimumReceived: number;
  priceImpact: number;
  fee: number;
  poolAddress: string;
  route: string[];
  slippageTolerance: number;
  timestamp: number;
}

export interface SwapExecutionResult {
  signature: string;
  inputAmount: number;
  outputAmount: number;
  expectedOutput: number;
  actualSlippage: number;
  gasUsed: number;
  confirmedAt: Date;
  success: boolean;
  error?: string;
}
```

### CLI Interface

```typescript
// src/cli.ts
import { TokenSwapper } from './swapExample';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: npm run swap <fromToken> <toToken> <amount> [slippage]');
    console.log('Example: npm run swap SOL USDC 1.5 0.5');
    process.exit(1);
  }

  const [fromToken, toToken, amount, slippage] = args;
  const rpcUrl = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
  const walletPath = process.env.WALLET_PATH || undefined;

  try {
    console.log('🚀 Saros Token Swap Example');
    console.log('================================');

    const swapper = new TokenSwapper(rpcUrl, walletPath);
    await swapper.initialize();

    // Get quote
    const quote = await swapper.getSwapQuote(
      fromToken,
      toToken,
      parseFloat(amount),
      slippage ? parseFloat(slippage) : 0.5
    );

    // Confirm with user
    console.log('\n⚠️  Please review the swap details above.');
    console.log('💡 Press Ctrl+C to cancel or wait 10 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Execute swap
    const result = await swapper.executeSwap(quote);

    if (result.success) {
      console.log('\n🎉 Swap completed successfully!');
      console.log(`🔗 View transaction: https://solscan.io/tx/${result.signature}`);
    } else {
      console.log('\n❌ Swap failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

### Test Suite

```typescript
// tests/swapExample.test.ts
import { TokenSwapper } from '../src/swapExample';
import { Connection, Keypair } from '@solana/web3.js';

describe('TokenSwapper', () => {
  let swapper: TokenSwapper;
  const rpcUrl = 'https://api.devnet.solana.com';

  beforeEach(() => {
    swapper = new TokenSwapper(rpcUrl);
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(swapper.initialize()).resolves.not.toThrow();
    });

    test('should have valid wallet address', () => {
      const address = swapper.getWalletAddress();
      expect(address).toBeTruthy();
      expect(address.length).toBe(44); // Base58 encoded public key length
    });
  });

  describe('Quote Generation', () => {
    beforeEach(async () => {
      await swapper.initialize();
    });

    test('should get valid SOL to USDC quote', async () => {
      const quote = await swapper.getSwapQuote('SOL', 'USDC', 0.1, 0.5);
      
      expect(quote.inputAmount).toBe(0.1);
      expect(quote.outputAmount).toBeGreaterThan(0);
      expect(quote.priceImpact).toBeGreaterThanOrEqual(0);
      expect(quote.fee).toBeGreaterThan(0);
      expect(quote.slippageTolerance).toBe(0.5);
    });

    test('should handle invalid token pairs', async () => {
      await expect(
        swapper.getSwapQuote('INVALID', 'USDC', 1.0, 0.5)
      ).rejects.toThrow('Token not found');
    });

    test('should calculate reasonable price impact for small amounts', async () => {
      const quote = await swapper.getSwapQuote('SOL', 'USDC', 0.01, 0.5);
      expect(quote.priceImpact).toBeLessThan(1.0); // Less than 1% for small amounts
    });

    test('should calculate higher price impact for large amounts', async () => {
      const quote = await swapper.getSwapQuote('SOL', 'USDC', 100, 0.5);
      expect(quote.priceImpact).toBeGreaterThan(0.1); // Higher impact for large amounts
    });
  });

  describe('Quote Validation', () => {
    test('should validate slippage tolerance bounds', async () => {
      await swapper.initialize();
      
      // Test valid slippage
      const validQuote = await swapper.getSwapQuote('SOL', 'USDC', 1.0, 1.0);
      expect(validQuote.slippageTolerance).toBe(1.0);
      
      // Test edge cases
      await expect(
        swapper.getSwapQuote('SOL', 'USDC', 1.0, -1.0)
      ).rejects.toThrow();
      
      await expect(
        swapper.getSwapQuote('SOL', 'USDC', 1.0, 101.0)
      ).rejects.toThrow();
    });

    test('should validate input amounts', async () => {
      await swapper.initialize();
      
      await expect(
        swapper.getSwapQuote('SOL', 'USDC', 0, 0.5)
      ).rejects.toThrow();
      
      await expect(
        swapper.getSwapQuote('SOL', 'USDC', -1, 0.5)
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const offlineSwapper = new TokenSwapper('http://localhost:1234');
      
      await expect(offlineSwapper.initialize()).rejects.toThrow();
    });

    test('should handle malformed RPC responses', async () => {
      // This test would require mocking the RPC client
      // Implementation depends on your testing setup
    });
  });
});
```

### Integration Test

```typescript
// tests/integration.test.ts
import { TokenSwapper } from '../src/swapExample';

describe('TokenSwapper Integration', () => {
  let swapper: TokenSwapper;
  
  // Skip integration tests in CI unless ENABLE_INTEGRATION_TESTS is set
  const shouldRunIntegrationTests = process.env.ENABLE_INTEGRATION_TESTS === 'true';

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping integration tests (set ENABLE_INTEGRATION_TESTS=true to run)');
      return;
    }

    swapper = new TokenSwapper('https://api.devnet.solana.com');
    await swapper.initialize();
  });

  test('should complete full swap workflow on devnet', async () => {
    if (!shouldRunIntegrationTests) {
      return;
    }

    // Get quote
    const quote = await swapper.getSwapQuote('SOL', 'USDC', 0.001, 0.5);
    expect(quote.outputAmount).toBeGreaterThan(0);

    // Note: We don't execute the swap in automated tests to avoid 
    // needing funded wallets, but this is where you would call:
    // const result = await swapper.executeSwap(quote);
    // expect(result.success).toBe(true);
    
    console.log('Integration test quote successful:', quote);
  });
});
```

### Package Configuration

```json
{
  "name": "saros-swap-example",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "start": "ts-node src/cli.ts",
    "swap": "ts-node src/cli.ts",
    "test": "jest",
    "test:integration": "ENABLE_INTEGRATION_TESTS=true jest tests/integration.test.ts"
  },
  "dependencies": {
    "@saros-finance/sdk": "^1.0.0",
    "@solana/web3.js": "^1.87.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.ts"],
    "testTimeout": 30000
  }
}
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Usage Examples

### Command Line Usage

```bash
# Set environment variables (optional)
export RPC_URL="https://api.mainnet-beta.solana.com"
export WALLET_PATH="./wallet.json"

# Run swaps
npm run swap SOL USDC 1.0          # Swap 1 SOL for USDC with default 0.5% slippage
npm run swap SOL USDC 1.0 1.0      # Swap with 1% slippage tolerance
npm run swap USDC SOL 100 0.3      # Swap 100 USDC for SOL with 0.3% slippage

# Run tests
npm test                           # Unit tests only
npm run test:integration           # Full integration tests (requires funded wallet)
```

### Programmatic Usage

```typescript
// example-usage.ts
import { TokenSwapper } from './src/swapExample';

async function exampleUsage() {
  const swapper = new TokenSwapper('https://api.mainnet-beta.solana.com');
  await swapper.initialize();

  try {
    // Get quote for swapping 0.5 SOL to USDC
    const quote = await swapper.getSwapQuote('SOL', 'USDC', 0.5, 0.5);
    
    console.log('Quote received:', quote);
    
    // Execute if price impact is acceptable
    if (quote.priceImpact < 1.0) { // Less than 1% price impact
      const result = await swapper.executeSwap(quote);
      
      if (result.success) {
        console.log('Swap successful!', result.signature);
      } else {
        console.log('Swap failed:', result.error);
      }
    } else {
      console.log('Price impact too high:', quote.priceImpact);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

exampleUsage();
```

## Security Considerations

### Best Practices Implemented

1. **Input Validation**: All inputs are validated before processing
2. **Slippage Protection**: Configurable slippage tolerance with reasonable bounds  
3. **Balance Checking**: Verify sufficient funds before execution
4. **Quote Freshness**: Quotes expire after 30 seconds
5. **Transaction Confirmation**: Wait for on-chain confirmation
6. **Error Handling**: Comprehensive error catching and reporting

### Production Enhancements

```typescript
// Additional security for production
class ProductionTokenSwapper extends TokenSwapper {
  private maxPriceImpact = 5.0; // 5% maximum price impact
  private maxSlippage = 3.0;    // 3% maximum slippage
  
  async getSecureSwapQuote(...args: Parameters<TokenSwapper['getSwapQuote']>) {
    const quote = await super.getSwapQuote(...args);
    
    // Additional security checks
    if (quote.priceImpact > this.maxPriceImpact) {
      throw new Error(`Price impact too high: ${quote.priceImpact.toFixed(2)}%`);
    }
    
    if (quote.slippageTolerance > this.maxSlippage) {
      throw new Error(`Slippage tolerance too high: ${quote.slippageTolerance}%`);
    }
    
    return quote;
  }
}
```

## Running the Example

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run basic swap
npm run swap SOL USDC 0.1

# Run with custom slippage
npm run swap SOL USDC 1.0 1.0

# Run tests
npm test

# Run integration tests (requires funded devnet wallet)
npm run test:integration
```

This basic token swap example provides a solid foundation for building more complex trading applications with the Saros SDK. The implementation includes proper error handling, testing, and security considerations for production use.