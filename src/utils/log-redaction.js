/**
 * Log Redaction Utility
 * 
 * Masks sensitive credential values in logs to prevent secret leakage.
 * 
 * Usage:
 *   const { maskCredentials, createSafeLogger } = require('./log-redaction');
 *   console.log(maskCredentials(message));
 */

/**
 * Patterns for credential detection
 */
const CREDENTIAL_PATTERNS = [
  // Groq API keys
  { pattern: /gsk_[a-zA-Z0-9]{32,}/g, replacement: '***GROQ_API_KEY_REDACTED***' },
  
  // Telegram bot tokens (format: 123456789:ABC-DEF...)
  { pattern: /\d{9,}:[A-Za-z0-9_-]{35}/g, replacement: '***TELEGRAM_TOKEN_REDACTED***' },
  
  // Google API keys (AIza...)
  { pattern: /AIza[A-Za-z0-9_-]{35}/g, replacement: '***GEMINI_API_KEY_REDACTED***' },
  
  // Generic Bearer tokens in Authorization headers
  { pattern: /Bearer\s+[A-Za-z0-9_\-\.]{20,}/gi, replacement: 'Bearer ***REDACTED***' },
  
  // Basic auth (base64 encoded username:password)
  { pattern: /Basic\s+[A-Za-z0-9+\/=]{20,}/gi, replacement: 'Basic ***REDACTED***' },
  
  // PostgreSQL connection strings
  { pattern: /postgresql:\/\/[^:]+:[^@]+@[^\/]+\/\w+/gi, replacement: 'postgresql://***REDACTED***' },
  { pattern: /postgres:\/\/[^:]+:[^@]+@[^\/]+\/\w+/gi, replacement: 'postgres://***REDACTED***' },
  
  // Generic passwords in various formats
  { pattern: /(password|pwd|passwd|token|secret|api[_-]?key)\s*[=:]\s*["']?[^\s"']{8,}["']?/gi, replacement: '$1=***REDACTED***' },
  
  // AWS keys
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '***AWS_ACCESS_KEY_REDACTED***' },
  { pattern: /[A-Za-z0-9\/+=]{40}/g, replacement: '***AWS_SECRET_KEY_REDACTED***' }, // AWS secret keys
  
  // Private keys
  { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----.+?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gs, replacement: '***PRIVATE_KEY_REDACTED***' }
];

/**
 * Additional patterns for JSON credential objects
 */
const JSON_CREDENTIAL_KEYS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'privateKey',
  'private_key',
  'clientSecret',
  'client_secret'
];

/**
 * Mask credentials in a string
 * 
 * @param {string} input - The input string potentially containing credentials
 * @returns {string} - The input with credentials masked
 */
function maskCredentials(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  let output = input;
  
  // Apply all regex patterns
  CREDENTIAL_PATTERNS.forEach(({ pattern, replacement }) => {
    output = output.replace(pattern, replacement);
  });
  
  return output;
}

/**
 * Mask credentials in JSON objects
 * 
 * @param {Object} obj - JSON object potentially containing credentials
 * @returns {Object} - Sanitized copy of the object
 */
function maskCredentialsInObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => maskCredentialsInObject(item));
  }
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key matches credential field names
    if (JSON_CREDENTIAL_KEYS.some(credKey => lowerKey.includes(credKey.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'string') {
      sanitized[key] = maskCredentials(value);
    } else if (typeof value === 'object') {
      sanitized[key] = maskCredentialsInObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Create a safe logger wrapper that automatically redacts credentials
 * 
 * @param {Object} logger - Original logger object (e.g., console, winston)
 * @returns {Object} - Wrapped logger with credential redaction
 */
function createSafeLogger(logger = console) {
  const safeLogger = {};
  
  ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
    if (typeof logger[method] === 'function') {
      safeLogger[method] = function(...args) {
        const sanitizedArgs = args.map(arg => {
          if (typeof arg === 'string') {
            return maskCredentials(arg);
          } else if (typeof arg === 'object') {
            return maskCredentialsInObject(arg);
          }
          return arg;
        });
        
        logger[method](...sanitizedArgs);
      };
    }
  });
  
  return safeLogger;
}

/**
 * Express middleware for redacting credentials in HTTP request/response logs
 * 
 * @returns {Function} Express middleware
 */
function expressRedactionMiddleware() {
  return function(req, res, next) {
    // Store original end function
    const originalEnd = res.end;
    
    // Override res.end to capture response
    res.end = function(chunk, encoding) {
      // Redact request headers
      const safeHeaders = maskCredentialsInObject(req.headers);
      req.sanitizedHeaders = safeHeaders;
      
      // Redact request body if present
      if (req.body) {
        req.sanitizedBody = maskCredentialsInObject(req.body);
      }
      
      // Call original end
      originalEnd.call(res, chunk, encoding);
    };
    
    next();
  };
}

/**
 * Test function to verify redaction works
 */
function testRedaction() {
  const testCases = [
    'Using API key: gsk_abc123def456ghi789jkl012mno345pqr',
    'Bot token: 1234567890:ABCdefGHI-jklMNOpqrSTUvwxYZ123456',
    'Authorization: Bearer AIzaSyAbc123def456ghi789jkl012mno345pqr',
    'Connection: postgresql://user:pass123@localhost:5432/db',
    'Config: {"apiKey": "secret123", "password": "hunter2"}',
    'Normal log message with no secrets'
  ];
  
  console.log('=== Log Redaction Test ===\n');
  
  testCases.forEach((testCase, i) => {
    console.log(`Test ${i + 1}:`);
    console.log(`  Original: ${testCase}`);
    console.log(`  Redacted: ${maskCredentials(testCase)}`);
    console.log();
  });
  
  const testObject = {
    username: 'admin',
    password: 'secret123',
    apiKey: 'gsk_abc123def456ghi789jkl012mno345pqr',
    data: {
      token: '1234567890:ABCdefGHI-jklMNOpqrSTUvwxYZ123456',
      publicInfo: 'This should not be redacted'
    }
  };
  
  console.log('Object test:');
  console.log('  Original:', JSON.stringify(testObject, null, 2));
  console.log('  Redacted:', JSON.stringify(maskCredentialsInObject(testObject), null, 2));
}

// Export functions
module.exports = {
  maskCredentials,
  maskCredentialsInObject,
  createSafeLogger,
  expressRedactionMiddleware,
  testRedaction
};

// Run test if executed directly
if (require.main === module) {
  testRedaction();
}
