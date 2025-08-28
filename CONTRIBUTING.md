# Contributing to Saros SDK Documentation

Assalamu'alaikum and welcome! We appreciate your interest in improving Saros SDK documentation. This guide helps you contribute effectively to our comprehensive developer resources.

## 🎯 Quick Start

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install** dependencies: `npm install`
4. **Start** development: `npm run dev`
5. **Make** your changes
6. **Test** thoroughly: `npm run validate:examples`
7. **Submit** a pull request

## 📝 Contributing Guidelines

### What We Welcome

- **New Examples**: Working code demonstrating SDK features
- **Tutorial Improvements**: Step-by-step guides for common use cases
- **Bug Fixes**: Corrections to code examples or documentation
- **Performance Optimizations**: Better patterns and best practices
- **Translation**: Multi-language documentation support
- **Visual Aids**: Diagrams, screenshots, and interactive elements

### Documentation Standards

#### Code Examples
All code examples must:
- ✅ **Compile successfully** with current SDK versions
- ✅ **Include error handling** for production readiness
- ✅ **Use TypeScript** with proper typing
- ✅ **Test on DevNet** before submission
- ✅ **Follow security best practices** (no hardcoded keys)

```typescript
// ✅ Good example
try {
  const quote = await sdk.getSwapQuote({
    inputMint: USDC_MINT,
    outputMint: SOL_MINT,
    inputAmount: 100 * 1e6, // 100 USDC
    slippageTolerance: 0.005 // 0.5%
  });
  
  if (quote.priceImpact > 0.03) {
    throw new Error('Price impact too high');
  }
} catch (error) {
  console.error('Swap quote failed:', error.message);
  throw error;
}
```

#### Writing Style
- **Clear and concise**: Optimize for developer workflow
- **Action-oriented**: Use imperative voice ("Create a swap", not "You can create")
- **Beginner-friendly**: Explain concepts without being condescending
- **Code-first**: Show working examples before explaining theory

### Development Workflow

#### Setting Up Development Environment

```bash
# Clone and setup
git clone https://github.com/saros-xyz/saros-sdk-docs.git
cd saros-sdk-docs
npm install

# Environment configuration
cp .env.example .env.local
# Edit .env.local with your settings

# Start development
npm run dev
```

#### Before Submitting

Run our validation pipeline:

```bash
# Validate all code examples
npm run validate:examples

# Check TypeScript compilation
npm run typecheck

# Lint and format
npm run lint:fix
npm run format

# Test documentation build
npm run build

# Run full test suite
npm test
```

### File Structure and Organization

```
docs/
├── getting-started/       # Quick start guides
├── typescript-sdk/        # @saros-finance/sdk docs
├── dlmm-sdk/             # @saros-finance/dlmm-sdk docs  
├── rust-sdk/             # Rust SDK documentation
├── tutorials/            # Step-by-step guides
├── examples/             # Working code examples
└── troubleshooting.md    # FAQ and common issues

src/
├── components/           # React components
├── css/                 # Custom styling
└── pages/               # Custom pages

tests/
├── example-tests.ts     # Code example validation
├── integration/         # SDK integration tests
└── setup.js            # Test configuration
```

## 🧪 Testing Requirements

### Code Example Validation

All code examples are automatically tested:

```bash
# Test specific examples
npm run test:examples

# Test network connectivity  
npm run test:networks

# Integration testing
npm run test:integration
```

### Example Test Structure

```typescript
describe('Your Example', () => {
  it('should compile without errors', async () => {
    const code = testUtils.extractCodeBlocks(exampleContent, 'typescript');
    expect(code[0]).toHaveValidTypeScript();
  });

  it('should handle errors properly', async () => {
    const code = testUtils.extractCodeBlocks(exampleContent);
    expect(code[0]).toHaveProperErrorHandling();
  });

  it('should work on devnet', async () => {
    // Test actual SDK functionality
    const result = await testUtils.retryAsync(async () => {
      return await yourExampleFunction();
    });
    expect(result).toBeDefined();
  });
});
```

## 🎨 Style Guide

### Markdown Conventions

- Use **ATX headers** (`#`, `##`, `###`)
- Include **table of contents** for long documents
- Use **code fences** with language specification
- Add **alt text** for all images
- Use **relative links** for internal documentation

### Code Formatting

- **Indent**: 2 spaces for TypeScript/JavaScript
- **Line length**: 80 characters maximum
- **Naming**: camelCase for variables, PascalCase for types
- **Comments**: JSDoc format for functions

