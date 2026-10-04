# 복지센스

기존 저장소 `kimssi1201-ux/bokjisense`의 한국어 정보성 사이트입니다.
최초 확인 시 저장소에는 README만 있었고 배포 주소는 HTTP 404였습니다.
기존 앱·프레임워크·Cloudflare 설정은 없었습니다. 새 저장소나 Cloudflare 프로젝트를 만들지 않습니다.

## 실행

Node.js 22 이상과 npm을 사용합니다.

```sh
npm install
npm run build
npm run lint
npm run check
npm run preview
```

미리보기: http://127.0.0.1:4173
배포 산출물: `dist/`. 런타임 서버/DB/외부 폰트 없이 정적 HTML을 제공합니다.
빌드 시 Markdown 변환에만 marked, gray-matter를 사용합니다.
검색 페이지에서만 작은 JS와 정적 검색 인덱스를 로드합니다.

## 구조

- `src/site.config.mjs`: 사이트 주소, 연락처, 운영자, 광고 설정
- `src/components.mjs`: AdSlot 및 광고 head
- `content/posts/*.md`: YAML 메타데이터 + Markdown 게시글
- `content/pages/*.md`: 소개·문의·개인정보·이용약관
- `public/`: CSS, 검색 JS, favicon, Cloudflare 응답 헤더
- `scripts/build.mjs`: 메인·분류·상세·SEO 파일 생성
- `scripts/check.mjs`: 내부 링크·메타데이터·구조화 데이터 검증
- `wrangler.toml`: 기존 bokjisense Pages 배포명, 출력 폴더

주소: `/`, `/government/`, `/welfare/`, `/life/`, `/finance/`, `/jobs/`,
`/posts/<파일명>/`, `/search/`, `/about/`, `/contact/`, `/privacy/`, `/terms/`.
분류당 10개를 넘으면 `/<category>/page/2/` 등이 생성됩니다.
존재하지 않는 경로는 Cloudflare Pages의 `404.html`로 처리합니다.

## 글 추가

기존 SAMPLE을 참고해 `content/posts/my-article.md` 파일을 추가합니다.
실제 정책에 대한 수치, 기간, 조건은 반드시 원문에서 확인합니다.
아래 양식의 설명값과 날짜는 발행 전 실제 값으로 교체해야 합니다.

```yaml
---
title: "실제 검증한 글 제목"
description: "이 글에서 알 수 있는 내용을 요약"
category: government
date: "2026-10-04"
updated: "2026-10-04"
draft: true
sample: false
tags: [신청방법, 서류준비]
summary:
  - "공식 자료에서 확인한 핵심 내용"
faq:
  - question: "실제 독자가 궁금해할 질문"
    answer: "원문에 근거한 답변"
sources: []
---
## 핵심 내용
본문을 작성합니다.
```

- `draft: true`: 모든 공개 페이지·검색·RSS·sitemap에서 제외.
- 공개할 때 `draft: false`로 전환. 정부지원금·복지·금융·고용 글에는 sources가 필수입니다.
- sources 각 항목: `name` (기관/공고 이름), `url` (실제 https 공식 공고 URL), `checked` (YYYY-MM-DD 확인일).
- URL 형식은 검사하지만 해당 주소의 공식성/원문 정확성은 작성자가 직접 검증해야 합니다.
- 샘플 3개는 `sample: true`로 noindex 처리하고 sitemap/RSS에서 제외합니다.
  사이트 내부 검색에는 SAMPLE 표기와 함께 포함합니다. 실제 발행 전 샘플을 제거하거나 draft로 변경하세요.
- 문서의 H1은 제목에서 자동 생성합니다. 본문에는 H2/H3를 사용합니다.
- 본문에 있는 제목만 목차에 표시합니다. 존재하지 않는 지원 대상/기간 등을 자동 생성하지 않습니다.
- FAQ, 출처는 배열에 작성하면 화면에 표시됩니다. 비어 있으면 영역도 표시되지 않습니다.
- 관련 글은 동일 분류 또는 겹치는 태그로 최대 5개 표시합니다. 현재 샘플 3개라 각 글에는 2개가 표시됩니다. 글이 늘면 3~5개가 자동 연결됩니다.
- 페이지를 빌드할 때 sitemap과 RSS가 자동 갱신됩니다.
- 이미지 Markdown 사용 시 대체 텍스트와 `images` 매핑이 필수입니다.
  예: `images: {"/images/photo.webp": {width: 1200, height: 800}}`
  파일은 `public/images/`에 넣고 `![내용을 설명하는 대체 텍스트](/images/photo.webp)`로 삽입합니다.
