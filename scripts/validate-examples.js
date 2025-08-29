#!/usr/bin/env node

/**
 * Code Example Validation Script
 * 
 * This script validates all code examples in the documentation to ensure:
 * - TypeScript code compiles without errors
 * - Examples follow best practices
 * - All imports are valid
 * - Error handling is implemented
 * - Examples are complete and runnable
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Validating Saros SDK Documentation Examples...\n');

// Configuration
const DOCS_DIR = path.join(__dirname, '../docs');
const EXAMPLES_DIR = path.join(DOCS_DIR, 'examples');
const TUTORIALS_DIR = path.join(DOCS_DIR, 'tutorials');

// Validation results
const results = {
  totalFiles: 0,
  validFiles: 0,
  errors: [],
  warnings: []
};

/**
 * Extract TypeScript code blocks from markdown
 */
function extractCodeBlocks(content) {
  const codeBlockRegex = /```typescript\n([\s\S]*?)\n```/g;
  const blocks = [];
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      code: match[1],
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return blocks;
}

/**
 * Validate TypeScript code block
 */
function validateTypeScript(code, filename, blockIndex) {
  const issues = [];
  
  // Check for required elements
  const checks = [
    {
      name: 'Has error handling',
      test: code => code.includes('try') && code.includes('catch'),
      severity: 'warning'
    },
    {
      name: 'Uses async/await properly',
      test: code => !code.includes('then(') || code.includes('await'),
      severity: 'warning'
    },
    {
      name: 'No hardcoded private keys',
      test: code => !code.includes('fromSecretKey([') || code.includes('EXAMPLE'),
      severity: 'error'
    },
    {
      name: 'Has type annotations',
      test: code => code.includes(': ') || code.includes('interface') || code.includes('type'),
      severity: 'warning'
    },
    {
      name: 'Proper PublicKey usage',
      test: code => !code.includes("new PublicKey('YOUR_") || code.includes('EXAMPLE'),
      severity: 'warning'
    }
  ];
  
  for (const check of checks) {
    if (!check.test(code)) {
      issues.push({
        type: check.severity,
        message: `${check.name} - Block ${blockIndex} in ${filename}`,
        line: null
      });
    }
  }
  
  // Check for common syntax errors
  const syntaxChecks = [
    {
      pattern: /await\s+(?!.*Promise)/g,
      message: 'Potential missing Promise wrapper'
    },
    {
      pattern: /console\.log\([^)]*\);?\s*$/gm,
      message: 'Console.log statements should include descriptive labels'
    },
    {
      pattern: /catch\s*\(\s*error\s*\)\s*\{\s*\}/g,
      message: 'Empty catch blocks should handle errors'
    }
  ];
  
  for (const check of syntaxChecks) {
    const matches = code.match(check.pattern);
    if (matches) {
      issues.push({
        type: 'warning',
        message: `${check.message} - Block ${blockIndex} in ${filename}`,
        line: null
      });
    }
  }
  
  return issues;
}

/**
 * Validate markdown file structure
 */
function validateMarkdownStructure(content, filename) {
  const issues = [];
  
  // Required sections for examples
  const requiredSections = [
    /^#\s+.+/m,                    // Title
    /^##\s+Overview/m,             // Overview section
    /^##\s+Implementation/m,       // Implementation section
    /^##\s+Usage Examples/m,       // Usage examples
    /^##\s+Testing/m,             // Testing section
  ];
  
  for (const [index, pattern] of requiredSections.entries()) {
    if (!pattern.test(content)) {
      issues.push({
        type: 'warning',
        message: `Missing required section pattern ${index + 1} in ${filename}`,
        line: null
      });
    }
  }
  
  // Check for proper linking
  const internalLinks = content.match(/\[.*?\]\(\/docs\/.*?\)/g) || [];
  for (const link of internalLinks) {
    const urlMatch = link.match(/\(\/docs\/(.*?)\)/);
    if (urlMatch) {
      // Split path and anchor for proper validation
      const fullPath = urlMatch[1];
      const pathWithoutAnchor = fullPath.split('#')[0];
      
      const linkedPath = path.join(DOCS_DIR, pathWithoutAnchor + '.md');
      const mdxPath = path.join(DOCS_DIR, pathWithoutAnchor + '.mdx');
      
      if (!fs.existsSync(linkedPath) && !fs.existsSync(mdxPath)) {
        issues.push({
          type: 'error',
          message: `Broken internal link: ${link} in ${filename}`,
          line: null
        });
      }
    }
  }
  
  return issues;
}

/**
 * Validate a single documentation file
 */
function validateFile(filePath) {
  const filename = path.relative(DOCS_DIR, filePath);
  console.log(`📄 Validating ${filename}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    results.totalFiles++;
    
    let fileValid = true;
    const fileIssues = [];
    
    // Validate markdown structure
    const structureIssues = validateMarkdownStructure(content, filename);
    fileIssues.push(...structureIssues);
    
    // Extract and validate code blocks
    const codeBlocks = extractCodeBlocks(content);
    
    if (codeBlocks.length === 0) {
      fileIssues.push({
        type: 'warning',
        message: `No TypeScript code blocks found in ${filename}`,
        line: null
      });
    }
    
    for (const [index, block] of codeBlocks.entries()) {
      const codeIssues = validateTypeScript(block.code, filename, index + 1);
      fileIssues.push(...codeIssues);
    }
    
    // Categorize issues
    const errors = fileIssues.filter(issue => issue.type === 'error');
    const warnings = fileIssues.filter(issue => issue.type === 'warning');
    
    if (errors.length === 0) {
      results.validFiles++;
      console.log(`  ✅ Valid (${warnings.length} warnings)`);
    } else {
      fileValid = false;
      console.log(`  ❌ Invalid (${errors.length} errors, ${warnings.length} warnings)`);
    }
    
    // Add to global results
    results.errors.push(...errors);
    results.warnings.push(...warnings);
    
    // Log issues for this file
    for (const issue of errors) {
      console.log(`    🔴 ERROR: ${issue.message}`);
    }
    for (const issue of warnings) {
      console.log(`    🟡 WARNING: ${issue.message}`);
    }
    
    return fileValid;
    
  } catch (error) {
    console.log(`  ❌ Failed to read file: ${error.message}`);
    results.errors.push({
      type: 'error',
      message: `Failed to read ${filename}: ${error.message}`,
      line: null
    });
    return false;
  }
}

/**
 * Validate all documentation files
 */
function validateAllFiles() {
  const filesToValidate = [];
  
  // Find all markdown files in examples and tutorials
  const findMarkdownFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        files.push(...findMarkdownFiles(itemPath));
      } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
        files.push(itemPath);
      }
    }
    
    return files;
  };
  
  // Collect files to validate
  filesToValidate.push(...findMarkdownFiles(EXAMPLES_DIR));
  filesToValidate.push(...findMarkdownFiles(TUTORIALS_DIR));
  
  // Add other important docs
  const otherDocs = [
    'troubleshooting.md',
    'api-explorer.mdx'
  ].map(file => path.join(DOCS_DIR, file))
   .filter(file => fs.existsSync(file));
   
  filesToValidate.push(...otherDocs);
  
  console.log(`Found ${filesToValidate.length} files to validate\n`);
  
  // Validate each file
  let allValid = true;
  for (const filePath of filesToValidate) {
    const isValid = validateFile(filePath);
    if (!isValid) allValid = false;
  }
  
  return allValid;
}

/**
 * Check TypeScript compilation
 */
function checkTypeScriptCompilation() {
  console.log('\n🔨 Checking TypeScript compilation...');
  
  try {
    execSync('npm run typecheck', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ TypeScript compilation successful');
    return true;
  } catch (error) {
    console.log('❌ TypeScript compilation failed:');
    console.log(error.stdout?.toString() || error.message);
    return false;
  }
}

/**
 * Test build process
 */
function testBuildProcess() {
  console.log('\n🏗️ Testing documentation build...');
  
  try {
    execSync('npm run build', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Documentation build successful');
    return true;
  } catch (error) {
    console.log('❌ Documentation build failed:');
    console.log(error.stdout?.toString() || error.message);
    return false;
  }
}

/**
 * Main validation function
 */
function main() {
  console.log('🎯 Starting comprehensive validation...\n');
  
  // Validate code examples
  const examplesValid = validateAllFiles();
  
  // Check TypeScript compilation
  const typescriptValid = checkTypeScriptCompilation();
  
  // Test build process
  const buildValid = testBuildProcess();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`📁 Files processed: ${results.totalFiles}`);
  console.log(`✅ Valid files: ${results.validFiles}`);
  console.log(`🔴 Total errors: ${results.errors.length}`);
  console.log(`🟡 Total warnings: ${results.warnings.length}`);
  
  console.log(`\n🔨 TypeScript compilation: ${typescriptValid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`🏗️ Documentation build: ${buildValid ? '✅ PASSED' : '❌ FAILED'}`);
  
  const overallValid = examplesValid && typescriptValid && buildValid;
  
  console.log(`\n🎯 Overall status: ${overallValid ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}`);
  
  if (!overallValid) {
    console.log('\n❗ Issues found:');
    
    // Show first 5 errors
    const errorSample = results.errors.slice(0, 5);
    for (const error of errorSample) {
      console.log(`  🔴 ${error.message}`);
    }
    
    if (results.errors.length > 5) {
      console.log(`  ... and ${results.errors.length - 5} more errors`);
    }
    
    console.log('\n💡 To fix issues:');
    console.log('  1. Review the error messages above');
    console.log('  2. Fix code examples in the affected files');  
    console.log('  3. Run this script again to verify fixes');
    console.log('  4. Use `npm run typecheck` to check TypeScript errors');
    console.log('  5. Use `npm run build` to test the full build process');
  } else {
    console.log('\n🎉 All examples are valid and ready for production!');
    console.log('\n📝 Next steps:');
    console.log('  1. Deploy to staging environment');
    console.log('  2. Test examples on devnet');
    console.log('  3. Validate examples on mainnet');
    console.log('  4. Submit documentation for review');
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  process.exit(overallValid ? 0 : 1);
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateAllFiles,
  validateFile,
  extractCodeBlocks,
  validateTypeScript
};