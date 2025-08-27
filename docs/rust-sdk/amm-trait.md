# AMM Trait Implementation

The Saros Rust DLMM SDK provides a flexible AMM trait system that allows you to implement custom automated market making strategies. This trait-based approach enables modularity and testability.

## Core AMM Trait

The foundation of all AMM implementations:

```rust
use async_trait::async_trait;
use saros_dlmm_sdk_rs::{DlmmPool, LiquidityPosition, SwapQuote};
use solana_sdk::pubkey::Pubkey;

#[async_trait]
pub trait AmmStrategy: Send + Sync {
    /// Calculate optimal position parameters for the current market conditions
    async fn calculate_position_params(
        &self,
        pool: &DlmmPool,
        available_capital: u64,
    ) -> Result<PositionParams, AmmError>;
    
    /// Determine if a position should be rebalanced
    async fn should_rebalance(
        &self,
        position: &LiquidityPosition,
        pool: &DlmmPool,
    ) -> Result<bool, AmmError>;
    
    /// Execute rebalancing logic
    async fn rebalance_position(
        &self,
        position: &mut LiquidityPosition,
        pool: &DlmmPool,
    ) -> Result<RebalanceResult, AmmError>;
    
    /// Calculate expected returns for a position
    fn calculate_expected_returns(
        &self,
        position: &LiquidityPosition,
        pool: &DlmmPool,
        time_horizon_hours: u32,
    ) -> Result<ExpectedReturns, AmmError>;
}

#[derive(Debug, Clone)]
pub struct PositionParams {
    pub lower_bin: i32,
    pub upper_bin: i32,
    pub liquidity_x: u64,
    pub liquidity_y: u64,
    pub strategy_type: StrategyType,
}

#[derive(Debug)]
pub struct RebalanceResult {
    pub old_position: LiquidityPosition,
    pub new_position: LiquidityPosition,
    pub transaction_signature: String,
    pub gas_cost: u64,
}

#[derive(Debug)]
pub struct ExpectedReturns {
    pub daily_fee_yield: f64,
    pub impermanent_loss_risk: f64,
    pub total_expected_return: f64,
    pub confidence_interval: (f64, f64),
}
```

## Strategy Types

### 1. Passive Range Strategy

Provides liquidity in a fixed range around current price:

```rust
#[derive(Debug, Clone)]
pub enum StrategyType {
    PassiveRange { range_percentage: f64 },
    ActiveRebalancing { trigger_percentage: f64 },
    DeltaNeutral { hedge_ratio: f64 },
    VolatilityFarming { volatility_threshold: f64 },
}

pub struct PassiveRangeStrategy {
    range_percentage: f64,
    min_position_size: u64,
}

#[async_trait]
impl AmmStrategy for PassiveRangeStrategy {
    async fn calculate_position_params(
        &self,
        pool: &DlmmPool,
        available_capital: u64,
    ) -> Result<PositionParams, AmmError> {
        let current_price = pool.get_current_price()?;
        
        // Calculate price range
        let lower_price = current_price * (1.0 - self.range_percentage);
        let upper_price = current_price * (1.0 + self.range_percentage);
        
        // Convert to bin IDs
        let lower_bin = pool.price_to_bin_id(lower_price)?;
        let upper_bin = pool.price_to_bin_id(upper_price)?;
        
        // Distribute capital equally between tokens
        let liquidity_x = available_capital / 2;
        let liquidity_y = available_capital / 2;
        
        Ok(PositionParams {
            lower_bin,
            upper_bin,
            liquidity_x,
            liquidity_y,
            strategy_type: StrategyType::PassiveRange { 
                range_percentage: self.range_percentage 
            },
        })
    }
    
    async fn should_rebalance(
        &self,
        position: &LiquidityPosition,
        pool: &DlmmPool,
    ) -> Result<bool, AmmError> {
        let current_bin = pool.active_id;
        
        // Rebalance if price moved outside position range
        Ok(current_bin < position.lower_bin || current_bin > position.upper_bin)
    }
    
    async fn rebalance_position(
        &self,
        position: &mut LiquidityPosition,
        pool: &DlmmPool,
    ) -> Result<RebalanceResult, AmmError> {
        // Remove existing liquidity
        let remove_result = pool.remove_liquidity(&position.address).await?;
        
        // Calculate new position parameters
        let total_value = remove_result.amount_x + remove_result.amount_y;
        let new_params = self.calculate_position_params(pool, total_value).await?;
        
        // Create new position
        let new_position = pool.create_position(new_params).await?;
        
        Ok(RebalanceResult {
            old_position: position.clone(),
            new_position,
            transaction_signature: remove_result.signature,
            gas_cost: remove_result.gas_cost,
        })
    }
    
    fn calculate_expected_returns(
        &self,
        position: &LiquidityPosition,
        pool: &DlmmPool,
        time_horizon_hours: u32,
    ) -> Result<ExpectedReturns, AmmError> {
        let position_value = position.liquidity_x + position.liquidity_y;
        let pool_tvl = pool.get_total_value_locked()?;
        let pool_volume_24h = pool.get_volume_24h()?;
        
        // Calculate fee yield
        let position_share = position_value as f64 / pool_tvl as f64;
        let daily_fees = pool_volume_24h as f64 * (pool.fee_rate as f64 / 10000.0);
        let daily_fee_yield = (daily_fees * position_share) / position_value as f64;
        
        // Estimate impermanent loss based on range width
        let range_width = (position.upper_bin - position.lower_bin) as f64;
        let il_risk = self.range_percentage * 0.5; // Simplified IL calculation
        
        Ok(ExpectedReturns {
            daily_fee_yield,
            impermanent_loss_risk: il_risk,
            total_expected_return: daily_fee_yield - il_risk,
            confidence_interval: (daily_fee_yield * 0.8, daily_fee_yield * 1.2),
        })
    }
}
```

