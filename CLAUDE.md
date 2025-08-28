# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Docusaurus-based documentation site for Saros Finance SDKs on Solana. The site provides comprehensive documentation for multiple SDKs (TypeScript, DLMM, and Rust) with interactive examples, tutorials, and API references.

## Common Development Commands

### Development & Building
- Start development server: `npm run dev` (binds to 0.0.0.0 for Docker compatibility)
- Start local server: `npm start` 
- Build production: `npm run build`
- Serve production build: `npm run serve:build`
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
- **HomepageFeatures**: Landing page feature cards
- **Custom CSS**: Site-wide styling in `src/css/custom.css`

### Testing Infrastructure
- **Jest Configuration**: TypeScript support with custom module mapping in `jest.config.js`
- **Mock SDKs**: Test doubles in `__mocks__/@saros-finance/` for SDK packages
- **Test Setup**: Global test configuration in `tests/setup.ts`
- **Validation Script**: `scripts/validate-examples.js` validates all TypeScript code blocks in documentation

### Content Organization
- **Documentation**: All content in `docs/` directory with `.md` and `.mdx` files
- **Code Examples**: Complete, runnable examples with error handling and proper TypeScript types
- **API References**: Auto-generated or manually maintained API documentation
- **Tutorials**: Multi-step guides for building applications

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
- **CI/CD**: GitHub Actions for automated deployment
- **Docker**: Full containerization support with nginx serving
- **Multiple Targets**: Support for Netlify, GitHub Pages, and custom hosting

## Development Workflow

1. **Adding New Documentation**: Create `.md` or `.mdx` files in appropriate `docs/` subdirectories
2. **Adding Code Examples**: Include complete, runnable TypeScript with error handling
3. **Before Committing**: Always run `npm run validate:examples` to ensure code examples are valid
4. **Testing**: Use `npm run test:coverage` for comprehensive testing including example validation
5. **Build Verification**: Run `npm run build` before deploying to catch any build issues

## Security Considerations

- Never include real private keys in examples - use placeholder patterns or environment variables
- All code examples should include proper error handling
- Validate user inputs in interactive components like API Explorer
- Use system program addresses for examples: `11111111111111111111111111111112`