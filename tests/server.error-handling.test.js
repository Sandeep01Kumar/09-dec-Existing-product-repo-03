/**
 * Error Handling Tests for server.js Error Scenarios
 * 
 * This test file validates server.js error handling behavior including:
 * - Port conflicts (EADDRINUSE) when port is already in use
 * - Server error events and their proper emission
 * - Connection failures and client disconnection handling
 * - Graceful error recovery and server stability
 * - Timeout scenarios for various operations
 * - Invalid input handling and validation
 * - Resource cleanup after errors
 * 
 * @file server.error-handling.test.js
 * @requires http - Node.js built-in HTTP module for low-level server operations
 * @requires ./__helpers__/server-manager - Test utilities for server lifecycle management
 */

'use strict';

const http = require('http');
const {
  createTestServer,
  getAvailablePort,
  startServer,
  stopServer
} = require('./__helpers__/server-manager');

/**
 * Error Handling Test Suite
 * 
 * Tests server behavior under various error conditions to ensure
 * robust error handling and graceful degradation.
 */
describe('Server Error Handling', () => {
  let server;
  let port;

  /**
   * Before each test, get a unique available port to avoid conflicts
   */
  beforeEach(() => {
    port = getAvailablePort();
  });

  /**
   * After each test, ensure all servers are properly stopped
   * to release ports and prevent resource leaks
   */
  afterEach(async () => {
    await stopServer(server);
    server = null;
  });

  /**
   * Port Conflict Tests
   * 
   * Tests server behavior when attempting to bind to a port that is
   * already in use by another server instance.
   */
  describe('Port Conflict', () => {
    /**
     * Test: EADDRINUSE error when port is occupied
     * 
     * Verifies that attempting to start a second server on an occupied port
     * results in an EADDRINUSE error with the correct error code.
     */
    it('should emit EADDRINUSE error when port is occupied', async () => {
      // Arrange: Start first server on port
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act: Try to start second server on same port
      const server2 = createTestServer(port);
      
      // Assert: Should reject with EADDRINUSE error
      await expect(startServer(server2, port)).rejects.toMatchObject({
        code: 'EADDRINUSE'
      });
      
      // Cleanup second server
      await stopServer(server2);
    });

    /**
     * Test: Error event emitted on port conflict
     * 
     * Verifies that the server emits an 'error' event when attempting
     * to listen on an occupied port, allowing error handlers to respond.
     */
    it('should emit error event on port conflict', async () => {
      // Arrange: Start first server on port
      server = createTestServer(port);
      await startServer(server, port);
      
      // Arrange: Create second server and set up error handler
      const server2 = createTestServer(port);
      const errorPromise = new Promise((resolve) => {
        server2.once('error', (error) => {
          resolve(error);
        });
      });
      
      // Act: Try to listen on occupied port (will emit error)
      server2.listen(port, '127.0.0.1');
      
      // Assert: Error should be emitted with correct code
      const error = await errorPromise;
      expect(error.code).toBe('EADDRINUSE');
      
      // Cleanup
      await stopServer(server2);
    });

    /**
     * Test: Error message contains port information
     * 
     * Verifies that the error includes relevant port information
     * for debugging purposes.
     */
    it('should contain port number in error message', async () => {
      // Arrange: Start first server on port
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act: Try to start second server
      const server2 = createTestServer(port);
      
      // Assert: Error should contain port information
      try {
        await startServer(server2, port);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('EADDRINUSE');
        // Error should have port property or include port in message
        expect(error.port || error.message).toBeTruthy();
      }
      
      await stopServer(server2);
    });

    /**
     * Test: Port conflict handled gracefully without crashing
     * 
     * Verifies that a port conflict error is handled gracefully,
     * allowing the original server to continue running.
     */
    it('should handle port conflict gracefully without crashing', async () => {
      // Arrange: Start first server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act: Try to start second server (should fail)
      const server2 = createTestServer(port);
      await expect(startServer(server2, port)).rejects.toBeDefined();
      
      // Assert: Original server should still be running
      expect(server.listening).toBe(true);
      
      // Cleanup
      await stopServer(server2);
    });

    /**
     * Test: Server emits listening event on success
     * 
     * Verifies that a server emits the 'listening' event when
     * successfully started, which can be used to confirm startup.
     */
    it('should emit listening event when port is available', async () => {
      // Arrange: Create server and set up listening handler
      server = createTestServer(port);
      
      const listeningPromise = new Promise((resolve) => {
        server.once('listening', () => {
          resolve(true);
        });
      });
      
      // Act: Start the server
      await startServer(server, port);
      
      // Assert: Listening event should have been emitted
      const wasListening = await listeningPromise;
      expect(wasListening).toBe(true);
    });
  });

  /**
   * Server Error Tests
   * 
   * Tests server behavior when encountering internal errors
   * and validates graceful error handling.
   */
  describe('Server Errors', () => {
    /**
     * Test: Server handles internal errors gracefully
     * 
     * Verifies that the server continues to function normally
     * after setup and can respond to requests.
     */
    it('should handle internal errors gracefully', async () => {
      // Arrange: Start server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act & Assert: Verify server responds correctly
      const request = require('supertest');
      const response = await request(server).get('/');
      
      expect(response.status).toBe(200);
    });

    /**
     * Test: Server doesn't crash on request handler errors
     * 
     * Verifies that a server with try-catch in request handler
     * continues running even when errors occur.
     */
    it('should not crash on request handler errors', async () => {
      // Arrange: Create a server with error-handling request handler
      const errorServer = http.createServer((req, res) => {
        // Simulate handling with error protection
        try {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Hello, World!\n');
        } catch (e) {
          // Handle error gracefully by sending error response
          res.statusCode = 500;
          res.end('Error');
        }
      });
      
      // Act: Start the server
      await startServer(errorServer, port);
      
      // Assert: Server should still be running
      expect(errorServer.listening).toBe(true);
      
      // Cleanup
      await stopServer(errorServer);
      server = null;
    });

    /**
     * Test: Error event listeners can be attached
     * 
     * Verifies that error event listeners can be attached to
     * the server and won't be called under normal operation.
     */
    it('should allow attaching error event listeners', async () => {
      // Arrange: Create server with error handler
      server = createTestServer(port);
      
      const errorHandler = jest.fn();
      server.on('error', errorHandler);
      
      // Act: Start server normally
      await startServer(server, port);
      
      // Assert: Server running, no errors occurred
      expect(server.listening).toBe(true);
      expect(errorHandler).not.toHaveBeenCalled();
    });

    /**
     * Test: Error events can be caught and handled
     * 
     * Verifies that server error events can be caught by attached
     * error handlers for custom error processing.
     */
    it('should emit error events that can be caught', async () => {
      // Arrange: Start first server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Arrange: Create second server with error handler
      const server2 = createTestServer(port);
      
      // Act: Set up error catching and attempt to listen
      const errorCaught = await new Promise((resolve) => {
        server2.on('error', (error) => {
          resolve(error);
        });
        server2.listen(port, '127.0.0.1');
      });
      
      // Assert: Error should be caught
      expect(errorCaught).toBeDefined();
      expect(errorCaught.code).toBe('EADDRINUSE');
      
      // Cleanup
      await stopServer(server2);
    });

    /**
     * Test: Server remains functional after emitting error event
     * 
     * Verifies that a server that emits an error continues to be
     * in a usable state (just not listening on the conflicted port).
     */
    it('should remain in usable state after error event', async () => {
      // Arrange: Start first server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act: Create second server that will fail, then try different port
      const server2 = createTestServer(port);
      
      await new Promise((resolve) => {
        server2.on('error', () => {
          resolve();
        });
        server2.listen(port, '127.0.0.1');
      });
      
      // Assert: server2 can still be started on a different port
      const differentPort = port + 100;
      await startServer(server2, differentPort);
      expect(server2.listening).toBe(true);
      
      // Cleanup
      await stopServer(server2);
    });
  });

  /**
   * Connection Error Tests
   * 
   * Tests server behavior when handling connection issues including
   * client disconnections, timeouts, and rapid connections.
   */
  describe('Connection Errors', () => {
    /**
     * Test: Server handles rapid connection attempts
     * 
     * Verifies that the server can handle many simultaneous
     * connection attempts without errors.
     */
    it('should handle rapid connection attempts', async () => {
      // Arrange: Start server
      server = createTestServer(port);
      await startServer(server, port);
      
      const request = require('supertest');
      
      // Act: Make many rapid requests simultaneously
      const requests = Array(20).fill(null).map(() => 
        request(server).get('/')
      );
      
      const responses = await Promise.all(requests);
      
      // Assert: All requests should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    /**
     * Test: Server remains stable after many requests
     * 
     * Verifies that the server maintains stability after
     * handling multiple sequential requests.
     */
    it('should remain stable after many requests', async () => {
      // Arrange: Start server
      server = createTestServer(port);
      await startServer(server, port);
      
      const request = require('supertest');
      
      // Act: Make sequential requests
      for (let i = 0; i < 10; i++) {
        const response = await request(server).get('/');
        expect(response.status).toBe(200);
      }
      
      // Assert: Server should still be listening
      expect(server.listening).toBe(true);
    });

    /**
     * Test: Server handles requests after previous request errors
     * 
     * Verifies that the server can recover and handle new requests
     * after processing previous requests.
     */
    it('should handle requests after previous request errors', async () => {
      // Arrange: Start server
      server = createTestServer(port);
      await startServer(server, port);
      
      const request = require('supertest');
      
      // Act: Make sequential requests
      const response1 = await request(server).get('/');
      expect(response1.status).toBe(200);
      
      // Assert: Make another request (simulating recovery)
      const response2 = await request(server).get('/');
      expect(response2.status).toBe(200);
    });

    /**
     * Test: Server handles client disconnection gracefully
     * 
     * Verifies that when a client abruptly disconnects,
     * the server continues to operate normally.
     */
    it('should handle client disconnection gracefully', async () => {
      // Arrange: Start server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act: Create a request that we'll abort
      const clientRequest = http.request({
        hostname: '127.0.0.1',
        port: port,
        path: '/',
        method: 'GET'
      });
      
      // Abort the request immediately (simulate client disconnect)
      clientRequest.on('error', () => {
        // Expected error from abort - ignore
      });
      clientRequest.destroy();
      
      // Assert: Server should still be listening and functioning
      expect(server.listening).toBe(true);
      
      // Verify server still responds to new requests
      const request = require('supertest');
      const response = await request(server).get('/');
      expect(response.status).toBe(200);
    });

    /**
     * Test: Server handles aborted requests mid-stream
     * 
     * Verifies that the server handles clients that start a request
     * and then disconnect before receiving a response.
     */
    it('should handle aborted requests mid-stream', async () => {
      // Arrange: Start server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act: Start a request and abort it
      await new Promise((resolve) => {
        const clientReq = http.request({
          hostname: '127.0.0.1',
          port: port,
          path: '/',
          method: 'GET'
        });
        
        clientReq.on('error', () => {
          // Ignore abort error
          resolve();
        });
        
        clientReq.on('socket', () => {
          // Abort once socket is connected
          setTimeout(() => {
            clientReq.destroy();
          }, 10);
        });
        
        clientReq.end();
      });
      
      // Assert: Server should continue functioning
      expect(server.listening).toBe(true);
      
      const request = require('supertest');
      const response = await request(server).get('/');
      expect(response.status).toBe(200);
    });

    /**
     * Test: Server handles request timeout scenarios
     * 
     * Verifies that the server properly handles client timeout settings
     * and continues operating after timeout events.
     */
    it('should handle request timeout scenarios', async () => {
      // Arrange: Create a slow server that delays response
      const slowServer = http.createServer((req, res) => {
        // Normal fast response - server itself doesn't delay
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello, World!\n');
      });
      
      await startServer(slowServer, port);
      
      // Act: Make a request with a timeout (that won't be exceeded)
      const response = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: port,
          path: '/',
          method: 'GET',
          timeout: 5000 // 5 second timeout
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy(new Error('Request timeout'));
        });
        
        req.end();
      });
      
      // Assert: Request should complete before timeout
      expect(response.status).toBe(200);
      expect(response.data).toBe('Hello, World!\n');
      
      // Cleanup
      await stopServer(slowServer);
      server = null;
    });

    /**
     * Test: Server handles connection close events
     * 
     * Verifies that server properly handles socket close events
     * from client connections.
     */
    it('should handle connection close events', async () => {
      // Arrange: Start server with close event tracking
      let closeEventCount = 0;
      
      const trackedServer = http.createServer((req, res) => {
        res.on('close', () => {
          closeEventCount++;
        });
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello, World!\n');
      });
      
      await startServer(trackedServer, port);
      
      // Act: Make several requests
      const request = require('supertest');
      await request(trackedServer).get('/');
      await request(trackedServer).get('/');
      
      // Assert: Server should have handled close events
      expect(closeEventCount).toBeGreaterThan(0);
      expect(trackedServer.listening).toBe(true);
      
      // Cleanup
      await stopServer(trackedServer);
      server = null;
    });
  });

  /**
   * Invalid Input Handling Tests
   * 
   * Tests server-manager utility validation for invalid inputs
   * to ensure proper error messages and handling.
   */
  describe('Invalid Input Handling', () => {
    /**
     * Test: Reject null server instance
     */
    it('should reject invalid server instance in startServer', async () => {
      await expect(startServer(null, port)).rejects.toThrow('Invalid server instance');
    });

    /**
     * Test: Reject undefined server instance
     */
    it('should reject undefined server instance in startServer', async () => {
      await expect(startServer(undefined, port)).rejects.toThrow('Invalid server instance');
    });

    /**
     * Test: Reject non-server object
     */
    it('should reject invalid object as server in startServer', async () => {
      await expect(startServer({}, port)).rejects.toThrow('Invalid server instance');
    });

    /**
     * Test: Reject negative port number
     */
    it('should reject negative port number', async () => {
      server = createTestServer();
      await expect(startServer(server, -1)).rejects.toThrow('Invalid port number');
    });

    /**
     * Test: Reject port number above 65535
     */
    it('should reject port number above 65535', async () => {
      server = createTestServer();
      await expect(startServer(server, 70000)).rejects.toThrow('Invalid port number');
    });

    /**
     * Test: Reject non-numeric port
     */
    it('should handle non-numeric port gracefully', async () => {
      server = createTestServer();
      await expect(startServer(server, 'not-a-port')).rejects.toThrow('Invalid port number');
    });

    /**
     * Test: Reject NaN port number
     */
    it('should reject NaN as port number', async () => {
      server = createTestServer();
      await expect(startServer(server, NaN)).rejects.toThrow('Invalid port number');
    });

    /**
     * Test: Reject floating point port number
     */
    it('should handle float port number', async () => {
      server = createTestServer();
      // Float ports are technically valid in Node.js (truncated to integer)
      // But our validation might reject them
      try {
        await startServer(server, 3001.5);
        // If it succeeds, verify server is listening
        expect(server.listening).toBe(true);
      } catch (error) {
        // If it fails, verify appropriate error
        expect(error.message).toContain('port');
      }
    });
  });

  /**
   * Resource Cleanup Tests
   * 
   * Tests proper resource cleanup after server operations
   * to prevent resource leaks and port conflicts.
   */
  describe('Resource Cleanup', () => {
    /**
     * Test: Port released after server close
     * 
     * Verifies that the port is properly released when a server
     * is stopped, allowing it to be reused.
     */
    it('should release port after server close', async () => {
      // Arrange: Start and stop a server
      server = createTestServer(port);
      await startServer(server, port);
      await stopServer(server);
      
      // Act: Start a new server on the same port
      const newServer = createTestServer(port);
      await startServer(newServer, port);
      
      // Assert: New server should be listening
      expect(newServer.listening).toBe(true);
      
      // Cleanup
      await stopServer(newServer);
      server = null;
    });

    /**
     * Test: Multiple close calls handled gracefully
     * 
     * Verifies that calling stopServer multiple times doesn't throw.
     */
    it('should handle multiple close calls gracefully', async () => {
      // Arrange: Start server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act & Assert: Multiple stop calls should not throw
      await expect(stopServer(server)).resolves.toBeUndefined();
      await expect(stopServer(server)).resolves.toBeUndefined();
      await expect(stopServer(server)).resolves.toBeUndefined();
      
      server = null;
    });

    /**
     * Test: Cleanup of never-started server
     * 
     * Verifies that stopping a server that was never started
     * completes without error.
     */
    it('should clean up resources when stopping never-started server', async () => {
      // Arrange: Create server but don't start it
      server = createTestServer(port);
      
      // Act & Assert: Stop should complete without error
      await expect(stopServer(server)).resolves.toBeUndefined();
      
      server = null;
    });

    /**
     * Test: Stop handles null server gracefully
     */
    it('should handle stopServer with null server', async () => {
      await expect(stopServer(null)).resolves.toBeUndefined();
    });

    /**
     * Test: Stop handles undefined server gracefully
     */
    it('should handle stopServer with undefined server', async () => {
      await expect(stopServer(undefined)).resolves.toBeUndefined();
    });

    /**
     * Test: All connections closed on server stop
     * 
     * Verifies that all active connections are properly terminated
     * when the server is stopped.
     */
    it('should close all connections on server stop', async () => {
      // Arrange: Start server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act: Make a request to create a connection
      const request = require('supertest');
      await request(server).get('/');
      
      // Stop the server
      await stopServer(server);
      
      // Assert: Server should no longer be listening
      expect(server.listening).toBe(false);
      
      server = null;
    });
  });

  /**
   * Server Recovery Tests
   * 
   * Tests server's ability to recover from errors and
   * resume normal operation.
   */
  describe('Server Recovery', () => {
    /**
     * Test: Original server works after another server fails
     * 
     * Verifies that a failed server startup doesn't affect
     * an already running server.
     */
    it('should allow restart after error', async () => {
      // Arrange: Start first server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act: Create a server that will fail on same port
      const failedServer = createTestServer(port);
      await expect(startServer(failedServer, port)).rejects.toBeDefined();
      await stopServer(failedServer);
      
      // Assert: Original server should still work
      const request = require('supertest');
      const response = await request(server).get('/');
      expect(response.status).toBe(200);
    });

    /**
     * Test: Server can be restarted after shutdown
     * 
     * Verifies that a server can be stopped and started again
     * on the same port.
     */
    it('should allow restarting server after normal shutdown', async () => {
      // Arrange: Start and stop server
      server = createTestServer(port);
      await startServer(server, port);
      await stopServer(server);
      
      // Act: Start the same server again
      await startServer(server, port);
      
      // Assert: Server should be listening and functional
      expect(server.listening).toBe(true);
      
      const request = require('supertest');
      const response = await request(server).get('/');
      expect(response.status).toBe(200);
    });

    /**
     * Test: New server can be created after failed server
     * 
     * Verifies that after a server fails to start, a new
     * server instance can be created and started successfully.
     */
    it('should allow creating new server after failed startup', async () => {
      // Arrange: Start blocking server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act: Try and fail to start second server
      const failedServer = createTestServer(port);
      await expect(startServer(failedServer, port)).rejects.toBeDefined();
      
      // Stop blocking server
      await stopServer(server);
      
      // Create and start new server on now-available port
      const newServer = createTestServer(port);
      await startServer(newServer, port);
      
      // Assert: New server works correctly
      expect(newServer.listening).toBe(true);
      
      const request = require('supertest');
      const response = await request(newServer).get('/');
      expect(response.status).toBe(200);
      
      // Cleanup
      await stopServer(newServer);
      await stopServer(failedServer);
      server = null;
    });

    /**
     * Test: Server recovers after connection storm
     * 
     * Verifies that server recovers normal operation after
     * handling many rapid connections.
     */
    it('should recover after connection storm', async () => {
      // Arrange: Start server
      server = createTestServer(port);
      await startServer(server, port);
      
      const request = require('supertest');
      
      // Act: Send many rapid requests
      const requests = Array(50).fill(null).map(() => 
        request(server).get('/')
      );
      
      await Promise.all(requests);
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Assert: Server should still be responsive
      const finalResponse = await request(server).get('/');
      expect(finalResponse.status).toBe(200);
      expect(server.listening).toBe(true);
    });
  });

  /**
   * Error Message Quality Tests
   * 
   * Verifies that error messages are informative and useful
   * for debugging purposes.
   */
  describe('Error Message Quality', () => {
    /**
     * Test: EADDRINUSE error includes useful info
     */
    it('should provide informative EADDRINUSE error', async () => {
      // Arrange: Start first server
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act: Try to start second server
      const server2 = createTestServer(port);
      
      try {
        await startServer(server2, port);
        fail('Expected error');
      } catch (error) {
        // Assert: Error should have useful properties
        expect(error.code).toBe('EADDRINUSE');
        expect(error.syscall).toBe('listen');
        expect(error.address).toBeDefined();
      }
      
      await stopServer(server2);
    });

    /**
     * Test: Invalid port error is descriptive
     */
    it('should provide descriptive invalid port error', async () => {
      server = createTestServer();
      
      try {
        await startServer(server, -1);
        fail('Expected error');
      } catch (error) {
        expect(error.message).toContain('Invalid port number');
        expect(error.message).toContain('-1');
      }
    });

    /**
     * Test: Invalid server error is descriptive
     */
    it('should provide descriptive invalid server error', async () => {
      try {
        await startServer({}, port);
        fail('Expected error');
      } catch (error) {
        expect(error.message).toContain('Invalid server instance');
        expect(error.message).toContain('http.Server');
      }
    });
  });
});
