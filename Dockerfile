# Saros SDK Documentation - Docker Configuration
# Multi-stage build for optimized production image

# Stage 1: Build the documentation
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use ci for faster, reliable, reproducible builds)
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the documentation site
RUN npm run build

# Stage 2: Production server
FROM nginx:alpine AS production

# Install additional tools for better logging and monitoring
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built documentation from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create nginx user and set permissions
RUN adduser -D -S -h /var/cache/nginx -s /sbin/nologin -G nginx nginx
RUN chown -R nginx:nginx /usr/share/nginx/html
RUN chmod -R 755 /usr/share/nginx/html

# Health check to ensure nginx is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Expose port 80
EXPOSE 80

# Add labels for better Docker image management
LABEL maintainer="Saros Finance <dev@saros.xyz>"
LABEL description="Saros SDK Documentation Site"
LABEL version="1.0"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]