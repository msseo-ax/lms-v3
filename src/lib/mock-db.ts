import type {
  User, Division, Category, Content,
  ContentFile, ContentTarget, ReadLog, FileAccessLog,
} from "@/types/domain";

export const divisions: Division[] = [
  { id: "div-1", name: "경영본부" },
  { id: "div-2", name: "사업본부" },
  { id: "div-3", name: "기술본부" },
];

export const users: User[] = [
  { id: "user-admin", email: "admin@homes.global", name: "관리자", role: "admin", divisionId: "div-1", avatarUrl: null },
  { id: "user-1", email: "kim@homes.global", name: "김서연", role: "user", divisionId: "div-2", avatarUrl: null },
  { id: "user-2", email: "park@homes.global", name: "박준호", role: "user", divisionId: "div-3", avatarUrl: null },
  { id: "user-3", email: "lee@homes.global", name: "이지은", role: "user", divisionId: "div-2", avatarUrl: null },
  { id: "user-4", email: "choi@homes.global", name: "최민수", role: "user", divisionId: "div-3", avatarUrl: null },
  { id: "user-5", email: "jung@homes.global", name: "정하나", role: "user", divisionId: "div-1", avatarUrl: null },
];

export const categories: Category[] = [
  { id: "cat-1", name: "사내 비전/문화", slug: "vision-culture", sortOrder: 1 },
  { id: "cat-2", name: "업무 매뉴얼", slug: "work-manual", sortOrder: 2 },
  { id: "cat-3", name: "정책/규정", slug: "policy", sortOrder: 3 },
  { id: "cat-4", name: "시장 리서치/인사이트", slug: "market-insight", sortOrder: 4 },
  { id: "cat-5", name: "온보딩", slug: "onboarding", sortOrder: 5 },
  { id: "cat-6", name: "공지사항", slug: "notice", sortOrder: 6 },
];

export const contents: Content[] = [
  {
    id: "content-1",
    title: "2026 HOMES 비전 및 미션 스테이트먼트",
    body: "<p>HOMES의 2026년 비전과 미션을 공유합니다. 우리는 글로벌 부동산 시장에서 기술 혁신을 통해 새로운 가치를 창출하고, 모든 사람이 더 나은 주거 환경을 누릴 수 있도록 노력합니다.</p><p>이번 비전 스테이트먼트에서는 세 가지 핵심 전략을 중심으로 향후 방향성을 설명합니다.</p>",
    summary: "HOMES 2026년 비전과 미션을 담은 문서입니다. 글로벌 부동산 기술 혁신, 주거 환경 개선, 세 가지 핵심 전략을 다룹니다.",
    summaryType: "ai",
    categoryId: "cat-1",
    createdBy: "user-admin",
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "content-2",
    title: "자산관리 프로세스 v2.0",
    body: "<p>자산관리 프로세스가 v2.0으로 업데이트되었습니다. 주요 변경사항은 다음과 같습니다:</p><ul><li>승인 프로세스 간소화</li><li>디지털 서명 도입</li><li>실시간 현황 대시보드 추가</li></ul>",
    summary: "자산관리 프로세스 v2.0 주요 변경사항: 승인 간소화, 디지털 서명, 실시간 대시보드 추가.",
    summaryType: "manual",
    categoryId: "cat-2",
    createdBy: "user-admin",
    createdAt: "2026-03-03T10:00:00Z",
    updatedAt: "2026-03-03T10:00:00Z",
  },
  {
    id: "content-3",
    title: "2026 Q1 시장 동향 리포트",
    body: "<p>2026년 1분기 글로벌 부동산 시장 동향을 분석한 리포트입니다. AI 기반 프롭테크 시장이 급성장하고 있으며, 특히 아시아 시장에서의 성장이 두드러집니다.</p>",
    summary: "2026 Q1 글로벌 부동산 시장 동향: AI 프롭테크 급성장, 아시아 시장 성장 두드러짐.",
    summaryType: "ai",
    categoryId: "cat-4",
    createdBy: "user-admin",
    createdAt: "2026-03-05T14:00:00Z",
    updatedAt: "2026-03-05T14:00:00Z",
  },
  {
    id: "content-4",
    title: "신규 입사자 온보딩 가이드 2026",
    body: "<p>HOMES에 오신 것을 환영합니다! 이 가이드에서는 입사 첫 주에 알아야 할 모든 정보를 제공합니다.</p><p>회사 소개, 팀 구성, 업무 도구 설정, 복리후생 안내 등이 포함됩니다.</p>",
    summary: "신규 입사자를 위한 종합 온보딩 가이드. 회사 소개, 팀 구성, 업무 도구, 복리후생 안내를 포함합니다.",
    summaryType: "manual",
    categoryId: "cat-5",
    createdBy: "user-admin",
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "content-5",
    title: "재택근무 정책 업데이트",
    body: "<p>2026년 3월부터 적용되는 재택근무 정책 업데이트 사항을 안내드립니다.</p><p>주 2일 재택근무가 기본으로 제공되며, 팀 리더 승인 하에 추가 재택이 가능합니다.</p>",
    summary: "재택근무 정책 변경: 주 2일 기본 재택, 팀 리더 승인 시 추가 가능.",
    summaryType: "ai",
    categoryId: "cat-3",
    createdBy: "user-admin",
    createdAt: "2026-03-06T11:00:00Z",
    updatedAt: "2026-03-06T11:00:00Z",
  },
  {
    id: "content-6",
    title: "NotebookLM 활용 가이드 — AI로 회의록 자동 정리",
    body: "<p>NotebookLM을 활용하여 회의록을 자동으로 정리하는 방법을 소개합니다. AI가 회의 내용을 요약하고, 액션 아이템을 추출합니다.</p>",
    summary: "NotebookLM으로 회의록 자동 정리하는 방법. AI 요약 및 액션 아이템 추출 포함.",
    summaryType: "ai",
    categoryId: "cat-2",
    createdBy: "user-admin",
    createdAt: "2026-03-07T16:00:00Z",
    updatedAt: "2026-03-07T16:00:00Z",
  },
];

