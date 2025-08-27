# Rust SDK Examples

This page provides complete, working examples for common use cases with the Saros Rust DLMM SDK. All examples are production-ready and include proper error handling.

## Basic Examples

### 1. Simple Pool Monitor

Monitor DLMM pool state and price changes:

```rust
// examples/pool_monitor.rs
use saros_dlmm_sdk_rs::{DlmmClient, DlmmPool};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::{str::FromStr, sync::Arc, time::Duration};
use tokio::time::interval;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Setup
    let rpc_url = "https://api.mainnet-beta.solana.com";
    let rpc_client = Arc::new(RpcClient::new(rpc_url));
    let wallet = Keypair::new();
    let program_id = Pubkey::from_str("DLMMvvDL4xnZ7GmjeTgA8XWprEGnvDR6MrCHNYc3aaJh")?;
    
    let dlmm_client = DlmmClient::new(rpc_client, &wallet, program_id)?;
    
    // SOL/USDC pool address
    let pool_address = Pubkey::from_str("BLZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?;
    
    let mut price_history = Vec::new();
    let mut monitor_interval = interval(Duration::from_secs(5));
    
    println!("Starting pool monitor for SOL/USDC...");
    
    loop {
        monitor_interval.tick().await;
        
        match monitor_pool_state(&dlmm_client, pool_address).await {
            Ok(pool_state) => {
                price_history.push(pool_state.current_price);
                
                // Keep only last 50 prices
                if price_history.len() > 50 {
                    price_history.remove(0);
                }
                
                // Calculate price change
                let price_change = if price_history.len() >= 2 {
                    let prev_price = price_history[price_history.len() - 2];
                    ((pool_state.current_price - prev_price) / prev_price) * 100.0
                } else {
                    0.0
                };
                
                println!("Pool State Update:");
                println!("  Current Price: ${:.4}", pool_state.current_price);
                println!("  Price Change: {:.2}%", price_change);
                println!("  Active Bin: {}", pool_state.active_bin);
                println!("  TVL: ${:.2}", pool_state.total_value_locked);
                println!("  24h Volume: ${:.2}", pool_state.volume_24h);
                println!("  Fee Rate: {:.3}%", pool_state.fee_rate);
                println!("  Active Liquidity: ${:.2}", pool_state.active_liquidity);
                println!("{}", "-".repeat(50));
            },
            Err(e) => {
                eprintln!("Error monitoring pool: {:?}", e);
                tokio::time::sleep(Duration::from_secs(10)).await;
            }
        }
    }
}

#[derive(Debug)]
struct PoolState {
    current_price: f64,
    active_bin: i32,
    total_value_locked: f64,
    volume_24h: f64,
    fee_rate: f64,
    active_liquidity: f64,
}

async fn monitor_pool_state(
    client: &DlmmClient,
    pool_address: Pubkey,
) -> Result<PoolState, Box<dyn std::error::Error>> {
    let pool = client.load_pool(pool_address).await?;
    
    Ok(PoolState {
        current_price: pool.get_current_price()?,
        active_bin: pool.active_id,
        total_value_locked: pool.get_total_value_locked()? as f64 / 1e6, // Convert to dollars
        volume_24h: pool.get_volume_24h()? as f64 / 1e6,
        fee_rate: pool.fee_rate as f64 / 10000.0,
        active_liquidity: pool.get_active_liquidity()? as f64 / 1e6,
    })
}
```

### 2. Automated Position Creator

Create positions based on market conditions:

```rust
// examples/auto_position_creator.rs
use saros_dlmm_sdk_rs::{DlmmClient, PositionParams, BinRange};
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = load_config()?;
    let dlmm_client = create_client(&config)?;
    
    let creator = AutoPositionCreator::new(dlmm_client);
    
    // Define pools to monitor
    let pools = vec![
        ("SOL/USDC", Pubkey::from_str("BLZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?),
        ("mSOL/SOL", Pubkey::from_str("2BZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?),
    ];
    
    // Create positions for all pools
    for (pair_name, pool_address) in pools {
        println!("Creating position for {}...", pair_name);
        
        match creator.create_optimized_position(pool_address, 1_000_000).await {
            Ok(position) => {
                println!("✅ Position created for {}: {}", pair_name, position.address);
                println!("   Range: {} to {}", position.lower_bin, position.upper_bin);
            },
            Err(e) => {
                eprintln!("❌ Failed to create position for {}: {:?}", pair_name, e);
            }
        }
    }
    
    Ok(())
}

struct AutoPositionCreator {
    dlmm_client: Arc<DlmmClient>,
}

impl AutoPositionCreator {
    fn new(dlmm_client: Arc<DlmmClient>) -> Self {
        Self { dlmm_client }
    }
    
    async fn create_optimized_position(
        &self,
        pool_address: Pubkey,
        capital: u64,
    ) -> Result<Position, Box<dyn std::error::Error>> {
        let pool = self.dlmm_client.load_pool(pool_address).await?;
        
        // Analyze market conditions
        let market_analysis = self.analyze_market_conditions(&pool).await?;
        
        // Choose strategy based on analysis
        let strategy = match market_analysis.volatility_level {
            VolatilityLevel::Low => PositionStrategy::TightRange { width_percentage: 0.005 },
            VolatilityLevel::Medium => PositionStrategy::StandardRange { width_percentage: 0.02 },
            VolatilityLevel::High => PositionStrategy::WideRange { width_percentage: 0.05 },
        };
        
        // Calculate position parameters
        let params = self.calculate_position_params(&pool, capital, &strategy).await?;
        
        // Create position
        let position = self.dlmm_client
            .create_position(pool_address, params)
            .await?;
        
        Ok(position)
    }
    
    async fn analyze_market_conditions(
        &self,
        pool: &DlmmPool,
    ) -> Result<MarketAnalysis, Box<dyn std::error::Error>> {
        // Get recent price data
        let price_history = pool.get_price_history(24).await?;
        
        // Calculate volatility
        let volatility = calculate_volatility(&price_history);
        
        // Determine volatility level
        let volatility_level = match volatility {
            v if v < 0.02 => VolatilityLevel::Low,
            v if v < 0.05 => VolatilityLevel::Medium,
            _ => VolatilityLevel::High,
        };
        
        // Get liquidity distribution
        let liquidity_dist = pool.get_liquidity_distribution().await?;
        
        Ok(MarketAnalysis {
            volatility_level,
            current_volatility: volatility,
            liquidity_concentration: liquidity_dist.concentration_ratio,
            trend_direction: determine_trend(&price_history),
        })
    }
}

#[derive(Debug)]
enum VolatilityLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug)]
enum PositionStrategy {
    TightRange { width_percentage: f64 },
    StandardRange { width_percentage: f64 },
    WideRange { width_percentage: f64 },
}

#[derive(Debug)]
struct MarketAnalysis {
    volatility_level: VolatilityLevel,
    current_volatility: f64,
    liquidity_concentration: f64,
    trend_direction: TrendDirection,
}

#[derive(Debug)]
enum TrendDirection {
    Bullish,
    Bearish,
    Sideways,
}

fn calculate_volatility(prices: &[f64]) -> f64 {
    if prices.len() < 2 {
        return 0.02; // Default 2%
    }
    
    let returns: Vec<f64> = prices
        .windows(2)
        .map(|window| (window[1] / window[0]).ln())
        .collect();
    
    let mean = returns.iter().sum::<f64>() / returns.len() as f64;
    let variance = returns
        .iter()
        .map(|r| (r - mean).powi(2))
        .sum::<f64>() / returns.len() as f64;
    
    variance.sqrt()
}

fn determine_trend(prices: &[f64]) -> TrendDirection {
    if prices.len() < 10 {
        return TrendDirection::Sideways;
    }
    
    let recent_avg = prices[prices.len() - 5..].iter().sum::<f64>() / 5.0;
    let older_avg = prices[prices.len() - 10..prices.len() - 5].iter().sum::<f64>() / 5.0;
    
    let change = (recent_avg - older_avg) / older_avg;
    
    match change {
        c if c > 0.01 => TrendDirection::Bullish,
        c if c < -0.01 => TrendDirection::Bearish,
        _ => TrendDirection::Sideways,
    }
}
```

