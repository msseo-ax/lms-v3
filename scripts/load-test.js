import http from "k6/http";
import { check, sleep } from "k6";

// ─── 설정 ───────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "https://lms.homes.global";
const AUTH_COOKIE = __ENV.AUTH_COOKIE || "";

// Supabase SSR 쿠키는 4KB 제한 때문에 청크로 나뉨
// AUTH_COOKIE 값을 3500자씩 나눠서 .0, .1, ... 쿠키로 설정
const COOKIE_NAME = "sb-vmigbadmwxytopfwhkss-auth-token";
const CHUNK_SIZE = 3500;

function buildCookieHeader() {
  if (!AUTH_COOKIE) return "";

  const chunks = [];
  for (let i = 0; i < AUTH_COOKIE.length; i += CHUNK_SIZE) {
    chunks.push(AUTH_COOKIE.substring(i, i + CHUNK_SIZE));
  }

  if (chunks.length === 1) {
    return `${COOKIE_NAME}=${chunks[0]}`;
  }

  return chunks
    .map((chunk, idx) => `${COOKIE_NAME}.${idx}=${chunk}`)
    .join("; ");
}

const COOKIE_HEADER = buildCookieHeader();

// ─── 부하 시나리오 ──────────────────────────────────
//
//   1) ramp-up   : 0 → 100명 (1분)
//   2) sustained : 100명 유지 (3분)
//   3) ramp-down : 100 → 0명 (30초)
//
export const options = {
  stages: [
    { duration: "1m", target: 100 },
    { duration: "3m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"], // 95% 요청이 3초 이내
    http_req_failed: ["rate<0.05"],     // 에러율 5% 미만
  },
};

// ─── 공통 헤더 ──────────────────────────────────────
function getParams() {
  return {
    headers: {
      "Content-Type": "application/json",
      Cookie: COOKIE_HEADER,
    },
  };
}

// ─── 시나리오 ───────────────────────────────────────
export default function () {
  const params = getParams();

  // 1) 콘텐츠 목록 API
  const contentsRes = http.get(`${BASE_URL}/api/contents?take=20`, params);
  check(contentsRes, {
    "GET /api/contents → 200": (r) => r.status === 200,
  });

  // 콘텐츠 ID 추출 (상세 조회용)
  let contentId = null;
  try {
    const body = JSON.parse(contentsRes.body);
    const data = Array.isArray(body) ? body : body.data;
    if (Array.isArray(data) && data.length > 0) {
      // 랜덤 콘텐츠 선택
      contentId = data[Math.floor(Math.random() * data.length)].id;
    }
  } catch (_) {}

  sleep(1);

  // 2) 카테고리 목록 API
  const catRes = http.get(`${BASE_URL}/api/categories`, params);
  check(catRes, {
    "GET /api/categories → 200": (r) => r.status === 200,
  });

  sleep(0.5);

  // 3) 콘텐츠 상세 API
  if (contentId) {
    const detailRes = http.get(
      `${BASE_URL}/api/contents/${contentId}`,
      params
    );
    check(detailRes, {
      "GET /api/contents/:id → 200": (r) => r.status === 200,
    });
  }

  sleep(1);

  // 4) 홈 페이지 (SSR)
  const homeRes = http.get(`${BASE_URL}/`, params);
  check(homeRes, {
    "GET / → OK": (r) => r.status === 200 || r.status === 302,
  });

  sleep(1);

  // 5) 10% 확률로 관리자 대시보드 요청 (헤비 쿼리)
  if (Math.random() < 0.1) {
    const dashRes = http.get(`${BASE_URL}/admin/dashboard`, params);
    check(dashRes, {
      "GET /admin/dashboard → OK": (r) => r.status === 200 || r.status === 302,
    });
  }

  // 실제 사용자 행동 시뮬레이션 (1~3초 대기)
  sleep(Math.random() * 2 + 1);
}
