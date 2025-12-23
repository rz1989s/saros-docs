# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Docusaurus-based documentation site for Saros Finance SDKs on Solana. The site provides comprehensive documentation for multiple SDKs (TypeScript, DLMM, and Rust) with interactive examples, tutorials, and API references.

**Live Site**: https://saros-docs.rectorspace.com  
**Repository**: https://github.com/rz1989s/saros-docs

## Common Development Commands

### Development & Building
- Start development server: `npm run dev` (binds to 0.0.0.0:3003 for Docker compatibility)
- Start local server: `npm start` (default port 3000)
- Build production: `npm run build`
- Build with bundle analyzer: `npm run build:analyze` (useful for optimization)
- Serve production build: `npm run serve:build` (port 3003)
- Clear Docusaurus cache: `npm run clear`

### Code Quality
- Type check: `npm run typecheck`
- Lint code: `npm run lint:fix`
- Format code: `npm run format`
- Check formatting: `npm run format:check`

### Testing & Validation
- Run all tests: `npm test`
- Run single test file: `npm test -- path/to/test.test.ts`
- Watch tests during development: `npm run test:watch`
- Run tests with coverage: `npm run test:coverage`
- Test example code: `npm run test:examples`
- Validate all documentation examples: `npm run validate:examples` (critical - validates TypeScript code blocks)
- Check markdown links: `npm run test:links`
- Validate search configuration: `npm run validate:algolia`
- Validate build process: `npm run validate:build`
- Complete CI pipeline: `npm run ci`

#### Network Testing
- Test devnet connectivity: `npm run test:devnet`
- Test mainnet connectivity: `npm run test:mainnet`
- Test both networks: `npm run test:networks`
- Verbose network testing: `npm run test:networks:verbose`
- All networks testing: `npm run test:networks:all`

#### Integration Testing
- Run integration tests: `npm run test:integration`
- Verbose integration tests: `npm run test:integration:verbose`
- SDK integration tests: `npm run test:sdk`
- Example validation tests: `npm run test:examples:validate`

### Deployment
- Deploy to Vercel: `npm run deploy:vercel`
- Deploy to Netlify: `npm run deploy:netlify`
- Deploy to GitHub Pages: `npm run deploy:github`
- Test deployment: `npm run deploy:test`
- Docker build: `npm run docker:build` && `npm run docker:run`

### Docker Environment Profiles
- Development with hot reload: `npm run docker:dev` or `docker-compose --profile dev up`
- Production build: `npm run docker:prod` or `docker-compose --profile prod up -d`
- Static nginx serving: `docker-compose --profile static up`
- Build only: `docker-compose --profile build up`
- Performance testing: `docker-compose --profile test up` (includes Lighthouse)

## High-Level Architecture

### Documentation Structure
The site is organized into multiple documentation sidebars defined in `sidebars.ts`:
- **Getting Started**: Overview, installation, quick start, SDK comparison
- **TypeScript SDK**: Full SDK documentation for `@saros-finance/sdk`
- **DLMM SDK**: Concentrated liquidity documentation for `@saros-finance/dlmm-sdk`
- **Rust SDK**: High-performance DLMM SDK in Rust
- **Tutorials**: Step-by-step implementation guides
- **Examples**: Complete working code examples
- **Tools**: Interactive API explorer

### Component Architecture
- **React Components**: Located in `src/components/`
- **APIExplorer**: Interactive component for testing SDK methods (`src/components/APIExplorer.tsx`)
  - Uses proper TypeScript interfaces (no `any` types allowed)
  - Mock SDK implementations for documentation purposes
  - Real-time parameter validation and error handling
- **HomepageFeatures**: Landing page feature cards
- **Custom CSS**: Site-wide styling in `src/css/custom.css`
- **Visual Assets**: Architecture diagrams and flow charts in `static/img/` (SVG format)

### Testing Infrastructure
- **Jest Configuration**: TypeScript support with custom module mapping in `jest.config.js`
  - Test timeout: 30 seconds for network operations
  - Multiple reporters: JUnit XML, HTML, and console output
- **Mock SDKs**: Test doubles in `__mocks__/@saros-finance/` for SDK packages
- **Test Setup**: Global test configuration in `tests/setup.ts`
- **Test Artifacts**: Results generated in `test-results/` directory
  - HTML test report: `test-results/test-report.html`
  - JUnit XML: `test-results/junit.xml`
  - Coverage reports: `coverage/` directory (text, lcov, html formats)
- **Validation Script**: `scripts/validate-examples.js` validates all TypeScript code blocks in documentation
- **Network Testing Scripts**: 
  - `scripts/test-devnet.js` - DevNet connectivity and functionality
  - `scripts/test-mainnet.js` - MainNet pool validation
  - `scripts/test-networks.js` - Unified network testing with aggressive testing mode
- **Integration Testing**: `scripts/run-integration-tests.js` with suite-based execution

### Content Organization
- **Documentation**: All content in `docs/` directory with `.md` and `.mdx` files
- **Code Examples**: Complete, runnable examples with error handling and proper TypeScript types
- **API References**: Auto-generated or manually maintained API documentation
- **Tutorials**: Multi-step guides for building applications
- **Visual Documentation**: Architecture diagrams in `static/img/`:
  - `saros-sdk-architecture.svg` - SDK ecosystem overview
  - `swap-flow-diagram.svg` - Token swap process visualization
  - `dlmm-bins-visualization.svg` - Concentrated liquidity comparison
  - `integration-workflow.svg` - Developer integration journey