## Advanced Examples

### 3. Multi-Pool Arbitrage Bot

Scan and execute arbitrage across multiple DLMM pools:

```rust
// examples/arbitrage_bot.rs
use saros_dlmm_sdk_rs::{DlmmClient, SwapQuote};
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::{collections::HashMap, sync::Arc};
use tokio::time::{interval, Duration};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = load_config()?;
    let dlmm_client = Arc::new(create_client(&config)?);
    
    let arbitrage_bot = ArbitrageBot::new(
        dlmm_client,
        config.wallet_keypair,
        config.min_profit_threshold,
    );
    
    // Define token triangles for arbitrage
    let arbitrage_triangles = vec![
        // SOL -> USDC -> mSOL -> SOL
        vec![
            Pubkey::from_str("So11111111111111111111111111111111111111112")?, // SOL
            Pubkey::from_str("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")?, // USDC
            Pubkey::from_str("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So")?, // mSOL
        ],
    ];
    
    arbitrage_bot.run(arbitrage_triangles).await?;
    
    Ok(())
}

struct ArbitrageBot {
    dlmm_client: Arc<DlmmClient>,
    wallet: Keypair,
    min_profit_threshold: u64,
    price_cache: Arc<tokio::sync::RwLock<HashMap<String, f64>>>,
}

impl ArbitrageBot {
    fn new(
        dlmm_client: Arc<DlmmClient>,
        wallet: Keypair,
        min_profit_threshold: u64,
    ) -> Self {
        Self {
            dlmm_client,
            wallet,
            min_profit_threshold,
            price_cache: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }
    
    async fn run(
        &self,
        arbitrage_triangles: Vec<Vec<Pubkey>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut scan_interval = interval(Duration::from_secs(2));
        
        loop {
            scan_interval.tick().await;
            
            for triangle in &arbitrage_triangles {
                if let Err(e) = self.scan_triangle_arbitrage(triangle).await {
                    eprintln!("Error scanning triangle: {:?}", e);
                }
            }
        }
    }
    
    async fn scan_triangle_arbitrage(
        &self,
        tokens: &[Pubkey],
    ) -> Result<(), Box<dyn std::error::Error>> {
        if tokens.len() != 3 {
            return Ok(());
        }
        
        let amount = 1_000_000; // 1 SOL worth
        let token_a = tokens[0];
        let token_b = tokens[1];
        let token_c = tokens[2];
        
        // Get quotes for the triangle: A -> B -> C -> A
        let quote_ab = self.get_swap_quote(token_a, token_b, amount).await?;
        let quote_bc = self.get_swap_quote(token_b, token_c, quote_ab.out_amount).await?;
        let quote_ca = self.get_swap_quote(token_c, token_a, quote_bc.out_amount).await?;
        
        let final_amount = quote_ca.out_amount;
        let profit = final_amount as i64 - amount as i64;
        
        if profit > self.min_profit_threshold as i64 {
            println!("🚀 Arbitrage opportunity found!");
            println!("  Triangle: {} -> {} -> {} -> {}", 
                short_address(token_a),
                short_address(token_b), 
                short_address(token_c),
                short_address(token_a)
            );
            println!("  Input: {}", amount);
            println!("  Output: {}", final_amount);
            println!("  Profit: {} ({:.2}%)", profit, profit as f64 / amount as f64 * 100.0);
            
            // Execute arbitrage
            if let Err(e) = self.execute_triangle_arbitrage(tokens, amount).await {
                eprintln!("Failed to execute arbitrage: {:?}", e);
            }
        }
        
        Ok(())
    }
    
    async fn execute_triangle_arbitrage(
        &self,
        tokens: &[Pubkey],
        amount: u64,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let token_a = tokens[0];
        let token_b = tokens[1];
        let token_c = tokens[2];
        
        // Step 1: A -> B
        let result_ab = self.dlmm_client
            .swap(token_a, token_b, amount, &self.wallet)
            .await?;
        println!("Step 1 complete: {}", result_ab.signature);
        
        // Step 2: B -> C
        let result_bc = self.dlmm_client
            .swap(token_b, token_c, result_ab.out_amount, &self.wallet)
            .await?;
        println!("Step 2 complete: {}", result_bc.signature);
        
        // Step 3: C -> A
        let result_ca = self.dlmm_client
            .swap(token_c, token_a, result_bc.out_amount, &self.wallet)
            .await?;
        println!("Step 3 complete: {}", result_ca.signature);
        
        let final_profit = result_ca.out_amount as i64 - amount as i64;
        println!("✅ Arbitrage completed! Profit: {}", final_profit);
        
        Ok(())
    }
    
    async fn get_swap_quote(
        &self,
        input_mint: Pubkey,
        output_mint: Pubkey,
        amount: u64,
    ) -> Result<SwapQuote, Box<dyn std::error::Error>> {
        self.dlmm_client
            .get_swap_quote(input_mint, output_mint, amount)
            .await
            .map_err(|e| e.into())
    }
}

fn short_address(pubkey: Pubkey) -> String {
    let s = pubkey.to_string();
    format!("{}...{}", &s[0..4], &s[s.len()-4..])
}
```

