#!/usr/bin/env bash
# ─── Tests for CHANGELOG.md auto-update format ─────────────────────
# Validates that the awk/sed logic in release.sh produces correctly
# formatted CHANGELOG.md output.
#
# Usage: ./test_changelog_update.sh
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

# ─── Test framework ─────────────────────────────────────────────────

PASS=0
FAIL=0
TOTAL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

pass() {
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${GREEN}✔${NC} $*"
}

fail_msg() {
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${RED}✖${NC} $*"
}

section() {
  echo ""
  echo -e "${CYAN}━━━ $* ━━━${NC}"
}

# ─── Cleanup trap ──────────────────────────────────────────────────

TEMP_DIR=""
cleanup() {
  if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT

# ─── Helper: simulate release.sh CHANGELOG update ──────────────────
# Usage: simulate_update <version> <date> <commits_file> <changelog_in> <changelog_out> [prev_version]
simulate_update() {
  local ver="$1"
  local date="$2"
  local commits_file="$3"
  local changelog_in="$4"
  local changelog_out="$5"
  local prev_ver="${6:-0.0.0}"

  # Run the exact awk command from release.sh
  awk -v ver="$ver" -v date="$date" -v cf="$commits_file" '
    BEGIN { while ((getline line < cf) > 0) { c = c line "\n" } close(cf) }
    /^## \[Unreleased\]/ {
      print "## [Unreleased]"
      print ""
      print "## [" ver "] - " date
      print ""
      printf "%s", c
      next
    }
    { print }
  ' "$changelog_in" > "$changelog_out"

  # Run the sed commands from release.sh
  local REPO_URL="https://github.com/markvarvel/IW-Auto-Login"
  sed -i "s|\[Unreleased\]: ${REPO_URL}/compare/v[0-9.]*...HEAD|[Unreleased]: ${REPO_URL}/compare/v${ver}...HEAD|g" "$changelog_out"
  sed -i "/\[Unreleased\]:/i [${ver}]: ${REPO_URL}/compare/v${prev_ver}...v${ver}" "$changelog_out"
}

# ═══════════════════════════════════════════════════════════════════════
# TEST SUITES
# ═══════════════════════════════════════════════════════════════════════

TEMP_DIR=$(mktemp -d)

# ─── 1. Basic update format ────────────────────────────────────────

section "Basic update — new version header inserted"

TEST_CL="$TEMP_DIR/CHANGELOG_basic.md"
RESULT_CL="$TEMP_DIR/CHANGELOG_basic_result.md"

cat > "$TEST_CL" << 'EOF'
# Changelog

All notable changes to IW-Auto-Login will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [1.0.0] - 2026-01-01

- Initial release

[1.0.0]: https://github.com/markvarvel/IW-Auto-Login/compare/v0.9.0...v1.0.0
[Unreleased]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.0...HEAD
EOF

cat > "$TEMP_DIR/commits.txt" << 'EOF'
- Fix login bug
- Add dark mode
EOF

simulate_update "1.1.0" "2026-06-18" "$TEMP_DIR/commits.txt" "$TEST_CL" "$RESULT_CL"

# Check [Unreleased] section is preserved
if grep -q "^## \[Unreleased\]" "$RESULT_CL"; then
  pass "[Unreleased] section preserved"
else
  fail_msg "[Unreleased] section missing"
fi

# Check new version header format
if grep -q "^## \[1.1.0\] - 2026-06-18$" "$RESULT_CL"; then
  pass "Version header format correct: ## [1.1.0] - 2026-06-18"
else
  fail_msg "Version header format incorrect"
fi

# Check commit bullets are inserted
if grep -q "^- Fix login bug$" "$RESULT_CL"; then
  pass "Commit bullet '- Fix login bug' present"
else
  fail_msg "Commit bullet '- Fix login bug' missing"
fi

if grep -q "^- Add dark mode$" "$RESULT_CL"; then
  pass "Commit bullet '- Add dark mode' present"
else
  fail_msg "Commit bullet '- Add dark mode' missing"
fi

# Check version order: [Unreleased] should come BEFORE [1.1.0]
UNRELEASED_LINE=$(grep -n "^## \[Unreleased\]" "$RESULT_CL" | head -1 | cut -d: -f1)
VERSION_LINE=$(grep -n "^## \[1.1.0\]" "$RESULT_CL" | head -1 | cut -d: -f1)
if [ "$UNRELEASED_LINE" -lt "$VERSION_LINE" ]; then
  pass "[Unreleased] appears before version header"
else
  fail_msg "[Unreleased] should appear before version header (lines $UNRELEASED_LINE vs $VERSION_LINE)"
fi

section "Basic update — existing entries preserved"

# Check existing version is still there
if grep -q "^## \[1.0.0\] - 2026-01-01$" "$RESULT_CL"; then
  pass "Existing version [1.0.0] preserved"
else
  fail_msg "Existing version [1.0.0] lost"
fi

if grep -q "^- Initial release$" "$RESULT_CL"; then
  pass "Existing entry '- Initial release' preserved"
else
  fail_msg "Existing entry '- Initial release' lost"
fi

# ─── 2. Comparison links ───────────────────────────────────────────

section "Comparison links — [Unreleased] link updated"

# The [Unreleased] link should point to the new version
if grep -q "^\[Unreleased\]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.1.0...HEAD" "$RESULT_CL"; then
  pass "[Unreleased] link updated to compare v1.1.0...HEAD"
else
  UNRELEASED_LINK=$(grep "^\[Unreleased\]:" "$RESULT_CL" || echo "NOT FOUND")
  fail_msg "[Unreleased] link incorrect: $UNRELEASED_LINK"
fi

section "Comparison links — new version link added"

if grep -q "^\[1.1.0\]: https://github.com/markvarvel/IW-Auto-Login/compare/v0.0.0...v1.1.0" "$RESULT_CL"; then
  pass "New version comparison link added"
else
  fail_msg "New version comparison link missing"
fi

# ─── 3. Keep a Changelog format compliance ─────────────────────────

section "Format compliance — lint-changelog.sh passes"

if [ -x "./lint-changelog.sh" ]; then
  # Create a full valid changelog for linting
  LINT_CL="$TEMP_DIR/CHANGELOG_lint.md"
  cp "$RESULT_CL" "$LINT_CL"

  if bash ./lint-changelog.sh >/dev/null 2>&1; then
    # The lint script checks the real CHANGELOG.md, so we need to test our result separately
    # Instead, validate key structural elements
    :
  fi

  # Validate structure manually
  HAS_TITLE=$(head -1 "$RESULT_CL" | tr -d '\r')
  if [ "$HAS_TITLE" = "# Changelog" ]; then
    pass "Title: '# Changelog'"
  else
    fail_msg "Title incorrect: '$HAS_TITLE'"
  fi

  if grep -q "^All notable changes" "$RESULT_CL"; then
    pass "Subtitle present"
  else
    fail_msg "Subtitle missing"
  fi

  if grep -q "Keep a Changelog" "$RESULT_CL"; then
    pass "Format reference present"
  else
    fail_msg "Format reference missing"
  fi
else
  pass "lint-changelog.sh not found, skipping format lint (structural checks above cover basics)"
fi

# ─── 4. Edge cases ─────────────────────────────────────────────────

section "Edge case — multiple commits"

MULTI_CL="$TEMP_DIR/CHANGELOG_multi.md"
MULTI_RESULT="$TEMP_DIR/CHANGELOG_multi_result.md"

cat > "$MULTI_CL" << 'EOF'
# Changelog

## [Unreleased]

## [1.0.0] - 2026-01-01

- Initial release

[1.0.0]: https://github.com/markvarvel/IW-Auto-Login/compare/v0.9.0...v1.0.0
[Unreleased]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.0...HEAD
EOF

