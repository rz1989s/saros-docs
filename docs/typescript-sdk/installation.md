# Installation

Learn how to install and configure the Saros TypeScript SDK (`@saros-finance/sdk`) in your JavaScript or TypeScript project.

## Installation

### Using npm
```bash
npm install @saros-finance/sdk
```

### Using yarn
```bash
yarn add @saros-finance/sdk
```

### Using pnpm
```bash
pnpm add @saros-finance/sdk
```

## Dependencies

The SDK automatically installs these peer dependencies:
- `@solana/web3.js` - Solana JavaScript SDK
- `bn.js` - BigNumber support for precise calculations
- `graphql-request` - GraphQL client for pool data

## Project Setup

### TypeScript Configuration

If using TypeScript, ensure your `tsconfig.json` includes:

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
    "lib": ["ES2020", "DOM"]
  }
}
```

### Environment Variables

Create a `.env` file for configuration:

```bash
# Solana RPC Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# For development: https://api.devnet.solana.com

# Wallet Configuration (development only - never commit real keys)
WALLET_PRIVATE_KEY=your_base58_encoded_private_key

# Optional: Custom program addresses (defaults provided)
SAROS_SWAP_PROGRAM_ID=SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr
SAROS_FARM_PROGRAM_ID=SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ
```

## Basic Setup

### Connection Setup

```typescript
import { genConnectionSolana } from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

// Create Solana connection
const connection = genConnectionSolana();

// Test connection
async function testConnection() {
  try {
    const version = await connection.getVersion();
    console.log('Connected to Solana:', version);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

### Import SDK Functions

```typescript
// Core functions
import { 
  getSwapAmountSaros,
  swapSaros,
  createPool,
  getPoolInfo
} from '@saros-finance/sdk';

// Liquidity functions
import {
  depositAllTokenTypes,
  withdrawAllTokenTypes
} from '@saros-finance/sdk';

// Utility functions
import {
  convertBalanceToWei,
  getTokenMintInfo,
  getTokenAccountInfo,
  getInfoTokenByMint
} from '@saros-finance/sdk';

// Services (default import)
import sarosSdk from '@saros-finance/sdk';
const { SarosFarmService, SarosStakeServices } = sarosSdk;
```

## Verification

### Quick Test

Create a test file to verify installation:

```typescript
// test-installation.ts
import { genConnectionSolana, convertBalanceToWei } from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

async function verifyInstallation() {
  console.log('🔍 Testing Saros SDK installation...');
  
  try {
    // Test 1: Connection
    const connection = genConnectionSolana();
    const version = await connection.getVersion();
    console.log('✅ Solana connection successful:', version['solana-core']);
    
    // Test 2: Utility functions
    const weiAmount = convertBalanceToWei(1, 6);
    console.log('✅ Utility functions working:', weiAmount);
    
    // Test 3: Public Key creation
    const testKey = new PublicKey('11111111111111111111111111111112');
    console.log('✅ Solana web3.js integration:', testKey.toString());
    
    console.log('🎉 Saros SDK successfully installed and verified!');
  } catch (error) {
    console.error('❌ Installation verification failed:', error);
  }
}

verifyInstallation();
```

Run the test:
```bash
npx ts-node test-installation.ts
# or with Node.js: node test-installation.js
```

Expected output:
```
🔍 Testing Saros SDK installation...
✅ Solana connection successful: 1.18.0
✅ Utility functions working: 1000000
✅ Solana web3.js integration: 11111111111111111111111111111112
🎉 Saros SDK successfully installed and verified!
```

## Common Issues

### Module Resolution Errors

**Problem**: `Cannot resolve module '@saros-finance/sdk'`

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use exact versions
npm install @saros-finance/sdk@2.4.0 --save-exact
```

### Web3.js Version Conflicts

**Problem**: Multiple versions of `@solana/web3.js`

**Solution**:
```bash
# Check for conflicts
npm ls @solana/web3.js

# Force single version
npm install @solana/web3.js@1.87.6 --save-exact
```

### TypeScript Compilation Errors

**Problem**: Type errors with SDK imports

**Solution**:
```json
// Add to tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

### RPC Connection Issues

**Problem**: `fetch is not defined` in Node.js

**Solution**:
```bash
# Install fetch polyfill for Node.js < 18
npm install node-fetch
```

```typescript
// Add at top of your file for Node.js < 18
import fetch from 'node-fetch';
global.fetch = fetch;
```

## Next Steps

✅ SDK installed and verified  
➡️ **Next**: [Configuration Guide](/docs/typescript-sdk/configuration)

Or explore specific features:
- [AMM Operations](/docs/typescript-sdk/amm)
- [Staking Guide](/docs/typescript-sdk/staking)  
- [Farming Guide](/docs/typescript-sdk/farming)
- [API Reference](/docs/typescript-sdk/api-reference)