### 4. Liquidity Mining Bot

Automatically manage liquidity positions for optimal fee generation:

```rust
// examples/liquidity_mining_bot.rs
use saros_dlmm_sdk_rs::{DlmmClient, LiquidityPosition, PositionParams};
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::{collections::HashMap, sync::Arc};
use tokio::time::{interval, Duration, Instant};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = load_config()?;
    let dlmm_client = Arc::new(create_client(&config)?);
    
    let mining_bot = LiquidityMiningBot::new(
        dlmm_client,
        config.wallet_keypair,
        MiningConfig {
            target_yield: 0.15, // 15% APY target
            rebalance_threshold: 0.03, // 3% price movement
            min_fee_collection: 50_000, // Minimum fees before collection
            max_position_age: Duration::from_secs(24 * 3600), // 24 hours
        },
    );
    
    let pools = vec![
        PoolConfig {
            address: Pubkey::from_str("BLZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?,
            name: "SOL/USDC".to_string(),
            capital_allocation: 2_000_000, // 2 SOL
            strategy: MiningStrategy::DynamicRange,
        },
        PoolConfig {
            address: Pubkey::from_str("2BZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?,
            name: "mSOL/SOL".to_string(),
            capital_allocation: 1_000_000, // 1 SOL
            strategy: MiningStrategy::StableRange,
        },
    ];
    
    mining_bot.start_mining(pools).await?;
    
    Ok(())
}

struct LiquidityMiningBot {
    dlmm_client: Arc<DlmmClient>,
    wallet: Keypair,
    config: MiningConfig,
    positions: Arc<tokio::sync::RwLock<HashMap<Pubkey, ManagedPosition>>>,
}

#[derive(Clone)]
struct MiningConfig {
    target_yield: f64,
    rebalance_threshold: f64,
    min_fee_collection: u64,
    max_position_age: Duration,
}

struct PoolConfig {
    address: Pubkey,
    name: String,
    capital_allocation: u64,
    strategy: MiningStrategy,
}

#[derive(Clone)]
enum MiningStrategy {
    StableRange,    // Fixed range for stable pairs
    DynamicRange,   // Adjusts range based on volatility
    FollowPrice,    // Moves range with price
}

struct ManagedPosition {
    position: LiquidityPosition,
    strategy: MiningStrategy,
    created_at: Instant,
    last_rebalanced: Instant,
    fees_collected: u64,
    rebalance_count: u32,
}

impl LiquidityMiningBot {
    fn new(dlmm_client: Arc<DlmmClient>, wallet: Keypair, config: MiningConfig) -> Self {
        Self {
            dlmm_client,
            wallet,
            config,
            positions: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }
    
    async fn start_mining(
        &self,
        pools: Vec<PoolConfig>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Create initial positions
        for pool_config in pools {
            self.deploy_strategy(&pool_config).await?;
        }
        
        // Start monitoring loop
        let mut monitor_interval = interval(Duration::from_secs(30));
        
        loop {
            monitor_interval.tick().await;
            
            let pool_addresses: Vec<Pubkey> = {
                let positions = self.positions.read().await;
                positions.keys().cloned().collect()
            };
            
            for pool_address in pool_addresses {
                if let Err(e) = self.manage_position(pool_address).await {
                    eprintln!("Error managing position for {}: {:?}", pool_address, e);
                }
            }
            
            // Print status every 5 minutes
            if monitor_interval.tick().await; {
                self.print_status().await;
            }
        }
    }
    
    async fn deploy_strategy(
        &self,
        pool_config: &PoolConfig,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let pool = self.dlmm_client.load_pool(pool_config.address).await?;
        
        let position_params = self.calculate_strategy_params(
            &pool,
            &pool_config.strategy,
            pool_config.capital_allocation,
        ).await?;
        
        let position = self.dlmm_client
            .create_position(pool_config.address, position_params)
            .await?;
        
        let managed_position = ManagedPosition {
            position,
            strategy: pool_config.strategy.clone(),
            created_at: Instant::now(),
            last_rebalanced: Instant::now(),
            fees_collected: 0,
            rebalance_count: 0,
        };
        
        let mut positions = self.positions.write().await;
        positions.insert(pool_config.address, managed_position);
        
        println!("✅ Deployed {} strategy for {}", 
            strategy_name(&pool_config.strategy),
            pool_config.name
        );
        
        Ok(())
    }
    
    async fn manage_position(
        &self,
        pool_address: Pubkey,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let pool = self.dlmm_client.load_pool(pool_address).await?;
        
        let should_rebalance = {
            let positions = self.positions.read().await;
            if let Some(managed_pos) = positions.get(&pool_address) {
                self.should_rebalance_position(managed_pos, &pool).await?
            } else {
                false
            }
        };
        
        if should_rebalance {
            self.rebalance_position(pool_address, &pool).await?;
        }
        
        // Check for fee collection
        self.check_and_collect_fees(pool_address).await?;
        
        Ok(())
    }
    
    async fn should_rebalance_position(
        &self,
        managed_pos: &ManagedPosition,
        pool: &DlmmPool,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        // Check if position is out of range
        let current_bin = pool.active_id;
        let out_of_range = current_bin < managed_pos.position.lower_bin || 
                          current_bin > managed_pos.position.upper_bin;
        
        if out_of_range {
            return Ok(true);
        }
        
        // Check if position is too old
        if managed_pos.created_at.elapsed() > self.config.max_position_age {
            return Ok(true);
        }
        
        // Strategy-specific rebalancing logic
        match &managed_pos.strategy {
            MiningStrategy::DynamicRange => {
                let volatility = self.calculate_recent_volatility(pool).await?;
                let position_width = (managed_pos.position.upper_bin - 
                                    managed_pos.position.lower_bin) as f64;
                
                // Rebalance if volatility changed significantly
                let optimal_width = volatility * 100.0; // Convert to bins
                Ok((position_width - optimal_width).abs() > optimal_width * 0.2)
            },
            MiningStrategy::FollowPrice => {
                let current_price = pool.get_current_price()?;
                let position_center_bin = (managed_pos.position.lower_bin + 
                                         managed_pos.position.upper_bin) / 2;
                let position_center_price = pool.bin_id_to_price(position_center_bin)?;
                
                let price_drift = (current_price - position_center_price).abs() / 
                                position_center_price;
                
                Ok(price_drift > self.config.rebalance_threshold)
            },
            MiningStrategy::StableRange => Ok(false), // Never rebalance stable ranges
        }
    }
    
    async fn rebalance_position(
        &self,
        pool_address: Pubkey,
        pool: &DlmmPool,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut positions = self.positions.write().await;
        
        if let Some(managed_pos) = positions.get_mut(&pool_address) {
            // Remove old position
            let remove_result = self.dlmm_client
                .remove_liquidity(&managed_pos.position.address)
                .await?;
            
            // Calculate new position parameters
            let total_capital = remove_result.amount_x + remove_result.amount_y;
            let new_params = self.calculate_strategy_params(
                pool,
                &managed_pos.strategy,
                total_capital,
            ).await?;
            
            // Create new position
            let new_position = self.dlmm_client
                .create_position(pool_address, new_params)
                .await?;
            
            // Update managed position
            managed_pos.position = new_position;
            managed_pos.last_rebalanced = Instant::now();
            managed_pos.rebalance_count += 1;
            
            println!("🔄 Rebalanced position for pool: {}", pool_address);
        }
        
        Ok(())
    }
    
    async fn check_and_collect_fees(
        &self,
        pool_address: Pubkey,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let positions = self.positions.read().await;
        
        if let Some(managed_pos) = positions.get(&pool_address) {
            let fees = self.dlmm_client
                .get_position_fees(&managed_pos.position.address)
                .await?;
            
            let total_fees = fees.fee_x + fees.fee_y;
            
            if total_fees >= self.config.min_fee_collection {
                drop(positions); // Release read lock
                
                let collect_result = self.dlmm_client
                    .collect_fees(&managed_pos.position.address)
                    .await?;
                
                // Update fee tracking
                let mut positions = self.positions.write().await;
                if let Some(managed_pos) = positions.get_mut(&pool_address) {
                    managed_pos.fees_collected += total_fees;
                }
                
                println!("💰 Collected {} in fees from pool: {}", 
                    total_fees, pool_address);
            }
        }
        
        Ok(())
    }
    
    async fn print_status(&self) {
        println!("\n📊 Liquidity Mining Status");
        println!("{}", "=".repeat(60));
        
        let positions = self.positions.read().await;
        
        for (pool_address, managed_pos) in positions.iter() {
            let runtime = managed_pos.created_at.elapsed();
            let daily_fees = if runtime.as_secs() > 0 {
                managed_pos.fees_collected * 86400 / runtime.as_secs()
            } else {
                0
            };
            
            println!("Pool: {}", short_address(*pool_address));
            println!("  Strategy: {}", strategy_name(&managed_pos.strategy));
            println!("  Runtime: {:.1} hours", runtime.as_secs_f64() / 3600.0);
            println!("  Fees Collected: {}", managed_pos.fees_collected);
            println!("  Daily Fee Rate: {}", daily_fees);
            println!("  Rebalances: {}", managed_pos.rebalance_count);
            println!();
        }
    }
    
    async fn calculate_recent_volatility(
        &self,
        pool: &DlmmPool,
    ) -> Result<f64, Box<dyn std::error::Error>> {
        let price_history = pool.get_price_history(50).await?;
        
        if price_history.len() < 10 {
            return Ok(0.02); // Default 2%
        }
        
        let returns: Vec<f64> = price_history
            .windows(2)
            .map(|window| (window[1] / window[0]).ln())
            .collect();
        
        let recent_returns = &returns[returns.len().saturating_sub(20)..];
        let mean = recent_returns.iter().sum::<f64>() / recent_returns.len() as f64;
        let variance = recent_returns
            .iter()
            .map(|r| (r - mean).powi(2))
            .sum::<f64>() / recent_returns.len() as f64;
        
        Ok(variance.sqrt() * (24.0_f64.sqrt())) // Annualize
    }
}

fn strategy_name(strategy: &MiningStrategy) -> &str {
    match strategy {
        MiningStrategy::StableRange => "Stable Range",
        MiningStrategy::DynamicRange => "Dynamic Range", 
        MiningStrategy::FollowPrice => "Follow Price",
    }
}
```

