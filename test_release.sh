#!/usr/bin/env bash
# ─── Tests for release.sh ──────────────────────────────────────────
# Validates argument parsing, semver validation, version comparison,
# and dry-run behavior by invoking release.sh directly.
#
# Usage: ./test_release.sh
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
# Remove temp backup dir on exit (handles Ctrl+C and failures)

BACKUP_DIR=""
cleanup() {
  if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
    rm -rf "$BACKUP_DIR"
  fi
}
trap cleanup EXIT

# ─── Helpers ────────────────────────────────────────────────────────

get_version() {
  node -p "require('./package.json').version"
}

next_patch() {
  local ver
  ver=$(get_version)
  IFS='.' read -ra parts <<< "$ver"
  echo "${parts[0]}.${parts[1]}.$(( ${parts[2]} + 1 ))"
}

# Save files to a temp directory (not in the repo!) to keep working tree clean
save_files() {
  BACKUP_DIR=$(mktemp -d)
  cp package.json "$BACKUP_DIR/package.json"
  cp public/manifest.json "$BACKUP_DIR/manifest.json"
}

restore_files() {
  if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
    cp "$BACKUP_DIR/package.json" package.json
    cp "$BACKUP_DIR/manifest.json" public/manifest.json
    rm -rf "$BACKUP_DIR"
    BACKUP_DIR=""
  fi
}

# Run release.sh and capture output + exit code
run_release() {
  local exit_code=0
  local output
  output=$(bash ./release.sh "$@" 2>&1) || exit_code=$?
  echo "$output"
  return $exit_code
}

# ═══════════════════════════════════════════════════════════════════════
# TEST SUITES
# ═══════════════════════════════════════════════════════════════════════

# ─── 1. Argument parsing (via dry-run output) ──────────────────────

section "Argument parsing — --dry-run flag"

save_files
NEXT=$(next_patch)
OUT=$(run_release "$NEXT" --dry-run --skip-tests --skip-typecheck --skip-lint) || true
restore_files

if echo "$OUT" | grep -q "DRY RUN"; then
  pass "--dry-run flag detected in output"
else
  fail_msg "--dry-run flag not detected in output"
fi

if echo "$OUT" | grep -q "Dry run complete"; then
  pass "--dry-run completes with summary"
else
  fail_msg "--dry-run missing completion summary"
fi

section "Argument parsing — --skip-tests flag"

save_files
NEXT=$(next_patch)
OUT=$(run_release "$NEXT" --dry-run --skip-tests --skip-typecheck --skip-lint) || true
restore_files

if echo "$OUT" | grep -qi "skip"; then
  pass "--skip-tests flag detected in output"
else
  fail_msg "--skip-tests flag not detected in output"
fi

section "Argument parsing — explicit version"

save_files
OUT=$(run_release "99.0.1" --dry-run --skip-tests --skip-typecheck --skip-lint) || true
restore_files

if echo "$OUT" | grep -q "99.0.1"; then
  pass "Explicit version 99.0.1 appears in output"
else
  fail_msg "Explicit version 99.0.1 not found in output"
fi

section "Argument parsing — combined flags"

save_files
OUT=$(run_release "99.0.2" --dry-run --skip-tests --skip-typecheck --skip-lint) || true
restore_files

if echo "$OUT" | grep -q "DRY RUN" && echo "$OUT" | grep -qi "skip"; then
  pass "Both --dry-run and --skip-tests detected together"
else
  fail_msg "Combined flags not both detected"
fi

section "Argument parsing — --no-monitor flag"

save_files
NEXT=$(next_patch)
OUT=$(run_release "$NEXT" --dry-run --skip-tests --skip-typecheck --skip-lint --no-monitor) || true
restore_files

if echo "$OUT" | grep -qi "no-monitor\|skipping workflow monitoring"; then
  pass "--no-monitor flag detected in output"
else
  fail_msg "--no-monitor flag not detected in output"
fi

# ─── 2. Semver validation (via dry-run with bad versions) ──────────

section "Semver validation — invalid formats rejected"

save_files

for ver in "abc" "1.0" "1.0.0.0" "v1.0.0" "1.0.0-rc" "1..0" ".1.0"; do
  OUT=$(run_release "$ver" --dry-run --skip-tests --skip-typecheck --skip-lint) 2>/dev/null && {
    fail_msg "Should reject invalid version '$ver'"
    continue
  }
  pass "Rejects invalid version '$ver'"
done

restore_files

section "Semver validation — leading zeros rejected"

save_files

for ver in "01.0.0" "1.02.3" "1.0.03"; do
  OUT=$(run_release "$ver" --dry-run --skip-tests --skip-typecheck --skip-lint) 2>/dev/null && {
    fail_msg "Should reject leading zeros in '$ver'"
    continue
  }
  pass "Rejects leading zeros in '$ver'"
done

restore_files

section "Semver validation — valid formats accepted"

save_files
NEXT=$(next_patch)
OUT=$(run_release "$NEXT" --dry-run --skip-tests --skip-typecheck --skip-lint) || true
restore_files

if echo "$OUT" | grep -q "Dry run complete"; then
  pass "Valid version $NEXT accepted"
else
  fail_msg "Valid version $NEXT rejected"
fi

section "Semver validation — downgrade rejected"

save_files
CURRENT=$(get_version)
OUT=$(run_release "0.0.1" --dry-run --skip-tests --skip-typecheck --skip-lint) 2>/dev/null && {
  fail_msg "Should reject downgrade to 0.0.1 (current: $CURRENT)"
  restore_files
}
if ! echo "$OUT" | grep -q "Dry run complete"; then
  pass "Downgrade to 0.0.1 correctly rejected"
else
  fail_msg "Downgrade to 0.0.1 was not rejected"
fi
restore_files

# ─── 3. Dry-run behavior — file integrity ──────────────────────────

section "Dry-run — files reverted after exit"

save_files
ORIG_PKG=$(cat package.json)
ORIG_MANIFEST=$(cat public/manifest.json)
NEXT=$(next_patch)

OUT=$(run_release "$NEXT" --dry-run --skip-tests --skip-typecheck --skip-lint) || true

NEW_PKG=$(cat package.json)
NEW_MANIFEST=$(cat public/manifest.json)
restore_files

if [ "$ORIG_PKG" = "$NEW_PKG" ]; then
  pass "package.json reverted after dry-run"
else
  fail_msg "package.json was NOT reverted after dry-run"
fi

if [ "$ORIG_MANIFEST" = "$NEW_MANIFEST" ]; then
  pass "public/manifest.json reverted after dry-run"
else
  fail_msg "public/manifest.json was NOT reverted after dry-run"
fi

section "Dry-run — no tags created"

save_files
NEXT=$(next_patch)

OUT=$(run_release "$NEXT" --dry-run --skip-tests --skip-typecheck --skip-lint) || true

restore_files

if git rev-parse "v$NEXT" >/dev/null 2>&1; then
  fail_msg "Tag v$NEXT was created during dry-run"
else
  pass "No tag v$NEXT created during dry-run"
fi

section "Dry-run — no commits created"

save_files
NEXT=$(next_patch)

OUT=$(run_release "$NEXT" --dry-run --skip-tests --skip-typecheck --skip-lint) || true

restore_files

if [ -z "$(git status --porcelain)" ]; then
  pass "Working tree clean after dry-run"
else
  fail_msg "Working tree dirty after dry-run"
fi

section "Dry-run — shows expected release summary"

save_files
NEXT=$(next_patch)

OUT=$(run_release "$NEXT" --dry-run --skip-tests --skip-typecheck --skip-lint) || true

restore_files

if echo "$OUT" | grep -q "Would have:"; then
  pass "Summary includes 'Would have:' list"
else
  fail_msg "Summary missing 'Would have:' list"
fi

if echo "$OUT" | grep -q "Created tag:"; then
  pass "Summary includes tag info"
else
  fail_msg "Summary missing tag info"
fi

if echo "$OUT" | grep -q "iw-auto-login-"; then
  pass "Summary includes zip filename"
else
  fail_msg "Summary missing zip filename"
fi

# ─── 4. Edge cases ─────────────────────────────────────────────────

section "Edge cases — v-prefix stripped from version"

save_files
OUT=$(run_release "v99.0.3" --dry-run --skip-tests --skip-typecheck --skip-lint) || true
restore_files

if echo "$OUT" | grep -q "99.0.3"; then
  pass "v-prefix stripped, version 99.0.3 used"
else
  fail_msg "v-prefix not stripped correctly"
fi

section "Edge cases — no arguments auto-increments patch"

save_files
BEFORE=$(get_version)
IFS='.' read -ra parts <<< "$BEFORE"
EXPECTED="${parts[0]}.${parts[1]}.$(( ${parts[2]} + 1 ))"

OUT=$(run_release --dry-run --skip-tests --skip-typecheck --skip-lint) || true
restore_files

if echo "$OUT" | grep -q "$EXPECTED"; then
  pass "Auto-increment produces $EXPECTED"
else
  fail_msg "Auto-increment did not produce $EXPECTED"
fi

# ─── 5. Validation execution ──────────────────────────────────────

section "Validation — typecheck skipped with --skip-typecheck"

save_files
NEXT=$(next_patch)
OUT=$(run_release "$NEXT" --dry-run --skip-tests --skip-typecheck --skip-lint) || true
restore_files

if echo "$OUT" | grep -q "Skipping typecheck"; then
  pass "Typecheck skipped with --skip-typecheck"
else
  fail_msg "Typecheck should be skipped with --skip-typecheck"
fi

section "Validation — lint skipped with --skip-lint"

save_files
NEXT=$(next_patch)
OUT=$(run_release "$NEXT" --dry-run --skip-tests --skip-typecheck --skip-lint) || true
restore_files

if echo "$OUT" | grep -q "Skipping lint"; then
  pass "Lint skipped with --skip-lint"
else
  fail_msg "Lint should be skipped with --skip-lint"
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
