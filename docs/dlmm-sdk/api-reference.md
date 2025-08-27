# DLMM API Reference

Complete API reference for the Saros DLMM TypeScript SDK (`@saros-finance/dlmm-sdk`).

## Core Classes

### `DLMMPool`

Main class for interacting with DLMM pools.

#### Constructor & Loading

```typescript
class DLMMPool {
  static async load(
    connection: Connection,
    poolAddress: PublicKey
  ): Promise<DLMMPool>
}
```

**Example**:
```typescript
const pool = await DLMMPool.load(connection, new PublicKey(poolAddress));
```

#### Properties

```typescript
interface DLMMPool {
  readonly poolAddress: PublicKey;
  readonly tokenX: TokenInfo;
  readonly tokenY: TokenInfo;
  readonly activeId: number;        // Current active bin ID
  readonly feeTier: number;         // Fee in basis points
  readonly binStep: number;         // Price step between bins
  readonly connection: Connection;
}
```

#### Methods

##### `getCurrentPrice()`

```typescript
getCurrentPrice(): number
```

Returns the current trading price (tokenY per tokenX).

##### `getBinIdFromPrice()`

```typescript
getBinIdFromPrice(price: number): number
```

Converts a price to the corresponding bin ID.

##### `getPriceFromBinId()`

```typescript
getPriceFromBinId(binId: number): number
```

Converts a bin ID to its corresponding price.

##### `getBinLiquidity()`

```typescript
async getBinLiquidity(binId: number): Promise<BinLiquidity>
```

**Returns**:
```typescript
interface BinLiquidity {
  binId: number;
  liquidityX: number;
  liquidityY: number;
  price: number;
  feeX: number;
  feeY: number;
}
```

##### `getActiveBins()`

```typescript
async getActiveBins(range?: number): Promise<BinLiquidity[]>
```

Returns bins with liquidity around the current active bin.

##### `refresh()`

```typescript
async refresh(): Promise<void>
```

Updates pool state from blockchain.

---

### `LiquidityPosition`

Class representing a liquidity position in a DLMM pool.

#### Creation

```typescript
async function createPosition(params: PositionParameters): Promise<LiquidityPosition>

interface PositionParameters {
  pool: DLMMPool;
  lowerBinId: number;
  upperBinId: number;
  tokenXAmount: number;
  tokenYAmount: number;
  wallet: PublicKey;
  slippageTolerance: number;
}
```

#### Properties

```typescript
interface LiquidityPosition {
  readonly positionId: string;
  readonly pool: DLMMPool;
  readonly lowerBinId: number;
  readonly upperBinId: number;
  readonly walletAddress: string;
  readonly createdAt: Date;
}
```

#### Methods

##### `getPriceRange()`

```typescript
getPriceRange(): { lower: number; upper: number }
```

Returns the position's price range.

##### `getCurrentAmounts()`

```typescript
async getCurrentAmounts(): Promise<{ tokenX: number; tokenY: number }>
```

Returns current token amounts in the position.

##### `getTotalValue()`

```typescript
async getTotalValue(): Promise<number>
```

Returns total position value in USD.

##### `getAccumulatedFees()`

```typescript
async getAccumulatedFees(): Promise<{ tokenX: number; tokenY: number; total: number }>
```

Returns accumulated but uncollected fees.

##### `isActive()`

```typescript
isActive(): boolean
```

Returns true if current price is within position range.

##### `addLiquidity()`

```typescript
async addLiquidity(params: {
  tokenXAmount: number;
  tokenYAmount: number;
  slippageTolerance: number;
}): Promise<TransactionResult>
```

##### `removeLiquidity()`

```typescript
async removeLiquidity(
  percentage: number
): Promise<{ tokenX: number; tokenY: number }>
```

Remove liquidity from position (percentage: 0.0 to 1.0).

##### `collectFees()`

```typescript
async collectFees(): Promise<{ tokenX: number; tokenY: number }>
```

Collect accumulated fees to wallet.

##### `close()`

```typescript
async close(): Promise<{ tokenX: number; tokenY: number }>
```

