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

- [ ] `quality` 성공
- [ ] `e2e-chromium` 성공
- [ ] `e2e-webkit` 성공
- [ ] `release-build` 성공
- [ ] artifact의 `geuttae-yojeum.ait` 다운로드와 파일 열기 성공
- [ ] CI artifact는 테스트 광고 ID 검증용이며 운영 업로드 artifact와 구분됨

## 콘솔·환경 설정

- [ ] 콘솔 앱 이름과 `granite.config.ts`의 `appName`이 `geuttae-yojeum`으로 일치
- [ ] 운영 빌드에 실제 보상형 광고 그룹 ID가 주입됨
- [ ] 운영 빌드가 `ait-ad-test-rewarded-id`를 사용하지 않음
- [ ] 저장소·로그·trace·artifact에 인증서·토큰·사용자 식별 정보가 없음
- [ ] `quiz_start`, `answer_submitted`, `quiz_completed`, `bonus_start` 이벤트가 Analytics 콘솔에 수신됨

## 네이티브 기능

- [ ] Storage에 첫 답이 저장되고 앱 재진입 후 같은 해설 화면이 복원됨
- [ ] 보상형 광고 끝까지 시청 시 보너스가 정확히 한 번 열림
- [ ] 보상형 광고 취소 시 보너스가 열리지 않고 다시 시도할 수 있음
- [ ] 보상 콜백 중복 발생 시 보너스권 또는 세션이 중복 지급되지 않음
- [ ] 공유 완료 후 앱 재진입 시 결과 화면과 저장 상태가 유지됨
- [ ] Storage·Analytics·광고·공유 중 하나가 실패해도 핵심 퀴즈를 계속 풀 수 있음

## iOS QR

- [ ] 360px급 화면에서 홈·해설·결과·보너스 제안 잘림 없음
- [ ] 시스템 글자 크기 200%에서 가로 스크롤과 주요 버튼 잘림 없음
- [ ] 핵심 3문제 완료
- [ ] 첫 무료 보너스 3문제 완료
- [ ] 공유 후 재진입

## Android QR

- [ ] 360px급 화면에서 홈·해설·결과·보너스 제안 잘림 없음
- [ ] 시스템 글자 크기 200%에서 가로 스크롤과 주요 버튼 잘림 없음
- [ ] 핵심 3문제 완료
- [ ] 첫 무료 보너스 3문제 완료
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
