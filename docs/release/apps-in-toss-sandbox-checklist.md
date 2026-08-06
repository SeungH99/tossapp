# Apps in Toss 샌드박스 출시 체크리스트

## 실행 정보

- 커밋 SHA:
- 승인된 운영 `.ait` artifact 이름:
- 승인된 운영 `.ait` 파일 크기:
- 승인된 운영 `.ait` SHA-256 checksum:
- artifact owner:
- 확인자:
- 확인일:
- iOS 기기·OS:
- Android 기기·OS:

## 자동 게이트

- [x] PR #9 run `30998763833`의 `quality` 성공
- [x] PR #9 run `30998763833`의 `e2e-chromium` 성공
- [x] PR #9 run `30998763833`의 `e2e-webkit` 성공
- [x] PR #9 run `30998763833`의 `release-build` 성공
- [x] runner-produced snapshot 승인 commit `fddfc95`, provenance report commit `04d3495` 확인
- [x] final fix wave 로컬 재검증: lint(`.gstack`만 제외), typecheck, 29 files·282 Vitest, 콘텐츠 12/1,080/360, concept map 1,260, Playwright 84/84, production build 성공
- [ ] artifact의 `geuttae-yojeum.ait` 다운로드와 파일 열기 성공
- [ ] CI artifact는 테스트 광고 ID 검증용이며 운영 업로드 artifact와 구분됨

로컬 final fix wave 테스트 artifact: `geuttae-yojeum.ait`, 417,718 bytes,
SHA-256 `F3C474C8A1A7CD6335B2236A8E93084BB4743B3EFBD7A717B4B62D88A1E8AE78`,
deployment ID `019fd1dc-658a-74e1-b7a5-f2dab3c79e55`. 운영 업로드 승인을 뜻하지 않는다.

## 출시 콘텐츠·진행도 계약

- [x] 출시 인벤토리: 총 12팩·1,080문제·360세트
- [x] 기본 퀴즈: 6팩·540문제·180세트
- [x] 보너스 카탈로그는 `nostalgia`(120세트·360문제), `korean-life`(30세트·90문제), `language`(30세트·90문제)만 순서대로 노출
- [x] 모든 출시 core/bonus 행은 전역적으로 고유한 semantic `conceptId`를 가짐
- [x] V1/V2/V3 진행도를 V4로 보존 마이그레이션하고, 답 제출 즉시 question ID·concept ID를 기록
- [x] `2026-08-14-then-18-v1`은 최초 공개된 김장 문항·`korean-life-kimjang-community-winter-preparation` 의미를 정확히 유지하며 활성 V3 세션도 같은 payload로 복원
- [x] 181-entry append-only 역사 매핑은 모든 기존 production ID(`bonus-language-2`의 `웬일` 포함)를 덮고, 현재 문항과 병합한 1,260-entry `concept-map.json`은 `check:concept-map`이 비변이·바이트 단위로 확인
- [x] 알 수 없는 역사 ID는 question ID 이력만 보존하고 임의의 concept ID를 만들지 않음
- [x] 로컬 프로필 단위 중복 방지: 반복 세트는 이용권 소비 전에 건너뛰며 활성 세션 복원은 유지
- [x] KST 날짜가 바뀌어도 미완료 core와 bonus를 원래 날짜·저장된 문제 순서로 복원하며 새 이용권·광고 보상·`bonus_start`를 만들지 않고 3/3 완료 가능
- [x] 보너스 시작의 `releasedSetCount`는 manifest/catalog 실제 수량을 domain·repository에 명시적으로 전달하며, 30-set 주제의 set 30은 권리 변경 없이 `exhausted`로 거부
- [x] 180일·1,260 seen question IDs·1,243 seen concept IDs·UUID 보상/명령을 포함한 V4 최댓값 fixture는 499,798 bytes/slot, 999,596 bytes/dual-slot로 512 KiB/slot·1 MiB total 예산 안에서 round-trip
- [x] 저장 압축은 완료된 과거 세션 답안만 제거하고 활성 core/bonus 답안, 최신 core 결과, 완료 대기 bonus 답안, 180일 streak, 중복 방지·보상·명령 ledger를 보존
- [x] 문제 제목 42자 경계는 grapheme cluster 기준이며 ASCII·분해 문자·ZWJ emoji의 41/42 경계를 `Intl.Segmenter`와 deterministic fallback에서 모두 검증
- [x] 공개 세트가 소진되면 `새 문제 준비 중`을 표시하고 콘텐츠를 재순환하지 않음

## 콘솔·환경 설정

- [ ] 콘솔 앱 이름과 `granite.config.ts`의 `appName`이 `geuttae-yojeum`으로 일치
- [ ] 운영 빌드에 실제 보상형·배너 광고 그룹 ID가 모두 주입됨
- [ ] 운영 빌드가 `ait-ad-test-rewarded-id`, `ait-ad-test-banner-id`를 사용하지 않음
- [ ] 저장소·로그·trace·artifact에 인증서·토큰·사용자 식별 정보가 없음
- [ ] `quiz_start`, `answer_submitted`, `quiz_completed`, `bonus_start` 이벤트가 Analytics 콘솔에 수신됨

## 네이티브 기능

- [ ] Storage에 첫 답이 저장되고 앱 재진입 후 같은 해설 화면이 복원됨
- [ ] 보상형 광고 끝까지 시청 시 보너스가 정확히 한 번 열림
- [ ] 보상형 광고 취소 시 보너스가 열리지 않고 다시 시도할 수 있음
- [ ] 보상 콜백 중복 발생 시 보너스권 또는 세션이 중복 지급되지 않음
- [ ] 배너 광고가 기본·보너스 문제에는 없고 결과 화면의 이용권 안내 아래에만 표시됨
- [ ] 배너 광고 재고 없음·미지원 시 결과 화면에 96px 빈 영역이 남지 않음
- [ ] 공유 완료 후 앱 재진입 시 결과 화면과 저장 상태가 유지됨
- [ ] Storage·Analytics·광고·공유 중 하나가 실패해도 핵심 퀴즈를 계속 풀 수 있음

