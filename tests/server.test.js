/**
 * Unit Tests for server.js HTTP Request Handler
 * 
 * This test file provides comprehensive unit tests for the server.js HTTP request
 * handler. Tests verify HTTP response body ("Hello, World!\n"), status code (200),
 * and Content-Type header (text/plain) for the Node.js HTTP server.
 * 
 * Uses Jest framework with supertest for HTTP assertions.
 * 
 * Test Categories:
 * - Response Body Tests: Verify exact response content and encoding
 * - Status Code Tests: Validate HTTP 200 status for all requests
 * - Header Tests: Confirm Content-Type header correctness
 * 
 * @file tests/server.test.js
 * @requires supertest - HTTP assertion library for testing Node.js servers
 * @requires ./\__fixtures__/expected-responses - Centralized expected values
 * @requires ./\__helpers__/server-manager - Server lifecycle utilities
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

/**
 * Server Unit Test Suite
 * 
 * Tests the core HTTP request handler functionality of server.js.
 * Each test uses a fresh server instance to ensure isolation.
 */
describe('Server', () => {
  /** @type {import('http').Server} Server instance for tests */
  let server;
  /** @type {number} Port number for the test server */
  let port;

  /**
   * Setup before each test:
   * - Allocate unique port for parallel test execution safety
   * - Create fresh server instance
   * - Start server and wait for it to be ready
   */
  beforeEach(async () => {
    port = getAvailablePort();
    server = createTestServer(port);
    await startServer(server, port);
  });

  /**
   * Cleanup after each test:
   * - Gracefully stop the server
   * - Release all resources
   * - Prevent resource leaks between tests
   */
  afterEach(async () => {
    await stopServer(server);
    server = null;
  });

  /**
   * Request Handler Test Suite
   * 
   * Tests the request handler callback function (server.js lines 6-10).
   * Verifies response body, status code, and header configuration.
   */
  describe('Request Handler', () => {
    /**
     * Response Body Tests
     * 
     * Verify that the server returns the exact expected response body
     * "Hello, World!\n" with proper encoding.
     */
    describe('Response Body Tests', () => {
      it('should return "Hello, World!\\n" for GET requests', async () => {
        const response = await request(server).get('/');
        
        expect(response.text).toBe(EXPECTED_BODY);
      });

      it('should return "Hello, World!\\n" for POST requests', async () => {
        const response = await request(server).post('/');
        
        expect(response.text).toBe(EXPECTED_BODY);
      });

      it('should return response with trailing newline character', async () => {
        const response = await request(server).get('/');
        
        // Verify the response ends with a newline character
        expect(response.text.endsWith('\n')).toBe(true);
        // Verify the exact character
        expect(response.text.charAt(response.text.length - 1)).toBe('\n');
      });

      it('should return exact expected body content matching regex pattern', async () => {
        const response = await request(server).get('/');
        
        // Use regex to verify exact content
        expect(response.text).toMatch(/^Hello, World!\n$/);
      });

      it('should return response encoded as UTF-8', async () => {
        const response = await request(server).get('/');
        
        // Verify the response can be correctly decoded as UTF-8
        const decodedText = Buffer.from(response.text).toString('utf8');
        expect(decodedText).toBe(EXPECTED_BODY);
        
        // Verify byte length matches expected for UTF-8 encoding
        const expectedByteLength = Buffer.byteLength(EXPECTED_BODY, 'utf8');
        expect(Buffer.byteLength(response.text, 'utf8')).toBe(expectedByteLength);
      });

      it('should return response body of correct length', async () => {
        const response = await request(server).get('/');
        
        // "Hello, World!\n" is 14 characters
        expect(response.text.length).toBe(14);
        expect(response.text.length).toBe(EXPECTED_BODY.length);
      });

      it('should return identical response body for GET and POST requests', async () => {
        const getResponse = await request(server).get('/');
        const postResponse = await request(server).post('/');
        
        expect(getResponse.text).toBe(postResponse.text);
        expect(getResponse.text).toBe(EXPECTED_BODY);
      });
    });

    /**
     * Status Code Tests
     * 
     * Verify that the server correctly sets HTTP 200 OK status code
     * for all incoming requests.
     */
    describe('Status Code Tests', () => {
      it('should set status code to 200 for GET requests', async () => {
        const response = await request(server).get('/');
        
        expect(response.status).toBe(EXPECTED_STATUS);
      });

      it('should set status code to 200 for POST requests', async () => {
        const response = await request(server).post('/');
        
        expect(response.status).toBe(EXPECTED_STATUS);
      });

      it('should return HTTP 200 status code consistently', async () => {
        const response = await request(server).get('/');
        
        // Verify using both status and statusCode properties
        expect(response.statusCode).toBe(200);
        expect(response.status).toBe(200);
      });

      it('should have consistent status code across multiple requests', async () => {
        const response1 = await request(server).get('/');
        const response2 = await request(server).get('/');
        const response3 = await request(server).post('/');
        
        expect(response1.status).toBe(EXPECTED_STATUS);
        expect(response2.status).toBe(EXPECTED_STATUS);
        expect(response3.status).toBe(EXPECTED_STATUS);
        
        // All responses should have identical status codes
        expect(response1.status).toBe(response2.status);
        expect(response2.status).toBe(response3.status);
      });

      it('should return success status (2xx range)', async () => {
        const response = await request(server).get('/');
        
        // Verify status is in the 2xx success range
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(300);
      });

      it('should return exactly 200, not other 2xx codes', async () => {
        const response = await request(server).get('/');
        
        // Ensure it's specifically 200 OK, not 201 Created, 204 No Content, etc.
        expect(response.status).not.toBe(201);
        expect(response.status).not.toBe(204);
        expect(response.status).toBe(200);
      });
    });

    /**
     * Header Tests
     * 
     * Verify that the server correctly sets the Content-Type header
     * to "text/plain" for all responses.
     */
    describe('Header Tests', () => {
      it('should set Content-Type header to text/plain for GET requests', async () => {
        const response = await request(server).get('/');
        
        expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
      });

      it('should set Content-Type header to text/plain for POST requests', async () => {
        const response = await request(server).post('/');
        
        expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
      });

      it('should have properly formatted Content-Type header', async () => {
        const response = await request(server).get('/');
        
        // Verify exact match using regex
        expect(response.headers['content-type']).toMatch(/^text\/plain$/);
      });

      it('should include Content-Type in response headers', async () => {
        const response = await request(server).get('/');
        
        // Verify the header property exists
        expect(response.headers).toHaveProperty('content-type');
        expect(response.headers['content-type']).toBeDefined();
      });

      it('should not have charset specification in Content-Type', async () => {
        const response = await request(server).get('/');
        
        // The server sets "text/plain" without charset
        expect(response.headers['content-type']).not.toContain('charset');
      });

      it('should have Content-Type as lowercase in header key', async () => {
        const response = await request(server).get('/');
        
        // HTTP headers are case-insensitive, but Node.js normalizes to lowercase
        expect(Object.keys(response.headers)).toContain('content-type');
        expect(response.headers['Content-Type']).toBeUndefined(); // Lowercase is used
      });

      it('should set headers consistently across GET and POST requests', async () => {
        const getResponse = await request(server).get('/');
        const postResponse = await request(server).post('/');
        
        expect(getResponse.headers['content-type']).toBe(postResponse.headers['content-type']);
        expect(getResponse.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
      });
    });

    /**
     * Complete Response Verification Tests
     * 
     * Comprehensive tests verifying all response components together.
     */
    describe('Complete Response Verification', () => {
      it('should return complete valid response for GET request', async () => {
        const response = await request(server).get('/');
        
        // Verify all three components of the response
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
        expect(response.text).toBe(EXPECTED_BODY);
      });

      it('should return complete valid response for POST request', async () => {
        const response = await request(server).post('/');
        
        // Verify all three components of the response
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
        expect(response.text).toBe(EXPECTED_BODY);
      });

      it('should handle rapid consecutive GET requests', async () => {
        // Send multiple requests in quick succession
        const responses = await Promise.all([
          request(server).get('/'),
          request(server).get('/'),
          request(server).get('/')
        ]);
        
        // All responses should be valid
        responses.forEach((response) => {
          expect(response.status).toBe(EXPECTED_STATUS);
          expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
          expect(response.text).toBe(EXPECTED_BODY);
        });
      });

      it('should handle rapid consecutive POST requests', async () => {
        // Send multiple POST requests in quick succession
        const responses = await Promise.all([
          request(server).post('/'),
          request(server).post('/'),
          request(server).post('/')
        ]);
        
        // All responses should be valid
        responses.forEach((response) => {
          expect(response.status).toBe(EXPECTED_STATUS);
          expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
          expect(response.text).toBe(EXPECTED_BODY);
        });
      });

      it('should handle mixed GET and POST requests', async () => {
        // Send mixed request types
        const responses = await Promise.all([
          request(server).get('/'),
          request(server).post('/'),
          request(server).get('/'),
          request(server).post('/')
        ]);
        
        // All responses should be identical regardless of method
        responses.forEach((response) => {
          expect(response.status).toBe(EXPECTED_STATUS);
          expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
          expect(response.text).toBe(EXPECTED_BODY);
        });
      });

      it('should return response with valid HTTP structure', async () => {
        const response = await request(server).get('/');
        
        // Verify response object has expected structure
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('headers');
        expect(response).toHaveProperty('text');
        expect(response).toHaveProperty('body');
        
        // Verify types
        expect(typeof response.status).toBe('number');
        expect(typeof response.headers).toBe('object');
        expect(typeof response.text).toBe('string');
      });
    });
  });
});