Close position completely (remove all liquidity and collect fees).

---

## Utility Functions

### Price and Bin Calculations

```typescript
// Calculate bin price from bin ID
function calculateBinPrice(binId: number, binStep: number): number {
  return Math.pow(1 + binStep / 10000, binId);
}

// Find bin ID for target price
function findBinId(targetPrice: number, binStep: number): number {
  return Math.floor(Math.log(targetPrice) / Math.log(1 + binStep / 10000));
}

// Calculate number of bins in a price range
function calculateBinCount(
  lowerPrice: number,
  upperPrice: number,
  binStep: number
): number {
  const lowerBinId = findBinId(lowerPrice, binStep);
  const upperBinId = findBinId(upperPrice, binStep);
  return upperBinId - lowerBinId + 1;
}
```

### Liquidity Distribution

```typescript
// Calculate optimal token distribution for a range
function calculateTokenDistribution(
  lowerPrice: number,
  upperPrice: number,
  currentPrice: number,
  totalValueUSD: number
): { tokenX: number; tokenY: number } {
  
  if (currentPrice <= lowerPrice) {
    // Price below range - all token Y
    return {
      tokenX: 0,
      tokenY: totalValueUSD
    };
  }
  
  if (currentPrice >= upperPrice) {
    // Price above range - all token X
    return {
      tokenX: totalValueUSD / currentPrice,
      tokenY: 0
    };
  }
  
  // Price in range - calculate optimal distribution
  const sqrt_lower = Math.sqrt(lowerPrice);
  const sqrt_current = Math.sqrt(currentPrice);
  const sqrt_upper = Math.sqrt(upperPrice);
  
  const deltaL = 1; // Normalized liquidity amount
  
  const tokenY = deltaL * (sqrt_current - sqrt_lower);
  const tokenX = deltaL * (1/sqrt_lower - 1/sqrt_upper);
  
  const totalValue = tokenX * currentPrice + tokenY;
  const valueRatio = totalValueUSD / totalValue;
  
  return {
    tokenX: tokenX * valueRatio,
    tokenY: tokenY * valueRatio
  };
}
```

### Fee Calculations

```typescript
// Calculate expected fees for a position
function calculateExpectedFees(
  liquidityProvided: number,    // Liquidity amount
  tradingVolume: number,        // Expected trading volume
  feeTier: number,             // Pool fee tier (basis points)
  marketShare: number          // Position's share of pool liquidity
): number {
  const feeRate = feeTier / 10000; // Convert basis points to decimal
  const positionVolume = tradingVolume * marketShare;
  return positionVolume * feeRate;
}

// Calculate APR from fees
function calculateFeeAPR(
  feesEarnedUSD: number,
  positionValueUSD: number,
  timeframeDays: number
): number {
  const annualizedFees = feesEarnedUSD * (365 / timeframeDays);
  return (annualizedFees / positionValueUSD) * 100;
}

// Calculate break-even time for position
function calculateBreakEvenTime(
  positionValueUSD: number,
  dailyFeeRate: number,
  impermanentLossPercent: number
): number {
  // Days needed for fees to offset impermanent loss
  const impermanentLossUSD = positionValueUSD * (Math.abs(impermanentLossPercent) / 100);
  return impermanentLossUSD / dailyFeeRate;
}
```

## Advanced APIs

### Batch Operations

```typescript
// Execute multiple position operations atomically
async function batchPositionOperations(
  operations: PositionOperation[],
  walletAddress: string
): Promise<BatchResult> {
  
  const results: OperationResult[] = [];
  let successCount = 0;
  
  for (const operation of operations) {
    try {
      let result: any;
      
      switch (operation.type) {
        case 'create':
          result = await createPosition(operation.params);
          break;
        case 'add_liquidity':
          result = await operation.position.addLiquidity(operation.params);
          break;
        case 'remove_liquidity':
          result = await operation.position.removeLiquidity(operation.params.percentage);
          break;
        case 'collect_fees':
          result = await operation.position.collectFees();
          break;
        case 'close':
          result = await operation.position.close();
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
      
      results.push({
        operation: operation.type,
        success: true,
        result
      });
      successCount++;
      
    } catch (error) {
      results.push({
        operation: operation.type,
        success: false,
        error: error.message
      });
    }
  }
  
  return {
    totalOperations: operations.length,
    successful: successCount,
    failed: operations.length - successCount,
    results
  };
}

interface PositionOperation {
  type: 'create' | 'add_liquidity' | 'remove_liquidity' | 'collect_fees' | 'close';
  position?: LiquidityPosition;
  params: any;
}
```

