# Tutorial: Liquidity Provider Dashboard

Build a comprehensive dashboard for managing DLMM liquidity positions with advanced features like position monitoring, performance analytics, and automated rebalancing.

## What You'll Build

A professional-grade liquidity provider dashboard featuring:

- **Position Overview**: Real-time position status and performance metrics
- **Interactive Range Management**: Visual price range adjustment tools
- **Fee Tracking**: Detailed fee collection and earnings analytics  
- **Risk Management**: Impermanent loss monitoring and alerts
- **Automated Strategies**: Set-and-forget rebalancing rules
- **Portfolio Analytics**: Multi-position performance tracking
- **Mobile-Responsive**: Full functionality on all devices

## Prerequisites

- **Completed Swap Tutorial**: Understanding of basic Saros SDK usage
- **DLMM Knowledge**: Familiarity with concentrated liquidity concepts
- **React/TypeScript**: Intermediate React and TypeScript skills
- **Chart Libraries**: We'll use Recharts for data visualization

## Project Setup

### 1. Initialize Dashboard Project

```bash
# Create new React project
npx create-react-app saros-lp-dashboard --template typescript
cd saros-lp-dashboard

# Install Saros DLMM SDK and dependencies
npm install @saros-finance/dlmm-sdk @solana/web3.js @solana/wallet-adapter-react
npm install recharts date-fns clsx tailwindcss @headlessui/react
npm install @heroicons/react lucide-react

# Install dev dependencies  
npm install -D @types/node @tailwindcss/forms
```

### 2. Project Structure

```bash
src/
├── components/
│   ├── Dashboard.tsx
│   ├── PositionCard.tsx
│   ├── PositionCreator.tsx
│   ├── PerformanceChart.tsx
│   ├── RiskMonitor.tsx
│   └── StrategyManager.tsx
├── hooks/
│   ├── usePositions.ts
│   ├── usePoolData.ts
│   └── usePerformanceTracking.ts
├── services/
│   ├── dlmmService.ts
│   ├── performanceService.ts
│   └── riskService.ts
├── types/
│   └── dashboard.ts
└── utils/
    ├── calculations.ts
    └── formatting.ts
```

## Core Services

### 3. DLMM Service