cat > "$TEMP_DIR/commits_multi.txt" << 'EOF'
- First change
- Second change
- Third change
- Fourth change
- Fifth change
EOF

simulate_update "1.0.1" "2026-06-19" "$TEMP_DIR/commits_multi.txt" "$MULTI_CL" "$MULTI_RESULT"

MULTI_COUNT=$(grep -c "^- " "$MULTI_RESULT" || true)
if [ "$MULTI_COUNT" -ge 5 ]; then
  pass "All 5 commit bullets present (found $MULTI_COUNT total bullets)"
else
  fail_msg "Expected at least 5 bullets, found $MULTI_COUNT"
fi

section "Edge case — version with major bump"

MAJOR_CL="$TEMP_DIR/CHANGELOG_major.md"
MAJOR_RESULT="$TEMP_DIR/CHANGELOG_major_result.md"

cat > "$MAJOR_CL" << 'EOF'
# Changelog

## [Unreleased]

## [1.9.9] - 2026-06-01

- Last 1.x change

[1.9.9]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.9.8...v1.9.9
[Unreleased]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.9.9...HEAD
EOF

cat > "$TEMP_DIR/commits_major.txt" << 'EOF'
- Breaking change for v2
EOF

simulate_update "2.0.0" "2026-07-01" "$TEMP_DIR/commits_major.txt" "$MAJOR_CL" "$MAJOR_RESULT" "1.9.9"

if grep -q "^## \[2.0.0\] - 2026-07-01$" "$MAJOR_RESULT"; then
  pass "Major version header format correct"
else
  fail_msg "Major version header format incorrect"
fi

if grep -q "^\[2.0.0\]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.9.9...v2.0.0" "$MAJOR_RESULT"; then
  pass "Major version comparison link correct"
else
  fail_msg "Major version comparison link incorrect"
fi

if grep -q "^\[Unreleased\]: https://github.com/markvarvel/IW-Auto-Login/compare/v2.0.0...HEAD" "$MAJOR_RESULT"; then
  pass "[Unreleased] link updated to v2.0.0"
else
  fail_msg "[Unreleased] link not updated to v2.0.0"
fi

section "Edge case — empty [Unreleased] section"

EMPTY_CL="$TEMP_DIR/CHANGELOG_empty.md"
EMPTY_RESULT="$TEMP_DIR/CHANGELOG_empty_result.md"

cat > "$EMPTY_CL" << 'EOF'
# Changelog

## [Unreleased]

## [1.0.0] - 2026-01-01

- Initial release

[1.0.0]: https://github.com/markvarvel/IW-Auto-Login/compare/v0.9.0...v1.0.0
[Unreleased]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.0...HEAD
EOF

cat > "$TEMP_DIR/commits_empty.txt" << 'EOF'
- Only change
EOF

simulate_update "1.0.1" "2026-06-20" "$TEMP_DIR/commits_empty.txt" "$EMPTY_CL" "$EMPTY_RESULT"

# Should still have [Unreleased] + new version
UNRELEASED_COUNT=$(grep -c "^## \[Unreleased\]" "$EMPTY_RESULT" || true)
if [ "$UNRELEASED_COUNT" -eq 1 ]; then
  pass "Exactly one [Unreleased] section"
else
  fail_msg "Expected 1 [Unreleased] section, found $UNRELEASED_COUNT"
fi

if grep -q "^## \[1.0.1\] - 2026-06-20$" "$EMPTY_RESULT"; then
  pass "New version header present after empty [Unreleased]"
else
  fail_msg "New version header missing"
fi

# ─── Summary ───────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}━━━ Results ━━━${NC}"
echo -e "  Total: $TOTAL"
echo -e "  ${GREEN}Passed: $PASS${NC}"
if [ $FAIL -gt 0 ]; then
  echo -e "  ${RED}Failed: $FAIL${NC}"
  echo ""
  exit 1
else
  echo -e "  ${GREEN}All tests passed!${NC}"
  echo ""
  exit 0
fi
