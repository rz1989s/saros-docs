# API Reference

Complete API reference for the Saros TypeScript SDK (`@saros-finance/sdk`). This guide covers all available functions, their parameters, return types, and usage examples.

## Core Imports

```typescript
import sarosSdk, {
  // Connection utilities
  genConnectionSolana,
  
  // AMM functions
  getSwapAmountSaros,
  swapSaros,
  createPool,
  getPoolInfo,
  
  // Liquidity functions
  depositAllTokenTypes,
  withdrawAllTokenTypes,
  
  // Utility functions
  convertBalanceToWei,
  getTokenMintInfo,
  getTokenAccountInfo,
  getInfoTokenByMint,
  
  // Services
  SarosFarmService,
  SarosStakeServices
} from '@saros-finance/sdk';
```

## Connection Functions

### `genConnectionSolana()`

Creates a Solana RPC connection with default configuration.

```typescript
function genConnectionSolana(): Connection
```

**Returns**: `Connection` - Solana web3.js Connection instance

**Example**:
```typescript
const connection = genConnectionSolana();
const version = await connection.getVersion();
```

---

## AMM Functions

### `getSwapAmountSaros()`

Calculates the expected output amount for a token swap.

```typescript
function getSwapAmountSaros(
  connection: Connection,
  fromMint: string,
  toMint: string,
  fromAmount: number,
  slippage: number,
  poolParams: PoolParams
): Promise<SwapAmountResult>
```

**Parameters**:
- `connection` (`Connection`) - Solana RPC connection
- `fromMint` (`string`) - Source token mint address
- `toMint` (`string`) - Destination token mint address  
- `fromAmount` (`number`) - Input amount (human-readable)
- `slippage` (`number`) - Slippage tolerance (e.g., 0.5 for 0.5%)
- `poolParams` (`PoolParams`) - Pool configuration object

**Returns**: `Promise<SwapAmountResult>`

```typescript
interface SwapAmountResult {
  amountOut: string;              // Expected output amount
  amountOutWithSlippage: string;  // Minimum output with slippage
  priceImpact: number;            // Price impact percentage
  fee: number;                    // Trading fee
}
```

**Example**:
```typescript
const estimate = await getSwapAmountSaros(
  connection,
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9', // C98
  10, // 10 USDC
  0.5, // 0.5% slippage
  poolParams
);
```

### `swapSaros()`

Executes a token swap transaction.

```typescript
function swapSaros(
  connection: Connection,
  fromTokenAccount: string,
  toTokenAccount: string,  
  fromAmount: number,
  minAmountOut: number,
  referrer: string | null,
  poolAddress: PublicKey,
  swapProgramId: PublicKey,
  walletAddress: string,
  fromMint: string,
  toMint: string
): Promise<TransactionResult>
```

**Parameters**:
- `connection` (`Connection`) - Solana RPC connection
- `fromTokenAccount` (`string`) - Source token account address
- `toTokenAccount` (`string`) - Destination token account address
- `fromAmount` (`number`) - Input amount (human-readable)
- `minAmountOut` (`number`) - Minimum acceptable output amount
- `referrer` (`string | null`) - Referrer address (optional)
- `poolAddress` (`PublicKey`) - Pool address
- `swapProgramId` (`PublicKey`) - Saros swap program ID
- `walletAddress` (`string`) - Wallet public key
- `fromMint` (`string`) - Source token mint
- `toMint` (`string`) - Destination token mint

**Returns**: `Promise<TransactionResult>`

```typescript
interface TransactionResult {
  isError: boolean;
  mess?: string;     // Error message if isError is true
  hash?: string;     // Transaction signature if successful
}
```

### `createPool()`

Creates a new liquidity pool.

```typescript
function createPool(
  connection: Connection,
  payerAddress: string,
  feeOwner: PublicKey,
  token0Mint: PublicKey,
  token1Mint: PublicKey,
  token0Account: PublicKey,
  token1Account: PublicKey,
  token0Amount: string,
  token1Amount: string,
  curveType: number,
  curveParameter: BN,
  tokenProgramId: PublicKey,
  swapProgramId: PublicKey
): Promise<TransactionResult>
```

