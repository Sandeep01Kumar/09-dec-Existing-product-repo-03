/**
 * Unit Tests for server.js HTTP Request Handler
 * 
 * Tests HTTP response body, status codes, and headers for the Node.js HTTP server.
 * Uses Jest framework with supertest for HTTP assertions.
 * 
 * @file server.test.js
 */

'use strict';

const request = require('supertest');
const {
  EXPECTED_BODY,
  EXPECTED_STATUS,
  EXPECTED_CONTENT_TYPE
} = require('./__fixtures__/expected-responses');
const {
  createTestServer,
  getAvailablePort,
  startServer,
  stopServer
} = require('./__helpers__/server-manager');

describe('Server', () => {
  let server;
  let port;

  beforeEach(async () => {
    port = getAvailablePort();
    server = createTestServer(port);
    await startServer(server, port);
  });

  afterEach(async () => {
    await stopServer(server);
    server = null;
  });

  describe('Request Handler', () => {
    describe('Response Body Tests', () => {
      it('should return "Hello, World!\\n" for GET requests', async () => {
        const response = await request(server).get('/');
        
        expect(response.text).toBe(EXPECTED_BODY);
      });

      it('should return response with trailing newline', async () => {
        const response = await request(server).get('/');
        
        expect(response.text.endsWith('\n')).toBe(true);
      });

      it('should return exact expected body content', async () => {
        const response = await request(server).get('/');
        
        expect(response.text).toMatch(/^Hello, World!\n$/);
      });

      it('should return response encoded as UTF-8', async () => {
        const response = await request(server).get('/');
        
        // Verify the response can be correctly decoded
        expect(Buffer.from(response.text).toString('utf8')).toBe(EXPECTED_BODY);
      });
    });

    describe('Status Code Tests', () => {
      it('should set status code to 200', async () => {
        const response = await request(server).get('/');
        
        expect(response.status).toBe(EXPECTED_STATUS);
      });

      it('should return HTTP 200 status code for all requests', async () => {
        const response = await request(server).get('/');
        
        expect(response.statusCode).toBe(200);
      });

      it('should have consistent status code across requests', async () => {
        const response1 = await request(server).get('/');
        const response2 = await request(server).get('/');
        
        expect(response1.status).toBe(response2.status);
        expect(response1.status).toBe(EXPECTED_STATUS);
      });
    });

    describe('Header Tests', () => {
      it('should set Content-Type header to text/plain', async () => {
        const response = await request(server).get('/');
        
        expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
      });

      it('should have properly formatted Content-Type header', async () => {
        const response = await request(server).get('/');
        
        expect(response.headers['content-type']).toMatch(/^text\/plain$/);
      });

      it('should include Content-Type in response headers', async () => {
        const response = await request(server).get('/');
        
        expect(response.headers).toHaveProperty('content-type');
      });
    });

    describe('Complete Response Verification', () => {
      it('should return complete valid response', async () => {
        const response = await request(server).get('/');
        
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
        expect(response.text).toBe(EXPECTED_BODY);
      });
    });
  });
});