- **Submission Assets**: Screenshots and submission materials in `screenshots/submission/`:
  - 6 required screenshots for challenge submission
  - Properly named following convention: `1. Home Page - Landing Page.png`, etc.
  - High-quality PNG format optimized for submission

## Important Project-Specific Notes

### Validation System
The `validate-examples.js` script performs comprehensive checks on documentation:
- Validates TypeScript code compilation
- Ensures examples have error handling
- Checks for security issues (no hardcoded keys)
- Verifies internal links are not broken
- Tests that the full build process works

### Mock Dependencies
SDK packages are mocked in `__mocks__/@saros-finance/` to enable testing without actual blockchain connections. When adding new SDK examples, update the corresponding mock files.

### Search Configuration
Algolia DocSearch is configured but requires real credentials (currently placeholders in `docusaurus.config.ts`). Apply at https://docsearch.algolia.com/apply/ and update the config.

### Deployment Architecture
- **Primary**: Vercel deployment to `saros-docs.rectorspace.com`
- **Live URL**: https://saros-docs.rectorspace.com
- **CI/CD**: GitHub Actions for automated deployment
- **Docker**: Full containerization support with nginx serving
- **Multiple Targets**: Support for Netlify, GitHub Pages, and custom hosting
- **Build Verification**: Always run `npm run build && npm run typecheck` before deployment

## Development Workflow

### Initial Setup
1. **Clone repository** and install dependencies: `npm install`
2. **Install Git hooks**: `npm run prepare` (sets up Husky - note: pre-commit hooks not yet configured)
3. **Environment Configuration**: Copy `.env.example` to `.env.local` if needed for custom settings
4. **Node.js Requirements**: Ensure Node.js 18+ is installed (checked by deploy scripts)

### Development Process
1. **Adding New Documentation**: Create `.md` or `.mdx` files in appropriate `docs/` subdirectories
   - Update `sidebars.ts` if adding new sections
   - Include visual diagrams from `static/img/` when helpful
2. **Adding Code Examples**: Include complete, runnable TypeScript with error handling
   - All examples must compile and pass validation
   - Use proper TypeScript interfaces, never `any` types
3. **Adding Visual Content**: Create SVG diagrams in `static/img/` for complex concepts
4. **Modifying Components**: Follow strict TypeScript typing in `src/components/`
   - APIExplorer requires proper interfaces and error handling
5. **Before Committing**: Always run `npm run validate:examples` to ensure code examples are valid
6. **Testing**: Use `npm run test:coverage` for comprehensive testing including example validation
7. **Network Validation**: Run `npm run test:networks` to verify connectivity
8. **Build Verification**: Run `npm run build && npm run typecheck` before deploying

## Security Considerations

- Never include real private keys in examples - use placeholder patterns or environment variables
- All code examples should include proper error handling
- Validate user inputs in interactive components like API Explorer
- Use system program addresses for examples: `11111111111111111111111111111112`

## Bounty Achievement

**1st Place Winner** - Saros SDK Guide Challenge (December 2024)

This documentation won **1st place (300 USDC)** in the Saros SDK Guide Challenge bounty, competing against other submissions for the top spot.

### What Made This Win
- **Comprehensive Coverage**: Quick-start guide, 5+ tutorials, 15+ working examples
- **Production Quality**: All code tested on DevNet/MainNet with full validation
- **Interactive Features**: API Explorer for live SDK method testing
- **Visual Documentation**: Architecture diagrams, flow charts, and SDK comparisons
- **Developer Experience**: Clear navigation, search functionality, responsive design
- **Live Site**: Production deployment at https://saros-docs.rectorspace.com

## Critical Project Files

### Configuration Files
- `sidebars.ts` - Documentation structure and navigation (defines all doc sections)
- `docusaurus.config.ts` - Site configuration, URL settings, and plugin configuration
- `.eslintrc.js` - TypeScript linting rules (no `any` types in components)
- `jest.config.js` - Test configuration with mock module mapping

### Key Scripts
- `scripts/validate-examples.js` - Validates all TypeScript code blocks in documentation
- `scripts/test-networks.js` - Comprehensive network connectivity testing
- `scripts/run-integration-tests.js` - Integration test orchestration
- `scripts/test-algolia.js` - Algolia search configuration testing

### Environment Files
- `.env.example` - Template for environment configuration
- `.env.local` - Local development environment variables (create from example)
- Node.js 18+ required (checked by deploy scripts)

## Common Troubleshooting

### Internal Link Issues
- Docusaurus generates anchor IDs by converting headers to lowercase and replacing spaces with dashes
- Use format `#section-name` for links (not `#section-name-general` or custom anchors)
- Always test links with `npm run validate:examples`

### TypeScript Requirements
- APIExplorer component requires strict typing - minimize `any` types (ESLint warns but allows)
- ESLint Configuration: `@typescript-eslint/no-explicit-any` is set to 'warn' (not error)
- Use proper interfaces for all SDK mock implementations
- Cast `unknown` types appropriately when needed
- TypeScript compilation must pass without errors before committing
- Note: Lint-staged is installed but not yet configured for pre-commit hooks

### Network Testing
- DevNet testing allows state changes and is safe for aggressive testing
  - Uses faucet for funding - no real SOL required
  - Can perform state-changing operations safely
  - Aggressive testing mode available with `--all` flag
- MainNet testing is read-only and validates real pool data
  - CRITICAL: Read-only operations only
  - Validates actual pool existence and data integrity
  - No state changes allowed for safety
- Network scripts generate detailed reports in `test-results/` directory with comprehensive coverage metrics