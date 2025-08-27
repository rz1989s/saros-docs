# AMM Operations

Learn how to use the Saros TypeScript SDK for Automated Market Maker (AMM) operations including token swaps, pool creation, and liquidity management.

## Token Swapping

### Basic Swap

```typescript
import { 
  getSwapAmountSaros,
  swapSaros,
  genConnectionSolana 
} from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

const connection = genConnectionSolana();

async function performSwap(
  fromToken: TokenInfo,
  toToken: TokenInfo, 
  amount: number,
  poolParams: PoolParams,
  walletAddress: string
) {
  try {
    // 1. Calculate expected output
    const swapEstimate = await getSwapAmountSaros(
      connection,
      fromToken.mintAddress,
      toToken.mintAddress,
      amount,
      0.5, // 0.5% slippage
      poolParams
    );

    console.log(`Input: ${amount} ${fromToken.symbol}`);
    console.log(`Expected output: ${swapEstimate.amountOut} ${toToken.symbol}`);
    console.log(`Min output (with slippage): ${swapEstimate.amountOutWithSlippage}`);

    // 2. Execute swap
    const result = await swapSaros(
      connection,
      fromToken.addressSPL,        // From token account
      toToken.addressSPL,          // To token account  
      amount,                      // Input amount
      parseFloat(swapEstimate.amountOutWithSlippage), // Min output
      null,                        // Referrer (optional)
      new PublicKey(poolParams.address),              // Pool address
      new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'), // Swap program
      walletAddress,               // Wallet public key
      fromToken.mintAddress,       // From mint
      toToken.mintAddress          // To mint
    );

    if (result.isError) {
      throw new Error(`Swap failed: ${result.mess}`);
    }

    return {
      success: true,
      transactionHash: result.hash,
      estimatedOutput: swapEstimate.amountOut,
      actualSlippage: calculateSlippage(swapEstimate.amountOut, amount)
    };
    
  } catch (error) {
    console.error('Swap error:', error);
    throw error;
  }
}
```

### Advanced Swap with Price Impact

```typescript
async function swapWithPriceImpact(
  fromToken: TokenInfo,
  toToken: TokenInfo,
  amount: number,
  maxPriceImpact: number = 5.0 // 5% max price impact
) {
  // Calculate swap amounts for price impact analysis
  const estimate = await getSwapAmountSaros(
    connection,
    fromToken.mintAddress, 
    toToken.mintAddress,
    amount,
    0.5,
    poolParams
  );

  // Calculate price impact
  const expectedPrice = amount; // Simplified - use real price oracles
  const actualPrice = parseFloat(estimate.amountOut);
  const priceImpact = Math.abs((expectedPrice - actualPrice) / expectedPrice) * 100;

  if (priceImpact > maxPriceImpact) {
    throw new Error(`Price impact too high: ${priceImpact.toFixed(2)}%`);
  }

  // Proceed with swap if price impact is acceptable
  return await performSwap(fromToken, toToken, amount, poolParams, walletAddress);
}
```

## Pool Creation

### Create New Pool

```typescript
import { 
  createPool,
  convertBalanceToWei 
} from '@saros-finance/sdk';
import BN from 'bn.js';

async function createNewPool(
  token0: TokenInfo,
  token1: TokenInfo,
  token0Amount: number,
  token1Amount: number,
  walletAddress: string,
  isStablePool: boolean = false
) {
  try {
    // Determine curve type
    const curveType = isStablePool ? 1 : 0;     // 1 = stable, 0 = constant product
    const curveParameter = isStablePool ? 1 : 0; // Curve parameters

    // Convert amounts to wei (smallest unit)
    const convertedAmount0 = convertBalanceToWei(token0Amount, token0.decimals);
    const convertedAmount1 = convertBalanceToWei(token1Amount, token1.decimals);

    const result = await createPool(
      connection,
      walletAddress,                                    // Payer account
      new PublicKey('FDbLZ5DRo61queVRH9LL1mQnsiAoubQEnoCRuPEmH9M8'), // Fee owner
      new PublicKey(token0.mintAddress),                // Token 0 mint
      new PublicKey(token1.mintAddress),                // Token 1 mint  
      new PublicKey(token0.addressSPL),                 // Token 0 account
      new PublicKey(token1.addressSPL),                 // Token 1 account
      convertedAmount0,                                 // Token 0 amount
      convertedAmount1,                                 // Token 1 amount
      curveType,                                        // Pool curve type
      new BN(curveParameter),                           // Curve parameter
      new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // Token program
      new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr')  // Swap program
    );

    if (result.isError) {
      throw new Error(`Pool creation failed: ${result.mess}`);
    }

    return {
      success: true,
      transactionHash: result.hash,
      poolAddress: result.poolAddress, // Extract from result if available
    };

  } catch (error) {
    console.error('Pool creation error:', error);
    throw error;
  }
}
```

