#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-./venv/bin/python}"
BLACK_BIN="${BLACK_BIN:-./venv/bin/black}"
PRE_COMMIT_BIN="${PRE_COMMIT_BIN:-./venv/bin/pre-commit}"

AGENTCHAT_BASE_URL="${AGENTCHAT_BASE_URL:-https://127.0.0.1:50004}"
AGENTCHAT_BRIDGE_BASE_URL="${AGENTCHAT_BRIDGE_BASE_URL:-http://127.0.0.1:50005}"
AGENTCHAT_RAGLAB_COMPARE_HOOK_URL="${AGENTCHAT_RAGLAB_COMPARE_HOOK_URL:-}"
AGENTCHAT_RAGLAB_COMPARE_HOOK_PATH="${AGENTCHAT_RAGLAB_COMPARE_HOOK_PATH:-/api/rag-lab/compare}"
AGENTCHAT_RAGLAB_COMPARE_HOOK_PROBE="${AGENTCHAT_RAGLAB_COMPARE_HOOK_PROBE:-0}"

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

PROBE_TMP_DIR="$(mktemp -d /tmp/agentchat-qg.XXXXXX)"
cleanup_probe_tmp() {
  rm -rf "$PROBE_TMP_DIR"
}
trap cleanup_probe_tmp EXIT

probe_code_with_retry() {
  local url="$1"
  local attempts="${2:-3}"
  local delay="${3:-1}"
  local code="000"

  for ((i = 1; i <= attempts; i++)); do
    code=$(curl -k -sS --max-time 8 "${AUTH_ARGS[@]}" -o "$PROBE_TMP_DIR/agentchat_probe.out" -w "%{http_code}" "$url" || true)
    [[ "$code" == "200" ]] && break
    sleep "$delay"
  done

  echo "$code"
}

echo "[runtime] probing agent-chat endpoints @ $AGENTCHAT_BASE_URL"
for path in /api/project-controls /api/agents /api/run-logs /api/inbox /workflow-console.html /rag-lab.html; do
  code=$(probe_code_with_retry "${AGENTCHAT_BASE_URL}${path}" 3 1)
  echo "  ${path} -> ${code}"
  [[ "$code" == "200" ]] || { echo "runtime probe failed: ${path} => ${code}" >&2; exit 1; }
done

root_html=$(curl -k -sS --max-time 8 "${AUTH_ARGS[@]}" "${AGENTCHAT_BASE_URL}/")
if [[ "$root_html" != *"Agent Chat Control"* ]] || [[ "$root_html" != *"id=\"root\""* ]]; then
  echo "control tower shell marker check failed: expected root app markers not found" >&2
  exit 1
fi

bundle_path=$(printf '%s' "$root_html" | sed -n 's#.*src="\(/assets/index-[^"]*\.js\)".*#\1#p' | head -n1)
if [[ -z "$bundle_path" ]]; then
  echo "control tower bundle marker check failed: unable to resolve compiled index bundle path" >&2
  exit 1
fi

bundle_js=$(curl -k -sS --max-time 8 "${AUTH_ARGS[@]}" "${AGENTCHAT_BASE_URL}${bundle_path}")
if [[ "$bundle_js" != *"Agent Chat Control Tower"* ]] || [[ "$bundle_js" != *"Workflow"* ]]; then
  echo "control tower bundle marker check failed: expected desktop control tower markers not found" >&2
  exit 1
fi

workflow_html=$(curl -k -sS --max-time 8 "${AUTH_ARGS[@]}" "${AGENTCHAT_BASE_URL}/workflow-console.html")
if [[ "$workflow_html" != *"9 Workflow Patterns"* ]] || [[ "$workflow_html" != *"Save Canvas"* ]]; then
  echo "workflow console marker check failed: expected desktop canvas markers not found" >&2
  exit 1
fi
if [[ "$workflow_html" != *"id=\"canvas\""* ]] || [[ "$workflow_html" != *"workflow-patterns"* ]] || [[ "$workflow_html" != *"orchestration-canvases"* ]]; then
  echo "workflow console integration check failed: expected canvas + core route API hooks not found" >&2
  exit 1
fi

rag_lab_html=$(curl -k -sS --max-time 8 "${AUTH_ARGS[@]}" "${AGENTCHAT_BASE_URL}/rag-lab.html")
if [[ "$rag_lab_html" != *"RAG Lab Console"* ]] || [[ "$rag_lab_html" != *"Comparison Hook"* ]] || [[ "$rag_lab_html" != *"AGENTCHAT_RAGLAB_COMPARE_HOOK_URL"* ]]; then
  echo "rag lab marker check failed: expected experimentation interface markers not found" >&2
  exit 1
fi

resolve_rag_compare_hook_url() {
  if [[ -n "$AGENTCHAT_RAGLAB_COMPARE_HOOK_URL" ]]; then
    printf '%s' "$AGENTCHAT_RAGLAB_COMPARE_HOOK_URL"
    return
  fi

  if [[ "$AGENTCHAT_RAGLAB_COMPARE_HOOK_PATH" =~ ^https?:// ]]; then
    printf '%s' "$AGENTCHAT_RAGLAB_COMPARE_HOOK_PATH"
    return
  fi

  printf '%s%s' "$AGENTCHAT_BASE_URL" "$AGENTCHAT_RAGLAB_COMPARE_HOOK_PATH"
}

if [[ "$AGENTCHAT_RAGLAB_COMPARE_HOOK_PROBE" == "1" || -n "$AGENTCHAT_RAGLAB_COMPARE_HOOK_URL" ]]; then
  rag_compare_url="$(resolve_rag_compare_hook_url)"
  rag_compare_code=$(curl -k -sS --max-time 8 "${AUTH_ARGS[@]}" -o "$PROBE_TMP_DIR/rag_compare_probe.out" -w "%{http_code}" "$rag_compare_url" || echo "000")
  echo "  rag compare hook (${rag_compare_url}) -> ${rag_compare_code}"
  if [[ "$rag_compare_code" == "000" || "$rag_compare_code" == "404" ]]; then
    echo "rag compare hook probe failed: expected reachable configured hook endpoint" >&2
    exit 1
  fi
fi

echo "[runtime] probing bridge endpoints @ $AGENTCHAT_BRIDGE_BASE_URL"
bridge_health=$(curl -sS --max-time 8 -o "$PROBE_TMP_DIR/bridge_health.out" -w "%{http_code}" "${AGENTCHAT_BRIDGE_BASE_URL}/api/ai-bridge/health" || echo "000")
echo "  /api/ai-bridge/health -> ${bridge_health}"
[[ "$bridge_health" == "200" ]] || { echo "bridge health probe failed: ${bridge_health}" >&2; exit 1; }

bridge_callback=$(curl -sS --max-time 8 -o "$PROBE_TMP_DIR/bridge_callback.out" -w "%{http_code}" "${AGENTCHAT_BRIDGE_BASE_URL}/api/ai-bridge/callback?code=test" || echo "000")
echo "  /api/ai-bridge/callback?code=test -> ${bridge_callback} (informational)"

echo "[ok] quality + runtime probes passed"
