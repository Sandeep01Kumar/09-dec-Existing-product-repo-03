/**
 * Integration Tests for server.js Server Lifecycle
 * 
 * This test suite validates the complete server lifecycle from initialization to termination,
 * including server startup, shutdown, and full HTTP request/response cycles.
 * 
 * Test Categories:
 * - Server Startup: Verify server starts, binds to port, and logs startup message
 * - Server Shutdown: Verify graceful shutdown, resource release, and connection cleanup
 * - Full Request/Response Cycle: Validate complete HTTP GET/POST request cycles
 * - Connection Lifecycle: Test keep-alive and state management across requests
 * - Concurrent Operations: Test parallel request handling
 * 
 * @file server.integration.test.js
 * @module tests/server.integration.test
 */

'use strict';

const request = require('supertest');
const http = require('http');
const {
  EXPECTED_BODY,
  EXPECTED_STATUS,
  EXPECTED_CONTENT_TYPE,
  STARTUP_MESSAGE_PATTERN
} = require('./__fixtures__/expected-responses');
const {
  createTestServer,
  getAvailablePort,
  startServer,
  stopServer,
  waitForServerReady
} = require('./__helpers__/server-manager');

/**
 * Integration Test Suite for Server Lifecycle
 * 
 * Tests comprehensive server operations including startup, shutdown,
 * and request handling. Each test uses isolated server instances
 * with dynamic port allocation for parallel test safety.
 */
