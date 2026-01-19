// MILESTONE 3: Basic Test Runner
// Detects and executes tests in a repository

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TestResult {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  output: string;
  error?: string;
}

export interface TestConfig {
  framework: 'vitest' | 'jest' | 'playwright' | 'unknown';
  command: string;
  hasTestScript: boolean;
}

/**
 * Detect test framework from package.json
 */
export function detectTestFramework(packageJsonContent: string): TestConfig {
  try {
    const pkg = JSON.parse(packageJsonContent);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const scripts = pkg.scripts || {};
    
    // Check for Vitest
    if (deps['vitest']) {
      return {
        framework: 'vitest',
        command: scripts.test || 'vitest run',
        hasTestScript: !!scripts.test,
      };
    }
    
    // Check for Jest
    if (deps['jest'] || deps['@jest/core']) {
      return {
        framework: 'jest',
        command: scripts.test || 'jest',
        hasTestScript: !!scripts.test,
      };
    }
    
    // Check for Playwright
    if (deps['@playwright/test']) {
      return {
        framework: 'playwright',
        command: scripts.test || 'playwright test',
        hasTestScript: !!scripts.test,
      };
    }
    
    // Fallback to npm test if test script exists
    if (scripts.test) {
      return {
        framework: 'unknown',
        command: scripts.test,
        hasTestScript: true,
      };
    }
    
    return {
      framework: 'unknown',
      command: '',
      hasTestScript: false,
    };
  } catch (error) {
    console.error('Error parsing package.json:', error);
    return {
      framework: 'unknown',
      command: '',
      hasTestScript: false,
    };
  }
}

/**
 * Run tests in a local repository directory
 * Note: This requires the repo to be cloned locally
 */
export async function runTests(
  repoPath: string,
  testCommand?: string
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Execute test command
    const command = testCommand || 'npm test';
    const { stdout, stderr } = await execAsync(command, {
      cwd: repoPath,
      timeout: 120000, // 2 minute timeout
      env: {
        ...process.env,
        CI: 'true', // Set CI mode for test runners
      },
    });
    
    const durationMs = Date.now() - startTime;
    const output = stdout + stderr;
    
    // Parse test results (basic parsing, works for most frameworks)
    const testResult = parseTestOutput(output);
    
    return {
      success: testResult.failed === 0,
      totalTests: testResult.totalTests,
      passed: testResult.passed,
      failed: testResult.failed,
      durationMs,
      output,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const output = error.stdout + error.stderr;
    const testResult = parseTestOutput(output);
    
    return {
      success: false,
      totalTests: testResult.totalTests,
      passed: testResult.passed,
      failed: testResult.failed,
      durationMs,
      output,
      error: error.message,
    };
  }
}

/**
 * Parse test output to extract test counts
 * Works with Jest, Vitest, and most test runners
 */
function parseTestOutput(output: string): {
  totalTests: number;
  passed: number;
  failed: number;
} {
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  
  // Try to match common patterns
  // Jest/Vitest: "Tests: 5 passed, 2 failed, 7 total"
  const match1 = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed,\s+(\d+)\s+total/i);
  if (match1) {
    passed = parseInt(match1[1]);
    failed = parseInt(match1[2]);
    totalTests = parseInt(match1[3]);
    return { totalTests, passed, failed };
  }
  
  // Alternative: "5 passed, 2 failed"
  const match2 = output.match(/(\d+)\s+passed,\s+(\d+)\s+failed/i);
  if (match2) {
    passed = parseInt(match2[1]);
    failed = parseInt(match2[2]);
    totalTests = passed + failed;
    return { totalTests, passed, failed };
  }
  
  // Vitest alternative: "Test Files  2 passed (2)"
  const match3 = output.match(/Test Files\s+(\d+)\s+passed/i);
  const match4 = output.match(/Test Files\s+(\d+)\s+failed/i);
  if (match3 || match4) {
    passed = match3 ? parseInt(match3[1]) : 0;
    failed = match4 ? parseInt(match4[1]) : 0;
    totalTests = passed + failed;
    return { totalTests, passed, failed };
  }
  
  // If no match, return zeros
  return { totalTests: 0, passed: 0, failed: 0 };
}

/**
 * Simplified test runner for MVP - just validates that tests exist
 * In production, this would actually clone the repo and run tests
 */
export async function mockTestRun(hasTests: boolean): Promise<TestResult> {
  const durationMs = Math.floor(Math.random() * 3000) + 1000; // 1-4 seconds
  
  if (!hasTests) {
    return {
      success: true,
      totalTests: 0,
      passed: 0,
      failed: 0,
      durationMs,
      output: 'No tests found in repository',
    };
  }
  
  // Simulate test execution
  await new Promise(resolve => setTimeout(resolve, durationMs));
  
  // Mock results (in real scenario, would run actual tests)
  return {
    success: true,
    totalTests: 10,
    passed: 10,
    failed: 0,
    durationMs,
    output: 'Test run simulated successfully\nAll tests passed!',
  };
}
