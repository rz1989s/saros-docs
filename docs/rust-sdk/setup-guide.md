# Rust SDK Advanced Setup Guide

This comprehensive guide covers professional Rust development setup for Saros SDK applications, including workspace configuration, dependency management, and production deployment patterns.

## Development Environment Setup

### 1. Rust Toolchain Configuration

```bash
# Install latest stable Rust with component support
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install required components
rustup component add clippy rust-analyzer rust-src rustfmt
rustup target add wasm32-unknown-unknown

# Install development tools
cargo install cargo-watch cargo-expand cargo-edit cargo-audit cargo-outdated
cargo install solana-cli anchor-cli

# Verify installation
rustc --version && cargo --version && solana --version
```

### 2. IDE Configuration

#### VS Code Setup
```json
// .vscode/settings.json
{
    "rust-analyzer.checkOnSave.command": "clippy",
    "rust-analyzer.cargo.features": "all",
    "rust-analyzer.procMacro.enable": true,
    "rust-analyzer.imports.granularity.group": "module",
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
}
```

#### VS Code Extensions
```json
// .vscode/extensions.json
{
    "recommendations": [
        "rust-lang.rust-analyzer",
        "serayuzgur.crates",
        "vadimcn.vscode-lldb",
        "ms-vscode.test-adapter-converter",
        "usernamehw.errorlens"
    ]
}
```

## Cargo Workspace Configuration

### 1. Multi-Package Workspace

```toml
# Cargo.toml (workspace root)
[workspace]
resolver = "2"
members = [
    "crates/trading-bot",
    "crates/analytics-engine", 
    "crates/risk-management",
    "crates/shared-types",
    "examples/*"
]

# Shared dependencies across workspace
[workspace.dependencies]
saros-dlmm-sdk-rs = "0.1.0"
solana-sdk = "1.18.0"
solana-client = "1.18.0"
solana-program = "1.18.0"
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
spl-token = "4.0.0"
spl-associated-token-account = "2.3.0"
tokio = { version = "1.0", features = ["full", "tracing"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
anyhow = "1.0"
thiserror = "1.0"
log = "0.4"
env_logger = "0.10"
tracing = { version = "0.1", features = ["log"] }
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
dashmap = "5.5"
once_cell = "1.19"
async-trait = "0.1"
futures = "0.3"
crossbeam-channel = "0.5"
parking_lot = "0.12"
rayon = "1.8"
rand = "0.8"

# Development dependencies
[workspace.dev-dependencies]
tokio-test = "0.4"
criterion = "0.5"
proptest = "1.4"
mockall = "0.12"
tempfile = "3.8"
test-log = "0.2"

# Workspace lints and settings
[workspace.lints.rust]
unsafe_code = "forbid"
unused_extern_crates = "warn"
unused_import_braces = "warn"
unused_qualifications = "warn"

[workspace.lints.clippy]
all = "warn"
pedantic = "warn"
nursery = "warn"
cargo = "warn"
# Allow some pedantic lints that are too strict
module_name_repetitions = "allow"
missing_errors_doc = "allow"
missing_panics_doc = "allow"
```

### 2. Trading Bot Crate Configuration

```toml
# crates/trading-bot/Cargo.toml
[package]
name = "saros-trading-bot"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <your.email@example.com>"]
description = "High-performance DLMM trading bot using Saros SDK"
repository = "https://github.com/your-org/saros-trading-bot"
license = "MIT OR Apache-2.0"
keywords = ["solana", "dlmm", "trading", "defi", "saros"]
categories = ["finance", "cryptocurrency"]

[dependencies]
# Workspace dependencies
saros-dlmm-sdk-rs = { workspace = true }
solana-sdk = { workspace = true }
solana-client = { workspace = true }
tokio = { workspace = true }
serde = { workspace = true }
anyhow = { workspace = true }
log = { workspace = true }
tracing = { workspace = true }
chrono = { workspace = true }
uuid = { workspace = true }

# Additional dependencies for trading
reqwest = { version = "0.11", features = ["json", "rustls-tls"] }
tungstenite = "0.20"
tokio-tungstenite = "0.20"
ta = "0.5" # Technical analysis
rust_decimal = { version = "1.32", features = ["serde-float"] }

# Performance dependencies
ahash = "0.8"
smallvec = { version = "1.11", features = ["serde"] }
bytes = "1.5"

[dev-dependencies]
tokio-test = { workspace = true }
criterion = { workspace = true }
tempfile = { workspace = true }

# Build configuration for performance
[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
panic = "abort"
strip = true

[profile.dev]
opt-level = 1
debug = true
split-debuginfo = "unpacked"

# Benchmark profile
[profile.bench]
inherits = "release"
debug = true

[[bin]]
name = "trading-bot"
path = "src/main.rs"

[[bench]]
name = "trading_benchmarks"
harness = false
```

