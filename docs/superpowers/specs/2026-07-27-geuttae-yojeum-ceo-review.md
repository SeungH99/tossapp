---
status: ACTIVE
date: 2026-07-27
branch: main
mode: SELECTIVE EXPANSION
repository: https://github.com/SeungH99/tossapp.git
source_plan: docs/superpowers/specs/2026-07-27-geuttae-yojeum-mvp-design.md
---

# 그때요즘 MVP CEO 검토 계획

## Executive decision

`그때요즘`을 5060 사용자가 부담 없이 매일 돌아오는 “세대공감 퀴즈”로 출시한다.

핵심 제품은 매일 같은 세 문제를 풀고 해설을 읽는 60~90초 경험이다. 첫 보너스와 연속 참여 보상은 무료로 제공하고, 무료 보너스권이 없을 때만 선택형 보상 광고를 제안한다. 차별점은 문제 수가 아니라 다음 세 요소다.

1. `그때 · 요즘 · 생활`이라는 기억과 현재 생활을 잇는 콘텐츠 편성
2. 친구가 같은 날짜의 핵심 문제를 풀 수 있는 세대공감 공유
3. 좋아하는 주제를 고르고 연속 참여 무료권으로 더 풀 수 있어 “내일 다시 올 이유”가 생기는 구조

초기 유료 프로모션은 제품 지표가 기준을 통과하기 전까지 집행하지 않는다.

## Vision

5060 사용자가 “내가 아직 세상과 잘 연결되어 있다”는 기분을 매일 짧게 확인하고, 친구나 가족과 자연스럽게 대화를 시작하게 하는 퀴즈 앱을 만든다.

제품의 약속은 다음과 같다.

- 기본 세 문제와 해설은 광고 없이 끝낼 수 있다.
- 어렵게 좌절시키기보다 맞히는 즐거움과 새로 배우는 만족을 준다.
- 사용자를 재촉하거나 속이지 않는다.
- 같은 날짜의 핵심 문제는 모두에게 같아 공정하게 비교할 수 있다.
- 보너스 문제는 사용자가 선택하며, 광고는 첫 무료와 무료 보너스권을 모두 쓴 뒤에만 선택할 수 있다.

## 10x check

단순 상식 퀴즈보다 10배 나은 지점은 기능의 양이 아니라 반복 동기의 결합이다.

| 기준 | 일반 일일 퀴즈 | 그때요즘 |
|---|---|---|
| 콘텐츠 맥락 | 무작위 상식 | 추억, 디지털 생활, 언어·생활 지혜의 세대 맞춤 편성 |
| 공유 | 점수 이미지 또는 링크 | 같은 날짜 핵심 3문제로 바로 이어지는 세대공감 도전 |
| 난이도 | 모두 동일 | 핵심은 동일하고 보너스는 선택 주제를 우선하며 부족분만 최근 약점으로 보충 |
| 광고 | 결과마다 강제 노출 가능 | 첫 무료·연속 참여 무료권 이후에만 선택형 보상 광고 |
| 접근성 | 작은 글자·빠른 진행 | 큰 글자, 넓은 터치 영역, 시간 압박 없음, 명확한 해설 |
| 운영 | 출시 후 감으로 판단 | 출시 게이트와 이벤트 정의로 프로모션 시점을 통제 |

## What already exists

- 제품·시장 조사와 Apps in Toss 정책 검토가 완료되어 있다.
- 5060 퀴즈형 미니앱의 출시 및 수익화 전략 PDF를 검토했다.
- 로컬 우선 MVP 설계가 `docs/superpowers/specs/2026-07-27-geuttae-yojeum-mvp-design.md`에 있다.
- Git 원격 저장소 `https://github.com/SeungH99/tossapp.git`이 연결되어 있다.
- 애플리케이션 코드는 아직 없으며, 현재 저장소에는 설계 문서와 조사 임시 파일만 있다.

## Dream state delta

장기적인 이상형은 편집 CMS, 원격 콘텐츠 배포, 코호트 분석, 실험 제어, 부정 사용 방지, 결제 상품까지 갖춘 퀴즈 운영 플랫폼이다.

이번 MVP는 그 전부를 만들지 않는다. 대신 장기 구조를 막지 않는 최소 경계를 만든다.

| 꿈의 상태 | MVP에서 하는 일 | 지금 하지 않는 일 |
|---|---|---|
| 매일 운영 가능한 콘텐츠 공급망 | 검수된 30일분 180문제와 정적 검증기 | 관리자 CMS, 원격 배포 |
| 설명 가능한 개인화 | 사용자가 고른 주제 우선, 부족분은 최근 주제별 정답률로 보충 | 서버 추천, ML 모델 |
| 완전한 친구 경쟁 | 같은 날짜 문제 공유와 점수 문구 | 계정, 순위표, 실시간 대전 |
| 안정적인 수익 최적화 | 첫 무료·연속 참여 무료권 뒤의 선택형 보상 광고와 중복 해제 방지 | 구독, 광고 제거 결제, 가격 실험 |
| 재방문 자동화 | 2회 완료 후 알림 선택권 | 복잡한 세그먼트 발송, CRM |
| 성장 운영 체계 | 핵심 퍼널 이벤트와 유료 프로모션 게이트 | 자체 데이터 웨어하우스 |

## Scope decisions

| ID | 결정 | 선택 | 이유 |
|---|---|---|---|
| D1 | 구현 접근 | 로컬 데이터 기반 완성형 MVP | 백엔드 없이 제품 경험과 리텐션 가설을 가장 빨리 검증 |
| D2 | 콘텐츠 런웨이 | 출처 검수된 180문제와 자동 검증기 | 데모가 아니라 30일 운영 가능한 출시 후보를 만들기 위함 |
| D3 | 공유 | 점수 문구와 같은 날짜 핵심 문제 딥링크 | 5060 사용자에게 자연스러운 대화와 신규 유입을 동시에 제공 |
| D4 | 분석 | 공식 Analytics 어댑터, 로컬 기록기, 실패 큐 | 출시 후 퍼널과 오류를 재구성하기 위함 |
| D5 | 광고 | 모의·공식 어댑터, 테스트 설정, 중복 보상 방지 | 개발 편의와 프로덕션 안전성을 함께 확보 |
| D6 | 알림 | 핵심 퀴즈 2회 완료 후 인라인 선택권 | 가치를 경험한 뒤 동의를 요청하고 진입 방해를 피함 |
| D7 | 난이도 | 핵심 3문제 고정, 보너스 3문제는 사용자가 고른 주제를 우선 | 공유의 공정성과 개인별 관심사를 동시에 보존 |
| D8 | 성장비 집행 | KPI 게이트 통과 전 유료 프로모션 금지 | 포인트만 받고 이탈하는 유입에 예산을 낭비하지 않기 위함 |
| D9 | 기기 저장 | 프로덕션은 Apps in Toss `Storage`, 브라우저 개발은 대체 어댑터 | 플랫폼 기본 기능을 재사용하고 환경별 origin 차이를 저장 포트에서 격리 |
| D10 | 저장 동시성 | 단일 작성자, 순차 쓰기 큐, 단조 증가 revision | 진행과 분석 outbox의 비동기 쓰기가 서로 덮는 경쟁 상태를 방지 |
| D11 | 배포 산출물 | GitHub Actions 검증·빌드 산출물 + 수동 콘솔 업로드 | 동일한 의존성과 품질 게이트로 재현 가능한 출시 번들을 만들고 실제 배포는 승인 단계로 유지 |
| D12 | 공유 링크 환경 | 출시 `intoss://`, 샌드박스 `intoss-private://` + deployment ID 주입 | 번들마다 바뀌는 테스트 식별자를 코드와 분리하고 출시 전 실제 딥링크를 검증 |
| D13 | 진행 책임 | `ProgressService` 제거, `ProgressRepository`가 유일한 저장 책임 | 저장·revision·재시도 경계를 한 곳으로 모아 중복과 책임 충돌을 방지 |
| D14 | 콘텐츠 타입 | 단일 실행 스키마에서 타입·빌드·런타임 검증 파생 | 정적 타입과 실제 JSON 검증 규칙의 드리프트를 방지 |
| D15 | 테스트 계층 | Vitest·Testing Library + Playwright·axe + Apps in Toss 샌드박스 | 빠른 로직 검증, 실제 브라우저 여정, 플랫폼 SDK 계약을 각자 적합한 계층에서 검증 |
| D16 | 광고 로딩 | 무료 해제 수단이 없는 결과 화면에서만 사전 로드, 사용자 선택 시 표시 | 핵심 퀴즈와 무료 보너스를 방해하지 않으면서 광고 선택 후 대기 시간을 줄이고 공식 load-show 순서를 준수 |
| D17 | 핵심 렌즈 명칭 | `한 수`를 `생활`로 교체 | 의미가 모호하고 생성형 카피처럼 들리는 표현을 피하고 5060 사용자가 내용을 즉시 예상하게 하기 위해 |
| D18 | 보너스 해제 | 첫 보너스 무료, 3일·7일 연속 참여마다 무료권 1장, 이후 선택형 보상 광고 | 세 문제 직후 광고를 요구하는 인색한 인상을 없애고 광고를 추가 가치에 대한 자발적 교환으로 만들기 위해 |

## Accepted scope

### 기본 경험

- 홈, 핵심 퀴즈 3문제, 해설, 결과 화면
- `그때`, `요즘`, `생활` 각 한 문제로 구성된 날짜별 핵심 세트
- KST 날짜 키를 사용하는 일일 세션
- 중간 이탈 후 진행 복구와 당일 중복 완료 방지
- 최근 참여일과 연속 참여일 표시

### 30일 콘텐츠

- 핵심 문제 90개: 30일 × 3카테고리, 날짜별 고정
- 보너스 문제 90개: 카테고리와 난이도 태그가 있는 미풀이 선택 풀
- `content-manifest.json`에 콘텐츠 버전, KST 시작일·종료일, 핵심·보너스 개수를 기록한다.
- 제출 시점부터 최소 30일의 날짜별 핵심 세트가 없으면 출시 빌드를 실패시킨다.
- 모든 문제에 원문을 복제하지 않은 자체 문장, 정답, 해설, 출처명, 출처 URL, 검수일 포함
- `QuestionSchema` 하나에서 TypeScript `Question` 타입, 빌드 검증, 런타임 파싱을 파생한다.
- 중복 문장, 중복 ID, 보기 수, 정답 인덱스, 출처, 카테고리 균형을 확인하는 검증기

