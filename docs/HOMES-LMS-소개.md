# HOMES LMS v3 프로젝트 소개서

## 1. 개요
HOMES LMS는 사내 학습 콘텐츠를 효율적으로 배포하고 구성원의 열람 상태를 체계적으로 관리하기 위한 학습 관리 시스템입니다. 텍스트, 문서, 영상 등 다양한 형태의 지식 자산을 한곳에 모아 관리하며, 데이터 기반의 학습 추적을 통해 조직 내 지식 공유 현황을 실시간으로 파악할 수 있습니다.

이 시스템은 단순한 콘텐츠 저장소를 넘어, 조직의 성장을 지원하는 핵심 도구로 설계되었습니다. 본부나 팀, 개인별로 최적화된 콘텐츠를 타겟팅하여 전달하고, Slack 연동을 통한 자동 리마인더 기능으로 구성원의 참여를 자연스럽게 유도하여 사내 교육의 실효성을 높입니다.

## 2. 주요 기능
| 기능 분류 | 상세 내용 |
|-----------|-----------|
| 인증 및 보안 | Google OAuth (@homes.global 전용) 연동으로 안전한 사내 계정 로그인 |
| 학습 피드 | 개인별 배정 콘텐츠 목록 확인, 카테고리 및 열람 여부 필터링 |
| 콘텐츠 상세 | 본문 리치 텍스트, 첨부파일(PDF, DOCX, MP4, 이미지, 링크) |
| 마이페이지 | 개인별 열람 통계 및 미열람 콘텐츠 목록 관리 |
| 관리자 대시보드 | 전체 열람률 현황, 콘텐츠별 상세 통계, 미열람자 대상 알림 발송 |
| 콘텐츠 관리 | 리치 에디터를 활용한 콘텐츠 작성, S3 기반 파일 업로드 및 관리 |
| 타겟팅 설정 | 전체, 본부, 팀, 개인 단위의 정교한 콘텐츠 노출 제어 |
| Slack 연동 | 미열람 인원 대상 Slack 리마인더 자동/수동 발송 |

## 3. 사용 가이드

### 일반 사용자
1. **로그인**: @homes.global 구글 계정으로 로그인합니다.
2. **홈 피드**: 나에게 배정된 최신 학습 콘텐츠를 확인합니다. 필터를 사용하여 필요한 카테고리나 미열람 항목만 골라볼 수 있습니다.
3. **콘텐츠 열람**: 제목을 클릭하여 상세 내용을 확인합니다. 첨부된 문서나 영상을 시청하면 열람 기록이 자동으로 저장됩니다.
4. **마이페이지**: 내가 읽은 콘텐츠 수와 아직 읽지 않은 항목을 확인하여 학습 진도를 관리합니다.

### 관리자
1. **권한 부여**: `ADMIN_EMAILS` 환경변수에 관리자 이메일을 추가한 뒤 재로그인하면 관리자 메뉴가 활성화됩니다.
2. **콘텐츠 작성**: 관리자 페이지의 '콘텐츠 관리' 메뉴에서 새 글을 작성합니다. 대상 지정 옵션에서 노출 범위를 설정할 수 있습니다.
3. **대시보드 확인**: 전체 구성원의 학습 참여도를 그래프와 표로 확인합니다.
4. **리마인더 발송**: 특정 콘텐츠를 아직 읽지 않은 인원에게 Slack 메시지를 발송하여 학습을 독려합니다.

## 4. 시스템 아키텍처

### 기술 스택
- **Framework**: Next.js 14 (App Router), TypeScript
- **Database**: Prisma ORM, PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (Google OAuth)
- **Storage**: AWS S3 (Presigned URL 방식)
- **Communication**: Slack Webhook
- **Styling**: Tailwind CSS, shadcn/ui
- **Deployment**: Vercel (Seoul Region, Fluid Compute)