### 3. Shared Types Crate

```toml
# crates/shared-types/Cargo.toml
[package]
name = "saros-shared-types"
version = "0.1.0"
edition = "2021"
description = "Shared types and utilities for Saros applications"

[dependencies]
serde = { workspace = true }
solana-sdk = { workspace = true }
chrono = { workspace = true }
uuid = { workspace = true }
thiserror = { workspace = true }
anchor-lang = { workspace = true }

[features]
default = ["std"]
std = []
no-std = []
```

## Development Configuration Files

### 1. Clippy Configuration

```toml
# .clippy.toml
avoid-breaking-exported-api = false
msrv = "1.70.0"
cognitive-complexity-threshold = 30
type-complexity-threshold = 60
too-many-arguments-threshold = 8
enum-variant-names-threshold = 4
single-char-lifetime-names-threshold = 4
```

### 2. Rustfmt Configuration

```toml
# rustfmt.toml
max_width = 100
hard_tabs = false
tab_spaces = 4
newline_style = "Unix"
use_small_heuristics = "Default"
reorder_imports = true
reorder_modules = true
remove_nested_parens = true
edition = "2021"
merge_derives = true
use_try_shorthand = true
use_field_init_shorthand = true
force_explicit_abi = true
condense_wildcard_suffixes = true
color = "Auto"
unstable_features = true
format_code_in_doc_comments = true
wrap_comments = true
comment_width = 80
normalize_comments = true
normalize_doc_attributes = true
```

### 3. Development Scripts

```toml
# Create .cargo/config.toml for custom commands
[alias]
xtask = "run --manifest-path xtask/Cargo.toml --"
check-all = "clippy --workspace --all-targets --all-features -- -D warnings"
test-all = "test --workspace --all-features"
doc-all = "doc --workspace --all-features --no-deps"
build-release = "build --workspace --release"
fmt-all = "fmt --all -- --check"
audit = "audit --deny warnings"
outdated = "outdated --workspace"

# Environment variables for development
[env]
RUST_LOG = { value = "debug", relative = true }
RUST_BACKTRACE = { value = "1", relative = true }
```

## Performance Optimization Configuration

### 1. Cargo Build Optimization

```toml
# Cargo.toml optimization settings
[profile.release]
opt-level = 3          # Maximum optimization
lto = "fat"           # Link Time Optimization
codegen-units = 1     # Better optimization
rpath = false
debug = false
debug-assertions = false
overflow-checks = false
panic = "abort"       # Smaller binary size
incremental = false   # Better for release builds
strip = "symbols"     # Remove debug symbols

# Custom profile for high-frequency trading
[profile.hft]
inherits = "release"
opt-level = 3
lto = "fat"
codegen-units = 1
panic = "abort"
strip = "symbols"
# Enable aggressive optimizations
overflow-checks = false
debug-assertions = false

# Development profile optimized for fast compilation
[profile.dev]
opt-level = 1         # Basic optimization for better debug experience
debug = true
split-debuginfo = "unpacked"
incremental = true
codegen-units = 256   # Faster compilation
```

### 2. Target-Specific Configuration

```toml
# .cargo/config.toml
[build]
target-dir = "target"

# Linux optimizations
[target.x86_64-unknown-linux-gnu]
rustflags = [
    "-C", "target-cpu=native",
    "-C", "link-arg=-fuse-ld=lld",
]

# macOS optimizations  
[target.x86_64-apple-darwin]
rustflags = [
    "-C", "target-cpu=native",
]

# Windows optimizations
[target.x86_64-pc-windows-msvc]
rustflags = [
    "-C", "target-cpu=native",
]
```

