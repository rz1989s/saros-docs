# TypeScript SDK API Reference

Complete API documentation for `@saros-finance/sdk` with all methods, parameters, and return types.

## Table of Contents

- [Installation](#installation)
- [Connection Management](#connection-management)
- [Swap Operations](#swap-operations)
- [Liquidity Management](#liquidity-management)
- [Staking Functions](#staking-functions)
- [Farming Operations](#farming-operations)
- [Pool Information](#pool-information)
- [Token Utilities](#token-utilities)
- [Transaction Helpers](#transaction-helpers)
- [Math Utilities](#math-utilities)
- [Constants & Types](#constants--types)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)

---

## Installation

```bash
npm install @saros-finance/sdk @solana/web3.js bn.js
```

### Core Imports

```typescript
import sarosSdk, {
  // Connection utilities
  genConnectionSolana,
  createConnection,
  
  // AMM functions
  getSwapAmountSaros,
  swapSaros,
  batchSwap,
  createPool,
  getPoolInfo,
  getPoolByTokens,
  getAllPools,
  
  // Liquidity functions
  addLiquiditySaros,
  removeLiquiditySaros,
  depositAllTokenTypes,
  withdrawAllTokenTypes,
  calculateLiquidityValue,
  
  // Staking functions
  stakeSaros,
  unstakeSaros,
  harvestRewards,
  getStakeInfo,
  getStakePools,
  calculateAPY,
  
  // Farming functions
  depositFarm,
  withdrawFarm,
  harvestFarm,
  getFarmInfo,
  
  // Utility functions
  convertBalanceToWei,
  convertWeiToBalance,
  getTokenMintInfo,
  getTokenAccountInfo,
  getInfoTokenByMint,
  createTokenAccount,
  
  // Services
  SarosFarmService,
  SarosStakeServices,
  
  // Types
  PoolParams,
  TokenInfo,
  TransactionResult,
  SwapEstimate
} from '@saros-finance/sdk';

// For TypeScript users
import type {
  PoolInfo,
  StakeInfo,
  FarmInfo,
  SwapAmountResult,
  LiquidityResult,
  TokenAccount
} from '@saros-finance/sdk';
```

---

## Connection Management

### `genConnectionSolana()`

Creates a Solana RPC connection with default configuration.

```typescript
function genConnectionSolana(): Connection
```

**Returns:**
- `Connection` - Configured Solana connection instance

**Example:**
```javascript
const connection = genConnectionSolana();
console.log('Connected to:', connection.rpcEndpoint);
```

### `createConnection()`

Creates a custom connection with specific endpoint and configuration.

```typescript
function createConnection(
  endpoint: string,
  commitment?: Commitment,
  confirmTransactionInitialTimeout?: number
): Connection
```

**Parameters:**
- `endpoint` (string) - RPC endpoint URL
- `commitment` (Commitment, optional) - Transaction commitment level: 'processed' | 'confirmed' | 'finalized'
- `confirmTransactionInitialTimeout` (number, optional) - Timeout in milliseconds

**Returns:**
- `Connection` - Configured connection instance

**Example:**
```javascript
const connection = createConnection(
  'https://api.mainnet-beta.solana.com',
  'confirmed',
  60000
);
```

---

## Swap Operations

### `swapSaros()`

Executes a token swap on Saros AMM.

```typescript
async function swapSaros(
  connection: Connection,
  fromTokenAccount: string,
  toTokenAccount: string,
  amount: number,
  minAmountOut: number,
  referrer: PublicKey | null,
  poolAddress: PublicKey,
  programId: PublicKey,
  walletAddress: string,
  fromMint: string,
  toMint: string
): Promise<TransactionResult>
```

**Parameters:**
- `connection` - Solana connection
- `fromTokenAccount` - Source token account address
- `toTokenAccount` - Destination token account address  
- `amount` - Amount to swap (in token units, not wei)
- `minAmountOut` - Minimum acceptable output amount
- `referrer` - Referrer address for fees (optional, pass null if none)
- `poolAddress` - Pool public key
- `programId` - Saros swap program ID
- `walletAddress` - User wallet address
- `fromMint` - Source token mint
- `toMint` - Destination token mint

**Returns:**
```typescript
interface TransactionResult {
  isError: boolean;
  hash?: string;      // Transaction signature if successful
  mess?: string;      // Error message if failed
}
```

**Example:**
```javascript
const result = await swapSaros(
  connection,
  'FromTokenAccountAddress',
  'ToTokenAccountAddress',
  10, // Swap 10 tokens
  9.5, // Minimum 9.5 tokens out
  null,
  new PublicKey('PoolAddress'),
  new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'),
  'WalletPublicKey',
  'FromMintAddress',
  'ToMintAddress'
);

if (!result.isError) {
  console.log('Swap successful:', result.hash);
}
```

### `getSwapAmountSaros()`

Calculates expected output for a swap.

```typescript
async function getSwapAmountSaros(
  connection: Connection,
  fromMint: string,
  toMint: string,
  amount: number,
  slippage: number,
  poolParams: PoolParams
): Promise<SwapEstimate>
```

**Parameters:**
- `connection` - Solana connection
- `fromMint` - Source token mint address
- `toMint` - Destination token mint address
- `amount` - Input amount (human-readable)
- `slippage` - Slippage tolerance (0.5 = 0.5%)
- `poolParams` - Pool configuration object

**Returns:**
```typescript
interface SwapEstimate {
  isError: boolean;
  amountOut: string;              // Expected output
  amountOutWithSlippage: string;  // Minimum with slippage
  priceImpact: number;            // Price impact percentage
  fee: number;                    // Trading fee amount
  route?: string[];               // Swap route (for multi-hop)
  mess?: string;                  // Error message if failed
}
```

**Example:**
```javascript
const poolParams = {
  address: 'PoolAddress',
  tokens: {
    'MintA': { mintAddress: 'MintA', decimals: 6, addressSPL: 'TokenAccountA' },
    'MintB': { mintAddress: 'MintB', decimals: 9, addressSPL: 'TokenAccountB' }
  },
  tokenIds: ['MintA', 'MintB']
};

const estimate = await getSwapAmountSaros(
  connection,
  'MintA',
  'MintB',
  100,
  0.5,
  poolParams
);

console.log(`Expected output: ${estimate.amountOut}`);
console.log(`Minimum output: ${estimate.amountOutWithSlippage}`);
```

### `batchSwap()`

Executes multiple swaps in a single transaction.

```typescript
async function batchSwap(
  connection: Connection,
  swaps: SwapInstruction[],
  wallet: Keypair
): Promise<BatchSwapResult>
```

**Parameters:**
- `connection` - Solana connection
- `swaps` - Array of swap instructions
- `wallet` - Wallet keypair for signing

**SwapInstruction Type:**
```typescript
interface SwapInstruction {
  fromMint: string;
  toMint: string;
  amount: number;
  minAmountOut: number;
  poolAddress: string;
}
```

**Returns:**
```typescript
interface BatchSwapResult {
  success: boolean;
  signatures: string[];
  failedSwaps: number[];
  totalGasFee: number;
}
```

---

## Liquidity Management

### `addLiquiditySaros()`

Adds liquidity to a pool.

```typescript
async function addLiquiditySaros(
  connection: Connection,
  tokenAAccount: string,
  tokenBAccount: string,
  amountA: number,
  amountB: number,
  minLPTokens: number,
  poolAddress: PublicKey,
  walletAddress: string,
  slippage: number
): Promise<LiquidityResult>
```

**Parameters:**
- `connection` - Solana connection
- `tokenAAccount` - Token A account address
- `tokenBAccount` - Token B account address
- `amountA` - Amount of token A to deposit
- `amountB` - Amount of token B to deposit
- `minLPTokens` - Minimum LP tokens to receive
- `poolAddress` - Pool address
- `walletAddress` - User wallet
- `slippage` - Slippage tolerance (0.5 = 0.5%)

**Returns:**
```typescript
interface LiquidityResult {
  isError: boolean;
  hash?: string;        // Transaction signature
  lpTokens?: number;    // LP tokens received
  shareOfPool?: number; // Percentage of pool owned
  mess?: string;        // Error message
}
```

**Example:**
```javascript
const result = await addLiquiditySaros(
  connection,
  'TokenAAccount',
  'TokenBAccount',
  100, // 100 token A
  200, // 200 token B
  50,  // Minimum 50 LP tokens
  new PublicKey('PoolAddress'),
  'WalletAddress',
  0.5  // 0.5% slippage
);
```

### `removeLiquiditySaros()`

Removes liquidity from a pool.

```typescript
async function removeLiquiditySaros(
  connection: Connection,
  lpTokenAccount: string,
  lpAmount: number,
  minAmountA: number,
  minAmountB: number,
  poolAddress: PublicKey,
  walletAddress: string
): Promise<RemoveLiquidityResult>
```

**Parameters:**
- `connection` - Solana connection
- `lpTokenAccount` - LP token account
- `lpAmount` - Amount of LP tokens to burn
- `minAmountA` - Minimum token A to receive
- `minAmountB` - Minimum token B to receive
- `poolAddress` - Pool address
- `walletAddress` - User wallet

**Returns:**
```typescript
interface RemoveLiquidityResult {
  isError: boolean;
  hash?: string;
  amountA?: number;     // Token A received
  amountB?: number;     // Token B received
  mess?: string;
}
```

### `calculateLiquidityValue()`

Calculates the value of LP tokens.

```typescript
async function calculateLiquidityValue(
  connection: Connection,
  lpTokenAmount: number,
  poolAddress: PublicKey
): Promise<LiquidityValue>
```

**Returns:**
```typescript
interface LiquidityValue {
  tokenA: number;       // Amount of token A
  tokenB: number;       // Amount of token B
  totalValue: number;   // Total USD value
  impermanentLoss?: number; // IL percentage
}
```

---

## Staking Functions

### `stakeSaros()`

Stakes tokens in a staking pool.

```typescript
async function stakeSaros(
  connection: Connection,
  wallet: Keypair,
  poolAddress: PublicKey,
  amount: BN,
  lockPeriod: number,
  tokenAccount: string
): Promise<StakeResult>
```

**Parameters:**
- `connection` - Solana connection
- `wallet` - User wallet keypair
- `poolAddress` - Staking pool address
- `amount` - Amount to stake (as BN in wei)
- `lockPeriod` - Lock period in days (0 for flexible, 30/60/90 for locked)
- `tokenAccount` - Token account address

**Returns:**
```typescript
interface StakeResult {
  isError: boolean;
  hash?: string;
  stakeAccount?: PublicKey;
  estimatedAPY?: number;
  mess?: string;
}
```

**Example:**
```javascript
import BN from 'bn.js';

const amount = new BN(100).mul(new BN(10).pow(new BN(6))); // 100 tokens with 6 decimals
const result = await stakeSaros(
  connection,
  wallet,
  new PublicKey('StakePoolAddress'),
  amount,
  30, // 30-day lock
  'TokenAccountAddress'
);
```

### `unstakeSaros()`

Unstakes tokens from a pool.

```typescript
async function unstakeSaros(
  connection: Connection,
  wallet: Keypair,
  poolAddress: PublicKey,
  amount?: BN,
  emergency?: boolean
): Promise<UnstakeResult>
```

**Parameters:**
- `connection` - Solana connection
- `wallet` - User wallet
- `poolAddress` - Pool address
- `amount` - Amount to unstake (optional, unstakes all if not provided)
- `emergency` - Emergency unstake flag (incurs penalty)

**Returns:**
```typescript
interface UnstakeResult {
  isError: boolean;
  hash?: string;
  amount?: number;
  penalty?: number;     // Penalty amount if emergency
  rewards?: number;     // Rewards claimed
  mess?: string;
}
```

### `harvestRewards()`

Claims pending staking rewards.

```typescript
async function harvestRewards(
  connection: Connection,
  wallet: Keypair,
  poolAddress: PublicKey
): Promise<HarvestResult>
```

**Returns:**
```typescript
interface HarvestResult {
  isError: boolean;
  hash?: string;
  rewards?: number;
  nextHarvestTime?: number; // Unix timestamp
  mess?: string;
}
```

### `getStakeInfo()`

Retrieves staking position information.

```typescript
async function getStakeInfo(
  connection: Connection,
  walletAddress: PublicKey,
  poolAddress: PublicKey
): Promise<StakeInfo | null>
```

**Returns:**
```typescript
interface StakeInfo {
  stakedAmount: number;
  pendingRewards: number;
  lockEndTime: number;      // Unix timestamp
  stakingStartTime: number; // Unix timestamp
  currentAPY: number;
  canUnstake: boolean;
  canHarvest: boolean;
  decimals: number;
  multiplier?: number;      // Lock bonus multiplier
}
```

### `getStakePools()`

Fetches all available staking pools.

```typescript
async function getStakePools(
  connection: Connection,
  filter?: StakePoolFilter
): Promise<StakePool[]>
```

**Parameters:**
```typescript
interface StakePoolFilter {
  token?: string;       // Filter by token mint
  minAPY?: number;      // Minimum APY
  isActive?: boolean;   // Only active pools
}
```

**Returns:**
```typescript
interface StakePool {
  address: string;
  stakingToken: string;
  rewardToken: string;
  apy: number;
  totalStaked: number;
  totalStakedUSD: number;
  lockPeriods: number[];    // Available lock periods
  lockBonuses: number[];    // Bonus multipliers for locks
  minStake: number;
  maxStake?: number;
  isActive: boolean;
  endTime?: number;         // Pool end time if limited
}
```

### `calculateAPY()`

Converts APR to APY with compounding.

```typescript
function calculateAPY(
  apr: number,
  compoundFrequency: number = 365
): number
```

**Parameters:**
- `apr` - Annual percentage rate (25 = 25%)
- `compoundFrequency` - Times compounded per year

**Returns:**
- APY as percentage

**Example:**
```javascript
const apy = calculateAPY(24, 365); // Daily compounding
console.log(`APY: ${apy}%`); // ~27.11%
```

---

## Farming Operations

### `depositFarm()`

Deposits LP tokens into a farm.

```typescript
async function depositFarm(
  connection: Connection,
  wallet: Keypair,
  farmAddress: PublicKey,
  lpTokenAccount: string,
  amount: BN
): Promise<FarmResult>
```

**Parameters:**
- `connection` - Solana connection
- `wallet` - User wallet
- `farmAddress` - Farm address
- `lpTokenAccount` - LP token account
- `amount` - Amount to deposit (as BN)

**Returns:**
```typescript
interface FarmResult {
  isError: boolean;
  hash?: string;
  farmAccount?: PublicKey;
  estimatedAPR?: number;
  mess?: string;
}
```

### `withdrawFarm()`

Withdraws LP tokens from a farm.

```typescript
async function withdrawFarm(
  connection: Connection,
  wallet: Keypair,
  farmAddress: PublicKey,
  amount?: BN
): Promise<WithdrawResult>
```

**Returns:**
```typescript
interface WithdrawResult {
  isError: boolean;
  hash?: string;
  withdrawn?: number;
  rewards?: number;
  mess?: string;
}
```

### `harvestFarm()`

Claims farm rewards.

```typescript
async function harvestFarm(
  connection: Connection,
  wallet: Keypair,
  farmAddress: PublicKey
): Promise<HarvestResult>
```

### `getFarmInfo()`

Gets farm position information.

```typescript
async function getFarmInfo(
  connection: Connection,
  walletAddress: PublicKey,
  farmAddress: PublicKey
): Promise<FarmInfo | null>
```

**Returns:**
```typescript
interface FarmInfo {
  deposited: number;
  pendingRewards: RewardInfo[];
  totalValueLocked: number;
  userShare: number;        // Percentage of farm
  apy: number;
  dailyRewards: number;
  rewardTokens: TokenInfo[];
}

interface RewardInfo {
  token: string;
  amount: number;
  value: number;
}
```

---

## Pool Information

### `getPoolInfo()`

Retrieves detailed pool information.

```typescript
async function getPoolInfo(
  connection: Connection,
  poolAddress: PublicKey
): Promise<PoolInfo | null>
```

**Returns:**
```typescript
interface PoolInfo {
  address: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  reserveA: number;
  reserveB: number;
  lpSupply: number;
  lpMint: string;
  fee: number;              // Fee percentage
  volume24h: number;
  fees24h: number;
  tvl: number;
  apy: number;
  curveType: 'constant' | 'stable';
}
```

### `getAllPools()`

Fetches all Saros pools.

```typescript
async function getAllPools(
  connection: Connection,
  options?: PoolQueryOptions
): Promise<PoolInfo[]>
```

**Parameters:**
```typescript
interface PoolQueryOptions {
  minTVL?: number;        // Minimum TVL filter
  tokens?: string[];      // Filter by tokens
  sortBy?: 'tvl' | 'apy' | 'volume';
  limit?: number;
}
```

### `getPoolByTokens()`

Finds pool by token pair.

```typescript
async function getPoolByTokens(
  connection: Connection,
  tokenA: string,
  tokenB: string
): Promise<PoolInfo | null>
```

### `getPoolStats()`

Gets pool statistics and metrics.

```typescript
async function getPoolStats(
  connection: Connection,
  poolAddress: PublicKey,
  period?: '1h' | '24h' | '7d' | '30d'
): Promise<PoolStats>
```

**Returns:**
```typescript
interface PoolStats {
  volume: number;
  volumeChange: number;     // Percentage change
  fees: number;
  apy: number;
  apyChange: number;
  transactions: number;
  uniqueUsers: number;
  priceHistory: PricePoint[];
}

interface PricePoint {
  timestamp: number;
  price: number;
  volume: number;
}
```

---

## Token Utilities

### `getInfoTokenByMint()`

Gets token account information by mint.

```typescript
async function getInfoTokenByMint(
  tokenMint: string,
  walletAddress: string
): Promise<TokenAccount | null>
```

**Returns:**
```typescript
interface TokenAccount {
  pubkey: string;           // Account address
  amount: number;           // Token balance
  decimals: number;
  mint: string;
  uiAmount: number;         // Human-readable amount
}
```

### `getTokenBalance()`

Gets token balance for an account.

```typescript
async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<number>
```

### `createTokenAccount()`

Creates associated token account.

```typescript
async function createTokenAccount(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  owner?: PublicKey
): Promise<PublicKey>
```

**Returns:**
- PublicKey of created token account

### `getTokenMetadata()`

Fetches token metadata.

```typescript
async function getTokenMetadata(
  connection: Connection,
  mint: PublicKey
): Promise<TokenMetadata>
```

**Returns:**
```typescript
interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  extensions?: {
    website?: string;
    twitter?: string;
    coingeckoId?: string;
  };
}
```

---

## Transaction Helpers

### `sendTransaction()`

Sends and confirms a transaction.

```typescript
async function sendTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[],
  options?: SendOptions
): Promise<string>
```

**Parameters:**
```typescript
interface SendOptions {
  skipPreflight?: boolean;
  maxRetries?: number;
  commitment?: Commitment;
}
```

**Returns:**
- Transaction signature

### `simulateTransaction()`

Simulates a transaction without sending.

```typescript
async function simulateTransaction(
  connection: Connection,
  transaction: Transaction
): Promise<SimulationResult>
```

**Returns:**
```typescript
interface SimulationResult {
  success: boolean;
  error?: string;
  logs?: string[];
  unitsConsumed?: number;
}
```

### `getTransactionStatus()`

Checks transaction confirmation status.

```typescript
async function getTransactionStatus(
  connection: Connection,
  signature: string
): Promise<TransactionStatus>
```

**Returns:**
```typescript
interface TransactionStatus {
  confirmed: boolean;
  finalised: boolean;
  slot?: number;
  error?: string;
}
```

### `buildTransaction()`

Helper to build transactions with proper configuration.

```typescript
function buildTransaction(
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  recentBlockhash: string,
  priorityFee?: number
): Transaction
```

---

## Math Utilities

### `convertBalanceToWei()`

Converts human-readable amount to blockchain format.

```typescript
function convertBalanceToWei(
  amount: number,
  decimals: number
): string
```

**Example:**
```javascript
const wei = convertBalanceToWei(1.5, 9); // 1.5 SOL to lamports
// Returns: "1500000000"
```

### `convertWeiToBalance()`

Converts blockchain format to human-readable.

```typescript
function convertWeiToBalance(
  wei: string | BN,
  decimals: number
): number
```

**Example:**
```javascript
const amount = convertWeiToBalance("1500000000", 9);
// Returns: 1.5
```

### `calculatePriceImpact()`

Calculates price impact for a trade.

```typescript
function calculatePriceImpact(
  inputAmount: number,
  outputAmount: number,
  reserveIn: number,
  reserveOut: number
): number
```

**Returns:**
- Price impact as percentage (0.5 = 0.5%)

### `calculateMinOutput()`

Calculates minimum output with slippage.

```typescript
function calculateMinOutput(
  expectedOutput: number,
  slippagePercent: number
): number
```

**Example:**
```javascript
const minOutput = calculateMinOutput(100, 0.5); // 0.5% slippage
// Returns: 99.5
```

---

## Constants & Types

### Program IDs

```typescript
const SAROS_PROGRAMS = {
  SWAP: 'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr',
  STAKE: 'STAKEvGqQTtz6kGwWkNsnqmwcXDssR2VPMxCLfCzFYD',
  FARM: 'FarmqJm4HUK4hPtjKDQyKHXKUKL8EonAh5cX1xfpcEpN',
  TOKEN: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  ASSOCIATED_TOKEN: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
};
```

### Common Token Mints

```typescript
const COMMON_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  SAROS: 'Saro7NWpPHLH8fUoq7i1gVPkX1XJfXm7K9bYgTMRJkP',
  C98: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
};
```

### Common Types

```typescript
interface PoolParams {
  address: string;
  tokens: {
    [mint: string]: {
      mintAddress: string;
      decimals: number;
      addressSPL: string;
    }
  };
  tokenIds: string[];
}

interface TokenPair {
  tokenA: string;
  tokenB: string;
}

interface TransactionResult {
  isError: boolean;
  hash?: string;
  mess?: string;
  data?: any;
}

interface TokenInfo {
  mint: string;
  symbol: string;
  decimals: number;
  name?: string;
  logoURI?: string;
}
```

---

## Error Handling

### Error Codes

```typescript
enum SarosErrorCode {
  INSUFFICIENT_BALANCE = 'E001',
  SLIPPAGE_EXCEEDED = 'E002',
  POOL_NOT_FOUND = 'E003',
  INVALID_AMOUNT = 'E004',
  TRANSACTION_FAILED = 'E005',
  ACCOUNT_NOT_FOUND = 'E006',
  INSUFFICIENT_LIQUIDITY = 'E007',
  LOCK_PERIOD_ACTIVE = 'E008',
  INVALID_TOKEN_PAIR = 'E009',
  RPC_ERROR = 'E010',
  PROGRAM_ERROR = 'E011',
  TIMEOUT = 'E012'
}
```

### Error Handling Pattern

```javascript
try {
  const result = await swapSaros(...params);
  
  if (result.isError) {
    // Handle specific error codes
    switch(result.code) {
      case 'E001':
        console.error('Insufficient balance');
        break;
      case 'E002':
        console.error('Slippage exceeded, try increasing tolerance');
        break;
      default:
        console.error('Operation failed:', result.mess);
    }
  } else {
    console.log('Success! Transaction:', result.hash);
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

### Retry Logic

```javascript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs * i));
      }
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${i + 1} failed:`, error.message);
    }
  }
  
  throw lastError;
}

// Usage
const result = await retryOperation(() => 
  swapSaros(...params)
);
```

---

## Advanced Usage

### WebSocket Subscriptions

```javascript
class PriceMonitor {
  private connection: Connection;
  private subscriptions: Map<string, number> = new Map();

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async subscribeToPrice(
    poolAddress: string,
    callback: (price: number) => void
  ) {
    const pubkey = new PublicKey(poolAddress);
    
    const subscriptionId = this.connection.onAccountChange(
      pubkey,
      async (accountInfo) => {
        const poolInfo = await getPoolInfo(this.connection, pubkey);
        if (poolInfo) {
          const price = poolInfo.reserveB / poolInfo.reserveA;
          callback(price);
        }
      },
      'confirmed'
    );
    
    this.subscriptions.set(poolAddress, subscriptionId);
    return subscriptionId;
  }

  unsubscribe(poolAddress: string) {
    const id = this.subscriptions.get(poolAddress);
    if (id) {
      this.connection.removeAccountChangeListener(id);
      this.subscriptions.delete(poolAddress);
    }
  }
}

// Usage
const monitor = new PriceMonitor(connection);
await monitor.subscribeToPrice('PoolAddress', (price) => {
  console.log('Price updated:', price);
});
```

### Custom Transaction Priority

```javascript
import { ComputeBudgetProgram } from '@solana/web3.js';

async function swapWithPriority(
  ...swapParams,
  priorityFee: number = 1000
) {
  const transaction = new Transaction();
  
  // Add priority fee instruction
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee
    })
  );
  
  // Add swap instruction
  // ... build swap instruction
  
  return await sendTransaction(connection, transaction, signers);
}
```

### Pool Creation

```javascript
async function createNewPool(
  tokenA: PublicKey,
  tokenB: PublicKey,
  initialLiquidityA: number,
  initialLiquidityB: number,
  fee: number = 0.003
) {
  const result = await createPool(
    connection,
    wallet.publicKey.toString(),
    new PublicKey('FeeOwnerAddress'),
    tokenA,
    tokenB,
    tokenAAccount,
    tokenBAccount,
    convertBalanceToWei(initialLiquidityA, 6),
    convertBalanceToWei(initialLiquidityB, 9),
    0, // Constant product curve
    new BN(0),
    TOKEN_PROGRAM_ID,
    SWAP_PROGRAM_ID
  );
  
  return result;
}
```

---

## Best Practices

1. **Always validate inputs**
```javascript
function validateSwapParams(amount, minOutput, slippage) {
  if (amount <= 0) throw new Error('Invalid amount');
  if (minOutput <= 0) throw new Error('Invalid minimum output');
  if (slippage < 0 || slippage > 100) throw new Error('Invalid slippage');
}
```

2. **Use proper decimal conversion**
```javascript
// Always use conversion utilities
const weiAmount = convertBalanceToWei(humanAmount, decimals);
const humanAmount = convertWeiToBalance(weiAmount, decimals);
```

3. **Check token accounts before operations**
```javascript
const tokenAccount = await getInfoTokenByMint(mint, wallet);
if (!tokenAccount) {
  // Create token account
  await createTokenAccount(connection, wallet, new PublicKey(mint));
}
```

4. **Monitor gas fees**
```javascript
const fee = await connection.getFeeForMessage(message);
console.log(`Transaction fee: ${fee} lamports`);
```

5. **Cache frequently accessed data**
```javascript
const poolCache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

async function getCachedPoolInfo(poolAddress) {
  const cached = poolCache.get(poolAddress);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await getPoolInfo(connection, new PublicKey(poolAddress));
  poolCache.set(poolAddress, { data, timestamp: Date.now() });
  return data;
}
```

---

## Migration Guide

### From v1.x to v2.x

Major changes:
- New `PoolParams` structure required
- Staking functions use `BN` for amounts
- Connection parameter now required
- Improved TypeScript types

```javascript
// v1.x (old)
const result = await swapTokens(fromToken, toToken, amount);

// v2.x (new)
const result = await swapSaros(
  connection,
  fromTokenAccount,
  toTokenAccount,
  amount,
  minAmountOut,
  null,
  poolAddress,
  programId,
  walletAddress,
  fromMint,
  toMint
);
```

---

## Support & Resources

- 📚 [GitHub Repository](https://github.com/saros-xyz/saros-sdk)
- 💬 [Developer Telegram](https://t.me/+DLLPYFzvTzJmNTJh)
- 🌐 [Saros Website](https://saros.xyz)
- 📖 [Full Documentation](https://docs.saros.xyz)
- 🐛 [Report Issues](https://github.com/saros-xyz/saros-sdk/issues)

## Next Steps

✅ TypeScript SDK API Reference complete!

Explore more:
- [DLMM SDK Documentation](/docs/dlmm-sdk/overview) - Concentrated liquidity
- [Rust SDK Documentation](/docs/rust-sdk/getting-started) - High performance
- [Build a Swap Interface](/docs/tutorials/building-swap-interface) - Full tutorial
- [Working Examples](/docs/examples/basic-token-swap) - Ready-to-use code