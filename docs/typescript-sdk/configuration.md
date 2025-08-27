# Configuration

Learn how to properly configure the Saros TypeScript SDK for different environments and use cases.

## Basic Configuration

### Connection Setup

```typescript
import { genConnectionSolana } from '@saros-finance/sdk';
import { Connection, clusterApiUrl } from '@solana/web3.js';

// Option 1: Use built-in connection (recommended)
const connection = genConnectionSolana();

// Option 2: Custom connection
const customConnection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'),
  'confirmed'
);
```

### RPC Endpoints

Choose the appropriate RPC endpoint for your environment:

```typescript
// Production (Mainnet)
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

// Development (Devnet) 
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Custom RPC (faster, paid services)
const CUSTOM_RPC = 'https://solana-mainnet.g.alchemy.com/v2/your-api-key';
```

## Program Addresses

### Default Program IDs

```typescript
import { PublicKey } from '@solana/web3.js';

// Saros program addresses (mainnet)
export const SAROS_ADDRESSES = {
  SWAP_PROGRAM: new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'),
  FARM_PROGRAM: new PublicKey('SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ'),
  TOKEN_PROGRAM: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  FEE_OWNER: new PublicKey('FDbLZ5DRo61queVRH9LL1mQnsiAoubQEnoCRuPEmH9M8'),
};
```

### Environment-Specific Addresses

```typescript
// config.ts
const getConfig = () => {
  const isMainnet = process.env.NODE_ENV === 'production';
  
  return {
    connection: genConnectionSolana(),
    programs: {
      swap: isMainnet 
        ? 'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'
        : 'DEVNET_SWAP_PROGRAM_ADDRESS',
      farm: isMainnet
        ? 'SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ' 
        : 'DEVNET_FARM_PROGRAM_ADDRESS'
    }
  };
};

export const config = getConfig();
```

## Wallet Configuration

### For Development (Testing)

```typescript
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Method 1: From private key (base58)
const privateKey = process.env.WALLET_PRIVATE_KEY!;
const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));

// Method 2: Generate random (for testing)
const testKeypair = Keypair.generate();
console.log('Test wallet:', testKeypair.publicKey.toString());
```

### For Production (User Wallets)

```typescript
// Browser wallet integration
interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
}

// Phantom wallet example
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: PublicKey }>;
      signTransaction: (transaction: Transaction) => Promise<Transaction>;
    };
  }
}

// Connect to user wallet
async function connectWallet(): Promise<WalletAdapter | null> {
  if (window.solana?.isPhantom) {
    const response = await window.solana.connect();
    return {
      publicKey: response.publicKey,
      signTransaction: window.solana.signTransaction
    };
  }
  return null;
}
```

## Token Configuration

### Token Definitions

```typescript
// Standard token interface
interface TokenInfo {
  id: string;
  mintAddress: string;
  symbol: string;
  name: string;
  icon?: string;
  decimals: number;
  addressSPL: string; // Associated token account
}

// Common tokens on Saros
export const TOKENS = {
  USDC: {
    id: 'usd-coin',
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addressSPL: '', // Will be determined per user
  },
  C98: {
    id: 'coin98',
    mintAddress: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',
    symbol: 'C98',
    name: 'Coin98',
    decimals: 6,
    addressSPL: '', // Will be determined per user
  },
  USDT: {
    id: 'tether',
    mintAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    addressSPL: '', // Will be determined per user
  }
} as const;
```

### Dynamic Token Account Resolution

```typescript
import { getInfoTokenByMint } from '@saros-finance/sdk';

async function getTokenAccount(mintAddress: string, walletAddress: string) {
  try {
    const tokenInfo = await getInfoTokenByMint(mintAddress, walletAddress);
    return tokenInfo.pubkey;
  } catch (error) {
    console.warn(`Token account not found for ${mintAddress}`);
    return null;
  }
}

// Usage
const userUsdcAccount = await getTokenAccount(
  TOKENS.USDC.mintAddress, 
  userWallet.toString()
);
```

## Pool Configuration

### Pool Parameters Structure

```typescript
interface PoolParams {
  address: string;           // Pool public key
  tokens: Record<string, TokenInfo>; // Token definitions by mint
  tokenIds: string[];        // Array of token mint addresses
}

// Example pool configuration
const USDC_C98_POOL: PoolParams = {
  address: '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
  tokens: {
    [TOKENS.USDC.mintAddress]: TOKENS.USDC,
    [TOKENS.C98.mintAddress]: TOKENS.C98,
  },
  tokenIds: [TOKENS.USDC.mintAddress, TOKENS.C98.mintAddress],
};
```

### Pool Discovery

