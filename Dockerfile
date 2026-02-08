# ============================================
# ENIGMA Event Platform - Docker Configuration
# ============================================

FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S enigma && \
    adduser -S enigma -u 1001 -G enigma

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Set ownership to non-root user
RUN chown -R enigma:enigma /app

# Switch to non-root user
USER enigma

# Expose ports (user:2026, admin:4000, db-api:1212)
EXPOSE 2026 4000 1212

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:2026', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Run the application
CMD ["node", "enigma.js"]