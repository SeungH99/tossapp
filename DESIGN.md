# 그때요즘 Design System

Status: approved

Updated: 2026-07-28

Audience: 50–60대 사용자를 중심으로 한 앱인토스 퀴즈 미니앱

## Product Character

그때요즘은 시험지가 아니라 편안한 일일 퀴즈다. 화면은 사용자를 평가하거나 재촉하지 않고, 현재 상황과 다음 행동을 짧고 정확하게 알려야 한다.

1. 큰 글자와 한 화면 한 행동을 우선한다.
2. 기술 용어보다 사용자가 지금 할 수 있는 일을 먼저 말한다.
3. 오류를 숨기지 않되 겁주지 않는다.
4. 팝업은 되돌릴 수 없는 행동을 확인할 때만 사용한다.
5. 색상·아이콘만으로 상태를 전달하지 않는다.
6. 날짜, 장식, 접힌 카드처럼 핵심 행동과 경쟁하는 요소를 늘리지 않는다.

## Approved Visual Reference

M1/M2 저장·복구 상태는 A 방향을 기준으로 한다.

```text
C:\Users\seung\.gstack\projects\SeungH99-tossapp\designs\
  m1-m2-persistence-states-20260728\approved-A-final.html
```

핵심 원칙은 설명 카드 안에서 저장 상태를 안내하고, 저장 자체가 불가능한 경우에만 차분한 전체 화면을 사용하는 것이다.

## Color Tokens

| Token | Value | Use |
|---|---:|---|
| `--color-text-primary` | `#10233f` | 제목, 본문, 핵심 숫자 |
| `--color-text-secondary` | `#4e5968` | 설명, 보조 정보 |
| `--color-text-muted` | `#6b7684` | 출처, 부가 설명 |
| `--color-brand` | `#0064ff` | 주 행동, 진행, 선택 |
| `--color-brand-soft` | `#f5f9ff` | 정답 설명, 선택 배경 |
| `--color-accent` | `#ffc633` | 짧은 구분선과 따뜻한 강조 |
| `--color-canvas` | `#f2f4f6` | 앱 바깥 배경 |
| `--color-surface` | `#ffffff` | 카드와 화면 |
| `--color-border` | `#d9dee5` | 기본 경계 |
| `--color-disabled` | `#e5e8eb` | 비활성 행동 |
| `--color-warning-text` | `#7a4b00` | 저장 실패·저장 없음 안내 |
| `--color-warning-bg` | `#fff4d6` | 저장 실패·저장 없음 배경 |
| `--color-danger` | `#b42323` | 되돌릴 수 없는 삭제 행동 |

일반 문자는 배경과 4.5:1 이상의 명암비를 유지한다. 비활성 버튼도 색상만으로 이유를 설명하지 않고 버튼 문구와 인접 상태 문구를 함께 제공한다.

## Typography

기본 글꼴은 다음 순서다.

```css
font-family:
  Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic",
  sans-serif;
```

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Brand display | `48–68px` | 700–800 | `1.04–1.12` |
| Screen title | `27–34px` | 700–800 | `1.35–1.45` |
| Question | `27–34px` | 700–800 | `1.45` |
| Primary body | `18px` minimum | 500–700 | `1.6–1.7` |
| Button | `18–19px` | 700–800 | `1.3` |
| Metadata | `16px` minimum | 500–700 | `1.5` |

저장 실패, 복구, 삭제 범위처럼 행동 결정에 필요한 문장은 `18px` 미만으로 만들지 않는다.

## Spacing and Shape

8px 수직 리듬을 기본으로 하되 작은 내부 정렬에는 4px 반 단위를 허용한다.

```text
space: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
radius: 12, 14, 16, 20
screen/reference frame radius: 28
```

- 모바일 화면 좌우 여백: 기본 `24px`, 360px 이하 `18px`
- 카드 내부 여백: `20–24px`
- 주요 행동 높이: `58–60px`
- 모든 터치 행동 영역: 최소 `52×52px`
- 같은 계층의 요소는 같은 radius와 border 두께를 사용한다.

## Component Vocabulary

### Primary button

- 화면당 기본 하나
- brand blue 배경과 흰 글자
- 저장 중에는 문구를 `잠시만요` 또는 `저장 중…`으로 바꾸고 비활성화
- spinner만으로 상태를 전달하지 않음

### Secondary button

- 흰 배경, neutral border
- `돌아가기`, `홈으로`처럼 안전한 보조 행동에 사용

### Danger button

- 흰 배경과 danger border/text
- 화면 맨 아래에 배치
- 자동 포커스를 주지 않음
- `모든 기록 지우기`처럼 결과를 구체적으로 표현

### Explanation card

- `brand-soft` 배경
- 정오 결과, 짧은 설명, 저장 상태 순서
- 정상 퀴즈에서 별도 팝업을 만들지 않음

### Inline persistence status

