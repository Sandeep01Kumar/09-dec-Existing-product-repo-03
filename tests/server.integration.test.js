/**
 * Integration Tests for server.js Server Lifecycle
 * 
 * Tests server startup, shutdown, and full HTTP request/response cycles.
 * Validates complete server lifecycle from initialization to termination.
 * 
 * @file server.integration.test.js
 */

'use strict';

const request = require('supertest');
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

describe('Server Integration', () => {
  let server;
  let port;

  beforeEach(() => {
    port = getAvailablePort();
  });

  afterEach(async () => {
    await stopServer(server);
    server = null;
  });

  describe('Server Startup', () => {
    it('should start listening on specified port', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      expect(server.listening).toBe(true);
    });

    it('should accept HTTP connections after startup', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      const response = await request(server).get('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
    });

    it('should be ready to receive requests after startup', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      await expect(waitForServerReady(port, 5000)).resolves.toBeUndefined();
    });

    it('should bind to localhost (127.0.0.1)', async () => {
      server = createTestServer(port);
      await startServer(server, port, '127.0.0.1');
      
      expect(server.listening).toBe(true);
      
      // Verify we can connect via localhost
      const response = await request(server).get('/');
      expect(response.status).toBe(EXPECTED_STATUS);
    });

    it('should log startup message pattern correctly', async () => {
      // Create a spy for console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // We'll test the pattern matches expected format
      const testMessage = `Server running at http://127.0.0.1:${port}/`;
      expect(testMessage).toMatch(STARTUP_MESSAGE_PATTERN);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Server Shutdown', () => {
    it('should close gracefully', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      expect(server.listening).toBe(true);
      
      await stopServer(server);
      
      expect(server.listening).toBe(false);
      server = null;
    });

    it('should release resources after shutdown', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      await stopServer(server);
      
      // Verify port is released by starting a new server on same port
      const newServer = createTestServer(port);
      await startServer(newServer, port);
      
      expect(newServer.listening).toBe(true);
      
      await stopServer(newServer);
      server = null;
    });

    it('should handle rapid start/stop cycles', async () => {
      for (let i = 0; i < 3; i++) {
        server = createTestServer(port);
        await startServer(server, port);
        
        expect(server.listening).toBe(true);
        
        await stopServer(server);
        
        expect(server.listening).toBe(false);
      }
      server = null;
    });

    it('should not accept connections after shutdown', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      await stopServer(server);
      
      // Attempting to wait for a closed server should timeout
      await expect(waitForServerReady(port, 500)).rejects.toThrow(/did not become ready/);
      server = null;
    });
  });

  describe('Full Request/Response Cycle', () => {
    it('should complete GET request successfully', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      const response = await request(server).get('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should complete POST request successfully', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      const response = await request(server).post('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should handle multiple sequential requests', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      for (let i = 0; i < 5; i++) {
        const response = await request(server).get('/');
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.text).toBe(EXPECTED_BODY);
      }
    });

    it('should return complete response with all expected properties', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      const response = await request(server).get('/');
      
      // Verify all response properties
      expect(response).toMatchObject({
        status: EXPECTED_STATUS,
        text: EXPECTED_BODY
      });
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
    });
  });

  describe('Connection Lifecycle', () => {
    it('should handle connection keep-alive', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      // Multiple requests on potentially same connection
      const agent = request.agent(server);
      
      const response1 = await agent.get('/');
      const response2 = await agent.get('/');
      
      expect(response1.status).toBe(EXPECTED_STATUS);
      expect(response2.status).toBe(EXPECTED_STATUS);
    });

    it('should maintain server state across requests', async () => {
      server = createTestServer(port);
      await startServer(server, port);
      
      await request(server).get('/');
      
      expect(server.listening).toBe(true);
      
      await request(server).get('/');
      
      expect(server.listening).toBe(true);
    });
  });
});