**Parameters**:
- `connection` (`Connection`) - Solana RPC connection
- `payerAddress` (`string`) - Transaction fee payer
- `feeOwner` (`PublicKey`) - Pool fee recipient
- `token0Mint` (`PublicKey`) - First token mint
- `token1Mint` (`PublicKey`) - Second token mint
- `token0Account` (`PublicKey`) - First token account
- `token1Account` (`PublicKey`) - Second token account  
- `token0Amount` (`string`) - Initial token 0 liquidity (wei)
- `token1Amount` (`string`) - Initial token 1 liquidity (wei)
- `curveType` (`number`) - Pool curve type (0 = constant product, 1 = stable)
- `curveParameter` (`BN`) - Curve-specific parameter
- `tokenProgramId` (`PublicKey`) - SPL Token program ID
- `swapProgramId` (`PublicKey`) - Saros swap program ID

### `getPoolInfo()`

Retrieves information about a liquidity pool.

```typescript
function getPoolInfo(
  connection: Connection,
  poolAddress: PublicKey
): Promise<PoolInfo>
```

**Returns**: `Promise<PoolInfo>`

```typescript
interface PoolInfo {
  token0Account: PublicKey;    // Token 0 reserve account
  token1Account: PublicKey;    // Token 1 reserve account
  lpTokenMint: PublicKey;      // LP token mint
  fee: number;                 // Pool fee
  curveType: number;           // Curve type
  supply?: BN;                 // LP token supply
}
```

---

## Liquidity Functions

### `depositAllTokenTypes()`

Adds liquidity to a pool by depositing both tokens.

```typescript
function depositAllTokenTypes(
  connection: Connection,
  payerAddress: string,
  lpTokenRecipient: PublicKey,
  token0UserAccount: PublicKey,
  token1UserAccount: PublicKey,
  lpTokenAmount: number,
  poolAddress: PublicKey,
  swapProgramId: PublicKey,
  token0Mint: string,
  token1Mint: string,
  slippage: number
): Promise<TransactionResult>
```

**Parameters**:
- `lpTokenAmount` (`number`) - Amount of LP tokens to mint
- `lpTokenRecipient` (`PublicKey`) - Account to receive LP tokens
- Other parameters similar to swap functions

### `withdrawAllTokenTypes()`

Removes liquidity from a pool by burning LP tokens.

```typescript
function withdrawAllTokenTypes(
  connection: Connection,
  payerAddress: string,
  lpTokenAccount: string,
  token0Destination: string,
  token1Destination: string,
  lpTokenAmount: number,
  poolAddress: PublicKey,
  swapProgramId: PublicKey,
  token0Mint: string,
  token1Mint: string,
  slippage: number
): Promise<TransactionResult>
```

---

## Utility Functions

### `convertBalanceToWei()`

Converts human-readable token amounts to blockchain format (wei).

```typescript
function convertBalanceToWei(
  amount: number,
  decimals: number
): string
```

**Parameters**:
- `amount` (`number`) - Human-readable amount
- `decimals` (`number`) - Token decimal places

**Returns**: `string` - Amount in wei format

**Example**:
```typescript
const weiAmount = convertBalanceToWei(1.5, 6); // "1500000"
```

### `getTokenMintInfo()`

Retrieves mint information for a token.

```typescript
function getTokenMintInfo(
  connection: Connection,
  mintAddress: PublicKey
): Promise<MintInfo>
```

**Returns**: `Promise<MintInfo>`

```typescript
interface MintInfo {
  supply: BN;           // Total supply
  decimals: number;     // Decimal places
  isInitialized: boolean;
  freezeAuthority?: PublicKey;
  mintAuthority?: PublicKey;
}
```

### `getTokenAccountInfo()`

Retrieves information about a token account.

```typescript
function getTokenAccountInfo(
  connection: Connection,
  accountAddress: PublicKey
): Promise<TokenAccountInfo>
```

**Returns**: `Promise<TokenAccountInfo>`

```typescript
interface TokenAccountInfo {
  mint: PublicKey;      // Token mint
  owner: PublicKey;     // Account owner
  amount: BN;           // Token balance
  state: number;        // Account state
}
```

### `getInfoTokenByMint()`

Finds a user's token account for a specific mint.

```typescript
function getInfoTokenByMint(
  mintAddress: string,
  walletAddress: string
): Promise<TokenAccountResult>
```

**Returns**: `Promise<TokenAccountResult>`

```typescript
interface TokenAccountResult {
  pubkey: string;       // Token account address
  account: {
    mint: string;       // Token mint
    owner: string;      // Account owner
    amount: number;     // Balance
  };
}
```

---

## Services

### `SarosFarmService`

Service for farming operations.

#### `getListPool()`

