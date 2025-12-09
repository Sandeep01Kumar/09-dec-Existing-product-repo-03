/**
 * Jest Configuration for Hello World Node.js Server Tests
 * 
 * This configuration file defines test patterns, coverage thresholds,
 * reporting formats, and execution settings for the server.js unit test suite.
 * 
 * @see https://jestjs.io/docs/configuration
 * 
 * Usage:
 *   npm test              - Run all tests with coverage
 *   npm run test:watch    - Run tests in watch mode
 *   npm run test:ci       - Run tests in CI mode
 */

module.exports = {
  /**
   * Test Environment
   * Use 'node' for server-side JavaScript testing
   * This provides a Node.js-like environment for tests
   */
  testEnvironment: 'node',

  /**
   * Test File Pattern Matching
   * Matches all files ending with .test.js in the tests/ directory
   * Supports nested directories (e.g., tests/unit/server.test.js)
   */
  testMatch: ['**/tests/**/*.test.js'],

  /**
   * Coverage Collection
   * Enable automatic coverage collection during test execution
   */
  collectCoverage: true,

  /**
   * Coverage Output Directory
   * All coverage reports will be generated in this directory
   */
  coverageDirectory: 'coverage',

  /**
   * Coverage Report Formats
   * - text: Console output summary
   * - lcov: Industry-standard format for CI/CD tools
   * - html: Interactive HTML report for detailed browsing
   */
  coverageReporters: ['text', 'lcov', 'html'],

  /**
   * Coverage Thresholds
   * Tests will fail if coverage falls below these thresholds
   * 
   * Global thresholds apply to overall project coverage
   * Per-file thresholds enforce stricter requirements for critical files
   */
  coverageThreshold: {
    global: {
      branches: 80,    // 80% branch coverage minimum
      functions: 100,  // 100% function coverage required
      lines: 90,       // 90% line coverage minimum
      statements: 90   // 90% statement coverage minimum
    },
    // Strict 100% coverage requirement for the main server file
    './server.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },

  /**
   * Coverage Collection Sources
   * Defines which files to include/exclude from coverage analysis
   * - Include: server.js (main application code)
   * - Exclude: node_modules and test files
   */
  collectCoverageFrom: [
    'server.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],

  /**
   * Verbose Output
   * Display individual test results with the test suite hierarchy
   */
  verbose: true,

  /**
   * Test Timeout
   * Maximum time (in milliseconds) a test can run before timing out
   * Set to 10 seconds to accommodate server startup/shutdown tests
   */
  testTimeout: 10000,

  /**
   * Force Exit
   * Force Jest to exit after all tests have completed
   * Prevents hanging when async operations are not properly cleaned up
   */
  forceExit: true,

  /**
   * Detect Open Handles
   * Report any asynchronous operations that were not properly cleaned up
   * Helps identify resource leaks (unclosed servers, pending promises, etc.)
   */
  detectOpenHandles: true
};
