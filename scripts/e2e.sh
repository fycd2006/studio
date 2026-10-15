#!/usr/bin/env bash
# E2E 一鍵執行：Firebase emulator + 專用 dev server + Cypress
#
#   ./scripts/e2e.sh                                   跑全部 spec
#   ./scripts/e2e.sh --spec cypress/e2e/plans.cy.ts    只跑一支
#   ./scripts/e2e.sh --open                            開 Cypress GUI
#
# 為什麼要這支而不是 `cypress run`：
#   1. E2E **一律**跑在 Firebase emulator 上，絕不碰真實專案（見 src/firebase/emulator.ts）
#   2. dev server 必須帶著「指向 emulator」+「測試專用帳密」的環境變數啟動；
#      一般的 npm run dev 讀 .env.local，會連到真的 Firebase
#   3. 兩個 server 的啟動順序與健康檢查都得照做，手動跑很容易在「還沒起來」時
#      就開跑，然後把它誤判成功能壞掉
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

PROJECT_ID="${CYPRESS_firebaseProjectId:-camp-plan-studio-test}"
APP_PORT="${E2E_APP_PORT:-3100}"
FIRESTORE_PORT="${E2E_FIRESTORE_PORT:-8080}"
AUTH_PORT="${E2E_AUTH_PORT:-9099}"
EMU_HOST="127.0.0.1"

# 測試帳密：dev server 與 Cypress 必須用同一組，否則 cy.loginAs 會拿到 401，
# 而症狀看起來像「登入功能壞了」。預設值同時寫在 cypress.config.ts。
export STUDIO_ADMIN_USERNAME="${CYPRESS_adminUsername:-e2e-admin}"
export STUDIO_ADMIN_PASSWORD="${CYPRESS_adminPassword:-e2e-admin-pw}"
export STUDIO_CREW_USERNAME="${CYPRESS_crewUsername:-e2e-crew}"
export STUDIO_CREW_PASSWORD="${CYPRESS_crewPassword:-e2e-crew-pw}"

LOG_DIR="${ROOT}/cypress/logs"
mkdir -p "$LOG_DIR"
EMU_LOG="${LOG_DIR}/emulator.log"
DEV_LOG="${LOG_DIR}/dev-server.log"

EMU_PID=""
DEV_PID=""
STARTED_EMU=0

cleanup() {
  local code=$?
  if [[ -n "$DEV_PID" ]]; then kill "$DEV_PID" 2>/dev/null || true; fi
  if [[ "$STARTED_EMU" == "1" && -n "$EMU_PID" ]]; then kill "$EMU_PID" 2>/dev/null || true; fi
  exit $code
}
trap cleanup EXIT INT TERM

wait_for() {
  local name="$1" url="$2" tries="${3:-60}" log="${4:-}"
  for ((i = 1; i <= tries; i++)); do
    if curl -s -o /dev/null --max-time 2 "$url"; then
      echo "✔ ${name} 已就緒（${i}s）"
      return 0
    fi
    sleep 1
  done
  echo "✘ ${name} 在 ${tries} 秒內沒起來：${url}" >&2
  if [[ -n "$log" && -f "$log" ]]; then echo "── ${log} 末 30 行 ──" >&2; tail -30 "$log" >&2; fi
  return 1
}

# ── 1. Firebase emulator（已經在跑就沿用，不重啟別人的）───────────────────
if curl -s -o /dev/null --max-time 2 "http://${EMU_HOST}:${FIRESTORE_PORT}/"; then
  echo "• Firestore emulator 已在 ${EMU_HOST}:${FIRESTORE_PORT}，沿用"
else
  echo "• 啟動 Firebase emulator…"
  npx firebase emulators:start \
    --only "auth,firestore" \
    --project "$PROJECT_ID" \
    > "$EMU_LOG" 2>&1 &
  EMU_PID=$!
  STARTED_EMU=1
  wait_for "Firestore emulator" "http://${EMU_HOST}:${FIRESTORE_PORT}/" 90 "$EMU_LOG"
fi

# ── 2. 專用 dev server ───────────────────────────────────────────────────
# Firebase client SDK 在 initializeFirebase() 要求 apiKey/appId/projectId 都有值
# （src/firebase/index.ts，那支標了 DO NOT MODIFY）。連 emulator 時這些值不會
# 被真的拿去認證，所以給 demo 值即可 —— 但**不能留空**，否則會在 dev 直接 throw。
echo "• 啟動 dev server（port ${APP_PORT}，指向 emulator）…"
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1 \
NEXT_PUBLIC_FIREBASE_EMULATOR_HOST="$EMU_HOST" \
NEXT_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT="$FIRESTORE_PORT" \
NEXT_PUBLIC_FIREBASE_EMULATOR_AUTH_PORT="$AUTH_PORT" \
NEXT_PUBLIC_FIREBASE_API_KEY="demo-e2e-api-key" \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${PROJECT_ID}.firebaseapp.com" \
NEXT_PUBLIC_FIREBASE_PROJECT_ID="$PROJECT_ID" \
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${PROJECT_ID}.firebasestorage.app" \
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="000000000000" \
NEXT_PUBLIC_FIREBASE_APP_ID="1:000000000000:web:e2e0000000000000000000" \
  npx next dev --port "$APP_PORT" > "$DEV_LOG" 2>&1 &
DEV_PID=$!
wait_for "dev server" "http://localhost:${APP_PORT}/login" 120 "$DEV_LOG"

# ── 3. Cypress ──────────────────────────────────────────────────────────
export CYPRESS_BASE_URL="http://localhost:${APP_PORT}"
export CYPRESS_firestoreEmulatorHost="${EMU_HOST}:${FIRESTORE_PORT}"
export CYPRESS_firebaseProjectId="$PROJECT_ID"
export CYPRESS_adminUsername="$STUDIO_ADMIN_USERNAME"
export CYPRESS_adminPassword="$STUDIO_ADMIN_PASSWORD"
export CYPRESS_crewUsername="$STUDIO_CREW_USERNAME"
export CYPRESS_crewPassword="$STUDIO_CREW_PASSWORD"

MODE="run"
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--open" ]]; then MODE="open"; else ARGS+=("$arg"); fi
done

echo "• Cypress ${MODE}…"
if [[ "$MODE" == "open" ]]; then
  npx cypress open --e2e "${ARGS[@]+"${ARGS[@]}"}"
else
  npx cypress run "${ARGS[@]+"${ARGS[@]}"}"
fi
