# DLMM SDK Installation

Learn how to install and set up the Saros DLMM TypeScript SDK for concentrated liquidity operations.

## Installation

### Package Installation

```bash
# Using npm
npm install @saros-finance/dlmm-sdk

# Using yarn
yarn add @saros-finance/dlmm-sdk

# Using pnpm
pnpm add @saros-finance/dlmm-sdk
```

### Peer Dependencies

The DLMM SDK requires these dependencies:

```bash
npm install @solana/web3.js bn.js decimal.js
```

Or install everything together:
```bash
npm install @saros-finance/dlmm-sdk @solana/web3.js bn.js decimal.js
```

## Project Setup

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "experimentalDecorators": true
  }
}
```

### Environment Configuration

Create `.env` file:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_COMMITMENT=confirmed

# DLMM Program Configuration
DLMM_PROGRAM_ID=DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1
DLMM_ADMIN=Admin_Address_Here

# Optional: Priority fees for faster transactions
PRIORITY_FEE=1000

# Development only - never commit real private keys
WALLET_PRIVATE_KEY=your_base58_private_key_for_testing
```

## Basic Setup

### Connection and Basic Configuration

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  DLMM,
  LiquidityPosition,
  BinArray,
  PositionV2
} from '@saros-finance/dlmm-sdk';

// Setup connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// DLMM program configuration
const DLMM_PROGRAM_ID = new PublicKey('DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1');

console.log('DLMM SDK configured successfully!');
```

### Verify Installation

```typescript
// test-dlmm-installation.ts
import { DLMM } from '@saros-finance/dlmm-sdk';
import { Connection, PublicKey } from '@solana/web3.js';

async function verifyDLMMInstallation() {
  console.log('🔍 Testing DLMM SDK installation...');
  
  try {
    // Test 1: Import verification
    console.log('✅ DLMM SDK imported successfully');
    
    // Test 2: Connection test
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const version = await connection.getVersion();
    console.log('✅ Solana connection working:', version['solana-core']);
    
    // Test 3: Try to load a test DLMM pool (if one exists)
    // This would require a known DLMM pool address
    console.log('✅ DLMM SDK ready for use');
    
    console.log('🎉 DLMM SDK installation verified!');
    return true;
    
  } catch (error) {
    console.error('❌ DLMM SDK installation verification failed:', error);
    return false;
  }
}

verifyDLMMInstallation();
```

## Core Concepts Setup

### Understanding DLMM Bins

```typescript
// DLMM uses discrete price bins instead of continuous price curves
interface PriceBin {
  binId: number;        // Unique bin identifier  
  price: number;        // Bin price
  liquidityX: number;   // Token X liquidity in this bin
  liquidityY: number;   // Token Y liquidity in this bin
  feeX: number;         // Accumulated fees in token X
  feeY: number;         // Accumulated fees in token Y
}

// Calculate bin price from bin ID
function getBinPrice(binId: number, binStep: number): number {
  // Price = (1 + binStep / 10000) ^ binId
  return Math.pow(1 + binStep / 10000, binId);
}

// Find bin ID for a specific price
function getBinIdFromPrice(price: number, binStep: number): number {
  return Math.floor(Math.log(price) / Math.log(1 + binStep / 10000));
}
```

### Position Types

```typescript
// Different types of liquidity positions
enum PositionType {
  SYMMETRIC,    // Equal value in both tokens (traditional LP)
  SINGLE_X,     // Only token X (above current price)
  SINGLE_Y,     // Only token Y (below current price)  
  ASYMMETRIC    // Custom ratio of tokens
}

// Position configuration
interface PositionConfig {
  type: PositionType;
  lowerPrice: number;   // Lower bound of position
  upperPrice: number;   // Upper bound of position
  tokenXAmount?: number; // Amount of token X to deposit
  tokenYAmount?: number; // Amount of token Y to deposit
  autoCompound?: boolean; // Whether to auto-compound fees
}
```

## DLMM Pool Discovery

### Find Available DLMM Pools

```typescript
async function getAvailableDLMMPools(): Promise<DLMMPool[]> {
  // This would typically involve querying the DLMM program for all pools
  // Implementation depends on Saros DLMM program structure
  
  const pools: DLMMPool[] = [];
  
  // Example structure - actual implementation would query on-chain data
  const knownPools = [
    {
      poolAddress: 'DLMM_POOL_ADDRESS_1',
      tokenX: { mintAddress: 'SOL_MINT', symbol: 'SOL' },
      tokenY: { mintAddress: 'USDC_MINT', symbol: 'USDC' },
      feeTier: 30, // 0.3%
      binStep: 1   // 0.01% per bin
    }
    // Add more pools
  ];
  
  return knownPools;
}