### 주제형 보너스

- 결과 화면 뒤에서 `추억·대중문화`, `한국 생활사`, `말·속담·맞춤법`, `디지털 생활`, `생활안전`, `자연·일반상식` 중 하나를 고른다.
- 첫 보너스 세트는 광고 없이 무료이며, 이후에는 무료 보너스권을 먼저 사용하고 보너스권이 없을 때만 보상 광고를 선택할 수 있다.
- 현재 연속 참여가 3일과 7일에 도달할 때마다 무료 보너스권 1장을 지급한다. `streakStartDate + milestone`을 지급 키로 사용해 같은 연속 참여 구간에서 각 보상을 한 번만 지급한다.
- 선택한 주제의 미풀이 문제를 우선해 3개를 구성한다. 해당 주제에 미풀이 문제가 부족하면 다른 주제의 미풀이 문제로 채우고 `다른 주제 포함`을 표시한다.
- 보충 문제는 최근 20개 응답에서 정답률이 낮은 주제에 더 높은 가중치를 준다. 데이터가 부족하면 남은 주제를 균등하게 선택한다.
- 같은 사용자에게 이미 완료한 보너스 문제는 30일 풀을 소진하기 전까지 반복하지 않는다.
- 핵심 문제의 내용과 순서는 개인화하지 않는다.
- 무료 보너스권은 구매·양도·환전할 수 없는 기기 내 이용권이며 현금성 가치가 없다.

### 공유

- 결과 화면에 `친구에게 같은 문제 보내기` 버튼을 둔다.
- 공유 문구에는 날짜, 핵심 점수, 도전 문구를 포함한다.
- 링크에는 검증 가능한 `challenge=YYYY-MM-DD` 날짜 키만 넣는다.
- `ShareLinkFactory`가 `getOperationalEnvironment()` 결과에 따라 출시에서는 `intoss://<appName>`, 샌드박스에서는 `intoss-private://<appName>?_deploymentId=<id>`를 기반으로 링크를 만든다.
- 샌드박스 deployment ID는 테스트 설정으로 주입하고 코드·공유 문구·분석 이벤트에 영구 저장하지 않는다.
- deployment ID가 없거나 환경 확인이 실패하면 공유 버튼을 비활성화하고 점수 문구 복사만 제공한다.
- 수신자는 같은 날짜의 핵심 세 문제를 풀 수 있다.
- 공유 날짜가 오늘이면 기존 `current` 세션을 사용하고, 과거 날짜면 별도 `challenge` 세션으로 연다.
- `challenge` 세션은 연속 참여, 오늘 완료, 알림 자격, 보상 광고, 출시 KPI에 영향을 주지 않는다.
- 30일 콘텐츠 범위 밖이거나 잘못된 날짜는 오늘 퀴즈로 안전하게 안내한다.
- 링크에 개인 식별 정보, 정답, 신뢰해야 하는 점수를 넣지 않는다.

### 분석

- 공식 Analytics 호출은 단일 어댑터 뒤에 둔다.
- 개발 환경에서는 로컬 기록기로 이벤트명과 속성을 확인한다.
- 일시적 실패는 버전이 있는 로컬 큐에 최대 100건·7일간 보관하고 최대 3회 재시도하며 앱 종료를 막지 않는다.
- `quiz_start`와 `core_complete`는 날짜별 세션에 전송 상태를 기록해 같은 기기에서 한 번만 큐에 넣는다.
- 이벤트에는 SDK가 허용하는 경우 `eventId`, `appVersion`, `contentVersion`, `dateKey`, `mode=current|challenge`를 포함한다.
- 사용자·설치 식별과 D1/D7 코호트 중복 제거는 Apps in Toss 공식 Analytics가 제공하는 익명 집계에만 의존하고 앱이 자체 식별자를 만들지 않는다.
- 분석 속성에 문제 본문, 자유 입력, 연락처, 광고 식별자 같은 개인정보를 넣지 않는다.

필수 이벤트:

- `app_open`
- `quiz_start`
- `core_answer`
- `core_complete`
- `result_view`
- `share_attempt`
- `share_complete`
- `bonus_offer_view`
- `bonus_topic_select`
- `bonus_unlock`
- `ad_offer_view`
- `reward_ad_start`
- `reward_ad_complete`
- `reward_ad_fail`
- `bonus_start`
- `bonus_complete`
- `reminder_prompt_view`
- `reminder_consent_result`

`bonus_topic_select`에는 `topic`, `bonus_unlock`에는 `unlockSource=first_free|streak_ticket|reward_ad`를 기록한다. 광고 선택률의 분모는 실제 광고 선택권을 본 `ad_offer_view`로 한정한다.

### 보너스 해제와 보상 광고

- 개발용 모의 어댑터와 프로덕션용 Apps in Toss 어댑터를 같은 인터페이스로 제공한다.
- 광고 그룹 ID와 테스트 여부는 환경 설정으로 주입한다.
- 해제 우선순위는 `첫 보너스 무료 → 무료 보너스권 사용 → 보상 광고 선택`으로 고정한다.
- 첫 무료 사용 여부, 보너스권 잔액, 연속 참여 지급 키를 `ProgressRepository`에 저장한다.
- `current` 핵심 퀴즈 완료 후 결과 화면이 열렸고 무료 해제 수단이 없을 때만 지원 여부를 확인해 광고를 한 번 사전 로드한다.
- 광고 상태는 `idle → loading → ready → showing → rewarded|failed|cancelled`로 관리하고 `ready`에서만 표시한다.
- 결과 화면 이탈, 로드 실패, 광고 완료·취소 후에는 공식 cleanup을 호출하며 다시 필요하면 새로 로드한다.
- 광고 경로에서는 완료 콜백을 받은 경우에만 보너스를 연다.
- `dateKey + attemptId`를 보상 키로 사용하고 같은 키의 중복 콜백은 무시한다.
- 보너스권 사용은 `dateKey + attemptId + ticketId`로 멱등 처리하고, 같은 시도의 더블클릭이나 복구가 잔액을 두 번 줄이지 않게 한다.
- 로드 실패, 사용자 닫기, 타임아웃은 기본 퀴즈 결과에 영향을 주지 않는다.
- 재시도는 사용자가 명시적으로 누를 때만 가능하며 자동 반복 재생하지 않는다.
- 핵심 세 문제, 해설, 결과에는 강제 광고·전면 광고·배너 광고를 넣지 않는다.

### 알림 선택권

- 서로 다른 날짜에 핵심 퀴즈를 2회 완료한 뒤 결과 화면에 비차단 인라인 카드를 표시한다.
- 사용자가 `알려주세요`를 누른 뒤에만 공식 알림 동의 흐름을 시작한다.
- 거절 또는 OS 권한 거부는 저장하고 자동으로 다시 묻지 않는다.
- 사용자는 설정 화면에서 직접 다시 시도할 수 있다.
- 동의한 사용자에게 하루 한 번 오전 9시 KST에 `오늘의 그때·요즘 세 문제가 준비됐어요.` 알림을 보낸다.
- 실제 발송은 Apps in Toss 공식 세그먼트·알림 도구가 지원할 때만 활성화하고, 가능하면 당일 `core_complete` 사용자를 제외한다.
- 당일 완료 사용자 제외가 불가능하면 오전 9시 단일 발송만 허용하고 T00 기능 행렬에 한계를 기록한다.
- 사용자가 설정에서 끄면 공식 구독 해지 또는 앱의 발송 제외 상태를 적용하며 자동 재활성화하지 않는다.
- 공식 예약 발송·해지 계약을 검증하지 못하면 인라인 카드를 포함한 알림 기능 전체를 비활성화한다.

### 출시 게이트

유료 프로모션은 다음 조건을 모두 만족할 때만 시작한다.

- 핵심 퀴즈 완료율: `mode=current`인 고유 `공식 익명 사용자 × dateKey` 중 `core_complete / quiz_start` ≥ 65%
- D1 리텐션 ≥ 30%
- D7 리텐션 ≥ 12%
- 보상 광고 선택률: `reward_ad_start / ad_offer_view` ≥ 15%
- 공유 시도율: `share_attempt / result_view` ≥ 5%

판단은 최소 14일, 핵심 퀴즈 시작 사용자 1,000명, 성숙한 D7 코호트 300명 이상에서 한다. 표본이 부족하면 게이트는 통과가 아니라 `판단 보류`다.

핵심 완료율의 분모는 기간 내 `mode=current`의 `quiz_start`가 기록된 고유 `공식 익명 사용자 × dateKey` 수, 분자는 같은 단위 중 `core_complete`가 기록된 수다. 앱은 `dateKey`와 `mode`만 전송하고 익명 사용자 결합과 중복 제거는 공식 분석 계층이 담당한다. D1과 D7은 Apps in Toss 공식 리텐션 정의를 사용한다. 공식 대시보드가 이 사용자-날짜 단위 커스텀 이벤트 집계를 제공하지 않으면 유료 프로모션 게이트는 계산 불가로 유지하고 집행하지 않는다.

## NOT in scope

- 자체 백엔드, 데이터베이스, 계정, 로그인
- 실시간 친구 대전, 순위표, 친구 관계, 현금성 공유 보상
- 관리자 CMS와 원격 문제 교체
- 생성형 AI로 사용자에게 직접 제공하는 문제 또는 상담
- 배너 광고와 강제 전면 광고
- 인앱결제, 구독, 광고 제거 상품
- 토스 포인트 프로모션의 실제 집행
- 사용자 자유 입력, 연락처 수집, 건강·금융·의료 조언
- 출시 후 30일을 넘는 콘텐츠 자동 생성

## 1. Architecture review

### 전체 구조

