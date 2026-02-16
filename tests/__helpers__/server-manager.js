/**
 * Test Helper Utilities for Server Lifecycle Management
 * 
 * This module provides utilities for managing HTTP server instances in Jest tests.
 * It ensures proper test isolation, prevents port conflicts during parallel execution,
 * and handles server lifecycle cleanup in afterEach hooks.
 * 
 * @module server-manager
 */

'use strict';

const http = require('http');

/**
 * Default hostname for test servers (localhost)
 * @constant {string}
 */
const DEFAULT_HOSTNAME = '127.0.0.1';

/**
 * Base port number for test servers
 * @constant {number}
 */
const BASE_PORT = 3000;

/**
 * Default timeout for waiting for server readiness (5 seconds)
 * @constant {number}
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Polling interval for server readiness check (50ms)
 * @constant {number}
 */
const POLL_INTERVAL = 50;

/**
 * Expected response body from test servers
 * @constant {string}
 */
const EXPECTED_RESPONSE_BODY = 'Hello, World!\n';

/**
 * Expected Content-Type header from test servers
 * @constant {string}
 */
const EXPECTED_CONTENT_TYPE = 'text/plain';

/**
 * Expected HTTP status code from test servers
 * @constant {number}
 */
const EXPECTED_STATUS_CODE = 200;

/**
 * Creates an HTTP server instance mimicking server.js behavior.
 * 
 * The server responds to all requests with:
 * - Status code: 200
 * - Content-Type: text/plain
 * - Body: "Hello, World!\n"
 * 
 * @param {number} [port] - Optional port number (used for logging purposes)
 * @returns {http.Server} The created HTTP server instance (not yet listening)
 * 
 * @example
 * const server = createTestServer(3001);
 * await startServer(server, 3001);
 * // Use server...
 * await stopServer(server);
 */
function createTestServer(port) {
  const server = http.createServer((req, res) => {
    res.statusCode = EXPECTED_STATUS_CODE;
    res.setHeader('Content-Type', EXPECTED_CONTENT_TYPE);
    res.end(EXPECTED_RESPONSE_BODY);
  });

  // Store port reference for debugging/logging purposes
  server._testPort = port;

  return server;
}

/**
 * Returns an available port for testing based on JEST_WORKER_ID.
 * 
 * This function ensures that parallel test execution does not result in port
 * conflicts by assigning unique ports to each Jest worker.
 * 
 * Port allocation strategy:
 * - Base port: 3001 (to avoid conflict with default server.js port 3000)
 * - Each Jest worker gets: BASE_PORT + JEST_WORKER_ID
 * - If JEST_WORKER_ID is not set, defaults to 1 (port 3001)
 * 
 * @returns {number} An available port number for the current test worker
 * 
 * @example
 * const port = getAvailablePort();
 * const server = createTestServer(port);
 * await startServer(server, port);
 */
function getAvailablePort() {
  // JEST_WORKER_ID is set by Jest for parallel test execution
  // It starts from 1 for the first worker
  const workerId = parseInt(process.env.JEST_WORKER_ID, 10) || 1;
  return BASE_PORT + workerId;
}

/**
 * Starts a server instance on the specified port with Promise wrapper.
 * 
 * This function wraps server.listen() in a Promise for async/await usage,
 * making it easier to use in test setup.
 * 
 * @param {http.Server} server - The HTTP server instance to start
 * @param {number} port - The port number to listen on
 * @param {string} [hostname=DEFAULT_HOSTNAME] - The hostname to bind to (default: 127.0.0.1)
 * @returns {Promise<http.Server>} Resolves with the server when it starts listening
 * @throws {Error} Rejects with error if server fails to start (e.g., EADDRINUSE)
 * 
 * @example
 * const server = createTestServer();
 * const port = getAvailablePort();
 * try {
 *   await startServer(server, port);
 *   console.log(`Server started on port ${port}`);
 * } catch (error) {
 *   console.error('Failed to start server:', error.message);
 * }
 */
function startServer(server, port, hostname = DEFAULT_HOSTNAME) {
  return new Promise((resolve, reject) => {
    // Validate inputs
    if (!server || typeof server.listen !== 'function') {
      reject(new Error('Invalid server instance: must be an http.Server object'));
      return;
    }

    if (typeof port !== 'number' || port < 0 || port > 65535) {
      reject(new Error(`Invalid port number: ${port}. Must be between 0 and 65535`));
      return;
    }

    // Handle error events (e.g., EADDRINUSE)
    const errorHandler = (error) => {
      server.removeListener('listening', listeningHandler);
      reject(error);
    };

    // Handle successful server start
    const listeningHandler = () => {
      server.removeListener('error', errorHandler);
      resolve(server);
    };

    // Attach event listeners
    server.once('error', errorHandler);
    server.once('listening', listeningHandler);

    // Start the server
    server.listen(port, hostname);
  });
}

