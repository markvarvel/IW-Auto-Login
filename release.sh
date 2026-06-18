#!/usr/bin/env bash
set -euo pipefail

# ─── IW-Auto-Login Release Script ───────────────────────────────────
# Usage:
#   ./release.sh              # Auto-increment patch (1.0.52 → 1.0.53)
#   ./release.sh 1.1.0        # Set explicit version
#   ./release.sh --dry-run    # Preview what would happen
#   ./release.sh --skip-tests # Skip running tests (for quick releases)
#   ./release.sh --skip-typecheck # Skip typecheck (for quick releases)
#   ./release.sh --skip-lint  # Skip lint (for quick releases)
#   ./release.sh --no-monitor # Skip workflow monitoring (faster completion)
#   ./release.sh 1.1.0 --dry-run --skip-tests --skip-typecheck --skip-lint --no-monitor
#
# What it does:
#   1. Run typecheck, tests, and lint
#   2. Bump version in package.json and manifest.json
#   3. Commit the version bump
#   4. Create and push a git tag
#   5. Monitor the GitHub Actions release workflow
# ─────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✔${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
fail()  { echo -e "${RED}✖${NC}  $*"; exit 1; }

# ─── Pre-flight checks ──────────────────────────────────────────────

command -v node >/dev/null 2>&1 || fail "node is not installed"
command -v git  >/dev/null 2>&1 || fail "git is not installed"
command -v gh   >/dev/null 2>&1 || fail "gh (GitHub CLI) is not installed"

# Ensure we're in the repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure working tree is clean
if [ -n "$(git status --porcelain)" ]; then
  fail "Working tree is not clean. Commit or stash your changes first."
fi

# Ensure we're on main branch
BRANCH="$(git branch --show-current)"
if [ "$BRANCH" != "main" ]; then
  warn "Not on main branch (currently on '$BRANCH')."
  read -rp "Continue anyway? [y/N] " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    fail "Aborted."
  fi
fi

# ─── Determine version ──────────────────────────────────────────────

CURRENT_VERSION=$(node -p "require('./package.json').version")
info "Current version: $CURRENT_VERSION"

# Validate semver format: X.Y.Z where X,Y,Z are non-negative integers, no leading zeros
validate_semver() {
  local ver="$1"
  if [[ ! "$ver" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    fail "Invalid version format: '$ver' (expected MAJOR.MINOR.PATCH, e.g. 1.2.3)"
  fi
  # Reject leading zeros (e.g. 1.02.3)
  local major minor patch
  major="${ver%%.*}"
  minor="${ver#*.}"
  minor="${minor%%.*}"
  patch="${ver##*.}"
  if [[ "$major" != "0" && "$major" =~ ^0[0-9] ]]; then
    fail "Invalid major version: '$major' (no leading zeros allowed)"
  fi
  if [[ "$minor" != "0" && "$minor" =~ ^0[0-9] ]]; then
    fail "Invalid minor version: '$minor' (no leading zeros allowed)"
  fi
  if [[ "$patch" != "0" && "$patch" =~ ^0[0-9] ]]; then
    fail "Invalid patch version: '$patch' (no leading zeros allowed)"
  fi
}

# Compare two semver strings: returns 0 if $1 > $2, 1 otherwise
version_gt() {
  local IFS='.'
  read -ra a <<< "$1"
  read -ra b <<< "$2"
  for i in 0 1 2; do
    if [ "${a[$i]:-0}" -gt "${b[$i]:-0}" ]; then return 0; fi
    if [ "${a[$i]:-0}" -lt "${b[$i]:-0}" ]; then return 1; fi
  done
  return 1
}

# Parse arguments
DRY_RUN=false
SKIP_TESTS=false
SKIP_TYPECHECK=false
SKIP_LINT=false
NO_MONITOR=false
VERSION_ARG=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --skip-tests) SKIP_TESTS=true ;;
    --skip-typecheck) SKIP_TYPECHECK=true ;;
    --skip-lint) SKIP_LINT=true ;;
    --no-monitor) NO_MONITOR=true ;;
    *) VERSION_ARG="$arg" ;;
  esac
done

