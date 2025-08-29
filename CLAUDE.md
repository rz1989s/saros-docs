# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Docusaurus-based documentation site for Saros Finance SDKs on Solana. The site provides comprehensive documentation for multiple SDKs (TypeScript, DLMM, and Rust) with interactive examples, tutorials, and API references.

**Challenge Context**: This documentation is part of the Saros SDK Guide Challenge submission (deadline: September 22, 2025) with a $1,500 USDC prize pool. See `SUBMISSION.md` for complete submission details.

## Common Development Commands

### Development & Building
- Start development server: `npm run dev` (binds to 0.0.0.0:3003 for Docker compatibility)
- Start local server: `npm start` (default port 3000)
- Build production: `npm run build`
- Serve production build: `npm run serve:build` (port 3003)
- Clear Docusaurus cache: `npm run clear`

### Code Quality
- Type check: `npm run typecheck`
- Lint code: `npm run lint:fix`
- Format code: `npm run format`
- Check formatting: `npm run format:check`

### Testing & Validation
- Run all tests: `npm test`
- Run tests with coverage: `npm run test:coverage`
- Test example code: `npm run test:examples`
- Validate all documentation examples: `npm run validate:examples` (critical - validates TypeScript code blocks)
- Check markdown links: `npm run test:links`
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
- Docker build: `npm run docker:build` && `npm run docker:run`

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
- **Mock SDKs**: Test doubles in `__mocks__/@saros-finance/` for SDK packages
- **Test Setup**: Global test configuration in `tests/setup.ts`
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

## Challenge Submission Status

This documentation is optimized for the Saros SDK Guide Challenge with:
- **Required Components**: ✅ All met (quick-start guide, 5 tutorials, 15 examples)
- **Bonus Components**: ✅ All included (API references, analysis, visual aids, interactive features)
- **Quality Standards**: ✅ All code tested on devnet/mainnet
- **Submission Package**: Complete details in `SUBMISSION.md`
- **Target**: 1st-3rd place positioning with unique interactive features

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

## Common Troubleshooting

### Internal Link Issues
- Docusaurus generates anchor IDs by converting headers to lowercase and replacing spaces with dashes
- Use format `#section-name` for links (not `#section-name-general` or custom anchors)
- Always test links with `npm run validate:examples`

### TypeScript Requirements
- APIExplorer component requires strict typing - no `any` types allowed
- Use proper interfaces for all SDK mock implementations
- Cast `unknown` types appropriately when needed

### Network Testing
- DevNet testing allows state changes and is safe for aggressive testing
- MainNet testing is read-only and validates real pool data
- Network scripts generate detailed reports in `test-results/` directory