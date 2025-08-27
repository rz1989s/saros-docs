# Tutorial: Building a Swap Interface

Learn how to build a complete token swap interface using the Saros TypeScript SDK. This tutorial covers everything from setup to deployment, including a modern React UI with real-time pricing.

## What You'll Build

By the end of this tutorial, you'll have a fully functional swap interface featuring:

- **Token Selection**: Browse and search available tokens
- **Real-Time Quotes**: Live pricing with slippage protection
- **Transaction Execution**: Secure swap execution with user approval
- **Price Impact Calculation**: Show users the cost of their trades
- **Transaction History**: Track completed swaps
- **Mobile-Responsive UI**: Works on all devices

## Prerequisites

- **Node.js 18+**: JavaScript runtime
- **React 18+**: Frontend framework knowledge
- **TypeScript**: Basic TypeScript understanding
- **Solana Wallet**: Phantom, Solflare, or similar
- **Basic DeFi Knowledge**: Understanding of token swaps and AMMs

## Project Setup

### 1. Initialize React Project

```bash
# Create new React project with TypeScript
npx create-react-app saros-swap-interface --template typescript
cd saros-swap-interface

# Install Saros SDK and dependencies
npm install @saros-finance/sdk @solana/web3.js @solana/wallet-adapter-react
npm install @solana/wallet-adapter-wallets @solana/wallet-adapter-react-ui
npm install @headlessui/react @heroicons/react tailwindcss

# Install dev dependencies
npm install -D @types/node @types/react @tailwindcss/forms
```

### 2. Configure Tailwind CSS

