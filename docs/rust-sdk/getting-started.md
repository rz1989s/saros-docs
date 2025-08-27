# Getting Started with Rust DLMM SDK

The Saros Rust DLMM SDK provides high-performance concentrated liquidity operations for Rust applications. Built for speed and efficiency, it's ideal for trading bots, arbitrage systems, and high-frequency applications.

## Prerequisites

- **Rust 1.70+**: Latest stable Rust toolchain
- **Solana CLI**: For account management and program deployment
- **Basic Knowledge**: Familiarity with Solana programming model and DLMM concepts

## Installation

Add the Saros Rust DLMM SDK to your `Cargo.toml`:

```toml
[dependencies]
saros-dlmm-sdk-rs = "0.1.0"
solana-sdk = "1.17"
anchor-client = "0.28"
jupiter-swap-api-client = "1.0"
tokio = { version = "1.0", features = ["full"] }
```

## Environment Setup

### 1. Rust Development Environment

```bash
# Install Rust if not already installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Verify installation
rustc --version
solana --version
```

### 2. Project Initialization

```bash
# Create new Rust project
cargo new saros-dlmm-bot
cd saros-dlmm-bot

# Add Saros dependencies
cargo add saros-dlmm-sdk-rs solana-sdk anchor-client jupiter-swap-api-client tokio
```

### 3. Configuration Setup

```rust
// src/config.rs
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct Config {
    pub rpc_url: String,
    pub wallet_keypair: Keypair,
    pub dlmm_program_id: Pubkey,
    pub jupiter_program_id: Pubkey,
}

impl Config {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Config {
            rpc_url: std::env::var("SOLANA_RPC_URL")
                .unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".to_string()),
            wallet_keypair: Keypair::new(), // Load from file in production
            dlmm_program_id: Pubkey::from_str("DLMMvvDL4xnZ7GmjeTgA8XWprEGnvDR6MrCHNYc3aaJh")?,
            jupiter_program_id: Pubkey::from_str("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4")?,
        })
    }
}
```

## Basic Usage

### 1. Initialize DLMM Client

```rust
// src/main.rs
use saros_dlmm_sdk_rs::{DlmmClient, DlmmPool, LiquidityPosition};
use solana_client::rpc_client::RpcClient;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::new()?;
    let rpc_client = Arc::new(RpcClient::new(&config.rpc_url));
    
    // Initialize DLMM client
    let dlmm_client = DlmmClient::new(
        rpc_client.clone(),
        &config.wallet_keypair,
        config.dlmm_program_id,
    )?;

    println!("DLMM client initialized successfully");
    Ok(())
}
```

### 2. Load and Inspect Pool

```rust
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;

async fn load_pool_example(
    dlmm_client: &DlmmClient,
) -> Result<(), Box<dyn std::error::Error>> {
    // SOL/USDC DLMM pool address (example)
    let pool_address = Pubkey::from_str("BLZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?;
    
    // Load pool data
    let pool = dlmm_client.load_pool(pool_address).await?;
    
    println!("Pool Details:");
    println!("  Token X: {}", pool.token_x_mint);
    println!("  Token Y: {}", pool.token_y_mint);
    println!("  Active Bin: {}", pool.active_id);
    println!("  Bin Step: {} basis points", pool.bin_step);
    println!("  Fee Rate: {}%", pool.fee_rate as f64 / 10000.0);
    
    // Get current price
    let current_price = pool.get_current_price()?;
    println!("  Current Price: {}", current_price);
    
    Ok(())
}
```

### 3. Create Simple Position