## iOS QR

- [ ] 360px급 화면에서 홈·해설·결과·보너스 제안 잘림 없음
- [ ] 시스템 글자 크기 200%에서 가로 스크롤과 주요 버튼 잘림 없음
- [ ] 핵심 3문제 완료
- [ ] 첫 무료 보너스 3문제 완료
- [ ] 결과 화면 하단 배너 노출·클릭·앱 복귀 확인
- [ ] 공유 후 재진입

## Android QR

- [ ] 360px급 화면에서 홈·해설·결과·보너스 제안 잘림 없음
- [ ] 시스템 글자 크기 200%에서 가로 스크롤과 주요 버튼 잘림 없음
- [ ] 핵심 3문제 완료
- [ ] 첫 무료 보너스 3문제 완료
- [ ] 결과 화면 하단 배너 노출·클릭·앱 복귀 확인
- [ ] 공유 후 재진입

## GitHub main 보호 설정

저장소 관리자 권한으로 Settings → Rules → Rulesets에서 `main` 대상 규칙을 만들고
Require status checks to pass를 켠 뒤 아래 네 검사를 정확히 추가한다.

- [ ] `quality`
- [ ] `e2e-chromium`
- [ ] `e2e-webkit`
- [ ] `release-build`

## 운영 출시 순서

- [ ] 운영 광고 그룹 ID를 주입한 clean build에서 승인 후보 `.ait` 생성
- [ ] 승인된 운영 `.ait`의 커밋 SHA·파일 크기·SHA-256 checksum·artifact owner를 실행 정보에 기록
- [ ] 승인자와 artifact owner가 기록값을 실제 운영 `.ait`와 대조
- [ ] Apps in Toss 콘솔에 승인된 운영 `.ait` 업로드
- [ ] 콘솔이 표시하는 앱 이름·버전·업로드 결과를 실행 정보와 대조
- [ ] 업로드한 동일 artifact로 iOS와 Android QR·샌드박스 검증 완료
- [ ] QR 검증 결과와 알려진 제한 사항을 출시 승인자에게 인계
- [ ] 출시 요청을 제출하고 승인 완료
- [ ] 승인된 출시 시각과 실제 노출 시각을 기록

## 출시 후 확인

- [ ] 운영 환경에서 앱 열기 → 핵심 3문제 → 결과 화면의 핵심 smoke 완료
- [ ] 보너스 진입·보상형 광고·공유의 운영 smoke 완료
- [ ] `app_open`, `quiz_start`, `answer_submitted`, `quiz_completed`, `bonus_start` 지표 유입 확인
- [ ] 오류율·퀴즈 완료율·광고 성공/취소율이 롤백 판단 기준 안에 있음
- [ ] 출시 직후와 24시간 후 smoke·지표 확인 시각, 결과, 확인자 기록

## 롤백 준비와 실행

- 마지막 정상 커밋 SHA:
- last-known-good 콘솔 출시 버전·출시일:
- 마지막 정상 `.ait` artifact 이름·파일 크기·SHA-256 checksum:
- 마지막 정상 artifact owner:
- 롤백 판단 기준:
- 롤백 판단 담당자:
- 롤백 실행 담당자:

- [ ] 마지막 정상 커밋 SHA와 `.ait` artifact checksum을 콘솔의 last-known-good 출시 버전에 연결해 기록
- [ ] 핵심 퀴즈 진입/완료 불가, 저장 손상, 중복 보상, 급격한 오류율 상승을 롤백 판단 기준에 포함
- [ ] 기준 초과 시 롤백 판단 담당자가 중단·롤백 여부와 실행 담당자를 확정
- [ ] 현재 MVP에는 원격 feature flag 또는 kill switch가 없으므로 비활성화 단계는 건너뛰고 기존 출시 버전 롤백으로 즉시 진행
- [ ] 향후 원격 플래그가 추가된 경우에만 exact key·owner·비활성화 확인 결과를 artifact provenance와 체크리스트에 기록
- [ ] [공식 Apps in Toss 출시 가이드 4-2](https://developers-apps-in-toss.toss.im/development/deploy.html#id-4-2) 확인
- [ ] 콘솔의 `앱 출시` 메뉴에서 기존 출시 버전 목록 확인
- [ ] provenance와 대조한 뒤 last-known-good 출시 버전 선택
- [ ] `출시하기`를 눌러 즉시 롤백
- [ ] 롤백 반영 직후 핵심 smoke와 지표 확인

### 기존 정상 출시 버전이 없는 경우 fallback

- [ ] 기존 정상 출시 버전이 전혀 없는 경우에만 fallback으로 새 번들 경로 진행
- [ ] 문제 콘텐츠가 원인이면 해당 콘텐츠 commit revert 후 검증 명령을 다시 실행하고 운영 `.ait` 재빌드
- [ ] 새 artifact의 SHA·크기·checksum·owner를 기록하고 iOS·Android QR 검증
- [ ] 새 운영 `.ait`를 rebuild/upload하고 검토 요청 → 승인 → 출시
- [ ] fallback 출시 반영 직후 핵심 smoke와 지표 확인

## 최종 승인

- [ ] 위 항목이 모두 완료됨
- 출시 승인자:
- 승인 시각:
