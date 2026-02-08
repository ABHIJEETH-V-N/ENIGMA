/**
 * ENIGMA API Load Balancer Configuration
 * 
 * API keys are loaded from environment variables (.env file).
 * Add keys as GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3, etc.
 * 
 * Each endpoint has:
 * - url: The API endpoint URL
 * - key: The API key for authentication
 * - weight: Priority weight (higher = more requests)
 */

import { config } from 'dotenv';
config();

/**
 * Dynamically load API endpoints from environment variables
 * Looks for GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3, etc.
 */
function loadApiEndpointsFromEnv() {
    const endpoints = [];
    const baseUrl = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    
    // Check for numbered keys: GROQ_API_KEY_1, GROQ_API_KEY_2, etc.
    let keyIndex = 1;
    while (true) {
        const key = process.env[`GROQ_API_KEY_${keyIndex}`];
        if (key && key.trim()) {
            endpoints.push({
                name: `Groq ${keyIndex}`,
                url: baseUrl,
                key: key.trim(),
                weight: 1,
                model: model
            });
        }
        keyIndex++;
        // Stop checking after 20 or when we've had 5 consecutive empty keys
        if (keyIndex > 20) break;
    }
    
    // Fallback: check for single GROQ_API_KEY if no numbered keys found
    if (endpoints.length === 0 && process.env.GROQ_API_KEY) {
        endpoints.push({
            name: "Groq Primary",
            url: baseUrl,
            key: process.env.GROQ_API_KEY.trim(),
            weight: 1,
            model: model
        });
    }
    
    return endpoints;
}

// Load endpoints from environment
export const defaultApiEndpoints = loadApiEndpointsFromEnv();

// Log loaded endpoints (without exposing full keys)
console.log(`\n📡 API Load Balancer: Loaded ${defaultApiEndpoints.length} endpoint(s)`);
defaultApiEndpoints.forEach((ep, i) => {
    const maskedKey = ep.key.slice(0, 8) + '...' + ep.key.slice(-4);
    console.log(`   ${i + 1}. ${ep.name} [${maskedKey}]`);
});
console.log('');

/**
 * Load Balancer Settings
 */
export const loadBalancerConfig = {
    // Delay between queued requests (ms) - prevents rate limiting
    rateLimitDelay: 100,
    
    // Max failures before endpoint is marked as unhealthy
    maxFailures: 3,
    
    // Time to wait before retrying a failed endpoint (ms)
    retryDelay: 30000,
    
    // Request timeout (ms)
    requestTimeout: 30000,
    
    // Enable circuit breaker pattern
    circuitBreakerEnabled: true,
    
    // Log level: 'debug' | 'info' | 'warn' | 'error'
    logLevel: 'info'
};

/**
 * Session Configuration
 */
export const sessionConfig = {
    // Default session password (from .env or empty)
    defaultPassword: process.env.DEFAULT_PASSWORD || "",
    
    // Session timeout in milliseconds (0 = no timeout)
    sessionTimeout: 0,
    
    // Max users per session (0 = unlimited)
    maxUsers: 0,
    
    // Allow multiple connections from same IP
    allowMultipleConnections: true
};