### Position Analytics API

```typescript
class PositionAnalyticsAPI {
  async getPositionMetrics(
    positionId: string,
    timeframe: '1d' | '7d' | '30d' | '90d' = '7d'
  ): Promise<DetailedMetrics> {
    
    const position = await LiquidityPosition.load(connection, new PublicKey(positionId));
    const days = this.timeframeToDays(timeframe);
    
    return {
      basic: {
        positionId,
        currentValue: await position.getTotalValue(),
        feesEarned: await position.getAccumulatedFees(),
        isActive: position.isActive(),
        ageInDays: position.getAgeInDays()
      },
      performance: {
        feeAPR: await this.calculateFeeAPR(position, days),
        impermanentLoss: await this.calculateIL(position),
        totalReturn: await this.calculateTotalReturn(position),
        sharpeRatio: await this.calculateSharpeRatio(position, days),
        maxDrawdown: await this.calculateMaxDrawdown(position, days)
      },
      utilization: {
        timeInRange: await this.calculateTimeInRange(position, days),
        capitalEfficiency: await this.calculateCapitalEfficiency(position),
        volumeCapture: await this.calculateVolumeCapture(position, days)
      },
      risk: {
        volatilityExposure: await this.calculateVolatilityExposure(position),
        concentrationRisk: this.calculateConcentrationRisk(position),
        liquidityRisk: await this.calculateLiquidityRisk(position)
      }
    };
  }

  private timeframeToDays(timeframe: string): number {
    switch (timeframe) {
      case '1d': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  }

  // Implement calculation methods...
}

interface DetailedMetrics {
  basic: {
    positionId: string;
    currentValue: number;
    feesEarned: { tokenX: number; tokenY: number; total: number };
    isActive: boolean;
    ageInDays: number;
  };
  performance: {
    feeAPR: number;
    impermanentLoss: number;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  utilization: {
    timeInRange: number;
    capitalEfficiency: number;
    volumeCapture: number;
  };
  risk: {
    volatilityExposure: number;
    concentrationRisk: number;
    liquidityRisk: number;
  };
}
```

## Error Handling

### DLMM-Specific Errors

```typescript
enum DLMMErrorCode {
  INVALID_BIN_RANGE = 'INVALID_BIN_RANGE',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  POSITION_NOT_FOUND = 'POSITION_NOT_FOUND',
  BIN_NOT_ACTIVE = 'BIN_NOT_ACTIVE',
  PRICE_OUT_OF_RANGE = 'PRICE_OUT_OF_RANGE',
  SLIPPAGE_EXCEEDED = 'SLIPPAGE_EXCEEDED',
  MINIMUM_LIQUIDITY = 'MINIMUM_LIQUIDITY'
}

class DLMMError extends Error {
  constructor(
    public code: DLMMErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DLMMError';
  }
}

// Error handler utility
function handleDLMMError(error: any): never {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('invalid bin') || message.includes('invalid range')) {
    throw new DLMMError(
      DLMMErrorCode.INVALID_BIN_RANGE,
      'Invalid bin range specified',
      { originalError: error.message }
    );
  }
  
  if (message.includes('insufficient liquidity')) {
    throw new DLMMError(
      DLMMErrorCode.INSUFFICIENT_LIQUIDITY,
      'Insufficient liquidity for operation',
      { originalError: error.message }
    );
  }
  
  if (message.includes('position not found')) {
    throw new DLMMError(
      DLMMErrorCode.POSITION_NOT_FOUND,
      'Liquidity position not found',
      { originalError: error.message }
    );
  }
  
  // Default error handling
  throw new DLMMError(
    DLMMErrorCode.PRICE_OUT_OF_RANGE,
    `DLMM operation failed: ${error.message}`,
    { originalError: error.message }
  );
}
```

## Event Monitoring

### Position Event Listeners

```typescript
interface PositionEvent {
  type: 'liquidity_added' | 'liquidity_removed' | 'fees_collected' | 'price_moved';
  positionId: string;
  timestamp: number;
  data: any;
}

class PositionEventListener {
  private subscriptions: Map<string, number> = new Map();
  private eventHandlers: Map<string, (event: PositionEvent) => void> = new Map();

  async subscribeToPosition(
    positionId: string,
    handler: (event: PositionEvent) => void
  ): Promise<void> {
    
    // Subscribe to position account changes
    const subscriptionId = this.connection.onAccountChange(
      new PublicKey(positionId),
      (accountInfo, context) => {
        const event = this.parsePositionEvent(positionId, accountInfo, context);
        if (event) {
          handler(event);
        }
      },
      'confirmed'
    );

    this.subscriptions.set(positionId, subscriptionId);
    this.eventHandlers.set(positionId, handler);
  }

  async subscribeToPoolPrice(
    poolAddress: string,
    handler: (priceEvent: PriceEvent) => void
  ): Promise<void> {
    
    const subscriptionId = this.connection.onAccountChange(
      new PublicKey(poolAddress),
      (accountInfo, context) => {
        const priceEvent = this.parsePoolEvent(poolAddress, accountInfo, context);
        if (priceEvent) {
          handler(priceEvent);
        }
      },
      'confirmed'
    );

    this.subscriptions.set(`pool_${poolAddress}`, subscriptionId);
  }

  unsubscribe(identifier: string): void {
    const subscriptionId = this.subscriptions.get(identifier);
    if (subscriptionId !== undefined) {
      this.connection.removeAccountChangeListener(subscriptionId);
      this.subscriptions.delete(identifier);
      this.eventHandlers.delete(identifier);
    }
  }

  unsubscribeAll(): void {
    for (const [identifier] of this.subscriptions) {
      this.unsubscribe(identifier);
    }
  }

  private parsePositionEvent(
    positionId: string,
    accountInfo: AccountInfo<Buffer>,
    context: Context
  ): PositionEvent | null {
    // Parse account data to determine what changed
    // Implementation depends on position account structure
    
    return {
      type: 'liquidity_added', // Determine actual event type
      positionId,
      timestamp: Date.now(),
      data: {
        slot: context.slot,
        // Additional event data
      }
    };
  }

  private parsePoolEvent(
    poolAddress: string,
    accountInfo: AccountInfo<Buffer>,
    context: Context
  ): PriceEvent | null {
    // Parse pool account to extract price changes
    
    return {
      type: 'price_changed',
      poolAddress,
      timestamp: Date.now(),
      data: {
        newPrice: 0, // Extract from account data
        activeId: 0, // Extract active bin ID
        slot: context.slot
      }
    };
  }
}

interface PriceEvent {
  type: 'price_changed' | 'active_bin_changed';
  poolAddress: string;
  timestamp: number;
  data: {
    newPrice?: number;
    activeId?: number;
    slot: number;
  };
}
```

## Testing Utilities

### Mock DLMM Environment