```text
┌──────────────── Apps in Toss WebView ────────────────┐
│                                                      │
│  React 화면                                           │
│  ├─ Home ── Quiz ── Result ── Bonus Quiz             │
│  └─ Settings                                          │
│          │                                            │
│          v                                            │
│  Application services                                 │
│  ├─ DailyQuizService                                  │
│  ├─ BonusSelectionService                             │
│  └─ FeatureEligibilityService                         │
│          │                                            │
│          v                                            │
│  Pure domain                                          │
│  ├─ question / session / scoring                      │
│  ├─ KST date-key policy                               │
│  └─ state machines                                    │
│          │                                            │
│          ├──────────────┬──────────────┬───────────┐  │
│          v              v              v           v  │
│  StoragePort      AnalyticsPort   RewardAdPort  SharePort
│  AIT/browser      local/official  mock/official official
│          │              │              │           │  │
│          └──────────────┴──────┬───────┴───────────┘  │
│                               v                      │
│                       ReminderPort                   │
│                       mock/official                  │
└──────────────────────────────────────────────────────┘

Build-time static assets
├─ content-manifest.json     (version, KST range, counts)
├─ core-questions.json       (90)
├─ bonus-questions.json      (90)
├─ QuestionSchema            (type + runtime/build parse)
└─ semantic-validator        (duplicates, balance, sources)
```

React 컴포넌트는 Apps in Toss SDK, 공식 `Storage`, 브라우저 저장소, 현재 시각을 직접 호출하지 않는다. 플랫폼 기능은 포트와 어댑터로 격리한다. 프로덕션과 샌드박스에서는 `@apps-in-toss/web-framework`의 `Storage` 어댑터를, 일반 브라우저 개발에서는 동일 계약의 대체 어댑터를 사용한다. 퀴즈 채점, 날짜 선택, 주제 우선 보너스 구성, 무료권 지급·차감, 기능 노출 자격 계산은 순수 함수로 유지한다.

```text
UI actions / analytics flush
          │
          v
ProgressRepository (single writer)
  ├─ canonical in-memory root
  ├─ revision N → N+1
  └─ serialized promise queue
          │
          v
StoragePort.set(rootKey, serializedRoot)
          │
          ├─ success → committedRevision = N+1
          └─ failure → dirty state 유지 + 명시적 재시도
```

`ProgressRepository` 외의 모듈은 루트 상태를 직접 저장하지 않는다. 큐에 들어간 작업은 생성 순서대로 실행하고, 현재 committed revision보다 낮은 결과는 저장하지 않는다.

### 의존성 방향

```text
UI → application → domain
UI → ports
adapters → ports
adapters → Apps in Toss SDK / browser APIs
data loaders → validated static content
```

역방향 의존은 금지한다. 특히 도메인이 React, SDK, 저장소 구현을 가져오지 않게 한다.

### 핵심 상태 기계

```text
Core quiz
idle → in_progress → completed
          │              │
          └─ restored ───┘

Bonus unlock
locked → first_free ──────────────────────→ bonus_unlocked
       ├─ ticket_available → consumed ───→ bonus_unlocked
       └─ ad_eligible → loading → ready → showing → rewarded
                            │         │       │          │
                            ├─ failed ┘       ├─ failed ┘└→ bonus_unlocked
                            └─ cleanup        └─ cancelled ─→ result

Reminder
ineligible → eligible → offered → accepted → permission_result
                          │          │              ├→ granted
                          └→ declined┘              └→ denied
```

### nil, empty, error paths

- 오늘 날짜의 핵심 세트가 없으면 앱을 중단하지 않고 “오늘 문제를 준비 중이에요”와 재시도 버튼을 보여준다.
- 보너스 미풀이 풀이 3개 미만이면 이미 푼 문제 중 가장 오래된 문제를 낮은 우선순위로 재사용한다.
- 정답률 표본이 없으면 카테고리 균등 선택으로 폴백한다.
- 저장 데이터가 없으면 신규 사용자 상태로 시작한다.
- 저장 데이터가 손상되면 해당 키만 격리하고 빈 상태로 복구한다.
- SDK를 사용할 수 없는 로컬 브라우저에서는 공식 기능 대신 모의 어댑터를 사용한다.

### 확장성과 롤백

180문제는 정적 JSON으로 번들링해도 수백 KB 수준으로 예상되어 MVP 병목이 아니다. 콘텐츠 파일과 UI 코드를 분리해 이후 CDN 또는 API 로더로 교체할 수 있게 한다. 각 외부 기능은 기능 플래그로 끌 수 있어 광고, 공유, 알림, 공식 분석 중 하나가 실패해도 핵심 퀴즈를 유지한다. 전체 사용자 KPI는 클라이언트가 계산하지 않고 공식 대시보드에서 운영자가 판정한다.

### Distribution architecture

```text
Pull request / main push
        │
        v
GitHub Actions
  npm ci
    → typecheck
    → unit/integration tests
    → validate:content
    → production build
    → dist size/hash report
        │
        v
versioned dist artifact
        │
        v  manual approval
Apps in Toss console upload
        │
        v
QR test on iOS + Android
        │
        v
release request
```

콘솔에는 CI가 생성한 `dist` 산출물만 업로드한다. 워크플로는 잠금 파일을 사용하고 Node 버전을 고정하며, 빌드 산출물과 SHA-256을 보관한다. 콘솔 업로드와 출시 요청은 자동화하지 않는다.

## 2. Error and rescue map

| 판별 코드 | 발생 지점 | 복구 경계 | 처리 | 사용자 메시지 | 테스트 |
|---|---|---|---|---|---|
| `CONTENT_SET_MISSING` | 날짜별 핵심 로드 | `DailyQuizService` | 오늘 세트 재탐색 후 실패 반환 | 오늘 문제를 준비 중이에요. 잠시 후 다시 시도해 주세요. | `daily-quiz.missing-set` |
| `CONTENT_WINDOW_EXPIRED` | 빌드·출시 전 검사 | 콘텐츠 검증 CLI | 빌드 또는 제출 중단 | 출시 전 오류이므로 없음 | `content.expired-window` |
| `CONTENT_SCHEMA_INVALID` | 빌드 검증 | 콘텐츠 검증 CLI | 빌드 실패 | 출시 전 오류이므로 없음 | `content.invalid-schema` |
| `STORAGE_READ_INVALID` | 저장 복구 | `ProgressRepository` | 손상 키 격리, 빈 상태 | 이전 기록 일부를 불러오지 못했어요. 오늘 퀴즈는 계속할 수 있어요. | `storage.corrupt-read` |
| `STORAGE_WRITE_FAILED` | 진행 저장 | `ProgressRepository` | 메모리 상태 유지, 결과에서 재시도 | 기록 저장이 원활하지 않아요. 이 화면을 닫기 전에 다시 시도해 주세요. | `storage.failed-write` |
| `STORAGE_STALE_REVISION` | 순차 쓰기 완료 | `ProgressRepository` | 오래된 완료 결과 무시, 최신 dirty 상태 재저장 | 없음 | `storage.stale-revision` |
| `AD_NOT_READY` | 광고 로드 | `RewardAdController` | 결과 유지, 수동 재시도 제공 | 광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요. | `ad.not-ready` |
| `AD_CANCELLED` | 광고 닫기 | `RewardAdController` | 보너스 미해제, 결과 복귀 | 광고가 끝까지 재생되지 않아 보너스가 열리지 않았어요. | `ad.cancelled` |
| `AD_TIMEOUT` | 광고 응답 지연 | `RewardAdController` | 어댑터 종료, 수동 재시도 | 광고 응답이 늦어지고 있어요. 다시 시도해 주세요. | `ad.timeout` |
| `AD_DUPLICATE_REWARD` | 중복 콜백 | `RewardLedger` | 이미 처리한 보상 무시 | 없음 | `ad.duplicate-callback` |
| `ANALYTICS_SEND_FAILED` | 이벤트 전송 | `AnalyticsQueue` | 로컬 큐, 최대 3회 후 만료 | 없음 | `analytics.retry-expire` |
| `ANALYTICS_QUEUE_WRITE_FAILED` | outbox 저장 | `ProgressRepository` | 진행·outbox 확정 보류, 메모리 유지 | 기록 저장이 원활하지 않아요. 다시 시도해 주세요. | `analytics.queue-write-fail` |
| `ANALYTICS_QUEUE_EXPIRED` | 큐 용량·TTL 초과 | `AnalyticsQueue` | 가장 오래된 비핵심 이벤트부터 만료 | 없음 | `analytics.queue-capacity` |
| `CONTENT_CHUNK_LOAD_FAILED` | 보너스 동적 로드 | `BonusSelectionService` | 한 번 재시도 후 결과 복귀 | 보너스 문제를 불러오지 못했어요. | `content.chunk-load-fail` |
| `CONTENT_PARSE_FAILED` | 정적 JSON 파싱 | 콘텐츠 로더 | 핵심은 복구 화면, 보너스는 결과 복귀 | 문제를 불러오지 못했어요. 다시 시도해 주세요. | `content.parse-fail` |
| `BONUS_SELECTION_FAILED` | 주제 우선 선택 | `BonusSelectionService` | 다른 미풀이 주제 보충 후 실패 시 결과 복귀 | 보너스 문제를 준비하지 못했어요. | `bonus.selection-fail` |
| `SHARE_UNAVAILABLE` | 공유 SDK 없음/실패 | `ShareController` | 점수 문구 복사 폴백 | 공유 기능을 열지 못했어요. 문구를 복사해 보세요. | `share.clipboard-fallback` |
| `SHARE_DEPLOYMENT_ID_MISSING` | 샌드박스 링크 생성 | `ShareLinkFactory` | 공유 비활성, 점수 문구 복사 | 테스트 공유 설정이 준비되지 않았어요. | `share.missing-deployment-id` |
| `CLIPBOARD_WRITE_FAILED` | 공유 복사 폴백 | `ShareController` | 선택 가능한 점수 문구 표시 | 문구를 길게 눌러 복사해 주세요. | `share.clipboard-fail` |
| `CHALLENGE_DATE_INVALID` | 딥링크 파싱 | 라우트 로더 | 오늘 문제로 이동 | 지난 도전을 열 수 없어 오늘 문제를 보여드릴게요. | `share.invalid-date` |
| `REMINDER_PERMISSION_DENIED` | OS 권한 결과 | `ReminderController` | 거부 저장, 자동 재요청 금지 | 알림은 켜지 않았어요. 설정에서 언제든 바꿀 수 있어요. | `reminder.denied` |
| `REMINDER_SDK_FAILED` | 동의·해지 SDK 호출 | `ReminderController` | 상태 미변경, 수동 재시도 | 알림 설정을 바꾸지 못했어요. 다시 시도해 주세요. | `reminder.sdk-fail` |

