# Rust SDK API Reference

Complete API documentation for the Saros Rust DLMM SDK. All functions are async and return `Result` types with proper error handling.

## Core Client

### DlmmClient

Primary client for interacting with DLMM pools.

```rust
pub struct DlmmClient {
    pub rpc_client: Arc<RpcClient>,
    pub wallet: Keypair,
    pub program_id: Pubkey,
}

impl DlmmClient {
    /// Creates a new DLMM client instance
    pub fn new(
        rpc_client: Arc<RpcClient>,
        wallet: &Keypair,
        program_id: Pubkey,
    ) -> Result<Self, DlmmError>;
    
    /// Loads pool data from on-chain state
    pub async fn load_pool(&self, pool_address: Pubkey) -> Result<DlmmPool, DlmmError>;
    
    /// Loads multiple pools efficiently in batch
    pub async fn load_pools_batch(&self, addresses: &[Pubkey]) -> Result<Vec<DlmmPool>, DlmmError>;
    
    /// Creates a new liquidity position
    pub async fn create_position(
        &self,
        pool_address: Pubkey,
        params: PositionParams,
    ) -> Result<LiquidityPosition, DlmmError>;
    
    /// Removes liquidity from a position
    pub async fn remove_liquidity(
        &self,
        position_address: &Pubkey,
    ) -> Result<RemoveLiquidityResult, DlmmError>;
    
    /// Adds liquidity to an existing position
    pub async fn add_liquidity(
        &self,
        position_address: &Pubkey,
        amount_x: u64,
        amount_y: u64,
    ) -> Result<AddLiquidityResult, DlmmError>;
    
    /// Collects accumulated fees from a position
    pub async fn collect_fees(
        &self,
        position_address: &Pubkey,
    ) -> Result<CollectFeesResult, DlmmError>;
    
    /// Gets swap quote for token pair
    pub async fn get_swap_quote(
        &self,
        input_mint: Pubkey,
        output_mint: Pubkey,
        amount: u64,
    ) -> Result<SwapQuote, DlmmError>;
    
    /// Executes a token swap
    pub async fn swap(
        &self,
        input_mint: Pubkey,
        output_mint: Pubkey,
        amount: u64,
        wallet: &Keypair,
    ) -> Result<SwapResult, DlmmError>;
    
    /// Refreshes position data from on-chain state
    pub async fn refresh_position(
        &self,
        position_address: &Pubkey,
    ) -> Result<LiquidityPosition, DlmmError>;
    
    /// Gets position fees without collecting
    pub async fn get_position_fees(
        &self,
        position_address: &Pubkey,
    ) -> Result<PositionFees, DlmmError>;
    
    /// Signs and sends transaction with confirmation
    pub async fn sign_and_send_transaction_with_confirmation(
        &self,
        transaction: VersionedTransaction,
        wallet: &Keypair,
    ) -> Result<Signature, DlmmError>;
}
```

## Pool Operations

### DlmmPool

Represents a DLMM pool with concentrated liquidity.

```rust
#[derive(Debug, Clone)]
pub struct DlmmPool {
    pub address: Pubkey,
    pub token_x_mint: Pubkey,
    pub token_y_mint: Pubkey,
    pub active_id: i32,
    pub bin_step: u16,
    pub fee_rate: u16,
}

impl DlmmPool {
    /// Gets the current trading price
    pub fn get_current_price(&self) -> Result<f64, DlmmError>;
    
    /// Converts price to bin ID
    pub fn price_to_bin_id(&self, price: f64) -> Result<i32, DlmmError>;
    
    /// Converts bin ID to price
    pub fn bin_id_to_price(&self, bin_id: i32) -> Result<f64, DlmmError>;
    
    /// Gets total value locked in the pool
    pub async fn get_total_value_locked(&self) -> Result<u64, DlmmError>;
    
    /// Gets 24-hour trading volume
    pub async fn get_volume_24h(&self) -> Result<u64, DlmmError>;
    
    /// Gets liquidity in the active trading bin
    pub async fn get_active_liquidity(&self) -> Result<u64, DlmmError>;
    
    /// Gets historical price data
    pub async fn get_price_history(&self, hours: u32) -> Result<Vec<f64>, DlmmError>;
    
    /// Gets liquidity distribution across bins
    pub async fn get_liquidity_distribution(&self) -> Result<LiquidityDistribution, DlmmError>;
    
    /// Gets token balance for a specific mint
    pub async fn get_token_balance(&self, mint: Pubkey) -> Result<u64, DlmmError>;
    
    /// Calculates optimal bin range for a given capital and strategy
    pub async fn calculate_optimal_range(
        &self,
        capital: u64,
        strategy: OptimizationStrategy,
    ) -> Result<BinRange, DlmmError>;
}

#[derive(Debug)]
pub struct LiquidityDistribution {
    pub total_bins_with_liquidity: u32,
    pub concentration_ratio: f64, // % of liquidity in active range
    pub distribution_map: HashMap<i32, u64>, // bin_id -> liquidity_amount
}

#[derive(Debug)]
pub enum OptimizationStrategy {
    MaximizeFees,
    MinimizeRisk,
    Balanced { risk_tolerance: f64 },
}
```

