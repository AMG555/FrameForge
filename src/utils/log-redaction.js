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

  // Anthropic API keys (sk-ant-api03-...)
  { pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g, replacement: '***ANTHROPIC_API_KEY_REDACTED***' },

  // OpenAI API keys (sk-proj-... or sk-[A-Za-z0-9]{48})
  { pattern: /sk-proj-[A-Za-z0-9_-]{20,}/g, replacement: '***OPENAI_API_KEY_REDACTED***' },
  { pattern: /\bsk-[A-Za-z0-9]{48,}\b/g,    replacement: '***OPENAI_API_KEY_REDACTED***' },

  // OpenRouter API keys (sk-or-v1-...)
  { pattern: /sk-or-v1-[A-Za-z0-9_-]{20,}/g, replacement: '***OPENROUTER_API_KEY_REDACTED***' },

  // Telegram bot tokens (format: 123456789:ABC-DEF...)
  { pattern: /\d{9,}:[A-Za-z0-9_-]{35}/g, replacement: '***TELEGRAM_TOKEN_REDACTED***' },

  // Google / YouTube / Gemini API keys (AIza...)
  { pattern: /AIza[A-Za-z0-9_-]{35}/g, replacement: '***GOOGLE_API_KEY_REDACTED***' },

  // ElevenLabs API keys (sk_...)
  { pattern: /sk_[a-zA-Z0-9]{32,}/g, replacement: '***ELEVENLABS_API_KEY_REDACTED***' },

  // Tavily API keys (tvly-...)
  { pattern: /tvly-[A-Za-z0-9]{20,}/g, replacement: '***TAVILY_API_KEY_REDACTED***' },

  // Brave Search API keys (BSA...)
  { pattern: /BSA[A-Za-z0-9]{20,}/g, replacement: '***BRAVE_API_KEY_REDACTED***' },

  // fal.ai API keys (key_...)
  { pattern: /key_[a-zA-Z0-9]{20,}/g, replacement: '***FALAI_API_KEY_REDACTED***' },

  // Replicate API keys (r8_...)
  { pattern: /r8_[A-Za-z0-9]{30,}/g, replacement: '***REPLICATE_API_KEY_REDACTED***' },

  // Azure Speech keys (typically 32-char alphanum, caught below; additional explicit guard)
  // IBM watsonx API keys (IAM keys — same pattern as generic Bearer, caught below)

  // Internal / MCP auth tokens (32-char hex)
  { pattern: /\b[0-9a-f]{32,64}\b/g, replacement: '***INTERNAL_TOKEN_REDACTED***' },

  // Generic Bearer tokens in Authorization headers
  { pattern: /Bearer\s+[A-Za-z0-9_\-\.]{20,}/gi, replacement: 'Bearer ***REDACTED***' },

  // Basic auth (base64 encoded username:password)
  { pattern: /Basic\s+[A-Za-z0-9+\/=]{20,}/gi, replacement: 'Basic ***REDACTED***' },

  // PostgreSQL connection strings
  { pattern: /postgresql:\/\/[^:]+:[^@]+@[^\/]+\/\w+/gi, replacement: 'postgresql://***REDACTED***' },
  { pattern: /postgres:\/\/[^:]+:[^@]+@[^\/]+\/\w+/gi,   replacement: 'postgres://***REDACTED***' },

  // Generic passwords / tokens / secrets / API keys in key=value or key: value format
  { pattern: /(password|pwd|passwd|token|secret|api[_-]?key|webhook[_-]?url)\s*[=:]\s*["']?[^\s"']{8,}["']?/gi, replacement: '$1=***REDACTED***' },

  // AWS keys
  { pattern: /AKIA[0-9A-Z]{16}/g,    replacement: '***AWS_ACCESS_KEY_REDACTED***' },

  // Private keys (PEM format)
  { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----.+?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gs, replacement: '***PRIVATE_KEY_REDACTED***' },
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
  'client_secret',
  // Webhook provider URLs (may embed tokens)
  'webhookUrl',
  'webhook_url',
  'webhookLlmUrl',
  'webhook_llm_url',
  'webhookTtsUrl',
  'webhook_tts_url',
  'webhookImageUrl',
  'webhook_image_url',
  // Internal / MCP tokens
  'internalApiToken',
  'internal_api_token',
  'mcpAuthToken',
  'mcp_auth_token',
  // Search API
  'searchApiKey',
  'search_api_key',
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
