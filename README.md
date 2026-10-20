# 내 블로그

텍스트 중심의 개인 블로그입니다. 관리자 페이지에 로그인해서 웹 화면에서 바로 글을 쓰고 발행할 수 있습니다.

## 구조
- **Next.js** — 웹사이트 프레임워크
- **Vercel Postgres** — 글이 저장되는 데이터베이스
- **관리자 로그인** — 비밀번호 하나로 보호되는 글쓰기 화면 (`/admin`)

## 기능
- 조회수 / 좋아요 (좋아요는 브라우저 기준으로 중복 방지)
- 댓글: 누구나 이름 + 비밀번호 + 내용으로 작성 가능. **수정/삭제는 관리자만** 가능
- 메인 화면 상단 "인기 게시물" 3칸 (조회수 기준)
- 글 검색 + **추천 검색어(자동완성)**: 글 제목 / 카테고리를 검색창 아래에 바로 추천해줘요
- 게시물 수정 / 삭제 (관리자 전용, `/admin/edit/[글번호]`)
- 카테고리: 글쓰기 화면에서 입력, 메인 화면 왼쪽에 카테고리별 목록 표시
- **하위 카테고리** (카테고리 관리에서 이름 클릭 → 하위 카테고리 추가)
- **카테고리 안의 글을 체크박스로 골라서 다른 카테고리로 한꺼번에 옮기기** (카테고리 관리에서 이름 클릭)
- 카테고리 전체 글 텍스트 파일로 다운로드 (`/category/카테고리명`)
- 로그인 / 로그아웃
- **관리자 대시보드** (`/admin/dashboard`): 방문자 수 / 게시물 수 / 총 조회수 / 총 좋아요 / 총 댓글 수 통계,
  카테고리 추가·이름변경(다른 카테고리로 옮기기/병합)·삭제 관리
- 업데이트 기록 페이지
- 글/댓글 작성 시각을 초 단위까지 표시
- 브라우저 탭 제목: "이산의 블로그"
- 글 목록에 댓글 수 표시
- **관리자용 새 댓글 알림** (우측 상단 🔔 종 모양 버튼, 클릭하면 최근 댓글 작성자/내용 확인)
- **사진 직접 첨부** (글쓰기/수정 화면 "📎 사진 첨부" 버튼) + 유튜브 영상 삽입 (링크를 한 줄에 단독 입력)
- **인스타용 이미지 만들기** (글 상세 페이지, 글 내용을 1080x1080/1080x1350 이미지 여러 장으로 나눠서 다운로드 — 인스타그램에 올리기 좋게)
- **마크다운 문법**: `**굵게**`, `*기울임*`, `` `코드` ``, `# 제목`, `> 인용`, `- 목록`, `[링크](주소)`
- **다크 모드** (홈/글 상세 화면 우측 상단 🌙/☀️ 버튼)
- **댓글 좋아요** + **답글(대댓글)** (댓글 아래 "답글" 버튼으로 게스트도 답글 작성 가능)

> ⚠️ 이번 업데이트로 `Comment` 테이블에 컬럼 2개가 추가되었어요. 아래 SQL을 실행해주세요.

```sql
ALTER TABLE "Comment" ADD COLUMN "parentId" INTEGER REFERENCES "Comment"(id) ON DELETE CASCADE;
```

```sql
ALTER TABLE "Comment" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;
```

> ⚠️ 사진 첨부 기능을 쓰려면 Vercel에 파일 저장소(Blob)를 하나 더 연결해야 해요.
> 데이터베이스 만들 때와 똑같은 방법이에요.
>
> 1. Vercel 프로젝트 → **Storage** 탭 → **Connect Database** (또는 Create Database)
> 2. 마켓플레이스 목록에서 **"Blob"** 찾아서 선택 (Vercel 자체 제공, 무료 시작 가능)
> 3. 이름 정하고 만들기 → 자동으로 이 프로젝트에 연결됨 (`BLOB_READ_WRITE_TOKEN` 환경변수가 자동으로 추가돼요)
> 4. 연결 후 **Redeploy**

> ⚠️ 이번 업데이트로 컬럼이 하나 추가되었어요. 아래 SQL을 실행해주세요.

```sql
ALTER TABLE "SiteStat" ADD COLUMN "lastSeenCommentAt" TIMESTAMP;
```