## Position Management

### LiquidityPosition

Represents a concentrated liquidity position.

```rust
#[derive(Debug, Clone)]
pub struct LiquidityPosition {
    pub address: Pubkey,
    pub pool_address: Pubkey,
    pub owner: Pubkey,
    pub lower_bin: i32,
    pub upper_bin: i32,
    pub liquidity_x: u64,
    pub liquidity_y: u64,
    pub fee_owner: Pubkey,
}

impl LiquidityPosition {
    /// Calculates total position value in USD
    pub async fn total_value(&self, pool: &DlmmPool) -> Result<f64, DlmmError>;
    
    /// Calculates position's share of pool liquidity
    pub async fn pool_share_percentage(&self, pool: &DlmmPool) -> Result<f64, DlmmError>;
    
    /// Estimates daily fee earnings based on current volume
    pub async fn estimated_daily_fees(&self, pool: &DlmmPool) -> Result<PositionFees, DlmmError>;
    
    /// Checks if position is currently in range (earning fees)
    pub fn is_in_range(&self, pool: &DlmmPool) -> bool;
    
    /// Calculates impermanent loss since position creation
    pub async fn calculate_impermanent_loss(
        &self, 
        pool: &DlmmPool,
        initial_price: f64,
    ) -> Result<f64, DlmmError>;
    
    /// Gets position performance metrics
    pub async fn get_performance_metrics(
        &self,
        pool: &DlmmPool,
    ) -> Result<PositionMetrics, DlmmError>;
}

#[derive(Debug)]
pub struct PositionMetrics {
    pub total_fees_earned: u64,
    pub impermanent_loss: f64,
    pub net_return: f64,
    pub days_active: f64,
    pub daily_yield: f64,
    pub risk_score: f64,
}
```

### Position Parameters

```rust
#[derive(Debug, Clone)]
pub struct PositionParams {
    pub lower_bin: i32,
    pub upper_bin: i32,
    pub liquidity_x: u64,
    pub liquidity_y: u64,
    pub strategy_type: StrategyType,
}

#[derive(Debug, Clone)]
pub struct BinRange {
    pub lower_bin: i32,
    pub upper_bin: i32,
}

impl BinRange {
    /// Creates a range centered on current active bin
    pub fn centered(active_bin: i32, width: u32) -> Self;
    
    /// Creates a range with specific width percentage
    pub fn from_percentage(
        pool: &DlmmPool,
        center_price: f64,
        width_percentage: f64,
    ) -> Result<Self, DlmmError>;
    
    /// Validates that the range is reasonable
    pub fn validate(&self) -> Result<(), DlmmError>;
    
    /// Gets the number of bins in the range
    pub fn width(&self) -> u32;
    
    /// Checks if a bin ID is within this range
    pub fn contains_bin(&self, bin_id: i32) -> bool;
}
```

## Trading Operations

### Swap Functions