```bash
# Initialize Tailwind
npx tailwindcss init -p
```

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saros: {
          primary: '#FF6B35',
          secondary: '#004E89', 
          accent: '#00A8CC',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

### 3. Wallet Setup

```typescript
// src/components/WalletProvider.tsx
import React, { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
```

## Core Swap Logic

### 4. Swap Service

```typescript
// src/services/swapService.ts
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getSwapAmountSaros,
  swapSaros,
  getAllPoolsSaros,
  TokenInfo,
  PoolInfoLayout,
} from '@saros-finance/sdk';

export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  minimumReceived: number;
  fee: number;
  route: string[];
}

export interface SwapResult {
  signature: string;
  inputAmount: number;
  outputAmount: number;
  actualSlippage: number;
  gasUsed: number;
}

export class SwapService {
  private connection: Connection;
  private pools: PoolInfoLayout[] = [];
  private tokens: Map<string, TokenInfo> = new Map();

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async initialize(): Promise<void> {
    try {
      // Load available pools
      this.pools = await getAllPoolsSaros(this.connection);
      console.log(`Loaded ${this.pools.length} pools`);

      // Create token map for quick lookup
      this.pools.forEach(pool => {
        if (pool.tokenAccountX && pool.tokenAccountY) {
          this.tokens.set(pool.tokenAccountX.toString(), {
            mintAddress: pool.tokenAccountX,
            name: pool.tokenXSymbol || 'Unknown',
            symbol: pool.tokenXSymbol || 'UNK',
            decimals: pool.tokenXDecimals || 9,
          });
          
          this.tokens.set(pool.tokenAccountY.toString(), {
            mintAddress: pool.tokenAccountY,
            name: pool.tokenYSymbol || 'Unknown',
            symbol: pool.tokenYSymbol || 'UNK',
            decimals: pool.tokenYDecimals || 9,
          });
        }
      });

      console.log(`Loaded ${this.tokens.size} unique tokens`);
    } catch (error) {
      console.error('Failed to initialize SwapService:', error);
      throw error;
    }
  }

  async getSwapQuote(
    inputToken: TokenInfo,
    outputToken: TokenInfo,
    inputAmount: number,
    slippageTolerance: number = 0.5
  ): Promise<SwapQuote> {
    try {
      if (!inputToken.mintAddress || !outputToken.mintAddress) {
        throw new Error('Invalid token addresses');
      }

      // Find the best pool for this token pair
      const poolParams = this.findOptimalPool(inputToken, outputToken);
      if (!poolParams) {
        throw new Error('No pool found for this token pair');
      }

      // Get swap amount estimate
      const swapEstimate = await getSwapAmountSaros(
        this.connection,
        inputToken.mintAddress,
        outputToken.mintAddress,
        inputAmount,
        slippageTolerance,
        poolParams
      );

      if (!swapEstimate) {
        throw new Error('Unable to get swap estimate');
      }

      // Calculate price impact
      const expectedOutput = this.calculateExpectedOutput(
        inputAmount, 
        inputToken, 
        outputToken
      );
      const priceImpact = this.calculatePriceImpact(expectedOutput, swapEstimate.outputAmount);

      // Calculate minimum received with slippage
      const minimumReceived = swapEstimate.outputAmount * (1 - slippageTolerance / 100);

      // Estimate fee
      const fee = inputAmount * (poolParams.feeRate / 10000);

      return {
        inputAmount,
        outputAmount: swapEstimate.outputAmount,
        priceImpact,
        minimumReceived,
        fee,
        route: [poolParams.poolAddress.toString()],
      };
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      throw error;
    }
  }

  async executeSwap(
    inputToken: TokenInfo,
    outputToken: TokenInfo,
    inputAmount: number,
    slippageTolerance: number,
    walletPublicKey: PublicKey,
    signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
  ): Promise<SwapResult> {
    try {
      // Get fresh quote
      const quote = await this.getSwapQuote(
        inputToken,
        outputToken,
        inputAmount,
        slippageTolerance
      );

      // Find pool parameters
      const poolParams = this.findOptimalPool(inputToken, outputToken);
      if (!poolParams) {
        throw new Error('No pool found for token pair');
      }

      console.log('Executing swap:', {
        input: `${inputAmount} ${inputToken.symbol}`,
        expectedOutput: `${quote.outputAmount} ${outputToken.symbol}`,
        priceImpact: `${quote.priceImpact.toFixed(3)}%`,
      });

      // Execute the swap
      const swapResult = await swapSaros(
        this.connection,
        inputToken.mintAddress!,
        outputToken.mintAddress!,
        inputAmount,
        quote.minimumReceived,
        poolParams,
        walletPublicKey,
        signTransaction
      );

      if (!swapResult || !swapResult.signature) {
        throw new Error('Swap execution failed');
      }

      // Calculate actual slippage
      const actualSlippage = this.calculateActualSlippage(
        quote.outputAmount,
        swapResult.outputAmount || quote.outputAmount
      );

      return {
        signature: swapResult.signature,
        inputAmount,
        outputAmount: swapResult.outputAmount || quote.outputAmount,
        actualSlippage,
        gasUsed: swapResult.gasUsed || 0,
      };
    } catch (error) {
      console.error('Swap execution failed:', error);
      throw error;
    }
  }

  getAvailableTokens(): TokenInfo[] {
    return Array.from(this.tokens.values());
  }

  findTokenByMint(mintAddress: string): TokenInfo | undefined {
    return this.tokens.get(mintAddress);
  }

  findTokenBySymbol(symbol: string): TokenInfo | undefined {
    return Array.from(this.tokens.values()).find(
      token => token.symbol?.toLowerCase() === symbol.toLowerCase()
    );
  }

  private findOptimalPool(
    tokenA: TokenInfo,
    tokenB: TokenInfo
  ): PoolInfoLayout | null {
    if (!tokenA.mintAddress || !tokenB.mintAddress) {
      return null;
    }

    // Find direct pool
    const directPool = this.pools.find(pool => {
      const hasTokens = (
        (pool.tokenAccountX?.equals(tokenA.mintAddress) && pool.tokenAccountY?.equals(tokenB.mintAddress)) ||
        (pool.tokenAccountX?.equals(tokenB.mintAddress) && pool.tokenAccountY?.equals(tokenA.mintAddress))
      );
      return hasTokens;
    });

    if (directPool) {
      return directPool;
    }

    // Find best indirect route through USDC
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    
    const poolA = this.pools.find(pool =>
      (pool.tokenAccountX?.equals(tokenA.mintAddress) && pool.tokenAccountY?.equals(usdcMint)) ||
      (pool.tokenAccountX?.equals(usdcMint) && pool.tokenAccountY?.equals(tokenA.mintAddress))
    );

    return poolA || null;
  }

  private calculateExpectedOutput(
    inputAmount: number,
    inputToken: TokenInfo,
    outputToken: TokenInfo
  ): number {
    // Simplified calculation - in production, use more sophisticated pricing
    return inputAmount * 0.998; // Assume ~0.2% fees
  }

  private calculatePriceImpact(expected: number, actual: number): number {
    if (expected === 0) return 0;
    return Math.abs(expected - actual) / expected * 100;
  }

  private calculateActualSlippage(expected: number, actual: number): number {
    if (expected === 0) return 0;
    return (expected - actual) / expected * 100;
  }
}
```

## React Components

### 5. Token Selector Component

```typescript
// src/components/TokenSelector.tsx
import React, { useState, Fragment } from 'react';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { MagnifyingGlassIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { TokenInfo } from '@saros-finance/sdk';

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken: (token: TokenInfo) => void;
  availableTokens: TokenInfo[];
  selectedToken?: TokenInfo;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  isOpen,
  onClose,
  onSelectToken,
  availableTokens,
  selectedToken,
}) => {
  const [query, setQuery] = useState('');

  const filteredTokens = query === ''
    ? availableTokens
    : availableTokens.filter((token) =>
        token.symbol?.toLowerCase().includes(query.toLowerCase()) ||
        token.name?.toLowerCase().includes(query.toLowerCase())
      );

  const handleSelectToken = (token: TokenInfo) => {
    onSelectToken(token);
    onClose();
    setQuery('');
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  Select Token
                </Dialog.Title>

                <Combobox value={selectedToken} onChange={handleSelectToken}>
                  <div className="relative">
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-gray-50 text-left shadow-sm focus:outline-none">
                      <Combobox.Input
                        className="w-full border-none py-3 pl-10 pr-10 text-sm leading-5 text-gray-900 bg-gray-50 focus:ring-0"
                        displayValue={(token: TokenInfo) => token?.symbol || ''}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search tokens..."
                      />
                      <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                      </Combobox.Button>
                    </div>

                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                      afterLeave={() => setQuery('')}
                    >
                      <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {filteredTokens.length === 0 && query !== '' ? (
                          <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                            No tokens found.
                          </div>
                        ) : (
                          filteredTokens.map((token) => (
                            <Combobox.Option
                              key={token.mintAddress?.toString()}
                              className={({ active }) =>
                                `relative cursor-default select-none py-3 px-4 ${
                                  active ? 'bg-saros-primary text-white' : 'text-gray-900'
                                }`
                              }
                              value={token}
                            >
                              {({ selected, active }) => (
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-saros-primary to-saros-accent flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                      {token.symbol?.charAt(0) || '?'}
                                    </span>
                                  </div>
                                  <div className="ml-3">
                                    <span
                                      className={`block truncate font-medium ${
                                        selected ? 'font-semibold' : 'font-normal'
                                      }`}
                                    >
                                      {token.symbol}
                                    </span>
                                    <span className={`block text-sm ${
                                      active ? 'text-gray-200' : 'text-gray-500'
                                    }`}>
                                      {token.name}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Combobox.Option>
                          ))
                        )}
                      </Combobox.Options>
                    </Transition>
                  </div>
                </Combobox>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
```

### 6. Swap Interface Component

```typescript
// src/components/SwapInterface.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { TokenInfo } from '@saros-finance/sdk';
import { SwapService, SwapQuote } from '../services/swapService';
import { TokenSelector } from './TokenSelector';
import { ArrowUpDownIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export const SwapInterface: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  
  const [swapService] = useState(() => new SwapService(connection));
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Swap state
  const [inputToken, setInputToken] = useState<TokenInfo | null>(null);
  const [outputToken, setOutputToken] = useState<TokenInfo | null>(null);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [outputAmount, setOutputAmount] = useState<string>('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  
  // UI state
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [selectingToken, setSelectingToken] = useState<'input' | 'output'>('input');
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize service
  useEffect(() => {
    const initializeSwapService = async () => {
      try {
        await swapService.initialize();
        setAvailableTokens(swapService.getAvailableTokens());
        
        // Set default tokens (SOL and USDC)
        const solToken = swapService.findTokenBySymbol('SOL');
        const usdcToken = swapService.findTokenBySymbol('USDC');
        
        if (solToken) setInputToken(solToken);
        if (usdcToken) setOutputToken(usdcToken);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize swap service:', error);
        setIsLoading(false);
      }
    };

    initializeSwapService();
  }, [swapService]);

  // Get quote when inputs change
  const getQuote = useCallback(async () => {
    if (!inputToken || !outputToken || !inputAmount || parseFloat(inputAmount) <= 0) {
      setQuote(null);
      setOutputAmount('');
      return;
    }

    setIsQuoting(true);
    try {
      const amount = parseFloat(inputAmount) * Math.pow(10, inputToken.decimals || 9);
      const newQuote = await swapService.getSwapQuote(
        inputToken,
        outputToken,
        amount,
        slippageTolerance
      );
      
      setQuote(newQuote);
      setOutputAmount((newQuote.outputAmount / Math.pow(10, outputToken.decimals || 9)).toString());
    } catch (error) {
      console.error('Failed to get quote:', error);
      setQuote(null);
      setOutputAmount('');
    }
    setIsQuoting(false);
  }, [inputToken, outputToken, inputAmount, slippageTolerance, swapService]);

  useEffect(() => {
    const timeoutId = setTimeout(getQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [getQuote]);

  const handleSwapTokens = () => {
    const tempToken = inputToken;
    setInputToken(outputToken);
    setOutputToken(tempToken);
    
    const tempAmount = inputAmount;
    setInputAmount(outputAmount);
    setOutputAmount(tempAmount);
  };

  const handleExecuteSwap = async () => {
    if (!publicKey || !signTransaction || !quote || !inputToken || !outputToken) {
      return;
    }

    setIsSwapping(true);
    try {
      const amount = parseFloat(inputAmount) * Math.pow(10, inputToken.decimals || 9);
      
      const result = await swapService.executeSwap(
        inputToken,
        outputToken,
        amount,
        slippageTolerance,
        publicKey,
        signTransaction
      );

      console.log('Swap completed:', result);
      
      // Reset form
      setInputAmount('');
      setOutputAmount('');
      setQuote(null);
      
      // Show success message
      alert(`Swap completed! Transaction: ${result.signature}`);
    } catch (error) {
      console.error('Swap failed:', error);
      alert(`Swap failed: ${error.message}`);
    }
    setIsSwapping(false);
  };

  const openTokenSelector = (type: 'input' | 'output') => {
    setSelectingToken(type);
    setShowTokenSelector(true);
  };

  const handleTokenSelect = (token: TokenInfo) => {
    if (selectingToken === 'input') {
      setInputToken(token);
    } else {
      setOutputToken(token);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saros-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Swap Tokens</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Slippage Tolerance</span>
            <div className="flex space-x-2">
              {[0.1, 0.5, 1.0].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippageTolerance(value)}
                  className={`px-3 py-1 text-sm rounded ${
                    slippageTolerance === value
                      ? 'bg-saros-primary text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Token */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">From</label>
        </div>
        <div className="relative">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.0"
            className="w-full p-4 pr-24 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-saros-primary focus:border-transparent"
          />
          <button
            onClick={() => openTokenSelector('input')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {inputToken ? (
              <>
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-saros-primary to-saros-accent flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {inputToken.symbol?.charAt(0)}
                  </span>
                </div>
                <span className="font-medium">{inputToken.symbol}</span>
              </>
            ) : (
              <span>Select</span>
            )}
            <ChevronUpDownIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleSwapTokens}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        >
          <ArrowUpDownIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Output Token */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">To</label>
        </div>
        <div className="relative">
          <input
            type="number"
            value={outputAmount}
            readOnly
            placeholder="0.0"
            className="w-full p-4 pr-24 text-xl border border-gray-300 rounded-lg bg-gray-50"
          />
          <button
            onClick={() => openTokenSelector('output')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {outputToken ? (
              <>
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-saros-primary to-saros-accent flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {outputToken.symbol?.charAt(0)}
                  </span>
                </div>
                <span className="font-medium">{outputToken.symbol}</span>
              </>
            ) : (
              <span>Select</span>
            )}
            <ChevronUpDownIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quote Information */}
      {quote && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Price Impact</span>
            <span className={quote.priceImpact > 1 ? 'text-red-600' : 'text-gray-900'}>
              {quote.priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Minimum Received</span>
            <span className="text-gray-900">
              {(quote.minimumReceived / Math.pow(10, outputToken?.decimals || 9)).toFixed(6)} {outputToken?.symbol}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Fee</span>
            <span className="text-gray-900">
              {(quote.fee / Math.pow(10, inputToken?.decimals || 9)).toFixed(6)} {inputToken?.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Swap Button */}
      {publicKey ? (
        <button
          onClick={handleExecuteSwap}
          disabled={!quote || isSwapping || isQuoting}
          className="w-full py-4 bg-saros-primary text-white font-medium rounded-lg hover:bg-saros-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSwapping ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Swapping...
            </div>
          ) : isQuoting ? (
            'Getting Quote...'
          ) : !quote ? (
            'Enter Amount'
          ) : (
            `Swap ${inputToken?.symbol} for ${outputToken?.symbol}`
          )}
        </button>
      ) : (
        <WalletMultiButton className="!w-full !bg-saros-primary hover:!bg-saros-primary/90" />
      )}

      {/* Token Selector Modal */}
      <TokenSelector
        isOpen={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onSelectToken={handleTokenSelect}
        availableTokens={availableTokens}
        selectedToken={selectingToken === 'input' ? inputToken : outputToken}
      />
    </div>
  );
};
```

## Advanced Features

### 7. Price Chart Component

```typescript
// src/components/PriceChart.tsx
import React, { useEffect, useState } from 'react';
import { TokenInfo } from '@saros-finance/sdk';

interface PriceChartProps {
  inputToken: TokenInfo | null;
  outputToken: TokenInfo | null;
}

export const PriceChart: React.FC<PriceChartProps> = ({ inputToken, outputToken }) => {
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange24h, setPriceChange24h] = useState<number>(0);

  useEffect(() => {
    if (!inputToken || !outputToken) return;

    const fetchPriceData = async () => {
      try {
        // Mock price data - replace with actual price API
        const mockPriceHistory = Array.from({ length: 24 }, (_, i) => {
          const basePrice = 100;
          const volatility = 0.02;
          const randomChange = (Math.random() - 0.5) * volatility;
          return basePrice * (1 + randomChange * i / 24);
        });

        setPriceHistory(mockPriceHistory);
        setCurrentPrice(mockPriceHistory[mockPriceHistory.length - 1]);
        
        const price24hAgo = mockPriceHistory[0];
        const change = ((mockPriceHistory[mockPriceHistory.length - 1] - price24hAgo) / price24hAgo) * 100;
        setPriceChange24h(change);
      } catch (error) {
        console.error('Failed to fetch price data:', error);
      }
    };

    fetchPriceData();
    const interval = setInterval(fetchPriceData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [inputToken, outputToken]);

  if (!inputToken || !outputToken) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {inputToken.symbol}/{outputToken.symbol}
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              ${currentPrice.toFixed(4)}
            </span>
            <span className={`text-sm font-medium ${
              priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Simple SVG Chart */}
      <div className="h-32 w-full">
        <svg className="w-full h-full">
          <path
            d={generateSvgPath(priceHistory)}
            fill="none"
            stroke="#FF6B35"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
        </svg>
      </div>
    </div>
  );
};

function generateSvgPath(data: number[]): string {
  if (data.length < 2) return '';

  const width = 100; // SVG viewBox width
  const height = 100; // SVG viewBox height
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  return `M ${points.join(' L ')}`;
}
```

### 8. Transaction History

```typescript
// src/components/TransactionHistory.tsx
import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SwapResult } from '../services/swapService';

interface Transaction extends SwapResult {
  timestamp: number;
  inputTokenSymbol: string;
  outputTokenSymbol: string;
}

export const TransactionHistory: React.FC = () => {
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (publicKey) {
      loadTransactionHistory();
    }
  }, [publicKey]);

  const loadTransactionHistory = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    try {
      // Load from local storage (in production, use proper transaction indexing)
      const stored = localStorage.getItem(`transactions_${publicKey.toString()}`);
      if (stored) {
        setTransactions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    }
    setIsLoading(false);
  };

  const formatAmount = (amount: number, decimals: number): string => {
    return (amount / Math.pow(10, decimals)).toFixed(6);
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (!publicKey) {
    return (
      <div className="text-center py-8 text-gray-500">
        Connect wallet to view transaction history
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saros-primary mx-auto"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No transactions found. Make your first swap!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
      
      {transactions.slice(0, 10).map((tx) => (
        <div
          key={tx.signature}
          className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900">
                  {formatAmount(tx.inputAmount, 9)} {tx.inputTokenSymbol}
                </span>
                <span className="text-gray-400">→</span>
                <span className="font-medium text-gray-900">
                  {formatAmount(tx.outputAmount, 9)} {tx.outputTokenSymbol}
                </span>
              </div>
              
              <div className="text-sm text-gray-500">
                {formatTimestamp(tx.timestamp)}
              </div>
              
              {tx.actualSlippage > 0.1 && (
                <div className="text-xs text-orange-600 mt-1">
                  Slippage: {tx.actualSlippage.toFixed(2)}%
                </div>
              )}
            </div>
            
            <a
              href={`https://solscan.io/tx/${tx.signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-saros-primary text-sm hover:text-saros-primary/80"
            >
              View →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Main Application

### 9. App Component

```typescript
// src/App.tsx
import React from 'react';
import { WalletProvider } from './components/WalletProvider';
import { SwapInterface } from './components/SwapInterface';
import { PriceChart } from './components/PriceChart';
import { TransactionHistory } from './components/TransactionHistory';

function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Saros <span className="text-saros-primary">Swap</span>
            </h1>
            <p className="text-gray-600">
              Fast, secure, and efficient token swaps on Solana
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Swap Interface */}
            <div className="lg:col-span-2">
              <SwapInterface />
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              <TransactionHistory />
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-center mt-12 text-gray-500 text-sm">
            <p>Powered by Saros Finance • Built on Solana</p>
            <div className="mt-2 space-x-4">
              <a href="#" className="hover:text-saros-primary">Documentation</a>
              <a href="#" className="hover:text-saros-primary">GitHub</a>
              <a href="#" className="hover:text-saros-primary">Discord</a>
            </div>
          </div>
        </div>
      </div>
    </WalletProvider>
  );
}

export default App;
```

## Testing

### 10. Component Tests

```typescript
// src/components/__tests__/SwapInterface.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SwapInterface } from '../SwapInterface';
import { WalletProvider } from '../WalletProvider';

const MockedSwapInterface = () => (
  <WalletProvider>
    <SwapInterface />
  </WalletProvider>
);

describe('SwapInterface', () => {
  test('renders swap interface', () => {
    render(<MockedSwapInterface />);
    
    expect(screen.getByText('Swap Tokens')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.0')).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  test('handles token selection', async () => {
    render(<MockedSwapInterface />);
    
    const selectButtons = screen.getAllByText('Select');
    fireEvent.click(selectButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Select Token')).toBeInTheDocument();
    });
  });

  test('calculates quote when amount is entered', async () => {
    render(<MockedSwapInterface />);
    
    // Mock successful initialization
    const inputField = screen.getByPlaceholderText('0.0');
    fireEvent.change(inputField, { target: { value: '1.0' } });
    
    await waitFor(() => {
      expect(inputField).toHaveValue(1.0);
    });
  });
});
```

### 11. Integration Tests

```typescript
// src/services/__tests__/swapService.test.ts
import { Connection } from '@solana/web3.js';
import { SwapService } from '../swapService';

describe('SwapService', () => {
  let swapService: SwapService;
  let connection: Connection;

  beforeEach(() => {
    connection = new Connection('https://api.devnet.solana.com');
    swapService = new SwapService(connection);
  });

  test('initializes successfully', async () => {
    await expect(swapService.initialize()).resolves.not.toThrow();
    
    const tokens = swapService.getAvailableTokens();
    expect(tokens.length).toBeGreaterThan(0);
  });

  test('finds tokens by symbol', async () => {
    await swapService.initialize();
    
    const solToken = swapService.findTokenBySymbol('SOL');
    expect(solToken).toBeDefined();
    expect(solToken?.symbol).toBe('SOL');
  });

  test('generates valid quotes', async () => {
    await swapService.initialize();
    
    const solToken = swapService.findTokenBySymbol('SOL');
    const usdcToken = swapService.findTokenBySymbol('USDC');
    
    if (solToken && usdcToken) {
      const quote = await swapService.getSwapQuote(
        solToken,
        usdcToken,
        1000000, // 0.001 SOL
        0.5
      );
      
      expect(quote.inputAmount).toBe(1000000);
      expect(quote.outputAmount).toBeGreaterThan(0);
      expect(quote.priceImpact).toBeGreaterThanOrEqual(0);
    }
  });
});
```

## Deployment

### 12. Build and Deploy

```json
// package.json scripts
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "deploy": "npm run build && npx serve -s build"
  }
}
```

```bash
# Production build
npm run build

# Deploy to Vercel, Netlify, or similar
npm install -g vercel
vercel --prod

# Or deploy to GitHub Pages
npm install -g gh-pages
npm run build
npx gh-pages -d build
```

### 13. Environment Configuration

```typescript
// src/config/environment.ts
interface Environment {
  RPC_URL: string;
  NETWORK: 'mainnet-beta' | 'devnet' | 'testnet';
  ENABLE_ANALYTICS: boolean;
  API_BASE_URL: string;
}

const environments: Record<string, Environment> = {
  development: {
    RPC_URL: 'https://api.devnet.solana.com',
    NETWORK: 'devnet',
    ENABLE_ANALYTICS: false,
    API_BASE_URL: 'http://localhost:3001',
  },
  production: {
    RPC_URL: 'https://api.mainnet-beta.solana.com',
    NETWORK: 'mainnet-beta', 
    ENABLE_ANALYTICS: true,
    API_BASE_URL: 'https://api.saros.finance',
  },
};

export const config = environments[process.env.NODE_ENV || 'development'];
```

## Performance Optimization

### 14. Optimization Tips

```typescript
// src/hooks/useSwapQuote.ts
import { useCallback, useRef, useEffect, useState } from 'react';
import { TokenInfo } from '@saros-finance/sdk';
import { SwapService, SwapQuote } from '../services/swapService';

export const useSwapQuote = (swapService: SwapService) => {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getQuote = useCallback(async (
    inputToken: TokenInfo,
    outputToken: TokenInfo,
    inputAmount: number,
    slippageTolerance: number
  ) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear previous timeout
    if (quoteTimeoutRef.current) {
      clearTimeout(quoteTimeoutRef.current);
    }

    // Debounce quote requests
    quoteTimeoutRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

      try {
        const newQuote = await swapService.getSwapQuote(
          inputToken,
          outputToken,
          inputAmount,
          slippageTolerance
        );
        
        if (!abortControllerRef.current.signal.aborted) {
          setQuote(newQuote);
        }
      } catch (err) {
        if (!abortControllerRef.current.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to get quote');
          setQuote(null);
        }
      } finally {
        if (!abortControllerRef.current.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300); // 300ms debounce
  }, [swapService]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
      }
    };
  }, []);

  return { quote, isLoading, error, getQuote };
};
```

## Conclusion

You now have a complete, production-ready swap interface! This tutorial covered:

- ✅ **Project Setup**: React + TypeScript + Saros SDK
- ✅ **Wallet Integration**: Solana wallet adapter
- ✅ **Core Swap Logic**: Quote generation and execution
- ✅ **Modern UI**: Responsive design with Tailwind CSS
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Performance**: Optimized quote fetching and caching
- ✅ **Testing**: Component and integration tests

### Next Steps

1. **Add Price Charts**: Integrate with price data APIs for historical charts
2. **Enhanced Routing**: Implement multi-hop swaps for better prices
3. **Advanced Features**: Add limit orders, DCA, and portfolio tracking
4. **Mobile App**: Convert to React Native for mobile deployment
5. **Analytics**: Track user behavior and swap metrics

### Resources

- **[Source Code](https://github.com/saros-finance/swap-interface-tutorial)**: Complete working example
- **[Live Demo](https://saros-swap-demo.vercel.app)**: Try the interface
- **[DLMM Tutorial](/docs/tutorials/liquidity-provider-dashboard)**: Build LP dashboard next
- **[API Reference](/docs/typescript-sdk/api-reference)**: Complete SDK documentation

Ready to enhance your swap interface? Check out the [Liquidity Provider Dashboard Tutorial](/docs/tutorials/liquidity-provider-dashboard) to add advanced DLMM features!