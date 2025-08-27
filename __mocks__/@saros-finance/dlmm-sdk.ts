/**
 * Mock DLMM SDK for testing
 */

import { Connection, PublicKey } from '@solana/web3.js';

export class DLMMClient {
  constructor(public connection: Connection) {}

  async createPosition(params: any) {
    return {
      position: 'mock_position_id',
      activeBins: [1, 2, 3],
      liquidity: params.amount,
    };
  }

  async addLiquidity(params: any) {
    return {
      transaction: 'mock_add_liquidity_tx',
      success: true,
    };
  }

  async removeLiquidity(params: any) {
    return {
      transaction: 'mock_remove_liquidity_tx',
      success: true,
    };
  }

  async getPositionInfo(positionId: string) {
    return {
      positionId,
      totalValue: 10000,
      fees: 150,
      pnl: 500,
    };
  }

  async getBinPrices(poolId: string) {
    return {
      activeBin: 8388608,
      prices: [
        { binId: 8388607, price: 99.5 },
        { binId: 8388608, price: 100.0 },
        { binId: 8388609, price: 100.5 },
      ],
    };
  }
}

export const DLMM = {
  createClient: (connection: Connection) => new DLMMClient(connection),
};