```rust
/// Get swap quote with detailed breakdown
pub async fn get_detailed_swap_quote(
    client: &DlmmClient,
    input_mint: Pubkey,
    output_mint: Pubkey,
    amount: u64,
    slippage_tolerance: f64,
) -> Result<DetailedSwapQuote, DlmmError>;

/// Execute swap with custom slippage and deadline
pub async fn execute_swap_with_options(
    client: &DlmmClient,
    input_mint: Pubkey,
    output_mint: Pubkey,
    amount: u64,
    options: SwapOptions,
    wallet: &Keypair,
) -> Result<SwapResult, DlmmError>;

/// Batch swap multiple token pairs efficiently
pub async fn batch_swap(
    client: &DlmmClient,
    swaps: &[SwapInstruction],
    wallet: &Keypair,
) -> Result<Vec<SwapResult>, DlmmError>;

#[derive(Debug)]
pub struct DetailedSwapQuote {
    pub input_amount: u64,
    pub output_amount: u64,
    pub minimum_output: u64,
    pub price_impact: f64,
    pub fee_amount: u64,
    pub route: Vec<SwapStep>,
    pub gas_estimate: u64,
}

#[derive(Debug)]
pub struct SwapStep {
    pub pool_address: Pubkey,
    pub input_bin: i32,
    pub output_bin: i32,
    pub amount_in: u64,
    pub amount_out: u64,
    pub fee_paid: u64,
}

#[derive(Debug, Clone)]
pub struct SwapOptions {
    pub slippage_tolerance: f64,
    pub deadline: Option<u64>, // Unix timestamp
    pub priority_fee: Option<u64>,
    pub max_accounts: Option<usize>,
}

#[derive(Debug)]
pub struct SwapInstruction {
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub amount: u64,
    pub slippage_tolerance: f64,
}

#[derive(Debug)]
pub struct SwapResult {
    pub signature: String,
    pub input_amount: u64,
    pub output_amount: u64,
    pub fee_paid: u64,
    pub gas_used: u64,
    pub price_impact: f64,
}
```

## Analytics and Data

### Pool Analytics

```rust
pub struct PoolAnalytics;

impl PoolAnalytics {
    /// Gets comprehensive pool statistics
    pub async fn get_pool_stats(
        client: &DlmmClient,
        pool_address: Pubkey,
    ) -> Result<PoolStats, DlmmError>;
    
    /// Calculates pool utilization metrics
    pub async fn calculate_utilization_metrics(
        client: &DlmmClient,
        pool_address: Pubkey,
    ) -> Result<UtilizationMetrics, DlmmError>;
    
    /// Gets top liquidity providers for a pool
    pub async fn get_top_liquidity_providers(
        client: &DlmmClient,
        pool_address: Pubkey,
        limit: usize,
    ) -> Result<Vec<LpInfo>, DlmmError>;
    
    /// Analyzes price impact for different swap sizes
    pub async fn analyze_price_impact(
        client: &DlmmClient,
        pool_address: Pubkey,
        amounts: &[u64],
    ) -> Result<Vec<PriceImpactData>, DlmmError>;
}

#[derive(Debug)]
pub struct PoolStats {
    pub tvl_usd: f64,
    pub volume_24h_usd: f64,
    pub fees_24h_usd: f64,
    pub active_positions: u32,
    pub price_change_24h: f64,
    pub liquidity_utilization: f64,
    pub average_position_size: u64,
}

#[derive(Debug)]
pub struct UtilizationMetrics {
    pub capital_efficiency: f64,
    pub active_liquidity_ratio: f64,
    pub bin_utilization: HashMap<i32, f64>,
    pub concentration_index: f64,
}

#[derive(Debug)]
pub struct LpInfo {
    pub address: Pubkey,
    pub total_liquidity_usd: f64,
    pub positions_count: u32,
    pub total_fees_earned: u64,
}

#[derive(Debug)]
pub struct PriceImpactData {
    pub swap_amount: u64,
    pub price_impact: f64,
    pub output_amount: u64,
    pub effective_price: f64,
}
```

### Historical Data

```rust
pub struct HistoricalData;

impl HistoricalData {
    /// Gets price history with configurable intervals
    pub async fn get_price_history(
        client: &DlmmClient,
        pool_address: Pubkey,
        interval: TimeInterval,
        points: u32,
    ) -> Result<Vec<PricePoint>, DlmmError>;
    
    /// Gets volume history
    pub async fn get_volume_history(
        client: &DlmmClient,
        pool_address: Pubkey,
        interval: TimeInterval,
        points: u32,
    ) -> Result<Vec<VolumePoint>, DlmmError>;
    
    /// Gets liquidity depth over time
    pub async fn get_liquidity_history(
        client: &DlmmClient,
        pool_address: Pubkey,
        interval: TimeInterval,
        points: u32,
    ) -> Result<Vec<LiquidityPoint>, DlmmError>;
}

#[derive(Debug)]
pub enum TimeInterval {
    Minute1,
    Minute5,
    Minute15,
    Hour1,
    Hour4,
    Day1,
}

#[derive(Debug)]
pub struct PricePoint {
    pub timestamp: u64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: u64,
}

#[derive(Debug)]
pub struct VolumePoint {
    pub timestamp: u64,
    pub volume_x: u64,
    pub volume_y: u64,
    pub fee_volume: u64,
    pub swap_count: u32,
}

#[derive(Debug)]
pub struct LiquidityPoint {
    pub timestamp: u64,
    pub total_liquidity: u64,
    pub active_liquidity: u64,
    pub liquidity_utilization: f64,
}
```

