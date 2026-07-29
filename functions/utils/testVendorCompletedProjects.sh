#!/usr/bin/env bash

set -euo pipefail

API_BASE="https://crm-function-app-5d4de511071d.herokuapp.com/server/resident_function/api"

RESIDENT_ID=241
VENDOR_ID=35

SCRIPT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")" &&
  pwd
)"

create_project() {
  local category="$1"
  local image_path="$2"

  if [[ ! -f "$image_path" ]]; then
    echo "❌ Image not found: $image_path"
    exit 1
  fi

  local mime_type
  mime_type="$(
    file --brief --mime-type "$image_path"
  )"

  case "$mime_type" in
    image/jpeg|image/png|image/webp)
      ;;
    *)
      echo "❌ Unsupported image type: $mime_type"
      echo "Image: $image_path"
      exit 1
      ;;
  esac

  local payload_file
  payload_file="$(mktemp)"

  python3 - \
    "$image_path" \
    "$payload_file" \
    "$mime_type" \
    "$RESIDENT_ID" \
    "$VENDOR_ID" \
    "$category" <<'PY'
import base64
import json
import pathlib
import sys

image_path = pathlib.Path(sys.argv[1])
payload_path = pathlib.Path(sys.argv[2])
mime_type = sys.argv[3]
resident_id = int(sys.argv[4])
vendor_id = int(sys.argv[5])
category = sys.argv[6]

encoded_image = base64.b64encode(
    image_path.read_bytes()
).decode("ascii")

payload = {
    "resident_id": resident_id,
    "vendor_id": vendor_id,
    "category": category,
    "image_base64": (
        f"data:{mime_type};base64,{encoded_image}"
    ),
}

payload_path.write_text(
    json.dumps(payload),
    encoding="utf-8",
)
PY

  echo
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Creating project: $category"
  echo "Resident: $RESIDENT_ID"
  echo "Vendor: $VENDOR_ID"
  echo "Image: $(basename "$image_path")"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local response

  response="$(
    curl -sS -X POST \
      "$API_BASE/residents/completed-projects" \
      -H "Content-Type: application/json" \
      --data-binary "@$payload_file"
  )"

  rm -f "$payload_file"

  echo "$response" |
    python3 -m json.tool

  local success
  success="$(
    printf '%s' "$response" |
      python3 -c '
import json
import sys

result = json.load(sys.stdin)
print("true" if result.get("success") else "false")
'
  )"

  if [[ "$success" != "true" ]]; then
    echo
    echo "❌ Project submission failed: $category"
    exit 1
  fi

  local approval_status
  approval_status="$(
    printf '%s' "$response" |
      python3 -c '
import json
import sys

result = json.load(sys.stdin)
print(
    result.get("photoApprovalStatus")
    or result.get("project", {}).get("approval_status")
    or "unknown"
)
'
  )"

  echo
  echo "✅ Project saved with status: $approval_status"
}

create_project \
  "Front Yard Landscaping" \
  "$SCRIPT_DIR/landscaping.jpeg"

create_project \
  "Backyard Landscaping" \
  "$SCRIPT_DIR/landscaping1.jpeg"

create_project \
  "Tree Trimming" \
  "$SCRIPT_DIR/landscaping2.jpeg"

echo
echo "✅ Finished creating all three completed projects."