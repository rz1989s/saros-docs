import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';

// Mock SDK types for documentation purposes
type SarosSDK = {
  getPoolInfo: (poolId: string) => Promise<any>;
  getAllPools: () => Promise<any>;
  getQuote: (params: any) => Promise<any>;
  executeSwap: (params: any) => Promise<any>;
  getStakingPools: () => Promise<any>;
  stake: (params: any) => Promise<any>;
};

type DLMMSDKv2 = {
  createPosition: (params: any) => Promise<any>;
  addLiquidity: (params: any) => Promise<any>;
  removeLiquidity: (params: any) => Promise<any>;
  getBinPrices: (poolId: string) => Promise<any>;
};

interface APIMethod {
  name: string;
  description: string;
  category: string;
  params: APIParam[];
  returns: string;
  example: any;
}

interface APIParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: any;
}

const API_METHODS: APIMethod[] = [
  {
    name: 'getPoolInfo',
    description: 'Get detailed information about a specific pool',
    category: 'Pools',
    params: [
      {
        name: 'poolId',
        type: 'PublicKey',
        required: true,
        description: 'The public key of the pool to query'
      }
    ],
    returns: 'PoolInfo',
    example: {
      poolId: 'HZ1znC9XBasm9AMDhGocd9EHSyH8Pyj1EUdiPb4WnZjo'
    }
  },
  {
    name: 'getAllPools',
    description: 'Retrieve all available Saros pools',
    category: 'Pools',
    params: [],
    returns: 'Pool[]',
    example: {}
  },
  {
    name: 'getQuote',
    description: 'Get a swap quote for token exchange',
    category: 'Swaps',
    params: [
      {
        name: 'inputMint',
        type: 'PublicKey',
        required: true,
        description: 'Input token mint address'
      },
      {
        name: 'outputMint',
        type: 'PublicKey',
        required: true,
        description: 'Output token mint address'
      },
      {
        name: 'amount',
        type: 'number',
        required: true,
        description: 'Amount to swap (in token decimals)'
      },
      {
        name: 'slippageBps',
        type: 'number',
        required: false,
        description: 'Slippage tolerance in basis points',
        default: 100
      }
    ],
    returns: 'QuoteResponse',
    example: {
      inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      outputMint: 'So11111111111111111111111111111111111111112',
      amount: 1000000,
      slippageBps: 100
    }
  },
  {
    name: 'getUserPositions',
    description: 'Get all positions for a specific user',
    category: 'Positions',
    params: [
      {
        name: 'userAddress',
        type: 'PublicKey',
        required: true,
        description: 'User wallet address'
      }
    ],
    returns: 'UserPosition[]',
    example: {
      userAddress: 'YOUR_WALLET_ADDRESS'
    }
  },
  {
    name: 'createDLMMPosition',
    description: 'Create a new DLMM liquidity position',
    category: 'DLMM',
    params: [
      {
        name: 'poolId',
        type: 'PublicKey',
        required: true,
        description: 'DLMM pool ID'
      },
      {
        name: 'binId',
        type: 'number',
        required: true,
        description: 'Target bin ID for the position'
      },
      {
        name: 'amountX',
        type: 'number',
        required: true,
        description: 'Amount of token X to deposit'
      },
      {
        name: 'amountY',
        type: 'number',
        required: true,
        description: 'Amount of token Y to deposit'
      }
    ],
    returns: 'TransactionInstruction[]',
    example: {
      poolId: 'HZ1znC9XBasm9AMDhGocd9EHSyH8Pyj1EUdiPb4WnZjo',
      binId: 8388608,
      amountX: 1000000,
      amountY: 1000000
    }
  }
];

