# API 연결 현황

서버 API 문서(Swagger)에 있는 API가 앱의 어느 코드에 연결되어 있는지 정리한 문서입니다.

- 기준: [서버 API 문서](https://api.rainbutler.site/swagger-ui/index.html)의 전체 경로 63개
- 연결: **63 / 63** (2026-11-11 기준)
- 확인 방법: 서버 문서의 경로와 `src` 아래 코드가 부르는 `/api/v1/...` 주소를 대조했습니다.

## 화면별 요약

| 분류 | API 수 | 쓰는 화면 |
| --- | --- | --- |
| 로그인 | 6 / 6 | 로그인 · 회원가입 · 카카오 로그인, 설정(로그아웃) |
| 가입 | 2 / 2 | 가입 약관 동의 · 가입 마무리 |
| 약관 | 2 / 2 | 가입 약관 동의 |
| 내 정보 | 10 / 10 | 프로필, 마이페이지, 설정(알림 · 점검 쉬기 · 탈퇴) |
| 활동 내역 | 1 / 1 | 마이페이지 활동 내역 |
| 빗물받이 | 6 / 6 | 지도(목록 · 검색 · 상세 · 새 빗물받이), 제보의 AI 확인 |
| 입양 | 6 / 6 | 내 또랑이, 빗물받이 상세(입양 · 돌봄 정보 · 점검 기록 · 그만두기) |
| 입양 전 청소 | 2 / 2 | 입양하기(청소 전 · 후 사진) |
| 점검 | 4 / 4 | 정기 점검, 비 예보 점검, 대신 점검 |
| 비 예보 점검 요청 | 4 / 4 | 알림 탭 점검 요청, 지도 비 예보 배너 |
| 제보 | 3 / 3 | 지도 제보, 프로필 내 제보 내역 |
| 알림 | 4 / 4 | 알림 탭, 상단 알림 수 |
| 푸시 | 2 / 2 | 알림 받기(기기 등록 · 해제) |
| 리더보드 | 2 / 2 | 소셜 리더보드 |
| 사진 올리기 | 1 / 1 | 모든 사진 촬영 흐름 |
| 관리자 | 7 / 7 | 관리자 화면(제보 처리 · 사진 검토 · 시연 도구) |
| 시스템 | 1 / 1 | 로그인 화면 · 연결 오류 화면의 서버 상태 안내 |

## 전체 목록

| 분류 | 메서드 | 경로 | 설명 | 연결 코드 |
| --- | --- | --- | --- | --- |
| 로그인 | POST | `/auth/kakao` | 카카오 로그인 (인가 코드 → 토큰 발급) | `apis/auth.ts` |
| 로그인 | GET | `/auth/kakao/login-url` | 카카오 인가 페이지 주소 조회 | `apis/auth.ts` |
| 로그인 | POST | `/auth/login` | 자체 로그인 | `apis/auth.ts` |
| 로그인 | POST | `/auth/logout` | 로그아웃 (refresh 토큰 폐기) | `apis/auth.ts` |
| 로그인 | POST | `/auth/refresh` | 토큰 재발급 (refresh 회전) | `apis/auth.ts` |
| 로그인 | POST | `/auth/signup` | 자체 회원가입 (가입 후 바로 토큰 발급) | `apis/auth.ts` |
| 가입 | GET | `/users/me/onboarding` | 온보딩 상태 조회 | `apis/auth.ts` |
| 가입 | POST | `/users/me/onboarding` | 온보딩 완료 (약관 동의 + 본인인증 목업) | `apis/auth.ts` |
| 약관 | GET | `/terms` | 약관 목록 조회 | `apis/auth.ts` |
| 약관 | GET | `/terms/{termsId}` | 약관 전문 조회 | `apis/auth.ts` |
| 내 정보 | DELETE | `/users/me` | 회원 탈퇴 | `apis/account.ts`, `apis/auth.ts` |
| 내 정보 | GET | `/users/me` | 내 정보 조회 | `apis/account.ts`, `apis/auth.ts` |
| 내 정보 | PATCH | `/users/me` | 닉네임 수정 | `apis/account.ts`, `apis/auth.ts` |
| 내 정보 | GET | `/users/me/certificate` | 활동 확인서 PDF 다운로드 | `apis/my-page.ts` |
| 내 정보 | POST | `/users/me/identity` | 실명 등록 | `apis/my-page.ts` |
| 내 정보 | GET | `/users/me/pause` | 점검 쉬기 상태 조회 | `apis/profile-settings.ts` |
| 내 정보 | POST | `/users/me/pause` | 점검 쉬기 신청 | `apis/profile-settings.ts` |
| 내 정보 | GET | `/users/me/sanctions` | 내 제재 내역 조회 | `apis/sanctions.ts` |
| 내 정보 | GET | `/users/me/settings` | 알림 설정 조회 | `apis/profile-settings.ts` |
| 내 정보 | PATCH | `/users/me/settings` | 알림 설정 변경 | `apis/profile-settings.ts` |
| 활동 내역 | GET | `/users/me/activities` | 내 활동 내역 | `apis/my-page.ts` |
| 빗물받이 | GET | `/drain` | 지도 위 빗물받이 목록 조회 | `apis/drains.ts` |
| 빗물받이 | POST | `/drain` | 빗물받이 생성 | `apis/drains.ts` |
| 빗물받이 | GET | `/drain/{drainId}` | 빗물받이 상세 조회 | `apis/adoptions.ts`, `apis/drains.ts` |
| 빗물받이 | GET | `/drain/{drainId}/growth` | 성장 조회 | `apis/growth.ts` |
| 빗물받이 | POST | `/drain/assessments` | 빗물받이 사진 판독 | `apis/drains.ts`, `pages/map/components/ReportDraftModal.tsx` |
| 빗물받이 | GET | `/drain/list` | 빗물받이 목록 조회 (페이지) | `apis/drains.ts` |
| 입양 | GET | `/adoptions/{adoptionId}` | 입양 상세 조회 | `apis/adoptions.ts` |
| 입양 | GET | `/adoptions/{adoptionId}/inspections` | 입양별 점검 이력 조회 | `apis/adoption-inspections.ts` |
| 입양 | POST | `/adoptions/{adoptionId}/management-logs` | 관리 기록 | `apis/adoptions.ts` |
| 입양 | POST | `/adoptions/{adoptionId}/release` | 입양 해제 | `apis/adoptions.ts` |
| 입양 | GET | `/adoptions/me` | 내 입양 목록 조회 | `apis/my-drains.ts` |
| 입양 | POST | `/drains/{drainId}/adoptions` | 입양 등록 | `apis/adoptions.ts` |
| 입양 전 청소 | POST | `/cleanings/{cleaningId}/verify` | 입양 청소 완료 인증 | `apis/adoptions.ts` |
| 입양 전 청소 | POST | `/drains/{drainId}/cleanings` | 입양 청소 시작 | `apis/adoptions.ts` |
| 점검 | GET | `/drains/{drainId}/inspection-eligibility` | 점검 가능 여부 확인 | `apis/inspections.ts` |
| 점검 | POST | `/inspections` | 점검 시작 | `apis/inspections.ts` |
| 점검 | GET | `/inspections/{inspectionId}` | 점검 기록 상세 조회 | `apis/inspections.ts` |
| 점검 | POST | `/inspections/{inspectionId}/complete` | 정기 점검 청소 후 인증 | `apis/inspections.ts` |
| 비 예보 점검 요청 | GET | `/rain-notice` | 지도 비 예보 배너 | `apis/rain-notice.ts` |
| 비 예보 점검 요청 | POST | `/requests/{requestId}/claim` | 대신 점검 수락 | `apis/requests.ts` |
| 비 예보 점검 요청 | POST | `/requests/{requestId}/reply` | 비 예보 요청 가능 · 불가 응답 | `apis/requests.ts` |
| 비 예보 점검 요청 | GET | `/requests/me` | 내 비 예보 요청 목록 | `apis/requests.ts` |
| 제보 | POST | `/reports` | 제보 생성 | `apis/reports.ts` |
| 제보 | GET | `/reports/{reportId}` | 제보 상세 조회 | `apis/reports.ts` |
| 제보 | GET | `/reports/me` | 내 제보 내역 조회 | `apis/reports.ts` |
| 알림 | GET | `/notifications` | 알림 목록 | `apis/notifications.ts` |
| 알림 | PATCH | `/notifications/{notificationId}/read` | 알림 읽음 | `apis/notifications.ts` |
| 알림 | PATCH | `/notifications/read-all` | 알림 모두 읽음 | `apis/notifications.ts` |
| 알림 | GET | `/notifications/summary` | 알림 탭별 안 읽은 수 | `apis/notifications.ts`, `components/layout/NotificationBellIcon.tsx` |
| 푸시 | DELETE | `/push/tokens` | FCM 토큰 삭제 | `apis/push-tokens.ts` |
| 푸시 | PUT | `/push/tokens` | FCM 토큰 등록 · 갱신 | `apis/push-tokens.ts` |
| 리더보드 | GET | `/leaderboard` | 리더보드 조회 | `apis/leaderboard.ts` |
| 리더보드 | GET | `/leaderboard/me` | 내 리더보드 순위 | `apis/leaderboard.ts` |
| 사진 올리기 | POST | `/uploads/presigned-url` | 사진 업로드 URL 발급 | `apis/adoptions.ts` |
| 관리자 | POST | `/admin/forecasts/simulate` | 가상 예보 적용 (시연용) | `apis/admin.ts` |
| 관리자 | GET | `/admin/reports` | 제보 목록 조회 (관리자) | `apis/admin.ts` |
| 관리자 | PATCH | `/admin/reports/{reportId}` | 제보 승인 · 반려 (관리자) | `apis/admin.ts` |
| 관리자 | PATCH | `/admin/reports/{reportId}/clear` | 제보 입양 차단 해제 (관리자) | `apis/admin.ts` |
| 관리자 | GET | `/admin/reviews` | 사진 검토 대기 목록 (관리자) | `apis/admin.ts` |
| 관리자 | PATCH | `/admin/reviews/{type}/{id}` | 사진 검토 승인 · 반려 (관리자) | `apis/admin.ts` |
| 관리자 | POST | `/admin/weather/simulate-rain` | 비 오는 중 강제 (시연용) | `apis/admin.ts` |
| 시스템 | GET | `/health` | 헬스 체크 | `apis/health.ts` |

경로는 모두 `/api/v1` 뒤부터 적었습니다.
