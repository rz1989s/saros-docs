import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Getting Started sidebar
  gettingStartedSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/overview',
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/sdk-comparison',
      ],
    },
  ],

  // TypeScript SDK sidebar
  typescriptSdkSidebar: [
    {
      type: 'category',
      label: 'TypeScript SDK',
      items: [
        'typescript-sdk/installation',
        'typescript-sdk/configuration',
        'typescript-sdk/amm',
        'typescript-sdk/staking',
        'typescript-sdk/farming',
        'typescript-sdk/api-reference',
      ],
    },
  ],

  // DLMM SDK sidebar (TypeScript)
  dlmmSdkSidebar: [
    {
      type: 'category',
      label: 'DLMM SDK (TypeScript)',
      items: [
        'dlmm-sdk/overview',
        'dlmm-sdk/installation',
        'dlmm-sdk/concentrated-liquidity',
        'dlmm-sdk/position-management',
        'dlmm-sdk/api-reference',
      ],
    },
  ],

  // Rust SDK sidebar
  rustSdkSidebar: [
    {
      type: 'category',
      label: 'Rust SDK (DLMM)',
      items: [
        'rust-sdk/getting-started',
        'rust-sdk/jupiter-integration',
        'rust-sdk/amm-trait',
        'rust-sdk/examples',
        'rust-sdk/api-reference',
      ],
    },
  ],

  // Tutorials sidebar
  tutorialsSidebar: [
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/building-swap-interface',
        'tutorials/liquidity-provider-dashboard',
      ],
    },
  ],

  // Examples sidebar
  examplesSidebar: [
    {
      type: 'category',
      label: 'Code Examples',
      items: [
        'examples/basic-token-swap',
        'examples/dlmm-position-creator',
        'examples/arbitrage-bot',
        'examples/liquidity-farming-strategy',
        'examples/staking-rewards-automation',
        'examples/portfolio-analytics-dashboard',
      ],
    },
  ],

  // Tools sidebar
  toolsSidebar: [
    {
      type: 'category',
      label: 'Developer Tools',
      items: [
        'api-explorer',
      ],
    },
  ],
};

export default sidebars;