export const APIExplorer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Pools');
  const [selectedMethod, setSelectedMethod] = useState<APIMethod>(API_METHODS[0]);
  const [parameters, setParameters] = useState<{ [key: string]: any }>({});
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rpcUrl, setRpcUrl] = useState('https://api.devnet.solana.com');

  const categories = [...new Set(API_METHODS.map(method => method.category))];

  useEffect(() => {
    // Initialize parameters with example values
    const initialParams: { [key: string]: any } = {};
    selectedMethod.params.forEach(param => {
      if (selectedMethod.example[param.name] !== undefined) {
        initialParams[param.name] = selectedMethod.example[param.name];
      } else if (param.default !== undefined) {
        initialParams[param.name] = param.default;
      } else {
        initialParams[param.name] = '';
      }
    });
    setParameters(initialParams);
    setResponse(null);
    setError(null);
  }, [selectedMethod]);

  const handleMethodSelect = (method: APIMethod) => {
    setSelectedMethod(method);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const executeAPICall = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Mock SDK instances for documentation purposes
      const sdk = {
        getPoolInfo: async (poolId?: string) => ({ poolId: poolId || 'mock-pool', tokenA: 'USDC', tokenB: 'SOL' }),
        getAllPools: async () => [{ id: 'pool1' }, { id: 'pool2' }],
        getQuote: async (params?: any) => ({ inAmount: params?.amount || 1000000, outAmount: 950000 }),
        executeSwap: async (params?: any) => ({ success: true, signature: 'mock-signature' }),
        getStakingPools: async () => [{ poolId: 'stake1', apy: 12.5 }],
        stake: async (params?: any) => ({ success: true, amount: params?.amount || 1000000 }),
        getUserPositions: async (userAddress?: any) => [{ positionId: 'pos1', amount: 1000 }],
      };
      
      const dlmmSDK = {
        createPosition: async (params?: any) => ({ positionId: 'mock-position' }),
        addLiquidity: async (params?: any) => ({ success: true }),
        removeLiquidity: async (params?: any) => ({ success: true }),
        getBinPrices: async (poolId?: string) => ({ activeBin: 8388608, prices: [] }),
        createAddLiquidityInstructions: async (params?: any) => ({ instructions: [], positionId: 'mock-position' }),
      };

      // Validate required parameters
      for (const param of selectedMethod.params) {
        if (param.required && !parameters[param.name]) {
          throw new Error(`Parameter '${param.name}' is required`);
        }
      }

      // Convert string parameters to appropriate types
      const processedParams = { ...parameters };
      for (const param of selectedMethod.params) {
        if (param.type === 'PublicKey' && typeof processedParams[param.name] === 'string') {
          processedParams[param.name] = new PublicKey(processedParams[param.name]);
        } else if (param.type === 'number' && typeof processedParams[param.name] === 'string') {
          processedParams[param.name] = parseFloat(processedParams[param.name]);
        }
      }

      let result: any;

      // Execute the API call based on method name
      switch (selectedMethod.name) {
        case 'getPoolInfo':
          result = await sdk.getPoolInfo(processedParams.poolId);
          break;
        case 'getAllPools':
          result = await sdk.getAllPools();
          break;
        case 'getQuote':
          result = await sdk.getQuote({
            inputMint: processedParams.inputMint,
            outputMint: processedParams.outputMint,
            amount: processedParams.amount,
            slippageBps: processedParams.slippageBps || 100
          });
          break;
        case 'getUserPositions':
          result = await sdk.getUserPositions(processedParams.userAddress);
          break;
        case 'createDLMMPosition':
          result = await dlmmSDK.createAddLiquidityInstructions({
            poolId: processedParams.poolId,
            binId: processedParams.binId,
            amountX: processedParams.amountX,
            amountY: processedParams.amountY
          });
          break;
        default:
          throw new Error(`Method '${selectedMethod.name}' not implemented in explorer`);
      }

      setResponse(result);
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderParameterInput = (param: APIParam) => {
    const value = parameters[param.name] || '';

    return (
      <div key={param.name} className="parameter-input">
        <label className="parameter-label">
          {param.name}
          {param.required && <span className="required">*</span>}
          <span className="parameter-type">({param.type})</span>
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => handleParameterChange(param.name, e.target.value)}
          placeholder={param.description}
          className="parameter-field"
        />
        <div className="parameter-description">{param.description}</div>
      </div>
    );
  };

  return (
    <div className="api-explorer">
      <div className="explorer-header">
        <h2>🔧 Interactive API Explorer</h2>
        <p>Test Saros SDK methods directly in your browser</p>
      </div>

      <div className="explorer-controls">
        <div className="rpc-config">
          <label>RPC Endpoint:</label>
          <select 
            value={rpcUrl} 
            onChange={(e) => setRpcUrl(e.target.value)}
            className="rpc-select"
          >
            <option value="https://api.devnet.solana.com">Devnet</option>
            <option value="https://api.mainnet-beta.solana.com">Mainnet</option>
            <option value="https://api.testnet.solana.com">Testnet</option>
          </select>
        </div>
      </div>

      <div className="explorer-content">
        <div className="method-selector">
          <div className="categories">
            {categories.map(category => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="methods">
            {API_METHODS
              .filter(method => method.category === selectedCategory)
              .map(method => (
                <div
                  key={method.name}
                  className={`method-item ${selectedMethod.name === method.name ? 'active' : ''}`}
                  onClick={() => handleMethodSelect(method)}
                >
                  <div className="method-name">{method.name}</div>
                  <div className="method-description">{method.description}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="method-details">
          <div className="method-header">
            <h3>{selectedMethod.name}</h3>
            <div className="method-info">
              <span className="method-category">{selectedMethod.category}</span>
              <span className="method-returns">Returns: {selectedMethod.returns}</span>
            </div>
          </div>

          <div className="method-description-full">
            {selectedMethod.description}
          </div>

          {selectedMethod.params.length > 0 && (
            <div className="parameters-section">
              <h4>Parameters</h4>
              <div className="parameters">
                {selectedMethod.params.map(param => renderParameterInput(param))}
              </div>
            </div>
          )}

          <div className="execute-section">
            <button
              onClick={executeAPICall}
              disabled={loading}
              className="execute-btn"
            >
              {loading ? 'Executing...' : 'Execute API Call'}
            </button>
          </div>

          {error && (
            <div className="error-section">
              <h4>Error</h4>
              <pre className="error-content">{error}</pre>
            </div>
          )}

          {response && (
            <div className="response-section">
              <h4>Response</h4>
              <pre className="response-content">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}

          <div className="code-example-section">
            <h4>Code Example</h4>
            <pre className="code-example">
{`import { Connection, PublicKey } from '@solana/web3.js';
import { SarosSDK${selectedMethod.category === 'DLMM' ? ', DLMMSDKv2' : ''} } from '@saros-finance/sdk';

const connection = new Connection('${rpcUrl}');
const sdk = new SarosSDK(connection);${selectedMethod.category === 'DLMM' ? '\nconst dlmmSDK = new DLMMSDKv2(connection);' : ''}

async function ${selectedMethod.name}Example() {
  try {
${selectedMethod.params.map(param => {
  const value = param.type === 'PublicKey' 
    ? `new PublicKey('${parameters[param.name] || 'YOUR_' + param.name.toUpperCase()}')`
    : param.type === 'string'
    ? `'${parameters[param.name] || param.default || 'YOUR_' + param.name.toUpperCase()}'`
    : parameters[param.name] || param.default || '0';
  return `    const ${param.name} = ${value};`;
}).join('\n')}

    const result = await ${selectedMethod.category === 'DLMM' && selectedMethod.name.includes('DLMM') ? 'dlmmSDK' : 'sdk'}.${selectedMethod.name}(${
  selectedMethod.params.length === 0 ? '' :
  selectedMethod.params.length === 1 ? selectedMethod.params[0].name :
  `{\n${selectedMethod.params.map(p => `      ${p.name}`).join(',\n')}\n    }`
});
    
    console.log('Result:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIExplorer;