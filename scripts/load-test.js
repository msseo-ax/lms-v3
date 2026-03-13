import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

// ─── 설정 ───────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "https://lms.homes.global";
const AUTH_COOKIE = __ENV.AUTH_COOKIE || "";

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
      Cookie: AUTH_COOKIE,
    },
  };
}

// ─── 시나리오 ───────────────────────────────────────
//
// 실제 사용자 행동을 시뮬레이션:
//   1. 홈 피드 (콘텐츠 목록) 조회
//   2. 카테고리 목록 조회
//   3. 콘텐츠 상세 조회
//   4. 관리자 대시보드 (일부 사용자)
//
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
    const data = JSON.parse(contentsRes.body);
    if (Array.isArray(data.data) && data.data.length > 0) {
      contentId = data.data[0].id;
    } else if (Array.isArray(data) && data.length > 0) {
      contentId = data[0].id;
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
    const detailRes = http.get(`${BASE_URL}/api/contents/${contentId}`, params);
    check(detailRes, {
      "GET /api/contents/:id → 200": (r) => r.status === 200,
    });
  }

  sleep(1);

  // 4) 홈 페이지 (SSR)
  const homeRes = http.get(`${BASE_URL}/`, params);
  check(homeRes, {
    "GET / → 200 or redirect": (r) => r.status === 200 || r.status === 302,
  });

  sleep(1);

  // 5) 10% 확률로 관리자 대시보드 요청
  if (Math.random() < 0.1) {
    const dashRes = http.get(`${BASE_URL}/admin/dashboard`, params);
    check(dashRes, {
      "GET /admin/dashboard → 200 or redirect": (r) =>
        r.status === 200 || r.status === 302,
    });
  }

  sleep(Math.random() * 2 + 1); // 1~3초 랜덤 대기 (실제 사용자 행동 시뮬레이션)
}