## Testing Infrastructure

### 1. Comprehensive Test Configuration

```rust
// tests/common/mod.rs
use anyhow::Result;
use once_cell::sync::Lazy;
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::sync::Arc;
use tokio::sync::Mutex;

pub static TEST_CONFIG: Lazy<TestConfig> = Lazy::new(|| {
    TestConfig::new().expect("Failed to initialize test config")
});

pub static TEST_CLIENT: Lazy<Arc<Mutex<TestDlmmClient>>> = Lazy::new(|| {
    Arc::new(Mutex::new(
        TestDlmmClient::new(&TEST_CONFIG).expect("Failed to create test client")
    ))
});

#[derive(Debug, Clone)]
pub struct TestConfig {
    pub rpc_url: String,
    pub program_id: Pubkey,
    pub test_pool: Pubkey,
    pub test_tokens: TestTokens,
    pub test_wallet: Keypair,
}

#[derive(Debug, Clone)]
pub struct TestTokens {
    pub mint_x: Pubkey,
    pub mint_y: Pubkey,
    pub decimals_x: u8,
    pub decimals_y: u8,
}

impl TestConfig {
    pub fn new() -> Result<Self> {
        Ok(TestConfig {
            rpc_url: std::env::var("TEST_RPC_URL")
                .unwrap_or_else(|_| "https://api.devnet.solana.com".to_string()),
            program_id: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo".parse()?,
            test_pool: "5BHZkcKobCXvuzKsMqZiPjYmhA2KGjvNJ9Xp6sF8KP8x".parse()?,
            test_tokens: TestTokens {
                mint_x: "So11111111111111111111111111111111111111112".parse()?, // WSOL
                mint_y: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".parse()?, // USDC
                decimals_x: 9,
                decimals_y: 6,
            },
            test_wallet: Keypair::new(),
        })
    }
}

pub struct TestDlmmClient {
    // Test client implementation
}

impl TestDlmmClient {
    pub fn new(_config: &TestConfig) -> Result<Self> {
        Ok(Self {})
    }
}
```

### 2. Integration Test Suite

```rust
// tests/integration_tests.rs
use anyhow::Result;
use saros_dlmm_sdk_rs::*;
use serial_test::serial;
use test_log::test;
use tokio::time::{timeout, Duration};

mod common;
use common::*;

#[test(tokio::test)]
#[serial]
async fn test_full_trading_workflow() -> Result<()> {
    let config = &*TEST_CONFIG;
    let client = TEST_CLIENT.lock().await;

    // Test complete workflow: create position -> monitor -> close
    timeout(Duration::from_secs(30), async {
        // Load test pool
        let pool = client.load_pool(config.test_pool).await?;
        assert_eq!(pool.token_x_mint, config.test_tokens.mint_x);

        // Create position with 0.1% range
        let position_params = create_test_position_params(&pool)?;
        let position = client.create_position(config.test_pool, position_params).await?;

        // Monitor position for 5 seconds
        tokio::time::sleep(Duration::from_secs(5)).await;
        
        let updated_position = client.refresh_position(&position.address).await?;
        assert!(updated_position.liquidity_x > 0 || updated_position.liquidity_y > 0);

        // Close position
        let close_result = client.close_position(&position.address).await?;
        assert!(close_result.success);

        Ok::<(), anyhow::Error>(())
    }).await??;

    Ok(())
}

#[test(tokio::test)]
async fn test_error_handling() -> Result<()> {
    let client = TEST_CLIENT.lock().await;
    
    // Test invalid pool address
    let invalid_pool = Pubkey::new_unique();
    let result = client.load_pool(invalid_pool).await;
    assert!(result.is_err());
    
    // Test invalid position
    let invalid_position = Pubkey::new_unique();
    let result = client.refresh_position(&invalid_position).await;
    assert!(result.is_err());
    
    Ok(())
}

fn create_test_position_params(pool: &DlmmPool) -> Result<PositionParams> {
    let current_price = pool.get_current_price()?;
    let range = 0.001; // 0.1% range
    
    Ok(PositionParams {
        bin_range: BinRange {
            lower_bin: pool.price_to_bin_id(current_price * (1.0 - range))?,
            upper_bin: pool.price_to_bin_id(current_price * (1.0 + range))?,
        },
        amount_x: 100_000, // 0.0001 SOL
        amount_y: 100,     // 0.0001 USDC
        distribution: AmountDistribution::Balanced,
    })
}
```