## Math and Calculations

### Price Calculations

```rust
pub mod math {
    /// Converts bin ID to price
    pub fn bin_id_to_price(bin_id: i32, bin_step: u16) -> f64;
    
    /// Converts price to bin ID  
    pub fn price_to_bin_id(price: f64, bin_step: u16) -> i32;
    
    /// Calculates price impact for a given swap
    pub fn calculate_price_impact(
        amount_in: u64,
        reserve_in: u64,
        reserve_out: u64,
    ) -> f64;
    
    /// Calculates optimal liquidity distribution
    pub fn calculate_liquidity_distribution(
        total_amount: u64,
        range: &BinRange,
        current_price: f64,
        strategy: DistributionStrategy,
    ) -> Result<Vec<BinLiquidity>, MathError>;
    
    /// Calculates impermanent loss
    pub fn calculate_impermanent_loss(
        initial_price: f64,
        current_price: f64,
        position_range: &BinRange,
    ) -> f64;
    
    /// Estimates fee earnings based on volume and position
    pub fn estimate_fee_earnings(
        position: &LiquidityPosition,
        pool_volume_24h: u64,
        pool_tvl: u64,
        fee_rate: u16,
    ) -> u64;
}

#[derive(Debug)]
pub enum DistributionStrategy {
    Uniform,           // Equal distribution across range
    Concentrated,      // More liquidity near current price
    EdgeWeighted,      // More liquidity at range edges
    Custom(Vec<f64>),  // Custom weight distribution
}

#[derive(Debug)]
pub struct BinLiquidity {
    pub bin_id: i32,
    pub liquidity_x: u64,
    pub liquidity_y: u64,
}
```

### Risk Calculations

```rust
pub mod risk {
    /// Calculates Value at Risk (VaR) for a position
    pub fn calculate_var(
        position: &LiquidityPosition,
        price_history: &[f64],
        confidence_level: f64,
        time_horizon_days: u32,
    ) -> Result<f64, RiskError>;
    
    /// Calculates portfolio correlation matrix
    pub fn calculate_correlation_matrix(
        price_histories: &HashMap<Pubkey, Vec<f64>>,
    ) -> Result<CorrelationMatrix, RiskError>;
    
    /// Estimates maximum drawdown
    pub fn estimate_max_drawdown(
        returns: &[f64],
        confidence_level: f64,
    ) -> f64;
    
    /// Calculates Sharpe ratio
    pub fn calculate_sharpe_ratio(
        returns: &[f64],
        risk_free_rate: f64,
    ) -> f64;
    
    /// Calculates position concentration risk
    pub fn calculate_concentration_risk(
        positions: &[LiquidityPosition],
        total_portfolio_value: u64,
    ) -> ConcentrationRisk;
}

#[derive(Debug)]
pub struct CorrelationMatrix {
    pub pairs: HashMap<(Pubkey, Pubkey), f64>,
}

#[derive(Debug)]
pub struct ConcentrationRisk {
    pub largest_position_percentage: f64,
    pub top_3_concentration: f64,
    pub diversification_index: f64,
}
```

## Advanced Features

### Event Monitoring

