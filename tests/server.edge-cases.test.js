/**
 * Edge Case Tests for server.js Boundary Conditions
 * 
 * Tests various HTTP methods, URL paths, and concurrent request handling.
 * Ensures server handles all edge cases correctly with consistent responses.
 * 
 * @file server.edge-cases.test.js
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

describe('Server Edge Cases', () => {
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

  describe('HTTP Methods', () => {
    it('should return correct response for GET method', async () => {
      const response = await request(server).get('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
    });

    it('should return correct response for POST method', async () => {
      const response = await request(server).post('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
    });

    it('should return correct response for PUT method', async () => {
      const response = await request(server).put('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
    });

    it('should return correct response for DELETE method', async () => {
      const response = await request(server).delete('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
    });

    it('should return correct response for PATCH method', async () => {
      const response = await request(server).patch('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
    });

    it('should return correct response for OPTIONS method', async () => {
      const response = await request(server).options('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
    });

    it('should return headers only for HEAD method', async () => {
      const response = await request(server).head('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      // HEAD requests should not have a body (text is undefined or empty)
      expect(response.text || '').toBe('');
      expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
    });

    it.each(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])(
      'should return consistent response for %s method',
      async (method) => {
        const response = await request(server)[method.toLowerCase()]('/');
        
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.headers['content-type']).toBe(EXPECTED_CONTENT_TYPE);
      }
    );
  });

  describe('URL Paths', () => {
    it('should handle root path /', async () => {
      const response = await request(server).get('/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should handle nested paths /a/b/c', async () => {
      const response = await request(server).get('/a/b/c');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should handle paths with query strings /?foo=bar', async () => {
      const response = await request(server).get('/?foo=bar');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should handle paths with multiple query parameters', async () => {
      const response = await request(server).get('/?foo=bar&baz=qux&num=123');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should handle paths with trailing slashes', async () => {
      const response = await request(server).get('/path/');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should handle paths with special characters (URL encoded)', async () => {
      const response = await request(server).get('/path%20with%20spaces');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should handle deeply nested paths', async () => {
      const response = await request(server).get('/level1/level2/level3/level4/level5');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should handle paths with dots', async () => {
      const response = await request(server).get('/file.html');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should handle paths with hyphens and underscores', async () => {
      const response = await request(server).get('/path-with-hyphens/path_with_underscores');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it.each([
      '/',
      '/api',
      '/api/v1',
      '/users/123',
      '/path?query=value',
      '/file.json'
    ])(
      'should return consistent response for path %s',
      async (path) => {
        const response = await request(server).get(path);
        
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.text).toBe(EXPECTED_BODY);
      }
    );
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple simultaneous GET requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        request(server).get('/')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.text).toBe(EXPECTED_BODY);
      });
    });

    it('should handle concurrent requests with different methods', async () => {
      const requests = [
        request(server).get('/'),
        request(server).post('/'),
        request(server).put('/'),
        request(server).delete('/'),
        request(server).patch('/')
      ];
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(EXPECTED_STATUS);
      });
    });

    it('should handle concurrent requests to different paths', async () => {
      const paths = ['/a', '/b', '/c', '/d', '/e'];
      const requests = paths.map(path => request(server).get(path));
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(EXPECTED_STATUS);
        expect(response.text).toBe(EXPECTED_BODY);
      });
    });

    it('should handle burst of rapid requests', async () => {
      const requestCount = 20;
      const requests = Array(requestCount).fill(null).map(() => 
        request(server).get('/')
      );
      
      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(requestCount);
      responses.forEach(response => {
        expect(response.status).toBe(EXPECTED_STATUS);
      });
    });

    it('should maintain consistent response under concurrent load', async () => {
      const requests = Array(50).fill(null).map(() => 
        request(server).get('/')
      );
      
      const responses = await Promise.all(requests);
      
      // All responses should be identical
      const bodies = new Set(responses.map(r => r.text));
      expect(bodies.size).toBe(1);
      expect(bodies.has(EXPECTED_BODY)).toBe(true);
    });
  });

  describe('Request Headers', () => {
    it('should accept requests with custom headers', async () => {
      const response = await request(server)
        .get('/')
        .set('X-Custom-Header', 'custom-value');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should accept requests with Accept header', async () => {
      const response = await request(server)
        .get('/')
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should accept requests with multiple headers', async () => {
      const response = await request(server)
        .get('/')
        .set('X-Header-1', 'value1')
        .set('X-Header-2', 'value2')
        .set('X-Header-3', 'value3');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });
  });

  describe('Request Body', () => {
    it('should accept POST requests with JSON body', async () => {
      const response = await request(server)
        .post('/')
        .send({ key: 'value' })
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should accept POST requests with text body', async () => {
      const response = await request(server)
        .post('/')
        .send('plain text body')
        .set('Content-Type', 'text/plain');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });

    it('should accept PUT requests with body', async () => {
      const response = await request(server)
        .put('/')
        .send({ data: 'test' })
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(EXPECTED_STATUS);
      expect(response.text).toBe(EXPECTED_BODY);
    });
  });
});