## Production Configuration

### 1. Environment Management

```rust
// src/config/mod.rs
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::{env, fs, str::FromStr};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionConfig {
    pub environment: Environment,
    pub solana: SolanaConfig,
    pub trading: TradingConfig,
    pub monitoring: MonitoringConfig,
    pub security: SecurityConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Environment {
    Development,
    Staging,
    Production,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolanaConfig {
    pub rpc_url: String,
    pub ws_url: Option<String>,
    pub commitment: String,
    pub timeout_seconds: u64,
    pub max_retries: u32,
    pub dlmm_program_id: String,
    pub jupiter_program_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingConfig {
    pub max_position_size: f64,
    pub default_slippage: f64,
    pub max_daily_volume: f64,
    pub risk_limits: RiskLimits,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskLimits {
    pub max_drawdown_percent: f64,
    pub max_positions: u32,
    pub max_exposure_per_pool: f64,
    pub stop_loss_threshold: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    pub enable_metrics: bool,
    pub metrics_port: u16,
    pub log_level: String,
    pub alert_endpoints: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub enable_rate_limiting: bool,
    pub max_requests_per_minute: u32,
    pub require_signature_verification: bool,
    pub allowed_programs: Vec<String>,
}

impl ProductionConfig {
    pub fn load() -> Result<Self> {
        let env = env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string());
        
        let config_path = match env.as_str() {
            "production" => "config/production.toml",
            "staging" => "config/staging.toml",
            _ => "config/development.toml",
        };

        let config_content = fs::read_to_string(config_path)
            .map_err(|e| anyhow!("Failed to read config file {}: {}", config_path, e))?;

        let mut config: ProductionConfig = toml::from_str(&config_content)
            .map_err(|e| anyhow!("Failed to parse config file: {}", e))?;

        // Override with environment variables if set
        config.override_with_env()?;
        
        info!("Loaded configuration for environment: {:?}", config.environment);
        Ok(config)
    }

    fn override_with_env(&mut self) -> Result<()> {
        if let Ok(rpc_url) = env::var("SOLANA_RPC_URL") {
            self.solana.rpc_url = rpc_url;
        }
        
        if let Ok(log_level) = env::var("RUST_LOG") {
            self.monitoring.log_level = log_level;
        }
        
        if let Ok(max_positions) = env::var("MAX_POSITIONS") {
            self.trading.risk_limits.max_positions = max_positions.parse()?;
        }

        Ok(())
    }

    pub fn dlmm_program_id(&self) -> Result<Pubkey> {
        Pubkey::from_str(&self.solana.dlmm_program_id)
            .map_err(|e| anyhow!("Invalid DLMM program ID: {}", e))
    }

    pub fn jupiter_program_id(&self) -> Result<Pubkey> {
        Pubkey::from_str(&self.solana.jupiter_program_id)
            .map_err(|e| anyhow!("Invalid Jupiter program ID: {}", e))
    }
}
```

### 2. Configuration Files

```toml
# config/production.toml
environment = "Production"

[solana]
rpc_url = "https://api.mainnet-beta.solana.com"
ws_url = "wss://api.mainnet-beta.solana.com"
commitment = "confirmed"
timeout_seconds = 30
max_retries = 3
dlmm_program_id = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
jupiter_program_id = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"

[trading]
max_position_size = 1000000.0  # $1M max position
default_slippage = 0.005       # 0.5%
max_daily_volume = 10000000.0  # $10M daily limit

[trading.risk_limits]
max_drawdown_percent = 5.0     # 5% max drawdown
max_positions = 50             # Maximum 50 concurrent positions
max_exposure_per_pool = 100000.0 # $100K max per pool
stop_loss_threshold = 2.0      # 2% stop loss

[monitoring]
enable_metrics = true
metrics_port = 9090
log_level = "info"
alert_endpoints = ["https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"]

[security]
enable_rate_limiting = true
max_requests_per_minute = 1000
require_signature_verification = true
allowed_programs = [
    "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
]
```

