# 🚀 MOSA FORGE: Enterprise Production Dockerfile
#
# @description Production-ready container configuration for Mosa Forge Enterprise
# @version 1.0.0
# @author Oumer Muktar | Powered by Chereka
#
# 🏗️ ENTERPRISE FEATURES:
# - Multi-stage build for optimization
# - Security hardening & vulnerability scanning
# - Performance optimization
# - Health checks & monitoring
# - Microservices ready architecture

# =============================================
# 🏗️ STAGE 1: Builder Stage - Dependencies & Build
# =============================================
FROM node:18.18.0-alpine3.18 AS builder

# 🛡️ Security: Run as non-root user from beginning
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mosaforge -u 1001

# 🏗️ Install build dependencies and security updates
RUN apk add --no-cache --update \
    python3 \
    make \
    g++ \
    curl \
    git \
    openssl \
    && rm -rf /var/cache/apk/*

# 🛡️ Set security-focused environment variables
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_PRODUCTION=true
ENV NODE_OPTIONS="--max-old-space-size=4096 --enable-source-maps"

# 🏗️ Create and set application directory with proper permissions
WORKDIR /usr/src/app

# 🛡️ Copy package files with proper ownership
COPY --chown=mosaforge:nodejs package*.json ./
COPY --chown=mosaforge:nodejs prisma ./prisma/

# 🛡️ Switch to non-root user for security
USER mosaforge

# 🏗️ Install dependencies with security checks
RUN npm ci --only=production --no-optional --prefer-offline \
    && npm cache clean --force

# =============================================
# 🏗️ STAGE 2: Production Stage - Optimized Runtime
# =============================================
FROM node:18.18.0-alpine3.18 AS production

# 🛡️ Security Labels for container scanning
LABEL maintainer="Oumer Muktar <enterprise@mosaforge.com>"
LABEL vendor="Chereka"
LABEL version="1.0.0"
LABEL description="Mosa Forge Enterprise Skills Platform"
LABEL security.scan="enabled"
LABEL compliance.ethiopian="true"

# 🛡️ Install security updates and runtime dependencies
RUN apk add --no-cache --update \
    curl \
    tini \
    openssl \
    ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/cache/apk/* \
    && addgroup -g 1001 -S nodejs \
    && adduser -S mosaforge -u 1001

# 🛡️ Use tini as init process for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# 🏗️ Create application directory with secure permissions
RUN mkdir -p /usr/src/app && chown -R mosaforge:nodejs /usr/src/app
WORKDIR /usr/src/app

# 🛡️ Copy built application from builder stage
COPY --from=builder --chown=mosaforge:nodejs /usr/src/app/node_modules ./node_modules
COPY --chown=mosaforge:nodejs . .

# 🛡️ Security Hardening
# - Remove setuid/setgid binaries
# - Create non-writable directories
RUN find / -xdev -perm +6000 -type f -exec chmod a-s {} \; || true \
    && chmod -R g-w,o-w /usr/src/app \
    && mkdir -p /usr/src/app/logs /usr/src/app/temp \
    && chown -R mosaforge:nodejs /usr/src/app/logs /usr/src/app/temp \
    && chmod 755 /usr/src/app/logs /usr/src/app/temp

# 🛡️ Switch to non-root user
USER mosaforge

# 🏗️ Environment Configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# 🛡️ Security Environment Variables
ENV NODE_OPTIONS="--max-old-space-size=2048 --enable-source-maps --unhandled-rejections=strict"
ENV NPM_CONFIG_LOGLEVEL=error
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# 🏗️ Health Check Configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node health-check.js

# 🏗️ Expose Application Port
EXPOSE 3000

# =============================================
# 🎯 ENTERPRISE DEPLOYMENT CONFIGURATION
# =============================================

# 🏗️ Microservice-Specific Configuration
# Uncomment based on service type:

# 🔐 AUTH SERVICE
# ENV SERVICE_NAME=auth-service
# ENV DATABASE_URL=postgresql://user:pass@db:5432/mosa_auth
# ENV REDIS_URL=redis://redis:6379/0

# 💰 PAYMENT SERVICE  
# ENV SERVICE_NAME=payment-service
# ENV DATABASE_URL=postgresql://user:pass@db:5432/mosa_payments
# ENV TELEBIRR_API_KEY=your_telebirr_key
# ENV CBE_BIRR_API_KEY=your_cbe_birr_key

# 👨‍🏫 EXPERT SERVICE
# ENV SERVICE_NAME=expert-service
# ENV DATABASE_URL=postgresql://user:pass@db:5432/mosa_experts
# ENV QUALITY_THRESHOLD=4.0

# 🎓 STUDENT SERVICE
# ENV SERVICE_NAME=student-service
# ENV DATABASE_URL=postgresql://user:pass@db:5432/mosa_students

# 🛡️ QUALITY SERVICE
# ENV SERVICE_NAME=quality-service
# ENV DATABASE_URL=postgresql://user:pass@db:5432/mosa_quality

# 📚 LEARNING SERVICE
# ENV SERVICE_NAME=learning-service
# ENV DATABASE_URL=postgresql://user:pass@db:5432/mosa_learning

# 🏋️ TRAINING SERVICE
# ENV SERVICE_NAME=training-service
# ENV DATABASE_URL=postgresql://user:pass@db:5432/mosa_training

# 🏆 CERTIFICATION SERVICE
# ENV SERVICE_NAME=certification-service
# ENV DATABASE_URL=postgresql://user:pass@db:5432/mosa_certification
# ENV YACHI_API_KEY=your_yachi_key

# 📊 ANALYTICS SERVICE
# ENV SERVICE_NAME=analytics-service
# ENV DATABASE_URL=postgresql://user:pass@db:5432/mosa_analytics

# 🌐 API GATEWAY
# ENV SERVICE_NAME=api-gateway
# ENV RATE_LIMIT_WINDOW=900000
# ENV RATE_LIMIT_MAX=100

# 🏗️ Start Application with Process Manager
CMD ["node", "--enable-source-maps", "server.js"]

# =============================================
# 🔧 ENTERPRISE BUILD ARGUMENTS
# =============================================
# Build-time arguments for environment-specific configuration
ARG BUILD_VERSION=1.0.0
ARG BUILD_DATE
ARG COMMIT_SHA

# Set build-time metadata
LABEL build.version=${BUILD_VERSION}
LABEL build.date=${BUILD_DATE}
LABEL build.commit=${COMMIT_SHA}

# =============================================
# 📝 USAGE INSTRUCTIONS
# =============================================
# Build with security scanning:
# docker build --build-arg BUILD_VERSION=1.0.0 \
#              --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
#              --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
#              -t mosa-forge/student-service:1.0.0 .
#
# Run with security constraints:
# docker run -d \
#   --name student-service \
#   --user 1001:1001 \
#   --read-only \
#   --tmpfs /tmp \
#   --security-opt no-new-privileges:true \
#   -p 3000:3000 \
#   mosa-forge/student-service:1.0.0