### 2. Active Rebalancing Strategy

Dynamically adjusts positions based on market movement:

```rust
pub struct ActiveRebalancingStrategy {
    trigger_percentage: f64,
    max_gas_cost_percentage: f64,
    rebalance_cooldown: std::time::Duration,
    last_rebalance: std::sync::Arc<std::sync::RwLock<std::time::Instant>>,
}

#[async_trait]
impl AmmStrategy for ActiveRebalancingStrategy {
    async fn calculate_position_params(
        &self,
        pool: &DlmmPool,
        available_capital: u64,
    ) -> Result<PositionParams, AmmError> {
        // Use volatility-adjusted range
        let volatility = self.estimate_volatility(pool).await?;
        let adjusted_range = 0.01 + (volatility * 0.05); // Base 1% + volatility adjustment
        
        let current_price = pool.get_current_price()?;
        let lower_price = current_price * (1.0 - adjusted_range);
        let upper_price = current_price * (1.0 + adjusted_range);
        
        let lower_bin = pool.price_to_bin_id(lower_price)?;
        let upper_bin = pool.price_to_bin_id(upper_price)?;
        
        Ok(PositionParams {
            lower_bin,
            upper_bin,
            liquidity_x: available_capital * 60 / 100, // Slight bias toward token X
            liquidity_y: available_capital * 40 / 100,
            strategy_type: StrategyType::ActiveRebalancing { 
                trigger_percentage: self.trigger_percentage 
            },
        })
    }
    
    async fn should_rebalance(
        &self,
        position: &LiquidityPosition,
        pool: &DlmmPool,
    ) -> Result<bool, AmmError> {
        // Check cooldown period
        let last_rebalance = *self.last_rebalance.read().unwrap();
        if last_rebalance.elapsed() < self.rebalance_cooldown {
            return Ok(false);
        }
        
        let current_bin = pool.active_id;
        let position_center = (position.lower_bin + position.upper_bin) / 2;
        
        // Calculate distance from center as percentage
        let distance_from_center = (current_bin - position_center).abs() as f64;
        let position_width = (position.upper_bin - position.lower_bin) as f64;
        let distance_percentage = distance_from_center / position_width;
        
        // Rebalance if price moved more than trigger percentage from center
        Ok(distance_percentage > self.trigger_percentage)
    }
    
    async fn estimate_volatility(&self, pool: &DlmmPool) -> Result<f64, AmmError> {
        // Get recent price history
        let price_history = pool.get_price_history(24).await?; // 24 hours
        
        if price_history.len() < 2 {
            return Ok(0.02); // Default 2% volatility
        }
        
        // Calculate returns
        let returns: Vec<f64> = price_history
            .windows(2)
            .map(|window| (window[1] / window[0]).ln())
            .collect();
        
        // Calculate standard deviation (volatility)
        let mean_return = returns.iter().sum::<f64>() / returns.len() as f64;
        let variance = returns
            .iter()
            .map(|r| (r - mean_return).powi(2))
            .sum::<f64>() / returns.len() as f64;
        
        Ok(variance.sqrt())
    }
}
```

