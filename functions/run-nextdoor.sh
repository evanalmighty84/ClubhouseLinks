#!/bin/sh
set -eu

# -------- config you can tweak --------
# If PROXY_URL_* are set, they win. Otherwise we build from HOST + PORT (+ optional auth).
PROXY_HOST_MORNING=${PROXY_HOST_MORNING:-planorailway}
PROXY_HOST_AFTERNOON=${PROXY_HOST_AFTERNOON:-planorailway}
PROXY_PORT=${PROXY_PORT:-8888}

HEADLESS=${HEADLESS:-1}
USE_CHROME=${USE_CHROME:-0}
export HEADLESS USE_CHROME
# -------------------------------------

SLOT="${1:-morning}"   # morning | afternoon

# ensure we're in functions/
cd "$(dirname "$0")"

# 1) Temp profile dir (avoid /data bloat)
unset ND_PROFILE_DIR ND_PROFILE_DIR_MORNING ND_PROFILE_DIR_AFTERNOON
TMPDIR="$(mktemp -d)"
if [ "$SLOT" = "morning" ]; then
  export ND_PROFILE_DIR_MORNING="$TMPDIR"
  export RUN_SLOT="morning"
else
  export ND_PROFILE_DIR_AFTERNOON="$TMPDIR"
  export RUN_SLOT="afternoon"
fi

# Build URL helper (adds auth if provided)
build_proxy_url() {
  host="$1"; port="$2"
  u="${PROXY_USER:-}"; p="${PROXY_PASS:-}"
  if [ -n "$u" ] && [ -n "$p" ]; then
    echo "http://$u:$p@$host:$port"
  else
    echo "http://$host:$port"
  fi
}

# Choose URL for this slot (prefer explicit PROXY_URL_*)
if [ "$RUN_SLOT" = "morning" ]; then
  URL="${PROXY_URL_MORNING:-}"
  HOST="${PROXY_HOST_MORNING:-$PROXY_HOST_MORNING}"
else
  URL="${PROXY_URL_AFTERNOON:-}"
  HOST="${PROXY_HOST_AFTERNOON:-$PROXY_HOST_AFTERNOON}"
fi
PORT="$PROXY_PORT"

# If URL not provided, build it
if [ -z "$URL" ]; then
  URL="$(build_proxy_url "$HOST" "$PORT")"
fi

# Export back so downstream Node code can read it if it expects PROXY_URL_*
if [ "$RUN_SLOT" = "morning" ]; then
  export PROXY_URL_MORNING="$URL"
else
  export PROXY_URL_AFTERNOON="$URL"
fi

# Pretty-print (redact password)
redact() {
  echo "$1" | sed -E 's#://([^:]+):([^@]+)@#://\1:****@#'
}

echo "🏃 Running Nextdoor automation..."
echo "🕒 Slot: $RUN_SLOT"
echo "📁 Profile dir: $TMPDIR"
echo "🌐 Proxy: $(redact "$URL")"

# 2) Reachability checks (favor IPv6 because Railway private DNS is AAAA-only)
echo "🔎 Checking proxy reachability at $(redact "$URL") ..."

# Strip scheme and creds → host:port
HOSTPORT="$(printf %s "$URL" \
  | sed -E 's#^[a-zA-Z]+://##' \
  | sed -E 's#^[^@]+@##' \
  | sed 's#/$##')"

PHOST="${HOSTPORT%%:*}"
PPORT="${HOSTPORT##*:}"
# If there was no colon, PPORT would equal PHOST; fix that by falling back to $PORT
if [ "$PPORT" = "$PHOST" ]; then
  PPORT="$PORT"
fi

# TCP probe (force IPv6)
if nc -6 -z "$PHOST" "$PPORT" >/dev/null 2>&1; then
  echo "✅ TCP reachable ($PHOST:$PPORT over IPv6)"
else
  echo "❌ Proxy NOT reachable at TCP level ($PHOST:$PPORT)"
fi

# HTTP proxy sanity (force IPv6 path)
if curl -6 -sS -x "$URL" --connect-timeout 8 -I http://example.com >/dev/null 2>&1; then
  echo "✅ Proxy usable for HTTP requests"
else
  echo "❌ Proxy not usable for HTTP (curl via proxy failed)"
fi

# 3) Run your cron script
npm run nextdoor-cron

# 4) Cleanup
rm -rf "$TMPDIR" || true