// Get pool by token pair
async function findDLMMPool(
  tokenXMint: string, 
  tokenYMint: string, 
  feeTier?: number
): Promise<DLMMPool | null> {
  const pools = await getAvailableDLMMPools();
  
  return pools.find(pool => 
    (pool.tokenX.mintAddress === tokenXMint && pool.tokenY.mintAddress === tokenYMint) ||
    (pool.tokenX.mintAddress === tokenYMint && pool.tokenY.mintAddress === tokenXMint)
  ) || null;
}
```

### Pool Analytics Setup

```typescript
interface DLMMPoolAnalytics {
  totalLiquidity: number;     // Total USD liquidity
  volume24h: number;          // 24h trading volume
  fees24h: number;            // 24h fees generated
  activeRange: {              // Price range with most liquidity
    lowerPrice: number;
    upperPrice: number;
    liquidityPercent: number; // % of total liquidity in this range
  };
  utilization: number;        // % of liquidity currently earning fees
}

async function getPoolAnalytics(poolAddress: string): Promise<DLMMPoolAnalytics> {
  // Implementation would query pool state and calculate metrics
  // This is a template structure
  
  return {
    totalLiquidity: 0,
    volume24h: 0,
    fees24h: 0,
    activeRange: {
      lowerPrice: 0,
      upperPrice: 0,
      liquidityPercent: 0
    },
    utilization: 0
  };
}
```

## Development Workflow

### 1. Development Environment

```typescript
// dev-config.ts
export const DEV_CONFIG = {
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  programId: 'DEVNET_DLMM_PROGRAM_ID', // Replace with actual devnet address
  testTokens: {
    tokenX: 'DEVNET_TOKEN_X_MINT',
    tokenY: 'DEVNET_TOKEN_Y_MINT'
  }
};

// Development helper functions
export async function setupDevEnvironment() {
  const connection = new Connection(DEV_CONFIG.rpcUrl);
  
  // Create test wallet with airdrop
  const testWallet = Keypair.generate();
  const airdropSig = await connection.requestAirdrop(
    testWallet.publicKey,
    5 * 1e9 // 5 SOL
  );
  await connection.confirmTransaction(airdropSig);
  
  console.log('Test wallet created:', testWallet.publicKey.toString());
  console.log('Balance:', await connection.getBalance(testWallet.publicKey));
  
  return { connection, wallet: testWallet };
}
```

### 2. Testing Setup

```typescript
// test/dlmm-setup.ts
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';

describe('DLMM SDK Tests', () => {
  let connection: Connection;
  let testWallet: Keypair;
  let dlmmPool: DLMMPool;

  beforeAll(async () => {
    // Setup test environment
    ({ connection, wallet: testWallet } = await setupDevEnvironment());
    
    // Load test DLMM pool
    dlmmPool = await DLMMPool.load(
      connection,
      new PublicKey('TEST_DLMM_POOL_ADDRESS')
    );
  });

  test('should load DLMM pool', async () => {
    expect(dlmmPool).toBeDefined();
    expect(dlmmPool.tokenX).toBeDefined();
    expect(dlmmPool.tokenY).toBeDefined();
  });

  test('should calculate bin prices', async () => {
    const currentPrice = dlmmPool.getCurrentPrice();
    expect(typeof currentPrice).toBe('number');
    expect(currentPrice).toBeGreaterThan(0);
  });

  // Add more tests...
});
```

## Framework Integration Examples

### React Setup

```tsx
// hooks/useDLMM.ts
import { useState, useEffect } from 'react';
import { DLMM, DLMMPool } from '@saros-finance/dlmm-sdk';

export function useDLMMPool(poolAddress: string) {
  const [pool, setPool] = useState<DLMMPool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPool() {
      try {
        setLoading(true);
        const dlmmPool = await DLMMPool.load(connection, new PublicKey(poolAddress));
        setPool(dlmmPool);
        setError(null);
      } catch (err) {
        setError(err.message);
        setPool(null);
      } finally {
        setLoading(false);
      }
    }

    loadPool();
  }, [poolAddress]);

  return { pool, loading, error };
}
```

### Vue.js Setup

```typescript
// composables/useDLMM.ts
import { ref, computed, onMounted } from 'vue';
import type { Ref } from 'vue';

