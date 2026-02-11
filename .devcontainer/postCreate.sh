#!/bin/bash
set -e

echo "=== Installing Playwright project dependencies ==="
cd playwright
pnpm install

echo "=== Installing Chromium browser ==="
npx playwright install chromium

echo "=== Packaging walkthrough extension ==="
cd ../e2e-walkthrough
npx -y @vscode/vsce package --allow-missing-repository -o e2e-testing-walkthrough.vsix

echo "=== postCreate complete ==="
