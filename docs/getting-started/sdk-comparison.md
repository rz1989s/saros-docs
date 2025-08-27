# SDK Comparison Matrix

Choose the right Saros SDK for your project with this comprehensive comparison guide. Each SDK is optimized for different use cases, performance requirements, and developer preferences.

## Quick Recommendation Guide

| Use Case | Recommended SDK | Why |
|----------|----------------|-----|
| **Web Applications** | TypeScript SDK | Browser compatibility, React integration |
| **Mobile Apps** | TypeScript SDK | React Native support, smaller bundle size |
| **DLMM Trading Bots** | DLMM TypeScript SDK | Specialized DLMM features, good performance |
| **High-Frequency Trading** | Rust DLMM SDK | Maximum performance, low latency |
| **Backend Services** | Rust DLMM SDK | Server optimization, memory efficiency |
| **Simple Token Swaps** | TypeScript SDK | Easiest to implement |
| **Complex Arbitrage** | Rust DLMM SDK | Performance critical operations |
| **Portfolio Management** | TypeScript SDK | Rich ecosystem, good tooling |

## Detailed Feature Comparison

### Core Features

| Feature | TypeScript SDK | DLMM TypeScript SDK | Rust DLMM SDK |
|---------|----------------|-------------------|---------------|
| **Language** | TypeScript/JavaScript | TypeScript/JavaScript | Rust |
| **Package** | `@saros-finance/sdk` | `@saros-finance/dlmm-sdk` | `saros-dlmm-sdk-rs` |
| **AMM Trading** | ✅ Full Support | ❌ Not Available | ❌ Not Available |
| **DLMM Trading** | ⚠️ Basic Support | ✅ Full Support | ✅ Full Support |
| **Staking** | ✅ Full Support | ❌ Not Available | ❌ Not Available |
| **Yield Farming** | ✅ Full Support | ❌ Not Available | ❌ Not Available |
| **Position Management** | ✅ Basic | ✅ Advanced | ✅ Advanced |
| **Price Quotes** | ✅ Multi-source | ✅ DLMM Only | ✅ DLMM + Jupiter |
| **Historical Data** | ✅ Available | ⚠️ Limited | ⚠️ Limited |
| **Real-time Updates** | ✅ WebSocket | ✅ WebSocket | ⚠️ Polling |

### Performance Characteristics

| Metric | TypeScript SDK | DLMM TypeScript SDK | Rust DLMM SDK |
|--------|----------------|-------------------|---------------|
| **Execution Speed** | 🔶 Moderate | 🔶 Moderate | 🟢 Fast |
| **Memory Usage** | 🔶 Moderate | 🟢 Low | 🟢 Very Low |
| **Bundle Size** | 🔶 ~2.1MB | 🟢 ~800KB | 🟢 ~400KB |
| **Startup Time** | 🔶 ~500ms | 🟢 ~200ms | 🟢 ~50ms |
| **Transaction Speed** | 🔶 ~800ms | 🟢 ~400ms | 🟢 ~150ms |
| **Concurrent Operations** | 🔶 Limited | 🟢 Good | 🟢 Excellent |
| **CPU Efficiency** | 🔶 Moderate | 🟢 Good | 🟢 Excellent |

### Development Experience

| Aspect | TypeScript SDK | DLMM TypeScript SDK | Rust DLMM SDK |
|--------|----------------|-------------------|---------------|
| **Learning Curve** | 🟢 Easy | 🔶 Moderate | 🔴 Steep |
| **Documentation** | 🟢 Comprehensive | 🟢 Comprehensive | 🟢 Comprehensive |
| **Type Safety** | 🟢 Excellent | 🟢 Excellent | 🟢 Excellent |
| **IDE Support** | 🟢 Excellent | 🟢 Excellent | 🟢 Excellent |
| **Debugging Tools** | 🟢 Rich | 🔶 Good | 🔶 Good |
| **Community Support** | 🟢 Large | 🔶 Growing | 🔶 Growing |
| **Examples Available** | 🟢 Many | 🟢 Many | 🟢 Many |

## Detailed SDK Breakdown

### 1. TypeScript SDK (@saros-finance/sdk)

**Best for**: Web applications, portfolio management tools, multi-protocol integrations

#### ✅ Strengths
- **Full Protocol Coverage**: Supports AMM, DLMM, staking, and farming
- **Browser Compatibility**: Works in all modern browsers
- **Rich Ecosystem**: Integrates with popular web3 libraries
- **Rapid Development**: Quick prototyping and deployment
- **Framework Support**: Built-in React hooks and components
- **Comprehensive Documentation**: Extensive guides and examples

#### ⚠️ Limitations
- **Performance**: Slower than compiled languages for intensive operations
- **Bundle Size**: Larger JavaScript bundle affects load times
- **Resource Usage**: Higher memory consumption in browser environments
- **DLMM Features**: Basic DLMM support compared to specialized SDK

#### 📊 Performance Benchmarks
```
Swap Quote Generation: ~300ms
Position Value Calculation: ~150ms
Portfolio Sync: ~2000ms (100 positions)
Bundle Size: ~2.1MB (gzipped)
Memory Usage: ~15MB (typical web app)
```

---

### 2. DLMM TypeScript SDK (@saros-finance/dlmm-sdk)

**Best for**: DLMM-focused applications, concentrated liquidity strategies, TypeScript environments

#### ✅ Strengths
- **DLMM Specialized**: Optimized exclusively for Dynamic Liquidity Market Making
- **Advanced Features**: Sophisticated position management and strategy tools
- **Performance**: Faster than general TypeScript SDK for DLMM operations
- **TypeScript Native**: First-class TypeScript support with excellent types
- **Smaller Bundle**: Focused scope results in smaller JavaScript bundle
- **Active Development**: Frequent updates with latest DLMM features

