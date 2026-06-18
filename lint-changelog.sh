#!/usr/bin/env bash
# ─── CHANGELOG.md Lint Check ────────────────────────────────────────
# Validates that CHANGELOG.md follows the Keep a Changelog format.
#
# Usage: ./lint-changelog.sh
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CHANGELOG="CHANGELOG.md"
ERRORS=0

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

error() {
  echo -e "  ${RED}✖${NC} $*"
  ERRORS=$((ERRORS + 1))
}

ok() {
  echo -e "  ${GREEN}✔${NC} $*"
}

section() {
  echo ""
  echo -e "${CYAN}━━━ $* ━━━${NC}"
}

# ─── File existence ─────────────────────────────────────────────────

section "File checks"

if [ ! -f "$CHANGELOG" ]; then
  error "$CHANGELOG does not exist"
  echo ""
  exit 1
fi

ok "$CHANGELOG exists"

# ─── Required header lines ─────────────────────────────────────────

section "Header"

LINE1=$(head -1 "$CHANGELOG" | tr -d '\r')
if [ "$LINE1" = "# Changelog" ]; then
  ok "Title: '# Changelog'"
else
  error "Title should be '# Changelog', got: '$LINE1'"
fi

if grep -q "^All notable changes" "$CHANGELOG"; then
  ok "Subtitle present"
else
  error "Missing subtitle line ('All notable changes...')"
fi

if grep -q "Keep a Changelog" "$CHANGELOG"; then
  ok "Format reference present"
else
  error "Missing format reference ('Keep a Changelog')"
fi

# ─── [Unreleased] section ──────────────────────────────────────────

section "Unreleased section"

if grep -q "^## \[Unreleased\]" "$CHANGELOG"; then
  ok "[Unreleased] section exists"
else
  error "Missing [Unreleased] section"
fi

# ─── Version headers ───────────────────────────────────────────────

section "Version headers"

# Extract version headers and validate format
HEADER_LINES=$(grep -n "^## \[" "$CHANGELOG" | tr -d '\r' || true)
if [ -z "$HEADER_LINES" ]; then
  error "No version headers found"
else
  while IFS= read -r line; do
    LINENUM=$(echo "$line" | cut -d: -f1)
    HEADER=$(echo "$line" | cut -d: -f2-)

    # Check format: ## [X.Y.Z] - YYYY-MM-DD or ## [Unreleased]
    if echo "$HEADER" | grep -qE "^## \[[0-9]+\.[0-9]+\.[0-9]+\] - [0-9]{4}-[0-9]{2}-[0-9]{2}$"; then
      ok "Line $LINENUM: Valid version header"
    elif echo "$HEADER" | grep -q "^## \[Unreleased\]$"; then
      ok "Line $LINENUM: [Unreleased] header"
    else
      error "Line $LINENUM: Invalid header format: '$HEADER'"
      error "  Expected: ## [X.Y.Z] - YYYY-MM-DD"
    fi
  done <<< "$HEADER_LINES"
fi

# ─── Bullet items ──────────────────────────────────────────────────

section "Bullet items"

# Check that items under version headers use proper format
IN_VERSION=false
LINE_NUM=0
while IFS= read -r line; do
  LINE_NUM=$((LINE_NUM + 1))
  line="${line%$'\r'}"  # Strip trailing carriage return

  if echo "$line" | grep -qE "^## \[|^### "; then
    IN_VERSION=true
    continue
  fi

  # Skip blank lines, headers, link definitions, and lines after the links section
  if [ -z "$line" ] || echo "$line" | grep -qE "^#{1,3} " || echo "$line" | grep -qE "^\[.*\]: "; then
    continue
  fi

  # Once we hit the comparison links section, stop checking bullets
  if echo "$line" | grep -qE "^\["; then
    break
  fi

  # If we're inside a version section and the line is content, it should be a bullet
  if [ "$IN_VERSION" = true ]; then
    if echo "$line" | grep -qE "^- "; then
      : # valid bullet
    elif echo "$line" | grep -qE "^### "; then
      : # category header
    else
      error "Line $LINE_NUM: Content not a bullet: '$line'"
    fi
  fi
done < "$CHANGELOG"

# ─── Comparison links ──────────────────────────────────────────────

section "Comparison links"

# Check that version links exist at the bottom of the file
LINK_LINES=$(grep -nE "^\[.+\]: https://github.com/markvarvel/IW-Auto-Login/" "$CHANGELOG" | tr -d '\r' || true)
if [ -z "$LINK_LINES" ]; then
  error "No comparison links found at bottom of file"
else
  # Check [Unreleased] link exists
  if echo "$LINK_LINES" | grep -q "\[Unreleased\]:"; then
    ok "[Unreleased] comparison link exists"
  else
    error "Missing [Unreleased] comparison link"
  fi

  # Check each version link
  while IFS= read -r line; do
    LINENUM=$(echo "$line" | cut -d: -f1)
    LINK=$(echo "$line" | cut -d: -f2-)

    if echo "$LINK" | grep -qE "^\[[0-9]+\.[0-9]+\.[0-9]+\]: https://github.com/markvarvel/IW-Auto-Login/(compare|releases/tag)/v"; then
      ok "Line $LINENUM: Valid version link"
    elif echo "$LINK" | grep -qE "^\[Unreleased\]:"; then
      : # already checked
    else
      error "Line $LINENUM: Invalid link format: '$LINK'"
    fi
  done <<< "$LINK_LINES"
fi

# ─── Summary ───────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}━━━ Results ━━━${NC}"

if [ $ERRORS -gt 0 ]; then
  echo -e "  ${RED}$ERRORS error(s) found${NC}"
  echo ""
  exit 1
else
  echo -e "  ${GREEN}All checks passed${NC}"
  echo ""
  exit 0
fi
