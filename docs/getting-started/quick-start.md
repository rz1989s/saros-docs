# Quick Start Guide

Get up and running with Saros SDKs in 5 minutes! This guide shows you how to perform your first token swap using the TypeScript SDK.

## 1. Setup Project

```bash
mkdir saros-demo && cd saros-demo
npm init -y
npm install @saros-finance/sdk @solana/web3.js bn.js
```

## 2. Create Basic Swap

Create `swap.js`:

```javascript
import { 
  getSwapAmountSaros,
  swapSaros,
  genConnectionSolana 
} from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

// Configuration
const connection = genConnectionSolana();
const SLIPPAGE = 0.5; // 0.5% slippage

// Token definitions (USDC to C98 example)
const USDC_TOKEN = {
  mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  decimals: 6,
  addressSPL: 'YOUR_USDC_TOKEN_ACCOUNT', // Replace with your token account
};

const C98_TOKEN = {
  mintAddress: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',
  decimals: 6,
  addressSPL: 'YOUR_C98_TOKEN_ACCOUNT', // Replace with your token account
};

// Pool configuration
const poolParams = {
  address: '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
  tokens: {
    [C98_TOKEN.mintAddress]: C98_TOKEN,
    [USDC_TOKEN.mintAddress]: USDC_TOKEN,
  },
  tokenIds: [C98_TOKEN.mintAddress, USDC_TOKEN.mintAddress],
};

async function performSwap() {
  try {
    const fromAmount = 1; // 1 USDC
    const walletAddress = 'YOUR_WALLET_PUBLIC_KEY'; // Replace with your wallet

    // 1. Calculate expected output
    console.log('Calculating swap amount...');
    const swapEstimate = await getSwapAmountSaros(
      connection,
      USDC_TOKEN.mintAddress,
      C98_TOKEN.mintAddress,
      fromAmount,
      SLIPPAGE,
      poolParams
    );

    console.log(`Expected output: ${swapEstimate.amountOut} C98`);
    console.log(`With slippage: ${swapEstimate.amountOutWithSlippage} C98`);

    // 2. Execute swap
    console.log('Executing swap...');
    const swapResult = await swapSaros(
      connection,
      USDC_TOKEN.addressSPL,
      C98_TOKEN.addressSPL,
      fromAmount,
      parseFloat(swapEstimate.amountOutWithSlippage),
      null, // No referrer
      new PublicKey(poolParams.address),
      new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'), // Saros swap program
      walletAddress,
      USDC_TOKEN.mintAddress,
      C98_TOKEN.mintAddress
    );

    if (swapResult.isError) {
      console.error('Swap failed:', swapResult.mess);
    } else {
      console.log('✅ Swap successful!');
      console.log(`Transaction: ${swapResult.hash}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

performSwap();
```

## 3. Run Your First Swap

```bash
# Replace token accounts and wallet in the script above
node swap.js
```

## Key Concepts

### Pool Parameters
Every operation requires pool configuration:
```javascript
const poolParams = {
  address: 'POOL_ADDRESS',     // Pool public key
  tokens: { /* token info */ }, // Token metadata
  tokenIds: ['mint1', 'mint2']  // Token mint addresses
};
```

### Connection Management
```javascript
const connection = genConnectionSolana();
// Uses default RPC endpoint, configure via environment variables
```

### Error Handling
All SDK functions return result objects:
```javascript
const result = await swapSaros(/* params */);
if (result.isError) {
  console.error(result.mess); // Error message
} else {
  console.log(result.hash);   // Success - transaction hash
}
```

## Common Patterns

### 1. Token Account Lookup
```javascript
import { getInfoTokenByMint } from '@saros-finance/sdk';

const tokenAccount = await getInfoTokenByMint(
  tokenMintAddress, 
  walletAddress
);
```

### 2. Pool Information
```javascript
import { getPoolInfo } from '@saros-finance/sdk';

const poolInfo = await getPoolInfo(
  connection,
  new PublicKey(poolAddress)
);
```

### 3. Balance Conversion
```javascript
import { convertBalanceToWei } from '@saros-finance/sdk';

const weiAmount = convertBalanceToWei(
  humanReadableAmount,
  tokenDecimals
);
```

## What's Next?

🎉 **Congratulations!** You've successfully set up and used the Saros SDK.

### Next Steps:
1. **[Explore TypeScript SDK](/docs/typescript-sdk/installation)** - Full AMM, staking, and farming features
2. **[Try DLMM SDK](/docs/dlmm-sdk/overview)** - Advanced concentrated liquidity
3. **[Check out Tutorials](/docs/tutorials/building-swap-interface)** - Build complete applications
4. **[Browse Examples](/docs/examples/basic-token-swap)** - Copy working code samples

### Pro Tips:
- Always test on devnet first
- Use proper error handling in production
- Monitor gas fees and slippage
- Keep private keys secure

Need help? Join our [Developer Support Channel](https://t.me/+DLLPYFzvTzJmNTJh) on Telegram!