```typescript
// src/services/dlmmService.ts
import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import {
  DLMMPool,
  LiquidityPosition,
  createPosition,
  addLiquidity,
  removeLiquidity,
  collectFees,
  getPositionInfo,
} from '@saros-finance/dlmm-sdk';

export interface PositionData {
  address: PublicKey;
  pool: DLMMPool;
  position: LiquidityPosition;
  currentValue: number;
  feesEarned: {
    tokenX: number;
    tokenY: number;
    total: number;
  };
  performance: {
    totalReturn: number;
    dailyYield: number;
    impermanentLoss: number;
  };
  riskMetrics: {
    concentration: number;
    priceDistance: number;
    utilizationRate: number;
  };
}

export class DLMMService {
  private connection: Connection;
  private pools: Map<string, DLMMPool> = new Map();

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async loadUserPositions(walletAddress: PublicKey): Promise<PositionData[]> {
    try {
      // Get all user positions (this would typically involve querying program accounts)
      const positionAddresses = await this.getUserPositionAddresses(walletAddress);
      
      const positionsData: PositionData[] = [];

      for (const positionAddress of positionAddresses) {
        try {
          const positionData = await this.loadPositionData(positionAddress);
          if (positionData) {
            positionsData.push(positionData);
          }
        } catch (error) {
          console.error(`Failed to load position ${positionAddress}:`, error);
        }
      }

      return positionsData;
    } catch (error) {
      console.error('Failed to load user positions:', error);
      return [];
    }
  }

  async loadPositionData(positionAddress: PublicKey): Promise<PositionData | null> {
    try {
      const positionInfo = await getPositionInfo(this.connection, positionAddress);
      if (!positionInfo) return null;

      // Load associated pool
      const pool = await this.loadPool(positionInfo.poolAddress);
      if (!pool) return null;

      // Calculate current value
      const currentValue = await this.calculatePositionValue(positionInfo, pool);

      // Get fees earned
      const feesEarned = await this.calculateFeesEarned(positionInfo, pool);

      // Calculate performance metrics
      const performance = await this.calculatePerformanceMetrics(positionInfo, pool);

      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(positionInfo, pool);

      return {
        address: positionAddress,
        pool,
        position: positionInfo,
        currentValue,
        feesEarned,
        performance,
        riskMetrics,
      };
    } catch (error) {
      console.error(`Failed to load position data for ${positionAddress}:`, error);
      return null;
    }
  }

  async loadPool(poolAddress: PublicKey): Promise<DLMMPool | null> {
    const poolKey = poolAddress.toString();
    
    if (this.pools.has(poolKey)) {
      return this.pools.get(poolKey)!;
    }

    try {
      const pool = await DLMMPool.load(this.connection, poolAddress);
      this.pools.set(poolKey, pool);
      return pool;
    } catch (error) {
      console.error(`Failed to load pool ${poolAddress}:`, error);
      return null;
    }
  }

  async createNewPosition(
    poolAddress: PublicKey,
    lowerPrice: number,
    upperPrice: number,
    amountX: number,
    amountY: number,
    walletPublicKey: PublicKey
  ): Promise<string> {
    try {
      const pool = await this.loadPool(poolAddress);
      if (!pool) throw new Error('Pool not found');

      // Convert prices to bin IDs
      const lowerBin = this.priceToBinId(lowerPrice, pool);
      const upperBin = this.priceToBinId(upperPrice, pool);

      const result = await createPosition(
        this.connection,
        pool,
        lowerBin,
        upperBin,
        amountX,
        amountY,
        walletPublicKey
      );

      return result.signature;
    } catch (error) {
      console.error('Failed to create position:', error);
      throw error;
    }
  }

  async collectFeesFromPosition(
    positionAddress: PublicKey,
    walletPublicKey: PublicKey
  ): Promise<{ signature: string; feesCollected: { tokenX: number; tokenY: number } }> {
    try {
      const result = await collectFees(
        this.connection,
        positionAddress,
        walletPublicKey
      );

      return {
        signature: result.signature,
        feesCollected: {
          tokenX: result.feesCollected.tokenX,
          tokenY: result.feesCollected.tokenY,
        },
      };
    } catch (error) {
      console.error('Failed to collect fees:', error);
      throw error;
    }
  }

  async removePosition(
    positionAddress: PublicKey,
    walletPublicKey: PublicKey
  ): Promise<{ signature: string; amountsRemoved: { tokenX: number; tokenY: number } }> {
    try {
      const result = await removeLiquidity(
        this.connection,
        positionAddress,
        100, // Remove 100% of liquidity
        walletPublicKey
      );

      return {
        signature: result.signature,
        amountsRemoved: {
          tokenX: result.amountsRemoved.tokenX,
          tokenY: result.amountsRemoved.tokenY,
        },
      };
    } catch (error) {
      console.error('Failed to remove position:', error);
      throw error;
    }
  }

  private async getUserPositionAddresses(walletAddress: PublicKey): Promise<PublicKey[]> {
    // In production, this would query program accounts to find user positions
    // For this tutorial, we'll use a mock implementation
    return [
      // Mock position addresses - replace with actual position discovery
      new PublicKey('11111111111111111111111111111111'),
    ];
  }

  private async calculatePositionValue(
    position: LiquidityPosition,
    pool: DLMMPool
  ): Promise<number> {
    const currentPrice = pool.getCurrentPrice();
    
    // Calculate value of tokens at current price
    const tokenXValue = position.liquidityX;
    const tokenYValue = position.liquidityY * currentPrice;
    
    return tokenXValue + tokenYValue;
  }

  private async calculateFeesEarned(
    position: LiquidityPosition,
    pool: DLMMPool
  ): Promise<{ tokenX: number; tokenY: number; total: number }> {
    // In production, query actual fees from position account
    const feesX = position.feesEarned?.tokenX || 0;
    const feesY = position.feesEarned?.tokenY || 0;
    
    const currentPrice = pool.getCurrentPrice();
    const totalFeesValue = feesX + (feesY * currentPrice);

    return {
      tokenX: feesX,
      tokenY: feesY,
      total: totalFeesValue,
    };
  }

  private async calculatePerformanceMetrics(
    position: LiquidityPosition,
    pool: DLMMPool
  ): Promise<{ totalReturn: number; dailyYield: number; impermanentLoss: number }> {
    const currentValue = await this.calculatePositionValue(position, pool);
    const initialValue = position.initialValue || currentValue;
    
    // Calculate total return
    const totalReturn = (currentValue - initialValue) / initialValue * 100;

    // Calculate daily yield based on fees
    const feesEarned = await this.calculateFeesEarned(position, pool);
    const positionAge = Date.now() - (position.createdAt || Date.now());
    const dailyYield = (feesEarned.total / initialValue) * (86400000 / positionAge) * 100;

    // Estimate impermanent loss
    const impermanentLoss = this.calculateImpermanentLoss(
      position.initialPrice || pool.getCurrentPrice(),
      pool.getCurrentPrice()
    );

    return {
      totalReturn,
      dailyYield,
      impermanentLoss,
    };
  }

  private calculateRiskMetrics(
    position: LiquidityPosition,
    pool: DLMMPool
  ): { concentration: number; priceDistance: number; utilizationRate: number } {
    const currentBin = pool.activeId;
    const positionWidth = position.upperBin - position.lowerBin;
    const distanceFromPrice = Math.min(
      Math.abs(currentBin - position.lowerBin),
      Math.abs(currentBin - position.upperBin)
    );

    return {
      concentration: 1 / positionWidth, // Higher = more concentrated
      priceDistance: distanceFromPrice / positionWidth,
      utilizationRate: position.liquidityX > 0 && position.liquidityY > 0 ? 1 : 0.5,
    };
  }

  private calculateImpermanentLoss(initialPrice: number, currentPrice: number): number {
    const priceRatio = currentPrice / initialPrice;
    const impermanentLoss = (2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1) * 100;
    return Math.abs(impermanentLoss);
  }

  private priceToBinId(price: number, pool: DLMMPool): number {
    // Convert price to bin ID based on pool's bin step
    const binStep = pool.binStep;
    return Math.round(Math.log(price) / Math.log(1 + binStep / 10000));
  }
}
```