```rust
pub struct EventMonitor {
    client: Arc<DlmmClient>,
    event_handlers: HashMap<EventType, Box<dyn EventHandler>>,
}

impl EventMonitor {
    /// Creates new event monitor
    pub fn new(client: Arc<DlmmClient>) -> Self;
    
    /// Registers event handler
    pub fn register_handler<T: EventHandler + 'static>(
        &mut self,
        event_type: EventType,
        handler: T,
    );
    
    /// Starts monitoring events for specific pools
    pub async fn start_monitoring(
        &self,
        pool_addresses: Vec<Pubkey>,
    ) -> Result<(), DlmmError>;
    
    /// Stops monitoring
    pub async fn stop_monitoring(&self);
}

#[derive(Debug, Hash, Eq, PartialEq)]
pub enum EventType {
    SwapExecuted,
    LiquidityAdded,
    LiquidityRemoved,
    FeesCollected,
    PriceChanged,
    NewPosition,
}

#[async_trait]
pub trait EventHandler: Send + Sync {
    async fn handle_event(&self, event: DlmmEvent) -> Result<(), Box<dyn std::error::Error>>;
}

#[derive(Debug)]
pub struct DlmmEvent {
    pub event_type: EventType,
    pub pool_address: Pubkey,
    pub transaction_signature: String,
    pub timestamp: u64,
    pub data: EventData,
}

#[derive(Debug)]
pub enum EventData {
    Swap {
        amount_in: u64,
        amount_out: u64,
        input_mint: Pubkey,
        output_mint: Pubkey,
        price_impact: f64,
    },
    LiquidityChange {
        position_address: Pubkey,
        amount_x_delta: i64,
        amount_y_delta: i64,
        new_total_liquidity: u64,
    },
    FeeCollection {
        position_address: Pubkey,
        fee_x: u64,
        fee_y: u64,
        collector: Pubkey,
    },
    PriceUpdate {
        old_active_bin: i32,
        new_active_bin: i32,
        price_change: f64,
    },
}
```

### Batch Operations

```rust
pub struct BatchOperations;

impl BatchOperations {
    /// Creates multiple positions in a single transaction
    pub async fn batch_create_positions(
        client: &DlmmClient,
        operations: &[BatchPositionOperation],
        wallet: &Keypair,
    ) -> Result<Vec<CreatePositionResult>, DlmmError>;
    
    /// Removes multiple positions efficiently
    pub async fn batch_remove_positions(
        client: &DlmmClient,
        position_addresses: &[Pubkey],
        wallet: &Keypair,
    ) -> Result<Vec<RemovePositionResult>, DlmmError>;
    
    /// Collects fees from multiple positions
    pub async fn batch_collect_fees(
        client: &DlmmClient,
        position_addresses: &[Pubkey],
        wallet: &Keypair,
    ) -> Result<Vec<CollectFeesResult>, DlmmError>;
    
    /// Rebalances multiple positions atomically
    pub async fn batch_rebalance_positions(
        client: &DlmmClient,
        rebalance_operations: &[RebalanceOperation],
        wallet: &Keypair,
    ) -> Result<Vec<RebalanceResult>, DlmmError>;
}

#[derive(Debug)]
pub struct BatchPositionOperation {
    pub pool_address: Pubkey,
    pub position_params: PositionParams,
}

#[derive(Debug)]
pub struct RebalanceOperation {
    pub old_position_address: Pubkey,
    pub new_position_params: PositionParams,
}

#[derive(Debug)]
pub struct CreatePositionResult {
    pub position_address: Pubkey,
    pub transaction_signature: String,
    pub gas_cost: u64,
}

#[derive(Debug)]
pub struct RemovePositionResult {
    pub position_address: Pubkey,
    pub amount_x_removed: u64,
    pub amount_y_removed: u64,
    pub transaction_signature: String,
}
```

## Error Handling

### Error Types

```rust
#[derive(Debug, thiserror::Error)]
pub enum DlmmError {
    #[error("Pool not found: {0}")]
    PoolNotFound(Pubkey),
    
    #[error("Position not found: {0}")]
    PositionNotFound(Pubkey),
    
    #[error("Insufficient liquidity for operation")]
    InsufficientLiquidity,
    
    #[error("Invalid bin range: lower={0}, upper={1}")]
    InvalidBinRange(i32, i32),
    
    #[error("Slippage tolerance exceeded: expected={expected}, actual={actual}")]
    SlippageExceeded { expected: f64, actual: f64 },
    
    #[error("RPC error: {0}")]
    RpcError(#[from] solana_client::client_error::ClientError),
    
    #[error("Math error: {0}")]
    MathError(#[from] MathError),
    
    #[error("Serialization error: {0}")]
    SerializationError(#[from] bincode::Error),
    
    #[error("Program error: {0}")]
    ProgramError(#[from] solana_program::program_error::ProgramError),
}

#[derive(Debug, thiserror::Error)]
pub enum MathError {
    #[error("Division by zero")]
    DivisionByZero,
    
    #[error("Overflow in calculation")]
    Overflow,
    
    #[error("Invalid price: {0}")]
    InvalidPrice(f64),
    
    #[error("Invalid bin step: {0}")]
    InvalidBinStep(u16),
}

pub type DlmmResult<T> = Result<T, DlmmError>;
```