#### ⚠️ Limitations
- **Limited Scope**: Only supports DLMM, no AMM/staking/farming
- **Newer SDK**: Smaller community and fewer third-party integrations
- **Learning Curve**: Requires understanding of concentrated liquidity concepts
- **Protocol Dependency**: Tightly coupled to DLMM protocol changes

#### 📊 Performance Benchmarks
```
DLMM Quote Generation: ~150ms
Bin Analysis: ~80ms
Position Creation: ~400ms
Bundle Size: ~800KB (gzipped)
Memory Usage: ~8MB (typical usage)
```

---

### 3. Rust DLMM SDK (saros-dlmm-sdk-rs)

**Best for**: High-frequency trading, backend services, performance-critical applications

#### ✅ Strengths
- **Maximum Performance**: Compiled Rust code for fastest execution
- **Memory Efficient**: Minimal memory footprint and zero-copy operations
- **Concurrent Operations**: Excellent support for parallel processing
- **Jupiter Integration**: Built-in DEX aggregation for optimal routing
- **Production Ready**: Battle-tested in high-volume trading environments
- **Low Latency**: Sub-100ms transaction preparation and execution

#### ⚠️ Limitations
- **Learning Curve**: Requires Rust knowledge or FFI bindings
- **Limited Scope**: DLMM-only, no support for other Saros protocols
- **Platform Specific**: Requires compilation for different architectures
- **Browser Incompatible**: Cannot run in browser environments
- **Setup Complexity**: More complex build and deployment process

#### 📊 Performance Benchmarks
```
DLMM Quote Generation: ~15ms
Bin Analysis: ~5ms
Position Creation: ~50ms
Memory Usage: ~2MB (typical usage)
Transaction Throughput: 1000+ TPS
```

## Decision Framework

Use this flowchart to choose the right SDK:

```
Start Here
    ↓
Do you need AMM, Staking, or Farming features?
    ├─ YES → Use TypeScript SDK
    └─ NO → Continue
        ↓
Is this a high-frequency or performance-critical application?
    ├─ YES → Use Rust DLMM SDK  
    └─ NO → Continue
        ↓
Do you prefer TypeScript and need DLMM features?
    ├─ YES → Use DLMM TypeScript SDK
    └─ NO → Use TypeScript SDK (most flexible)
```

## Platform Compatibility

### TypeScript SDK
- ✅ **Browsers**: Chrome, Firefox, Safari, Edge
- ✅ **Node.js**: v16+ (v18+ recommended)
- ✅ **React Native**: iOS and Android
- ✅ **Electron**: Desktop applications
- ✅ **Web Workers**: Background processing
- ✅ **Serverless**: Vercel, Netlify, AWS Lambda

### DLMM TypeScript SDK
- ✅ **Browsers**: Chrome, Firefox, Safari, Edge
- ✅ **Node.js**: v16+ (v18+ recommended)
- ✅ **React Native**: iOS and Android
- ✅ **Electron**: Desktop applications
- ✅ **Web Workers**: Background processing
- ✅ **Serverless**: Vercel, Netlify, AWS Lambda

### Rust DLMM SDK
- ✅ **Linux**: x86_64, ARM64
- ✅ **macOS**: Intel, Apple Silicon
- ✅ **Windows**: x86_64
- ❌ **Browsers**: Not compatible
- ❌ **Mobile**: Not directly compatible
- ✅ **Docker**: All platforms
- ✅ **Cloud**: AWS, GCP, Azure

## Getting Started with Your Choice

### TypeScript SDK Setup
```bash
npm install @saros-finance/sdk @solana/web3.js
```

```typescript
import { SarosSDK } from '@saros-finance/sdk';
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const sdk = new SarosSDK(connection);
```

### DLMM TypeScript SDK Setup
```bash
npm install @saros-finance/dlmm-sdk @solana/web3.js
```

```typescript
import { DLMMSDKv2 } from '@saros-finance/dlmm-sdk';
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const dlmm = new DLMMSDKv2(connection);
```

### Rust DLMM SDK Setup
```bash
cargo add saros-dlmm-sdk tokio
```

```rust
use saros_dlmm_sdk::DlmmClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = DlmmClient::new("https://api.mainnet-beta.solana.com").await?;
    Ok(())
}
```

## Summary Recommendations

### 🥇 For Most Projects: TypeScript SDK
- Complete feature set across all Saros protocols
- Excellent developer experience and ecosystem
- Good performance for most use cases
- Extensive documentation and community support

### 🥈 For DLMM Specialists: DLMM TypeScript SDK  
- Best-in-class DLMM features and performance
- Optimized bundle size and memory usage
- Advanced concentrated liquidity tools
- Future-proof with latest DLMM innovations

### 🥉 For Maximum Performance: Rust DLMM SDK
- Unmatched performance and efficiency
- Perfect for trading infrastructure
- Excellent for high-volume operations
- Requires Rust expertise but delivers exceptional results

Choose based on your specific requirements: feature breadth vs performance vs specialization. Most developers should start with the TypeScript SDK and migrate to specialized SDKs as their needs evolve.

## Need Help Deciding?

Still not sure which SDK is right for your project? 

- 💬 **Chat with our team**: [Developer Support Channel](https://t.me/+DLLPYFzvTzJmNTJh)
- 🔧 **Try them all**: Use our [API Explorer](/docs/api-explorer) to test different SDKs
- 📚 **See examples**: Check our [code examples](/docs/examples/basic-token-swap) for each SDK
- 📖 **Read tutorials**: Start with our [swap interface tutorial](/docs/tutorials/building-swap-interface)