### 4. Position Management Hook

```typescript
// src/hooks/usePositions.ts
import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { DLMMService, PositionData } from '../services/dlmmService';

export const usePositions = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  
  const [dlmmService] = useState(() => new DLMMService(connection));
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPositions = useCallback(async () => {
    if (!publicKey) {
      setPositions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userPositions = await dlmmService.loadUserPositions(publicKey);
      setPositions(userPositions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load positions';
      setError(errorMessage);
      console.error('Failed to refresh positions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, dlmmService]);

  useEffect(() => {
    refreshPositions();
  }, [refreshPositions]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!publicKey) return;

    const interval = setInterval(refreshPositions, 30000);
    return () => clearInterval(interval);
  }, [publicKey, refreshPositions]);

  const collectFees = useCallback(async (positionAddress: string) => {
    if (!publicKey) throw new Error('Wallet not connected');

    try {
      const result = await dlmmService.collectFeesFromPosition(
        new PublicKey(positionAddress),
        publicKey
      );
      
      // Refresh positions after fee collection
      await refreshPositions();
      
      return result;
    } catch (error) {
      console.error('Failed to collect fees:', error);
      throw error;
    }
  }, [publicKey, dlmmService, refreshPositions]);

  const removePosition = useCallback(async (positionAddress: string) => {
    if (!publicKey) throw new Error('Wallet not connected');

    try {
      const result = await dlmmService.removePosition(
        new PublicKey(positionAddress),
        publicKey
      );
      
      // Refresh positions after removal
      await refreshPositions();
      
      return result;
    } catch (error) {
      console.error('Failed to remove position:', error);
      throw error;
    }
  }, [publicKey, dlmmService, refreshPositions]);

  return {
    positions,
    isLoading,
    error,
    refreshPositions,
    collectFees,
    removePosition,
  };
};
```

## Dashboard Components

### 5. Main Dashboard

