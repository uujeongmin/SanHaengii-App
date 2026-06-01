#!/usr/bin/env node
/**
 * sync-watch-user-id.js
 *
 * Railway 백엔드의 /auth/me 를 호출해 users.id 를 가져오고,
 * 워치 앱(SanHaengii-Wear-main)의 local.properties 를 자동 업데이트합니다.
 *
 * 사용법:
 *   npm run sync-watch -- <JWT_TOKEN>
 *   node scripts/sync-watch-user-id.js <JWT_TOKEN>
 *
 * JWT 토큰 확인 방법:
 *   1. 모바일 앱 로그인 후 Metro 콘솔에 출력되는 "[Auth] user.id=N token=..." 확인
 *   2. 또는 node -e "..." 로 직접 로그인 응답 확인
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const AUTH_API_BASE_URL = "https://web-production-94f63.up.railway.app";
const WATCH_LOCAL_PROPS = path.resolve(
  __dirname,
  "../../SanHaengii-Wear-main/local.properties"
);

// ─── JWT 토큰 획득 (인자 또는 stdin 입력) ─────────────────────────────────

async function getToken() {
  const arg = process.argv[2];
  if (arg && arg.trim().length > 0) {
    return arg.trim();
  }

  // 인자 없으면 stdin으로 입력 받기
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("JWT 토큰을 입력하세요: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── /auth/me 호출 → users.id 획득 ──────────────────────────────────────

async function fetchUserId(token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${AUTH_API_BASE_URL}/auth/me`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`서버 응답 오류 (${res.statusCode}): ${body}`));
        }
        try {
          const data = JSON.parse(body);
          // 응답 구조: {user: {..., id: N}} 또는 {id: N}
          const user = data.user ?? data;
          const id = user.id;
          if (!id || typeof id !== "number") {
            return reject(new Error(`users.id 를 파싱하지 못했습니다: ${body}`));
          }
          resolve({ id, name: user.name ?? user.nickname ?? "" });
        } catch (e) {
          reject(new Error(`JSON 파싱 실패: ${body}`));
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.end();
  });
}

// ─── local.properties 업데이트 ───────────────────────────────────────────

function updateLocalProperties(userId, token) {
  if (!fs.existsSync(WATCH_LOCAL_PROPS)) {
    console.error(`❌ 파일을 찾지 못했습니다: ${WATCH_LOCAL_PROPS}`);
    console.error("   SanHaengii-Wear-main 폴더가 같은 workspace 아래에 있는지 확인하세요.");
    process.exit(1);
  }

  const raw = fs.readFileSync(WATCH_LOCAL_PROPS, "utf8");
  const lines = raw.split("\n");

  const updated = lines.map((line) => {
    if (/^HEALTH_API_USER_ID\s*=/.test(line)) return `HEALTH_API_USER_ID=${userId}`;
    if (/^HEALTH_API_TOKEN\s*=/.test(line))   return `HEALTH_API_TOKEN=${token}`;
    return line;
  });

  // 항목이 아예 없는 경우 끝에 추가
  if (!lines.some((l) => /^HEALTH_API_USER_ID\s*=/.test(l))) {
    updated.push(`HEALTH_API_USER_ID=${userId}`);
  }
  if (!lines.some((l) => /^HEALTH_API_TOKEN\s*=/.test(l))) {
    updated.push(`HEALTH_API_TOKEN=${token}`);
  }

  fs.writeFileSync(WATCH_LOCAL_PROPS, updated.join("\n"), "utf8");
}

// ─── main ────────────────────────────────────────────────────────────────

(async () => {
  console.log("🔄  워치 user_id 동기화 시작...\n");

  const token = await getToken();
  if (!token) {
    console.error("❌  토큰이 비어있습니다. 로그인 후 JWT 토큰을 입력하세요.");
    process.exit(1);
  }

  let user;
  try {
    process.stdout.write("📡  /auth/me 호출 중... ");
    user = await fetchUserId(token);
    console.log("✅");
  } catch (e) {
    console.log("❌");
    console.error(`오류: ${e.message}`);
    process.exit(1);
  }

  updateLocalProperties(user.id, token);

  console.log(`\n✅  local.properties 업데이트 완료`);
  console.log(`   HEALTH_API_USER_ID = ${user.id}${user.name ? ` (${user.name})` : ""}`);
  console.log(`   HEALTH_API_TOKEN   = ...${token.slice(-8)}`);
  console.log(`\n📋  다음 단계:`);
  console.log(`   1. Android Studio에서 워치 앱을 Rebuild (또는 'Sync Project with Gradle')`);
  console.log(`   2. 워치 앱을 에뮬레이터/실기기에 재설치`);
  console.log(`   3. 이제 모바일(user_id=${user.id})과 워치가 같은 계정으로 동기화됩니다.\n`);
})();
