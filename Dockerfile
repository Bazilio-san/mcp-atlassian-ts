# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# Set working directory
WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY .env.example ./

# Change ownership to app user
RUN chown -R mcp:nodejs /app
USER mcp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "import('http').then(({default: http}) => { \
    const options = { \
      host: 'localhost', \
      port: process.env.PORT || 3000, \
      path: '/health', \
      timeout: 2000 \
    }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) { \
        process.exit(0); \
      } else { \
        process.exit(1); \
      } \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end(); \
  })"

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/src/index.js"]

# Labels for metadata
LABEL org.opencontainers.image.title="MCP Atlassian TypeScript Server"
LABEL org.opencontainers.image.description="Modern TypeScript MCP server for Atlassian JIRA and Confluence"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.vendor="MCP Atlassian Team"
