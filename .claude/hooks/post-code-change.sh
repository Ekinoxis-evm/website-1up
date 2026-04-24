#!/usr/bin/env bash
# ============================================================
# Hook: PostToolUse (Edit | Write)
# Event: Fires after Claude edits or writes any file.
# Does: Runs a quick TypeScript type check (non-blocking —
#       outputs warnings but does not stop Claude).
# Disable: Remove the PostToolUse entry from .claude/settings.json
# ============================================================

set -euo pipefail

CHANGED_FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"

# Only run for TypeScript files
if [[ -n "$CHANGED_FILE" ]] && [[ "$CHANGED_FILE" != *.ts ]] && [[ "$CHANGED_FILE" != *.tsx ]]; then
  exit 0
fi

# Skip node_modules and .next
if [[ "$CHANGED_FILE" == *node_modules* ]] || [[ "$CHANGED_FILE" == *.next* ]]; then
  exit 0
fi

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo ""
echo "── Type check ──────────────────────────────────"

# Run tsc --noEmit, show last 20 lines, always exit 0 (non-blocking)
npx --no tsc --noEmit 2>&1 | tail -20 || true

echo "────────────────────────────────────────────────"
echo ""

# Always exit 0 — this hook is informational, never blocks
exit 0
