/**
 * Mock Saros SDK for testing
 */

import { Connection, PublicKey } from '@solana/web3.js';

export class SarosSDK {
  constructor(public connection: Connection) {}

  async getQuote(params: any) {
    return {
      inAmount: params.inAmount,
      outAmount: Math.floor(params.inAmount * 0.99), // Mock 1% fee
      priceImpact: 0.1,
      fee: Math.floor(params.inAmount * 0.01),
    };
  }

  async executeSwap(params: any) {
    return {
      transaction: 'mock_transaction_signature',
      success: true,
    };
  }

  async getPoolInfo(poolId: string) {
    return {
      poolId,
      tokenA: 'USDC',
      tokenB: 'SOL',
      liquidity: 1000000,
      fee: 0.25,
    };
  }

  async getStakingPools() {
    return [
      { poolId: 'pool1', apy: 12.5, totalStaked: 1000000 },
      { poolId: 'pool2', apy: 8.7, totalStaked: 500000 },
    ];
  }

  async getPortfolioData(wallet: PublicKey) {
    return {
      totalValue: 10000,
      positions: [
        { token: 'USDC', amount: 5000, value: 5000 },
        { token: 'SOL', amount: 50, value: 5000 },
      ],
    };
  }

  async createLimitOrder(params: any) {
    return {
      orderId: 'mock_order_id',
      success: true,
    };
  }

  async getYieldOpportunities() {
    return [
      { protocol: 'Saros', apy: 15.2, risk: 'medium' },
      { protocol: 'Partner', apy: 12.8, risk: 'low' },
    ];
  }
}