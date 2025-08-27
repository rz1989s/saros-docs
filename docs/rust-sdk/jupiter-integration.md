# Jupiter Integration

The Saros Rust DLMM SDK integrates seamlessly with Jupiter, the leading DEX aggregator on Solana. This integration enables optimal routing through DLMM pools as part of larger swap routes.

## Why Jupiter Integration?

Jupiter integration provides:

- **Optimal Routing**: Automatically find the best swap routes including DLMM pools
- **Price Improvement**: Better execution prices through aggregation
- **Liquidity Access**: Access to deeper liquidity across all Solana DEXs
- **MEV Protection**: Advanced routing reduces front-running opportunities

## Setup

### Dependencies

```toml
[dependencies]
saros-dlmm-sdk-rs = "0.1.0"
jupiter-swap-api-client = "1.0"
solana-sdk = "1.17"
reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
```

### Configuration

```rust
// src/jupiter.rs
use jupiter_swap_api_client::{JupiterApi, QuoteRequest, SwapRequest};
use saros_dlmm_sdk_rs::{DlmmClient, DlmmQuote};
use solana_sdk::pubkey::Pubkey;
use std::sync::Arc;

pub struct JupiterDlmmIntegration {
    jupiter_api: JupiterApi,
    dlmm_client: Arc<DlmmClient>,
}

impl JupiterDlmmIntegration {
    pub fn new(
        jupiter_api_url: String,
        dlmm_client: Arc<DlmmClient>,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let jupiter_api = JupiterApi::new(jupiter_api_url)?;
        
        Ok(Self {
            jupiter_api,
            dlmm_client,
        })
    }
}
```

## Quote Comparison

