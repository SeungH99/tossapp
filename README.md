# 그때요즘

5060 사용자가 큰 글씨로 편안하게 푸는 앱인토스 퀴즈 미니앱입니다.

## 현재 구현된 흐름

- 하루 기본 3문제: 그때 → 요즘 → 생활
- 답안 잠금, 즉시 채점, 출처가 있는 짧은 해설
- 점수 결과와 같은 문제 공유
- 6가지 보너스 주제 선택
- 첫 보너스 3문제 무료
- 이후 보상형 광고 또는 보너스권으로 3문제 추가
- 앱 종료·새로고침 뒤 기본/보너스 진행 복원
- 등록 날짜가 없는 날에도 보유 문제 자동 순환

## 실행

```bash
npm install
npm run dev:web
```

검사와 빌드:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

`npm run build`가 성공하면 프로젝트 루트에 `geuttae-yojeum.ait`가 생성됩니다.

## 출시 후보 검증

Node 24에서 의존성을 잠금 파일 그대로 설치하고 전체 출시 계약을 실행합니다.

```bash
npm ci
npm run verify:release
```

자동 검사가 끝나면
[`docs/release/apps-in-toss-sandbox-checklist.md`](docs/release/apps-in-toss-sandbox-checklist.md)를
iOS와 Android Apps in Toss 샌드박스 QR에서 완료해야 합니다. CI의 `.ait`는 테스트
광고 ID를 사용하므로 콘솔 업로드 전에 운영 광고 그룹 ID로 다시 빌드합니다.
체크리스트는 운영 artifact provenance부터 콘솔 업로드, QR 검증, 출시 승인,
출시 후 확인과 롤백까지 실제 순서를 포함합니다.

## 출시 전 설정

`.env.example`을 참고해 앱인토스 콘솔의 실제 보상형 광고 그룹 ID를
`VITE_REWARDED_AD_GROUP_ID`로 설정해야 합니다. 값이 없으면 공식 테스트 광고
ID가 사용되므로 실제 수익은 발생하지 않습니다.

콘솔에 등록한 앱 이름이 다르면 아래 두 곳을 같은 값으로 바꿉니다.

- `granite.config.ts`의 `appName`
- `src/services/quiz-share.ts`의 `intoss://` 딥링크

문제와 출처는 `src/data/questions.ts`에서 관리합니다.

## 프로젝트 문서

- [디자인 시스템](DESIGN.md)
- [변경 기록](CHANGELOG.md)
- [후속 작업](TODOS.md)
- [MVP 설계](docs/superpowers/specs/2026-07-27-geuttae-yojeum-mvp-design.md)
- [CEO 검토 계획](docs/superpowers/specs/2026-07-27-geuttae-yojeum-ceo-review.md)
- [엔지니어링 테스트 계획](docs/superpowers/specs/2026-07-28-geuttae-yojeum-eng-test-plan.md)