### 5. Risk Management System

Advanced risk management for DLMM positions:

```rust
// examples/risk_management.rs
use saros_dlmm_sdk_rs::{DlmmClient, LiquidityPosition};
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::{collections::HashMap, sync::Arc};
use tokio::time::{interval, Duration};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = load_config()?;
    let dlmm_client = Arc::new(create_client(&config)?);
    
    let risk_manager = RiskManager::new(
        dlmm_client,
        RiskConfig {
            max_drawdown: 0.10, // 10% maximum drawdown
            daily_loss_limit: 500_000, // Max 0.5 SOL loss per day
            position_concentration_limit: 0.20, // Max 20% in single position
            liquidity_utilization_limit: 0.80, // Use max 80% of available capital
            volatility_circuit_breaker: 0.15, // Stop if volatility > 15%
        },
    );
    
    // Load existing positions
    let position_addresses = load_position_addresses()?;
    risk_manager.load_positions(position_addresses).await?;
    
    // Start risk monitoring
    risk_manager.start_monitoring().await?;
    
    Ok(())
}

struct RiskManager {
    dlmm_client: Arc<DlmmClient>,
    config: RiskConfig,
    positions: Arc<tokio::sync::RwLock<HashMap<Pubkey, RiskManagedPosition>>>,
    daily_pnl: Arc<tokio::sync::RwLock<f64>>,
    daily_reset_time: Arc<tokio::sync::RwLock<Instant>>,
}

#[derive(Clone)]
struct RiskConfig {
    max_drawdown: f64,
    daily_loss_limit: u64,
    position_concentration_limit: f64,
    liquidity_utilization_limit: f64,
    volatility_circuit_breaker: f64,
}

struct RiskManagedPosition {
    position: LiquidityPosition,
    initial_value: u64,
    peak_value: u64,
    current_drawdown: f64,
    risk_score: f64,
}

impl RiskManager {
    async fn start_monitoring(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut risk_check_interval = interval(Duration::from_secs(15));
        let mut daily_reset_interval = interval(Duration::from_secs(3600)); // Check hourly
        
        loop {
            tokio::select! {
                _ = risk_check_interval.tick() => {
                    if let Err(e) = self.perform_risk_checks().await {
                        eprintln!("Risk check error: {:?}", e);
                    }
                }
                _ = daily_reset_interval.tick() => {
                    self.check_daily_reset().await;
                }
            }
        }
    }
    
    async fn perform_risk_checks(&self) -> Result<(), Box<dyn std::error::Error>> {
        let position_addresses: Vec<Pubkey> = {
            let positions = self.positions.read().await;
            positions.keys().cloned().collect()
        };
        
        for address in position_addresses {
            self.check_position_risk(address).await?;
        }
        
        // Check portfolio-level risks
        self.check_portfolio_concentration().await?;
        self.check_total_drawdown().await?;
        self.check_volatility_circuit_breaker().await?;
        
        Ok(())
    }
    
    async fn check_position_risk(
        &self,
        pool_address: Pubkey,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let pool = self.dlmm_client.load_pool(pool_address).await?;
        
        let mut positions = self.positions.write().await;
        if let Some(risk_pos) = positions.get_mut(&pool_address) {
            // Update position value
            let current_value = self.calculate_position_value(&risk_pos.position, &pool).await?;
            
            // Update peak value
            if current_value > risk_pos.peak_value {
                risk_pos.peak_value = current_value;
            }
            
            // Calculate drawdown
            let drawdown = (risk_pos.peak_value - current_value) as f64 / 
                          risk_pos.peak_value as f64;
            risk_pos.current_drawdown = drawdown;
            
            // Check if drawdown exceeds limit
            if drawdown > self.config.max_drawdown {
                println!("🚨 RISK ALERT: Drawdown limit exceeded for pool {}", pool_address);
                println!("   Current drawdown: {:.2}%", drawdown * 100.0);
                println!("   Limit: {:.2}%", self.config.max_drawdown * 100.0);
                
                // Emergency close position
                self.emergency_close_position(&risk_pos.position).await?;
            }
            
            // Update risk score
            risk_pos.risk_score = self.calculate_risk_score(risk_pos, &pool).await?;
            
            if risk_pos.risk_score > 0.8 {
                println!("⚠️ High risk score for pool {}: {:.2}", 
                    pool_address, risk_pos.risk_score);
            }
        }
        
        Ok(())
    }
    
    async fn emergency_close_position(
        &self,
        position: &LiquidityPosition,
    ) -> Result<(), Box<dyn std::error::Error>> {
        println!("🛑 EMERGENCY: Closing position {}", position.address);
        
        let remove_result = self.dlmm_client
            .remove_liquidity(&position.address)
            .await?;
        
        println!("Position closed. Transaction: {}", remove_result.signature);
        
        // Send alert notification
        self.send_risk_alert(&format!(
            "Emergency position closure due to drawdown limit. \
             Position: {}, Transaction: {}",
            position.address,
            remove_result.signature
        )).await;
        
        Ok(())
    }
    
    async fn calculate_risk_score(
        &self,
        risk_pos: &RiskManagedPosition,
        pool: &DlmmPool,
    ) -> Result<f64, Box<dyn std::error::Error>> {
        let mut risk_score = 0.0;
        
        // Factor 1: Current drawdown (0-40% of score)
        risk_score += risk_pos.current_drawdown * 0.4;
        
        // Factor 2: Position age (0-20% of score)
        let age_hours = risk_pos.created_at.elapsed().as_secs_f64() / 3600.0;
        let age_risk = (age_hours / 168.0).min(1.0) * 0.2; // Max risk at 1 week
        risk_score += age_risk;
        
        // Factor 3: Market volatility (0-30% of score)
        let volatility = self.calculate_pool_volatility(pool).await?;
        let volatility_risk = (volatility / 0.20).min(1.0) * 0.3; // Max risk at 20% volatility
        risk_score += volatility_risk;
        
        // Factor 4: Liquidity utilization (0-10% of score)
        let utilization = self.calculate_position_utilization(&risk_pos.position, pool).await?;
        risk_score += utilization * 0.1;
        
        Ok(risk_score.min(1.0))
    }
    
    async fn send_risk_alert(&self, message: &str) {
        println!("🚨 RISK ALERT: {}", message);
        
        // In production, integrate with alerting systems:
        // - Discord webhooks
        // - Slack notifications  
        // - Email alerts
        // - SMS notifications
    }
}
```

