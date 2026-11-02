# 💧 DDORANG FrontEnd Repository

## ✨ 프로젝트 소개

> 우리 동네 빗물받이를 함께 관리하고, 주민 참여를 통해 도시 침수를 예방하는 빗물받이 관리 플랫폼입니다.

- **기간** : 추후 기재
- **팀** : Team RainDrainManager
- **Frontend 인원** : 2명
- **목적** : 주민들이 빗물받이를 직접 입양하고 관리하는 참여형 서비스를 통해 빗물받이 관리의 지속성을 높이고 도시 침수 예방에 기여하는 것
- **주요 기능**
  - 카카오 소셜 로그인
  - 지도 기반 빗물받이 위치 및 상태 확인
  - 빗물받이 입양 및 관리
  - 사진 인증 및 점검 기록
  - 빗물받이별 10단계 캐릭터 성장
  - 빗물받이 막힘 및 오염 신고
  - 날씨 및 점검 알림
  - 마이페이지 및 활동 내역 관리

## 👩‍💻 팀원 및 역할

| 팀원 | 담당 기능 |
| --- | --- |
| 우현 | 지도 탭, 내 빗물받이(또랑이) |
| 현수 | 로그인 화면, 알림 탭 및 푸시 알림, 프로필 |

## ⚙️ 기술 스택

- **언어** : React + TypeScript
- **빌드 툴** : Vite
- **패키지 매니저** : pnpm
- **코드 검사** : ESLint
- **스타일링** : Tailwind CSS (예정)
- **라우팅** : React Router (예정)
- **상태관리** : Zustand (예정)
- **데이터 캐싱** : TanStack Query (예정)
- **API 통신** : Axios (예정)
- **지도** : 네이버 지도 API (예정)
- **배포** : Vercel (예정)

## 📕 브랜치 정의

- 영어로 통일, 케밥케이스로 작성
- 작성 형식: `브랜치 유형/브랜치명/#이슈번호`
- 작성 예시
  - `feat/login-page/#5`
  - `feat/main-map/#12`
  - `feat/drain-adoption/#15`

### 브랜치 운영

- `main` : 운영 배포 브랜치
- `develop` : 개발 통합 브랜치
- `feat/*` : 기능 개발 브랜치
- `fix/*` : 버그 수정 브랜치

기능 개발 후 `develop`으로 PR을 생성하여 병합하고, 배포 시 `main`으로 병합합니다.

## 📗 네이밍 컨벤션

- `camelCase` : 변수, 일반 함수
  - ex) isLoading, handleSubmit
- `UPPER_CASE_SNAKE_CASE` : 상수
  - ex) BASE_URL, MAX_LEVEL
- `PascalCase` : 클래스, 컴포넌트 함수, 타입, 인터페이스, 컴포넌트 파일
  - ex) DrainCard, DrainDetailProps
- `kebab-case` : 일반 파일, 폴더
  - ex) main-layout, drain-detail
  - 컴포넌트 파일 및 폴더는 예외적으로 파스칼 케이스 사용

## 📘 커밋 컨벤션

| 타입 | 설명 |
| --- | --- |
| Feat | 새로운 기능 추가 |
| BugFix | 버그 수정 |
| Docs | 문서 작성 |
| Modify | 코드 수정 |
| Refactor | 리팩터링 |
| Style | 코드 포매팅 |
| Design | 디자인 수정 |
| Chore | 빌드 수정, 패키지 매니저 설정 |
| Rename | 파일 혹은 폴더명 수정 |
| Remove | 파일 혹은 폴더 삭제 |
| Merge | 브랜치 병합 |
| Build | 새로운 라이브러리 혹은 패키지 추가 |

## 📁 폴더 구조

```text
📦 FE
 ┣ 📂.github
 ┃ ┣ 📂ISSUE_TEMPLATE
 ┃ ┣ 📂workflows
 ┃ ┗ 📜PULL_REQUEST_TEMPLATE.md
 ┣ 📂public
 ┃ ┗ 📂characters
 ┣ 📂src
 ┃ ┣ 📂apis
 ┃ ┣ 📂assets
 ┃ ┃ ┣ 📂fonts
 ┃ ┃ ┣ 📂icons
 ┃ ┃ ┗ 📂images
 ┃ ┣ 📂components
 ┃ ┣ 📂constants
 ┃ ┣ 📂layouts
 ┃ ┣ 📂mocks
 ┃ ┣ 📂pages
 ┃ ┣ 📂store
 ┃ ┣ 📂types
 ┃ ┣ 📂utils
 ┃ ┣ 📜App.css
 ┃ ┣ 📜App.tsx
 ┃ ┣ 📜index.css
 ┃ ┗ 📜main.tsx
 ┣ 📜.gitignore
 ┣ 📜README.md
 ┣ 📜eslint.config.js
 ┣ 📜index.html
 ┣ 📜package.json
 ┣ 📜pnpm-lock.yaml
 ┣ 📜tsconfig.app.json
 ┣ 📜tsconfig.json
 ┣ 📜tsconfig.node.json
 ┗ 📜vite.config.ts
```

## ▶️ 실행 방법

### 1. 프로젝트 클론

```bash
git clone https://github.com/Team-RainDrainManager/FE.git
cd FE
git checkout develop
```

### 2. 패키지 설치

```bash
pnpm install
```

### 3. 개발 서버 실행

```bash
pnpm dev
```

### 4. 빌드

```bash
pnpm build
```

## 🔗 Repository

- **Frontend** : https://github.com/Team-RainDrainManager/FE
- **Backend** : https://github.com/Team-RainDrainManager/BE

---

Team RainDrainManager