Compare Jupiter aggregated quotes with direct DLMM quotes:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct RouteComparison {
    pub jupiter_quote: JupiterQuote,
    pub dlmm_quote: DlmmQuote,
    pub best_route: BestRoute,
    pub price_difference: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum BestRoute {
    Jupiter,
    DirectDlmm,
}

impl JupiterDlmmIntegration {
    pub async fn compare_routes(
        &self,
        input_mint: Pubkey,
        output_mint: Pubkey,
        amount: u64,
    ) -> Result<RouteComparison, Box<dyn std::error::Error>> {
        // Get Jupiter quote
        let jupiter_quote = self.jupiter_api.quote(QuoteRequest {
            input_mint: input_mint.to_string(),
            output_mint: output_mint.to_string(),
            amount,
            slippage_bps: Some(50), // 0.5% slippage
        }).await?;
        
        // Get direct DLMM quote
        let dlmm_quote = self.dlmm_client
            .get_swap_quote(input_mint, output_mint, amount)
            .await?;
        
        // Compare output amounts
        let jupiter_output = jupiter_quote.out_amount;
        let dlmm_output = dlmm_quote.out_amount;
        
        let best_route = if jupiter_output > dlmm_output {
            BestRoute::Jupiter
        } else {
            BestRoute::DirectDlmm
        };
        
        let price_difference = ((jupiter_output as f64 - dlmm_output as f64) 
            / jupiter_output as f64).abs() * 100.0;
        
        Ok(RouteComparison {
            jupiter_quote,
            dlmm_quote,
            best_route,
            price_difference,
        })
    }
}
```

## Intelligent Routing

Implement smart routing that chooses the best execution path:

```rust
pub struct IntelligentRouter {
    integration: JupiterDlmmIntegration,
    price_threshold: f64, // Minimum price improvement to use Jupiter
}

impl IntelligentRouter {
    pub async fn execute_optimal_swap(
        &self,
        input_mint: Pubkey,
        output_mint: Pubkey,
        amount: u64,
        user_wallet: &Keypair,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Compare routes
        let comparison = self.integration
            .compare_routes(input_mint, output_mint, amount)
            .await?;
        
        println!("Route Analysis:");
        println!("  Jupiter Output: {}", comparison.jupiter_quote.out_amount);
        println!("  DLMM Output: {}", comparison.dlmm_quote.out_amount);
        println!("  Price Difference: {:.2}%", comparison.price_difference);
        
        match comparison.best_route {
            BestRoute::Jupiter => {
                if comparison.price_difference >= self.price_threshold {
                    println!("Using Jupiter route (better price)");
                    self.execute_jupiter_swap(comparison.jupiter_quote, user_wallet).await
                } else {
                    println!("Using direct DLMM route (price difference too small)");
                    self.execute_dlmm_swap(comparison.dlmm_quote, user_wallet).await
                }
            },
            BestRoute::DirectDlmm => {
                println!("Using direct DLMM route");
                self.execute_dlmm_swap(comparison.dlmm_quote, user_wallet).await
            }
        }
    }
    
    async fn execute_jupiter_swap(
        &self,
        quote: JupiterQuote,
        user_wallet: &Keypair,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let swap_request = SwapRequest {
            user_public_key: user_wallet.pubkey().to_string(),
            quote_response: quote,
        };
        
        let swap_response = self.integration.jupiter_api
            .swap(swap_request)
            .await?;
        
        // Sign and send transaction
        let transaction = swap_response.into_versioned_transaction();
        let signature = self.integration.dlmm_client
            .sign_and_send_transaction(transaction, user_wallet)
            .await?;
        
        Ok(signature.to_string())
    }
    
    async fn execute_dlmm_swap(
        &self,
        quote: DlmmQuote,
        user_wallet: &Keypair,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let signature = self.integration.dlmm_client
            .execute_swap(quote, user_wallet)
            .await?;
        
        Ok(signature.to_string())
    }
}
```

## Advanced Jupiter Features

### Route Analysis

```rust
use jupiter_swap_api_client::Route;

impl JupiterDlmmIntegration {
    pub async fn analyze_route_composition(
        &self,
        route: &Route,
    ) -> Result<RouteAnalysis, Box<dyn std::error::Error>> {
        let mut dlmm_steps = Vec::new();
        let mut other_steps = Vec::new();
        
        for step in &route.market_infos {
            if step.amm_key == "DLMM" {
                dlmm_steps.push(DlmmRouteStep {
                    pool_address: Pubkey::from_str(&step.id)?,
                    input_mint: Pubkey::from_str(&step.input_mint)?,
                    output_mint: Pubkey::from_str(&step.output_mint)?,
                    fee_amount: step.fee_amount,
                });
            } else {
                other_steps.push(step.clone());
            }
        }
        
        Ok(RouteAnalysis {
            total_steps: route.market_infos.len(),
            dlmm_steps,
            other_steps,
            uses_saros_dlmm: !dlmm_steps.is_empty(),
        })
    }
}

#[derive(Debug)]
pub struct RouteAnalysis {
    pub total_steps: usize,
    pub dlmm_steps: Vec<DlmmRouteStep>,
    pub other_steps: Vec<jupiter_swap_api_client::MarketInfo>,
    pub uses_saros_dlmm: bool,
}

#[derive(Debug)]
pub struct DlmmRouteStep {
    pub pool_address: Pubkey,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub fee_amount: u64,
}
```

### MEV Protection

```rust
pub struct MevProtectedRouter {
    integration: JupiterDlmmIntegration,
    max_slippage: f64,
    priority_fee: u64,
}

impl MevProtectedRouter {
    pub async fn protected_swap(
        &self,
        input_mint: Pubkey,
        output_mint: Pubkey,
        amount: u64,
        user_wallet: &Keypair,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Get quotes with tight slippage
        let mut quote_request = QuoteRequest {
            input_mint: input_mint.to_string(),
            output_mint: output_mint.to_string(),
            amount,
            slippage_bps: Some((self.max_slippage * 10000.0) as u64),
        };
        
        // Add MEV protection parameters
        quote_request.only_direct_routes = Some(true); // Prefer direct routes
        quote_request.as_legacy_transaction = Some(false); // Use versioned transactions
        
        let quote = self.integration.jupiter_api
            .quote(quote_request)
            .await?;
        
        // Execute with priority fee
        let swap_request = SwapRequest {
            user_public_key: user_wallet.pubkey().to_string(),
            quote_response: quote,
            compute_unit_price_micro_lamports: Some(self.priority_fee),
        };
        
        let swap_response = self.integration.jupiter_api
            .swap(swap_request)
            .await?;
        
        // Quick execution to minimize MEV exposure
        let transaction = swap_response.into_versioned_transaction();
        let signature = self.integration.dlmm_client
            .sign_and_send_transaction_with_confirmation(transaction, user_wallet)
            .await?;
        
        Ok(signature.to_string())
    }
}
```

## Performance Monitoring

```rust
use std::time::Instant;

pub struct PerformanceMonitor {
    route_timings: std::collections::HashMap<String, Vec<std::time::Duration>>,
}

impl PerformanceMonitor {
    pub async fn benchmark_routes(
        &mut self,
        integration: &JupiterDlmmIntegration,
        test_pairs: Vec<(Pubkey, Pubkey, u64)>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        for (input_mint, output_mint, amount) in test_pairs {
            // Time Jupiter route
            let start = Instant::now();
            let jupiter_quote = integration.jupiter_api.quote(QuoteRequest {
                input_mint: input_mint.to_string(),
                output_mint: output_mint.to_string(),
                amount,
                slippage_bps: Some(50),
            }).await?;
            let jupiter_time = start.elapsed();
            
            // Time DLMM route
            let start = Instant::now();
            let dlmm_quote = integration.dlmm_client
                .get_swap_quote(input_mint, output_mint, amount)
                .await?;
            let dlmm_time = start.elapsed();
            
            // Record timings
            self.route_timings
                .entry("jupiter".to_string())
                .or_insert_with(Vec::new)
                .push(jupiter_time);
                
            self.route_timings
                .entry("dlmm".to_string())
                .or_insert_with(Vec::new)
                .push(dlmm_time);
            
            println!("Route Performance:");
            println!("  Jupiter: {:.2}ms", jupiter_time.as_millis());
            println!("  DLMM: {:.2}ms", dlmm_time.as_millis());
        }
        
        Ok(())
    }
}
```

## Real-World Example: Arbitrage Bot

```rust
pub struct ArbitrageBot {
    router: IntelligentRouter,
    monitor: PerformanceMonitor,
    wallet: Keypair,
    min_profit_threshold: u64,
}

impl ArbitrageBot {
    pub async fn scan_opportunities(
        &self,
        token_pairs: Vec<(Pubkey, Pubkey)>,
    ) -> Result<Vec<ArbitrageOpportunity>, Box<dyn std::error::Error>> {
        let mut opportunities = Vec::new();
        
        for (token_a, token_b) in token_pairs {
            // Check both directions for arbitrage
            let forward_comparison = self.router.integration
                .compare_routes(token_a, token_b, 1_000_000)
                .await?;
                
            let reverse_comparison = self.router.integration
                .compare_routes(token_b, token_a, forward_comparison.jupiter_quote.out_amount)
                .await?;
            
            // Calculate potential profit
            let profit = reverse_comparison.jupiter_quote.out_amount as i64 - 1_000_000;
            
            if profit > self.min_profit_threshold as i64 {
                opportunities.push(ArbitrageOpportunity {
                    token_pair: (token_a, token_b),
                    estimated_profit: profit as u64,
                    forward_route: forward_comparison,
                    reverse_route: reverse_comparison,
                });
            }
        }
        
        Ok(opportunities)
    }
    
    pub async fn execute_arbitrage(
        &self,
        opportunity: ArbitrageOpportunity,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Execute forward swap
        let forward_signature = self.router
            .execute_optimal_swap(
                opportunity.token_pair.0,
                opportunity.token_pair.1,
                1_000_000,
                &self.wallet,
            )
            .await?;
            
        println!("Forward swap executed: {}", forward_signature);
        
        // Wait for confirmation
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        
        // Execute reverse swap
        let reverse_signature = self.router
            .execute_optimal_swap(
                opportunity.token_pair.1,
                opportunity.token_pair.0,
                opportunity.forward_route.jupiter_quote.out_amount,
                &self.wallet,
            )
            .await?;
            
        println!("Reverse swap executed: {}", reverse_signature);
        println!("Arbitrage completed with profit: {}", opportunity.estimated_profit);
        
        Ok(reverse_signature)
    }
}

#[derive(Debug)]
pub struct ArbitrageOpportunity {
    pub token_pair: (Pubkey, Pubkey),
    pub estimated_profit: u64,
    pub forward_route: RouteComparison,
    pub reverse_route: RouteComparison,
}
```

## Custom Market Data Integration

Integrate with Jupiter's market data APIs:

```rust
use reqwest::Client;
use serde_json::Value;

pub struct MarketDataProvider {
    http_client: Client,
    jupiter_api_base: String,
}

impl MarketDataProvider {
    pub async fn get_top_tokens_by_volume(&self) -> Result<Vec<TokenInfo>, Box<dyn std::error::Error>> {
        let url = format!("{}/stats/top-tokens", self.jupiter_api_base);
        let response: Value = self.http_client
            .get(&url)
            .send()
            .await?
            .json()
            .await?;
        
        let tokens = response["data"]
            .as_array()
            .ok_or("Invalid response format")?
            .iter()
            .take(20)
            .map(|token| TokenInfo {
                mint: Pubkey::from_str(token["mint"].as_str().unwrap()).unwrap(),
                symbol: token["symbol"].as_str().unwrap().to_string(),
                volume_24h: token["volume24h"].as_u64().unwrap_or(0),
            })
            .collect();
        
        Ok(tokens)
    }
    
    pub async fn get_price_data(
        &self,
        mint: Pubkey,
    ) -> Result<TokenPrice, Box<dyn std::error::Error>> {
        let url = format!("{}/price?ids={}", self.jupiter_api_base, mint);
        let response: Value = self.http_client
            .get(&url)
            .send()
            .await?
            .json()
            .await?;
        
        let price_data = &response["data"][mint.to_string()];
        
        Ok(TokenPrice {
            mint,
            price: price_data["price"].as_f64().unwrap_or(0.0),
            price_change_24h: price_data["priceChange24h"].as_f64().unwrap_or(0.0),
            volume_24h: price_data["volume24h"].as_u64().unwrap_or(0),
        })
    }
}

#[derive(Debug)]
pub struct TokenInfo {
    pub mint: Pubkey,
    pub symbol: String,
    pub volume_24h: u64,
}

#[derive(Debug)]
pub struct TokenPrice {
    pub mint: Pubkey,
    pub price: f64,
    pub price_change_24h: f64,
    pub volume_24h: u64,
}
```

## Real-Time Price Monitoring

Monitor prices across Jupiter and DLMM for opportunities:

```rust
use tokio::time::{interval, Duration};
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct PriceMonitor {
    integration: Arc<JupiterDlmmIntegration>,
    price_cache: Arc<RwLock<std::collections::HashMap<String, f64>>>,
    watched_pairs: Vec<(Pubkey, Pubkey)>,
}

impl PriceMonitor {
    pub async fn start_monitoring(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut price_interval = interval(Duration::from_secs(1));
        
        loop {
            price_interval.tick().await;
            
            for (token_a, token_b) in &self.watched_pairs {
                match self.update_pair_prices(*token_a, *token_b).await {
                    Ok(price_info) => {
                        let key = format!("{}-{}", token_a, token_b);
                        let mut cache = self.price_cache.write().await;
                        cache.insert(key, price_info.current_price);
                        
                        // Check for arbitrage opportunities
                        if price_info.spread > 0.001 { // 0.1% threshold
                            println!("Arbitrage opportunity detected: {:.4}% spread", 
                                price_info.spread * 100.0);
                        }
                    },
                    Err(e) => {
                        eprintln!("Error updating prices for {}-{}: {:?}", token_a, token_b, e);
                    }
                }
            }
        }
    }
    
    async fn update_pair_prices(
        &self,
        token_a: Pubkey,
        token_b: Pubkey,
    ) -> Result<PriceInfo, Box<dyn std::error::Error>> {
        let comparison = self.integration
            .compare_routes(token_a, token_b, 1_000_000)
            .await?;
        
        let jupiter_rate = comparison.jupiter_quote.out_amount as f64 / 1_000_000.0;
        let dlmm_rate = comparison.dlmm_quote.out_amount as f64 / 1_000_000.0;
        
        Ok(PriceInfo {
            current_price: jupiter_rate,
            spread: (jupiter_rate - dlmm_rate).abs() / jupiter_rate,
            last_update: std::time::SystemTime::now(),
        })
    }
}

#[derive(Debug)]
pub struct PriceInfo {
    pub current_price: f64,
    pub spread: f64,
    pub last_update: std::time::SystemTime,
}
```

## Error Handling and Resilience

```rust
use jupiter_swap_api_client::JupiterError;
use saros_dlmm_sdk_rs::error::DlmmError;

#[derive(Debug)]
pub enum IntegrationError {
    JupiterApi(JupiterError),
    DlmmSdk(DlmmError),
    NetworkTimeout,
    InsufficientLiquidity,
    SlippageTooHigh,
}

impl From<JupiterError> for IntegrationError {
    fn from(err: JupiterError) -> Self {
        IntegrationError::JupiterApi(err)
    }
}

impl From<DlmmError> for IntegrationError {
    fn from(err: DlmmError) -> Self {
        IntegrationError::DlmmSdk(err)
    }
}

pub struct ResilientRouter {
    integration: JupiterDlmmIntegration,
    retry_attempts: usize,
    fallback_to_dlmm: bool,
}

impl ResilientRouter {
    pub async fn execute_with_fallback(
        &self,
        input_mint: Pubkey,
        output_mint: Pubkey,
        amount: u64,
        user_wallet: &Keypair,
    ) -> Result<String, IntegrationError> {
        for attempt in 0..self.retry_attempts {
            match self.try_jupiter_route(input_mint, output_mint, amount, user_wallet).await {
                Ok(signature) => return Ok(signature),
                Err(IntegrationError::JupiterApi(_)) if self.fallback_to_dlmm => {
                    println!("Jupiter failed on attempt {}, trying DLMM fallback", attempt + 1);
                    return self.try_dlmm_route(input_mint, output_mint, amount, user_wallet).await;
                },
                Err(e) if attempt < self.retry_attempts - 1 => {
                    println!("Attempt {} failed: {:?}, retrying...", attempt + 1, e);
                    tokio::time::sleep(Duration::from_millis(1000 * (attempt + 1) as u64)).await;
                },
                Err(e) => return Err(e),
            }
        }
        
        Err(IntegrationError::NetworkTimeout)
    }
}
```

The Jupiter integration provides powerful routing capabilities while maintaining the precision and efficiency of direct DLMM operations. Use it to build sophisticated DeFi applications that leverage the best of both worlds.