```toml
# config/development.toml
environment = "Development"

[solana]
rpc_url = "https://api.devnet.solana.com"
ws_url = "wss://api.devnet.solana.com"
commitment = "processed"
timeout_seconds = 10
max_retries = 5
dlmm_program_id = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
jupiter_program_id = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"

[trading]
max_position_size = 1000.0     # $1K max for testing
default_slippage = 0.01        # 1%
max_daily_volume = 10000.0     # $10K daily limit

[trading.risk_limits]
max_drawdown_percent = 10.0
max_positions = 5
max_exposure_per_pool = 500.0
stop_loss_threshold = 5.0

[monitoring]
enable_metrics = true
metrics_port = 3001
log_level = "debug"
alert_endpoints = []

[security]
enable_rate_limiting = false
max_requests_per_minute = 10000
require_signature_verification = false
allowed_programs = [
    "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
]
```

## Continuous Integration Setup

### 1. GitHub Actions Configuration

```yaml
# .github/workflows/rust-ci.yml
name: Rust CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  CARGO_TERM_COLOR: always
  RUST_BACKTRACE: 1

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    strategy:
      matrix:
        rust: [stable, beta, nightly]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Install Rust
      uses: dtolnay/rust-toolchain@master
      with:
        toolchain: ${{ matrix.rust }}
        components: clippy, rustfmt
    
    - name: Cache cargo registry
      uses: actions/cache@v3
      with:
        path: |
          ~/.cargo/registry
          ~/.cargo/git
          target
        key: ${{ runner.os }}-cargo-${{ matrix.rust }}-${{ hashFiles('**/Cargo.lock') }}
    
    - name: Check formatting
      run: cargo fmt --all -- --check
    
    - name: Run clippy
      run: cargo clippy --workspace --all-targets --all-features -- -D warnings
    
    - name: Run tests
      run: cargo test --workspace --all-features --verbose
    
    - name: Run integration tests
      run: cargo test --workspace --test integration_tests
      env:
        TEST_RPC_URL: https://api.devnet.solana.com
    
    - name: Security audit
      run: |
        cargo install cargo-audit
        cargo audit
    
    - name: Check dependencies
      run: |
        cargo install cargo-outdated
        cargo outdated --exit-code 1

  benchmark:
    name: Performance Benchmarks
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Install Rust
      uses: dtolnay/rust-toolchain@stable
    
    - name: Run benchmarks
      run: cargo bench --workspace
    
    - name: Upload benchmark results
      uses: benchmark-action/github-action-benchmark@v1
      with:
        tool: 'cargo'
        output-file-path: target/criterion/*/base/benchmark.json

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Install Rust
      uses: dtolnay/rust-toolchain@stable
    
    - name: Security audit
      run: |
        cargo install cargo-audit
        cargo audit --deny warnings
    
    - name: Dependency check
      run: |
        cargo install cargo-deny
        cargo deny check
```

### 2. Pre-commit Hooks

```toml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
  
  - repo: local
    hooks:
      - id: cargo-fmt
        name: cargo fmt
        entry: cargo fmt --all --
        language: system
        types: [rust]
        pass_filenames: false
        
      - id: cargo-clippy
        name: cargo clippy
        entry: cargo clippy --workspace --all-targets --all-features -- -D warnings
        language: system
        types: [rust]
        pass_filenames: false
        
      - id: cargo-test
        name: cargo test
        entry: cargo test --workspace --all-features
        language: system
        types: [rust]
        pass_filenames: false
```

## Advanced Dependency Management

### 1. Feature Gates Configuration

```toml
# Cargo.toml features for conditional compilation
[features]
default = ["std", "devnet"]
std = []
no-std = ["heapless", "nb"]

# Network features
mainnet = []
devnet = []
testnet = []
localnet = []

# Performance features
simd = ["wide"]
parallel = ["rayon"]
async = ["tokio"]

# Monitoring features  
metrics = ["prometheus", "opentelemetry"]
tracing = ["tracing-subscriber", "tracing-opentelemetry"]
profiling = ["pprof", "jemallocator"]

# Security features
secure = ["ring", "rustls"]
audit = ["cargo-audit"]

# Development features
mock = ["mockall"]
fuzzing = ["arbitrary"]
testing = ["proptest", "quickcheck"]
```

