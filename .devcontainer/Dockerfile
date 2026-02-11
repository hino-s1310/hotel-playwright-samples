FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Enable corepack for pnpm support
RUN corepack enable

# Pre-install Playwright system dependencies (cached in Docker layer)
# This avoids a slow apt-get install on every container start
RUN npx -y playwright@1.44.1 install-deps chromium