### 프로젝트 구조
```
src/
├── app/
│   ├── (app)/          # 사용자 페이지 (홈, 마이페이지, 콘텐츠 상세)
│   ├── (admin)/admin/  # 관리자 페이지 (대시보드, 콘텐츠, 카테고리)
│   ├── api/            # API 라우트
│   ├── auth/           # OAuth 콜백 처리
│   └── login/          # 로그인 페이지
├── components/
│   ├── admin/          # 관리자 전용 UI 컴포넌트
│   ├── content/        # 콘텐츠 렌더링 컴포넌트
│   ├── shell/          # 사이드바, 네비게이션 등 레이아웃
│   └── ui/             # 공통 UI 컴포넌트 (shadcn/ui)
├── lib/
│   ├── auth.ts         # 인증 및 세션 관리 헬퍼
│   ├── prisma.ts       # 데이터베이스 클라이언트
│   ├── targeting.ts    # 콘텐츠 노출 대상 계산 로직
│   ├── supabase/       # Supabase 클라이언트 설정
│   └── server/data/    # 서버 사이드 데이터 페칭 함수
├── types/
│   └── domain.ts       # 도메인 모델 및 공통 타입 정의
```

### 인증 및 데이터 흐름
1. 사용자가 Google 로그인을 시도하면 Supabase OAuth를 통해 인증을 수행합니다.
2. `/auth/callback`에서 JWT를 교환하고, DB에 사용자 정보를 업데이트합니다. 이때 `ADMIN_EMAILS` 설정값에 따라 관리자 권한을 부여합니다.
3. Middleware가 모든 요청에서 세션을 확인하고, 유저 정보를 헤더에 세팅하여 보안을 유지합니다.
4. 각 페이지와 레이아웃에서는 캐시 처리된 인증 함수를 호출하여 불필요한 네트워크 요청 없이 유저 정보를 조회합니다.

### API 엔드포인트
| 엔드포인트 | 메서드 | 설명 | 권한 |
|-----------|--------|------|------|
| `/api/contents` | GET, POST | 콘텐츠 목록 조회 및 생성 | GET: 인증, POST: 관리자 |
| `/api/contents/[id]` | GET, PATCH, DELETE | 콘텐츠 상세 조회, 수정, 삭제 | GET: 인증, PATCH/DELETE: 관리자 |
| `/api/categories` | GET, POST | 카테고리 목록 조회 및 생성 | GET: 인증, POST: 관리자 |
| `/api/categories/[id]` | PATCH, DELETE | 카테고리 수정 및 삭제 | 관리자 |
| `/api/readlogs` | POST | 콘텐츠 열람 기록 저장 | 인증 사용자 |
| `/api/files/access` | POST | 첨부파일 접근 기록 저장 | 인증 사용자 |
| `/api/uploads/presign` | POST | S3 업로드용 Presigned URL 발급 | 관리자 |
| `/api/slack/remind` | POST | 미열람자 대상 Slack 알림 발송 | 관리자 |

## 5. 배포 및 운영

### 주요 환경변수
- `DATABASE_URL`: PostgreSQL 연결 주소 (PgBouncer 사용 권장)
- `DIRECT_URL`: 마이그레이션용 직접 연결 주소
- `ADMIN_EMAILS`: 관리자 권한을 부여할 이메일 목록 (쉼표로 구분)
- `GOOGLE_ALLOWED_DOMAIN`: 로그인을 허용할 도메인 (예: homes.global)
- `USE_MOCK_DB`: "true" 설정 시 로컬에서 목 데이터로 동작
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: S3 파일 업로드용 계정 정보
- `SLACK_WEBHOOK_URL`: 리마인더 발송용 웹훅 주소

### 배포 절차
1. Vercel 프로젝트 설정에서 환경변수를 등록합니다.
2. `vercel.json` 설정을 통해 서울 리전(icn1)과 Fluid Compute를 활성화합니다.
3. `npx prisma migrate deploy` 명령어로 데이터베이스 스키마를 최신화합니다.
4. 필요한 경우 `npx prisma db seed`를 실행하여 초기 데이터를 생성합니다.

### 로컬 개발 환경 구축
```bash
# 1. 환경변수 설정
cp .env.example .env.local

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

### 성능 최적화 전략
- **Middleware 최적화**: JWT 파싱을 로컬에서 처리하여 인증 시 발생하는 네트워크 지연을 제거했습니다.
- **데이터 캐싱**: React `cache()`를 활용해 동일 요청 내에서 중복되는 유저 조회와 데이터 페칭을 방지합니다.
- **사용자 경험**: `loading.tsx`와 스켈레톤 UI를 적용하여 데이터 로딩 중에도 즉각적인 피드백을 제공합니다.
- **인프라 최적화**: Vercel 서울 리전 배치와 Fluid Compute 설정을 통해 Cold Start 문제를 해결하고 응답 속도를 개선했습니다.