```typescript
SarosFarmService.getListPool(params: {
  page: number;
  size: number;
}): Promise<FarmingPool[]>
```

#### `stakePool()`

```typescript
SarosFarmService.stakePool(
  connection: Connection,
  payerAccount: { publicKey: PublicKey },
  poolAddress: PublicKey,
  amount: BN,
  farmProgramId: PublicKey,
  rewards: RewardInfo[],
  lpTokenMint: PublicKey
): Promise<TransactionResult>
```

#### `unStakePool()`

```typescript
SarosFarmService.unStakePool(
  connection: Connection,
  payerAccount: { publicKey: PublicKey },
  poolAddress: PublicKey,
  lpTokenMint: PublicKey,
  amount: BN,
  farmProgramId: PublicKey,
  rewards: RewardInfo[],
  fullUnstake: boolean
): Promise<TransactionResult>
```

#### `claimReward()`

```typescript
SarosFarmService.claimReward(
  connection: Connection,
  payerAccount: { publicKey: PublicKey },
  poolRewardAddress: PublicKey,
  farmProgramId: PublicKey,
  rewardMint: PublicKey
): Promise<TransactionResult>
```

### `SarosStakeServices`

Service for staking operations.

#### `getListPool()`

```typescript
SarosStakeServices.getListPool(params: {
  page: number;
  size: number;
}): Promise<StakingPool[]>
```

#### `stakePool()`

```typescript
SarosStakeServices.stakePool(
  connection: Connection,
  payerAccount: { publicKey: PublicKey },
  poolAddress: PublicKey,
  amount: BN,
  stakeProgramId: PublicKey,
  additionalAccounts: any[],
  extraParams?: any
): Promise<TransactionResult>
```

---

## Type Definitions

### Core Types

```typescript
interface PoolParams {
  address: string;                    // Pool address
  tokens: Record<string, TokenInfo>;  // Token definitions by mint
  tokenIds: string[];                 // Array of token mints
}

interface TokenInfo {
  id: string;           // Token identifier
  mintAddress: string;  // Token mint address
  symbol: string;       // Token symbol (e.g., 'USDC')
  name: string;         // Token name
  icon?: string;        // Token icon URL
  decimals: number;     // Decimal places
  addressSPL: string;   // Associated token account
}

interface RewardInfo {
  address: string;              // Reward token mint
  poolRewardAddress: string;    // Pool reward account
  rewardPerBlock: number;       // Rewards per block
  rewardTokenAccount: string;   // Reward distribution account
  id: string;                   // Reward token identifier
}
```

### Service Response Types

```typescript
interface TransactionResult {
  isError: boolean;
  mess?: string;        // Error message
  hash?: string;        // Transaction signature
  [key: string]: any;   // Additional result data
}

interface FarmingPool {
  poolAddress: string;        // Farm contract address
  lpAddress: string;         // LP token mint
  poolLpAddress: string;     // Underlying AMM pool
  token0: string;            // Token 0 mint
  token1: string;            // Token 1 mint
  token0Id: string;          // Token 0 identifier
  token1Id: string;          // Token 1 identifier  
  rewards: RewardInfo[];     // Reward configuration
  tvl?: number;              // Total value locked
  apr?: number;              // Annual percentage rate
}

interface StakingPool {
  poolAddress: string;        // Stake pool address
  tokenMint: string;         // Token to stake
  rewardMint: string;        // Reward token mint
  apr: number;               // Current APR
  totalStaked: number;       // Total amount staked
  maxStake?: number;         // Maximum stake limit
  lockupPeriod?: number;     // Lockup duration in seconds
}
```

## Error Handling

### Standard Error Response

All SDK functions return results in this format:

```typescript
interface SarosResult {
  isError: boolean;
  mess?: string;        // Error description
  hash?: string;        // Transaction hash (success)
  code?: string;        // Error code
  details?: any;        // Additional error details
}

// Usage pattern
const result = await anySDKFunction(/* params */);
if (result.isError) {
  console.error('Operation failed:', result.mess);
  return;
}
console.log('Success! Transaction:', result.hash);
```

### Common Error Codes

| Error Code | Description | Common Causes |
|------------|-------------|---------------|
| `INSUFFICIENT_FUNDS` | Not enough tokens | Low balance, gas fees |
| `SLIPPAGE_EXCEEDED` | Price moved beyond tolerance | High volatility, low slippage |
| `POOL_NOT_FOUND` | Pool doesn't exist | Wrong address, pool deprecated |
| `ACCOUNT_NOT_FOUND` | Token account missing | Need to create associated account |
| `PROGRAM_ERROR` | Smart contract error | Invalid parameters, program bug |
| `NETWORK_ERROR` | RPC connection issue | Network problems, rate limits |

