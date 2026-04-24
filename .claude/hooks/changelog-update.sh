#!/usr/bin/env bash
# ============================================================
# Hook: Stop
# Event: Fires when Claude finishes a response (stops generating).
# Does: Checks if any source files were modified this session
#       and reminds Claude to update CHANGELOG.md (Rule 8).
#       Non-blocking — informational only.
# Disable: Remove the Stop entry from .claude/settings.json
# ============================================================

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Check if any src/ files are modified (staged or unstaged) — excluding docs
CHANGED_SRC=$(git diff --name-only HEAD 2>/dev/null | grep -E '^src/' | grep -v '\.md$' | wc -l | tr -d ' ')
CHANGED_STAGED=$(git diff --name-only --cached 2>/dev/null | grep -E '^src/' | grep -v '\.md$' | wc -l | tr -d ' ')
TOTAL=$((CHANGED_SRC + CHANGED_STAGED))

if [ "$TOTAL" -gt 0 ]; then
  # Check if CHANGELOG.md was also updated
  CHANGELOG_UPDATED=$(git diff --name-only HEAD 2>/dev/null | grep -c 'CHANGELOG.md' || true)
  CHANGELOG_STAGED=$(git diff --name-only --cached 2>/dev/null | grep -c 'CHANGELOG.md' || true)

  if [ "$CHANGELOG_UPDATED" -eq 0 ] && [ "$CHANGELOG_STAGED" -eq 0 ]; then
    echo ""
    echo "┌─────────────────────────────────────────────┐"
    echo "│  Rule 8 reminder:                           │"
    echo "│  $TOTAL source file(s) changed — update     │"
    echo "│  CHANGELOG.md before committing.            │"
    echo "│                                             │"
    echo "│  Format: ## [X.Y.Z] — $(date +%Y-%m-%d)        │"
    echo "└─────────────────────────────────────────────┘"
    echo ""
  fi
fi

# Always exit 0 — never blocks
exit 0