### 2. Dependency Pinning Strategy

```toml
# Use specific versions for critical dependencies
[dependencies]
saros-dlmm-sdk-rs = "=0.1.0"    # Pin exact version
solana-sdk = "~1.18.0"          # Allow patch updates only
anchor-lang = "^0.29.0"         # Allow minor updates
tokio = "1.35"                  # Pin major.minor

# Development dependencies can be more flexible
[dev-dependencies]
criterion = "*"                 # Latest for benchmarks
proptest = "1"                  # Major version only
```

## Docker Configuration

### 1. Multi-stage Dockerfile

```dockerfile
# Dockerfile
# Build stage
FROM rust:1.75-slim as builder

WORKDIR /app

# Install dependencies for building
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better caching
COPY Cargo.toml Cargo.lock ./
COPY crates/*/Cargo.toml ./crates/

# Build dependencies (cached layer)
RUN mkdir -p src && echo "fn main() {}" > src/main.rs
RUN cargo build --release --locked
RUN rm -rf src

# Copy source code and build
COPY . .
RUN cargo build --release --locked

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/trading-bot /usr/local/bin/trading-bot

# Create non-root user
RUN useradd -r -s /bin/false trading-bot
USER trading-bot

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD trading-bot --health-check || exit 1

EXPOSE 9090

CMD ["trading-bot"]
```

### 2. Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  trading-bot:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder  # Use builder stage for development
    volumes:
      - .:/app
      - cargo-cache:/usr/local/cargo/registry
      - target-cache:/app/target
    environment:
      - RUST_ENV=development
      - RUST_LOG=debug
      - SOLANA_RPC_URL=https://api.devnet.solana.com
    ports:
      - "9090:9090"  # Metrics port
      - "3001:3001"  # Debug port
    command: cargo watch -x 'run --bin trading-bot'

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  cargo-cache:
  target-cache:
  grafana-storage:
```

## Monitoring and Observability

### 1. Metrics Configuration

```toml
# Add to main Cargo.toml
[dependencies]
prometheus = "0.13"
opentelemetry = "0.21"
opentelemetry-prometheus = "0.14"
tracing-opentelemetry = "0.22"
```

### 2. Metrics Implementation

```rust
// src/monitoring/mod.rs
use prometheus::{Counter, Gauge, Histogram, IntCounterVec, Registry};
use once_cell::sync::Lazy;
use std::time::Duration;

pub static METRICS: Lazy<Metrics> = Lazy::new(Metrics::new);

pub struct Metrics {
    pub transactions_total: IntCounterVec,
    pub active_positions: Gauge,
    pub pnl_realized: Counter,
    pub execution_time: Histogram,
    pub registry: Registry,
}

impl Metrics {
    fn new() -> Self {
        let registry = Registry::new();

        let transactions_total = IntCounterVec::new(
            prometheus::Opts::new("transactions_total", "Total number of transactions"),
            &["type", "status"]
        ).unwrap();

        let active_positions = Gauge::new(
            "active_positions", "Number of active trading positions"
        ).unwrap();

        let pnl_realized = Counter::new(
            "pnl_realized_total", "Total realized profit and loss"
        ).unwrap();

        let execution_time = Histogram::with_opts(
            prometheus::HistogramOpts::new("execution_time_seconds", "Transaction execution time")
                .buckets(vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0])
        ).unwrap();

        registry.register(Box::new(transactions_total.clone())).unwrap();
        registry.register(Box::new(active_positions.clone())).unwrap();
        registry.register(Box::new(pnl_realized.clone())).unwrap();
        registry.register(Box::new(execution_time.clone())).unwrap();

