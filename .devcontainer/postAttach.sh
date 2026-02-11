#!/bin/bash

VSIX_PATH="e2e-walkthrough/e2e-testing-walkthrough.vsix"

if [ -f "$VSIX_PATH" ]; then
    echo "=== Installing walkthrough extension ==="
    code --install-extension "$VSIX_PATH" --force 2>/dev/null || true
    echo "=== Walkthrough ready: Open Command Palette > 'Welcome: Open Walkthrough...' ==="
else
    echo "=== VSIX not found. Run 'bash .devcontainer/postCreate.sh' first ==="
fi