오류는 `ContentError | StorageError | RewardAdError | AnalyticsError | ShareError | ReminderError`의 판별 가능한 유니언으로 정의한다. 각 어댑터는 SDK 오류를 이 타입으로 변환하고 위 표의 복구 경계에서만 처리한다. `catch (error) {}` 같은 무시와 포괄적인 “문제가 발생했습니다”만 표시하는 처리는 금지한다. 예상하지 못한 오류만 최상위 오류 경계에서 복구 안내와 진단 코드를 제공한다.

## 3. Security and threat model

### 데이터 분류

| 데이터 | 등급 | 저장/전송 |
|---|---|---|
| 문제 콘텐츠와 출처 | 공개 | 번들에 포함 |
| 날짜별 진행, 점수, 연속 참여 | 로컬 사용자 데이터 | 기기 저장소 |
| 카테고리별 정답 통계 | 로컬 사용자 데이터 | 기기 저장소 |
| 분석 이벤트 | 비식별 운영 데이터 | 공식 Analytics |
| 광고 그룹 ID | 공개 설정값 | 환경별 빌드 설정 |
| 비밀키 | 사용하지 않음 | 클라이언트에 포함 금지 |

### 위협 등록부

| 위협 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| 조작된 딥링크 날짜 | 중 | 낮음 | 엄격한 날짜 형식, 콘텐츠 범위 확인, 오늘로 폴백 |
| 저장 데이터 조작으로 보너스 해제 | 중 | 낮음 | 현금 가치 없음, 콜백·보상 키 검증; 유료 보상 도입 전 서버 검증 필요 |
| 광고 중복 콜백 | 중 | 중 | 보상 키 멱등성, 상태 기계, 테스트 |
| 분석으로 개인정보 유출 | 낮음 | 중 | 허용 속성 목록, 자유 텍스트 금지, 개발 검증 |
| 오래된 출처/잘못된 정답 | 중 | 중 | 출처·검수일 필수, 자동 검증 + 사람 검수 |
| 외부 URL 삽입 | 낮음 | 중 | 콘텐츠 출처 URL을 `https` 허용 목록으로 검증하고 UI에서 자동 실행 금지 |
| SDK 의존성 취약점 | 낮음 | 중 | 잠금 파일, 의존성 감사, 최소 SDK 표면 |
| 기기 시각 조작 | 중 | 낮음 | 보상 가치가 없는 MVP에서는 수용하고 이상 로그만 남김 |

사용자 입력을 HTML로 렌더링하지 않는다. 문제와 해설도 일반 텍스트 노드로 렌더링한다. 환경 설정에는 비밀을 두지 않으며, 이후 서버 비밀이 필요하면 클라이언트와 분리한다.

## 4. Data flow and interaction edge cases

### 사용자 데이터 흐름

```text
App open
  ↓
KST date key ── validate challenge date
  ↓
load validated core set + restore local session
  ↓
Home → Core 1 → explanation → Core 2 → explanation → Core 3
  ↓
persist completion + emit analytics
  ↓
Result ───────────→ Share adapter ─→ Apps in Toss share
  │
  ├─ eligible reminder? ─→ inline opt-in ─→ permission adapter
  │
  └─ choose bonus topic ─→ Bonus entitlement
                           ├─ first free ───────────┐
                           ├─ ticket → consume ────┤
                           └─ none → Reward ad ────┤
                                                  ↓
                               selected-topic-first selection
                                                  ↓
                                         Bonus 1 → 2 → 3
```

### 상호작용 예외

- 답안 더블클릭: 첫 선택만 상태 전이를 일으키고 이후 입력은 잠근다.
- 다음 버튼 연타: 전환 중 비활성화하고 문제 인덱스를 한 번만 증가시킨다.
- 주제/시작 버튼 연타: 하나의 `attemptId`만 만들고 진행 중 버튼을 비활성화한다.
- 첫 무료 보너스와 무료 보너스권: 복구·더블클릭 상황에서도 해제 또는 차감이 한 번만 일어난다.
- 연속 참여 보너스권: 같은 `streakStartDate + milestone` 지급 키를 다시 처리해도 한 장만 지급한다.
- 광고 버튼 연타: 무료 해제 수단이 없을 때만 하나의 광고 `attemptId`를 만들고 진행 중 버튼을 비활성화한다.
- 광고 중 뒤로가기/앱 백그라운드: 공식 종료 결과를 기다리고 임의로 보상하지 않는다.
- 공유 중 화면 이탈: 공유 완료 여부와 무관하게 퀴즈 결과를 보존한다.
- 오늘 링크는 `current:dateKey`, 과거 링크는 `challenge:dateKey` 저장 키를 사용한다. 과거 도전 완료는 현재 세션과 합치지 않는다.
- 과거 `challenge`에서는 핵심 문제와 결과·재공유만 제공하고 보너스 광고와 알림 자격 계산을 제공하지 않는다.
- 알림 동의 중 화면 이탈: OS 결과가 돌아오면 현재 상태에 안전하게 반영하고 없으면 미결정으로 유지한다.
- 자정 경계: 시작한 세션은 해당 `dateKey`로 끝내고 홈으로 돌아갈 때 새 날짜를 안내한다.
- 낡은 탭 복귀: 현재 KST 날짜와 세션 날짜를 비교해 새 문제 배너를 표시한다.
- 분석 타임아웃: UI를 기다리게 하지 않고 큐에 넣는다.
- 저장 실패: 메모리에서 계속 진행하되 결과에서 재시도를 제공한다.

진행 상태와 분석 outbox는 하나의 버전된 루트 JSON 문서에 함께 기록한다. `ProgressRepository`의 단일 작성자 큐가 revision을 증가시키고 공식 `Storage.setItem`을 순서대로 호출한다. 해당 revision 저장이 성공한 뒤에만 완료 상태와 `core_complete` outbox 항목을 확정한다. 쓰기가 실패하면 최신 상태를 dirty로 유지하고 뒤의 쓰기가 과거 상태로 덮지 못하게 한 뒤 재시도를 안내한다. 전송 성공 후 outbox 제거를 저장하기 전에 앱이 종료되면 같은 `eventId`가 다시 전송될 수 있으므로 공식 분석 계층의 중복 제거 지원을 T00에서 확인한다. 지원하지 않으면 KPI 게이트는 계산 불가로 유지한다.

## 5. Code quality review

- `domain`, `application`, `ports`, `adapters`, `features`, `ui`, `data`의 책임을 구분한다.
- 이벤트명, 저장 키, 오류 코드를 문자열 상수로 중앙화한다.
- `QuestionSchema`를 콘텐츠 구조의 단일 출처로 사용하고 TypeScript 타입을 별도 선언하지 않는다.
- 날짜 계산은 `Clock`과 `KstDateKey`에 모으고 컴포넌트에서 `new Date()`를 직접 사용하지 않는다.
- 퀴즈 진행은 단일 reducer/state machine으로 관리해 분기 폭발을 피한다.
- 광고와 알림 SDK 응답을 도메인 타입으로 변환해 SDK 타입 누수를 막는다.
- `ProgressRepository`만 루트 상태를 저장하며 별도 `ProgressService`를 만들지 않는다.
- 지금은 범용 플러그인 시스템이나 의존성 주입 프레임워크를 도입하지 않는다.
- 콘텐츠 검증기는 런타임 방어가 아니라 빌드 실패를 우선한다.
- 저장 스키마에 `version`을 두고 마이그레이션 함수는 버전별 순수 함수로 작성한다.

## 6. Test review

### 테스트 도구와 책임

| 계층 | 도구 | 책임 |
|---|---|---|
| 도메인·저장 단위 | Vitest | 채점, KST 날짜, 주제 우선 선택, 무료권 멱등성, revision, 오류 유니언 |
| React 컴포넌트 | Vitest + Testing Library | 답안 잠금, 포커스, 오류·빈 상태, 인라인 알림 카드 |
| 브라우저 통합 | Playwright | 핵심·보너스·공유·복구 여정, 새로고침, 더블클릭, 시각 회귀 |
| 자동 접근성 | Playwright + axe | 명칭·역할·대비·키보드·주요 접근성 규칙 |
| 실제 플랫폼 계약 | Apps in Toss 샌드박스 | Storage, Analytics, 광고, 공유, 알림의 실제 SDK 콜백과 권한 |
| 실기기 | iOS + Android QR 테스트 | WebView, 200% 글자, 터치, 뒤로가기, OS 권한 |

### 자동 테스트

| 영역 | 행복 경로 | 실패/경계 |
|---|---|---|
| 채점 | 정답·오답, 3문제 완료 | 중복 답안, 잘못된 인덱스 |
| 날짜 | KST 날짜별 세트 | UTC 자정 차이, 앱 복귀, 범위 밖 날짜 |
| 저장 | 진행+outbox 단일 저장·복구·마이그레이션 | 동시 쓰기 역순 완료, stale revision, 손상 JSON, 쓰기 실패, 전송 후 제거 전 종료, 구버전 |
| 주제형 보너스 | 선택 주제 우선 | 첫 무료, 보너스권 지급·차감, 신규 사용자, 동률, 선택 주제·전체 미풀이 3개 미만 |
| 광고 | 보상 후 1회 해제 | 취소, 타임아웃, 중복 콜백, 연타 |
| 공유 | 출시·샌드박스 링크, 오늘 링크와 과거 challenge 격리 | deployment ID 누락, 변조, 범위 밖 날짜, SDK·클립보드 동시 실패 |
| 알림 | 2회 완료 후 노출·09:00 KST 발송·해지 | 1회 완료, 거부 보존, 예약·SDK 실패 |
| 분석 | 허용 이벤트와 current 사용자-날짜 집계 | 큐 저장 실패, 용량·만료, 3회 재시도, 금지 속성 |
| 콘텐츠 | 180개와 균형 | 중복 ID/문장, 잘못된 정답, 출처 누락 |
| 접근성 | 키보드 진행, 의미 있는 레이블 | 포커스 손실, 색상만으로 상태 전달 |