> ⚠️ 이번 업데이트로 테이블 2개(`Category`, `SiteStat`)가 추가되었어요. 아래 SQL을 실행해주셔야 합니다.

## 처음 실행하기까지 순서 (하나도 안 빠뜻하고 그대로 따라하시면 됩니다)

### 1. GitHub에 코드 올리기
1. https://github.com 에서 계정을 만드세요 (이미 있으면 생략).
2. 새 저장소(Repository)를 하나 만드세요. 이름은 자유 (예: `my-blog`).
3. 이 프로젝트 폴더 전체를 그 저장소에 업로드하세요.
   - GitHub Desktop 앱을 쓰면 드래그 앤 드롭처럼 쉽게 올릴 수 있습니다: https://desktop.github.com

### 2. Vercel에 배포하기
1. https://vercel.com 에서 GitHub 계정으로 로그인하세요.
2. "Add New... → Project"를 누르고, 방금 올린 GitHub 저장소를 선택하세요.
3. "Deploy" 버튼을 누르면 자동으로 배포가 시작됩니다. (이 단계에서는 아직 데이터베이스가 없어서 에러가 날 수 있어요. 다음 단계로 이어서 해결합니다.)

### 3. 데이터베이스 연결하기 (Vercel Postgres)
1. Vercel 프로젝트 화면에서 "Storage" 탭 → "Create Database" → "Postgres" 선택.
2. 만들고 나면 "Connect Project"를 눌러서 방금 만든 블로그 프로젝트에 연결하세요.
   - 이 과정에서 `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` 같은 환경변수가 **자동으로** 채워집니다.
3. 프로젝트 "Settings → Environment Variables"에서 아래 2개를 직접 추가하세요:
   - `ADMIN_PASSWORD` : 관리자 페이지 로그인 비밀번호 (원하는 걸로 정하세요)
   - `ADMIN_SECRET` : 아무 긴 문자열 (예: `a8f7s6d5f4a3s2d1`)
4. 데이터베이스에 테이블을 만들어야 합니다. 터미널(컴퓨터의 명령 프롬프트)에서:
   ```
   npx vercel env pull .env
   npx prisma db push
   ```
   (`vercel` CLI가 없다면 먼저 `npm i -g vercel`로 설치 후 `vercel login`을 해주세요.)
5. Vercel 프로젝트 화면에서 "Redeploy"를 눌러 다시 배포하세요.

### 4. 사용하기
- 배포된 주소 + `/admin` 으로 들어가서 비밀번호(ADMIN_PASSWORD로 정한 값)를 입력하면 글쓰기 화면이 나옵니다.
- 글을 쓰고 "발행하기"를 누르면 즉시 홈 화면에 나타납니다.

## 로컬(내 컴퓨터)에서 미리보기 하고 싶다면
```
npm install
npx vercel env pull .env    # Vercel의 환경변수를 내 컴퓨터로 가져오기
npx prisma db push          # 데이터베이스 테이블 생성
npm run dev                 # http://localhost:3000 에서 확인
```

> ⚠️ 데이터베이스에 새 테이블 2개를 추가해야 합니다.
> Vercel **Storage → 데이터베이스 → Query** 탭 (또는 "Open in Neon" → SQL Editor)에서
> 아래 SQL을 **하나씩 따로** 실행해주세요.

```sql
CREATE TABLE "Category" (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE "SiteStat" (
  id INTEGER PRIMARY KEY,
  "homeViews" INTEGER NOT NULL DEFAULT 0
);
```

```sql
INSERT INTO "SiteStat" (id, "homeViews") VALUES (1, 0);
```

```sql
INSERT INTO "Category" (name) SELECT DISTINCT category FROM "Post" ON CONFLICT (name) DO NOTHING;
```

(마지막 SQL은 지금까지 써두신 글들의 카테고리를 카테고리 관리 목록에 자동으로 등록해주는 명령이에요.)

> ⚠️ 하위 카테고리 기능을 위해 컬럼이 하나 더 필요해요. 이것도 실행해주세요.

```sql
ALTER TABLE "Category" ADD COLUMN "parentId" INTEGER REFERENCES "Category"(id) ON DELETE SET NULL;
```

## 나중에 더 해볼 수 있는 것들
- 마크다운 문법 지원 (굵게, 기울임 등)
- 다크 모드
- 댓글 좋아요, 답글(대댓글)
- 카테고리별 페이지 디자인 개선, 카테고리 드롭다운 선택