### Pool Configuration Best Practices

```typescript
// Recommended initial liquidity ratios
const LIQUIDITY_RATIOS = {
  // Stable pools (USDC/USDT)
  stable: {
    ratio: [1, 1], // 1:1 ratio
    curveType: 1,
    minLiquidity: 1000 // $1000 minimum
  },
  
  // Volatile pools (TOKEN/USDC)
  volatile: {
    ratio: [50, 50], // 50:50 by value
    curveType: 0,
    minLiquidity: 5000 // $5000 minimum for price stability
  }
};
```

## Liquidity Management

### Add Liquidity

```typescript
import { 
  depositAllTokenTypes,
  getPoolInfo,
  getTokenMintInfo,
  getTokenAccountInfo 
} from '@saros-finance/sdk';

async function addLiquidity(
  poolAddress: string,
  token0: TokenInfo,
  token1: TokenInfo,
  desiredAmount0: number, // Amount of token0 to deposit
  slippage: number = 0.5,
  walletAddress: string
) {
  try {
    // 1. Get pool information
    const poolInfo = await getPoolInfo(connection, new PublicKey(poolAddress));
    
    // 2. Get LP token supply
    const lpMintInfo = await getTokenMintInfo(connection, poolInfo.lpTokenMint);
    const lpTokenSupply = lpMintInfo.supply ? lpMintInfo.supply.toNumber() : 0;

    // 3. Get current pool token balance
    const poolToken0Info = await getTokenAccountInfo(connection, poolInfo.token0Account);
    const poolToken0Balance = poolToken0Info.amount.toNumber();

    // 4. Calculate LP tokens to mint
    const convertedAmount0 = convertBalanceToWei(desiredAmount0, token0.decimals);
    const lpTokensToMint = (parseFloat(convertedAmount0) * lpTokenSupply) / poolToken0Balance;

    // 5. Add liquidity
    const result = await depositAllTokenTypes(
      connection,
      walletAddress,               // Payer
      new PublicKey(walletAddress), // LP token recipient
      new PublicKey(token0.addressSPL), // Token 0 account
      new PublicKey(token1.addressSPL), // Token 1 account
      lpTokensToMint,              // LP tokens to mint
      new PublicKey(poolAddress),   // Pool address
      new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'), // Swap program
      token0.mintAddress,          // Token 0 mint
      token1.mintAddress,          // Token 1 mint
      slippage                     // Slippage tolerance
    );

    if (result.isError) {
      throw new Error(`Add liquidity failed: ${result.mess}`);
    }

    return {
      success: true,
      transactionHash: result.hash,
      lpTokens: lpTokensToMint
    };

  } catch (error) {
    console.error('Add liquidity error:', error);
    throw error;
  }
}
```

### Remove Liquidity