## Constants

### Program Addresses

```typescript
// Mainnet program addresses
export const SAROS_PROGRAMS = {
  SWAP: 'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr',
  FARM: 'SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ',
  TOKEN: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  FEE_OWNER: 'FDbLZ5DRo61queVRH9LL1mQnsiAoubQEnoCRuPEmH9M8'
} as const;
```

### Common Token Mints

```typescript
export const COMMON_TOKENS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 
  SOL: 'So11111111111111111111111111111111111111112',
  C98: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9'
} as const;
```

## Advanced Usage Patterns

### Transaction Building

```typescript
// Custom transaction building for advanced users
import { Transaction, SystemProgram } from '@solana/web3.js';

async function buildCustomSwapTransaction(
  fromToken: string,
  toToken: string,
  amount: number,
  walletPublicKey: PublicKey
): Promise<Transaction> {
  const transaction = new Transaction();
  
  // Add compute budget instruction for priority fees
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: walletPublicKey,
      newAccountPubkey: walletPublicKey,
      lamports: 0,
      space: 0,
      programId: SystemProgram.programId
    })
  );
  
  // Use SDK functions to build swap instruction
  // Implementation would involve calling SDK internal functions
  
  return transaction;
}
```

### Batch Operations

```typescript
// Execute multiple operations in sequence with error recovery
async function executeBatchOperations(
  operations: Array<{
    type: 'swap' | 'stake' | 'unstake' | 'claim';
    params: any;
  }>,
  walletAddress: string
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  
  for (const [index, operation] of operations.entries()) {
    try {
      let result: TransactionResult;
      
      switch (operation.type) {
        case 'swap':
          result = await swapSaros(...operation.params);
          break;
        case 'stake':
          result = await SarosFarmService.stakePool(...operation.params);
          break;
        case 'unstake':
          result = await SarosFarmService.unStakePool(...operation.params);
          break;
        case 'claim':
          result = await SarosFarmService.claimReward(...operation.params);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
      
      results.push({
        index,
        operation: operation.type,
        success: !result.isError,
        result
      });
      
    } catch (error) {
      results.push({
        index,
        operation: operation.type,
        success: false,
        error: error.message
      });
    }
    
    // Small delay between operations
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

interface BatchResult {
  index: number;
  operation: string;
  success: boolean;
  result?: TransactionResult;
  error?: string;
}
```

### Event Monitoring

```typescript
// Monitor blockchain events related to Saros operations
class SarosEventMonitor {
  private connection: Connection;
  private subscriptions: Map<string, number> = new Map();

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async subscribeToPoolEvents(
    poolAddress: string,
    callback: (event: PoolEvent) => void
  ) {
    const subscriptionId = this.connection.onAccountChange(
      new PublicKey(poolAddress),
      (accountInfo) => {
        const event = this.parsePoolEvent(accountInfo);
        if (event) callback(event);
      },
      'confirmed'
    );
    
    this.subscriptions.set(poolAddress, subscriptionId);
    return subscriptionId;
  }

  async subscribeToFarmEvents(
    farmAddress: string,
    callback: (event: FarmEvent) => void
  ) {
    const subscriptionId = this.connection.onAccountChange(
      new PublicKey(farmAddress),
      (accountInfo) => {
        const event = this.parseFarmEvent(accountInfo);
        if (event) callback(event);
      },
      'confirmed'
    );
    
    this.subscriptions.set(farmAddress, subscriptionId);
    return subscriptionId;
  }

  unsubscribe(identifier: string) {
    const subscriptionId = this.subscriptions.get(identifier);
    if (subscriptionId) {
      this.connection.removeAccountChangeListener(subscriptionId);
      this.subscriptions.delete(identifier);
    }
  }

  private parsePoolEvent(accountInfo: any): PoolEvent | null {
    // Parse account data to extract pool events
    // Implementation depends on pool account structure
    return null; // Placeholder
  }

  private parseFarmEvent(accountInfo: any): FarmEvent | null {
    // Parse account data to extract farm events  
    // Implementation depends on farm account structure
    return null; // Placeholder
  }
}

interface PoolEvent {
  type: 'swap' | 'add_liquidity' | 'remove_liquidity';
  amount: number;
  timestamp: number;
}

interface FarmEvent {
  type: 'stake' | 'unstake' | 'claim_reward';
  user: string;
  amount: number;
  timestamp: number;
}
```