if [ "$DRY_RUN" = true ]; then
  info "DRY RUN — no commits, tags, or pushes will be made"
  echo ""
  # Revert any file changes on exit (even if validation fails)
  DRY_RUN_REVERT() {
    git checkout -- package.json public/manifest.json 2>/dev/null || true
    [ -f CHANGELOG.md ] && git checkout -- CHANGELOG.md 2>/dev/null || true
  }
  trap DRY_RUN_REVERT EXIT
fi
if [ "$SKIP_TESTS" = true ]; then
  warn "Skipping tests (--skip-tests)"
fi
if [ "$SKIP_TYPECHECK" = true ]; then
  warn "Skipping typecheck (--skip-typecheck)"
fi
if [ "$SKIP_LINT" = true ]; then
  warn "Skipping lint (--skip-lint)"
fi
if [ "$NO_MONITOR" = true ]; then
  info "Skipping workflow monitoring (--no-monitor)"
fi

if [ -n "$VERSION_ARG" ]; then
  NEW_VERSION="$VERSION_ARG"
  # Strip leading 'v' if provided
  NEW_VERSION="${NEW_VERSION#v}"
  validate_semver "$NEW_VERSION"
  if ! version_gt "$NEW_VERSION" "$CURRENT_VERSION"; then
    fail "New version ($NEW_VERSION) must be greater than current version ($CURRENT_VERSION)"
  fi
  info "Setting version to: $NEW_VERSION"
  # Update package.json and manifest.json
  node -e "
    const fs = require('fs');
    const files = ['package.json', 'public/manifest.json'];
    files.forEach(f => {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      data.version = '$NEW_VERSION';
      fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
    });
    console.log('Version set to $NEW_VERSION');
  "
else
  info "Auto-incrementing patch version..."
  node update-version.js
  NEW_VERSION=$(node -p "require('./package.json').version")
fi

if [ "$NEW_VERSION" = "$CURRENT_VERSION" ]; then
  fail "Version didn't change ($NEW_VERSION). Bump failed."
fi

ok "Version: $CURRENT_VERSION → $NEW_VERSION"

# ─── Run validation ─────────────────────────────────────────────────

if [ "$SKIP_TYPECHECK" != true ]; then
  info "Running typecheck..."
  npm run typecheck || fail "Typecheck failed"
else
  warn "Typecheck skipped"
fi

if [ "$SKIP_TESTS" != true ]; then
  info "Running tests..."
  npm run test || fail "Tests failed"
else
  warn "Tests skipped"
fi

if [ "$SKIP_LINT" != true ]; then
  info "Running lint..."
  npm run lint || fail "Lint failed"
else
  warn "Lint skipped"
fi

ok "All checks passed"

# ─── Update CHANGELOG.md ───────────────────────────────────────────

PREV_TAG="v$CURRENT_VERSION"
if git rev-parse "$PREV_TAG" >/dev/null 2>&1; then
  TODAY=$(date +%Y-%m-%d)
  # Generate bullet list from commit messages since last tag
  COMMITS=$(git log --oneline --no-merges "$PREV_TAG..HEAD" --pretty=format:'- %s' 2>/dev/null || true)
  if [ -n "$COMMITS" ]; then
    # Check if CHANGELOG.md exists and has an [Unreleased] section
    if [ -f CHANGELOG.md ]; then
      # Replace [Unreleased] with new version, add new [Unreleased] above it
      COMMITS_FILE=$(mktemp)
      echo "$COMMITS" > "$COMMITS_FILE"
      TEMP=$(mktemp)
      awk -v ver="$NEW_VERSION" -v date="$TODAY" -v cf="$COMMITS_FILE" '
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
      ' CHANGELOG.md > "$TEMP"
      rm -f "$COMMITS_FILE"
      mv "$TEMP" CHANGELOG.md
    fi
    # Update comparison links at bottom of file
    REPO_URL="https://github.com/markvarvel/IW-Auto-Login"
    # Update [Unreleased] link to compare against new version
    sed -i "s|\\[Unreleased\\]: ${REPO_URL}/compare/v[0-9.]*...HEAD|[Unreleased]: ${REPO_URL}/compare/v${NEW_VERSION}...HEAD|g" CHANGELOG.md
    # Add new version comparison link before [Unreleased] link
    sed -i "/\\[Unreleased\\]:/i [${NEW_VERSION}]: ${REPO_URL}/compare/v${CURRENT_VERSION}...v${NEW_VERSION}" CHANGELOG.md
    ok "CHANGELOG.md updated with v$NEW_VERSION entries"
  fi
