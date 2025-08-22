#!/usr/bin/env bash
set -euo pipefail

# -------- config you can tweak --------
# Default proxy hosts (can be overridden via env)
: "${PROXY_HOST_MORNING:=planorailway}"
: "${PROXY_HOST_AFTERNOON:=planorailway}"
: "${PROXY_PORT:=8888}"
# -------------------------------------

SLOT="${1:-morning}"   # morning | afternoon

# ensure we're in functions/
cd "$(dirname "$0")"

# 1) Make a temp profile dir for this run (avoid /data bloat)
unset ND_PROFILE_DIR ND_PROFILE_DIR_MORNING ND_PROFILE_DIR_AFTERNOON
TMPDIR="$(mktemp -d)"

if [[ "$SLOT" == "morning" ]]; then
  export ND_PROFILE_DIR_MORNING="$TMPDIR"
  export RUN_SLOT="morning"
else
  export ND_PROFILE_DIR_AFTERNOON="$TMPDIR"
  export RUN_SLOT="afternoon"
fi

# 2) Build a proxy URL automatically if not already provided
build_proxy_url () {
  local host="$1"
  local port="$2"
  local u="${PROXY_USER:-}"
  local p="${PROXY_PASS:-}"
  if [[ -n "$u" && -n "$p" ]]; then
    echo "http://${u}:${p}@${host}:${port}"
  else
    # no auth provided
    echo "http://${host}:${port}"
  fi
}

# Only set the per-slot PROXY_URL_* if caller hasn't set them
if [[ "$RUN_SLOT" == "morning" ]]; then
  : "${PROXY_URL_MORNING:=$(build_proxy_url "$PROXY_HOST_MORNING" "$PROXY_PORT")}"
  export PROXY_URL_MORNING
else
  : "${PROXY_URL_AFTERNOON:=$(build_proxy_url "$PROXY_HOST_AFTERNOON" "$PROXY_PORT")}"
  export PROXY_URL_AFTERNOON
fi

# (Optional) sane defaults if not already set
: "${HEADLESS:=1}"
: "${USE_CHROME:=0}"
export HEADLESS USE_CHROME

# Pretty-print (redact password)
redact () {
  echo "$1" | sed -E 's#://([^:]+):([^@]+)@#://\1:****@#'
}

echo "🏃 Running Nextdoor automation..."
echo "🕒 Slot: $RUN_SLOT"
echo "📁 Profile dir: $TMPDIR"
if [[ "$RUN_SLOT" == "morning" ]]; then
  echo "🌐 Proxy: $(redact "$PROXY_URL_MORNING")"
else
  echo "🌐 Proxy: $(redact "$PROXY_URL_AFTERNOON")"
fi


echo "🔎 Checking proxy reachability at ${PROXY_URL_MORNING:-$PROXY_URL_AFTERNOON} ..."
HOST="${PROXY_URL_MORNING:-$PROXY_URL_AFTERNOON}"
HOST="${HOST#http://}"     # strip scheme
HOST="${HOST%/}"           # strip trailing slash
PHOST="${HOST%%:*}"
PPORT="${HOST##*:}"

if (exec 3<>/dev/tcp/$PHOST/$PPORT) 2>/dev/null; then
  echo "✅ Proxy reachable"
  exec 3>&-
else
  echo "❌ Proxy NOT reachable from app"
fi

# 3) Run your cron script
npm run nextdoor-cron

# 4) Cleanup (delete temp dir after run finishes)
rm -rf "$TMPDIR" || true