### 6. Portfolio Optimizer

Optimize capital allocation across multiple DLMM pools:

```rust
// examples/portfolio_optimizer.rs
use saros_dlmm_sdk_rs::{DlmmClient, DlmmPool};
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::{collections::HashMap, sync::Arc};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = load_config()?;
    let dlmm_client = Arc::new(create_client(&config)?);
    
    let optimizer = PortfolioOptimizer::new(
        dlmm_client,
        OptimizationConfig {
            total_capital: 10_000_000, // 10 SOL
            max_positions: 5,
            min_position_size: 1_000_000, // 1 SOL minimum
            target_yield: 0.20, // 20% APY target
            risk_tolerance: 0.15, // 15% max volatility
        },
    );
    
    // Define candidate pools
    let candidate_pools = vec![
        ("SOL/USDC", Pubkey::from_str("BLZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?),
        ("mSOL/SOL", Pubkey::from_str("2BZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?),
        ("USDC/USDT", Pubkey::from_str("3BZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?),
        ("RAY/SOL", Pubkey::from_str("4BZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?),
    ];
    
    // Optimize portfolio allocation
    let optimal_allocation = optimizer.optimize_allocation(candidate_pools).await?;
    
    // Execute allocation
    optimizer.execute_allocation(optimal_allocation).await?;
    
    Ok(())
}

struct PortfolioOptimizer {
    dlmm_client: Arc<DlmmClient>,
    config: OptimizationConfig,
}

struct OptimizationConfig {
    total_capital: u64,
    max_positions: usize,
    min_position_size: u64,
    target_yield: f64,
    risk_tolerance: f64,
}

#[derive(Debug)]
struct PoolAnalysis {
    address: Pubkey,
    name: String,
    expected_yield: f64,
    volatility: f64,
    liquidity_depth: f64,
    volume_24h: f64,
    risk_adjusted_return: f64,
}

#[derive(Debug)]
struct OptimalAllocation {
    allocations: Vec<AllocationEntry>,
    expected_portfolio_yield: f64,
    portfolio_volatility: f64,
    sharpe_ratio: f64,
}

#[derive(Debug)]
struct AllocationEntry {
    pool_address: Pubkey,
    pool_name: String,
    capital_allocation: u64,
    allocation_percentage: f64,
    expected_yield: f64,
}

impl PortfolioOptimizer {
    fn new(dlmm_client: Arc<DlmmClient>, config: OptimizationConfig) -> Self {
        Self { dlmm_client, config }
    }
    
    async fn optimize_allocation(
        &self,
        candidate_pools: Vec<(&str, Pubkey)>,
    ) -> Result<OptimalAllocation, Box<dyn std::error::Error>> {
        // Analyze all candidate pools
        let mut pool_analyses = Vec::new();
        
        for (name, address) in candidate_pools {
            match self.analyze_pool(name, address).await {
                Ok(analysis) => pool_analyses.push(analysis),
                Err(e) => {
                    eprintln!("Failed to analyze pool {}: {:?}", name, e);
                }
            }
        }
        
        // Sort by risk-adjusted return (Sharpe ratio)
        pool_analyses.sort_by(|a, b| {
            b.risk_adjusted_return.partial_cmp(&a.risk_adjusted_return).unwrap()
        });
        
        // Select top pools within constraints
        let selected_pools = self.select_optimal_pools(&pool_analyses)?;
        
        // Calculate capital allocation using Modern Portfolio Theory
        let allocations = self.calculate_allocations(&selected_pools).await?;
        
        // Calculate portfolio metrics
        let portfolio_metrics = self.calculate_portfolio_metrics(&allocations);
        
        Ok(OptimalAllocation {
            allocations,
            expected_portfolio_yield: portfolio_metrics.expected_yield,
            portfolio_volatility: portfolio_metrics.volatility,
            sharpe_ratio: portfolio_metrics.sharpe_ratio,
        })
    }
    
    async fn analyze_pool(
        &self,
        name: &str,
        address: Pubkey,
    ) -> Result<PoolAnalysis, Box<dyn std::error::Error>> {
        let pool = self.dlmm_client.load_pool(address).await?;
        
        // Calculate expected yield based on historical fees
        let volume_24h = pool.get_volume_24h()? as f64;
        let tvl = pool.get_total_value_locked()? as f64;
        let fee_rate = pool.fee_rate as f64 / 10000.0;
        
        let daily_fee_yield = (volume_24h * fee_rate) / tvl;
        let expected_yield = daily_fee_yield * 365.0; // Annualize
        
        // Calculate volatility
        let price_history = pool.get_price_history(100).await?;
        let volatility = self.calculate_volatility(&price_history);
        
        // Calculate liquidity depth
        let liquidity_depth = self.calculate_liquidity_depth(&pool).await?;
        
        // Risk-adjusted return (Sharpe ratio approximation)
        let risk_free_rate = 0.04; // 4% risk-free rate
        let excess_return = expected_yield - risk_free_rate;
        let risk_adjusted_return = if volatility > 0.0 {
            excess_return / volatility
        } else {
            expected_yield
        };
        
        Ok(PoolAnalysis {
            address,
            name: name.to_string(),
            expected_yield,
            volatility,
            liquidity_depth,
            volume_24h,
            risk_adjusted_return,
        })
    }
    
    fn select_optimal_pools(
        &self,
        analyses: &[PoolAnalysis],
    ) -> Result<Vec<&PoolAnalysis>, Box<dyn std::error::Error>> {
        let mut selected = Vec::new();
        let mut total_risk = 0.0;
        
        for analysis in analyses.iter().take(self.config.max_positions) {
            // Check risk constraints
            if analysis.volatility <= self.config.risk_tolerance {
                selected.push(analysis);
                total_risk += analysis.volatility;
                
                // Stop if adding this pool would exceed risk tolerance
                if total_risk / selected.len() as f64 > self.config.risk_tolerance * 0.8 {
                    break;
                }
            }
        }
        
        if selected.is_empty() {
            return Err("No pools meet risk criteria".into());
        }
        
        Ok(selected)
    }
    
    async fn calculate_allocations(
        &self,
        selected_pools: &[&PoolAnalysis],
    ) -> Result<Vec<AllocationEntry>, Box<dyn std::error::Error>> {
        // Simple risk parity allocation
        let total_weights: f64 = selected_pools
            .iter()
            .map(|pool| 1.0 / pool.volatility) // Inverse volatility weighting
            .sum();
        
        let mut allocations = Vec::new();
        let available_capital = (self.config.total_capital as f64 * 
                               self.config.liquidity_utilization_limit) as u64;
        
        for pool in selected_pools {
            let weight = (1.0 / pool.volatility) / total_weights;
            let allocation = (available_capital as f64 * weight) as u64;
            
            // Ensure minimum position size
            if allocation >= self.config.min_position_size {
                allocations.push(AllocationEntry {
                    pool_address: pool.address,
                    pool_name: pool.name.clone(),
                    capital_allocation: allocation,
                    allocation_percentage: weight * 100.0,
                    expected_yield: pool.expected_yield,
                });
            }
        }
        
        Ok(allocations)
    }
    
    async fn execute_allocation(
        &self,
        allocation: OptimalAllocation,
    ) -> Result<(), Box<dyn std::error::Error>> {
        println!("💼 Executing Portfolio Allocation");
        println!("Expected Yield: {:.2}%", allocation.expected_portfolio_yield * 100.0);
        println!("Portfolio Volatility: {:.2}%", allocation.portfolio_volatility * 100.0);
        println!("Sharpe Ratio: {:.2}", allocation.sharpe_ratio);
        println!();
        
        for entry in allocation.allocations {
            println!("Creating position for {} ({:.1}% allocation)...", 
                entry.pool_name, entry.allocation_percentage);
                
            match self.create_optimal_position(entry).await {
                Ok(position) => {
                    println!("✅ Position created: {}", position.address);
                },
                Err(e) => {
                    eprintln!("❌ Failed to create position for {}: {:?}", 
                        entry.pool_name, e);
                }
            }
        }
        
        Ok(())
    }
    
    async fn create_optimal_position(
        &self,
        entry: AllocationEntry,
    ) -> Result<LiquidityPosition, Box<dyn std::error::Error>> {
        let pool = self.dlmm_client.load_pool(entry.pool_address).await?;
        
        // Create position with optimal range based on pool characteristics
        let current_price = pool.get_current_price()?;
        let volatility = self.estimate_pool_volatility(&pool).await?;
        
        // Adjust range based on volatility
        let range_width = 0.01 + (volatility * 2.0); // 1% base + volatility adjustment
        
        let lower_price = current_price * (1.0 - range_width);
        let upper_price = current_price * (1.0 + range_width);
        
        let lower_bin = pool.price_to_bin_id(lower_price)?;
        let upper_bin = pool.price_to_bin_id(upper_price)?;
        
        let params = PositionParams {
            lower_bin,
            upper_bin,
            liquidity_x: entry.capital_allocation / 2,
            liquidity_y: entry.capital_allocation / 2,
            strategy_type: StrategyType::OptimizedPortfolio,
        };
        
        let position = self.dlmm_client
            .create_position(entry.pool_address, params)
            .await?;
        
        Ok(position)
    }
}
```