### Error Recovery

```rust
pub struct ErrorRecovery;

impl ErrorRecovery {
    /// Attempts to recover from RPC errors with exponential backoff
    pub async fn retry_with_backoff<T, F>(
        operation: F,
        max_retries: u32,
        initial_delay: Duration,
    ) -> Result<T, DlmmError>
    where
        F: Fn() -> Pin<Box<dyn Future<Output = Result<T, DlmmError>> + Send>>,
        T: Send + 'static;
    
    /// Recovers from failed transactions
    pub async fn recover_failed_transaction(
        client: &DlmmClient,
        failed_signature: &str,
        operation_type: OperationType,
    ) -> Result<RecoveryResult, DlmmError>;
    
    /// Validates position state after potential corruption
    pub async fn validate_and_repair_position(
        client: &DlmmClient,
        position_address: Pubkey,
    ) -> Result<ValidationResult, DlmmError>;
}

#[derive(Debug)]
pub enum OperationType {
    CreatePosition,
    RemoveLiquidity,
    AddLiquidity,
    CollectFees,
    Swap,
}

#[derive(Debug)]
pub struct RecoveryResult {
    pub success: bool,
    pub recovery_actions: Vec<RecoveryAction>,
    pub final_state: Option<String>,
}

#[derive(Debug)]
pub enum RecoveryAction {
    RetryTransaction,
    RefreshState,
    RecalculatePosition,
    EmergencyClose,
}
```

## Testing Utilities

### Test Helpers

```rust
pub mod test_utils {
    use super::*;
    
    /// Creates a test DLMM client with mock RPC
    pub fn create_test_client() -> Result<DlmmClient, DlmmError>;
    
    /// Creates a mock pool for testing
    pub fn create_test_pool(
        token_x: Pubkey,
        token_y: Pubkey,
        bin_step: u16,
        fee_rate: u16,
    ) -> DlmmPool;
    
    /// Creates test position with specified parameters
    pub fn create_test_position(
        pool_address: Pubkey,
        lower_bin: i32,
        upper_bin: i32,
    ) -> LiquidityPosition;
    
    /// Simulates trading volume for testing
    pub async fn simulate_trading_volume(
        client: &DlmmClient,
        pool_address: Pubkey,
        volume_amount: u64,
    ) -> Result<(), DlmmError>;
    
    /// Asserts position state matches expectations
    pub fn assert_position_state(
        position: &LiquidityPosition,
        expected_lower: i32,
        expected_upper: i32,
        tolerance: f64,
    );
}

/// Mock implementations for testing
pub mod mocks {
    use mockall::mock;
    
    mock! {
        pub DlmmClient {
            pub async fn load_pool(&self, address: Pubkey) -> Result<DlmmPool, DlmmError>;
            pub async fn create_position(
                &self, 
                pool_address: Pubkey, 
                params: PositionParams
            ) -> Result<LiquidityPosition, DlmmError>;
            pub async fn get_swap_quote(
                &self,
                input_mint: Pubkey,
                output_mint: Pubkey, 
                amount: u64
            ) -> Result<SwapQuote, DlmmError>;
        }
    }
}
```

## Configuration

### Client Configuration

```rust
#[derive(Debug, Clone)]
pub struct ClientConfig {
    pub rpc_url: String,
    pub commitment: Commitment,
    pub timeout: Duration,
    pub retry_attempts: u32,
    pub rate_limit: RateLimit,
}

impl Default for ClientConfig {
    fn default() -> Self {
        Self {
            rpc_url: "https://api.mainnet-beta.solana.com".to_string(),
            commitment: Commitment::Confirmed,
            timeout: Duration::from_secs(30),
            retry_attempts: 3,
            rate_limit: RateLimit::default(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct RateLimit {
    pub requests_per_second: u32,
    pub burst_capacity: u32,
}

impl Default for RateLimit {
    fn default() -> Self {
        Self {
            requests_per_second: 10,
            burst_capacity: 50,
        }
    }
}
```