```rust
use saros_dlmm_sdk_rs::{BinRange, PositionParams, AmountDistribution};

async fn create_position_example(
    dlmm_client: &DlmmClient,
    pool_address: Pubkey,
) -> Result<LiquidityPosition, Box<dyn std::error::Error>> {
    let pool = dlmm_client.load_pool(pool_address).await?;
    let current_price = pool.get_current_price()?;
    
    // Define position range (±2% around current price)
    let range_percentage = 0.02;
    let lower_price = current_price * (1.0 - range_percentage);
    let upper_price = current_price * (1.0 + range_percentage);
    
    // Convert prices to bin IDs
    let lower_bin = pool.price_to_bin_id(lower_price)?;
    let upper_bin = pool.price_to_bin_id(upper_price)?;
    
    // Define liquidity amounts
    let position_params = PositionParams {
        bin_range: BinRange {
            lower_bin,
            upper_bin,
        },
        amount_x: 1_000_000, // 1 SOL (in lamports)
        amount_y: 100_000_000, // 100 USDC (in smallest units)
        distribution: AmountDistribution::Balanced,
    };
    
    // Create position
    let position = dlmm_client
        .create_position(pool_address, position_params)
        .await?;
    
    println!("Position created: {}", position.address);
    println!("  Lower Bin: {}", position.lower_bin);
    println!("  Upper Bin: {}", position.upper_bin);
    
    Ok(position)
}
```

### 4. Monitor Position and Collect Fees

```rust
async fn monitor_position_example(
    dlmm_client: &DlmmClient,
    position: &LiquidityPosition,
) -> Result<(), Box<dyn std::error::Error>> {
    // Fetch latest position state
    let updated_position = dlmm_client
        .refresh_position(&position.address)
        .await?;
    
    println!("Position Status:");
    println!("  Liquidity X: {}", updated_position.liquidity_x);
    println!("  Liquidity Y: {}", updated_position.liquidity_y);
    
    // Check accumulated fees
    let fees = dlmm_client
        .get_position_fees(&position.address)
        .await?;
    
    println!("Accumulated Fees:");
    println!("  Token X Fees: {}", fees.fee_x);
    println!("  Token Y Fees: {}", fees.fee_y);
    
    // Collect fees if substantial
    if fees.fee_x > 10_000 || fees.fee_y > 10_000 {
        let collect_result = dlmm_client
            .collect_fees(&position.address)
            .await?;
        
        println!("Fees collected: {}", collect_result.signature);
    }
    
    Ok(())
}
```

## Performance Considerations

### Memory Management

The Rust SDK is designed for high-performance applications:

```rust
// Efficient batch operations
async fn batch_operations_example(
    dlmm_client: &DlmmClient,
) -> Result<(), Box<dyn std::error::Error>> {
    let pool_addresses = vec![
        Pubkey::from_str("pool1...")?,
        Pubkey::from_str("pool2...")?,
        Pubkey::from_str("pool3...")?,
    ];
    
    // Batch load pools (more efficient than individual loads)
    let pools = dlmm_client
        .load_pools_batch(&pool_addresses)
        .await?;
    
    // Process all pools efficiently
    for pool in pools {
        let price = pool.get_current_price()?;
        println!("Pool {} price: {}", pool.address, price);
    }
    
    Ok(())
}
```

### Connection Pooling

```rust
use solana_client::{
    rpc_client::RpcClient,
    client_error::Result as ClientResult,
};
use std::sync::Arc;

pub struct HighPerformanceClient {
    rpc_clients: Vec<Arc<RpcClient>>,
    current_client: std::sync::atomic::AtomicUsize,
}

impl HighPerformanceClient {
    pub fn new(rpc_urls: Vec<String>) -> Self {
        let clients = rpc_urls
            .into_iter()
            .map(|url| Arc::new(RpcClient::new(url)))
            .collect();
            
        Self {
            rpc_clients: clients,
            current_client: std::sync::atomic::AtomicUsize::new(0),
        }
    }
    
    pub fn get_client(&self) -> Arc<RpcClient> {
        let index = self.current_client.load(std::sync::atomic::Ordering::Relaxed);
        let next_index = (index + 1) % self.rpc_clients.len();
        self.current_client.store(next_index, std::sync::atomic::Ordering::Relaxed);
        
        self.rpc_clients[index].clone()
    }
}
```

