# Stage 1: Builder
FROM node:18-slim AS builder

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
# Using npm ci is generally recommended if you have a package-lock.json
RUN npm install 

# Copy the rest of the application code
COPY . .

# Build the TypeScript application
RUN npm run build

# Stage 2: Production
FROM node:18-slim

WORKDIR /app

# Copy artifacts from the builder stage:
# 1. Compiled code from dist/
COPY --from=builder /app/dist ./dist
# 2. Production dependencies definition (package.json, package-lock.json)
COPY --from=builder /app/package*.json ./
# 3. The bin script
COPY --from=builder /app/bin ./bin

# Install only production dependencies
# npm ci --only=production is preferred if package-lock.json is consistently used and committed.
# Otherwise, npm install --omit=dev or npm install --production works.
RUN npm install --omit=dev

# Ensure the CLI script is executable (it should be from the COPY but good to be sure)
RUN chmod +x ./bin/aave-mcp

# Set environment variables (optional, but good practice for Node apps)
ENV NODE_ENV=production

# Expose port if your MCP server was an HTTP server 
# (Not strictly necessary for this stdio/CLI based MCP)
# EXPOSE 3000 

# Set the entrypoint to run the CLI start command
ENTRYPOINT ["./bin/aave-mcp", "start"]
# The default command for aave-mcp start is stdio mode, which is what we want for MCP. 