```typescript
// src/components/Dashboard.tsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePositions } from '../hooks/usePositions';
import { PositionCard } from './PositionCard';
import { PositionCreator } from './PositionCreator';
import { PerformanceChart } from './PerformanceChart';
import { PortfolioSummary } from './PortfolioSummary';
import { PlusIcon, ChartBarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export const Dashboard: React.FC = () => {
  const { publicKey } = useWallet();
  const { positions, isLoading, error, collectFees, removePosition } = usePositions();
  const [showCreatePosition, setShowCreatePosition] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'positions' | 'analytics'>('overview');

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Saros LP Dashboard
          </h1>
          <p className="text-gray-600 mb-8">
            Connect your wallet to view and manage your liquidity positions
          </p>
          <WalletMultiButton className="!bg-saros-primary hover:!bg-saros-primary/90" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saros-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your positions...</p>
        </div>
      </div>
    );
  }

  const totalPortfolioValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
  const totalFeesEarned = positions.reduce((sum, pos) => sum + pos.feesEarned.total, 0);
  const averageDailyYield = positions.length > 0 
    ? positions.reduce((sum, pos) => sum + pos.performance.dailyYield, 0) / positions.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                LP Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Portfolio Value</div>
                <div className="text-lg font-bold text-gray-900">
                  ${totalPortfolioValue.toLocaleString()}
                </div>
              </div>
              <WalletMultiButton className="!bg-saros-primary hover:!bg-saros-primary/90 !text-sm" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: ChartBarIcon },
              { key: 'positions', label: 'Positions', icon: Cog6ToothIcon },
              { key: 'analytics', label: 'Analytics', icon: ChartBarIcon },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedTab(key as any)}
                className={`flex items-center space-x-2 pb-2 border-b-2 font-medium ${
                  selectedTab === key
                    ? 'border-saros-primary text-saros-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content based on selected tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Portfolio Summary */}
            <PortfolioSummary
              totalValue={totalPortfolioValue}
              totalFeesEarned={totalFeesEarned}
              averageDailyYield={averageDailyYield}
              positionCount={positions.length}
            />

            {/* Recent Positions */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Active Positions</h3>
                <button
                  onClick={() => setShowCreatePosition(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-saros-primary text-white rounded-lg hover:bg-saros-primary/90"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>New Position</span>
                </button>
              </div>

              {positions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg">
                  <p className="text-gray-500 mb-4">No positions found</p>
                  <button
                    onClick={() => setShowCreatePosition(true)}
                    className="bg-saros-primary text-white px-6 py-3 rounded-lg hover:bg-saros-primary/90"
                  >
                    Create Your First Position
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {positions.slice(0, 6).map((position) => (
                    <PositionCard
                      key={position.address.toString()}
                      position={position}
                      onCollectFees={collectFees}
                      onRemovePosition={removePosition}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'positions' && (
          <div className="space-y-6">
            {/* All Positions */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                All Positions ({positions.length})
              </h3>
              <button
                onClick={() => setShowCreatePosition(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-saros-primary text-white rounded-lg hover:bg-saros-primary/90"
              >
                <PlusIcon className="h-4 w-4" />
                <span>New Position</span>
              </button>
            </div>

            {positions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500 mb-4">No positions found</p>
                <button
                  onClick={() => setShowCreatePosition(true)}
                  className="bg-saros-primary text-white px-6 py-3 rounded-lg hover:bg-saros-primary/90"
                >
                  Create Your First Position
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {positions.map((position) => (
                  <PositionCard
                    key={position.address.toString()}
                    position={position}
                    onCollectFees={collectFees}
                    onRemovePosition={removePosition}
                    detailed={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'analytics' && (
          <div className="space-y-6">
            <PerformanceChart positions={positions} />
          </div>
        )}
      </div>

      {/* Create Position Modal */}
      {showCreatePosition && (
        <PositionCreator
          onClose={() => setShowCreatePosition(false)}
          onPositionCreated={() => {
            setShowCreatePosition(false);
            // Positions will auto-refresh
          }}
        />
      )}
    </div>
  );
};
```

### 6. Position Card Component

```typescript
// src/components/PositionCard.tsx
import React, { useState } from 'react';
import { PositionData } from '../services/dlmmService';
import { formatCurrency, formatPercentage } from '../utils/formatting';
import { 
  BanknotesIcon, 
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  EllipsisVerticalIcon 
} from '@heroicons/react/24/outline';
import { Menu } from '@headlessui/react';

interface PositionCardProps {
  position: PositionData;
  onCollectFees: (positionAddress: string) => Promise<any>;
  onRemovePosition: (positionAddress: string) => Promise<any>;
  detailed?: boolean;
}

export const PositionCard: React.FC<PositionCardProps> = ({ 
  position, 
  onCollectFees, 
  onRemovePosition,
  detailed = false 
}) => {
  const [isCollectingFees, setIsCollectingFees] = useState(false);
  const [isRemovingPosition, setIsRemovingPosition] = useState(false);

  const handleCollectFees = async () => {
    setIsCollectingFees(true);
    try {
      await onCollectFees(position.address.toString());
    } catch (error) {
      console.error('Failed to collect fees:', error);
    }
    setIsCollectingFees(false);
  };

  const handleRemovePosition = async () => {
    if (window.confirm('Are you sure you want to remove this position? This action cannot be undone.')) {
      setIsRemovingPosition(true);
      try {
        await onRemovePosition(position.address.toString());
      } catch (error) {
        console.error('Failed to remove position:', error);
      }
      setIsRemovingPosition(false);
    }
  };

  const isInRange = position.riskMetrics.priceDistance < 0.5;
  const hasCollectableFees = position.feesEarned.total > 0.01;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">
            {position.pool.tokenX?.symbol}/{position.pool.tokenY?.symbol}
          </h3>
          <div className="text-sm text-gray-500">
            {position.address.toString().slice(0, 8)}...
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            isInRange ? 'bg-green-400' : 'bg-yellow-400'
          }`} />
          <Menu as="div" className="relative">
            <Menu.Button className="p-1 text-gray-400 hover:text-gray-600">
              <EllipsisVerticalIcon className="h-5 w-5" />
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleCollectFees}
                    disabled={!hasCollectableFees || isCollectingFees}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } flex w-full items-center px-4 py-2 text-sm text-gray-700 disabled:text-gray-400`}
                  >
                    <BanknotesIcon className="h-4 w-4 mr-3" />
                    {isCollectingFees ? 'Collecting...' : 'Collect Fees'}
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleRemovePosition}
                    disabled={isRemovingPosition}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } flex w-full items-center px-4 py-2 text-sm text-red-600 disabled:text-gray-400`}
                  >
                    <ExclamationTriangleIcon className="h-4 w-4 mr-3" />
                    {isRemovingPosition ? 'Removing...' : 'Remove Position'}
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      </div>

      {/* Value and Performance */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Position Value</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(position.currentValue)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Return</span>
          <span className={`font-semibold ${
            position.performance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatPercentage(position.performance.totalReturn)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Daily Yield</span>
          <span className="font-semibold text-gray-900">
            {formatPercentage(position.performance.dailyYield)}
          </span>
        </div>

        {detailed && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Fees Earned</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(position.feesEarned.total)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">IL Risk</span>
              <span className={`font-semibold ${
                position.performance.impermanentLoss > 5 ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {formatPercentage(position.performance.impermanentLoss)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Range Visualization */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">Price Range</div>
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${isInRange ? 'bg-green-400' : 'bg-yellow-400'}`}
              style={{ 
                width: `${Math.max(20, 100 - position.riskMetrics.priceDistance * 100)}%` 
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{position.position.lowerBin}</span>
            <span className="font-medium">Current</span>
            <span>{position.position.upperBin}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-2">
        <button
          onClick={handleCollectFees}
          disabled={!hasCollectableFees || isCollectingFees}
          className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 disabled:bg-gray-50 disabled:text-gray-400"
        >
          {isCollectingFees ? 'Collecting...' : `Collect (${formatCurrency(position.feesEarned.total)})`}
        </button>
        
        <button className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">
          Adjust Range
        </button>
      </div>

      {/* Risk Warnings */}
      {!isInRange && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">
              Position is out of range and not earning fees
            </span>
          </div>
        </div>
      )}

      {position.performance.impermanentLoss > 10 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-sm text-red-800">
              High impermanent loss detected ({formatPercentage(position.performance.impermanentLoss)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 7. Portfolio Summary Component

```typescript
// src/components/PortfolioSummary.tsx
import React from 'react';
import { formatCurrency, formatPercentage } from '../utils/formatting';
import { 
  BanknotesIcon, 
  TrendingUpIcon, 
  CurrencyDollarIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';

interface PortfolioSummaryProps {
  totalValue: number;
  totalFeesEarned: number;
  averageDailyYield: number;
  positionCount: number;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  totalValue,
  totalFeesEarned,
  averageDailyYield,
  positionCount,
}) => {
  const annualizedYield = averageDailyYield * 365;

  const stats = [
    {
      name: 'Total Portfolio Value',
      value: formatCurrency(totalValue),
      icon: BanknotesIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Total Fees Earned',
      value: formatCurrency(totalFeesEarned),
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Annualized Yield',
      value: formatPercentage(annualizedYield),
      icon: TrendingUpIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      name: 'Active Positions',
      value: positionCount.toString(),
      icon: ChartBarIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 8. Position Creator Modal

```typescript
// src/components/PositionCreator.tsx
import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { DLMMService } from '../services/dlmmService';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PositionCreatorProps {
  onClose: () => void;
  onPositionCreated: () => void;
}

export const PositionCreator: React.FC<PositionCreatorProps> = ({
  onClose,
  onPositionCreated,
}) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  
  const [dlmmService] = useState(() => new DLMMService(connection));
  
  // Form state
  const [selectedPool, setSelectedPool] = useState<string>('');
  const [lowerPrice, setLowerPrice] = useState<string>('');
  const [upperPrice, setUpperPrice] = useState<string>('');
  const [amountX, setAmountX] = useState<string>('');
  const [amountY, setAmountY] = useState<string>('');
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [strategy, setStrategy] = useState<'balanced' | 'conservative' | 'aggressive'>('balanced');

  const pools = [
    { address: 'BLZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV', name: 'SOL/USDC', currentPrice: 180.45 },
    { address: '2BZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV', name: 'mSOL/SOL', currentPrice: 1.05 },
    { address: '3BZz9Uf6CuRzJyWJNKQsQ7BT5vQKJy3BZVFWXMBhTrV', name: 'USDC/USDT', currentPrice: 0.9998 },
  ];

  const selectedPoolData = pools.find(p => p.address === selectedPool);

  const handleStrategySelect = (strategyType: 'balanced' | 'conservative' | 'aggressive') => {
    setStrategy(strategyType);
    
    if (selectedPoolData) {
      const currentPrice = selectedPoolData.currentPrice;
      
      switch (strategyType) {
        case 'conservative':
          setLowerPrice((currentPrice * 0.95).toString());
          setUpperPrice((currentPrice * 1.05).toString());
          break;
        case 'balanced':
          setLowerPrice((currentPrice * 0.90).toString());
          setUpperPrice((currentPrice * 1.10).toString());
          break;
        case 'aggressive':
          setLowerPrice((currentPrice * 0.98).toString());
          setUpperPrice((currentPrice * 1.02).toString());
          break;
      }
    }
  };

  const handleCreatePosition = async () => {
    if (!publicKey || !selectedPool || !lowerPrice || !upperPrice || !amountX || !amountY) {
      return;
    }

    setIsCreating(true);
    try {
      const signature = await dlmmService.createNewPosition(
        new PublicKey(selectedPool),
        parseFloat(lowerPrice),
        parseFloat(upperPrice),
        parseFloat(amountX) * Math.pow(10, 9), // Convert to lamports
        parseFloat(amountY) * Math.pow(10, 6), // Convert to USDC units
        publicKey
      );

      console.log('Position created:', signature);
      onPositionCreated();
    } catch (error) {
      console.error('Failed to create position:', error);
      alert(`Failed to create position: ${error.message}`);
    }
    setIsCreating(false);
  };

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title className="text-2xl font-bold text-gray-900">
                    Create New Position
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Pool Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Pool
                    </label>
                    <select
                      value={selectedPool}
                      onChange={(e) => setSelectedPool(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saros-primary focus:border-transparent"
                    >
                      <option value="">Choose a pool...</option>
                      {pools.map((pool) => (
                        <option key={pool.address} value={pool.address}>
                          {pool.name} (${pool.currentPrice})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Strategy Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Strategy
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { 
                          key: 'conservative', 
                          label: 'Conservative', 
                          description: '±5% range, lower risk',
                          color: 'green' 
                        },
                        { 
                          key: 'balanced', 
                          label: 'Balanced', 
                          description: '±10% range, moderate risk',
                          color: 'blue' 
                        },
                        { 
                          key: 'aggressive', 
                          label: 'Aggressive', 
                          description: '±2% range, higher fees',
                          color: 'orange' 
                        },
                      ].map(({ key, label, description, color }) => (
                        <button
                          key={key}
                          onClick={() => handleStrategySelect(key as any)}
                          className={`p-4 text-left border-2 rounded-lg transition-colors ${
                            strategy === key
                              ? `border-${color}-500 bg-${color}-50`
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{label}</div>
                          <div className="text-sm text-gray-600">{description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lower Price
                      </label>
                      <input
                        type="number"
                        value={lowerPrice}
                        onChange={(e) => setLowerPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saros-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upper Price
                      </label>
                      <input
                        type="number"
                        value={upperPrice}
                        onChange={(e) => setUpperPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saros-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Liquidity Amounts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {selectedPoolData?.name.split('/')[0] || 'Token X'} Amount
                      </label>
                      <input
                        type="number"
                        value={amountX}
                        onChange={(e) => setAmountX(e.target.value)}
                        placeholder="0.0"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saros-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {selectedPoolData?.name.split('/')[1] || 'Token Y'} Amount
                      </label>
                      <input
                        type="number"
                        value={amountY}
                        onChange={(e) => setAmountY(e.target.value)}
                        placeholder="0.0"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saros-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Position Preview */}
                  {selectedPoolData && lowerPrice && upperPrice && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Position Preview</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Price</span>
                          <span>${selectedPoolData.currentPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Range Width</span>
                          <span>
                            {(((parseFloat(upperPrice) - parseFloat(lowerPrice)) / selectedPoolData.currentPrice) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">In Range</span>
                          <span className={
                            selectedPoolData.currentPrice >= parseFloat(lowerPrice) && 
                            selectedPoolData.currentPrice <= parseFloat(upperPrice)
                              ? 'text-green-600' : 'text-red-600'
                          }>
                            {selectedPoolData.currentPrice >= parseFloat(lowerPrice) && 
                             selectedPoolData.currentPrice <= parseFloat(upperPrice) ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-4 pt-4">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePosition}
                      disabled={
                        !selectedPool || !lowerPrice || !upperPrice || !amountX || !amountY || isCreating
                      }
                      className="flex-1 px-4 py-3 bg-saros-primary text-white rounded-lg hover:bg-saros-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isCreating ? 'Creating Position...' : 'Create Position'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
```

## Advanced Features

### 9. Performance Analytics

```typescript
// src/components/PerformanceChart.tsx
import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { PositionData } from '../services/dlmmService';

interface PerformanceChartProps {
  positions: PositionData[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ positions }) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartType, setChartType] = useState<'value' | 'yield' | 'fees'>('value');

  // Generate mock historical data for demonstration
  const generateHistoricalData = () => {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const data = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate portfolio growth
      const baseValue = 10000;
      const randomGrowth = Math.random() * 0.1 - 0.05; // ±5% random
      const trendGrowth = (days - i) / days * 0.15; // 15% growth over period
      
      const portfolioValue = baseValue * (1 + trendGrowth + randomGrowth);
      const dailyFees = portfolioValue * 0.002; // 0.2% daily fees
      const dailyYield = (dailyFees / portfolioValue) * 100;

      data.push({
        date: date.toLocaleDateString(),
        timestamp: date.getTime(),
        portfolioValue: Math.round(portfolioValue),
        dailyFees: Math.round(dailyFees),
        dailyYield: parseFloat(dailyYield.toFixed(3)),
        cumulativeFees: Math.round(dailyFees * (days - i)),
      });
    }

    return data;
  };

  const chartData = generateHistoricalData();
  const totalPortfolioValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
  const totalFeesEarned = positions.reduce((sum, pos) => sum + pos.feesEarned.total, 0);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Performance Analytics</h3>
        
        <div className="flex space-x-4">
          {/* Chart Type Selector */}
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="value">Portfolio Value</option>
            <option value="yield">Daily Yield</option>
            <option value="fees">Cumulative Fees</option>
          </select>
          
          {/* Timeframe Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeframe === tf
                    ? 'bg-white text-saros-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            ${totalPortfolioValue.toLocaleString()}
          </div>
          <div className="text-sm text-blue-800">Total Value</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            ${totalFeesEarned.toLocaleString()}
          </div>
          <div className="text-sm text-green-800">Fees Earned</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {positions.length}
          </div>
          <div className="text-sm text-purple-800">Active Positions</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {positions.filter(p => p.riskMetrics.priceDistance < 0.5).length}
          </div>
          <div className="text-sm text-orange-800">In Range</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'value' && (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="portfolioValue"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#valueGradient)"
              />
            </AreaChart>
          )}

          {chartType === 'yield' && (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis 
                tick={{ fontSize: 12 }} 
                stroke="#6b7280"
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value}%`, 'Daily Yield']}
              />
              <Line
                type="monotone"
                dataKey="dailyYield"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          )}

          {chartType === 'fees' && (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="feesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis 
                tick={{ fontSize: 12 }} 
                stroke="#6b7280"
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Cumulative Fees']}
              />
              <Area
                type="monotone"
                dataKey="cumulativeFees"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#feesGradient)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

### 10. Risk Monitor Component

```typescript
// src/components/RiskMonitor.tsx
import React from 'react';
import { PositionData } from '../services/dlmmService';
import { 
  ExclamationTriangleIcon, 
  ShieldCheckIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

interface RiskMonitorProps {
  positions: PositionData[];
}

export const RiskMonitor: React.FC<RiskMonitorProps> = ({ positions }) => {
  const calculatePortfolioRisk = () => {
    if (positions.length === 0) return { level: 'low', score: 0, warnings: [] };

    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const warnings: string[] = [];
    let riskScore = 0;

    // Check concentration risk
    const maxPositionValue = Math.max(...positions.map(pos => pos.currentValue));
    const concentration = maxPositionValue / totalValue;
    if (concentration > 0.5) {
      warnings.push(`High concentration risk: ${(concentration * 100).toFixed(1)}% in single position`);
      riskScore += 0.3;
    }

    // Check out-of-range positions
    const outOfRangePositions = positions.filter(pos => pos.riskMetrics.priceDistance >= 0.5);
    if (outOfRangePositions.length > 0) {
      warnings.push(`${outOfRangePositions.length} position(s) out of range and not earning fees`);
      riskScore += 0.2 * (outOfRangePositions.length / positions.length);
    }

    // Check impermanent loss
    const highILPositions = positions.filter(pos => pos.performance.impermanentLoss > 10);
    if (highILPositions.length > 0) {
      warnings.push(`${highILPositions.length} position(s) with high impermanent loss (>10%)`);
      riskScore += 0.3 * (highILPositions.length / positions.length);
    }

    // Check low utilization
    const lowUtilizationPositions = positions.filter(pos => pos.riskMetrics.utilizationRate < 0.7);
    if (lowUtilizationPositions.length > 0) {
      warnings.push(`${lowUtilizationPositions.length} position(s) with low capital utilization`);
      riskScore += 0.1;
    }

    const level = riskScore > 0.6 ? 'high' : riskScore > 0.3 ? 'medium' : 'low';

    return { level, score: riskScore, warnings };
  };

  const risk = calculatePortfolioRisk();

  const getRiskColor = () => {
    switch (risk.level) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getRiskBgColor = () => {
    switch (risk.level) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  const getRiskIcon = () => {
    switch (risk.level) {
      case 'high': return ExclamationTriangleIcon;
      case 'medium': return InformationCircleIcon;
      default: return ShieldCheckIcon;
    }
  };

  const RiskIcon = getRiskIcon();

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Risk Monitor</h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getRiskBgColor()}`}>
          <RiskIcon className={`h-4 w-4 ${getRiskColor()}`} />
          <span className={`text-sm font-medium ${getRiskColor()}`}>
            {risk.level.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Risk Score Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Risk Score</span>
          <span>{(risk.score * 100).toFixed(0)}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              risk.level === 'high' ? 'bg-red-500' :
              risk.level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${risk.score * 100}%` }}
          />
        </div>
      </div>

      {/* Risk Warnings */}
      {risk.warnings.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Risk Alerts</h4>
          {risk.warnings.map((warning, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-yellow-800">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Risk Recommendations */}
      {risk.level === 'low' ? (
        <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <ShieldCheckIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-green-800">
            Your portfolio risk is well managed. Consider adding more positions to increase diversification.
          </span>
        </div>
      ) : (
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            {risk.warnings.includes('concentration') && (
              <li>• Diversify across more pools to reduce concentration risk</li>
            )}
            {risk.warnings.includes('out of range') && (
              <li>• Rebalance out-of-range positions to resume fee earning</li>
            )}
            {risk.warnings.includes('impermanent loss') && (
              <li>• Consider tighter ranges or hedging strategies</li>
            )}
            {risk.warnings.includes('utilization') && (
              <li>• Adjust position ranges for better capital efficiency</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
```

### 11. Automated Strategy Manager

```typescript
// src/components/StrategyManager.tsx
import React, { useState } from 'react';
import { Switch } from '@headlessui/react';
import { usePositions } from '../hooks/usePositions';
import { 
  BoltIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';

export const StrategyManager: React.FC = () => {
  const { positions } = usePositions();
  
  // Strategy settings
  const [autoRebalanceEnabled, setAutoRebalanceEnabled] = useState(false);
  const [feeCollectionEnabled, setFeeCollectionEnabled] = useState(true);
  const [rebalanceThreshold, setRebalanceThreshold] = useState(5); // 5% price movement
  const [feeCollectionThreshold, setFeeCollectionThreshold] = useState(10); // $10 minimum
  const [autoCompoundEnabled, setAutoCompoundEnabled] = useState(false);

  const outOfRangePositions = positions.filter(pos => pos.riskMetrics.priceDistance >= 0.5);
  const collectableFeesPositions = positions.filter(pos => pos.feesEarned.total >= feeCollectionThreshold);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Strategy Manager</h3>
        <div className="text-sm text-gray-500">
          Automate your position management
        </div>
      </div>

      <div className="space-y-6">
        {/* Auto Rebalancing */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BoltIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Auto Rebalancing</h4>
              <p className="text-sm text-gray-600">
                Automatically rebalance positions when price moves beyond threshold
              </p>
            </div>
          </div>
          <Switch
            checked={autoRebalanceEnabled}
            onChange={setAutoRebalanceEnabled}
            className={`${
              autoRebalanceEnabled ? 'bg-saros-primary' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
          >
            <span
              className={`${
                autoRebalanceEnabled ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>

        {autoRebalanceEnabled && (
          <div className="ml-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rebalance Threshold: {rebalanceThreshold}%
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={rebalanceThreshold}
                onChange={(e) => setRebalanceThreshold(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1% (Aggressive)</span>
                <span>20% (Conservative)</span>
              </div>
            </div>
            
            {outOfRangePositions.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center">
                  <ExclamationCircleIcon className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">
                    {outOfRangePositions.length} position(s) ready for rebalancing
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auto Fee Collection */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Auto Fee Collection</h4>
              <p className="text-sm text-gray-600">
                Automatically collect fees when they reach the threshold
              </p>
            </div>
          </div>
          <Switch
            checked={feeCollectionEnabled}
            onChange={setFeeCollectionEnabled}
            className={`${
              feeCollectionEnabled ? 'bg-saros-primary' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
          >
            <span
              className={`${
                feeCollectionEnabled ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>

        {feeCollectionEnabled && (
          <div className="ml-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection Threshold: ${feeCollectionThreshold}
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={feeCollectionThreshold}
                onChange={(e) => setFeeCollectionThreshold(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            {collectableFeesPositions.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">
                    {collectableFeesPositions.length} position(s) ready for fee collection
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auto Compounding */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <ClockIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Auto Compounding</h4>
              <p className="text-sm text-gray-600">
                Reinvest collected fees back into positions
              </p>
            </div>
          </div>
          <Switch
            checked={autoCompoundEnabled}
            onChange={setAutoCompoundEnabled}
            className={`${
              autoCompoundEnabled ? 'bg-saros-primary' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
          >
            <span
              className={`${
                autoCompoundEnabled ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>

        {/* Strategy Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Strategy Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Active Strategies</span>
              <div className="font-medium text-gray-900">
                {[autoRebalanceEnabled, feeCollectionEnabled, autoCompoundEnabled].filter(Boolean).length}/3
              </div>
            </div>
            <div>
              <span className="text-gray-600">Next Action</span>
              <div className="font-medium text-gray-900">
                {outOfRangePositions.length > 0 ? 'Rebalance Ready' :
                 collectableFeesPositions.length > 0 ? 'Collect Fees' : 'Monitor'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Utility Functions

### 12. Formatting Utilities

```typescript
// src/utils/formatting.ts
export const formatCurrency = (amount: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

export const formatTokenAmount = (
  amount: number, 
  decimals: number, 
  symbol: string
): string => {
  const formatted = (amount / Math.pow(10, decimals)).toFixed(6);
  return `${parseFloat(formatted)} ${symbol}`;
};

export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const formatAddress = (address: string, length: number = 4): string => {
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
};
```

## Deployment and Testing

### 13. Environment Setup

```bash
# Build for production
npm run build

# Test locally
npm run test

# Deploy to Vercel
npm install -g vercel
vercel --prod

# Environment variables
echo "REACT_APP_RPC_URL=https://api.mainnet-beta.solana.com" > .env.production
echo "REACT_APP_NETWORK=mainnet-beta" >> .env.production
```

### 14. Component Testing

```typescript
// src/components/__tests__/Dashboard.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import { WalletProvider } from '../WalletProvider';

const MockedDashboard = () => (
  <WalletProvider>
    <Dashboard />
  </WalletProvider>
);

describe('Dashboard', () => {
  test('renders wallet connection when not connected', () => {
    render(<MockedDashboard />);
    
    expect(screen.getByText('Saros LP Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Connect your wallet')).toBeInTheDocument();
  });

  test('shows loading state while fetching positions', async () => {
    // Mock wallet connection
    render(<MockedDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Loading your positions...')).toBeInTheDocument();
    });
  });
});
```

## Conclusion

You've built a comprehensive liquidity provider dashboard! This tutorial covered:

- ✅ **Position Management**: Create, monitor, and remove DLMM positions
- ✅ **Performance Analytics**: Track yield, fees, and portfolio growth
- ✅ **Risk Management**: Monitor and mitigate position risks
- ✅ **Automation**: Set up automated strategies for hands-off management
- ✅ **Professional UI**: Clean, responsive dashboard design
- ✅ **Real-Time Updates**: Live position and market data

### Next Steps

1. **Advanced Analytics**: Add more sophisticated metrics and benchmarking
2. **Strategy Backtesting**: Test strategies against historical data
3. **Mobile App**: Convert to React Native for mobile access
4. **Notifications**: Add Discord/Telegram alerts for position updates
5. **Portfolio Sharing**: Enable portfolio sharing and social features

### Resources

- **[Dashboard Source Code](https://github.com/saros-finance/lp-dashboard-tutorial)**: Complete working example
- **[Live Demo](https://saros-lp-dashboard.vercel.app)**: Try the dashboard
- **[Code Examples](/docs/examples/basic-token-swap)**: Additional implementation patterns
- **[DLMM SDK Reference](/docs/dlmm-sdk/api-reference)**: Complete API documentation

Your dashboard is now ready for professional liquidity management on Saros Finance! MashaAllah, you've created a powerful tool for DLMM position management.