else
  warn "Previous tag $PREV_TAG not found — skipping CHANGELOG update"
fi

# ─── Commit and tag ─────────────────────────────────────────────────

if [ "$DRY_RUN" = true ]; then
  TAG="v$NEW_VERSION"
  # Files already reverted by DRY_RUN_REVERT trap on exit
  echo ""
  ok "Dry run complete. Would have:"
  echo "  • Committed version bump: $CURRENT_VERSION → $NEW_VERSION"
  echo "  • Created tag: $TAG"
  echo "  • Pushed to origin ($BRANCH)"
  echo "  • Triggered release workflow"
  echo "  • Published: iw-auto-login-$TAG.zip"
  echo "  • Release URL: https://github.com/markvarvel/IW-Auto-Login/releases/tag/$TAG"
  exit 0
fi

info "Committing version bump..."
git add package.json public/manifest.json CHANGELOG.md
git commit -m "Reset version to $NEW_VERSION for release"

TAG="v$NEW_VERSION"
info "Creating tag: $TAG"
git tag -a "$TAG" -m "IW-Auto-Login $TAG"

info "Pushing to origin..."
git push origin "$BRANCH"
git push origin "$TAG"

ok "Tag $TAG pushed to origin"

if [ "$NO_MONITOR" = false ]; then
  # ─── Monitor release workflow ────────────────────────────────────────

  info "Waiting for GitHub Actions release workflow..."
  sleep 2  # Give GitHub a moment to register the push

  RUN_ID=$(gh run list --workflow=release.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)

  if [ -z "$RUN_ID" ]; then
    warn "Could not find release workflow run. Check manually:"
    echo "  gh run list --workflow=release.yml --limit 3"
    exit 0
  fi

  info "Monitoring workflow run: $RUN_ID"
  echo ""

  # Poll until complete (max 5 minutes)
  MAX_WAIT=300
  ELAPSED=0
  INTERVAL=10

  while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(gh run view "$RUN_ID" --json status,conclusion --jq '{status: .status, conclusion: .conclusion}' 2>/dev/null || echo '{"status":"unknown","conclusion":null}')

    CURRENT_STATUS=$(echo "$STATUS" | node -p "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).status))")
    CONCLUSION=$(echo "$STATUS" | node -p "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).conclusion||'null'))")

    if [ "$CURRENT_STATUS" = "completed" ]; then
      echo ""
      if [ "$CONCLUSION" = "success" ]; then
        ok "Release workflow completed successfully!"
        echo ""
        info "Release URL:"
        echo "  https://github.com/markvarvel/IW-Auto-Login/releases/tag/$TAG"
        echo ""

        # Show release assets
        ASSETS=$(gh release view "$TAG" --json assets --jq '.assets[].name' 2>/dev/null || true)
        if [ -n "$ASSETS" ]; then
          info "Release assets:"
          echo "$ASSETS" | while read -r asset; do
            echo "  • $asset"
          done
        fi
      else
        fail "Release workflow failed (conclusion: $CONCLUSION). Check: gh run view $RUN_ID"
      fi
      exit 0
    fi

    printf "\r  ⏳ Workflow status: %-12s (%ds elapsed)" "$CURRENT_STATUS" "$ELAPSED"
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
  done

  echo ""
  warn "Timed out waiting for workflow ($MAX_WAIT seconds)."
  warn "Check manually: gh run view $RUN_ID"
else
  ok "Release pushed. Skipped workflow monitoring (--no-monitor)."
  info "Check the workflow manually:"
  echo "  gh run list --workflow=release.yml --limit 3"
  info "Or view the release:"
  echo "  https://github.com/markvarvel/IW-Auto-Login/releases/tag/$TAG"
fi
