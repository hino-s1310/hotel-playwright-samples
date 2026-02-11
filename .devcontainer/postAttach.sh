#!/bin/bash
set +e  # Don't fail Reopen if extension install has issues

# Ensure we're in workspace root (postAttach may run from different cwd)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
[ -n "$SCRIPT_DIR" ] && cd "${SCRIPT_DIR}/.." 2>/dev/null || true

# Try workspace VSIX first (from postCreate), then image-built /tmp copy
for VSIX_PATH in "e2e-walkthrough/e2e-testing-walkthrough.vsix" "/tmp/e2e-testing-walkthrough.vsix"; do
    if [ -f "$VSIX_PATH" ]; then
        echo "=== Installing walkthrough extension from $VSIX_PATH ==="
        if [[ "$VSIX_PATH" == /* ]]; then
            ABSOLUTE_PATH="$VSIX_PATH"
        else
            ABSOLUTE_PATH="$(cd "$(dirname "$VSIX_PATH")" 2>/dev/null && pwd)/$(basename "$VSIX_PATH")"
        fi
        if [ -n "$ABSOLUTE_PATH" ] && [ -f "$ABSOLUTE_PATH" ]; then
            command -v code &>/dev/null && code --install-extension "$ABSOLUTE_PATH" --force 2>/dev/null || true
            command -v cursor &>/dev/null && cursor --install-extension "$ABSOLUTE_PATH" --force 2>/dev/null || true
        fi
        echo "=== Walkthrough ready: Command Palette (Cmd+Shift+P) > 'Welcome: Open Walkthrough...' ==="
        exit 0
    fi
done
echo "=== VSIX not found. Run 'bash .devcontainer/postCreate.sh' first ==="
exit 0