### ASCII coverage diagram

```text
CODE PATHS                                              USER FLOWS
[PLANNED →UNIT] QuestionSchema + semantic validator     [PLANNED →E2E] Home → Core 1..3 → Result
  ├─ valid 180-question pack                              ├─ correct/incorrect + explanation
  ├─ duplicate/source/date-window failures                ├─ double-click / rapid next
  └─ runtime parse failure                                └─ refresh and resume

[PLANNED →UNIT] Daily quiz domain                       [PLANNED →E2E] Bonus unlock
  ├─ KST date boundary                                    ├─ first free → unlock once
  ├─ current vs challenge isolation                       ├─ 3/7-day ticket → grant/consume once
  └─ score / streak / eligibility                         └─ no ticket → ad success/cancel/duplicate

[PLANNED →INTEGRATION] ProgressRepository               [PLANNED →E2E] Share challenge
  ├─ serialized writes + monotonic revision               ├─ toss vs sandbox link
  ├─ storage failure + dirty retry                         ├─ current vs past challenge
  └─ outbox send/remove crash window                       └─ invalid link + clipboard fallback

[PLANNED →CONTRACT] Platform adapters                   [PLANNED →E2E] Reminder
  ├─ Storage / Analytics                                  ├─ eligible after 2 dates
  ├─ rewarded ad / share                                  ├─ accept / deny / unsubscribe
  └─ reminder                                             └─ unsupported SDK → feature hidden

[PLANNED →A11Y] Components                              [PLANNED →DEVICE] iOS + Android
  ├─ keyboard / focus / labels                            ├─ 360px / 200% text
  ├─ loading/empty/error/partial states                   ├─ WebView back/resume
  └─ reduced motion / non-color status                    └─ real SDK permissions and callbacks

PRE-IMPLEMENTATION COVERAGE: 0 implemented / all listed paths planned
REGRESSION TESTS: none — repository has no application baseline yet
```

### 2am confidence

- 고정 시계와 고정 난수로 날짜·주제 보충 선택·연속 참여 보너스권 테스트의 비결정성을 제거한다.
- 외부 SDK는 계약 테스트와 모의 어댑터로 분리한다.
- 브라우저 E2E는 핵심 완료, 첫 무료·무료권·광고 해제, 딥링크, 새로고침 복구 경로를 최소 보장한다.
- Playwright 스크린숏은 360px 기본, 200% 글자 확대, 결과·오류 상태를 기준 이미지로 고정한다.
- axe 자동 검사는 수동 스크린리더·실기기 검수를 대체하지 않고 빠른 회귀 탐지로 사용한다.
- 360px 화면과 200% 글자 확대를 수동 및 시각 회귀 대상으로 둔다.
- “광고 콜백이 두 번 온다”, “저장소가 꽉 찼다”, “분석 SDK가 계속 실패한다”를 적대적 QA 시나리오로 실행한다.

## 7. Performance review

- 180문제 JSON 목표 크기는 압축 전 500KB 이하로 제한한다.
- 첫 화면에는 핵심 문제 파일만 정적 import하고 보너스 풀은 결과 화면 이전에 지연 로드한다.
- 주제 우선 보너스 선택은 90개 배열의 단일 순회로 충분하며 메모이제이션이 필요 없다.
- 분석 전송은 UI 이벤트를 막지 않는다.
- 로컬 저장은 전체 이벤트 로그가 아니라 집계와 최근 20개 응답만 유지한다.
- 이미지 없이 CSS 중심으로 구성하고 초기 번들 압축 크기 예산을 250KB 이하로 둔다. Apps in Toss SDK 크기는 별도 기록한다.
- 광고는 무료 해제 수단이 없는 결과 화면에서만 비차단으로 사전 로드하며 로드가 느려도 점수·공유·닫기 상호작용에는 영향을 주지 않는다.
- 결과 화면 언마운트와 광고 종료 시 cleanup을 호출해 이벤트 리스너와 광고 리소스를 남기지 않는다.

## 8. Observability review

### 구조화 로그

개발 로그는 `level`, `event`, `errorCode`, `dateKey`, `adapter`, `durationBucket`, `retryCount`만 허용한다. 문제 본문과 개인 식별 정보는 기록하지 않는다.

### 제품 지표

- 핵심 완료율
- D1, D7 리텐션
- 카테고리별 정답률
- 광고 제안 노출, 시작, 완료, 실패
- 공유 시도, 완료
- 알림 카드 노출, 선택, OS 권한 결과
- 콘텐츠 로드 실패와 저장 복구 횟수

KPI 집계와 유료 프로모션 게이트 판정은 앱 내부 기능이 아니다. 운영자가 공식 Analytics 대시보드의 성숙 코호트와 표본 수를 확인해 `paidPromotionEligible` 운영 기록을 변경한다.

별도 백엔드가 없으므로 Analytics SDK와 로컬 outbox 저장이 동시에 실패한 오류는 중앙에서 관찰할 수 없다. 이는 MVP의 명시적 수용 위험이다. 샌드박스 장애 주입과 사용자 제보용 진단 코드로 보완하고, 이 실패가 실제 사용자 세션의 1% 이상으로 추정되면 Phase 2 원격 오류 수집을 앞당긴다.

### 운영 판단

- 공식 대시보드에서 유입 경로별 리텐션을 비교한다.
- 광고 실패율이 10%를 넘거나 핵심 완료율이 전주 대비 10%p 하락하면 광고 기능 플래그를 끄고 조사한다.
- 콘텐츠 오류 신고가 확인되면 해당 문제를 다음 빌드에서 비활성화하고 같은 카테고리 예비 문제로 교체한다.
- 초기에는 별도 관리자 화면을 만들지 않고 `docs/runbook.md`에 재현과 대응 절차를 둔다.

## 9. Deployment and rollout review

### 기능 플래그

- `analyticsOfficialEnabled`
- `rewardAdsEnabled`
- `shareEnabled`
- `reminderEnabled`
- `paidPromotionEligible` — 앱 기능을 자동 변경하는 값이 아니라 운영자가 프로모션 집행 여부를 기록하는 수동 게이트

백엔드와 원격 설정이 없는 MVP에서 앞의 네 플래그는 빌드 시점 설정이다. 출시 후 즉시 바뀌는 원격 킬 스위치로 간주하지 않는다. 각 공식 어댑터는 SDK 오류 시 실패를 닫고 핵심 퀴즈를 유지해야 한다.

### 출시 순서

1. 로컬 브라우저에서 모의 어댑터로 전체 흐름 검증
2. GitHub Actions에서 타입 검사, 테스트, 콘텐츠 검증, 프로덕션 빌드 통과
3. CI `dist` 산출물과 SHA-256 보관
4. Apps in Toss 샌드박스에서 공식 Analytics와 공유 검증
5. 테스트 광고 그룹 ID로 보상 콜백과 중복 방지 검증
6. 알림 인라인 카드와 공식 권한 흐름 검증
7. 180문제 검수 보고서와 접근성 체크 완료
8. `content-manifest.json`이 제출 예정일부터 30일 이상을 덮는지 확인
9. CI 산출물을 콘솔에 수동 업로드하고 iOS·Android QR 테스트
10. 출시 요청
11. 출시 후 24시간 핵심 오류와 퍼널 확인
12. 최소 표본 충족 전까지 유료 프로모션 비활성

### 롤백

- 외부 기능 장애는 어댑터가 실패를 닫아 현재 사용자의 핵심 퀴즈를 유지한다.
- 지속 장애 시 개발 책임자가 해당 빌드 플래그를 끈 알려진 정상 빌드를 만들고 재제출한다. 목표 대응 시간은 장애 확인 후 4시간 이내 빌드 준비이며 실제 배포 시간은 Apps in Toss 검수 시간에 따른다.
- 원격 킬 스위치는 Phase 2 항목이다. 따라서 광고·공유·알림 장애가 핵심 퀴즈까지 전파되지 않는 것이 MVP의 필수 출시 조건이다.
- 콘텐츠 결함은 예비 문제 또는 직전 검수 빌드로 되돌린다.
- 저장 스키마 변경은 이전 버전을 읽을 수 있어야 하며, 실패 시 진행 데이터만 초기화하고 앱 전체를 막지 않는다.

### 출시 후 스모크 테스트

- 신규 사용자 핵심 3문제 완료
- 재방문 사용자 진행 복구
- 같은 날짜 공유 링크 수신
- 첫 보너스는 광고 없이 한 번만 해제
- 3일·7일 연속 참여 보너스권은 지급·차감이 각각 한 번만 처리
- 무료 보너스권이 없을 때 광고 완료 후 보너스 1회 해제
- 광고 취소 후 보너스 미해제와 핵심 결과 유지
- 2회 완료 사용자에게만 알림 카드 노출
- Analytics 이벤트 속성에 금지 데이터가 없는지 확인

## 10. Long-term trajectory review

### 가역적인 선택

- 정적 콘텐츠는 로더 인터페이스를 통해 원격 API로 바꿀 수 있다.
- 로컬 저장소는 포트를 통해 계정 기반 동기화로 바꿀 수 있다.
- 로컬 주제 우선 선택은 추천 서비스로 바꿀 수 있다.
- 기능 플래그는 이후 원격 설정으로 바꿀 수 있다.

### 의도적으로 감수하는 부채

- 기기 변경 시 기록이 이어지지 않는다.
- 기기 시각 조작을 막지 않는다.
- 광고 보상을 서버에서 검증하지 않는다.
- 로컬 루트 문서에 기록된 분석 outbox는 앱 종료 후에도 복구한다. 저장소 쓰기 자체가 실패해 메모리에만 남은 이벤트에 한해 앱 종료 시 유실될 수 있다.