        Self {
            transactions_total,
            active_positions,
            pnl_realized,
            execution_time,
            registry,
        }
    }

    pub fn start_metrics_server(port: u16) -> Result<()> {
        use prometheus::{Encoder, TextEncoder};
        use std::net::SocketAddr;
        use warp::Filter;

        let metrics_route = warp::path("metrics")
            .map(|| {
                let encoder = TextEncoder::new();
                let metric_families = METRICS.registry.gather();
                let mut buffer = Vec::new();
                encoder.encode(&metric_families, &mut buffer).unwrap();
                String::from_utf8(buffer).unwrap()
            });

        let addr: SocketAddr = ([0, 0, 0, 0], port).into();
        
        tokio::spawn(async move {
            warp::serve(metrics_route).run(addr).await;
        });

        log::info!("Metrics server started on port {}", port);
        Ok(())
    }
}
```

## Security Configuration

### 1. Secrets Management

```rust
// src/security/secrets.rs
use anyhow::{anyhow, Result};
use serde::Deserialize;
use solana_sdk::signature::Keypair;
use std::{env, fs, path::Path};
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Debug, Zeroize, ZeroizeOnDrop)]
pub struct SecretManager {
    wallet_keypair: Vec<u8>,
    api_keys: std::collections::HashMap<String, String>,
}

impl SecretManager {
    pub fn load() -> Result<Self> {
        let mut secret_manager = Self {
            wallet_keypair: Vec::new(),
            api_keys: std::collections::HashMap::new(),
        };

        // Load wallet from secure location
        if let Ok(wallet_path) = env::var("WALLET_KEYPAIR_PATH") {
            let keypair_bytes = fs::read(&wallet_path)
                .map_err(|e| anyhow!("Failed to read wallet file {}: {}", wallet_path, e))?;
            secret_manager.wallet_keypair = keypair_bytes;
        }

        // Load API keys from environment
        for (key, value) in env::vars() {
            if key.starts_with("API_KEY_") {
                secret_manager.api_keys.insert(key, value);
            }
        }

        Ok(secret_manager)
    }

    pub fn get_wallet_keypair(&self) -> Result<Keypair> {
        if self.wallet_keypair.is_empty() {
            return Err(anyhow!("No wallet keypair loaded"));
        }
        
        Keypair::from_bytes(&self.wallet_keypair)
            .map_err(|e| anyhow!("Invalid wallet keypair: {}", e))
    }

    pub fn get_api_key(&self, service: &str) -> Option<&str> {
        let key = format!("API_KEY_{}", service.to_uppercase());
        self.api_keys.get(&key).map(|s| s.as_str())
    }
}

// Secure configuration loading
#[derive(Deserialize)]
pub struct SecureConfig {
    #[serde(skip)]
    pub wallet_keypair: Option<Keypair>,
    pub rpc_endpoints: Vec<String>,
    pub backup_endpoints: Vec<String>,
}

impl SecureConfig {
    pub fn load_secure() -> Result<Self> {
        let secret_manager = SecretManager::load()?;
        let wallet_keypair = Some(secret_manager.get_wallet_keypair()?);

        Ok(Self {
            wallet_keypair,
            rpc_endpoints: vec![
                "https://api.mainnet-beta.solana.com".to_string(),
                "https://solana-api.projectserum.com".to_string(),
            ],
            backup_endpoints: vec![
                "https://api.devnet.solana.com".to_string(),
            ],
        })
    }
}
```

### 2. Runtime Security

```rust
// src/security/runtime.rs
use std::collections::HashSet;
use solana_sdk::pubkey::Pubkey;

pub struct SecurityValidator {
    allowed_programs: HashSet<Pubkey>,
    max_transaction_size: usize,
    rate_limiter: RateLimiter,
}

impl SecurityValidator {
    pub fn new(allowed_programs: Vec<Pubkey>) -> Self {
        Self {
            allowed_programs: allowed_programs.into_iter().collect(),
            max_transaction_size: 1232, // Solana transaction size limit
            rate_limiter: RateLimiter::new(1000, Duration::from_secs(60)),
        }
    }