```typescript
// Testing utilities for DLMM positions
export class MockDLMMPool extends DLMMPool {
  private mockPrice: number;
  private mockActiveBin: number;

  constructor(
    poolAddress: PublicKey,
    tokenX: TokenInfo,
    tokenY: TokenInfo,
    initialPrice: number
  ) {
    super(); // Initialize base class
    this.mockPrice = initialPrice;
    this.mockActiveBin = this.getBinIdFromPrice(initialPrice);
  }

  // Override methods for testing
  getCurrentPrice(): number {
    return this.mockPrice;
  }

  setMockPrice(newPrice: number): void {
    this.mockPrice = newPrice;
    this.mockActiveBin = this.getBinIdFromPrice(newPrice);
  }

  async simulatePriceMovement(
    priceChanges: Array<{ price: number; volumeMultiplier: number }>,
    position: LiquidityPosition
  ): Promise<SimulationResult> {
    
    let totalFees = 0;
    let timeInRange = 0;
    
    for (const change of priceChanges) {
      this.setMockPrice(change.price);
      
      const range = position.getPriceRange();
      const isInRange = change.price >= range.lower && change.price <= range.upper;
      
      if (isInRange) {
        timeInRange += 1;
        
        // Simulate fee accumulation
        const baseFees = this.calculateBaseFees(position);
        totalFees += baseFees * change.volumeMultiplier;
      }
    }
    
    return {
      totalFeesEarned: totalFees,
      timeInRangePercent: (timeInRange / priceChanges.length) * 100,
      finalPrice: this.mockPrice,
      impermanentLoss: this.calculateFinalIL(position, priceChanges[0].price, this.mockPrice)
    };
  }

  private calculateBaseFees(position: LiquidityPosition): number {
    // Simulate fee generation based on position characteristics
    const liquidityShare = position.getLiquidityShare();
    const poolFeeRate = this.feeTier / 10000;
    const estimatedVolume = 10000; // Mock daily volume
    
    return (estimatedVolume * poolFeeRate * liquidityShare) / 24; // Hourly fees
  }
}
```

### Position Testing Framework

```typescript
// Test framework for position strategies
export class PositionTester {
  private scenarios: TestScenario[] = [];

  addScenario(scenario: TestScenario): void {
    this.scenarios.push(scenario);
  }

  async runAllTests(
    positionConfig: PositionConfig,
    pool: DLMMPool
  ): Promise<TestResults> {
    
    const results: ScenarioResult[] = [];
    
    for (const scenario of this.scenarios) {
      console.log(`Running scenario: ${scenario.name}`);
      
      try {
        const result = await this.runScenario(scenario, positionConfig, pool);
        results.push({
          scenario: scenario.name,
          success: true,
          metrics: result
        });
      } catch (error) {
        results.push({
          scenario: scenario.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      totalScenarios: this.scenarios.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  private async runScenario(
    scenario: TestScenario,
    config: PositionConfig,
    pool: DLMMPool
  ): Promise<ScenarioMetrics> {
    
    // Create mock position
    const mockPool = new MockDLMMPool(
      pool.poolAddress,
      pool.tokenX,
      pool.tokenY,
      scenario.initialPrice
    );
    
    const position = await this.createMockPosition(config, mockPool);
    
    // Run price simulation
    const simulation = await mockPool.simulatePriceMovement(
      scenario.priceMovements,
      position
    );
    
    return {
      finalValue: simulation.finalPrice * position.getCurrentAmounts().tokenX + 
                 position.getCurrentAmounts().tokenY,
      totalFees: simulation.totalFeesEarned,
      maxDrawdown: this.calculateMaxDrawdown(scenario.priceMovements, config),
      utilization: simulation.timeInRangePercent,
      sharpeRatio: this.calculateSharpeRatio(simulation)
    };
  }
}

interface TestScenario {
  name: string;
  description: string;
  initialPrice: number;
  priceMovements: Array<{ price: number; volumeMultiplier: number }>;
  expectedOutcome: 'profit' | 'loss' | 'neutral';
}

interface ScenarioMetrics {
  finalValue: number;
  totalFees: number;
  maxDrawdown: number;
  utilization: number;
  sharpeRatio: number;
}
```

## Constants and Configuration

### Default Configuration

```typescript
export const DLMM_DEFAULTS = {
  SLIPPAGE_TOLERANCE: 0.01,    // 1%
  MIN_POSITION_SIZE: 100,      // $100
  MAX_POSITION_SIZE: 1000000,  // $1M
  DEFAULT_RANGE_PERCENT: 10,   // ±10%
  FEE_COLLECTION_THRESHOLD: 1, // $1
  MAX_GAS_COST_RATIO: 0.1,     // 10% of fees
  
  BIN_STEPS: {
    STABLE: 1,     // 0.01% per bin
    LOW: 10,       // 0.1% per bin  
    MEDIUM: 60,    // 0.6% per bin
    HIGH: 200      // 2% per bin
  },
  
  FEE_TIERS: {
    STABLE: 1,     // 0.01%
    LOW: 5,        // 0.05%
    MEDIUM: 30,    // 0.3%
    HIGH: 100      // 1%
  }
} as const;
```

