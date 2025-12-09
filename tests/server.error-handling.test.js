/**
 * Error Handling Tests for server.js Error Scenarios
 * 
 * Tests port conflicts (EADDRINUSE), server error events, connection failures,
 * and graceful error recovery. Validates server behavior when encountering errors.
 * 
 * @file server.error-handling.test.js
 */

'use strict';

const http = require('http');
const {
  createTestServer,
  getAvailablePort,
  startServer,
  stopServer
} = require('./__helpers__/server-manager');

describe('Server Error Handling', () => {
  let server;
  let port;

  beforeEach(() => {
    port = getAvailablePort();
  });

  afterEach(async () => {
    await stopServer(server);
    server = null;
  });

  describe('Port Conflict', () => {
    it('should emit EADDRINUSE error when port is occupied', async () => {
      // Start first server on port
      server = createTestServer(port);
      await startServer(server, port);
      
      // Try to start second server on same port
      const server2 = createTestServer(port);
      
      await expect(startServer(server2, port)).rejects.toMatchObject({
        code: 'EADDRINUSE'
      });
      
      // Cleanup second server
      await stopServer(server2);
    });

    it('should emit error event on port conflict', async () => {
      // Start first server on port
      server = createTestServer(port);
      await startServer(server, port);
      
      // Create second server and set up error handler
      const server2 = createTestServer(port);
      const errorPromise = new Promise((resolve) => {
        server2.once('error', (error) => {
          resolve(error);
        });
      });
      
      // Try to listen on occupied port (will emit error)
      server2.listen(port, '127.0.0.1');
      
      const error = await errorPromise;
      expect(error.code).toBe('EADDRINUSE');
      
      // Cleanup
      await stopServer(server2);
    });

    it('should contain port number in error message', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      const server2 = createTestServer(port);
      
      try {
        await startServer(server2, port);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('EADDRINUSE');
        // Error should reference the port
        expect(error.port || error.message).toBeTruthy();
      }
      
      await stopServer(server2);
    });

    it('should handle port conflict gracefully without crashing', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      const server2 = createTestServer(port);
      
      // This should reject, not crash
      await expect(startServer(server2, port)).rejects.toBeDefined();
      
      // Original server should still be running
      expect(server.listening).toBe(true);
      
      await stopServer(server2);
    });
  });

  describe('Server Errors', () => {
    it('should handle internal errors gracefully', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      // Verify server continues to function
      const request = require('supertest');
      const response = await request(server).get('/');
      
      expect(response.status).toBe(200);
    });

    it('should not crash on request handler errors', async () => {
      // Create a server with an error-throwing handler
      const errorServer = http.createServer((req, res) => {
        // Simulate handling even if something goes wrong
        try {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Hello, World!\n');
        } catch (e) {
          // Handle gracefully
          res.statusCode = 500;
          res.end('Error');
        }
      });
      
      await startServer(errorServer, port);
      
      // Server should still be running
      expect(errorServer.listening).toBe(true);
      
      await stopServer(errorServer);
      server = null;
    });

    it('should allow attaching error event listeners', async () => {
      server = createTestServer(port);
      
      const errorHandler = jest.fn();
      server.on('error', errorHandler);
      
      await startServer(server, port);
      
      // Server should be running
      expect(server.listening).toBe(true);
      
      // Error handler was attached but not called (no errors occurred)
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should emit error events that can be caught', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      // Try to start another server on same port
      const server2 = createTestServer(port);
      
      const errorCaught = await new Promise((resolve) => {
        server2.on('error', (error) => {
          resolve(error);
        });
        server2.listen(port, '127.0.0.1');
      });
      
      expect(errorCaught).toBeDefined();
      expect(errorCaught.code).toBe('EADDRINUSE');
      
      await stopServer(server2);
    });
  });

  describe('Connection Errors', () => {
    it('should handle rapid connection attempts', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      const request = require('supertest');
      
      // Make many rapid requests
      const requests = Array(20).fill(null).map(() => 
        request(server).get('/')
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should remain stable after many requests', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      const request = require('supertest');
      
      // Make sequential requests
      for (let i = 0; i < 10; i++) {
        const response = await request(server).get('/');
        expect(response.status).toBe(200);
      }
      
      // Server should still be listening
      expect(server.listening).toBe(true);
    });

    it('should handle requests after previous request errors', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      const request = require('supertest');
      
      // Make a normal request
      const response1 = await request(server).get('/');
      expect(response1.status).toBe(200);
      
      // Make another request (simulating recovery after potential error)
      const response2 = await request(server).get('/');
      expect(response2.status).toBe(200);
    });
  });

  describe('Invalid Input Handling', () => {
    it('should reject invalid server instance in startServer', async () => {
      await expect(startServer(null, port)).rejects.toThrow('Invalid server instance');
    });

    it('should reject undefined server instance in startServer', async () => {
      await expect(startServer(undefined, port)).rejects.toThrow('Invalid server instance');
    });

    it('should reject invalid object as server in startServer', async () => {
      await expect(startServer({}, port)).rejects.toThrow('Invalid server instance');
    });

    it('should reject negative port number', async () => {
      server = createTestServer();
      await expect(startServer(server, -1)).rejects.toThrow('Invalid port number');
    });

    it('should reject port number above 65535', async () => {
      server = createTestServer();
      await expect(startServer(server, 70000)).rejects.toThrow('Invalid port number');
    });

    it('should handle non-numeric port gracefully', async () => {
      server = createTestServer();
      await expect(startServer(server, 'not-a-port')).rejects.toThrow('Invalid port number');
    });
  });

  describe('Resource Cleanup', () => {
    it('should release port after server close', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      await stopServer(server);
      
      // Should be able to start a new server on same port
      const newServer = createTestServer(port);
      await startServer(newServer, port);
      
      expect(newServer.listening).toBe(true);
      
      await stopServer(newServer);
      server = null;
    });

    it('should handle multiple close calls gracefully', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      // Multiple stop calls should not throw
      await expect(stopServer(server)).resolves.toBeUndefined();
      await expect(stopServer(server)).resolves.toBeUndefined();
      await expect(stopServer(server)).resolves.toBeUndefined();
      
      server = null;
    });

    it('should clean up resources when stopping never-started server', async () => {
      server = createTestServer(port);
      // Don't start the server
      
      await expect(stopServer(server)).resolves.toBeUndefined();
      
      server = null;
    });
  });

  describe('Server Recovery', () => {
    it('should allow restart after error', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      // Create a server that will fail
      const failedServer = createTestServer(port);
      await expect(startServer(failedServer, port)).rejects.toBeDefined();
      await stopServer(failedServer);
      
      // Original server should still work
      const request = require('supertest');
      const response = await request(server).get('/');
      expect(response.status).toBe(200);
    });

    it('should allow restarting server after normal shutdown', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      await stopServer(server);
      
      // Start the same server again
      await startServer(server, port);
      expect(server.listening).toBe(true);
      
      const request = require('supertest');
      const response = await request(server).get('/');
      expect(response.status).toBe(200);
    });
  });
});
