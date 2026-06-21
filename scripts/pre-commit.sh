#!/usr/bin/env bash
# =============================================================================
# Gentleman Guardian Angel - Pre-Commit Hook
# =============================================================================
# This script runs the GGA code review tool before allowing a commit.
#
# Behavior:
#   1. If no files are staged, exits silently with success (0).
#   2. Counts the number of staged files.
#   3. If staged files exceed 30, prints a warning and skips GGA to avoid
#      "Argument list too long" errors on large diffs.
#   4. Otherwise, runs `gga run` and blocks the commit if it fails.
#
# This script is stored in the repo (scripts/pre-commit.sh) so that all clones
# can reference it. The actual Git hook in .git/hooks/pre-commit simply
# delegates to this file.
# =============================================================================

set -euo pipefail

STAGED_COUNT=$(git diff --cached --name-only | wc -l)

if [[ "$STAGED_COUNT" -eq 0 ]]; then
    exit 0
fi

if [[ "$STAGED_COUNT" -gt 30 ]]; then
    echo "⚠️  Warning: $STAGED_COUNT files staged. Skipping GGA review to avoid 'Argument list too long'." >&2
    echo "    Consider breaking this into smaller commits." >&2
    exit 0
fi

# Run GGA review; block commit on failure
gga run || exit 1