```typescript
// Method 1: Use GraphQL service
import { SarosFarmService } from '@saros-finance/sdk';

async function getAvailablePools() {
  try {
    const pools = await SarosFarmService.getListPool({ page: 1, size: 10 });
    return pools;
  } catch (error) {
    console.error('Failed to fetch pools:', error);
    return [];
  }
}

// Method 2: Manual pool configuration
const KNOWN_POOLS = {
  'USDC/C98': '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
  'USDT/USDC': 'ANOTHER_POOL_ADDRESS',
  // Add more pools as needed
};
```

## Advanced Configuration

### Slippage and Timing

```typescript
// Global configuration object
export const SAROS_CONFIG = {
  // Slippage tolerance (0.5 = 0.5%)
  DEFAULT_SLIPPAGE: 0.5,
  MAX_SLIPPAGE: 5.0,
  
  // Transaction timeouts
  TRANSACTION_TIMEOUT: 60000, // 60 seconds
  CONFIRMATION_TIMEOUT: 30000, // 30 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};
```

### Error Handling Configuration

```typescript
// Custom error handler
interface SarosError {
  isError: boolean;
  mess?: string;
  code?: string;
  hash?: string;
}

function handleSarosError(result: SarosError) {
  if (result.isError) {
    console.error(`Saros Error [${result.code}]:`, result.mess);
    throw new Error(`Operation failed: ${result.mess}`);
  }
  return result;
}

// Usage in operations
const swapResult = await swapSaros(/* params */);
handleSarosError(swapResult);
```

### Logging Configuration

```typescript
// Debug logging
const DEBUG = process.env.NODE_ENV === 'development';

function log(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[Saros SDK] ${message}`, data || '');
  }
}

// Usage
log('Starting swap calculation', { fromToken, toToken, amount });
```

## Framework Integration

### React Integration

```tsx
// hooks/useSaros.ts
import { useState, useEffect } from 'react';
import { genConnectionSolana } from '@saros-finance/sdk';
import type { Connection } from '@solana/web3.js';

export function useSarosConnection() {
  const [connection, setConnection] = useState<Connection | null>(null);
  
  useEffect(() => {
    const conn = genConnectionSolana();
    setConnection(conn);
  }, []);
  
  return connection;
}

// Component usage
import { useSarosConnection } from './hooks/useSaros';

function SwapComponent() {
  const connection = useSarosConnection();
  
  if (!connection) return <div>Connecting to Solana...</div>;
  
  return <div>Ready for swaps!</div>;
}
```

### Next.js Integration

```typescript
// lib/saros.ts
import { genConnectionSolana } from '@saros-finance/sdk';

// Singleton connection for Next.js
let connection: Connection | null = null;

export function getSarosConnection() {
  if (!connection) {
    connection = genConnectionSolana();
  }
  return connection;
}

// api/swap.ts (API route)
import { getSarosConnection } from '../lib/saros';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const connection = getSarosConnection();
  // Handle swap logic
}
```

### Node.js Backend

```typescript
// server.ts
import express from 'express';
import { genConnectionSolana } from '@saros-finance/sdk';

const app = express();
const connection = genConnectionSolana();