```typescript
import { 
  withdrawAllTokenTypes,
  getInfoTokenByMint 
} from '@saros-finance/sdk';

async function removeLiquidity(
  poolAddress: string,
  lpTokenAmount: number, // Amount of LP tokens to burn
  token0: TokenInfo,
  token1: TokenInfo,
  slippage: number = 0.5,
  walletAddress: string
) {
  try {
    // 1. Get pool info
    const poolInfo = await getPoolInfo(connection, new PublicKey(poolAddress));
    const lpTokenMint = poolInfo.lpTokenMint.toString();

    // 2. Get user's LP token account
    const userLpTokenInfo = await getInfoTokenByMint(lpTokenMint, walletAddress);

    // 3. Calculate proportional token amounts
    const poolToken0Info = await getTokenAccountInfo(connection, poolInfo.token0Account);
    const totalSupply = poolInfo.supply ? poolInfo.supply.toNumber() : 0;
    
    const token0Output = (lpTokenAmount * poolToken0Info.amount.toNumber()) / totalSupply;
    const token1Output = (lpTokenAmount * poolToken0Info.amount.toNumber()) / totalSupply;

    // 4. Remove liquidity
    const result = await withdrawAllTokenTypes(
      connection,
      walletAddress,               // Payer
      userLpTokenInfo.pubkey,      // LP token account to burn from
      token0.addressSPL,           // Token 0 destination
      token1.addressSPL,           // Token 1 destination
      lpTokenAmount,               // LP tokens to burn
      new PublicKey(poolAddress),   // Pool address
      new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'), // Swap program
      token0.mintAddress,          // Token 0 mint
      token1.mintAddress,          // Token 1 mint
      slippage                     // Slippage tolerance
    );

    if (result.isError) {
      throw new Error(`Remove liquidity failed: ${result.mess}`);
    }

    return {
      success: true,
      transactionHash: result.hash,
      token0Amount: token0Output,
      token1Amount: token1Output
    };

  } catch (error) {
    console.error('Remove liquidity error:', error);
    throw error;
  }
}
```

## Pool Analytics

### Get Pool Information

```typescript
async function getPoolAnalytics(poolAddress: string) {
  try {
    const poolInfo = await getPoolInfo(connection, new PublicKey(poolAddress));
    
    // Get token balances
    const token0Info = await getTokenAccountInfo(connection, poolInfo.token0Account);
    const token1Info = await getTokenAccountInfo(connection, poolInfo.token1Account);
    
    // Get LP token info
    const lpMintInfo = await getTokenMintInfo(connection, poolInfo.lpTokenMint);
    
    return {
      poolAddress,
      token0Balance: token0Info.amount.toNumber(),
      token1Balance: token1Info.amount.toNumber(),
      lpTokenSupply: lpMintInfo.supply?.toNumber() || 0,
      fee: poolInfo.fee || 0,
      curveType: poolInfo.curveType || 0,
      // Calculate TVL, price, etc.
      tvlUsd: calculateTVL(token0Info.amount, token1Info.amount),
      price: calculatePrice(token0Info.amount, token1Info.amount),
    };
  } catch (error) {
    console.error('Failed to get pool analytics:', error);
    throw error;
  }
}

// Helper functions
function calculateTVL(token0Amount: BN, token1Amount: BN): number {
  // Implement TVL calculation based on token prices
  // This would typically involve price oracles
  return 0; // Placeholder
}

function calculatePrice(token0Amount: BN, token1Amount: BN): number {
  // Calculate current pool price (token1/token0)
  return token1Amount.toNumber() / token0Amount.toNumber();
}
```

### Real-time Pool Monitoring

```typescript
class PoolMonitor {
  private poolAddress: string;
  private connection: Connection;
  private subscribers: Array<(data: PoolData) => void> = [];

  constructor(poolAddress: string) {
    this.poolAddress = poolAddress;
    this.connection = genConnectionSolana();
  }

  async startMonitoring(intervalMs: number = 5000) {
    const monitor = async () => {
      try {
        const poolData = await getPoolAnalytics(this.poolAddress);
        this.notifySubscribers(poolData);
      } catch (error) {
        console.error('Pool monitoring error:', error);
      }
    };

    // Initial fetch
    await monitor();
    
    // Set up interval
    setInterval(monitor, intervalMs);
  }

  subscribe(callback: (data: PoolData) => void) {
    this.subscribers.push(callback);
  }

  private notifySubscribers(data: PoolData) {
    this.subscribers.forEach(callback => callback(data));
  }
}

// Usage
const monitor = new PoolMonitor('2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty');
monitor.subscribe((data) => {
  console.log('Pool updated:', data);
});
monitor.startMonitoring();
```

