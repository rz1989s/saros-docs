# Installation

This guide will walk you through setting up your development environment and installing the Saros SDKs.

## Prerequisites

### Node.js Environment (For TypeScript SDKs)
- **Node.js**: Version 16.0 or higher
- **Package Manager**: npm, yarn, or pnpm
- **TypeScript**: Version 4.0 or higher (optional but recommended)

### Rust Environment (For Rust SDK)
- **Rust**: Version 1.70 or higher
- **Cargo**: Comes with Rust installation

### Solana Development
- **Solana CLI**: For devnet testing (optional)
- **Wallet**: Phantom, Solflare, or any Solana-compatible wallet
- **RPC Endpoint**: Mainnet, devnet, or testnet RPC URL

## Install Solana CLI (Optional)

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Verify installation
solana --version

# Set devnet cluster for testing
solana config set --url https://api.devnet.solana.com
```

## TypeScript SDK Installation

### @saros-finance/sdk (Main SDK)

```bash
# Using npm
npm install @saros-finance/sdk

# Using yarn
yarn add @saros-finance/sdk

# Using pnpm
pnpm add @saros-finance/sdk
```

**Dependencies installed**:
- `@solana/web3.js`: Solana JavaScript SDK
- `bn.js`: Big number support
- `graphql-request`: For GraphQL queries

### @saros-finance/dlmm-sdk (DLMM SDK)

```bash
# Using npm
npm install @saros-finance/dlmm-sdk

# Using yarn  
yarn add @saros-finance/dlmm-sdk

# Using pnpm
pnpm add @saros-finance/dlmm-sdk
```

### Install Both SDKs

```bash
npm install @saros-finance/sdk @saros-finance/dlmm-sdk
```

## Rust SDK Installation

### Add to Cargo.toml

```toml
[dependencies]
saros-dlmm = { git = "https://github.com/saros-xyz/saros-dlmm-sdk-rs" }
solana-client = "1.16"
solana-sdk = "1.16"
```

### Build Project

```bash
cargo build
```

## Environment Setup

### Environment Variables

Create a `.env` file in your project root:

```bash
# RPC Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# or for testing: https://api.devnet.solana.com

# Wallet Configuration (for testing only - never commit real private keys)
WALLET_PRIVATE_KEY=your_base58_private_key_here

# Optional: Custom program addresses
SAROS_SWAP_PROGRAM_ID=SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr
SAROS_FARM_PROGRAM_ID=SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true
  }
}
```

## Verify Installation

### TypeScript Verification

```typescript
import { genConnectionSolana } from '@saros-finance/sdk';

// Test connection
const connection = genConnectionSolana();
console.log('Saros SDK loaded successfully!');

// Test RPC connection
connection.getVersion().then(version => {
  console.log('Connected to Solana:', version);
});
```

### Rust Verification

```rust
use saros_dlmm::Amm;

fn main() {
    println!("Saros DLMM SDK loaded successfully!");
}
```

## Common Installation Issues

### TypeScript SDK Issues

**Problem**: Module not found errors
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem**: Version conflicts with @solana/web3.js
```bash
# Solution: Use exact versions
npm install @saros-finance/sdk @solana/web3.js@1.87.6 --save-exact
```

### Rust SDK Issues

**Problem**: Compilation errors
```bash
# Solution: Update Rust and dependencies
rustup update
cargo clean
cargo update
```

**Problem**: Missing system dependencies (Linux)
```bash
# Ubuntu/Debian
sudo apt-get install build-essential pkg-config libssl-dev

# CentOS/RHEL
sudo yum install gcc openssl-devel pkg-config
```

## Next Steps

✅ SDKs installed and verified  
➡️ **Next**: [Quick Start Guide](/docs/getting-started/quick-start)

Or jump directly to specific SDK documentation:
- [TypeScript SDK](/docs/typescript-sdk/installation)
- [DLMM SDK](/docs/dlmm-sdk/overview)  
- [Rust SDK](/docs/rust-sdk/getting-started)