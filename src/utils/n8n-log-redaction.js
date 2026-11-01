/**
 * n8n-specific Log Redaction
 * 
 * This module provides log redaction specifically for n8n Code nodes.
 * Import this in your n8n workflows to automatically redact credentials.
 * 
 * Usage in n8n Code node:
 * 
 * const { safeLog } = $item(0).json;
 * safeLog('Processing with API key: ' + apiKey);
 */

/**
 * Mask credentials in string
 */
function maskCredentials(input) {
  if (typeof input !== 'string') return input;
  
  return input
    // Groq API keys
    .replace(/gsk_[a-zA-Z0-9]{32,}/g, '***GROQ_KEY***')
    // Telegram tokens
    .replace(/\d{9,}:[A-Za-z0-9_-]{35}/g, '***TG_TOKEN***')
    // Gemini keys
    .replace(/AIza[A-Za-z0-9_-]{35}/g, '***GEMINI_KEY***')
    // Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]{20,}/gi, 'Bearer ***REDACTED***')
    // Basic auth
    .replace(/Basic\s+[A-Za-z0-9+\/=]{20,}/gi, 'Basic ***REDACTED***')
    // PostgreSQL
    .replace(/postgresql:\/\/[^:]+:[^@]+@[^\/]+\/\w+/gi, 'postgresql://***REDACTED***')
    // Generic password patterns
    .replace(/(password|token|secret|api[_-]?key)\s*[=:]\s*["']?[^\s"']{8,}["']?/gi, '$1=***REDACTED***');
}

/**
 * Safe logging function for n8n Code nodes
 */
function safeLog(...args) {
  const sanitized = args.map(arg => {
    if (typeof arg === 'string') {
      return maskCredentials(arg);
    } else if (typeof arg === 'object') {
      return JSON.stringify(arg, (key, value) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('password') || 
            lowerKey.includes('token') || 
            lowerKey.includes('secret') || 
            lowerKey.includes('apikey') ||
            lowerKey.includes('api_key')) {
          return '***REDACTED***';
        }
        return typeof value === 'string' ? maskCredentials(value) : value;
      }, 2);
    }
    return arg;
  });
  
  console.log(...sanitized);
}

/**
 * Export as n8n-compatible Code node
 * 
 * Copy this entire file content into an n8n Code node, then use:
 * 
 * safeLog('My log message with ' + apiKey);
 */

// For n8n Code nodes, return the safe logging function
return [{
  json: {
    safeLog: safeLog,
    maskCredentials: maskCredentials,
    message: 'Log redaction functions loaded. Use safeLog() instead of console.log()'
  }
}];
