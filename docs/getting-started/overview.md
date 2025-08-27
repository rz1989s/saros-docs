# Overview

Welcome to the Saros SDK Documentation! Saros Finance is a comprehensive DeFi ecosystem built on Solana, offering multiple SDKs to integrate AMM (Automated Market Maker), DLMM (Dynamic Liquidity Market Maker), staking, and farming functionality into your applications.

## What is Saros Finance?

Saros Finance is a DeFi Super-Network that provides:
- **AMM Protocol**: Traditional automated market maker for token swapping
- **DLMM Protocol**: Advanced concentrated liquidity market maker
- **Staking**: Earn rewards by staking tokens
- **Farming**: Liquidity provider rewards and yield farming

## Available SDKs

### TypeScript SDK (`@saros-finance/sdk`)
The main TypeScript SDK provides comprehensive access to:
- Token swapping via AMM
- Liquidity pool creation and management
- Staking and unstaking operations
- Farming and reward claiming
- Pool information and analytics

**Best for**: Web applications, Node.js backends, and JavaScript-based DeFi interfaces.

### DLMM TypeScript SDK (`@saros-finance/dlmm-sdk`)
Specialized SDK for Dynamic Liquidity Market Maker operations:
- Concentrated liquidity provision
- Position management
- Fee tier optimization
- Advanced trading strategies

**Best for**: Advanced trading applications and concentrated liquidity strategies.

### Rust DLMM SDK (`saros-dlmm-sdk-rs`)
High-performance Rust implementation:
- Jupiter AMM trait integration
- Low-latency trading operations
- Memory-efficient operations
- Native Solana program calls

**Best for**: Trading bots, arbitrage applications, and performance-critical systems.

## Quick Start Guide

### 1. Choose Your SDK

| Use Case | Recommended SDK | Language |
|----------|-----------------|----------|
| Web app token swaps | TypeScript SDK | TypeScript/JavaScript |
| Concentrated liquidity | DLMM TypeScript SDK | TypeScript/JavaScript |
| Trading bots | Rust DLMM SDK | Rust |
| Full DeFi platform | TypeScript SDK | TypeScript/JavaScript |

### 2. Installation

```bash
# TypeScript SDK
npm install @saros-finance/sdk

# DLMM TypeScript SDK
npm install @saros-finance/dlmm-sdk

# Rust SDK - Add to Cargo.toml
saros-dlmm = "0.1.0"
```

### 3. Basic Usage

```typescript
import { swapSaros, getSwapAmountSaros } from '@saros-finance/sdk';

// Calculate swap amount
const swapEstimate = await getSwapAmountSaros(
  connection,
  fromMint,
  toMint,
  fromAmount,
  slippage,
  poolParams
);

// Execute swap
const result = await swapSaros(/* ... parameters ... */);
```

## What You'll Learn

This documentation will teach you:

1. **[Installation & Setup](/docs/getting-started/installation)** - Environment setup and SDK installation
2. **[Quick Start Guide](/docs/getting-started/quick-start)** - Your first Saros integration in 5 minutes
3. **[SDK Comparison](/docs/getting-started/sdk-comparison)** - Detailed comparison to help you choose

Then dive deep into:
- **TypeScript SDK**: AMM swaps, liquidity, staking, farming
- **DLMM SDK**: Concentrated liquidity and position management  
- **Rust SDK**: High-performance integrations and Jupiter compatibility
- **Tutorials**: Step-by-step guides for common use cases
- **Examples**: Working code samples you can copy and modify

## Prerequisites

- **For TypeScript SDKs**: Node.js 16+, npm/yarn
- **For Rust SDK**: Rust 1.70+, Cargo
- **For all SDKs**: Basic Solana knowledge and wallet setup
- **Recommended**: Familiarity with DeFi concepts (AMM, liquidity provision)

## Support

- **Developer Support**: [Telegram Channel](https://t.me/+DLLPYFzvTzJmNTJh)
- **Community**: [Saros Finance Telegram](https://t.me/SarosFinance)
- **Issues**: GitHub repositories for each SDK
- **General**: [Official Saros Docs](https://docs.saros.xyz)

Ready to start building? Head to the [Installation Guide](/docs/getting-started/installation) or jump straight into a [Quick Start Tutorial](/docs/getting-started/quick-start).