## Error Handling

```rust
use saros_dlmm_sdk_rs::error::{DlmmError, DlmmResult};

async fn robust_trading_example(
    dlmm_client: &DlmmClient,
    pool_address: Pubkey,
) -> DlmmResult<()> {
    match dlmm_client.load_pool(pool_address).await {
        Ok(pool) => {
            // Successful pool load
            println!("Pool loaded: {}", pool.address);
        },
        Err(DlmmError::PoolNotFound) => {
            eprintln!("Pool not found at address: {}", pool_address);
            return Err(DlmmError::PoolNotFound);
        },
        Err(DlmmError::InsufficientLiquidity) => {
            eprintln!("Pool has insufficient liquidity");
            return Err(DlmmError::InsufficientLiquidity);
        },
        Err(DlmmError::RpcError(e)) => {
            eprintln!("RPC connection error: {}", e);
            return Err(DlmmError::RpcError(e));
        },
        Err(e) => {
            eprintln!("Unexpected error: {:?}", e);
            return Err(e);
        }
    }
    
    Ok(())
}
```

## Testing Setup

```rust
// tests/integration_test.rs
use saros_dlmm_sdk_rs::*;
use solana_sdk::signature::{Keypair, Signer};
use std::sync::Arc;

#[tokio::test]
async fn test_pool_loading() {
    let config = test_config();
    let rpc_client = Arc::new(RpcClient::new(&config.rpc_url));
    let wallet = Keypair::new();
    
    let dlmm_client = DlmmClient::new(
        rpc_client,
        &wallet,
        config.dlmm_program_id,
    ).expect("Failed to create DLMM client");
    
    // Test with known pool address
    let pool_address = Pubkey::from_str("test-pool-address").unwrap();
    let result = dlmm_client.load_pool(pool_address).await;
    
    assert!(result.is_ok());
}

fn test_config() -> Config {
    Config {
        rpc_url: "https://api.devnet.solana.com".to_string(),
        wallet_keypair: Keypair::new(),
        dlmm_program_id: Pubkey::from_str("DLMMvvDL4xnZ7GmjeTgA8XWprEGnvDR6MrCHNYc3aaJh").unwrap(),
        jupiter_program_id: Pubkey::from_str("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4").unwrap(),
    }
}
```

## Next Steps

1. **[Jupiter Integration](/docs/rust-sdk/jupiter-integration)** - Integrate with Jupiter for enhanced routing
2. **[AMM Trait Implementation](/docs/rust-sdk/amm-trait)** - Implement custom AMM strategies
3. **[Examples](/docs/rust-sdk/examples)** - Working code examples and patterns
4. **[API Reference](/docs/rust-sdk/api-reference)** - Complete API documentation

## Common Patterns

### Async/Await Usage

```rust
// Always use async/await for network operations
async fn trading_loop() -> DlmmResult<()> {
    loop {
        tokio::select! {
            _ = tokio::time::sleep(Duration::from_secs(1)) => {
                // Update positions every second
            }
            result = monitor_positions() => {
                match result {
                    Ok(_) => continue,
                    Err(e) => {
                        eprintln!("Error monitoring positions: {:?}", e);
                        tokio::time::sleep(Duration::from_secs(5)).await;
                    }
                }
            }
        }
    }
}
```

### Resource Management

```rust
// Use RAII patterns for cleanup
pub struct PositionManager {
    positions: Vec<LiquidityPosition>,
    dlmm_client: Arc<DlmmClient>,
}

impl Drop for PositionManager {
    fn drop(&mut self) {
        // Cleanup resources
        println!("Cleaning up {} positions", self.positions.len());
    }
}
```

You're now ready to start building with the Saros Rust DLMM SDK! The Rust SDK provides the performance and control needed for sophisticated DeFi applications on Solana.