- 본문 HTML은 실행되지 않고 문자로 표시됩니다. 링크는 https/http/mailto/루트경로/앵커를 지원합니다.
- 신뢰하는 운영자가 작성한 Markdown만 빌드에 사용하세요.

## 실제 운영 설정

`src/site.config.mjs`의 `contactEmail`, `operatorName`, `privacyUpdated`를 실제 정보로 입력하세요.
연락처를 입력하기 전에는 문의 폼/전송 버튼이 없고 연락처 준비 중 안내가 표시됩니다.
개인정보처리방침은 초기 운영 초안입니다. 실제 문의 처리, 보관 기간, 권리 행사 절차,
광고·동의 도구 등을 결정한 뒤 그 운영 방식과 일치하게 갱신해야 합니다.
SAMPLE만 있는 초기 상태는 AdSense 심사에 제출할 운영 콘텐츠를 대신하지 않습니다.

## AdSense

기본값은 비활성화입니다. 가짜 publisher ID, 광고 단위, ads.txt는 생성하지 않습니다.

1. 실제 publisher ID를 `ads.publisherId`에 입력합니다.
2. 승인 및 서비스·개인정보·동의 절차 점검 후 실제 광고 단위를 `ads.articleSlot`에 입력합니다.
3. `ads.enabled: true`로 변경하면 공통 head 광고 스크립트와 실제 게시글 AdSlot을 출력합니다.
4. `ads.adsTxtEnabled: true`로 바꾸면 Google DIRECT 행을 가진 ads.txt를 생성합니다.
   최종 행은 본인 AdSense 계정 안내와 대조하세요.
5. 샘플 글에는 광고 슬롯을 출력하지 않습니다. ID가 없으면 광고 코드와 빈 광고 박스도 없습니다.
6. 개인정보 방침의 현재 광고 미제공 문구를 실제 서비스에 맞춰 수정하세요.

FAQ는 기본적으로 화면에만 표시합니다. `faqSchema`를 켜면 실제 글의 FAQ와 동일한 FAQPage JSON-LD를 만듭니다.
Google은 2026-05-07부터 FAQ 리치결과 노출을 종료했으므로 FAQPage는 기본 비활성화합니다.
확인 자료: https://developers.google.com/search/updates#may-2026
Article/BreadcrumbList 구조화 데이터는 기본 적용됩니다.

## Cloudflare Pages (기존 프로젝트)

- 기존 프로젝트: `bokjisense`
- 기존 저장소: `kimssi1201-ux/bokjisense`
- 프로덕션 브랜치: 실제 연결 브랜치를 확인 (저장소 기본값 `main`)
- Framework preset: None
- Root directory: 저장소 루트 (빈 값 또는 `/`)
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: 22 (`.node-version`)
- Functions/Worker/DB 바인딩: 불필요

`wrangler.toml`은 기존 프로젝트 이름과 출력 폴더를 지정합니다.
Cloudflare 대시보드의 실제 Git 연동/빌드 명령은 계정에서 확인해야 합니다.
이 설정 파일만으로 GitHub 연결이나 배포 성공을 주장할 수 없습니다.
Git 연동이 이미 있다면 검토한 변경사항을 연결 브랜치에 올린 뒤 배포 로그를 확인하세요.
직접 배포가 필요하면 인증된 환경에서 `npx wrangler pages deploy dist --project-name bokjisense`를 사용합니다.
새 Pages 프로젝트를 생성하지 마세요.

배포 후 홈 HTTP 200, 임의 경로 HTTP 404, sitemap/robots/RSS, 모바일 메뉴/검색을 다시 확인하세요.
Cloudflare 정적 배포 문서: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