export function useDLMMPool(poolAddress: string) {
  const pool: Ref<DLMMPool | null> = ref(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  const currentPrice = computed(() => {
    return pool.value?.getCurrentPrice() || 0;
  });

  onMounted(async () => {
    try {
      loading.value = true;
      pool.value = await DLMMPool.load(connection, new PublicKey(poolAddress));
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  });

  return {
    pool,
    loading,
    error,
    currentPrice
  };
}
```

## Common Integration Patterns

### Price Monitoring

```typescript
class DLMMPriceMonitor {
  private pool: DLMMPool;
  private subscribers: Array<(price: number) => void> = [];
  private isMonitoring = false;

  constructor(pool: DLMMPool) {
    this.pool = pool;
  }

  async startMonitoring(intervalMs: number = 5000) {
    this.isMonitoring = true;
    
    while (this.isMonitoring) {
      try {
        await this.pool.refresh(); // Update pool state
        const currentPrice = this.pool.getCurrentPrice();
        this.notifySubscribers(currentPrice);
      } catch (error) {
        console.error('Price monitoring error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }

  subscribe(callback: (price: number) => void) {
    this.subscribers.push(callback);
  }

  private notifySubscribers(price: number) {
    this.subscribers.forEach(callback => callback(price));
  }
}
```

### Position Tracking

```typescript
interface PositionTracker {
  positionId: string;
  pool: DLMMPool;
  createdAt: Date;
  metrics: {
    feesEarned: { tokenX: number; tokenY: number };
    impermanentLoss: number;
    totalReturn: number;
  };
}

class DLMMPositionTracker {
  private positions: Map<string, PositionTracker> = new Map();

  addPosition(position: LiquidityPosition, pool: DLMMPool) {
    this.positions.set(position.positionId, {
      positionId: position.positionId,
      pool,
      createdAt: new Date(),
      metrics: {
        feesEarned: { tokenX: 0, tokenY: 0 },
        impermanentLoss: 0,
        totalReturn: 0
      }
    });
  }

  async updateMetrics() {
    for (const [positionId, tracker] of this.positions.entries()) {
      try {
        // Refresh position data
        const currentPosition = await LiquidityPosition.load(
          connection, 
          new PublicKey(positionId)
        );
        
        // Calculate metrics
        tracker.metrics = await this.calculatePositionMetrics(
          currentPosition, 
          tracker.createdAt
        );
        
      } catch (error) {
        console.error(`Failed to update metrics for position ${positionId}:`, error);
      }
    }
  }

  private async calculatePositionMetrics(
    position: LiquidityPosition,
    createdAt: Date
  ) {
    // Implementation would calculate:
    // - Fees earned since creation
    // - Impermanent loss vs holding
    // - Total return including fees
    
    return {
      feesEarned: { tokenX: 0, tokenY: 0 }, // Calculate actual fees
      impermanentLoss: 0,                   // Calculate IL
      totalReturn: 0                        // Calculate total return
    };
  }

  getPortfolioSummary() {
    const positions = Array.from(this.positions.values());
    
    return {
      totalPositions: positions.length,
      totalFeesEarned: positions.reduce((sum, p) => 
        sum + p.metrics.feesEarned.tokenX + p.metrics.feesEarned.tokenY, 0
      ),
      averageReturn: positions.reduce((sum, p) => 
        sum + p.metrics.totalReturn, 0
      ) / positions.length,
      positions
    };
  }
}
```

## Common Configuration Patterns

### Multi-Pool Setup

```typescript
// Managing multiple DLMM pools
class DLMMPoolManager {
  private pools: Map<string, DLMMPool> = new Map();
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async loadPool(poolAddress: string): Promise<DLMMPool> {
    if (this.pools.has(poolAddress)) {
      return this.pools.get(poolAddress)!;
    }

    const pool = await DLMMPool.load(this.connection, new PublicKey(poolAddress));
    this.pools.set(poolAddress, pool);
    return pool;
  }

  async loadPoolsByTokenPair(
    tokenX: string, 
    tokenY: string
  ): Promise<DLMMPool[]> {
    // Find all pools for this token pair across different fee tiers
    const allPools = await this.getAllPools();
    
    return allPools.filter(pool =>
      (pool.tokenX.mintAddress === tokenX && pool.tokenY.mintAddress === tokenY) ||
      (pool.tokenX.mintAddress === tokenY && pool.tokenY.mintAddress === tokenX)
    );
  }

  async refreshAllPools() {
    const refreshPromises = Array.from(this.pools.values()).map(pool => pool.refresh());
    await Promise.all(refreshPromises);
  }

  getPool(poolAddress: string): DLMMPool | undefined {
    return this.pools.get(poolAddress);
  }

  private async getAllPools(): Promise<DLMMPool[]> {
    // Implementation would query all DLMM pools from the program
    return []; // Placeholder
  }
}
```

### Fee Tier Selection

```typescript
// Helper to choose optimal fee tier
interface FeeTierAnalysis {
  feeTier: number;      // Fee percentage (basis points)
  liquidity: number;    // Total liquidity in this tier
  volume24h: number;    // 24h volume
  expectedFeeAPR: number; // Expected fee generation APR
}

async function analyzeFéeTiers(
  tokenX: string,
  tokenY: string
): Promise<FeeTierAnalysis[]> {
  const feeTiers = [1, 5, 30, 100]; // 0.01%, 0.05%, 0.3%, 1%
  const analyses: FeeTierAnalysis[] = [];

  for (const feeTier of feeTiers) {
    try {
      // Find pool for this fee tier
      const pool = await findDLMMPoolByFeeTier(tokenX, tokenY, feeTier);
      
      if (pool) {
        const analytics = await getPoolAnalytics(pool.poolAddress);
        analyses.push({
          feeTier,
          liquidity: analytics.totalLiquidity,
          volume24h: analytics.volume24h,
          expectedFeeAPR: calculateExpectedFeeAPR(analytics)
        });
      }
    } catch (error) {
      console.warn(`Could not analyze fee tier ${feeTier}:`, error.message);
    }
  }

  // Sort by expected APR
  return analyses.sort((a, b) => b.expectedFeeAPR - a.expectedFeeAPR);
}

function recommendFeeTier(analyses: FeeTierAnalysis[], strategy: 'conservative' | 'aggressive') {
  if (strategy === 'conservative') {
    // Choose tier with highest liquidity (most stable)
    return analyses.reduce((best, current) => 
      current.liquidity > best.liquidity ? current : best
    );
  } else {
    // Choose tier with highest expected APR
    return analyses[0]; // Already sorted by APR
  }
}
```

## Troubleshooting Installation

### Common Issues

**Problem**: TypeScript compilation errors
```bash
# Solution: Update TypeScript and dependencies
npm update typescript @types/node
npm install --save-dev @types/bn.js
```

**Problem**: Missing decimal.js types
```bash
# Solution: Install type definitions
npm install --save-dev @types/decimal.js
```

**Problem**: Web3.js version conflicts
```bash
# Solution: Use exact versions
npm install @solana/web3.js@1.87.6 --save-exact
```

**Problem**: RPC connection issues
```typescript
// Solution: Custom connection with retry logic
import { Connection } from '@solana/web3.js';

const connection = new Connection(rpcUrl, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  wsEndpoint: rpcUrl.replace('https', 'wss') // WebSocket support
});
```

### Validation Script

```bash
# Create validation script
cat > validate-dlmm-setup.js << 'EOF'
const { Connection, PublicKey } = require('@solana/web3.js');

async function validate() {
  try {
    // Test imports
    const dlmmSdk = require('@saros-finance/dlmm-sdk');
    console.log('✅ DLMM SDK imported');
    
    // Test connection
    const connection = new Connection('https://api.devnet.solana.com');
    const version = await connection.getVersion();
    console.log('✅ RPC connection working');
    
    // Test PublicKey operations
    const testKey = new PublicKey('11111111111111111111111111111112');
    console.log('✅ Solana web3.js working');
    
    console.log('🎉 DLMM SDK setup validated!');
  } catch (error) {
    console.error('❌ Setup validation failed:', error);
  }
}

validate();
EOF

# Run validation
node validate-dlmm-setup.js
```

## Next Steps

✅ DLMM SDK installed and configured  
➡️ **Next**: [Concentrated Liquidity Guide](/docs/dlmm-sdk/concentrated-liquidity)

Or explore related topics:
- [Position Management](/docs/dlmm-sdk/position-management)
- [DLMM Position Manager Tutorial](/docs/examples/dlmm-position-creator)  
- [API Reference](/docs/dlmm-sdk/api-reference)