### Validation Functions

```typescript
function validatePositionParameters(params: PositionParameters): void {
  // Validate bin range
  if (params.lowerBinId >= params.upperBinId) {
    throw new DLMMError(
      DLMMErrorCode.INVALID_BIN_RANGE,
      'Lower bin ID must be less than upper bin ID'
    );
  }
  
  // Validate amounts
  if (params.tokenXAmount < 0 || params.tokenYAmount < 0) {
    throw new DLMMError(
      DLMMErrorCode.INSUFFICIENT_LIQUIDITY,
      'Token amounts must be positive'
    );
  }
  
  // Validate slippage
  if (params.slippageTolerance < 0 || params.slippageTolerance > 1) {
    throw new Error('Slippage tolerance must be between 0 and 1');
  }
  
  // Validate position size
  const totalValue = params.tokenXAmount * params.pool.getCurrentPrice() + params.tokenYAmount;
  if (totalValue < DLMM_DEFAULTS.MIN_POSITION_SIZE) {
    throw new DLMMError(
      DLMMErrorCode.MINIMUM_LIQUIDITY,
      `Position value $${totalValue} below minimum $${DLMM_DEFAULTS.MIN_POSITION_SIZE}`
    );
  }
}

function validatePriceRange(
  lowerPrice: number,
  upperPrice: number,
  currentPrice: number
): void {
  if (lowerPrice >= upperPrice) {
    throw new Error('Lower price must be less than upper price');
  }
  
  if (lowerPrice <= 0 || upperPrice <= 0) {
    throw new Error('Prices must be positive');
  }
  
  // Warn if range is extremely wide or narrow
  const rangePercent = ((upperPrice - lowerPrice) / currentPrice) * 100;
  
  if (rangePercent > 200) {
    console.warn(`Very wide range detected: ${rangePercent.toFixed(1)}% - consider narrowing for better capital efficiency`);
  }
  
  if (rangePercent < 1) {
    console.warn(`Very narrow range detected: ${rangePercent.toFixed(2)}% - high rebalancing risk`);
  }
}
```

## Performance Optimization

### Efficient Data Fetching

```typescript
class DLMMDataManager {
  private poolCache: Map<string, { pool: DLMMPool; timestamp: number }> = new Map();
  private positionCache: Map<string, { position: LiquidityPosition; timestamp: number }> = new Map();
  private cacheDuration = 30000; // 30 seconds

  async getPool(poolAddress: string): Promise<DLMMPool> {
    const cached = this.poolCache.get(poolAddress);
    
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.pool;
    }
    
    const pool = await DLMMPool.load(this.connection, new PublicKey(poolAddress));
    this.poolCache.set(poolAddress, { pool, timestamp: Date.now() });
    
    return pool;
  }

  async batchLoadPositions(positionIds: string[]): Promise<LiquidityPosition[]> {
    const batchSize = 10; // Load in batches to avoid rate limits
    const positions: LiquidityPosition[] = [];
    
    for (let i = 0; i < positionIds.length; i += batchSize) {
      const batch = positionIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (id) => {
        const cached = this.positionCache.get(id);
        
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
          return cached.position;
        }
        
        const position = await LiquidityPosition.load(this.connection, new PublicKey(id));
        this.positionCache.set(id, { position, timestamp: Date.now() });
        
        return position;
      });
      
      const batchResults = await Promise.all(batchPromises);
      positions.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < positionIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return positions;
  }

  invalidateCache(type: 'pools' | 'positions' | 'all' = 'all'): void {
    switch (type) {
      case 'pools':
        this.poolCache.clear();
        break;
      case 'positions':
        this.positionCache.clear();
        break;
      case 'all':
        this.poolCache.clear();
        this.positionCache.clear();
        break;
    }
  }
}
```

