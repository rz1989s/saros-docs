import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Saros SDK Documentation',
  tagline: 'Build DeFi applications on Solana with Saros Finance SDKs',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://saros-docs.rectorspace.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'saros-xyz', // Usually your GitHub org/user name.
  projectName: 'saros-sdk', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Remove edit links for now since this is documentation for external SDKs
          editUrl: undefined,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Remove edit links for blog posts
          editUrl: undefined,
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/saros-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      hideOnScroll: true,
      logo: {
        alt: 'Saros Finance Logo',
        src: 'img/saros-logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'gettingStartedSidebar',
          position: 'left',
          label: 'Getting Started',
        },
        {
          type: 'docSidebar',
          sidebarId: 'typescriptSdkSidebar',
          position: 'left',
          label: 'TypeScript SDK',
        },
        {
          type: 'docSidebar',
          sidebarId: 'dlmmSdkSidebar',
          position: 'left',
          label: 'DLMM SDK',
        },
        {
          type: 'docSidebar',
          sidebarId: 'rustSdkSidebar',
          position: 'left',
          label: 'Rust SDK',
        },
        {
          type: 'docSidebar',
          sidebarId: 'tutorialsSidebar',
          position: 'left',
          label: 'Tutorials',
        },
        {
          type: 'docSidebar',
          sidebarId: 'toolsSidebar',
          position: 'left',
          label: 'Tools',
        },
        {
          to: '/docs/interactive-examples',
          label: '🎮 Interactive',
          position: 'left',
        },
        {
          href: 'https://github.com/saros-xyz/saros-sdk',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started/overview',
            },
            {
              label: 'TypeScript SDK',
              to: '/docs/typescript-sdk/installation',
            },
            {
              label: 'DLMM SDK',
              to: '/docs/dlmm-sdk/overview',
            },
            {
              label: 'Rust SDK',
              to: '/docs/rust-sdk/getting-started',
            },
          ],
        },
        {
          title: 'SDKs',
          items: [
            {
              label: '@saros-finance/sdk',
              href: 'https://www.npmjs.com/package/@saros-finance/sdk',
            },
            {
              label: '@saros-finance/dlmm-sdk',
              href: 'https://www.npmjs.com/package/@saros-finance/dlmm-sdk',
            },
            {
              label: 'saros-dlmm-sdk-rs',
              href: 'https://github.com/saros-xyz/saros-dlmm-sdk-rs',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Telegram',
              href: 'https://t.me/SarosFinance',
            },
            {
              label: 'Discord',
              href: 'https://discord.gg/sarosfinance',
            },
            {
              label: 'X (Twitter)',
              href: 'https://x.com/saros_xyz',
            },
            {
              label: 'YouTube',
              href: 'https://www.youtube.com/@saros_xyz',
            },
            {
              label: 'Sarosians Hub',
              href: 'https://x.com/i/communities/1919946232866472247',
            },
            {
              label: 'Developer Support',
              href: 'https://t.me/+DLLPYFzvTzJmNTJh',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Saros Finance',
              href: 'https://saros.xyz',
            },
            {
              label: 'Official Docs',
              href: 'https://docs.saros.xyz',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/saros-xyz',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Saros Finance. Documentation built with Docusaurus.`,
    },
    // Algolia DocSearch configuration
    // Environment variables override placeholder values for production
    // Apply for DocSearch at: https://docsearch.algolia.com/apply/
    algolia: {
      // Application ID provided by Algolia
      appId: process.env.ALGOLIA_APP_ID || 'SAROS_DOCS_APP_ID',
      
      // Public API key: it is safe to commit it
      apiKey: process.env.ALGOLIA_SEARCH_API_KEY || '1234567890abcdef1234567890abcdef',
      
      // Index name for Saros SDK documentation
      indexName: process.env.ALGOLIA_INDEX_NAME || 'saros-sdk-docs',
      
      // Contextual search for better results
      contextualSearch: true,
      
      // Replace with your actual domain in production
      externalUrlRegex: `saros-docs\\.rectorspace\\.com|docs\\.saros\\.xyz`,
      
      // Search parameters for better relevance
      searchParameters: {
        facetFilters: ['type:content'],
        hitsPerPage: 20,
        attributesToRetrieve: [
          'hierarchy.lvl0',
          'hierarchy.lvl1', 
          'hierarchy.lvl2',
          'hierarchy.lvl3',
          'content',
          'type',
          'url'
        ],
        attributesToHighlight: [
          'hierarchy.lvl0',
          'hierarchy.lvl1',
          'hierarchy.lvl2', 
          'hierarchy.lvl3',
          'content'
        ],
        attributesToSnippet: ['content:20'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        minWordSizefor1Typo: 3,
        minWordSizefor2Typos: 7,
        allowTyposOnNumericTokens: false,
        minProximity: 1,
        ignorePlurals: true,
        advancedSyntax: true,
        analytics: true,
        enableRules: true
      },
      
      // Search page configuration
      searchPagePath: 'search',
      
      // Placeholder configuration notice
      placeholder: process.env.ALGOLIA_APP_ID ? 'Search documentation...' : 'Search (Configure Algolia)'
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['rust', 'toml', 'bash', 'json', 'typescript', 'javascript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