### 3. Delta-Neutral Strategy

Maintains price-neutral positions through hedging:

```rust
pub struct DeltaNeutralStrategy {
    hedge_ratio: f64,
    rehedge_threshold: f64,
    perp_exchange_client: Option<PerpExchangeClient>,
}

#[async_trait]
impl AmmStrategy for DeltaNeutralStrategy {
    async fn calculate_position_params(
        &self,
        pool: &DlmmPool,
        available_capital: u64,
    ) -> Result<PositionParams, AmmError> {
        // Create narrow range around current price
        let current_price = pool.get_current_price()?;
        let tight_range = 0.005; // 0.5% range
        
        let lower_price = current_price * (1.0 - tight_range);
        let upper_price = current_price * (1.0 + tight_range);
        
        let lower_bin = pool.price_to_bin_id(lower_price)?;
        let upper_bin = pool.price_to_bin_id(upper_price)?;
        
        Ok(PositionParams {
            lower_bin,
            upper_bin,
            liquidity_x: available_capital / 2,
            liquidity_y: available_capital / 2,
            strategy_type: StrategyType::DeltaNeutral { 
                hedge_ratio: self.hedge_ratio 
            },
        })
    }
    
    async fn should_rebalance(
        &self,
        position: &LiquidityPosition,
        pool: &DlmmPool,
    ) -> Result<bool, AmmError> {
        if let Some(perp_client) = &self.perp_exchange_client {
            let current_delta = self.calculate_position_delta(position, pool)?;
            let hedge_delta = perp_client.get_position_delta().await?;
            
            let net_delta = current_delta + hedge_delta;
            let delta_threshold = position.total_value() as f64 * self.rehedge_threshold;
            
            Ok(net_delta.abs() > delta_threshold)
        } else {
            // Without perp integration, rebalance based on range exit
            let current_bin = pool.active_id;
            Ok(current_bin <= position.lower_bin || current_bin >= position.upper_bin)
        }
    }
    
    fn calculate_position_delta(
        &self,
        position: &LiquidityPosition,
        pool: &DlmmPool,
    ) -> Result<f64, AmmError> {
        let current_price = pool.get_current_price()?;
        
        // Calculate delta of liquidity position
        // Delta = d(position_value) / d(price)
        let position_value = position.liquidity_x as f64 + 
                           (position.liquidity_y as f64 * current_price);
        
        // Numerical delta calculation
        let price_delta = current_price * 0.001; // 0.1% price change
        let new_price = current_price + price_delta;
        let new_value = position.liquidity_x as f64 + 
                       (position.liquidity_y as f64 * new_price);
        
        Ok((new_value - position_value) / price_delta)
    }
}

// Mock perp exchange client for delta-neutral hedging
#[async_trait]
pub trait PerpExchangeClient: Send + Sync {
    async fn get_position_delta(&self) -> Result<f64, AmmError>;
    async fn adjust_hedge_position(&self, target_delta: f64) -> Result<String, AmmError>;
}
```

## Strategy Implementation Examples

### Market Making Strategy