- 설명 카드 아래 구분선 뒤에 배치
- 저장 중: `기록을 저장하고 있어요`
- 저장 실패: `기록을 남기지 못했어요` + 설명 + `다시 저장`
- 저장 실패 시 정답과 설명은 화면에 유지

### Recovered notice

- 현재 화면 상단에서 한 번만 표시
- 문구:

  > 기록을 확인해 불러왔어요.
  >
  > 마지막 답변이 보이지 않으면 다시 선택해주세요.

- `확인`을 누르면 같은 복구 사건에서는 다시 표시하지 않음

### No-save mode

- 모든 퀴즈·결과 화면 상단에 warning 배경으로 고정
- 문구: `이번 기록은 저장되지 않아요`
- 진입 행동: `저장 없이 오늘 퀴즈 보기`
- 결과에서 연속 참여와 보너스 이용권에 반영되지 않음을 다시 안내

### Recovery screen

정보 순서는 다음과 같다.

```text
그때요즘
  └─ 기록을 안전하게 열지 못했어요
      ├─ 기존 기록 보존 안내
      ├─ 다시 불러오기 (primary)
      ├─ 저장 없이 오늘 퀴즈 보기 (secondary)
      └─ 기록 초기화 알아보기 (tertiary)
```

### Reset confirmation

- 별도 확인 화면을 사용
- 삭제 대상: 퀴즈 진행, 연속 참여, 보너스 이용권
- `돌아가기`가 primary
- `모든 기록 지우기`는 마지막 danger action
- 완료 문구: `기록을 정리했어요. 오늘 퀴즈부터 다시 시작할 수 있어요`

## Content Voice

### Use

- `기록을 남기지 못했어요`
- `답은 그대로예요`
- `다시 저장하면 이어갈 수 있어요`
- `기존 기록은 그대로 보관해두었어요`
- `이번 기록은 저장되지 않아요`

### Avoid

- `데이터 오류`, `checksum`, `revision`, `migration`
- `예기치 않은 문제가 발생했습니다`
- `재시도하시겠습니까?`
- 사용자를 평가하는 `실력이 부족해요`, `난이도를 낮췄어요`
- AI 문체처럼 느껴지는 추상 표현과 과도한 감탄

## Interaction States

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Progress load | `오늘 퀴즈를 불러오고 있어요` | 새 진행상태로 홈 표시 | recovery screen | 기존 화면 복원 | recovered notice |
| Answer save | 설명 유지 + `기록을 저장하고 있어요` | 해당 없음 | inline retry, Next 잠금 | Next 활성화 | 해당 없음 |
| Bonus start | 선택 상태 유지 + 시작 버튼 잠금 | 가능한 문항 없음 안내 | 이용권·세션 유지 + 재시도 | bonus quiz 이동 | 해당 없음 |
| No-save quiz | 상단 warning 유지 | 해당 없음 | 기존 recovery screen 복귀 | 점수만 표시 | streak·ticket 미반영 |
| Reset | 해당 없음 | 해당 없음 | 삭제 실패 안내 + 재시도 | 새 홈 + 완료 문구 | 해당 없음 |

## Responsive Rules

- 제품 화면은 `320–480px` 단일 열을 기본으로 한다.
- `480px` 이상에서는 화면 폭을 더 늘리지 않고 중앙 정렬한다.
- 360px 이하에서는 좌우 여백을 줄이되 글자와 터치 높이는 줄이지 않는다.
- 하단 행동은 `env(safe-area-inset-bottom)`을 포함한다.
- 제목, 상태 문구, 버튼이 잘려 가로 스크롤이 생기지 않아야 한다.
- 긴 한국어 문장은 단어 단위로 자연스럽게 줄바꿈하고 말줄임표로 핵심 행동을 숨기지 않는다.

## Accessibility

- 저장 중 상태: `aria-live="polite"`로 한 번 알리고 포커스를 옮기지 않음
- 저장 실패: `role="alert"`로 알리되 사용자 포커스를 강제로 이동하지 않음
- recovery·reset 전체 화면: 화면 제목에 프로그래밍 방식으로 최초 포커스
- 진행 숫자: `진행 2 / 3`처럼 접근 가능한 이름 제공
- 정답·오답: 색상과 함께 텍스트·기호 사용
- 모든 버튼: Tab 이동과 Enter/Space 활성화
- `prefers-reduced-motion: reduce`에서 회전·전환 애니메이션 제거
- 시간제한, 자동으로 사라지는 핵심 메시지, 진입 직후 광고·모달을 사용하지 않음

## Review Checklist

- 첫 5초 안에 현재 화면과 주 행동을 이해할 수 있는가?
- 저장 실패 뒤에도 사용자가 선택한 답이 남아 있는가?
- 기록되지 않는 행동을 시작 전에 알렸는가?
- 삭제 범위와 되돌릴 수 없음을 실행 전에 설명했는가?
- 기술 용어 없이 다음 행동을 말했는가?
- 320px 폭, 큰 글자, 긴 문구에서 가로 스크롤이 없는가?
- 스크린리더가 상태를 한 번만 적절한 우선순위로 읽는가?