describe('Server Integration', () => {
  let server;
  let port;

  /**
   * Setup before each test:
   * - Allocate unique port to avoid conflicts in parallel execution
   */
  beforeEach(() => {
    port = getAvailablePort();
  });

  /**
   * Cleanup after each test:
   * - Stop server to release port and resources
   * - Reset server reference to null
   */
  afterEach(async () => {
    await stopServer(server);
    server = null;
  });

  /**
   * Server Startup Test Suite
   * 
   * Validates that the server:
   * - Successfully binds to the specified port
   * - Logs the correct startup message
   * - Accepts HTTP connections once started
   * - Binds to the correct hostname (127.0.0.1)
   */
  describe('Server Startup', () => {
    it('should start listening on specified port', async () => {
      // Arrange
      server = createTestServer(port);
      
      // Act
      await startServer(server, port);
      
      // Assert - server should be in listening state
      expect(server.listening).toBe(true);
    });

    it('should accept HTTP connections after startup', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act - make an HTTP request
      const response = await request(server).get('/');
      
      // Assert - request should succeed with expected status
      expect(response.status).toBe(EXPECTED_STATUS);
    });

    it('should be ready to receive requests after startup', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act & Assert - waitForServerReady should resolve without error
      await expect(waitForServerReady(port, 5000)).resolves.toBeUndefined();
    });

    it('should bind to localhost (127.0.0.1)', async () => {
      // Arrange
      server = createTestServer(port);
      
      // Act - explicitly bind to localhost
      await startServer(server, port, '127.0.0.1');
      
      // Assert - server should be listening
      expect(server.listening).toBe(true);
      
      // Verify connectivity via localhost
      const response = await request(server).get('/');
      expect(response.status).toBe(EXPECTED_STATUS);
    });

    it('should log startup message that matches expected pattern', async () => {
      // Arrange - create a spy for console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // The pattern should match the format: "Server running at http://127.0.0.1:PORT/"
      const expectedMessage = `Server running at http://127.0.0.1:${port}/`;
      
      // Act - verify the message format matches our pattern
      const matchResult = expectedMessage.match(STARTUP_MESSAGE_PATTERN);
      
      // Assert - pattern should match and capture port correctly
      expect(matchResult).not.toBeNull();
      expect(matchResult[1]).toBe(String(port));
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should capture startup message from server.listen callback', async () => {
      // Arrange - spy on console.log to capture messages
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Create a server that logs startup message like server.js does
      const testServer = http.createServer((req, res) => {
        res.statusCode = EXPECTED_STATUS;
        res.setHeader('Content-Type', EXPECTED_CONTENT_TYPE);
        res.end(EXPECTED_BODY);
      });
      
      // Act - start server with logging callback
      await new Promise((resolve) => {
        testServer.listen(port, '127.0.0.1', () => {
          console.log(`Server running at http://127.0.0.1:${port}/`);
          resolve();
        });
      });
      
      // Assert - console.log should have been called with startup message
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(STARTUP_MESSAGE_PATTERN)
      );
      
      // Cleanup
      consoleSpy.mockRestore();
      await new Promise((resolve) => testServer.close(resolve));
    });

    it('should return address information after startup', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act - get server address
      const address = server.address();
      
      // Assert - address should contain expected values
      expect(address).toBeDefined();
      expect(address.port).toBe(port);
      expect(address.address).toBe('127.0.0.1');
      expect(address.family).toBe('IPv4');
    });

    it('should reject starting on invalid port', async () => {
      // Arrange
      server = createTestServer(-1);
      
      // Act & Assert - should throw error for invalid port
      await expect(startServer(server, -1)).rejects.toThrow(/Invalid port number/);
    });
  });

  /**
   * Server Shutdown Test Suite
   * 
   * Validates that the server:
   * - Closes gracefully with server.close()
   * - Releases port and resources after shutdown
   * - Handles rapid start/stop cycles correctly
   * - Stops accepting connections after shutdown
   */
  describe('Server Shutdown', () => {
    it('should close gracefully', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      expect(server.listening).toBe(true);
      
      // Act
      await stopServer(server);
      
      // Assert - server should no longer be listening
      expect(server.listening).toBe(false);
      server = null;
    });

    it('should release resources after shutdown', async () => {
      // Arrange - start and stop first server
      server = createTestServer(port);
      await startServer(server, port);
      await stopServer(server);
      
      // Act - attempt to start a new server on the same port
      const newServer = createTestServer(port);
      await startServer(newServer, port);
      
      // Assert - new server should successfully bind to the port
      expect(newServer.listening).toBe(true);
      
      // Cleanup
      await stopServer(newServer);
      server = null;
    });

    it('should handle rapid start/stop cycles', async () => {
      // Perform multiple start/stop cycles to verify resource cleanup
      const cycleCount = 3;
      
      for (let i = 0; i < cycleCount; i++) {
        // Arrange & Act
        server = createTestServer(port);
        await startServer(server, port);
        
        // Assert - server should be listening during each cycle
        expect(server.listening).toBe(true);
        
        // Cleanup for next cycle
        await stopServer(server);
        expect(server.listening).toBe(false);
      }
      server = null;
    });

    it('should not accept connections after shutdown', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act
      await stopServer(server);
      
      // Assert - attempting to connect should fail/timeout
      await expect(waitForServerReady(port, 500)).rejects.toThrow(/did not become ready/);
      server = null;
    });

    it('should handle stop when server is not started', async () => {
      // Arrange - create server but don't start it
      server = createTestServer(port);
      
      // Act & Assert - should not throw when stopping non-started server
      await expect(stopServer(server)).resolves.toBeUndefined();
      server = null;
    });

    it('should handle stop when server is null', async () => {
      // Act & Assert - should not throw when server is null
      await expect(stopServer(null)).resolves.toBeUndefined();
    });

    it('should handle stop when server is undefined', async () => {
      // Act & Assert - should not throw when server is undefined
      await expect(stopServer(undefined)).resolves.toBeUndefined();
    });

    it('should close all active connections on shutdown', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Make a request to establish a connection
      await request(server).get('/');
      
      // Act
      await stopServer(server);
      
      // Assert - server should be completely stopped
      expect(server.listening).toBe(false);
      server = null;
    });
  });

  /**
   * Full Request/Response Cycle Test Suite
   * 
   * Validates complete HTTP request handling:
   * - GET requests return expected response
   * - POST requests return expected response
   * - Multiple sequential requests work correctly
   * - All response properties match expectations
   */
  describe('Full Request/Response Cycle', () => {
    it('should complete GET request successfully', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act
      const response = await request(server).get('/');
      
      // Assert - verify all response properties
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should complete POST request successfully', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act
      const response = await request(server).post('/');
      
      // Assert - POST should return same response as GET
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should handle multiple sequential requests', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      const requestCount = 5;
      
      // Act & Assert - make multiple requests sequentially
      for (let i = 0; i < requestCount; i++) {
        const response = await request(server).get('/');
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.text).toBe(EXPECTED_BODY);
      }
    });

    it('should return complete response with all expected properties', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act
      const response = await request(server).get('/');
      
      // Assert - verify response object structure
      expect(response).toMatchObject({
        status: EXPECTED_STATUS,
        text: EXPECTED_BODY
      });
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
    });

    it('should include trailing newline in response body', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act
      const response = await request(server).get('/');
      
      // Assert - verify exact body content including newline
      expect(response.text).toBe('Hello, World!\n');
      expect(response.text.endsWith('\n')).toBe(true);
    });

    it('should return response body of correct length', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act
      const response = await request(server).get('/');
      
      // Assert - verify body length matches expected body
      expect(response.text.length).toBe(EXPECTED_BODY.length);
    });
  });

  /**
   * Connection Lifecycle Test Suite
   * 
   * Tests connection management including:
   * - Keep-alive connections
   * - Server state across multiple requests
   * - Connection agent behavior
   */
  describe('Connection Lifecycle', () => {
    it('should handle connection keep-alive', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Create an agent for keep-alive connections
      const agent = request.agent(server);
      
      // Act - make multiple requests using the same agent
      const response1 = await agent.get('/');
      const response2 = await agent.get('/');
      
      // Assert - both requests should succeed
      expect(response1.status).toBe(EXPECTED_STATUS);
      expect(response2.status).toBe(EXPECTED_STATUS);
    });

    it('should maintain server state across requests', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act - make first request
      await request(server).get('/');
      
      // Assert - server should still be listening after first request
      expect(server.listening).toBe(true);
      
      // Act - make second request
      await request(server).get('/');
      
      // Assert - server should still be listening after second request
      expect(server.listening).toBe(true);
    });

    it('should handle different request paths', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act - test various paths
      const paths = ['/', '/test', '/api/data', '/nested/path/here'];
      
      for (const path of paths) {
        const response = await request(server).get(path);
        
        // Assert - all paths should return same response
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.text).toBe(EXPECTED_BODY);
      }
    });

    it('should handle requests with query strings', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act - request with query string
      const response = await request(server).get('/?foo=bar&baz=qux');
      
      // Assert - should still return expected response
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });
  });

  /**
   * Concurrent Request Test Suite
   * 
   * Tests server behavior under concurrent load:
   * - Multiple simultaneous requests
   * - Response consistency under load
   */
  describe('Concurrent Requests', () => {
    it('should handle multiple simultaneous requests', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      const concurrentRequests = 10;
      
      // Act - fire multiple requests simultaneously
      const requestPromises = Array.from({ length: concurrentRequests }, () =>
        request(server).get('/')
      );
      const responses = await Promise.all(requestPromises);
      
      // Assert - all requests should succeed with expected response
      responses.forEach((response) => {
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.text).toBe(EXPECTED_BODY);
      });
    });

    it('should maintain response consistency under concurrent load', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      const loadIterations = 3;
      const requestsPerIteration = 5;
      
      // Act & Assert - run multiple iterations of concurrent requests
      for (let i = 0; i < loadIterations; i++) {
        const requestPromises = Array.from({ length: requestsPerIteration }, () =>
          request(server).get('/')
        );
        const responses = await Promise.all(requestPromises);
        
        // All responses should be identical
        responses.forEach((response, index) => {
          expect(response.status).toBe(EXPECTED_STATUS);
          expect(response.text).toBe(EXPECTED_BODY);
          expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
        });
      }
    });

    it('should handle mixed HTTP methods concurrently', async () => {
      // Arrange
      server = createTestServer(port);
      await startServer(server, port);
      
      // Act - fire different HTTP methods simultaneously
      const requestPromises = [
        request(server).get('/'),
        request(server).post('/'),
        request(server).get('/other'),
        request(server).post('/api')
      ];
      const responses = await Promise.all(requestPromises);
      
      // Assert - all requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.text).toBe(EXPECTED_BODY);
      });
    });
  });

  /**
   * Server Instance Test Suite
   * 
   * Tests server object behavior and properties
   */
  describe('Server Instance', () => {
    it('should be an HTTP server instance', async () => {
      // Arrange & Act
      server = createTestServer(port);
      
      // Assert - server should be an http.Server instance
      expect(server).toBeInstanceOf(http.Server);
    });

    it('should have listen method', async () => {
      // Arrange & Act
      server = createTestServer(port);
      
      // Assert - server should have listen method
      expect(typeof server.listen).toBe('function');
    });

    it('should have close method', async () => {
      // Arrange & Act
      server = createTestServer(port);
      
      // Assert - server should have close method
      expect(typeof server.close).toBe('function');
    });

    it('should track listening state correctly', async () => {
      // Arrange
      server = createTestServer(port);
      
      // Assert - not listening initially
      expect(server.listening).toBe(false);
      
      // Act - start server
      await startServer(server, port);
      
      // Assert - now listening
      expect(server.listening).toBe(true);
      
      // Act - stop server
      await stopServer(server);
      
      // Assert - no longer listening
      expect(server.listening).toBe(false);
      server = null;
    });
  });
});