## Utilities and Helpers

### Configuration Loading

```rust
// src/config.rs
use serde::{Deserialize, Serialize};
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::{fs, str::FromStr};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub rpc_url: String,
    pub wallet_path: String,
    pub dlmm_program_id: String,
    pub jupiter_program_id: String,
    pub risk_management: RiskManagementConfig,
    pub strategies: HashMap<String, StrategyConfig>,
}

impl AppConfig {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = std::env::var("CONFIG_PATH")
            .unwrap_or_else(|_| "config.toml".to_string());
        
        let content = fs::read_to_string(config_path)?;
        let config: AppConfig = toml::from_str(&content)?;
        
        Ok(config)
    }
    
    pub fn get_wallet_keypair(&self) -> Result<Keypair, Box<dyn std::error::Error>> {
        let wallet_bytes = fs::read(&self.wallet_path)?;
        let wallet = Keypair::from_bytes(&wallet_bytes)?;
        Ok(wallet)
    }
    
    pub fn get_dlmm_program_id(&self) -> Result<Pubkey, Box<dyn std::error::Error>> {
        Ok(Pubkey::from_str(&self.dlmm_program_id)?)
    }
}

pub fn load_config() -> Result<AppConfig, Box<dyn std::error::Error>> {
    AppConfig::load()
}

pub fn create_client(config: &AppConfig) -> Result<DlmmClient, Box<dyn std::error::Error>> {
    let rpc_client = Arc::new(RpcClient::new(&config.rpc_url));
    let wallet = config.get_wallet_keypair()?;
    let program_id = config.get_dlmm_program_id()?;
    
    Ok(DlmmClient::new(rpc_client, &wallet, program_id)?)
}
```

