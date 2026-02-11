FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Enable corepack and prepare pnpm (typescript-node image has yarn but not pnpm)
RUN corepack enable && corepack prepare pnpm@10.7.1 --activate

# Pre-build walkthrough VSIX so it exists when extensions are installed (before postCreate)
# Extensions in devcontainer.json are installed before postCreate, so we need the VSIX in the image
COPY e2e-walkthrough /tmp/e2e-walkthrough
RUN cd /tmp/e2e-walkthrough && npx -y @vscode/vsce package --allow-missing-repository -o e2e-testing-walkthrough.vsix && \
    mv /tmp/e2e-walkthrough/e2e-testing-walkthrough.vsix /tmp/ && rm -rf /tmp/e2e-walkthrough

# Note: playwright install-deps is skipped - Debian Trixie is not officially supported by Playwright.