이 부채는 현금성 보상, 순위표, 결제가 없는 MVP에서만 허용한다. 그중 하나를 도입하기 전에 계정·백엔드·서버 검증을 선행한다.

### 단계별 확장

- Phase 1: 현재 계획의 30일 로컬 MVP
- Phase 2: 지표 통과 후 원격 콘텐츠 운영, 문제 신고, 실험 설정
- Phase 3: 계정 동기화, 친구 기록, 광고 제거 결제 또는 구독 검토

## 11. Design and UX review

### 선택된 시각 방향

- A안 `한 장 달력`의 차분한 흰 바탕, 짧은 노란 날짜선, 토스 블루 CTA를 최종 방향으로 사용한다.
- 날짜는 홈 상단에만 간결하게 표시하고 전체 높이의 사이드 날짜 레일은 사용하지 않는다.
- 접힌 종이 모서리와 과한 달력 장식은 시선을 분산하므로 사용하지 않는다.
- 핵심 렌즈는 `그때 · 요즘 · 생활`, 보너스는 여섯 주제 선택 카드로 표현한다.
- 보너스 CTA는 현재 상태에 따라 `첫 이용 무료`, `무료 보너스권으로 시작`, `광고 보고 시작` 중 하나만 주 행동으로 보여 준다.
- 최종 목업 기준 파일: `docs/assets/geuttae-yojeum-final-a-v6.png`

### 정보 구조

```text
Home
├─ 오늘의 3문제 시작
├─ 연속 참여
└─ 설정
     └─ 알림 다시 설정

Quiz
├─ 진행 1/3
├─ 질문 + 네 보기
├─ 정답/오답 + 해설
└─ 다음 문제

Result
├─ 핵심 점수
├─ 친구에게 같은 문제 보내기
├─ 보너스 3문제 제안
└─ 조건 충족 시 알림 선택 카드

Bonus Topic
├─ 여섯 주제 중 하나 선택
├─ 첫 무료/보너스권/광고 중 현재 해제 수단 안내
└─ 선택한 주제로 시작

Bonus Quiz
└─ 선택 주제 우선 3문제 → 최종 결과
```

### 감정 곡선

```text
편안한 초대 → 익숙함/호기심 → 작은 성취 → 이해의 만족
          → 친구와 나누고 싶은 마음 → 선택적 추가 도전 → 내일의 기대
```

### 상태 완성도

- 로딩: 스켈레톤보다 짧은 텍스트와 고정 레이아웃을 사용한다.
- 빈 상태: 오늘 세트 없음과 보너스 소진을 구분한다.
- 오류: 원인에 맞는 복구 행동을 한 개 이상 제공한다.
- 성공: 과한 폭죽보다 명확한 점수, 따뜻한 문장, 다음 선택을 제공한다.
- 부분 성공: 광고/공유/알림 실패가 핵심 퀴즈 성공을 덮지 않게 한다.

| 화면/행동 | 로딩 | 빈 상태 | 오류 | 성공 | 부분 성공 |
|---|---|---|---|---|---|
| 홈 | 날짜 세트 준비 문구 | 오늘 세트 없음 | 재시도 | 시작 CTA | 이전 기록 복구 실패 안내 |
| 핵심 퀴즈 | 세션 복구 중 | 해당 없음 | 콘텐츠 복구 안내 | 답안·해설·다음 | 저장 실패 배너 |
| 결과 | 점수 계산 중 | 해당 없음 | 결과 재구성 | 점수·공유·보너스 | 외부 기능별 실패만 표시 |
| 보너스 주제 | 이용권 상태 확인 | 여섯 주제 모두 소진 | 결과로 돌아가기 | 주제·해제 수단 확정 | 선택 주제 부족 시 다른 주제 포함 안내 |
| 보너스 | 문제 풀 지연 로드 | 전체 미풀이 3개 미만 | 결과로 돌아가기 | 선택 주제 우선 3문제 | 오래된 완료 문제 재사용 안내 |
| 설정 | 권한 상태 확인 | 알림 API 없음 | 다시 확인 | 현재 상태 표시 | OS에서 직접 변경 안내 |
| 광고 | 무료 해제 수단이 없을 때만 준비 | 광고 재고 없음 | 재시도/닫기 | 보너스 1회 해제 | 취소 시 결과 유지 |
| 공유 | 공유창 준비 | SDK 없음 | 문구 복사 | 공유 완료 | 취소해도 결과 유지 |
| 알림 | OS 흐름 대기 | 기능 비활성 | 설정 안내 | 동의 상태 저장 | 거부 상태 보존 |

### 5060 접근성 기준

- 본문 기본 18px 이상, 질문 22px 이상
- 주요 터치 영역 최소 52×52px
- 줄간격 1.5 이상, 한 줄 길이 과도하게 길지 않게 제한
- 정답/오답을 색, 아이콘, 텍스트로 함께 구분
- 시간 제한과 자동 넘김 없음
- 키보드 포커스와 스크린리더 레이블 제공
- 360px 너비와 200% 글자 확대에서도 핵심 행동 유지
- 진입 시 광고, 알림 동의, 페이월, 설명 모달 금지

구현 전 `plan-design-review`, 구현 후 `design-review`를 실행해 시각 품질과 상태 누락을 별도로 검증한다.

## Failure modes registry

| 실패 모드 | 조기 신호 | 영향 | RESCUED? | TEST? | USER SEES? | LOGGED? | 소유 |
|---|---|---|---|---|---|---|---|
| 콘텐츠가 너무 어렵다 | 완료율·정답률 하락 | D1/D7 하락 | 난이도 조정 빌드 | 표본 사용성 검수 | 쉬운 해설과 다음 문제 | 카테고리 정답률 | 콘텐츠 |
| 콘텐츠 오류 | 특정 문항 이탈·신고 | 신뢰 손상 | 예비 문제 교체 빌드 | 2차 팩트체크 | 수정 전에는 오류 문항 노출 가능 | 문항별 이탈 | 콘텐츠 |
| 콘텐츠 기간 만료 | `CONTENT_WINDOW_EXPIRED` | 홈 진입 불가 | 출시 빌드 차단 | `content.expired-window` | 출시 전에는 없음 | CI 기록 | 콘텐츠 |
| 콘텐츠 청크·파싱 실패 | 보너스/핵심 로드 실패 | 퀴즈 일부 또는 전체 중단 | 재시도·결과 복귀·복구 화면 | `content.chunk-load-fail`, `content.parse-fail` | 구체적 재시도 안내 | Analytics가 살아 있을 때만 중앙 기록 | 콘텐츠 |
| 보너스 선택 실패 | 폴백 카운터 | 추가 도전 중단 | 균등 폴백·결과 복귀 | `bonus.selection-fail` | 준비 실패 안내 | 오류 코드 | 제품 |
| 광고가 핵심처럼 보임 | 결과 이탈 증가 | 리텐션 손상 | 광고 비활성 빌드 | 결과 흐름 E2E | 선택형 제안만 봄 | 제안·시작률 | 제품 |
| 광고 보상 중복 | 중복 콜백 카운터 | 수익·경험 왜곡 | 멱등 원장 | `ad.duplicate-callback` | 보너스는 한 번만 열림 | 오류 코드 | 광고 |
| 광고 SDK 장애 | 실패율 10% 초과 | 보너스·수익 중단 | 실패 닫기 + 비활성 빌드 | 취소·타임아웃 E2E | 재시도/닫기 | 실패 사유 | 광고 |
| 공유 링크 불일치 | 날짜 폴백 증가 | 차별점 붕괴 | 환경별 링크 팩토리·오늘 문제 폴백 | `share.invalid-date`, `share.missing-deployment-id` | 폴백 또는 설정 누락 안내 | 유입 사유 | 공유 |
| 공유와 복사 모두 실패 | SDK·클립보드 오류 | 공유 불가 | 선택 가능한 문구 표시 | `share.clipboard-fail` | 길게 눌러 복사 안내 | Analytics가 살아 있을 때만 중앙 기록 | 공유 |
| 알림 요청이 성급함 | 거부율 상승 | 신뢰 손상 | 2회 완료 자격 | `reminder.denied` | 인라인 선택 카드 | 동의 결과 | 리텐션 |
| 알림 SDK·발송 계약 실패 | T00 또는 SDK 오류 | 재방문 자동화 중단 | 기능 전체 비활성 | `reminder.sdk-fail` | 기능 미노출 또는 재시도 | 오류 코드 | 리텐션 |
| 분석 이벤트 누락 | 이벤트 계약 실패 | 사업 판단 불가 | 로컬 큐·집행 잠금 | `analytics.retry-expire` | 없음 | 큐 만료 카운터 | 분석 |
| 분석과 중앙 오류 관찰 동시 실패 | 큐 저장·SDK 장애 | 원격 진단 불가 | 로컬 큐·수동 QA; 위험 수용 | `analytics.queue-write-fail` | 저장 실패 안내 또는 없음 | 중앙 기록 불가 | 분석 |
| 유료 프로모션 조기 집행 | 표본·KPI 미달 | 예산 낭비 | 수동 게이트 | 운영 체크리스트 | 없음 | 승인 기록 | 성장 |
| 로컬 기록 손상 | 복구 카운터 | 연속 참여 소실 | 부분 초기화 | `storage.corrupt-read` | 복구 안내 | 오류·스키마 버전 | 저장 |
| 5060 가독성 실패 | 오답·중도 이탈 | 핵심 타깃 이탈 | UI 수정 빌드 | 360px·200%·실사용 QA | 잘림/조작 어려움 | 완료율·QA 기록 | 디자인 |

각 행의 `TEST?`는 2절 오류·복구 표 또는 6절 테스트 항목과 연결한다. `RESCUED?`가 빌드 재배포인 항목은 런타임 즉시 복구가 아님을 운영 런북에 명시한다.

## Pre-implementation go/no-go

애플리케이션 골격을 만들기 전에 공식 Apps in Toss 문서와 샌드박스로 다음 기능 행렬을 확인한다.

