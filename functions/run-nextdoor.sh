#!/bin/sh
set -eu

# ===== URL-only config =====
# Set these in Railway:
#   PROXY_URL_MORNING = http://planorailway:8888
#   PROXY_URL_AFTERNOON = http://planorailway:8888
# (Optional) If you set PROXY_USER and PROXY_PASS, we'll inject them into the URL if not present.

DEFAULT_PROXY_URL="http://planorailway:8888"

HEADLESS=${HEADLESS:-1}
USE_CHROME=${USE_CHROME:-0}
export HEADLESS USE_CHROME
# ===========================

SLOT="${1:-morning}"   # morning | afternoon

# Run from this script's directory
cd "$(dirname "$0")"

# Temp profile dir to avoid /data bloat
unset ND_PROFILE_DIR ND_PROFILE_DIR_MORNING ND_PROFILE_DIR_AFTERNOON
TMPDIR="$(mktemp -d)"
if [ "$SLOT" = "morning" ]; then
  export ND_PROFILE_DIR_MORNING="$TMPDIR"
  export RUN_SLOT="morning"
else
  export ND_PROFILE_DIR_AFTERNOON="$TMPDIR"
  export RUN_SLOT="afternoon"
fi

# Choose URL for slot (fall back to DEFAULT_PROXY_URL)
if [ "$RUN_SLOT" = "morning" ]; then
  URL="${PROXY_URL_MORNING:-$DEFAULT_PROXY_URL}"
else
  URL="${PROXY_URL_AFTERNOON:-$DEFAULT_PROXY_URL}"
fi

# If PROXY_USER/PASS provided and URL has no creds, inject them
if [ -n "${PROXY_USER:-}" ] && [ -n "${PROXY_PASS:-}" ] && ! printf %s "$URL" | grep -q '@'; then
  scheme="$(printf %s "$URL" | sed -E 's#^([a-zA-Z]+)://.*#\1#')"
  rest="$(printf %s "$URL"   | sed -E 's#^[a-zA-Z]+://##')"
  URL="${scheme}://${PROXY_USER}:${PROXY_PASS}@${rest}"
fi

# Export effective URL back out in case the Node code reads it
if [ "$RUN_SLOT" = "morning" ]; then
  export PROXY_URL_MORNING="$URL"
else
  export PROXY_URL_AFTERNOON="$URL"
fi

# Redact creds for logging
redact() { echo "$1" | sed -E 's#://([^:]+):([^@]+)@#://\1:****@#'; }

echo "🏃 Running Nextdoor automation..."
echo "🕒 Slot: $RUN_SLOT"
echo "📁 Profile dir: $TMPDIR"
echo "🌐 Proxy: $(redact "$URL")"

# ---- Reachability checks (favor IPv6) ----
echo "🔎 Checking proxy reachability at $(redact "$URL") ..."

# Strip scheme & creds -> host:port
HOSTPORT="$(printf %s "$URL" \
  | sed -E 's#^[a-zA-Z]+://##' \
  | sed -E 's#^[^@]+@##' \
  | sed 's#/$##')"

PHOST="${HOSTPORT%%:*}"
PPORT="${HOSTPORT##*:}"
# If no explicit port, assume 8888
[ "$PPORT" = "$PHOST" ] && PPORT="8888"

# TCP probe (force IPv6 path since Railway private DNS is AAAA-only)
if nc -6 -z "$PHOST" "$PPORT" >/dev/null 2>&1; then
  echo "✅ TCP reachable ($PHOST:$PPORT over IPv6)"
else
  echo "❌ Proxy NOT reachable at TCP level ($PHOST:$PPORT)"
fi

# HTTP proxy sanity check
if curl -6 -sS -x "$URL" --connect-timeout 8 -I http://example.com >/dev/null 2>&1; then
  echo "✅ Proxy usable for HTTP requests"
else
  echo "❌ Proxy not usable for HTTP (curl via proxy failed)"
fi
# ------------------------------------------

# Run your cron task
npm run nextdoor-cron

# Cleanup
rm -rf "$TMPDIR" || true
