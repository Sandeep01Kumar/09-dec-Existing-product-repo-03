/**
 * Test Fixtures - Expected Response Values
 * 
 * This module provides centralized test constants and expected values for assertions.
 * Using a single source of truth for expected values ensures consistency across all tests
 * and makes maintenance easier when server behavior needs to change.
 * 
 * @module expected-responses
 */

'use strict';

/**
 * Expected response body from the server
 * The server returns "Hello, World!\n" with a trailing newline character
 * @constant {string}
 */
const EXPECTED_BODY = 'Hello, World!\n';

/**
 * Expected HTTP status code from the server
 * All requests return 200 OK status
 * @constant {number}
 */
const EXPECTED_STATUS = 200;

/**
 * Expected Content-Type header value
 * The server sets Content-Type to text/plain
 * @constant {string}
 */
const EXPECTED_CONTENT_TYPE = 'text/plain';

/**
 * Expected hostname for server binding
 * Server listens on localhost (127.0.0.1)
 * @constant {string}
 */
const EXPECTED_HOSTNAME = '127.0.0.1';

/**
 * Default port for server binding
 * Server listens on port 3000 by default
 * @constant {number}
 */
const EXPECTED_PORT = 3000;

/**
 * Regular expression pattern for matching server startup message
 * Matches: "Server running at http://127.0.0.1:PORT/"
 * Captures the port number in the first group
 * @constant {RegExp}
 */
const STARTUP_MESSAGE_PATTERN = /Server running at http:\/\/127\.0\.0\.1:(\d+)\//;

// Export all constants
module.exports = {
  EXPECTED_BODY,
  EXPECTED_STATUS,
  EXPECTED_CONTENT_TYPE,
  EXPECTED_HOSTNAME,
  EXPECTED_PORT,
  STARTUP_MESSAGE_PATTERN
};