    pub fn validate_transaction(&self, transaction: &Transaction) -> Result<()> {
        // Check transaction size
        let serialized_size = bincode::serialized_size(transaction)?;
        if serialized_size > self.max_transaction_size as u64 {
            return Err(anyhow!("Transaction too large: {} bytes", serialized_size));
        }

        // Validate all program IDs are allowed
        for instruction in &transaction.message.instructions {
            let program_id = transaction.message.account_keys[instruction.program_id_index as usize];
            if !self.allowed_programs.contains(&program_id) {
                return Err(anyhow!("Unauthorized program: {}", program_id));
            }
        }

        // Rate limiting check
        self.rate_limiter.check_rate_limit()?;

        Ok(())
    }
}

struct RateLimiter {
    max_requests: u32,
    window: Duration,
    requests: std::sync::Mutex<Vec<std::time::Instant>>,
}

impl RateLimiter {
    fn new(max_requests: u32, window: Duration) -> Self {
        Self {
            max_requests,
            window,
            requests: std::sync::Mutex::new(Vec::new()),
        }
    }

    fn check_rate_limit(&self) -> Result<()> {
        let now = std::time::Instant::now();
        let mut requests = self.requests.lock().unwrap();
        
        // Remove old requests outside window
        requests.retain(|&time| now.duration_since(time) <= self.window);
        
        if requests.len() >= self.max_requests as usize {
            return Err(anyhow!("Rate limit exceeded"));
        }
        
        requests.push(now);
        Ok(())
    }
}
```

## Production Deployment

### 1. Systemd Service Configuration

```ini
# /etc/systemd/system/saros-trading-bot.service
[Unit]
Description=Saros Trading Bot
After=network.target
Wants=network-online.target

[Service]
Type=exec
User=trading-bot
Group=trading-bot
WorkingDirectory=/opt/saros-trading-bot
ExecStart=/opt/saros-trading-bot/bin/trading-bot
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=saros-trading-bot

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/saros-trading-bot/data

# Environment
Environment=RUST_ENV=production
Environment=RUST_LOG=info
EnvironmentFile=/opt/saros-trading-bot/config/.env

# Resource limits
MemoryMax=2G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
```

### 2. Logging Configuration

```rust
// src/logging/mod.rs
use tracing_subscriber::{
    fmt::layer,
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
    Layer,
};
use tracing_opentelemetry::OpenTelemetryLayer;

pub fn init_logging(config: &MonitoringConfig) -> Result<()> {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(&config.log_level));

    let fmt_layer = layer()
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true);

    if config.enable_metrics {
        // Production: structured logging with OpenTelemetry
        let tracer = opentelemetry_jaeger::new_agent_pipeline()
            .with_service_name("saros-trading-bot")
            .install_simple()?;
        
        let telemetry_layer = OpenTelemetryLayer::new(tracer);

        tracing_subscriber::registry()
            .with(env_filter)
            .with(fmt_layer)
            .with(telemetry_layer)
            .init();
    } else {
        // Development: simple console logging
        tracing_subscriber::registry()
            .with(env_filter)
            .with(fmt_layer)
            .init();
    }

    Ok(())
}
```

## Troubleshooting

### Common Build Issues

```bash
# Clear cargo cache if build issues persist
cargo clean
rm -rf ~/.cargo/registry/cache

# Update Rust toolchain
rustup update stable

# Regenerate Cargo.lock with latest dependencies
rm Cargo.lock
cargo build

# Fix common linking issues on Linux
sudo apt-get install build-essential pkg-config libssl-dev protobuf-compiler

# Fix common issues on macOS
brew install protobuf openssl
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig"
```

### Performance Debugging

```rust
// Add to Cargo.toml for performance profiling
[dependencies]
pprof = { version = "0.13", features = ["flamegraph", "protobuf-codec"] }

// Example profiling code
#[cfg(feature = "profiling")]
async fn profile_trading_operation() {
    let guard = pprof::ProfilerGuard::new(100).unwrap();
    
    // Your trading operation here
    execute_trading_strategy().await;
    
    if let Ok(report) = guard.report().build() {
        let file = std::fs::File::create("flamegraph.svg").unwrap();
        report.flamegraph(file).unwrap();
        println!("Flamegraph saved to flamegraph.svg");
    }
}
```

This advanced setup guide provides enterprise-grade configuration for Rust development with Saros SDK, ensuring optimal performance, security, and maintainability for production deployments.