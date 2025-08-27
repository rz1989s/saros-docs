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
    navbar: {
      title: 'Saros SDK',
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
          sidebarId: 'examplesSidebar',
          position: 'left',
          label: 'Examples',
        },
        {
          type: 'docSidebar',
          sidebarId: 'toolsSidebar',
          position: 'left',
          label: 'Tools',
        },
        {
          href: 'https://github.com/saros-xyz/saros-sdk',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://saros.xyz',
          label: 'Saros Finance',
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
              label: 'Twitter',
              href: 'https://twitter.com/SarosFinance',
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
    // Note: Replace these placeholder values with real Algolia credentials
    // Apply for DocSearch at: https://docsearch.algolia.com/apply/
    algolia: {
      // The application ID provided by Algolia
      appId: 'YOUR_APP_ID',
      
      // Public API key: it is safe to commit it  
      apiKey: 'YOUR_SEARCH_API_KEY',
      
      // The index name
      indexName: 'saros-sdk-docs',
      
      // Optional: see doc section below
      contextualSearch: true,
      
      // Optional: Specify domains where the navigation should occur through window.location instead on history.push
      externalUrlRegex: 'external\\.com|domain\\.com',
      
      // Optional: Algolia search parameters
      searchParameters: {},
      
      // Optional: path for search page that enabled by default (`false` to disable it)  
      searchPagePath: 'search',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['rust', 'toml', 'bash', 'json', 'typescript', 'javascript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