/**
 * Gracefully stops a server instance with Promise wrapper.
 * 
 * This function handles cleanup of server resources and should be called
 * in afterEach hooks to prevent resource leaks between tests.
 * 
 * @param {http.Server|null|undefined} server - The HTTP server instance to stop
 * @returns {Promise<void>} Resolves when server is stopped or immediately if server is null/not listening
 * 
 * @example
 * afterEach(async () => {
 *   await stopServer(server);
 * });
 */
function stopServer(server) {
  return new Promise((resolve, reject) => {
    // Handle null or undefined server gracefully
    if (!server) {
      resolve();
      return;
    }

    // If server is not listening, resolve immediately
    if (!server.listening) {
      resolve();
      return;
    }

    // Set a timeout for server close operation to prevent hanging tests
    const closeTimeout = setTimeout(() => {
      // Force close if server doesn't respond in time
      resolve();
    }, 5000);

    // Attempt graceful shutdown
    server.close((error) => {
      clearTimeout(closeTimeout);
      
      if (error) {
        // Server was not running or encountered an error during close
        // We still resolve because the goal is to ensure the server is stopped
        // Common errors like "Server is not running" should not fail tests
        if (error.code === 'ERR_SERVER_NOT_RUNNING') {
          resolve();
        } else {
          // For other errors, we might want to know about them
          // but still resolve to not block test cleanup
          resolve();
        }
      } else {
        resolve();
      }
    });
  });
}

/**
 * Waits for a server to be ready and accepting connections on the specified port.
 * 
 * This function polls the server at regular intervals until it responds to
 * HTTP requests or the timeout is reached. It's useful for ensuring the server
 * is fully operational before running tests.
 * 
 * @param {number} port - The port number to check
 * @param {number} [timeout=DEFAULT_TIMEOUT] - Maximum time to wait in milliseconds (default: 5000)
 * @param {string} [hostname=DEFAULT_HOSTNAME] - The hostname to connect to (default: 127.0.0.1)
 * @returns {Promise<void>} Resolves when server is ready, rejects on timeout
 * @throws {Error} Rejects with timeout error if server doesn't respond within timeout
 * 
 * @example
 * const port = 3001;
 * const server = createTestServer(port);
 * await startServer(server, port);
 * await waitForServerReady(port, 10000); // Wait up to 10 seconds
 * // Server is now ready to receive requests
 */
function waitForServerReady(port, timeout = DEFAULT_TIMEOUT, hostname = DEFAULT_HOSTNAME) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    /**
     * Attempts to connect to the server and check if it's responding
     */
    const checkServer = () => {
      // Check if we've exceeded the timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        reject(new Error(`Server did not become ready within ${timeout}ms on port ${port}`));
        return;
      }

      // Make an HTTP request to check if server is responding
      const requestOptions = {
        hostname: hostname,
        port: port,
        path: '/',
        method: 'GET',
        timeout: Math.min(1000, timeout - elapsed) // Request timeout, max 1 second
      };

      const req = http.request(requestOptions, (res) => {
        // Server responded - it's ready
        // Consume response data to properly close the connection
        res.on('data', () => {});
        res.on('end', () => {
          resolve();
        });
      });

      req.on('error', (error) => {
        // Connection refused or other error - server not ready yet
        // Check if we should continue polling or give up
        const remainingTime = timeout - (Date.now() - startTime);
        
        if (remainingTime > 0) {
          // Schedule next check after poll interval
          setTimeout(checkServer, POLL_INTERVAL);
        } else {
          reject(new Error(`Server did not become ready within ${timeout}ms on port ${port}: ${error.message}`));
        }
      });

      req.on('timeout', () => {
        req.destroy();
        // Request timed out - server might be slow to respond
        const remainingTime = timeout - (Date.now() - startTime);
        
        if (remainingTime > 0) {
          setTimeout(checkServer, POLL_INTERVAL);
        } else {
          reject(new Error(`Server did not become ready within ${timeout}ms on port ${port}: request timeout`));
        }
      });

      // Send the request
      req.end();
    };

    // Start checking immediately
    checkServer();
  });
}

// Export all utility functions
module.exports = {
  createTestServer,
  getAvailablePort,
  startServer,
  stopServer,
  waitForServerReady
};