```rust
pub struct MarketMakingStrategy {
    spread_bps: u64,
    inventory_target: f64,
    max_position_size: u64,
    risk_limits: RiskLimits,
}

#[derive(Debug, Clone)]
pub struct RiskLimits {
    pub max_drawdown: f64,
    pub max_position_size: u64,
    pub daily_loss_limit: u64,
}

#[async_trait]
impl AmmStrategy for MarketMakingStrategy {
    async fn calculate_position_params(
        &self,
        pool: &DlmmPool,
        available_capital: u64,
    ) -> Result<PositionParams, AmmError> {
        let current_price = pool.get_current_price()?;
        let spread = self.spread_bps as f64 / 10000.0;
        
        // Create tight bid-ask spread
        let bid_price = current_price * (1.0 - spread / 2.0);
        let ask_price = current_price * (1.0 + spread / 2.0);
        
        let lower_bin = pool.price_to_bin_id(bid_price)?;
        let upper_bin = pool.price_to_bin_id(ask_price)?;
        
        // Adjust position size based on risk limits
        let position_size = std::cmp::min(
            available_capital,
            self.risk_limits.max_position_size,
        );
        
        // Inventory management: adjust token distribution
        let inventory_ratio = self.get_current_inventory_ratio(pool).await?;
        let (liquidity_x, liquidity_y) = self.adjust_for_inventory(
            position_size,
            inventory_ratio,
        );
        
        Ok(PositionParams {
            lower_bin,
            upper_bin,
            liquidity_x,
            liquidity_y,
            strategy_type: StrategyType::MarketMaking {
                spread_bps: self.spread_bps,
            },
        })
    }
    
    async fn get_current_inventory_ratio(
        &self,
        pool: &DlmmPool,
    ) -> Result<f64, AmmError> {
        // Get wallet token balances
        let token_x_balance = pool.get_token_balance(pool.token_x_mint).await?;
        let token_y_balance = pool.get_token_balance(pool.token_y_mint).await?;
        let current_price = pool.get_current_price()?;
        
        let total_value = token_x_balance as f64 + 
                         (token_y_balance as f64 * current_price);
        
        if total_value == 0.0 {
            return Ok(0.5); // 50/50 default
        }
        
        Ok(token_x_balance as f64 / total_value)
    }
    
    fn adjust_for_inventory(
        &self,
        total_capital: u64,
        current_inventory_ratio: f64,
    ) -> (u64, u64) {
        // Adjust towards target inventory ratio
        let target_ratio = self.inventory_target;
        let adjustment_factor = 0.1; // 10% adjustment per rebalance
        
        let adjusted_ratio = current_inventory_ratio + 
                           (target_ratio - current_inventory_ratio) * adjustment_factor;
        
        let liquidity_x = (total_capital as f64 * adjusted_ratio) as u64;
        let liquidity_y = total_capital - liquidity_x;
        
        (liquidity_x, liquidity_y)
    }
}
```

### Volatility Farming Strategy

Captures fees from high-volatility periods:

```rust
pub struct VolatilityFarmingStrategy {
    volatility_threshold: f64,
    dynamic_range_multiplier: f64,
    fee_collection_threshold: u64,
}

#[async_trait]
impl AmmStrategy for VolatilityFarmingStrategy {
    async fn calculate_position_params(
        &self,
        pool: &DlmmPool,
        available_capital: u64,
    ) -> Result<PositionParams, AmmError> {
        let volatility = self.estimate_current_volatility(pool).await?;
        
        // Adjust range based on volatility
        let base_range = 0.02; // 2% base range
        let volatility_adjusted_range = if volatility > self.volatility_threshold {
            base_range * self.dynamic_range_multiplier // Widen range in high volatility
        } else {
            base_range / self.dynamic_range_multiplier // Narrow range in low volatility
        };
        
        let current_price = pool.get_current_price()?;
        let lower_price = current_price * (1.0 - volatility_adjusted_range);
        let upper_price = current_price * (1.0 + volatility_adjusted_range);
        
        let lower_bin = pool.price_to_bin_id(lower_price)?;
        let upper_bin = pool.price_to_bin_id(upper_price)?;
        
        Ok(PositionParams {
            lower_bin,
            upper_bin,
            liquidity_x: available_capital / 2,
            liquidity_y: available_capital / 2,
            strategy_type: StrategyType::VolatilityFarming { 
                volatility_threshold: self.volatility_threshold 
            },
        })
    }
    
    async fn estimate_current_volatility(
        &self,
        pool: &DlmmPool,
    ) -> Result<f64, AmmError> {
        let price_data = pool.get_price_history(100).await?; // Last 100 data points
        
        if price_data.len() < 10 {
            return Ok(0.02); // Default 2% volatility
        }
        
        // Calculate rolling volatility
        let returns: Vec<f64> = price_data
            .windows(2)
            .map(|window| (window[1] / window[0]).ln())
            .collect();
        
        let recent_returns = &returns[returns.len().saturating_sub(20)..]; // Last 20 returns
        let mean = recent_returns.iter().sum::<f64>() / recent_returns.len() as f64;
        
        let variance = recent_returns
            .iter()
            .map(|r| (r - mean).powi(2))
            .sum::<f64>() / recent_returns.len() as f64;
        
        Ok(variance.sqrt())
    }
}
```