| 기능 | 확인 항목 | MVP 판단 |
|---|---|---|
| Analytics | 현재 WebView SDK 버전, 커스텀 이벤트, 자동 익명 사용자·D1·D7 집계 | 공식 리텐션과 핵심 퍼널을 계산할 수 없으면 유료 프로모션은 영구 비활성으로 출시하거나 출시를 보류 |
| 보상 광고 | 테스트 광고 그룹, 완료·취소·실패 콜백, 정책상 허용 위치 | 완료 콜백과 테스트 환경을 검증하지 못하면 수익화 MVP 출시 보류 |
| 공유 | 공식 공유 링크 생성, 환경 감지, 샌드박스 deployment ID, 날짜 파라미터 보존, 실패 결과 | 사용할 수 없거나 테스트 ID가 없으면 점수 문구 복사만 제공하고 공유 KPI 게이트는 계산 불가 처리 |
| 알림 | 동의 API, 발송 자격, 사용자 거부 상태 | 사용할 수 없으면 알림 기능만 비활성화하며 핵심 출시를 막지 않음 |

결과는 `docs/sdk-capability-matrix.md`에 문서화한다. 함수명, 최소 버전, 샌드박스 결과, 실패 폴백이 모두 채워지기 전에는 T01 이후 작업에 공식 어댑터를 연결하지 않는다.

## Content production plan

180문제 제작은 첫 6시간의 엔지니어링 작업과 별도로 진행하는 출시 준비 트랙이다. 최종 편집 책임자는 사업자 대표이며, AI는 초안과 중복 탐지에만 사용할 수 있고 사실 확인과 최종 승인은 사람이 한다.

| 기간 | 산출물 | 검수 |
|---|---|---|
| 1일차 | 스키마, 문체·난이도 가이드, 출처 기준, 예시 12문제 | 세 카테고리와 정답 근거 합의 |
| 2~6일차 | 하루 24문제씩 120문제 초안 | 당일 1차 출처 확인 |
| 7~9일차 | 나머지 60문제와 예비 문제 | 중복·균형 자동 검사 |
| 10~12일차 | 전체 180문제 독립 2차 팩트체크와 문장 교정 | 정답·해설·출처 URL·검수일 승인 |
| 13일차 | 30일 날짜 편성, 매니페스트 고정 | 제출 예정일부터 30일 범위 확인 |
| 14일차 | 표본 사용자 가독성·난이도 검수와 수정 | 콘텐츠 검증기 및 빌드 통과 |

하루 24문제의 초안 생산보다 최종 승인 품질을 우선한다. 180개 전부가 두 차례 검수되지 않으면 출시하지 않는다.

## Temporal interrogation: hours 1–6

### Hour 1 — 프로젝트와 경계

- T00 SDK 기능 행렬을 먼저 완료하고 React + TypeScript + Apps in Toss WebView 템플릿 버전을 공식 문서로 확인한다.
- `domain/application/ports/adapters/features/ui/data` 경계를 먼저 만든다.
- 개발 환경은 모의 어댑터, 샌드박스는 공식 어댑터를 사용하도록 설정 계약을 확정한다.

### Hour 2 — 도메인과 콘텐츠 계약

- Question, Session, Progress, BonusEntitlement, RewardAttempt 타입을 정의한다.
- KST 날짜 키, 날짜별 핵심 선택, 연속 참여 보너스권 지급, 주제 우선 보너스 선택을 순수 함수로 만든다.
- 콘텐츠 JSON 스키마와 검증기를 먼저 통과시키고 샘플 데이터로 테스트한다.

### Hour 3 — 저장과 복구

- 저장 스키마 버전과 마이그레이션을 만든다.
- 중간 진행, 완료, 정답 집계, 알림 거부, 첫 무료 사용 여부, 보너스권과 지급·사용 키, 광고 보상 키를 저장한다.
- 손상 JSON과 쓰기 실패 테스트를 만든다.

### Hour 4 — 핵심 UI

- 홈 → 핵심 3문제 → 해설 → 결과의 세로형 흐름을 구현한다.
- 52px 터치 영역, 18px 본문, 텍스트 진행률, 키보드 포커스를 적용한다.
- 답안·다음 버튼 연타를 막는다.

### Hour 5 — 외부 기능 어댑터

- Analytics, RewardAd, Share, Reminder 포트와 모의 구현을 연결한다.
- 공식 SDK는 기능 탐지와 환경 설정 뒤에서만 활성화한다.
- SDK 실패가 핵심 퀴즈를 중단하지 않는지 확인한다.

### Hour 6 — 핵심 통합 경로

- 첫 무료 → 연속 참여 보너스권 → 보상 광고 순의 멱등 해제와 주제형 보너스 흐름을 연결한다.
- 공유 날짜 딥링크와 잘못된 날짜 폴백을 연결한다.
- 두 번째 날짜 완료 후 알림 카드가 노출되는지 고정 시계로 검증한다.

## Implementation tasks

- [ ] T00. 공식 SDK 기능 행렬을 작성하고 Analytics·보상 광고의 출시 필수 기능을 샌드박스에서 검증한다.
- [ ] T01. 공식 문서 기준으로 프로젝트를 생성하고 품질 명령(`typecheck`, `test`, `build`, `validate:content`)과 GitHub Actions 출시 후보 빌드를 고정한다.
- [ ] T02. 도메인 타입, KST 날짜 정책, 핵심 세트 선택, 점수 상태 기계를 테스트 우선으로 만든다.
- [ ] T03. 콘텐츠 스키마·검증기를 만들고 핵심 90개와 보너스 90개를 출처 검수해 채운다.
- [ ] T04. 공식 Storage 어댑터와 단일 작성자 `ProgressRepository`로 진행·Analytics outbox·revision을 저장하고 복구한다.
- [ ] T05. 홈·핵심 퀴즈·해설·결과·보너스 주제 선택·보너스·설정 화면을 5060 접근성 기준으로 구현한다.
- [ ] T06. Analytics 포트, 로컬 기록기, 공식 어댑터, 실패 큐와 이벤트 계약 테스트를 만든다.
- [ ] T07. 첫 무료·3일/7일 보너스권·보상 광고의 해제 우선순위, 멱등 지급·차감, 조건부 광고 사전 로드·cleanup·타임아웃·취소를 구현한다.
- [ ] T08. 여섯 주제 선택, 선택 주제 우선 보너스 구성, 약한 주제 보충과 소진 폴백을 구현한다.
- [ ] T09. 실행 환경별 같은 날짜 공유 링크, `current|challenge` 세션 격리, 점수 문구, 복사 폴백, 잘못된 링크 처리를 구현한다.
- [ ] T10. 2회 완료 후 알림 인라인 카드, 오전 9시 KST 발송 운영 계약, 공식 동의·해지 어댑터, 거부 보존을 구현한다.
- [ ] T11. Vitest·Testing Library·Playwright·axe 테스트와 Apps in Toss 샌드박스·모바일 수동 검수표를 완료한다.
- [ ] T12. CI 산출물 업로드 절차, 기능 플래그, 출시 스모크 테스트, 장애 대응 런북, KPI 게이트 문서를 완성한다.

## Implementation tasks JSONL

```jsonl
{"id":"T00","title":"Verify Apps in Toss SDK capability matrix","dependsOn":[],"acceptance":["current SDK versions and functions documented","analytics and rewarded-ad sandbox callbacks verified","share production and sandbox link contracts verified","reminder fallbacks decided from evidence","go/no-go recorded"]}
{"id":"T01","title":"Scaffold Apps in Toss webview project and CI","dependsOn":["T00"],"acceptance":["typecheck/test/build/validate:content commands exist","GitHub Actions stores versioned dist and SHA-256","Node and lockfile are enforced","mock adapters run in local browser"]}
{"id":"T02","title":"Implement quiz domain and KST date policy","dependsOn":["T01"],"acceptance":["pure domain tests pass","core set is deterministic by KST date","double answer cannot advance twice"]}
{"id":"T03","title":"Build and validate 180-question content runway","dependsOn":["T02"],"acceptance":["one executable schema drives types, build validation, and runtime parsing","90 core and 90 bonus questions","content manifest covers 30 KST days from release","all sources and review dates present","duplicate and balance checks pass"]}
{"id":"T04","title":"Implement single-writer versioned progress and analytics outbox","dependsOn":["T02"],"acceptance":["progress and outbox share one root document","writes are serialized by a single repository","revision never moves backward","refresh restores progress","corrupt data recovers safely","recent 20 answers retained"]}
{"id":"T05","title":"Build accessible core UI","dependsOn":["T02","T04"],"acceptance":["home-core-result-bonus-settings flow works","360px and 200 percent zoom remain usable","keyboard and screen-reader labels verified"]}
{"id":"T06","title":"Add analytics adapters and event contract","dependsOn":["T01","T04"],"acceptance":["local recorder shows required events","current user-date KPI unit is reproducible","official adapter is feature gated","failed events retry at most three times","PII properties rejected"]}
{"id":"T07","title":"Add rewarded ad adapters, preload lifecycle, and idempotent reward","dependsOn":["T01","T04"],"acceptance":["mock and official adapters share contract","result screen preloads once without blocking core interactions","show runs only from ready state","cleanup runs on unmount and terminal events","cancel and timeout do not unlock bonus","duplicate callback unlocks once"]}
{"id":"T08","title":"Implement adaptive bonus selection","dependsOn":["T03","T04","T07"],"acceptance":["weak category receives higher weight","new users receive balanced set","unseen questions preferred"]}
{"id":"T09","title":"Implement environment-aware same-date sharing","dependsOn":["T00","T03","T05"],"acceptance":["production and sandbox schemes are selected by runtime environment","sandbox deployment ID is injected and never hard-coded","valid link opens identical core set","past challenge is isolated from current streak and KPIs","invalid date falls back safely","SDK and clipboard failure preserve selectable copy"]}
{"id":"T10","title":"Implement post-value reminder consent and operations contract","dependsOn":["T00","T04","T05"],"acceptance":["shown after two distinct completed dates","daily send is limited to 09:00 KST","decline and unsubscribe are preserved","official scheduling unsupported disables the feature"]}
{"id":"T11","title":"Complete automated and manual QA","dependsOn":["T05","T06","T07","T08","T09","T10"],"acceptance":["Vitest and Testing Library suites pass","Playwright core journeys and visual snapshots pass","axe has no serious or critical violations","Apps in Toss sandbox contract matrix passes","ad and storage chaos cases pass","iOS and Android accessibility checklist completed"]}
{"id":"T12","title":"Prepare rollout and operations","dependsOn":["T11"],"acceptance":["CI artifact is the only console upload input","manual upload and iOS/Android QR test are documented","feature flags documented","smoke tests pass in sandbox","KPI gate and runbook ready","paid promotion remains disabled"]}
```