```typescript
/**
 * Creates a swap transaction with optimal routing
 * @param inputMint - Input token mint address
 * @param outputMint - Output token mint address  
 * @param inputAmount - Amount to swap (in token units)
 * @returns Promise resolving to transaction signature
 */
async function createSwap(
  inputMint: PublicKey,
  outputMint: PublicKey, 
  inputAmount: number
): Promise<string> {
  // Implementation...
}
```

## 🔍 Review Process

### Pull Request Checklist

Before submitting your PR:

- [ ] All code examples compile and run successfully
- [ ] Tests pass: `npm test`
- [ ] Documentation builds: `npm run build`
- [ ] Code is formatted: `npm run format:check`
- [ ] Links are valid: `npm run test:links`
- [ ] Performance is acceptable (build time < 30s)

### Review Criteria

Our maintainers evaluate contributions based on:

1. **Accuracy**: Code examples work with current SDK versions
2. **Clarity**: Documentation is easy to follow and understand
3. **Completeness**: Examples include proper error handling
4. **Performance**: Code follows best practices for efficiency
5. **Security**: No hardcoded secrets or unsafe patterns

### Feedback Process

- **Initial Review**: Within 2-3 business days
- **Feedback**: Clear, actionable suggestions for improvements
- **Iteration**: We'll work with you to refine the contribution
- **Merge**: Once approved, changes are merged and deployed

## 🏆 Recognition

Contributors are recognized in:

- **README.md**: Listed in contributors section
- **Release Notes**: Mentioned in version release announcements  
- **Community**: Highlighted in our developer community
- **Documentation**: Author attribution on significant contributions

## 🛠️ Development Tools

### Recommended IDE Setup

**VS Code** with extensions:
- Prettier - Code formatter
- ESLint - JavaScript linter
- TypeScript - Language support
- Thunder Client - API testing
- GitLens - Git integration

### Useful Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run dev -- --host 0.0.0.0 # Bind to all interfaces

# Testing  
npm run test:watch       # Watch mode for tests
npm run test:coverage    # Coverage reports
npm run test:examples    # Validate code examples

# Building
npm run build:analyze    # Build with bundle analyzer
npm run serve:build      # Test production build

# Quality
npm run typecheck        # TypeScript validation
npm run lint:fix         # Auto-fix linting issues
npm run format           # Auto-format all files
```

## 🌍 Community

### Communication Channels

- **Developer Support**: [Telegram](https://t.me/+DLLPYFzvTzJmNTJh)
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Architecture and design discussions

### Community Guidelines

1. **Be Respectful**: Professional and inclusive communication
2. **Be Constructive**: Provide actionable feedback and suggestions
3. **Be Patient**: Maintainers are volunteers with other commitments
4. **Be Helpful**: Assist other contributors when possible

## 📞 Getting Help

### For Contributors

- **Documentation Issues**: [GitHub Issues](https://github.com/saros-xyz/saros-sdk-docs/issues)
- **SDK Questions**: [Developer Support](https://t.me/+DLLPYFzvTzJmNTJh)
- **Technical Help**: Mention maintainers in your PR or issue

### For Users

- **Bug Reports**: Use GitHub issues with reproduction steps
- **Feature Requests**: Discuss in GitHub discussions first
- **General Questions**: Ask in our Telegram support channel

## 📋 Issue Templates

When creating issues, use these templates:

### Bug Report Template

```markdown
**Description**
Brief description of the issue

**Steps to Reproduce**
1. Step one
2. Step two  
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**  
What actually happens

**Environment**
- OS: [e.g., macOS, Linux, Windows]
- Node.js version: [e.g., 18.17.0]
- SDK version: [e.g., 2.4.0]
- Browser: [if applicable]

**Additional Context**
Any other relevant information
```

### Feature Request Template

```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why this feature would be valuable

**Proposed Implementation**
How you envision this being implemented

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Any other relevant information
```

## 🎖️ Special Recognition

### Superteam Challenge Contributors

This repository was enhanced as part of the [Saros SDK Guide Challenge](https://earn.superteam.fun/listing/saros-sdk-guide-challenge). Contributors to this challenge receive special recognition for helping create world-class developer documentation.

### Hall of Fame

Outstanding contributors who have significantly improved the developer experience:

- **RECTOR** - Initial comprehensive documentation architecture and examples
- [Your name here] - Your contribution description

---

**JazakAllahu khairan** for contributing to the Solana DeFi ecosystem! Your efforts help developers build amazing applications on Saros Finance.

**Questions?** Reach out in our [Developer Station](https://t.me/+DLLPYFzvTzJmNTJh) - we're here to help! 🚀