## Integration Examples

### React Component Example

```tsx
// Complete React component for position management
import React, { useState, useEffect } from 'react';
import { LiquidityPosition, DLMMPool } from '@saros-finance/dlmm-sdk';

interface PositionManagerProps {
  pool: DLMMPool;
  walletAddress: string;
}

export function PositionManager({ pool, walletAddress }: PositionManagerProps) {
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<LiquidityPosition | null>(null);
  const [newRange, setNewRange] = useState({ lower: '', upper: '' });

  useEffect(() => {
    loadUserPositions();
  }, [walletAddress, pool]);

  const loadUserPositions = async () => {
    try {
      const userPositions = await pool.getUserPositions(walletAddress);
      setPositions(userPositions);
    } catch (error) {
      console.error('Failed to load positions:', error);
    }
  };

  const createNewPosition = async () => {
    try {
      const lowerPrice = parseFloat(newRange.lower);
      const upperPrice = parseFloat(newRange.upper);
      
      const position = await createConcentratedPosition(
        pool,
        lowerPrice,
        upperPrice,
        1.0, // Token X amount
        100, // Token Y amount
        walletAddress
      );
      
      setPositions([...positions, position]);
      setNewRange({ lower: '', upper: '' });
      
    } catch (error) {
      alert(`Failed to create position: ${error.message}`);
    }
  };

  const closePosition = async (position: LiquidityPosition) => {
    try {
      await position.close();
      setPositions(positions.filter(p => p.positionId !== position.positionId));
      if (selectedPosition?.positionId === position.positionId) {
        setSelectedPosition(null);
      }
    } catch (error) {
      alert(`Failed to close position: ${error.message}`);
    }
  };

  return (
    <div className="position-manager">
      <h2>DLMM Position Manager</h2>
      
      {/* Create New Position */}
      <section className="create-position">
        <h3>Create New Position</h3>
        <div>
          <input
            type="number"
            placeholder="Lower Price"
            value={newRange.lower}
            onChange={(e) => setNewRange({...newRange, lower: e.target.value})}
          />
          <input
            type="number"
            placeholder="Upper Price"  
            value={newRange.upper}
            onChange={(e) => setNewRange({...newRange, upper: e.target.value})}
          />
          <button onClick={createNewPosition}>Create Position</button>
        </div>
        <p>Current Price: {pool.getCurrentPrice().toFixed(4)}</p>
      </section>

      {/* Existing Positions */}
      <section className="existing-positions">
        <h3>Your Positions</h3>
        <div className="positions-list">
          {positions.map(position => (
            <div key={position.positionId} className="position-card">
              <h4>Position #{position.positionId.slice(0, 8)}...</h4>
              <div className="position-details">
                <p>Range: {position.getPriceRange().lower.toFixed(4)} - {position.getPriceRange().upper.toFixed(4)}</p>
                <p>Status: {position.isActive() ? '🟢 Active' : '🔴 Inactive'}</p>
                <p>Value: ${position.getTotalValue().toFixed(2)}</p>
              </div>
              <div className="position-actions">
                <button onClick={() => setSelectedPosition(position)}>Manage</button>
                <button onClick={() => position.collectFees()}>Collect Fees</button>
                <button onClick={() => closePosition(position)}>Close</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Position Details */}
      {selectedPosition && (
        <section className="position-details-panel">
          <h3>Position Details</h3>
          <PositionDetailsPanel 
            position={selectedPosition} 
            onUpdate={loadUserPositions}
          />
        </section>
      )}
    </div>
  );
}
```

## Next Steps

✅ DLMM position management mastered  
➡️ **Next**: [Rust SDK Documentation](/docs/rust-sdk/getting-started)

Or dive into practical applications:
- [DLMM Position Manager Tutorial](/docs/examples/dlmm-position-creator)
- [Market Making Examples](/docs/examples/arbitrage-bot)
- [Portfolio Optimization](/docs/examples/portfolio-analytics-dashboard)