## Constants

```rust
pub mod constants {
    use solana_sdk::pubkey::Pubkey;
    use std::str::FromStr;
    
    /// DLMM program ID on mainnet
    pub const DLMM_PROGRAM_ID: &str = "DLMMvvDL4xnZ7GmjeTgA8XWprEGnvDR6MrCHNYc3aaJh";
    
    /// Jupiter program ID
    pub const JUPITER_PROGRAM_ID: &str = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
    
    /// Common token mints
    pub const SOL_MINT: &str = "So11111111111111111111111111111111111111112";
    pub const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    pub const USDT_MINT: &str = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
    
    /// Fee tier constants (in basis points)
    pub const FEE_TIER_LOW: u16 = 1;      // 0.01%
    pub const FEE_TIER_MEDIUM: u16 = 5;   // 0.05%
    pub const FEE_TIER_STANDARD: u16 = 30; // 0.30%
    pub const FEE_TIER_HIGH: u16 = 100;   // 1.00%
    
    /// Bin step constants
    pub const BIN_STEP_1_BPS: u16 = 1;    // 0.01% per bin
    pub const BIN_STEP_5_BPS: u16 = 5;    // 0.05% per bin
    pub const BIN_STEP_25_BPS: u16 = 25;  // 0.25% per bin
    pub const BIN_STEP_100_BPS: u16 = 100; // 1.00% per bin
    
    /// Utility functions
    pub fn get_dlmm_program_id() -> Pubkey {
        Pubkey::from_str(DLMM_PROGRAM_ID).unwrap()
    }
    
    pub fn get_jupiter_program_id() -> Pubkey {
        Pubkey::from_str(JUPITER_PROGRAM_ID).unwrap()
    }
}
```

## Type Definitions

### Common Types

```rust
/// Result type for all fees operations
#[derive(Debug)]
pub struct PositionFees {
    pub fee_x: u64,
    pub fee_y: u64,
    pub unclaimed_fee_x: u64,
    pub unclaimed_fee_y: u64,
}

/// Result type for liquidity removal
#[derive(Debug)]
pub struct RemoveLiquidityResult {
    pub amount_x: u64,
    pub amount_y: u64,
    pub signature: String,
    pub gas_cost: u64,
}

/// Result type for adding liquidity
#[derive(Debug)]
pub struct AddLiquidityResult {
    pub liquidity_added: u64,
    pub amount_x_used: u64,
    pub amount_y_used: u64,
    pub signature: String,
}

/// Result type for fee collection
#[derive(Debug)]
pub struct CollectFeesResult {
    pub fee_x_collected: u64,
    pub fee_y_collected: u64,
    pub signature: String,
}

/// Swap quote with execution details
#[derive(Debug)]
pub struct SwapQuote {
    pub input_amount: u64,
    pub output_amount: u64,
    pub minimum_output_amount: u64,
    pub price_impact: f64,
    pub fee: u64,
    pub execution_path: Vec<Pubkey>, // Pool addresses in swap route
}
```

## Macros and Helpers

### Convenience Macros

```rust
/// Macro for creating position parameters easily
#[macro_export]
macro_rules! position_params {
    (
        pool: $pool:expr,
        range: $range_pct:expr,
        capital: $capital:expr
    ) => {
        {
            let current_price = $pool.get_current_price()?;
            let lower_price = current_price * (1.0 - $range_pct);
            let upper_price = current_price * (1.0 + $range_pct);
            
            PositionParams {
                lower_bin: $pool.price_to_bin_id(lower_price)?,
                upper_bin: $pool.price_to_bin_id(upper_price)?,
                liquidity_x: $capital / 2,
                liquidity_y: $capital / 2,
                strategy_type: StrategyType::Balanced,
            }
        }
    };
}

/// Macro for error handling with context
#[macro_export]
macro_rules! dlmm_try {
    ($expr:expr, $context:expr) => {
        $expr.map_err(|e| DlmmError::OperationFailed {
            context: $context.to_string(),
            source: Box::new(e),
        })?
    };
}

/// Usage example:
/// let position = dlmm_try!(
///     client.create_position(pool_address, params).await,
///     "Failed to create liquidity position"
/// );
```

This API reference provides comprehensive coverage of all Saros Rust DLMM SDK functionality. Each function includes detailed parameter descriptions, return types, and error conditions for reliable application development.