# Apps in Toss 샌드박스 출시 체크리스트

## 실행 정보

- 커밋 SHA:
- `.ait` artifact 이름:
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

## 최종 승인

- [ ] 위 항목이 모두 완료됨
- 출시 승인자:
- 승인 시각:
