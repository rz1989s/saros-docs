# Quick Start Guide

Get up and running with Saros SDKs in 5 minutes! This comprehensive guide walks you through setup, configuration, and your first token swap on Solana.

## Prerequisites

Before you begin, ensure you have:
- Node.js 16+ installed
- Basic knowledge of JavaScript/TypeScript
- A Solana wallet (Phantom, Solflare, or CLI wallet)
- Some SOL for transaction fees (~0.01 SOL)

## 1. Project Setup

### Create New Project

```bash
# Create and navigate to project directory
mkdir saros-demo && cd saros-demo

# Initialize Node.js project
npm init -y

# Install Saros SDK and dependencies
npm install @saros-finance/sdk @solana/web3.js @solana/spl-token bn.js dotenv

# Optional: TypeScript support
npm install -D typescript @types/node ts-node
```

### Configure Environment

Create `.env` file for secure configuration:

```bash
# .env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PRIVATE_KEY=your_wallet_private_key_array
SLIPPAGE_TOLERANCE=0.5
```

⚠️ **Security Note**: Never commit `.env` files. Add to `.gitignore`:

```bash
echo ".env" >> .gitignore
```

## 2. Initialize SDK Connection

Create `config.js` to set up your connection:

```javascript
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { genConnectionSolana } from '@saros-finance/sdk';
import dotenv from 'dotenv';

dotenv.config();

// Connection setup
export const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'),
  'confirmed'
);

// Wallet setup (for signing transactions)
export const wallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(process.env.PRIVATE_KEY || '[]'))
);

// Slippage configuration
export const SLIPPAGE = parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.5');

console.log('Connected to:', connection.rpcEndpoint);
console.log('Wallet address:', wallet.publicKey.toString());
```

## 3. Your First Token Swap

### Complete Swap Implementation

Create `swap.js` with comprehensive error handling:

```javascript
import { 
  getSwapAmountSaros,
  swapSaros,
  getInfoTokenByMint,
  convertBalanceToWei,
  getPoolInfo
} from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';
import { connection, wallet, SLIPPAGE } from './config.js';

// Popular token configurations
const TOKENS = {
  USDC: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    symbol: 'USDC'
  },
  SOL: {
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    symbol: 'SOL'
  },
  C98: {
    mint: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',
    decimals: 6,
    symbol: 'C98'
  }
};

// Saros pool addresses (mainnet)
const POOLS = {
  'USDC-C98': '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
  'SOL-USDC': 'EiEAydLqSKFqRPpuwYoVxEJ6h9UZh9tZaYW59nW5K7E7'
};

async function performSwap(
  fromToken, 
  toToken, 
  amount, 
  poolAddress
) {
  try {
    console.log('🔄 Starting swap:', 
      `${amount} ${fromToken.symbol} → ${toToken.symbol}`);
    
    // Step 1: Get user token accounts
    console.log('📍 Finding token accounts...');
    
    const fromTokenAccount = await getInfoTokenByMint(
      fromToken.mint,
      wallet.publicKey.toString()
    );
    
    const toTokenAccount = await getInfoTokenByMint(
      toToken.mint,
      wallet.publicKey.toString()
    );
    
    if (!fromTokenAccount || !toTokenAccount) {
      throw new Error('Token accounts not found. Ensure you have both tokens.');
    }
    
    console.log('✅ Token accounts found');
    
    // Step 2: Get pool information
    console.log('🏊 Loading pool data...');
    const poolInfo = await getPoolInfo(
      connection,
      new PublicKey(poolAddress)
    );
    
    if (!poolInfo) {
      throw new Error('Pool not found or inactive');
    }
    
    // Create pool parameters
    const poolParams = {
      address: poolAddress,
      tokens: {
        [fromToken.mint]: {
          mintAddress: fromToken.mint,
          decimals: fromToken.decimals,
          addressSPL: fromTokenAccount.pubkey
        },
        [toToken.mint]: {
          mintAddress: toToken.mint,
          decimals: toToken.decimals,
          addressSPL: toTokenAccount.pubkey
        }
      },
      tokenIds: [fromToken.mint, toToken.mint]
    };
    
    // Step 3: Calculate expected output
    console.log('📊 Calculating swap amount...');
    
    const swapEstimate = await getSwapAmountSaros(
      connection,
      fromToken.mint,
      toToken.mint,
      amount,
      SLIPPAGE,
      poolParams
    );
    
    if (swapEstimate.isError) {
      throw new Error(`Quote failed: ${swapEstimate.mess}`);
    }
    
    console.log('💰 Swap estimate:');
    console.log(`  Input: ${amount} ${fromToken.symbol}`);
    console.log(`  Expected output: ${swapEstimate.amountOut} ${toToken.symbol}`);
    console.log(`  Min output (with slippage): ${swapEstimate.amountOutWithSlippage} ${toToken.symbol}`);
    console.log(`  Price impact: ${swapEstimate.priceImpact}%`);
    
    // Step 4: Execute the swap
    console.log('🚀 Executing swap transaction...');
    
    const swapResult = await swapSaros(
      connection,
      fromTokenAccount.pubkey,
      toTokenAccount.pubkey,
      amount,
      parseFloat(swapEstimate.amountOutWithSlippage),
      null, // No referrer
      new PublicKey(poolAddress),
      new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'), // Saros swap program
      wallet.publicKey.toString(),
      fromToken.mint,
      toToken.mint
    );
    
    if (swapResult.isError) {
      throw new Error(`Swap failed: ${swapResult.mess}`);
    }
    
    console.log('✅ Swap successful!');
    console.log('📝 Transaction signature:', swapResult.hash);
    console.log(`🔗 View on Solscan: https://solscan.io/tx/${swapResult.hash}`);
    
    return {
      success: true,
      signature: swapResult.hash,
      amountIn: amount,
      amountOut: swapEstimate.amountOutWithSlippage,
      priceImpact: swapEstimate.priceImpact
    };
    
  } catch (error) {
    console.error('❌ Swap failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to check token balance
async function checkBalance(tokenMint, walletAddress) {
  try {
    const tokenAccount = await getInfoTokenByMint(
      tokenMint,
      walletAddress
    );
    
    if (!tokenAccount) {
      return 0;
    }
    
    return tokenAccount.amount || 0;
  } catch {
    return 0;
  }
}

// Main execution
async function main() {
  // Check balances before swap
  console.log('💼 Checking wallet balances...');
  
  const usdcBalance = await checkBalance(
    TOKENS.USDC.mint, 
    wallet.publicKey.toString()
  );
  
  const c98Balance = await checkBalance(
    TOKENS.C98.mint,
    wallet.publicKey.toString()
  );
  
  console.log(`USDC Balance: ${usdcBalance / 10**TOKENS.USDC.decimals}`);
  console.log(`C98 Balance: ${c98Balance / 10**TOKENS.C98.decimals}`);
  
  // Perform swap: 1 USDC → C98
  const swapAmount = 1; // 1 USDC
  const result = await performSwap(
    TOKENS.USDC,
    TOKENS.C98,
    swapAmount,
    POOLS['USDC-C98']
  );
  
  if (result.success) {
    console.log('\n🎉 Swap completed successfully!');
    console.log('Summary:', result);
  }
}

// Run with proper error handling
main().catch(console.error);
```

## 4. Advanced Features

### Batch Swaps

Execute multiple swaps efficiently:

```javascript
import { batchSwap } from '@saros-finance/sdk';

const swaps = [
  { from: 'USDC', to: 'SOL', amount: 10 },
  { from: 'SOL', to: 'C98', amount: 0.5 }
];

for (const swap of swaps) {
  await performSwap(
    TOKENS[swap.from],
    TOKENS[swap.to],
    swap.amount,
    POOLS[`${swap.from}-${swap.to}`]
  );
}
```

### Price Monitoring

Track price changes before executing:

```javascript
async function monitorPrice(fromToken, toToken, poolAddress) {
  const interval = setInterval(async () => {
    const price = await getSwapAmountSaros(
      connection,
      fromToken.mint,
      toToken.mint,
      1,
      0,
      { address: poolAddress, /* pool params */ }
    );
    
    console.log(`Price: 1 ${fromToken.symbol} = ${price.amountOut} ${toToken.symbol}`);
  }, 5000); // Check every 5 seconds
  
  // Stop after 1 minute
  setTimeout(() => clearInterval(interval), 60000);
}
```

### Transaction Priority

Set transaction priority for faster confirmation:

```javascript
import { ComputeBudgetProgram } from '@solana/web3.js';

// Add priority fee to transaction
const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1000 // Priority fee in micro-lamports
});

// Include in your transaction
```

## 5. Testing on Devnet

### Switch to Devnet

Modify `config.js`:

```javascript
export const connection = new Connection(
  clusterApiUrl('devnet'),
  'confirmed'
);

// Use devnet tokens and pools
const DEVNET_TOKENS = {
  USDC: {
    mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
    decimals: 6
  }
};
```

### Get Test Tokens

```bash
# Request SOL from faucet
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet

# Swap SOL for test tokens on devnet DEX
```

## 6. Production Checklist

Before deploying to production:

- [ ] **Environment Variables**: Store all sensitive data in `.env`
- [ ] **Error Handling**: Comprehensive try-catch blocks
- [ ] **Rate Limiting**: Implement request throttling
- [ ] **Monitoring**: Add logging and alerts
- [ ] **Gas Optimization**: Batch transactions when possible
- [ ] **Security Audit**: Review code for vulnerabilities
- [ ] **Backup RPC**: Fallback endpoints for reliability
- [ ] **User Notifications**: Transaction status updates
- [ ] **Slippage Protection**: Dynamic slippage based on volatility
- [ ] **MEV Protection**: Consider using protected RPCs

## 7. Common Issues & Solutions

### Issue: "Token account not found"
**Solution**: Create associated token accounts first:
```javascript
import { createAssociatedTokenAccount } from '@solana/spl-token';
```

### Issue: "Insufficient SOL for fees"
**Solution**: Ensure wallet has at least 0.01 SOL for transaction fees

### Issue: "Slippage too high"
**Solution**: Increase slippage tolerance or wait for better liquidity

### Issue: "Transaction timeout"
**Solution**: Use priority fees or retry with confirmation strategy

## What's Next?

🎉 **Congratulations!** You've mastered the basics of Saros SDK.

### Recommended Learning Path:

1. **[Build a Swap Interface](/docs/tutorials/building-swap-interface)** - Create a full DeFi UI
2. **[Add Liquidity Management](/docs/tutorials/liquidity-provider-dashboard)** - Become an LP
3. **[Implement Staking](/docs/tutorials/staking-integration)** - Earn rewards
4. **[Explore DLMM](/docs/dlmm-sdk/overview)** - Advanced concentrated liquidity
5. **[Try Rust SDK](/docs/rust-sdk/getting-started)** - High-performance trading

### Resources:

- 📚 [API Reference](/docs/typescript-sdk/api-reference) - Complete method documentation
- 💡 [Code Examples](/docs/examples/basic-token-swap) - Production-ready samples
- 🔧 [Troubleshooting Guide](/docs/troubleshooting) - Common issues and fixes
- 💬 [Developer Support](https://t.me/+DLLPYFzvTzJmNTJh) - Get help on Telegram
- 🐛 [Report Issues](https://github.com/saros-xyz/saros-sdk/issues) - GitHub repository

### Pro Tips:

- Always test on devnet before mainnet
- Monitor pool liquidity before large swaps
- Use WebSocket subscriptions for real-time updates
- Implement retry logic for network failures
- Cache pool data to reduce RPC calls
- Consider MEV protection for large trades

Ready to build something amazing? Let's dive deeper into the SDK! 🚀