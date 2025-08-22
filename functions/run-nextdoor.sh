#!/bin/sh
set -eu

# -------- config you can tweak --------
# If PROXY_URL_* are set in the env, those will be used as-is.
# Otherwise the script will build them from HOST + PORT (+ optional user/pass).

# Defaults for host/port build (inside Railway private net)
PROXY_HOST_MORNING=${PROXY_HOST_MORNING:-planorailway}
PROXY_HOST_AFTERNOON=${PROXY_HOST_AFTERNOON:-planorailway}
PROXY_PORT=${PROXY_PORT:-8888}

# Headless/browser flags passed through to your app
HEADLESS=${HEADLESS:-1}
USE_CHROME=${USE_CHROME:-0}
export HEADLESS USE_CHROME
# -------------------------------------

SLOT="${1:-morning}"   # morning | afternoon

# ensure we're in functions/
cd "$(dirname "$0")"

# 1) Make a temp profile dir for this run (avoid /data bloat)
unset ND_PROFILE_DIR ND_PROFILE_DIR_MORNING ND_PROFILE_DIR_AFTERNOON
TMPDIR="$(mktemp -d)"

if [ "$SLOT" = "morning" ]; then
  export ND_PROFILE_DIR_MORNING="$TMPDIR"
  export RUN_SLOT="morning"
else
  export ND_PROFILE_DIR_AFTERNOON="$TMPDIR"
  export RUN_SLOT="afternoon"
fi

# 2) Helper: build a proxy URL from components
build_proxy_url() {
  host="$1"
  port="$2"
  u="${PROXY_USER:-}"
  p="${PROXY_PASS:-}"
  if [ -n "$u" ] && [ -n "$p" ]; then
    echo "http://$u:$p@$host:$port"
  else
    echo "http://$host:$port"
  fi
}

# Guard: if someone accidentally put a full URL into PROXY_HOST_*, honor it
if [ "${PROXY_HOST_MORNING#http://}" != "$PROXY_HOST_MORNING" ] || \
   [ "${PROXY_HOST_MORNING#https://}" != "$PROXY_HOST_MORNING" ]; then
  PROXY_URL_MORNING="$PROXY_HOST_MORNING"
  unset PROXY_HOST_MORNING
fi
if [ "${PROXY_HOST_AFTERNOON#http://}" != "$PROXY_HOST_AFTERNOON" ] || \
   [ "${PROXY_HOST_AFTERNOON#https://}" != "$PROXY_HOST_AFTERNOON" ]; then
  PROXY_URL_AFTERNOON="$PROXY_HOST_AFTERNOON"
  unset PROXY_HOST_AFTERNOON
fi

# Compute the effective per-slot URLs (prefer PROXY_URL_* if already set)
if [ "$RUN_SLOT" = "morning" ]; then
  PROXY_URL_MORNING=${PROXY_URL_MORNING:-$(build_proxy_url "${PROXY_HOST_MORNING:-planorailway}" "$PROXY_PORT")}
  export PROXY_URL_MORNING
else
  PROXY_URL_AFTERNOON=${PROXY_URL_AFTERNOON:-$(build_proxy_url "${PROXY_HOST_AFTERNOON:-planorailway}" "$PROXY_PORT")}
  export PROXY_URL_AFTERNOON
fi

# Pretty-print (redact password)
redact() {
  echo "$1" | sed -E 's#://([^:]+):([^@]+)@#://\1:****@#'
}

chosen_url="${PROXY_URL_MORNING:-${PROXY_URL_AFTERNOON:-}}"

echo "🏃 Running Nextdoor automation..."
echo "🕒 Slot: $RUN_SLOT"
echo "📁 Profile dir: $TMPDIR"
echo "🌐 Proxy: $(redact "$chosen_url")"

# 3) Reachability checks
echo "🔎 Checking proxy reachability at $chosen_url ..."

# Strip scheme and creds → host:port
HOST_RAW="$(echo "$chosen_url" \
  | sed -E 's#^[a-zA-Z]+://##' \
  | sed -E 's#^[^@]+@##' \
  | sed 's#/$##')"

PHOST="$(echo "$HOST_RAW" | cut -d: -f1)"
PPORT="$(echo "$HOST_RAW" | cut -d: -f2)"

# TCP check
if nc -z "$PHOST" "$PPORT" >/dev/null 2>&1; then
  echo "✅ TCP reachable ($PHOST:$PPORT)"
else
  echo "❌ Proxy NOT reachable at TCP level ($PHOST:$PPORT)"
fi

# HTTP proxy sanity (use the chosen proxy)
if curl -sS -x "$chosen_url" --connect-timeout 6 -I http://example.com >/dev/null 2>&1; then
  echo "✅ Proxy usable for HTTP requests"
else
  echo "❌ Proxy not usable for HTTP (curl via proxy failed)"
fi

# 4) Run your cron script
npm run nextdoor-cron

# 5) Cleanup (delete temp dir after run finishes)
rm -rf "$TMPDIR" || true