export const contentFiles: ContentFile[] = [
  { id: "file-1", contentId: "content-1", fileUrl: "/mock/vision-2026.pdf", fileType: "pdf", fileName: "HOMES_Vision_2026.pdf", fileSize: 2450000 },
  { id: "file-2", contentId: "content-1", fileUrl: "/mock/vision-video.mp4", fileType: "mp4", fileName: "비전발표_영상.mp4", fileSize: 85000000 },
  { id: "file-3", contentId: "content-2", fileUrl: "/mock/asset-process.pdf", fileType: "pdf", fileName: "자산관리_프로세스_v2.pdf", fileSize: 1200000 },
  { id: "file-4", contentId: "content-2", fileUrl: "/mock/asset-checklist.docx", fileType: "docx", fileName: "체크리스트.docx", fileSize: 350000 },
  { id: "file-5", contentId: "content-2", fileUrl: "/mock/process-diagram.png", fileType: "image", fileName: "프로세스_다이어그램.png", fileSize: 580000 },
  { id: "file-6", contentId: "content-3", fileUrl: "/mock/q1-report.pdf", fileType: "pdf", fileName: "Q1_시장동향_리포트.pdf", fileSize: 3200000 },
  { id: "file-7", contentId: "content-4", fileUrl: "/mock/onboarding-guide.pdf", fileType: "pdf", fileName: "온보딩_가이드_2026.pdf", fileSize: 4500000 },
  { id: "file-8", contentId: "content-6", fileUrl: "https://notebooklm.google.com", fileType: "link", fileName: "NotebookLM", fileSize: 0 },
];

export const contentTargets: ContentTarget[] = [
  { id: "target-1", contentId: "content-1", targetType: "all", targetId: null },
  { id: "target-2", contentId: "content-2", targetType: "division", targetId: "div-2" },
  { id: "target-4", contentId: "content-3", targetType: "division", targetId: "div-2" },
  { id: "target-5", contentId: "content-4", targetType: "all", targetId: null },
  { id: "target-6", contentId: "content-5", targetType: "all", targetId: null },
  { id: "target-7", contentId: "content-6", targetType: "all", targetId: null },
];

export const readLogs: ReadLog[] = [
  { id: "log-1", contentId: "content-1", userId: "user-1", readAt: "2026-03-02T10:30:00Z", durationSeconds: 240 },
  { id: "log-2", contentId: "content-1", userId: "user-2", readAt: "2026-03-02T11:00:00Z", durationSeconds: 180 },
  { id: "log-3", contentId: "content-4", userId: "user-1", readAt: "2026-02-16T09:00:00Z", durationSeconds: 600 },
  { id: "log-4", contentId: "content-5", userId: "user-1", readAt: "2026-03-07T08:00:00Z", durationSeconds: 120 },
  { id: "log-5", contentId: "content-5", userId: "user-3", readAt: "2026-03-07T09:30:00Z", durationSeconds: 90 },
];

export const fileAccessLogs: FileAccessLog[] = [
  { id: "flog-1", contentFileId: "file-1", userId: "user-1", accessedAt: "2026-03-02T10:32:00Z" },
  { id: "flog-2", contentFileId: "file-2", userId: "user-1", accessedAt: "2026-03-02T10:35:00Z" },
];

export function getMockCurrentUser(): User {
  return users[0];
}

export function isContentTargetedForUser(contentId: string, user: User): boolean {
  const targets = contentTargets.filter((t) => t.contentId === contentId);
  if (targets.length === 0) return false;
  if (targets.some((t) => t.targetType === "all")) return true;
  if (user.divisionId && targets.some((t) => t.targetType === "division" && t.targetId === user.divisionId)) return true;
  if (targets.some((t) => t.targetType === "user" && t.targetId === user.id)) return true;
  return false;
}

export function getTargetLabels(contentId: string): string[] {
  const targets = contentTargets.filter((t) => t.contentId === contentId);
  return targets.map((t) => {
    if (t.targetType === "all") return "전체";
    if (t.targetType === "division") return divisions.find((d) => d.id === t.targetId)?.name ?? "본부";
    if (t.targetType === "user") return users.find((u) => u.id === t.targetId)?.name ?? "개인";
    return "";
  });
}

export function isContentRead(contentId: string, userId: string): boolean {
  return readLogs.some((l) => l.contentId === contentId && l.userId === userId);
}

export function getContentReadRate(contentId: string): number {
  const targets = contentTargets.filter((t) => t.contentId === contentId);
  let targetUserIds: string[];

  if (targets.some((t) => t.targetType === "all")) {
    targetUserIds = users.map((u) => u.id);
  } else {
    const set = new Set<string>();
    for (const t of targets) {
      if (t.targetType === "division") {
        users.filter((u) => u.divisionId === t.targetId).forEach((u) => set.add(u.id));
      } else if (t.targetType === "user" && t.targetId) {
        set.add(t.targetId);
      }
    }
    targetUserIds = Array.from(set);
  }

  if (targetUserIds.length === 0) return 0;
  const readCount = targetUserIds.filter((uid) => readLogs.some((l) => l.contentId === contentId && l.userId === uid)).length;
  return Math.round((readCount / targetUserIds.length) * 100);
}