## Strategy Factory

Create and manage multiple strategies:

```rust
pub struct StrategyFactory;

impl StrategyFactory {
    pub fn create_strategy(
        strategy_type: &str,
        config: StrategyConfig,
    ) -> Result<Box<dyn AmmStrategy>, AmmError> {
        match strategy_type {
            "passive_range" => Ok(Box::new(PassiveRangeStrategy {
                range_percentage: config.range_percentage.unwrap_or(0.02),
                min_position_size: config.min_position_size.unwrap_or(10_000),
            })),
            "active_rebalancing" => Ok(Box::new(ActiveRebalancingStrategy {
                trigger_percentage: config.trigger_percentage.unwrap_or(0.05),
                max_gas_cost_percentage: config.max_gas_cost_percentage.unwrap_or(0.001),
                rebalance_cooldown: std::time::Duration::from_secs(
                    config.rebalance_cooldown_seconds.unwrap_or(300)
                ),
                last_rebalance: std::sync::Arc::new(
                    std::sync::RwLock::new(std::time::Instant::now())
                ),
            })),
            "volatility_farming" => Ok(Box::new(VolatilityFarmingStrategy {
                volatility_threshold: config.volatility_threshold.unwrap_or(0.05),
                dynamic_range_multiplier: config.dynamic_range_multiplier.unwrap_or(2.0),
                fee_collection_threshold: config.fee_collection_threshold.unwrap_or(50_000),
            })),
            _ => Err(AmmError::UnsupportedStrategy(strategy_type.to_string())),
        }
    }
}

#[derive(Debug, Clone)]
pub struct StrategyConfig {
    pub range_percentage: Option<f64>,
    pub trigger_percentage: Option<f64>,
    pub min_position_size: Option<u64>,
    pub max_gas_cost_percentage: Option<f64>,
    pub rebalance_cooldown_seconds: Option<u64>,
    pub volatility_threshold: Option<f64>,
    pub dynamic_range_multiplier: Option<f64>,
    pub fee_collection_threshold: Option<u64>,
}
```

## Strategy Manager

Orchestrate multiple strategies across different pools:

```rust
pub struct StrategyManager {
    strategies: std::collections::HashMap<Pubkey, Box<dyn AmmStrategy>>,
    positions: std::collections::HashMap<Pubkey, LiquidityPosition>,
    dlmm_client: Arc<DlmmClient>,
    performance_tracker: PerformanceTracker,
}

impl StrategyManager {
    pub fn new(dlmm_client: Arc<DlmmClient>) -> Self {
        Self {
            strategies: std::collections::HashMap::new(),
            positions: std::collections::HashMap::new(),
            dlmm_client,
            performance_tracker: PerformanceTracker::new(),
        }
    }
    
    pub async fn add_strategy(
        &mut self,
        pool_address: Pubkey,
        strategy: Box<dyn AmmStrategy>,
        initial_capital: u64,
    ) -> Result<(), AmmError> {
        // Load pool
        let pool = self.dlmm_client.load_pool(pool_address).await?;
        
        // Calculate position parameters
        let params = strategy
            .calculate_position_params(&pool, initial_capital)
            .await?;
        
        // Create initial position
        let position = self.dlmm_client
            .create_position(pool_address, params)
            .await?;
        
        // Store strategy and position
        self.strategies.insert(pool_address, strategy);
        self.positions.insert(pool_address, position);
        
        println!("Strategy deployed for pool: {}", pool_address);
        Ok(())
    }
    
    pub async fn run_strategy_loop(&mut self) -> Result<(), AmmError> {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(10));
        
        loop {
            interval.tick().await;
            
            // Check all positions for rebalancing opportunities
            for (pool_address, strategy) in &self.strategies {
                if let Some(position) = self.positions.get_mut(pool_address) {
                    match self.check_and_rebalance(pool_address, position, strategy).await {
                        Ok(rebalanced) => {
                            if rebalanced {
                                self.performance_tracker
                                    .record_rebalance(*pool_address)
                                    .await;
                            }
                        },
                        Err(e) => {
                            eprintln!("Error checking position {}: {:?}", pool_address, e);
                        }
                    }
                }
            }
            
            // Collect fees periodically
            self.collect_all_fees().await?;
        }
    }
    
    async fn check_and_rebalance(
        &self,
        pool_address: &Pubkey,
        position: &mut LiquidityPosition,
        strategy: &Box<dyn AmmStrategy>,
    ) -> Result<bool, AmmError> {
        let pool = self.dlmm_client.load_pool(*pool_address).await?;
        
        if strategy.should_rebalance(position, &pool).await? {
            println!("Rebalancing position for pool: {}", pool_address);
            
            let rebalance_result = strategy
                .rebalance_position(position, &pool)
                .await?;
            
            // Update stored position
            *position = rebalance_result.new_position;
            
            println!("Rebalancing completed: {}", rebalance_result.transaction_signature);
            Ok(true)
        } else {
            Ok(false)
        }
    }
    
    async fn collect_all_fees(&mut self) -> Result<(), AmmError> {
        for (pool_address, position) in &self.positions {
            let fees = self.dlmm_client
                .get_position_fees(&position.address)
                .await?;
            
            // Collect if fees are substantial
            if fees.fee_x > 10_000 || fees.fee_y > 10_000 {
                let result = self.dlmm_client
                    .collect_fees(&position.address)
                    .await?;
                
                self.performance_tracker
                    .record_fee_collection(*pool_address, fees.fee_x + fees.fee_y)
                    .await;
                
                println!("Collected fees for {}: {}", pool_address, result.signature);
            }
        }
        
        Ok(())
    }
}
```

## Performance Tracking

```rust
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub total_fees_collected: u64,
    pub total_gas_spent: u64,
    pub successful_rebalances: u32,
    pub failed_rebalances: u32,
    pub average_position_duration: std::time::Duration,
    pub roi_percentage: f64,
}

pub struct PerformanceTracker {
    metrics: HashMap<Pubkey, PerformanceMetrics>,
    start_time: std::time::Instant,
}

impl PerformanceTracker {
    pub fn new() -> Self {
        Self {
            metrics: HashMap::new(),
            start_time: std::time::Instant::now(),
        }
    }
    
    pub async fn record_fee_collection(
        &mut self,
        pool_address: Pubkey,
        fee_amount: u64,
    ) {
        let metrics = self.metrics
            .entry(pool_address)
            .or_insert_with(|| PerformanceMetrics::default());
            
        metrics.total_fees_collected += fee_amount;
    }
    
    pub async fn record_rebalance(&mut self, pool_address: Pubkey) {
        let metrics = self.metrics
            .entry(pool_address)
            .or_insert_with(|| PerformanceMetrics::default());
            
        metrics.successful_rebalances += 1;
    }
    
    pub fn generate_report(&self) -> String {
        let mut report = String::new();
        report.push_str(&format!("Performance Report (Runtime: {:.2} hours)\n", 
            self.start_time.elapsed().as_secs_f64() / 3600.0));
        report.push_str(&format!("{:-<60}\n", ""));
        
        for (pool_address, metrics) in &self.metrics {
            report.push_str(&format!("Pool: {}\n", pool_address));
            report.push_str(&format!("  Fees Collected: {}\n", metrics.total_fees_collected));
            report.push_str(&format!("  Gas Spent: {}\n", metrics.total_gas_spent));
            report.push_str(&format!("  Successful Rebalances: {}\n", metrics.successful_rebalances));
            report.push_str(&format!("  ROI: {:.2}%\n", metrics.roi_percentage));
            report.push_str("\n");
        }
        
        report
    }
}

impl Default for PerformanceMetrics {
    fn default() -> Self {
        Self {
            total_fees_collected: 0,
            total_gas_spent: 0,
            successful_rebalances: 0,
            failed_rebalances: 0,
            average_position_duration: std::time::Duration::from_secs(0),
            roi_percentage: 0.0,
        }
    }
}
```

