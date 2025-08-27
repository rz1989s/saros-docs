# Troubleshooting Guide & FAQ

This comprehensive guide helps you resolve common issues when developing with Saros SDKs. Find solutions to setup problems, API errors, transaction failures, and other development challenges.

## 🔧 Quick Fixes

### Most Common Issues

| Issue | Quick Fix | Details |
|-------|-----------|---------|
| `Connection timeout` | Switch RPC endpoint | [Network Issues](#network-issues) |
| `Insufficient funds` | Check SOL balance | [Transaction Errors](#transaction-errors) |
| `Invalid signature` | Update wallet keypair | [Wallet Issues](#wallet-issues) |
| `Pool not found` | Verify pool ID | [API Errors](#api-errors) |
| `Slippage exceeded` | Increase tolerance | [Trading Issues](#trading-issues) |

## 📚 Installation Issues

### TypeScript SDK Installation Problems

#### Error: `Cannot resolve '@saros-finance/sdk'`

**Cause**: Package not installed or wrong Node.js version

**Solution**:
```bash
# Check Node.js version (requires v16+)
node --version

# Install with explicit version
npm install @saros-finance/sdk@latest @solana/web3.js

# Clear cache if needed
npm cache clean --force
npm install
```

#### Error: `Module not found` in React/Next.js

**Cause**: ESM/CommonJS compatibility issues

**Solution**:
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: 'loose'
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
```

#### Error: `Buffer is not defined`

**Cause**: Browser environment missing Node.js globals

**Solution**:
```bash
# Install buffer polyfill
npm install buffer

# Add to webpack config or use provider
import { Buffer } from 'buffer';
window.Buffer = Buffer;
```

### Rust SDK Installation Problems

#### Error: `failed to compile saros-dlmm-sdk`

**Cause**: Missing Rust toolchain or dependencies

**Solution**:
```bash
# Install/update Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Update toolchain
rustup update

# Install required dependencies
sudo apt-get install pkg-config libssl-dev # Linux
brew install openssl # macOS
```

#### Error: `linking with cc failed`

**Cause**: Missing C compiler or wrong target

**Solution**:
```bash
# Install build tools
# Linux:
sudo apt-get install build-essential

# macOS:
xcode-select --install

# Windows:
# Install Visual Studio Build Tools
```

## 🌐 Network Issues

### RPC Connection Problems

#### Error: `429 Too Many Requests`

**Cause**: Rate limiting on public RPC endpoints

**Solution**:
```typescript
// Use multiple RPC endpoints with fallback
const endpoints = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana'
];

let connection: Connection;
for (const endpoint of endpoints) {
  try {
    connection = new Connection(endpoint, { commitment: 'confirmed' });
    await connection.getLatestBlockhash();
    break; // Success
  } catch (error) {
    console.warn(`Failed to connect to ${endpoint}:`, error);
  }
}
```

#### Error: `WebSocket connection failed`

**Cause**: WebSocket restrictions or network blocking

**Solution**:
```typescript
// Use commitment level without WebSocket
const connection = new Connection(
  'https://api.mainnet-beta.solana.com',
  {
    commitment: 'confirmed',
    wsEndpoint: undefined // Disable WebSocket
  }
);

// Or use alternative WebSocket endpoint
const connection = new Connection(
  'https://api.mainnet-beta.solana.com',
  {
    commitment: 'confirmed', 
    wsEndpoint: 'wss://api.mainnet-beta.solana.com/'
  }
);
```

### Slow Response Times

#### Issue: API calls taking >5 seconds

**Diagnosis**:
```typescript
// Test RPC latency
const start = Date.now();
await connection.getLatestBlockhash();
const latency = Date.now() - start;
console.log(`RPC latency: ${latency}ms`);
```

**Solutions**:
1. **Switch to faster RPC**: Use paid providers (Alchemy, QuickNode, Helius)
2. **Enable caching**: Cache responses for repeated queries
3. **Batch requests**: Combine multiple calls when possible

```typescript
// Use paid RPC for better performance
const connection = new Connection(
  'https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
  { commitment: 'confirmed' }
);

// Enable local caching
const cache = new Map();
const getCachedPoolInfo = async (poolId: string) => {
  if (cache.has(poolId)) {
    const cached = cache.get(poolId);
    if (Date.now() - cached.timestamp < 30000) { // 30s cache
      return cached.data;
    }
  }
  
  const data = await sdk.getPoolInfo(new PublicKey(poolId));
  cache.set(poolId, { data, timestamp: Date.now() });
  return data;
};
```

## 💰 Transaction Errors

### Common Transaction Failures

#### Error: `Transaction was not confirmed`

**Cause**: Network congestion or insufficient fees

**Solution**:
```typescript
// Increase commitment level and add retry logic
async function sendTransactionWithRetry(
  transaction: Transaction,
  signer: Keypair,
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Use higher commitment for confirmation
      const signature = await connection.sendTransaction(transaction, [signer], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      // Wait for confirmation with timeout
      const confirmation = await connection.confirmTransaction({
        signature,
        lastValidBlockHeight: await connection.getLatestBlockhash().then(b => b.lastValidBlockHeight + 150),
        blockhash: (await connection.getLatestBlockhash()).blockhash
      }, 'confirmed');

      if (!confirmation.value.err) {
        return signature;
      }
    } catch (error) {
      console.warn(`Transaction attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Transaction failed after maximum retries');
}
```

#### Error: `Insufficient funds for transaction`

**Cause**: Not enough SOL for transaction fees

**Solution**:
```typescript
// Check SOL balance before transactions
async function ensureSufficientSOL(wallet: PublicKey, minSOL = 0.01): Promise<void> {
  const balance = await connection.getBalance(wallet);
  const solBalance = balance / 1e9; // Convert lamports to SOL
  
  if (solBalance < minSOL) {
    throw new Error(
      `Insufficient SOL balance: ${solBalance.toFixed(4)} SOL. ` +
      `Minimum required: ${minSOL} SOL. ` +
      `Please add SOL to your wallet.`
    );
  }
}

// Use before any transaction
await ensureSufficientSOL(wallet.publicKey);
```

### Slippage and Price Impact

#### Error: `Slippage tolerance exceeded`

**Cause**: High volatility or insufficient liquidity

**Solution**:
```typescript
// Implement dynamic slippage adjustment
async function getOptimalSlippage(
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: number
): Promise<number> {
  try {
    // Get pool liquidity
    const pools = await sdk.getPoolsForTokens(inputMint, outputMint);
    const totalLiquidity = pools.reduce((sum, pool) => sum + pool.totalLiquidity, 0);
    
    // Calculate price impact
    const priceImpact = (amount / totalLiquidity) * 100;
    
    // Dynamic slippage based on price impact
    if (priceImpact > 5) return 1000; // 10% for high impact
    if (priceImpact > 2) return 500;  // 5% for medium impact
    if (priceImpact > 1) return 300;  // 3% for low impact
    return 100; // 1% for minimal impact
    
  } catch (error) {
    console.warn('Could not calculate optimal slippage, using default');
    return 300; // 3% default
  }
}

// Use in swap calls
const optimalSlippage = await getOptimalSlippage(inputMint, outputMint, amount);
const quote = await sdk.getQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps: optimalSlippage
});
```

## 🔐 Wallet Issues

### Wallet Connection Problems

#### Error: `Wallet not connected`

**Cause**: Wallet adapter not properly initialized

**Solution**:
```typescript
// Proper wallet initialization
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function SwapInterface() {
  const { connected, publicKey, signTransaction } = useWallet();
  
  if (!connected) {
    return (
      <div>
        <p>Please connect your wallet to continue</p>
        <WalletMultiButton />
      </div>
    );
  }
  
  // Now safe to use wallet
  const sdk = new SarosSDK(connection, {
    wallet: { publicKey, signTransaction }
  });
}
```

#### Error: `User rejected the request`

**Cause**: User declined transaction in wallet

**Solution**:
```typescript
// Handle user rejection gracefully
async function executeSwapWithUserFeedback() {
  try {
    const transaction = await sdk.createSwapTransaction(swapParams);
    const signature = await wallet.sendTransaction(transaction, connection);
    
    // Show success message
    console.log('Swap successful:', signature);
    
  } catch (error) {
    if (error.message.includes('User rejected')) {
      console.log('Transaction cancelled by user');
      // Show user-friendly message, don't treat as error
    } else {
      console.error('Transaction failed:', error);
      // Handle actual errors
    }
  }
}
```

### Private Key Issues

#### Error: `Invalid private key format`

**Cause**: Wrong key format or corrupted keypair file

**Solution**:
```typescript
// Robust keypair loading
function loadKeypairSafely(keypairPath: string): Keypair {
  try {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    
    // Handle different formats
    let secretKey: number[];
    if (Array.isArray(keypairData)) {
      secretKey = keypairData;
    } else if (keypairData.secretKey) {
      secretKey = keypairData.secretKey;
    } else if (typeof keypairData === 'string') {
      // Base58 encoded
      secretKey = Array.from(bs58.decode(keypairData));
    } else {
      throw new Error('Unknown keypair format');
    }
    
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
  } catch (error) {
    console.error('Failed to load keypair:', error);
    throw new Error(`Invalid keypair file: ${keypairPath}. Please check the file format.`);
  }
}
```

## 🔄 API Errors

### Pool and Token Issues

#### Error: `Pool does not exist`

**Cause**: Invalid pool ID or pool not deployed on current network

**Solution**:
```typescript
// Validate pool existence before operations
async function validatePool(poolId: PublicKey): Promise<boolean> {
  try {
    const poolInfo = await sdk.getPoolInfo(poolId);
    return poolInfo !== null;
  } catch (error) {
    if (error.message.includes('Account does not exist')) {
      return false;
    }
    throw error; // Re-throw other errors
  }
}

// Use before pool operations
const poolId = new PublicKey('YOUR_POOL_ID');
if (!(await validatePool(poolId))) {
  throw new Error(`Pool ${poolId.toString()} does not exist on current network`);
}
```

#### Error: `Token mint not found`

**Cause**: Invalid token mint address

**Solution**:
```typescript
// Token validation helper
async function validateToken(mintAddress: PublicKey): Promise<{
  isValid: boolean;
  decimals?: number;
  symbol?: string;
}> {
  try {
    const mintInfo = await connection.getAccountInfo(mintAddress);
    if (!mintInfo) {
      return { isValid: false };
    }
    
    // Try to get token metadata
    const tokenInfo = await sdk.getTokenInfo(mintAddress);
    return {
      isValid: true,
      decimals: tokenInfo.decimals,
      symbol: tokenInfo.symbol
    };
  } catch (error) {
    return { isValid: false };
  }
}

// Validate before use
const validation = await validateToken(tokenMint);
if (!validation.isValid) {
  throw new Error(`Invalid token mint: ${tokenMint.toString()}`);
}
```

### Rate Limiting and Quotas

#### Error: `Rate limit exceeded`

**Cause**: Too many API calls to RPC endpoint

**Solution**:
```typescript
// Implement rate limiting and request queuing
class RateLimitedSDK {
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequest = 0;
  private minInterval = 100; // 100ms between requests

  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;
    
    this.processing = true;
    
    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;
      
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minInterval - timeSinceLastRequest)
        );
      }
      
      const request = this.requestQueue.shift()!;
      await request();
      this.lastRequest = Date.now();
    }
    
    this.processing = false;
  }
}

// Usage
const rateLimitedSDK = new RateLimitedSDK();
const poolInfo = await rateLimitedSDK.makeRequest(() => 
  sdk.getPoolInfo(poolId)
);
```

## 💸 Trading Issues

### Swap Execution Problems

#### Error: `Swap failed with slippage error`

**Cause**: Price moved beyond tolerance during execution

**Solution**:
```typescript
// Implement adaptive slippage with retry logic
async function executeSwapWithAdaptiveSlippage(
  swapParams: SwapParams,
  maxRetries = 3
): Promise<string> {
  let slippage = swapParams.slippageBps || 100;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const quote = await sdk.getQuote({
        ...swapParams,
        slippageBps: slippage
      });
      
      const transaction = await sdk.createSwapTransaction(quote);
      return await connection.sendTransaction(transaction, [wallet]);
      
    } catch (error) {
      if (error.message.includes('slippage') && attempt < maxRetries - 1) {
        slippage *= 1.5; // Increase slippage by 50%
        console.warn(`Slippage exceeded, retrying with ${slippage/100}%`);
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Swap failed after all retry attempts');
}
```

#### Error: `No route found for token pair`

**Cause**: No liquidity path between tokens

**Solution**:
```typescript
// Check for alternative routes
async function findAlternativeRoute(
  inputMint: PublicKey,
  outputMint: PublicKey
): Promise<PublicKey[]> {
  // Common intermediate tokens for routing
  const intermediateTokens = [
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'So11111111111111111111111111111111111111112',    // SOL
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',   // mSOL
  ];

  for (const intermediate of intermediateTokens) {
    try {
      const intermediateMint = new PublicKey(intermediate);
      
      // Check if route exists via intermediate token
      const route1 = await sdk.getQuote({
        inputMint,
        outputMint: intermediateMint,
        amount: 1000000 // Test amount
      });
      
      const route2 = await sdk.getQuote({
        inputMint: intermediateMint,
        outputMint,
        amount: route1.outAmount
      });
      
      if (route1 && route2) {
        return [inputMint, intermediateMint, outputMint];
      }
    } catch (error) {
      // Continue to next intermediate token
    }
  }
  
  throw new Error('No route found for token pair');
}
```

### Position Management Issues

#### Error: `Position not found`

**Cause**: Position closed or invalid position ID

**Solution**:
```typescript
// Robust position loading with validation
async function getPositionSafely(positionId: PublicKey): Promise<Position | null> {
  try {
    const position = await sdk.getPosition(positionId);
    
    // Validate position is still active
    if (position.liquidity === 0) {
      console.warn('Position has zero liquidity (may be closed)');
      return null;
    }
    
    return position;
  } catch (error) {
    if (error.message.includes('Account does not exist')) {
      console.log('Position does not exist or has been closed');
      return null;
    }
    throw error; // Re-throw other errors
  }
}

// Check before operations
const position = await getPositionSafely(positionId);
if (!position) {
  console.log('Position not found or inactive');
  return;
}
```

## 🏊‍♂️ DLMM-Specific Issues

### Bin and Range Management

#### Error: `Invalid bin ID`

**Cause**: Bin ID outside valid range for pool

**Solution**:
```typescript
// Validate and adjust bin IDs
async function validateAndAdjustBinId(
  poolId: PublicKey, 
  targetBinId: number
): Promise<number> {
  const poolInfo = await dlmmSDK.getPool(poolId);
  
  const minBin = poolInfo.minBin;
  const maxBin = poolInfo.maxBin;
  
  if (targetBinId < minBin || targetBinId > maxBin) {
    console.warn(`Bin ID ${targetBinId} outside valid range [${minBin}, ${maxBin}]`);
    
    // Adjust to nearest valid bin
    const adjustedBin = Math.max(minBin, Math.min(maxBin, targetBinId));
    console.log(`Adjusted to bin ID: ${adjustedBin}`);
    return adjustedBin;
  }
  
  return targetBinId;
}
```

#### Error: `Bin has no liquidity`

**Cause**: Trying to remove liquidity from empty bin

**Solution**:
```typescript
// Check bin liquidity before operations
async function getBinLiquidity(
  poolId: PublicKey, 
  binId: number
): Promise<number> {
  const binInfo = await dlmmSDK.getBin(poolId, binId);
  return binInfo.totalLiquidity || 0;
}

// Validate before removing liquidity
const liquidity = await getBinLiquidity(poolId, binId);
if (liquidity === 0) {
  throw new Error(`Bin ${binId} has no liquidity to remove`);
}
```

## 🔍 Debugging Tools

### Logging and Diagnostics

#### Enable SDK Debug Logging

```typescript
// TypeScript SDK debug mode
const sdk = new SarosSDK(connection, {
  debug: true,
  logLevel: 'verbose'
});

// Custom logging wrapper
function createLoggingWrapper(originalSDK: SarosSDK) {
  return new Proxy(originalSDK, {
    get(target, prop, receiver) {
      const origMethod = target[prop];
      if (typeof origMethod === 'function') {
        return function(...args: any[]) {
          console.log(`[SDK] Calling ${String(prop)} with:`, args);
          const start = Date.now();
          
          const result = origMethod.apply(target, args);
          
          if (result instanceof Promise) {
            return result
              .then(res => {
                console.log(`[SDK] ${String(prop)} completed in ${Date.now() - start}ms:`, res);
                return res;
              })
              .catch(err => {
                console.error(`[SDK] ${String(prop)} failed in ${Date.now() - start}ms:`, err);
                throw err;
              });
          }
          
          console.log(`[SDK] ${String(prop)} completed in ${Date.now() - start}ms:`, result);
          return result;
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

const loggingSDK = createLoggingWrapper(sdk);
```

### Transaction Simulation

```typescript
// Simulate transactions before sending
async function simulateTransaction(transaction: Transaction): Promise<void> {
  try {
    const simulation = await connection.simulateTransaction(transaction, [wallet]);
    
    if (simulation.value.err) {
      console.error('Transaction simulation failed:', simulation.value.err);
      throw new Error(`Transaction would fail: ${JSON.stringify(simulation.value.err)}`);
    }
    
    console.log('Transaction simulation successful');
    console.log('Compute units consumed:', simulation.value.unitsConsumed);
    console.log('Log messages:', simulation.value.logs);
    
  } catch (error) {
    console.error('Simulation error:', error);
    throw error;
  }
}

// Use before sending real transactions
await simulateTransaction(swapTransaction);
```

## 📱 Browser and Mobile Issues

### React Native Compatibility

#### Error: `Crypto module not found`

**Cause**: Missing React Native crypto polyfills

**Solution**:
```bash
# Install required polyfills
npm install react-native-get-random-values
npm install react-native-crypto

# Or use expo-crypto for Expo projects
expo install expo-crypto
```

```typescript
// Add to your app entry point (App.tsx)
import 'react-native-get-random-values';
import { install } from 'react-native-crypto';
install();

// For Expo
import * as Crypto from 'expo-crypto';
global.crypto = Crypto;
```

### Browser Storage Issues

#### Error: `localStorage is not defined`

**Cause**: Server-side rendering or Web Workers

**Solution**:
```typescript
// Safe storage helper
class SafeStorage {
  static get(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  }
  
  static set(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  }
}

// Use in SDK configuration
const savedRPC = SafeStorage.get('saros-rpc-endpoint');
const connection = new Connection(savedRPC || 'https://api.mainnet-beta.solana.com');
```

## 🔢 Performance Optimization

### Memory Management

#### Issue: Memory leaks in long-running applications

**Solution**:
```typescript
// Implement proper cleanup
class ManagedSarosSDK {
  private sdk: SarosSDK;
  private subscriptions: Set<number> = new Set();
  private timers: Set<NodeJS.Timer> = new Set();

  constructor(connection: Connection) {
    this.sdk = new SarosSDK(connection);
  }

  async subscribeToPool(poolId: PublicKey, callback: (data: any) => void): Promise<number> {
    const subscriptionId = await this.sdk.subscribeToPool(poolId, callback);
    this.subscriptions.add(subscriptionId);
    return subscriptionId;
  }

  createTimer(callback: () => void, interval: number): NodeJS.Timer {
    const timer = setInterval(callback, interval);
    this.timers.add(timer);
    return timer;
  }

  // Call this when component unmounts or app shuts down
  cleanup(): void {
    // Unsubscribe from all WebSocket connections
    for (const subId of this.subscriptions) {
      this.sdk.unsubscribe(subId);
    }
    this.subscriptions.clear();

    // Clear all timers
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();

    console.log('SDK cleanup completed');
  }
}

// React hook example
function useManagedSDK(connection: Connection) {
  const sdk = useMemo(() => new ManagedSarosSDK(connection), [connection]);
  
  useEffect(() => {
    return () => {
      sdk.cleanup(); // Cleanup on unmount
    };
  }, [sdk]);
  
  return sdk;
}
```

### Caching Strategies

```typescript
// Implement smart caching for repeated calls
class CachedSarosSDK {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private getCacheKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`;
  }
  
  private isCacheValid(cacheEntry: any): boolean {
    return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
  }
  
  async getPoolInfo(poolId: PublicKey, cacheTTL = 30000): Promise<any> {
    const cacheKey = this.getCacheKey('getPoolInfo', { poolId: poolId.toString() });
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      console.log('Cache hit for pool info');
      return cached.data;
    }
    
    const data = await sdk.getPoolInfo(poolId);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL
    });
    
    return data;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}
```

## 🐛 Common Error Messages

### Error Code Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `0x0` | Custom program error | Check program logs for details |
| `0x1` | Insufficient funds | Add more SOL/tokens to wallet |
| `0x2` | Invalid account | Verify account addresses |
| `0x3` | Account already exists | Use different account or update existing |
| `0x4` | Account not found | Check account exists on current network |
| `0x5` | Permission denied | Verify wallet has required permissions |

### Specific Error Solutions

#### `Error: Program 11111111111111111111111111111112 not found`

**Cause**: Wrong network or program not deployed

**Solution**:
```typescript
// Verify you're on the correct network
const programId = new PublicKey('SAROS_PROGRAM_ID');
const programAccount = await connection.getAccountInfo(programId);

if (!programAccount) {
  console.error('Saros program not found on this network');
  console.log('Current endpoint:', connection.rpcEndpoint);
  console.log('Try switching to mainnet-beta or devnet');
}
```

#### `Error: Transaction simulation failed`

**Cause**: Various transaction issues

**Solution**:
```typescript
// Detailed simulation analysis
async function analyzeTransactionFailure(transaction: Transaction) {
  try {
    const simulation = await connection.simulateTransaction(transaction, [wallet], {
      commitment: 'confirmed',
      replaceRecentBlockhash: true
    });
    
    if (simulation.value.err) {
      console.log('Simulation logs:', simulation.value.logs);
      
      // Common error patterns
      const logs = simulation.value.logs?.join(' ') || '';
      
      if (logs.includes('insufficient funds')) {
        throw new Error('Insufficient funds for transaction');
      } else if (logs.includes('slippage tolerance')) {
        throw new Error('Price moved beyond slippage tolerance');
      } else if (logs.includes('Pool not found')) {
        throw new Error('Pool does not exist or is not active');
      } else {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }
    }
  } catch (error) {
    console.error('Failed to simulate transaction:', error);
    throw error;
  }
}
```

## 📊 Monitoring and Health Checks

### SDK Health Monitoring

```typescript
// Health check system for production apps
class SarosHealthMonitor {
  private healthChecks: Array<() => Promise<boolean>> = [];

  constructor(private sdk: SarosSDK) {
    // Add default health checks
    this.addHealthCheck(() => this.checkRPCConnection());
    this.addHealthCheck(() => this.checkSDKFunctionality());
  }

  addHealthCheck(check: () => Promise<boolean>): void {
    this.healthChecks.push(check);
  }

  async runHealthChecks(): Promise<{
    healthy: boolean;
    results: Array<{ check: string; passed: boolean; error?: string }>;
  }> {
    const results = [];
    let allHealthy = true;

    for (const [index, check] of this.healthChecks.entries()) {
      try {
        const passed = await Promise.race([
          check(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        
        results.push({ check: `Health Check ${index + 1}`, passed });
        if (!passed) allHealthy = false;
        
      } catch (error) {
        results.push({ 
          check: `Health Check ${index + 1}`, 
          passed: false, 
          error: error.message 
        });
        allHealthy = false;
      }
    }

    return { healthy: allHealthy, results };
  }

  private async checkRPCConnection(): Promise<boolean> {
    try {
      await this.sdk.connection.getLatestBlockhash();
      return true;
    } catch (error) {
      console.error('RPC connection check failed:', error);
      return false;
    }
  }

  private async checkSDKFunctionality(): Promise<boolean> {
    try {
      await this.sdk.getAllPools();
      return true;
    } catch (error) {
      console.error('SDK functionality check failed:', error);
      return false;
    }
  }
}

// Usage in production
const healthMonitor = new SarosHealthMonitor(sdk);

// Run checks periodically
setInterval(async () => {
  const health = await healthMonitor.runHealthChecks();
  if (!health.healthy) {
    console.error('SDK health check failed:', health.results);
    // Alert your monitoring system
  }
}, 60000); // Check every minute
```

## 📋 Frequently Asked Questions

### General Questions

**Q: Which SDK should I use for my first Saros project?**

A: Start with the **TypeScript SDK** unless you specifically need DLMM features. It provides the most comprehensive feature set and best documentation.

**Q: Can I use multiple SDKs in the same project?**

A: Yes! Many projects use TypeScript SDK for general features and Rust SDK for performance-critical operations. See our [multi-SDK integration guide](/docs/examples/portfolio-analytics-dashboard).

**Q: Do I need to pay for using the SDKs?**

A: The SDKs are free to use. You only pay standard Solana transaction fees when executing trades or transactions.

### Technical Questions

**Q: Why do my transactions sometimes fail even with high slippage?**

A: Transaction failures can occur due to:
- Network congestion causing timeouts
- Pool liquidity changes between quote and execution  
- Account state changes (insufficient balance, etc.)
- Program upgrades or maintenance

Use retry logic with exponential backoff and transaction simulation before execution.

**Q: How can I reduce bundle size for web applications?**

A: Use dynamic imports and tree shaking:

```typescript
// Instead of importing everything
import { SarosSDK } from '@saros-finance/sdk';

// Import only what you need
import { SwapService } from '@saros-finance/sdk/swap';
import { PoolService } from '@saros-finance/sdk/pools';
```

**Q: Can I run the Rust SDK in a browser?**

A: No, the Rust SDK cannot run directly in browsers. Use it for:
- Backend services
- Desktop applications
- Command-line tools
- Server-side trading bots

For browser applications, use the TypeScript or DLMM TypeScript SDKs.

### Trading Questions

**Q: How do I handle failed transactions gracefully?**

A: Implement proper error handling with user-friendly messages:

```typescript
async function handleSwapWithFeedback(swapParams: SwapParams) {
  try {
    const result = await sdk.executeSwap(swapParams);
    return { success: true, signature: result };
    
  } catch (error) {
    // Parse error for user-friendly message
    let userMessage = 'Swap failed. Please try again.';
    
    if (error.message.includes('slippage')) {
      userMessage = 'Price moved too much. Try increasing slippage tolerance.';
    } else if (error.message.includes('insufficient')) {
      userMessage = 'Insufficient balance for this swap.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Network is slow. Please try again in a moment.';
    }
    
    return { success: false, error: userMessage, details: error.message };
  }
}
```

**Q: How do I calculate the best price for a trade?**

A: Compare quotes from multiple sources:

```typescript
async function getBestQuote(
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: number
) {
  const quotes = await Promise.allSettled([
    sdk.getQuote({ inputMint, outputMint, amount }),
    dlmmSDK.getQuote({ inputMint, outputMint, amount }),
    // Add Jupiter comparison if using Rust SDK
  ]);

  const validQuotes = quotes
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as any).value)
    .filter(quote => quote && quote.outAmount > 0);

  if (validQuotes.length === 0) {
    throw new Error('No valid quotes available');
  }

  // Return quote with highest output amount
  return validQuotes.reduce((best, current) => 
    current.outAmount > best.outAmount ? current : best
  );
}
```

## 🚨 Emergency Procedures

### When Things Go Wrong

#### Stuck Transaction Recovery

```typescript
// Check and cancel stuck transactions
async function cancelStuckTransactions(wallet: PublicKey): Promise<void> {
  try {
    // Get recent transaction signatures
    const signatures = await connection.getConfirmedSignaturesForAddress2(
      wallet,
      { limit: 50 }
    );

    const pendingSignatures = [];
    
    for (const sig of signatures) {
      const status = await connection.getSignatureStatus(sig.signature);
      
      if (!status.value?.confirmationStatus) {
        pendingSignatures.push(sig.signature);
      }
    }

    if (pendingSignatures.length > 0) {
      console.warn(`Found ${pendingSignatures.length} pending transactions`);
      // Log them for manual investigation
      console.log('Pending signatures:', pendingSignatures);
    }
  } catch (error) {
    console.error('Error checking transaction status:', error);
  }
}
```

#### Emergency Position Closure

```typescript
// Emergency position closure with maximum slippage
async function emergencyClosePosition(positionId: PublicKey): Promise<string> {
  try {
    // Use maximum slippage for emergency closure
    const transaction = await sdk.createClosePositionTransaction({
      positionId,
      slippageBps: 2000, // 20% emergency slippage
      user: wallet.publicKey
    });

    // Sign and send immediately
    transaction.sign([wallet]);
    const signature = await connection.sendTransaction(transaction, {
      skipPreflight: true, // Skip validation for speed
      preflightCommitment: 'processed'
    });

    console.log('Emergency position closure submitted:', signature);
    return signature;
    
  } catch (error) {
    console.error('Emergency closure failed:', error);
    throw error;
  }
}
```

## 🆘 Getting Help

### Support Channels

1. **Developer Support Telegram**: [t.me/+DLLPYFzvTzJmNTJh](https://t.me/+DLLPYFzvTzJmNTJh)
   - Real-time help from Saros team
   - Community support 24/7
   - Share code snippets and get quick feedback

2. **Discord Community**: [discord.gg/sarosfinance](https://discord.gg/sarosfinance)
   - Technical discussions
   - Feature requests
   - Community projects showcase

3. **GitHub Issues**: [github.com/saros-xyz](https://github.com/saros-xyz)
   - Bug reports with code reproduction
   - Feature requests
   - SDK improvement suggestions

### When Reporting Issues

Include this information for faster resolution:

1. **SDK Version**: Which SDK and version
2. **Network**: Devnet/mainnet/testnet  
3. **Environment**: Browser/Node.js/React Native
4. **Error Message**: Full error with stack trace
5. **Reproduction Steps**: Minimal code to reproduce
6. **Expected vs Actual**: What you expected vs what happened

#### Issue Template

```markdown
## Bug Report

**SDK**: TypeScript SDK v2.4.0
**Network**: Mainnet
**Environment**: Chrome browser, React 18

**Error**:
```
Error: Slippage tolerance exceeded
  at SwapService.executeSwap (sdk.js:1234)
```

**Code**:
```typescript
const quote = await sdk.getQuote({
  inputMint: usdcMint,
  outputMint: solMint, 
  amount: 1000000,
  slippageBps: 100
});
```

**Expected**: Successful swap execution
**Actual**: Transaction fails with slippage error

**Additional context**: Happens consistently during high volatility periods
```

---

## 🎯 Best Practices Summary

1. **Always simulate transactions** before sending to mainnet
2. **Implement retry logic** for network issues
3. **Use appropriate slippage** based on market conditions
4. **Monitor SDK health** in production applications
5. **Handle errors gracefully** with user-friendly messages
6. **Cache frequently accessed data** to improve performance
7. **Clean up subscriptions** to prevent memory leaks
8. **Test on devnet first** before deploying to mainnet

Need more help? Our developer community is always ready to assist in our [support channels](https://t.me/+DLLPYFzvTzJmNTJh)!