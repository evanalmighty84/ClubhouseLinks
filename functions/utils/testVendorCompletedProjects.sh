#!/usr/bin/env bash

set -euo pipefail

API_BASE="https://crm-function-app-5d4de511071d.herokuapp.com/server/resident_function/api"

RESIDENT_ID=241
VENDOR_ID=35

TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

create_project() {
  local seed="$1"
  local category="$2"
  local image_file="$TEMP_DIR/${seed}.jpg"
  local payload_file="$TEMP_DIR/${seed}.json"

  echo
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Creating project: $category"
  echo "Resident: $RESIDENT_ID"
  echo "Vendor: $VENDOR_ID"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  curl -L -sS \
    "https://picsum.photos/seed/${seed}/1200/800" \
    -o "$image_file"

  python3 - \
    "$image_file" \
    "$payload_file" \
    "$RESIDENT_ID" \
    "$VENDOR_ID" \
    "$category" <<'PY'
import base64
import json
import pathlib
import sys

image_path = pathlib.Path(sys.argv[1])
payload_path = pathlib.Path(sys.argv[2])
resident_id = int(sys.argv[3])
vendor_id = int(sys.argv[4])
category = sys.argv[5]

image_base64 = base64.b64encode(
    image_path.read_bytes()
).decode("ascii")

payload = {
    "resident_id": resident_id,
    "vendor_id": vendor_id,
    "category": category,
    "image_base64": (
        "data:image/jpeg;base64,"
        + image_base64
    ),
}

payload_path.write_text(
    json.dumps(payload),
    encoding="utf-8",
)
PY

  curl -sS -X POST \
    "$API_BASE/residents/completed-projects" \
    -H "Content-Type: application/json" \
    --data-binary "@$payload_file" |
    python3 -m json.tool
}

create_project \
  "aspen-demo-front-yard" \
  "Front Yard Landscaping"

create_project \
  "aspen-demo-backyard" \
  "Backyard Landscaping"

create_project \
  "aspen-demo-tree-trimming" \
  "Tree Trimming"

echo
echo "✅ Finished creating dummy completed projects."