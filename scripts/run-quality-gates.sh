#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-./venv/bin/python}"
BLACK_BIN="${BLACK_BIN:-./venv/bin/black}"
PRE_COMMIT_BIN="${PRE_COMMIT_BIN:-./venv/bin/pre-commit}"

AGENTCHAT_BASE_URL="${AGENTCHAT_BASE_URL:-https://127.0.0.1:50004}"
AGENTCHAT_BRIDGE_BASE_URL="${AGENTCHAT_BRIDGE_BASE_URL:-http://127.0.0.1:50005}"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env
fi

AUTH_USER="${AGENTCHAT_BASIC_AUTH_USER:-}"
AUTH_PASS="${AGENTCHAT_BASIC_AUTH_PASS:-}"
AUTH_ARGS=()
if [[ -n "$AUTH_USER" && -n "$AUTH_PASS" ]]; then
  AUTH_ARGS=(-u "${AUTH_USER}:${AUTH_PASS}")
fi

echo "[quality] black --check backend"
"$BLACK_BIN" --check backend

echo "[quality] pre-commit --all-files"
"$PRE_COMMIT_BIN" run --all-files

echo "[quality] pytest -q"
"$PYTHON_BIN" -m pytest -q

probe_code_with_retry() {
  local url="$1"
  local attempts="${2:-3}"
  local delay="${3:-1}"
  local code="000"

  for ((i = 1; i <= attempts; i++)); do
    code=$(curl -k -sS --max-time 8 "${AUTH_ARGS[@]}" -o /tmp/agentchat_probe.out -w "%{http_code}" "$url" || true)
    [[ "$code" == "200" ]] && break
    sleep "$delay"
  done

  echo "$code"
}

echo "[runtime] probing agent-chat endpoints @ $AGENTCHAT_BASE_URL"
for path in /api/project-controls /api/agents /api/run-logs /api/inbox /workflow-console.html; do
  code=$(probe_code_with_retry "${AGENTCHAT_BASE_URL}${path}" 3 1)
  echo "  ${path} -> ${code}"
  [[ "$code" == "200" ]] || { echo "runtime probe failed: ${path} => ${code}" >&2; exit 1; }
done

echo "[runtime] probing bridge endpoints @ $AGENTCHAT_BRIDGE_BASE_URL"
bridge_health=$(curl -sS --max-time 8 -o /tmp/bridge_health.out -w "%{http_code}" "${AGENTCHAT_BRIDGE_BASE_URL}/api/ai-bridge/health" || echo "000")
echo "  /api/ai-bridge/health -> ${bridge_health}"
[[ "$bridge_health" == "200" ]] || { echo "bridge health probe failed: ${bridge_health}" >&2; exit 1; }

bridge_callback=$(curl -sS --max-time 8 -o /tmp/bridge_callback.out -w "%{http_code}" "${AGENTCHAT_BRIDGE_BASE_URL}/api/ai-bridge/callback?code=test" || echo "000")
echo "  /api/ai-bridge/callback?code=test -> ${bridge_callback} (informational)"

echo "[ok] quality + runtime probes passed"