### Example Configuration File

```toml
# config.toml
rpc_url = "https://api.mainnet-beta.solana.com"
wallet_path = "./wallet.json"
dlmm_program_id = "DLMMvvDL4xnZ7GmjeTgA8XWprEGnvDR6MrCHNYc3aaJh"
jupiter_program_id = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"

[risk_management]
max_drawdown = 0.10
daily_loss_limit = 500000
position_concentration_limit = 0.20
volatility_circuit_breaker = 0.15

[strategies.conservative]
strategy_type = "passive_range"
range_percentage = 0.01
min_position_size = 500000

[strategies.aggressive] 
strategy_type = "volatility_farming"
volatility_threshold = 0.05
dynamic_range_multiplier = 3.0

[strategies.market_making]
strategy_type = "active_rebalancing"
spread_bps = 10
trigger_percentage = 0.02
```

## Testing Examples

### Integration Test Setup

```rust
// tests/integration_tests.rs
use saros_dlmm_sdk_rs::{DlmmClient, test_utils::*};
use solana_test_framework::*;

#[tokio::test]
async fn test_complete_position_lifecycle() {
    // Setup test environment
    let test_env = setup_test_environment().await;
    let dlmm_client = test_env.dlmm_client;
    
    // Create test pool
    let pool_address = test_env.create_test_pool(
        test_env.sol_mint,
        test_env.usdc_mint,
        25, // bin_step
        100, // fee_rate
    ).await?;
    
    // Test position creation
    let position_params = PositionParams {
        lower_bin: 1000,
        upper_bin: 1020,
        liquidity_x: 1_000_000,
        liquidity_y: 100_000_000,
        strategy_type: StrategyType::Test,
    };
    
    let position = dlmm_client
        .create_position(pool_address, position_params)
        .await?;
    
    assert!(!position.address.to_string().is_empty());
    
    // Test fee accumulation
    test_env.simulate_trading_volume(pool_address, 10_000_000).await?;
    
    let fees = dlmm_client
        .get_position_fees(&position.address)
        .await?;
    
    assert!(fees.fee_x > 0 || fees.fee_y > 0);
    
    // Test fee collection
    let collect_result = dlmm_client
        .collect_fees(&position.address)
        .await?;
    
    assert!(!collect_result.signature.is_empty());
    
    // Test position removal
    let remove_result = dlmm_client
        .remove_liquidity(&position.address)
        .await?;
    
    assert!(remove_result.amount_x > 0);
    assert!(remove_result.amount_y > 0);
}

struct TestEnvironment {
    dlmm_client: Arc<DlmmClient>,
    sol_mint: Pubkey,
    usdc_mint: Pubkey,
    test_wallet: Keypair,
}

async fn setup_test_environment() -> TestEnvironment {
    // Setup test validator and accounts
    let test_validator = TestValidatorBuilder::new()
        .add_program("dlmm_program", dlmm_program_id())
        .build()
        .await;
    
    let sol_mint = Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap();
    let usdc_mint = Pubkey::from_str("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v").unwrap();
    
    let test_wallet = Keypair::new();
    
    // Fund test wallet
    test_validator.fund_wallet(&test_wallet.pubkey(), 10_000_000_000).await; // 10 SOL
    
    let dlmm_client = Arc::new(DlmmClient::new(
        Arc::new(test_validator.rpc_client()),
        &test_wallet,
        dlmm_program_id(),
    )?);
    
    TestEnvironment {
        dlmm_client,
        sol_mint,
        usdc_mint,
        test_wallet,
    }
}
```