## Testing Strategies

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use mockall::mock;
    
    // Mock DLMM client for testing
    mock! {
        DlmmClient {
            async fn load_pool(&self, address: Pubkey) -> Result<DlmmPool, AmmError>;
            async fn create_position(
                &self, 
                pool_address: Pubkey, 
                params: PositionParams
            ) -> Result<LiquidityPosition, AmmError>;
        }
    }
    
    #[tokio::test]
    async fn test_passive_range_strategy() {
        let mut mock_client = MockDlmmClient::new();
        
        // Set up mock expectations
        mock_client
            .expect_load_pool()
            .returning(|_| Ok(create_test_pool()));
        
        let strategy = PassiveRangeStrategy {
            range_percentage: 0.02,
            min_position_size: 1000,
        };
        
        let pool = create_test_pool();
        let params = strategy
            .calculate_position_params(&pool, 100_000)
            .await
            .unwrap();
        
        assert_eq!(params.liquidity_x, 50_000);
        assert_eq!(params.liquidity_y, 50_000);
        
        // Test bin range is within expected bounds
        let price_range = pool.bin_id_to_price(params.upper_bin).unwrap() - 
                         pool.bin_id_to_price(params.lower_bin).unwrap();
        let expected_range = pool.get_current_price().unwrap() * 0.04; // 2% * 2
        
        assert!((price_range - expected_range).abs() < expected_range * 0.1);
    }
    
    fn create_test_pool() -> DlmmPool {
        // Create mock pool for testing
        DlmmPool::new_test_instance(
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            1000, // Active bin
            25,   // Bin step
            100,  // Fee rate
        )
    }
}
```

## Best Practices

### 1. Error Handling

```rust
#[derive(Debug, thiserror::Error)]
pub enum AmmError {
    #[error("Pool not found: {0}")]
    PoolNotFound(Pubkey),
    
    #[error("Insufficient liquidity for operation")]
    InsufficientLiquidity,
    
    #[error("Strategy error: {0}")]
    StrategyError(String),
    
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("Unsupported strategy: {0}")]
    UnsupportedStrategy(String),
}
```

### 2. Configuration Management

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct StrategyConfiguration {
    pub strategies: HashMap<String, StrategyParams>,
    pub risk_management: RiskManagementConfig,
    pub performance_targets: PerformanceTargets,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StrategyParams {
    pub strategy_type: String,
    pub pool_addresses: Vec<String>,
    pub capital_allocation: u64,
    pub config: StrategyConfig,
}

impl StrategyConfiguration {
    pub fn load_from_file(path: &str) -> Result<Self, AmmError> {
        let content = std::fs::read_to_string(path)?;
        let config: StrategyConfiguration = toml::from_str(&content)?;
        Ok(config)
    }
}
```

### 3. Monitoring and Alerts

```rust
pub struct AlertSystem {
    discord_webhook: Option<String>,
    slack_webhook: Option<String>,
}

impl AlertSystem {
    pub async fn send_performance_alert(
        &self,
        pool_address: Pubkey,
        message: &str,
        severity: AlertSeverity,
    ) -> Result<(), AmmError> {
        let alert_message = format!(
            "[{}] Pool {}: {}",
            severity,
            pool_address,
            message
        );
        
        if let Some(webhook) = &self.discord_webhook {
            self.send_discord_message(webhook, &alert_message).await?;
        }
        
        println!("ALERT: {}", alert_message);
        Ok(())
    }
}

#[derive(Debug)]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
}
```

The AMM trait system provides a powerful foundation for building sophisticated liquidity strategies. Combine multiple strategies, implement custom logic, and monitor performance to maximize returns while managing risk.