app.post('/api/swap', async (req, res) => {
  try {
    // Swap logic using connection
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Performance Optimization

### Connection Pooling

```typescript
// connection-pool.ts
class SarosConnectionPool {
  private connections: Connection[] = [];
  private currentIndex = 0;
  
  constructor(rpcUrls: string[], poolSize: number = 3) {
    for (let i = 0; i < poolSize; i++) {
      const rpcUrl = rpcUrls[i % rpcUrls.length];
      this.connections.push(new Connection(rpcUrl, 'confirmed'));
    }
  }
  
  getConnection(): Connection {
    const conn = this.connections[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    return conn;
  }
}

// Usage
const pool = new SarosConnectionPool([
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/your-key'
]);
```

### Caching Configuration

```typescript
// Simple cache for pool info
const poolInfoCache = new Map<string, any>();
const CACHE_DURATION = 60000; // 1 minute

async function getCachedPoolInfo(poolAddress: string) {
  const cacheKey = `pool:${poolAddress}`;
  const cached = poolInfoCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const poolInfo = await getPoolInfo(connection, new PublicKey(poolAddress));
  poolInfoCache.set(cacheKey, {
    data: poolInfo,
    timestamp: Date.now()
  });
  
  return poolInfo;
}
```

## Security Best Practices

### Private Key Management

```typescript
// ❌ Never do this in production
const badExample = {
  privateKey: 'your-private-key-here' // Exposed in code!
};

// ✅ Use environment variables
const goodExample = {
  privateKey: process.env.WALLET_PRIVATE_KEY // From secure env
};

// ✅ Use wallet adapters in browsers
import { useWallet } from '@solana/wallet-adapter-react';

function SecureComponent() {
  const { publicKey, signTransaction } = useWallet();
  // No private key handling needed
}
```

### Input Validation

```typescript
import BN from 'bn.js';

function validateSwapInputs(
  fromAmount: number,
  slippage: number,
  poolParams: PoolParams
) {
  // Validate amount
  if (fromAmount <= 0) {
    throw new Error('Amount must be positive');
  }
  
  // Validate slippage
  if (slippage < 0 || slippage > 100) {
    throw new Error('Slippage must be between 0 and 100');
  }
  
  // Validate pool
  if (!poolParams.address || poolParams.tokenIds.length !== 2) {
    throw new Error('Invalid pool configuration');
  }
  
  return true;
}
```

## Testing Configuration

### Test Environment Setup

```typescript
// test-config.ts
export const TEST_CONFIG = {
  rpcUrl: 'https://api.devnet.solana.com',
  wallet: Keypair.generate(), // Generate test wallet
  tokens: {
    // Test tokens on devnet
    testUSDC: 'So11111111111111111111111111111111111111112', // Wrapped SOL
    testToken: 'ANOTHER_TEST_TOKEN_MINT'
  }
};

// Test helper functions
export async function setupTestEnvironment() {
  const connection = new Connection(TEST_CONFIG.rpcUrl, 'confirmed');
  
  // Request airdrop for testing
  const airdropSig = await connection.requestAirdrop(
    TEST_CONFIG.wallet.publicKey,
    2 * 1e9 // 2 SOL
  );
  
  await connection.confirmTransaction(airdropSig);
  return { connection, wallet: TEST_CONFIG.wallet };
}
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000, // 30 seconds for blockchain operations
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts']
};
```

```typescript
// test-setup.ts
import { config } from 'dotenv';
config(); // Load environment variables

// Global test configuration
global.testConfig = {
  rpcUrl: process.env.TEST_RPC_URL || 'https://api.devnet.solana.com',
  timeout: 30000
};
```

## Configuration Examples

### Complete Configuration File

```typescript
// saros-config.ts
import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import { genConnectionSolana } from '@saros-finance/sdk';

export interface SarosConfig {
  connection: Connection;
  programs: {
    swap: PublicKey;
    farm: PublicKey;
    token: PublicKey;
  };
  settings: {
    defaultSlippage: number;
    timeout: number;
    retries: number;
  };
}

export function createSarosConfig(environment: 'mainnet' | 'devnet' = 'mainnet'): SarosConfig {
  const isMainnet = environment === 'mainnet';
  
  return {
    connection: genConnectionSolana(),
    programs: {
      swap: new PublicKey(
        isMainnet 
          ? 'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'
          : 'DEVNET_SWAP_PROGRAM' // Replace with actual devnet address
      ),
      farm: new PublicKey(
        isMainnet
          ? 'SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ'
          : 'DEVNET_FARM_PROGRAM' // Replace with actual devnet address  
      ),
      token: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    },
    settings: {
      defaultSlippage: 0.5,
      timeout: 60000,
      retries: 3,
    }
  };
}

// Usage
const sarosConfig = createSarosConfig(
  process.env.NODE_ENV === 'production' ? 'mainnet' : 'devnet'
);
```

### Environment Detection

```typescript
// environment.ts
export const ENV = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  isBrowser: typeof window !== 'undefined',
  isNode: typeof window === 'undefined',
};

// Configuration based on environment
export function getEnvironmentConfig() {
  if (ENV.isTest) {
    return {
      rpcUrl: 'https://api.devnet.solana.com',
      slippage: 5.0, // Higher slippage for testing
      timeout: 30000,
    };
  }
  
  if (ENV.isDevelopment) {
    return {
      rpcUrl: 'https://api.devnet.solana.com', 
      slippage: 1.0,
      timeout: 60000,
    };
  }
  
  return {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    slippage: 0.5,
    timeout: 30000,
  };
}
```

## Troubleshooting

### Common Configuration Issues

**Issue**: Connection timeouts
```typescript
// Solution: Increase timeout and add retry logic
const connection = new Connection(rpcUrl, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
});
```

**Issue**: Invalid program addresses
```typescript
// Solution: Validate addresses on startup
function validateConfig(config: SarosConfig) {
  const { programs } = config;
  
  // Ensure all program addresses are valid
  [programs.swap, programs.farm, programs.token].forEach(addr => {
    if (!PublicKey.isOnCurve(addr)) {
      throw new Error(`Invalid program address: ${addr}`);
    }
  });
}
```

## Next Steps

✅ SDK configured and tested  
➡️ **Next**: [AMM Operations](/docs/typescript-sdk/amm)

Or explore other features:
- [Staking Guide](/docs/typescript-sdk/staking)
- [Farming Guide](/docs/typescript-sdk/farming)
- [API Reference](/docs/typescript-sdk/api-reference)