## SDK Configuration

### Advanced Configuration Options

```typescript
interface SarosSDKConfig {
  connection: {
    rpcUrl: string;
    commitment: 'processed' | 'confirmed' | 'finalized';
    timeout: number;
  };
  programs: {
    swapProgramId: string;
    farmProgramId: string;
    stakeProgramId: string;
  };
  defaults: {
    slippage: number;
    priorityFee: number;
    maxRetries: number;
  };
}

// Initialize SDK with custom config
function initializeSarosSDK(config: Partial<SarosSDKConfig>) {
  const defaultConfig: SarosSDKConfig = {
    connection: {
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      commitment: 'confirmed',
      timeout: 30000
    },
    programs: {
      swapProgramId: 'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr',
      farmProgramId: 'SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ',
      stakeProgramId: 'STAKE_PROGRAM_ADDRESS' // Replace with actual
    },
    defaults: {
      slippage: 0.5,
      priorityFee: 1000,
      maxRetries: 3
    }
  };

  // Merge with user config
  const finalConfig = { ...defaultConfig, ...config };
  
  // Initialize internal SDK state with config
  // This would be internal SDK implementation
  
  return finalConfig;
}
```

## Performance Considerations

### Caching Strategies

```typescript
// Cache pool information to reduce RPC calls
class PoolInfoCache {
  private cache: Map<string, { data: PoolInfo; timestamp: number }> = new Map();
  private cacheDuration = 30000; // 30 seconds

  async getPoolInfo(poolAddress: string): Promise<PoolInfo> {
    const cached = this.cache.get(poolAddress);
    
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }
    
    const poolInfo = await getPoolInfo(connection, new PublicKey(poolAddress));
    this.cache.set(poolAddress, {
      data: poolInfo,
      timestamp: Date.now()
    });
    
    return poolInfo;
  }

  invalidate(poolAddress?: string) {
    if (poolAddress) {
      this.cache.delete(poolAddress);
    } else {
      this.cache.clear();
    }
  }
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests: number = 10, timeWindowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  async throttle<T>(operation: () => Promise<T>): Promise<T> {
    const now = Date.now();
    
    // Remove old requests outside time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    // Check if we're at the limit
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Record this request
    this.requests.push(now);
    
    // Execute operation
    return await operation();
  }
}

// Usage
const rateLimiter = new RateLimiter(5, 1000); // 5 requests per second

const result = await rateLimiter.throttle(async () => {
  return await getSwapAmountSaros(/* params */);
});
```

## Migration Guide

### From Version 2.3.x to 2.4.x

```typescript
// Old way (v2.3.x)
import { SarosSwap } from '@saros-finance/sdk';

// New way (v2.4.x)  
import { swapSaros, getSwapAmountSaros } from '@saros-finance/sdk';

// Parameter changes
// Old: amounts as strings in wei
// New: amounts as numbers (human-readable)
```

### Breaking Changes

- Function signatures updated in v2.4.0
- Error response format standardized
- Pool parameter structure changed
- Service imports moved to default export

## Testing Utilities

### Mock SDK for Testing

```typescript
// Create mock implementations for testing
export const mockSarosSDK = {
  getSwapAmountSaros: jest.fn().mockResolvedValue({
    amountOut: '1000000',
    amountOutWithSlippage: '995000',
    priceImpact: 0.1,
    fee: 0.003
  }),
  
  swapSaros: jest.fn().mockResolvedValue({
    isError: false,
    hash: 'mock_transaction_hash_123'
  }),
  
  getPoolInfo: jest.fn().mockResolvedValue({
    token0Account: new PublicKey('11111111111111111111111111111112'),
    token1Account: new PublicKey('11111111111111111111111111111113'),
    lpTokenMint: new PublicKey('11111111111111111111111111111114'),
    fee: 0.003,
    curveType: 0
  })
};
```

## Next Steps

✅ TypeScript SDK API mastered  
➡️ **Next**: [DLMM SDK Documentation](/docs/dlmm-sdk/overview)

Or explore practical applications:
- [Build a Swap Interface Tutorial](/docs/tutorials/building-swap-interface)
- [Working Code Examples](/docs/examples/basic-token-swap)
- [Troubleshooting Guide](/docs/troubleshooting)