## Advanced AMM Features

### Multi-hop Swaps

```typescript
// For tokens without direct pools, route through intermediate tokens
async function multiHopSwap(
  fromToken: TokenInfo,
  toToken: TokenInfo,
  amount: number,
  intermediateToken: TokenInfo = TOKENS.USDC // Route through USDC
) {
  try {
    // Step 1: From token → USDC
    const firstSwapEstimate = await getSwapAmountSaros(
      connection,
      fromToken.mintAddress,
      intermediateToken.mintAddress,
      amount,
      0.5,
      getPoolParams(fromToken.mintAddress, intermediateToken.mintAddress)
    );

    const firstSwapResult = await swapSaros(/* first swap parameters */);
    
    if (firstSwapResult.isError) {
      throw new Error(`First swap failed: ${firstSwapResult.mess}`);
    }

    // Step 2: USDC → To token  
    const secondSwapAmount = parseFloat(firstSwapEstimate.amountOut);
    const secondSwapEstimate = await getSwapAmountSaros(
      connection,
      intermediateToken.mintAddress,
      toToken.mintAddress,
      secondSwapAmount,
      0.5,
      getPoolParams(intermediateToken.mintAddress, toToken.mintAddress)
    );

    const secondSwapResult = await swapSaros(/* second swap parameters */);
    
    if (secondSwapResult.isError) {
      throw new Error(`Second swap failed: ${secondSwapResult.mess}`);
    }

    return {
      success: true,
      route: [fromToken.symbol, intermediateToken.symbol, toToken.symbol],
      transactions: [firstSwapResult.hash, secondSwapResult.hash],
      finalAmount: secondSwapEstimate.amountOut
    };

  } catch (error) {
    console.error('Multi-hop swap error:', error);
    throw error;
  }
}
```

### Slippage Optimization

```typescript
interface SlippageStrategy {
  calculateOptimalSlippage(
    amount: number,
    poolLiquidity: number,
    volatility: number
  ): number;
}

class DynamicSlippage implements SlippageStrategy {
  calculateOptimalSlippage(
    amount: number,
    poolLiquidity: number,
    volatility: number
  ): number {
    // Base slippage
    let slippage = 0.5;
    
    // Adjust for trade size relative to pool
    const tradeImpact = (amount / poolLiquidity) * 100;
    if (tradeImpact > 1) slippage += tradeImpact * 0.5;
    
    // Adjust for volatility
    slippage += volatility * 0.1;
    
    // Cap at reasonable maximum
    return Math.min(slippage, 5.0);
  }
}

async function swapWithOptimalSlippage(
  fromToken: TokenInfo,
  toToken: TokenInfo,
  amount: number
) {
  // Get pool analytics for slippage calculation
  const poolAnalytics = await getPoolAnalytics(poolParams.address);
  
  // Calculate optimal slippage
  const slippageStrategy = new DynamicSlippage();
  const optimalSlippage = slippageStrategy.calculateOptimalSlippage(
    amount,
    poolAnalytics.token0Balance,
    getTokenVolatility(fromToken.symbol) // Implement volatility lookup
  );

  console.log(`Using optimal slippage: ${optimalSlippage}%`);

  // Perform swap with calculated slippage
  return await performSwapWithSlippage(
    fromToken, 
    toToken, 
    amount, 
    optimalSlippage
  );
}
```

### Batch Operations