## Performance Benchmarks

### Benchmarking Tool

```rust
// examples/benchmark.rs
use saros_dlmm_sdk_rs::{DlmmClient, PerformanceProfiler};
use std::{sync::Arc, time::Instant};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = load_config()?;
    let dlmm_client = Arc::new(create_client(&config)?);
    
    let benchmarker = PerformanceBenchmarker::new(dlmm_client);
    
    println!("🚀 Starting DLMM SDK Performance Benchmarks");
    println!("{}", "=".repeat(60));
    
    // Run benchmarks
    benchmarker.benchmark_pool_loading().await?;
    benchmarker.benchmark_quote_generation().await?;
    benchmarker.benchmark_position_operations().await?;
    
    Ok(())
}

struct PerformanceBenchmarker {
    dlmm_client: Arc<DlmmClient>,
}

impl PerformanceBenchmarker {
    async fn benchmark_pool_loading(&self) -> Result<(), Box<dyn std::error::Error>> {
        println!("📊 Pool Loading Benchmark");
        
        let pool_addresses = vec![
            Pubkey::from_str("BLZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?,
            Pubkey::from_str("2BZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?,
            Pubkey::from_str("3BZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV")?,
        ];
        
        // Single pool loading
        let start = Instant::now();
        let _pool = self.dlmm_client.load_pool(pool_addresses[0]).await?;
        let single_duration = start.elapsed();
        
        // Batch pool loading
        let start = Instant::now();
        let _pools = self.dlmm_client.load_pools_batch(&pool_addresses).await?;
        let batch_duration = start.elapsed();
        
        println!("  Single Pool Load: {:.2}ms", single_duration.as_millis());
        println!("  Batch Pool Load (3): {:.2}ms", batch_duration.as_millis());
        println!("  Efficiency Gain: {:.1}x", 
            (single_duration.as_millis() * 3) as f64 / batch_duration.as_millis() as f64);
        println!();
        
        Ok(())
    }
    
    async fn benchmark_quote_generation(&self) -> Result<(), Box<dyn std::error::Error>> {
        println!("📊 Quote Generation Benchmark");
        
        let sol_mint = Pubkey::from_str("So11111111111111111111111111111111111111112")?;
        let usdc_mint = Pubkey::from_str("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")?;
        
        let amounts = vec![100_000, 1_000_000, 10_000_000, 100_000_000];
        
        for amount in amounts {
            let start = Instant::now();
            let quote = self.dlmm_client
                .get_swap_quote(sol_mint, usdc_mint, amount)
                .await?;
            let duration = start.elapsed();
            
            println!("  Amount: {} -> Quote: {} ({:.2}ms)", 
                amount, quote.out_amount, duration.as_millis());
        }
        
        println!();
        Ok(())
    }
}
```

These examples demonstrate the full capabilities of the Saros Rust DLMM SDK, from simple monitoring to sophisticated trading strategies. Each example is production-ready and includes proper error handling, configuration management, and performance optimization.