## Eng review findings

| ID | Section | Severity | Decision | Status |
|---|---|---|---|---|
| E1 | Architecture | P1 | 공식 Apps in Toss Storage + 브라우저 개발 어댑터 | ACCEPTED |
| E2 | Architecture | P1 | 단일 작성자 저장 큐 + 단조 증가 revision | ACCEPTED |
| E3 | Architecture | P1 | GitHub Actions 검증 산출물 + 수동 콘솔 업로드 | ACCEPTED |
| E4 | Architecture | P1 | 출시·샌드박스 환경별 공유 링크 팩토리 | ACCEPTED |
| E5 | Code quality | P2 | `ProgressService` 제거, Repository로 책임 통합 | ACCEPTED |
| E6 | Code quality | P2 | 단일 실행 콘텐츠 스키마 | ACCEPTED |
| E7 | Tests | P1 | Vitest·Testing Library·Playwright·axe·샌드박스 계층 | ACCEPTED |
| E8 | Performance | P2 | 무료 해제 수단이 없을 때의 조건부 광고 사전 로드와 lifecycle cleanup | ACCEPTED |

## Inline diagram maintenance

구현 시 다음 파일에 비자명한 상태 전이 또는 파이프라인 ASCII 주석을 둔다.

- `src/services/progress-repository.ts` — 단일 작성자 큐, revision, dirty retry
- `src/services/reward-ad-controller.ts` — `load → ready → show → terminal → cleanup`
- `src/domain/session.ts` — `current|challenge`가 연속 참여·광고·KPI에 미치는 차이
- `src/services/share-link-factory.ts` — toss/sandbox 스킴과 실패 폴백
- `tests/e2e/quiz-journeys.spec.ts` — 핵심·광고·공유·알림 여정의 테스트 경계

인접 로직을 변경할 때 주석 다이어그램과 본 문서의 상태 기계를 같은 변경에서 갱신한다.

## Worktree parallelization strategy

사용자는 전체 출시 범위를 하나의 마일스톤으로 유지하기로 결정했다. 구현은 아래 의존성을 지키는 범위에서만 병렬화할 수 있다.

| Step | Modules touched | Depends on |
|---|---|---|
| Foundation | config, domain, ports, CI | T00 |
| Content | data, schema, validation scripts | Foundation |
| Persistence | storage adapters, repository | Foundation |
| Core UI | features, ui | Foundation + Persistence |
| Platform adapters | analytics, ads, share, reminder | Foundation + Persistence |
| QA and rollout | tests, workflows, docs | Content + Core UI + Platform adapters |

```text
Lane A: Foundation → Persistence → Core UI
Lane B: Foundation → Content
Lane C: Foundation → Platform adapters
                         │
Lane D: merge A+B+C → QA and rollout
```

Lane B와 C는 Foundation 계약이 고정된 뒤 병렬 실행할 수 있다. Core UI와 Platform adapters는 모두 결과 화면을 건드릴 수 있으므로 `features/result` 변경은 한 lane에서 순차 통합한다. 모든 lane은 한 출시 후보에 합쳐지며 기능을 후속 출시로 미루지 않는다.

## Eng Review Implementation Tasks

이 목록은 엔지니어링 검토에서 새로 확정된 작업만 담는다.

- [ ] **E1 (P1, human: ~2h / CC: ~20m)** — Storage — 공식 Storage와 브라우저 대체 어댑터를 같은 포트로 구현
  - Surfaced by: Architecture — 웹 저장소 대신 플랫폼 기본 기능 재사용
  - Files: `src/ports/storage.ts`, `src/adapters/apps-in-toss-storage.ts`, `src/adapters/browser-storage.ts`
  - Verify: 두 어댑터의 공통 계약 테스트
- [ ] **E2 (P1, human: ~3h / CC: ~25m)** — Persistence — 단일 작성자 큐와 revision 보호 구현
  - Surfaced by: Architecture — 비동기 쓰기 역순 완료가 최신 상태를 덮는 경쟁
  - Files: `src/services/progress-repository.ts`, `src/services/progress-repository.test.ts`
  - Verify: 역순 완료·실패·dirty 재시도 테스트
- [ ] **E3 (P1, human: ~2h / CC: ~15m)** — Distribution — 재현 가능한 GitHub Actions 출시 후보 빌드
  - Surfaced by: Architecture — 수동 로컬 빌드만으로는 동일 산출물 보장 불가
  - Files: `.github/workflows/ci.yml`, `package.json`
  - Verify: 타입·테스트·콘텐츠·빌드 통과와 `dist` SHA-256 artifact
- [ ] **E4 (P1, human: ~2h / CC: ~20m)** — Sharing — 실행 환경별 딥링크 팩토리
  - Surfaced by: Architecture — 샌드박스 deployment ID가 번들마다 변경
  - Files: `src/services/share-link-factory.ts`, `src/services/share-link-factory.test.ts`
  - Verify: toss/sandbox/ID 누락 계약 테스트
- [ ] **E5 (P2, human: ~30m / CC: ~5m)** — Boundaries — `ProgressService`를 만들지 않고 Repository로 책임 통합
  - Surfaced by: Code quality — 중복 저장·재시도 경계
  - Files: `src/services/progress-repository.ts`, `src/application/daily-quiz.ts`
  - Verify: 저장 호출자가 Repository 한 곳인지 정적 검색
- [ ] **E6 (P2, human: ~2h / CC: ~15m)** — Content — 실행 스키마에서 타입·빌드·런타임 검증 파생
  - Surfaced by: Code quality — 타입과 검증 CLI 드리프트
  - Files: `src/domain/question-schema.ts`, `scripts/validate-content.ts`
  - Verify: 동일한 잘못된 fixture가 빌드와 런타임에서 같은 코드로 실패
- [ ] **E7 (P1, human: ~6h / CC: ~45m)** — Testing — 자동·브라우저·플랫폼 계약 테스트 기반 구축
  - Surfaced by: Test review — 테스트 계층과 소유권 미정
  - Files: `vitest.config.ts`, `playwright.config.ts`, `tests/`
  - Verify: CI에서 unit/component/E2E/axe 통과, 샌드박스 매트릭스 수동 승인
- [ ] **E8 (P2, human: ~2h / CC: ~15m)** — Ads — 결과 화면 사전 로드와 cleanup 상태 기계
  - Surfaced by: Performance — 버튼 클릭 후 로드 지연과 리스너 누수
  - Files: `src/services/reward-ad-controller.ts`, `src/services/reward-ad-controller.test.ts`
  - Verify: load-show-load 순서, unmount cleanup, 중복 콜백 테스트

## TODO updates

### Accepted now

- 30일 콘텐츠 180문제와 검증기
- 같은 날짜 핵심 문제 공유
- 공식 Analytics 준비
- 공식 보상 광고 준비
- 가치 경험 후 알림 선택
- 여섯 주제 선택형 보너스와 첫 무료·연속 참여 보너스권
- KPI 통과 전 유료 프로모션 잠금

### Deferred

- 원격 콘텐츠 CMS와 문제 신고 운영
- 계정·서버 동기화
- 실시간 친구 경쟁과 순위표
- 광고 제거 결제·구독
- 서버 광고 보상 검증
- 원격 기능 플래그와 실험 플랫폼

### Engineering review

새로운 P3 후속 TODO는 없다. E1~E8은 모두 현재 출시 범위에 포함했고 사용자는 각 완전한 옵션을 선택했다.

## Completion summary

- 기준 MVP는 유지하면서 반복 이용, 공유, 측정, 광고 안전성에 직접 기여하는 7개 CEO 확장과 디자인 검토의 보너스 정책 개선을 채택했다.
- 백엔드, 계정, 결제, 실시간 경쟁은 제외해 출시 복잡도를 통제했다.
- 180문제는 핵심 90개와 여섯 주제의 보너스 풀 90개로 나눠 공유 공정성과 사용자 선택을 양립시켰다.
- 외부 SDK는 모두 어댑터와 기능 플래그 뒤에 두어 실패와 롤백을 격리했다.
- 유료 프로모션은 최소 표본과 다섯 KPI를 모두 충족하기 전까지 잠근다.
- Eng Step 0: 전체 범위를 단일 출시 마일스톤으로 유지.
- Architecture Review: 4개 이슈 발견, E1~E4로 모두 반영.
- Code Quality Review: 2개 이슈 발견, E5~E6으로 모두 반영.
- Test Review: ASCII diagram과 테스트 계획 작성, 미반영 테스트 갭 0개.
- Performance Review: 1개 이슈 발견, E8로 반영.
- Failure modes: 무테스트·무복구·무표시의 치명적 공백 0개.
- Outside voice: 미실행.
- Parallelization: Foundation 이후 3개 작업 lane, 최종 QA는 순차 통합.
- Lake Score: 8/8 권고에서 완전한 옵션 선택.
- Design Review: A안 확정, 날짜 레일·접힌 모서리 제거, `생활` 명칭, 여섯 보너스 주제, 무료 보너스권 정책을 최종 목업과 범위에 반영.

## Unresolved decisions

없음. SDK의 실제 함수명과 지원 버전은 구현 시작 시 공식 문서에서 확인하는 실행 항목이며 제품 범위 결정은 아니다.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAN | 7 proposals, 7 accepted, 0 deferred; independent score 5→8→9/10 |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | Not run |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAN | 8 issues, 0 critical gaps; all accepted and folded into plan |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAN | A안 확정; 6개 UX 결정과 무료 보너스권 흐름을 계획·목업에 반영 |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | Not run |

**VERDICT:** CEO + ENG + DESIGN CLEARED — ready for implementation

NO UNRESOLVED DECISIONS