```typescript
interface SwapOperation {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  amount: number;
  poolParams: PoolParams;
}

async function batchSwaps(
  operations: SwapOperation[],
  walletAddress: string
) {
  const results: Array<{ success: boolean; hash?: string; error?: string }> = [];

  for (const operation of operations) {
    try {
      const result = await performSwap(
        operation.fromToken,
        operation.toToken,
        operation.amount,
        operation.poolParams,
        walletAddress
      );
      
      results.push({
        success: true,
        hash: result.transactionHash
      });
      
      // Small delay between operations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      results.push({
        success: false,
        error: error.message
      });
    }
  }

  return results;
}
```

## Error Handling

### Comprehensive Error Management

```typescript
enum SwapErrorCode {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  POOL_NOT_FOUND = 'POOL_NOT_FOUND',
  SLIPPAGE_EXCEEDED = 'SLIPPAGE_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROGRAM_ERROR = 'PROGRAM_ERROR',
}

class SarosSwapError extends Error {
  constructor(
    public code: SwapErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SarosSwapError';
  }
}

async function robustSwap(
  fromToken: TokenInfo,
  toToken: TokenInfo, 
  amount: number,
  maxRetries: number = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await performSwap(fromToken, toToken, amount, poolParams, walletAddress);
      
    } catch (error) {
      console.warn(`Swap attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        // Classify error type
        if (error.message.includes('insufficient')) {
          throw new SarosSwapError(
            SwapErrorCode.INSUFFICIENT_BALANCE,
            'Insufficient token balance for swap',
            { required: amount, token: fromToken.symbol }
          );
        } else if (error.message.includes('slippage')) {
          throw new SarosSwapError(
            SwapErrorCode.SLIPPAGE_EXCEEDED,
            'Slippage tolerance exceeded',
            { slippage: 0.5 }
          );
        } else {
          throw new SarosSwapError(
            SwapErrorCode.PROGRAM_ERROR,
            `Swap failed after ${maxRetries} attempts`,
            { originalError: error.message }
          );
        }
      }
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

## Utility Functions

### Balance and Amount Helpers

```typescript
import { convertBalanceToWei } from '@saros-finance/sdk';

// Convert human-readable amounts to blockchain amounts
function toWei(amount: number | string, decimals: number): string {
  return convertBalanceToWei(parseFloat(amount.toString()), decimals);
}

// Convert blockchain amounts to human-readable
function fromWei(amount: BN | number, decimals: number): number {
  const divisor = Math.pow(10, decimals);
  return (typeof amount === 'number' ? amount : amount.toNumber()) / divisor;
}

// Format amounts for display
function formatAmount(amount: number, symbol: string, precision: number = 4): string {
  return `${amount.toFixed(precision)} ${symbol}`;
}

// Calculate percentage change
function calculatePriceChange(oldPrice: number, newPrice: number): number {
  return ((newPrice - oldPrice) / oldPrice) * 100;
}
```

### Validation Helpers

```typescript
function validateTokenPair(token0: TokenInfo, token1: TokenInfo): boolean {
  return (
    token0.mintAddress !== token1.mintAddress &&
    token0.decimals > 0 && 
    token1.decimals > 0 &&
    PublicKey.isOnCurve(token0.mintAddress) &&
    PublicKey.isOnCurve(token1.mintAddress)
  );
}

function validateSwapAmount(amount: number, balance: number, minAmount: number = 0.001): boolean {
  return (
    amount > 0 &&
    amount >= minAmount &&
    amount <= balance
  );
}
```

## Performance Tips

1. **Cache Pool Information**: Pool data changes infrequently
2. **Batch Token Account Lookups**: Reduce RPC calls
3. **Use Connection Pooling**: For high-throughput applications
4. **Monitor Gas Fees**: Adjust priority fees during high network usage
5. **Implement Circuit Breakers**: For automated systems

## Next Steps

✅ AMM operations mastered  
➡️ **Next**: [Staking Guide](/docs/typescript-sdk/staking)

Or explore related topics:
- [Pool Creation Tutorial](/docs/tutorials/liquidity-provider-dashboard)
- [Swap Interface Example](/docs/examples/basic-token-swap)
- [API Reference](/docs/typescript-sdk/api-reference)