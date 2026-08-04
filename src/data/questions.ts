import {
  createBonusQuestion,
  createCoreQuestion,
  type BonusQuestion,
  type BonusTopic,
  type CoreLens,
  type CoreQuestionInput,
  type Question,
} from "../domain/question";
import { expandedBonusQuestions } from "./bonus-questions-expanded";
import { augustCoreQuestions } from "./core-questions-august";

type LegacyCoreQuestionInput = Omit<
  CoreQuestionInput,
  "contentVersion" | "reviewStatus" | "reviewedAt"
>;

const auditedLegacyReviewMetadata = {
  contentVersion: "legacy",
  reviewStatus: "reviewed" as const,
  reviewedAt: "2026-08-04",
};

const coreQuestionSeed: LegacyCoreQuestionInput[] = [
  {
    id: "2026-07-28-then-public-phone",
    dateKey: "2026-07-28",
    lens: "then",
    topic: "nostalgia",
    prompt: "예전 공중전화에서 통화를 더 이어가려면 무엇을 넣었을까요?",
    choices: ["전화카드", "동전", "우표"],
    answerIndex: 1,
    explanation: "안내음이 들리면 동전을 더 넣어 통화를 이어갔어요.",
    source: {
      name: "국가기록원 생활사 자료",
      url: "https://www.archives.go.kr/",
    },
  },
  {
    id: "2026-07-28-now-qr",
    dateKey: "2026-07-28",
    lens: "now",
    topic: "digital",
    prompt: "스마트폰 카메라로 네모난 무늬를 비추는 기능은 무엇일까요?",
    choices: ["QR 코드", "블루투스", "절전 모드"],
    answerIndex: 0,
    explanation: "QR 코드를 비추면 연결된 정보나 주소를 열 수 있어요.",
    source: {
      name: "디지털배움터",
      url: "https://www.xn--2z1bw8k1pjz5ccumkb.kr/",
    },
  },
  {
    id: "2026-07-28-life-gas",
    dateKey: "2026-07-28",
    lens: "life",
    topic: "safety",
    prompt: "가스 냄새가 날 때 가장 먼저 할 일은 무엇일까요?",
    choices: ["전등 켜기", "창문 열기", "선풍기 켜기"],
    answerIndex: 1,
    explanation: "불꽃이나 전기 스위치를 피하고 창문을 열어 환기해요.",
    source: {
      name: "한국가스안전공사",
      url: "https://www.kgs.or.kr/",
    },
  },
  {
    id: "2026-07-29-then-hodori",
    dateKey: "2026-07-29",
    lens: "then",
    topic: "nostalgia",
    prompt: "1988년 서울 올림픽을 상징한 호랑이 마스코트는 누구일까요?",
    choices: ["호돌이", "꿈돌이", "수호랑"],
    answerIndex: 0,
    explanation: "호돌이는 1988년 서울 올림픽의 공식 마스코트였어요.",
    source: {
      name: "국가기록원",
      url: "https://www.archives.go.kr/",
    },
  },
  {
    id: "2026-07-29-now-airplane-mode",
    dateKey: "2026-07-29",
    lens: "now",
    topic: "digital",
    prompt: "스마트폰의 비행기 모드는 무엇을 잠시 끄는 기능일까요?",
    choices: ["이동통신 연결", "화면 밝기", "사진 앨범"],
    answerIndex: 0,
    explanation: "비행기 모드는 이동통신 같은 무선 연결을 한꺼번에 꺼요.",
    source: {
      name: "디지털배움터",
      url: "https://www.xn--2z1bw8k1pjz5ccumkb.kr/",
    },
  },
  {
    id: "2026-07-29-life-emergency",
    dateKey: "2026-07-29",
    lens: "life",
    topic: "safety",
    prompt: "불이 나거나 응급환자가 생겼을 때 누르는 번호는 무엇일까요?",
    choices: ["110", "112", "119"],
    answerIndex: 2,
    explanation: "화재·구조·구급 신고는 119로 해요.",
    source: {
      name: "소방청",
      url: "https://www.nfa.go.kr/",
    },
  },
  {
    id: "2026-07-30-then-cassette",
    dateKey: "2026-07-30",
    lens: "then",
    topic: "nostalgia",
    prompt: "카세트테이프를 앞부분으로 돌릴 때 누르던 버튼은 무엇일까요?",
    choices: ["되감기", "녹음", "일시정지"],
    answerIndex: 0,
    explanation: "다시 처음부터 들으려면 되감기 버튼으로 테이프를 돌렸어요.",
    source: {
      name: "국립민속박물관",
      url: "https://www.nfm.go.kr/",
    },
  },
  {
    id: "2026-07-30-now-screenshot",
    dateKey: "2026-07-30",
    lens: "now",
    topic: "digital",
    prompt: "스마트폰에 보이는 화면을 사진처럼 저장하는 기능은 무엇일까요?",
    choices: ["화면 캡처", "통화 대기", "자동 회전"],
    answerIndex: 0,
    explanation: "화면 캡처를 하면 현재 화면이 이미지로 저장돼요.",
    source: {
      name: "디지털배움터",
      url: "https://www.xn--2z1bw8k1pjz5ccumkb.kr/",
    },
  },
  {
    id: "2026-07-30-life-wet-plug",
    dateKey: "2026-07-30",
    lens: "life",
    topic: "safety",
    prompt: "젖은 손으로 전기 플러그를 만지면 위험한 까닭은 무엇일까요?",
    choices: ["감전될 수 있어서", "소리가 커져서", "전기가 느려져서"],
    answerIndex: 0,
    explanation: "물기가 전기를 통하게 해 감전 위험을 높일 수 있어요.",
    source: {
      name: "한국전기안전공사",
      url: "https://www.kesco.or.kr/",
    },
  },
  {
    id: "2026-07-31-then-tteokguk",
    dateKey: "2026-07-31",
    lens: "then",
    topic: "korean-life",
    prompt: "설날에 새해를 맞으며 먹는 대표 음식은 무엇일까요?",
    choices: ["떡국", "냉면", "팥빙수"],
    answerIndex: 0,
    explanation: "설날에는 한 해의 시작을 기념하며 떡국을 먹는 풍습이 있어요.",
    source: {
      name: "국립민속박물관",
      url: "https://www.nfm.go.kr/",
    },
  },
  {
    id: "2026-07-31-now-smishing",
    dateKey: "2026-07-31",
    lens: "now",
    topic: "digital",
    prompt: "수상한 문자 속 주소를 눌러 정보를 빼내는 사기는 무엇일까요?",
    choices: ["스미싱", "스트리밍", "블루투스"],
    answerIndex: 0,
    explanation:
      "문자메시지의 악성 주소로 피해를 유도하는 수법을 스미싱이라고 해요.",
    source: {
      name: "경찰청",
      url: "https://www.police.go.kr/",
    },
  },
  {
    id: "2026-07-31-life-crosswalk",
    dateKey: "2026-07-31",
    lens: "life",
    topic: "safety",
    prompt: "횡단보도를 건너기 전에 먼저 확인해야 할 것은 무엇일까요?",
    choices: ["좌우 차량", "휴대전화 화면", "뒤 사람의 속도"],
    answerIndex: 0,
    explanation: "신호를 확인하고 좌우 차량이 멈췄는지 살핀 뒤 건너요.",
    source: {
      name: "한국도로교통공단",
      url: "https://www.koroad.or.kr/",
    },
  },
  {
    id: "2026-08-01-then-onggi",
    dateKey: "2026-08-01",
    lens: "then",
    topic: "korean-life",
    prompt: "예전 장독대의 장독에는 주로 무엇을 담았을까요?",
    choices: ["된장과 간장", "옷과 이불", "책과 공책"],
    answerIndex: 0,
    explanation: "장독에는 된장·간장·고추장 같은 장류를 보관했어요.",
    source: {
      name: "국립민속박물관",
      url: "https://www.nfm.go.kr/",
    },
  },
  {
    id: "2026-08-01-now-wifi",
    dateKey: "2026-08-01",
    lens: "now",
    topic: "digital",
    prompt: "와이파이 표시는 스마트폰이 무엇에 연결됐다는 뜻일까요?",
    choices: ["무선 인터넷", "충전기", "손전등"],
    answerIndex: 0,
    explanation: "와이파이는 가까운 공유기를 통해 무선 인터넷에 연결해요.",
    source: {
      name: "디지털배움터",
      url: "https://www.xn--2z1bw8k1pjz5ccumkb.kr/",
    },
  },
  {
    id: "2026-08-01-life-gas-valve",
    dateKey: "2026-08-01",
    lens: "life",
    topic: "safety",
    prompt: "가스레인지를 다 쓴 뒤 확인하면 좋은 것은 무엇일까요?",
    choices: ["가스 밸브 잠금", "냉장고 문 열기", "전등 모두 켜기"],
    answerIndex: 0,
    explanation: "사용 뒤에는 불이 꺼졌는지 보고 가스 밸브를 잠가요.",
    source: {
      name: "한국가스안전공사",
      url: "https://www.kgs.or.kr/",
    },
  },
  {
    id: "2026-08-02-then-dano",
    dateKey: "2026-08-02",
    lens: "then",
    topic: "korean-life",
    prompt: "단오에 즐기던 대표적인 민속놀이는 무엇일까요?",
    choices: ["그네뛰기", "스키", "볼링"],
    answerIndex: 0,
    explanation: "단오에는 그네뛰기와 씨름 같은 놀이를 즐겼어요.",
    source: {
      name: "국립민속박물관",
      url: "https://www.nfm.go.kr/",
    },
  },
  {
    id: "2026-08-02-now-location",
    dateKey: "2026-08-02",
    lens: "now",
    topic: "digital",
    prompt: "앱이 '위치 권한'을 요청한다는 것은 무엇을 쓰겠다는 뜻일까요?",
    choices: ["현재 위치 정보", "통화 음량", "배터리 색상"],
    answerIndex: 0,
    explanation:
      "위치 권한을 허용하면 앱이 기기의 현재 위치 정보를 쓸 수 있어요.",
    source: {
      name: "개인정보보호위원회",
      url: "https://www.pipc.go.kr/",
    },
  },
  {
    id: "2026-08-02-life-heatwave",
    dateKey: "2026-08-02",
    lens: "life",
    topic: "safety",
    prompt: "폭염에 어지럽고 기운이 없을 때 알맞은 행동은 무엇일까요?",
    choices: ["시원한 곳에서 쉬기", "두꺼운 옷 더 입기", "계속 햇볕 아래 걷기"],
    answerIndex: 0,
    explanation: "시원한 곳으로 옮겨 쉬고 물을 조금씩 마셔요.",
    source: {
      name: "질병관리청",
      url: "https://www.kdca.go.kr/",
    },
  },
  {
    id: "2026-08-03-then-mugunghwa",
    dateKey: "2026-08-03",
    lens: "then",
    topic: "korean-life",
    prompt: "우리나라를 상징하는 나라꽃은 무엇일까요?",
    choices: ["무궁화", "장미", "해바라기"],
    answerIndex: 0,
    explanation:
      "무궁화는 오랫동안 우리 민족과 함께해 온 우리나라의 나라꽃이에요.",
    source: {
      name: "산림청",
      url: "https://www.forest.go.kr/",
    },
  },
  {
    id: "2026-08-03-now-backup",
    dateKey: "2026-08-03",
    lens: "now",
    topic: "digital",
    prompt: "사진이나 연락처를 잃지 않도록 따로 복사해 두는 것은 무엇일까요?",
    choices: ["백업", "확대", "삭제"],
    answerIndex: 0,
    explanation: "백업은 중요한 자료의 사본을 다른 곳에 보관하는 일이에요.",
    source: {
      name: "한국인터넷진흥원",
      url: "https://www.kisa.or.kr/",
    },
  },
  {
    id: "2026-08-03-life-use-by",
    dateKey: "2026-08-03",
    lens: "life",
    topic: "safety",
    prompt: "식품을 안전하게 먹을 수 있는 기한을 나타내는 표시는 무엇일까요?",
    choices: ["소비기한", "제조번호", "상품 바코드"],
    answerIndex: 0,
    explanation:
      "소비기한은 표시된 보관 방법을 지켰을 때 안전하게 먹을 수 있는 기한이에요.",
    source: {
      name: "식품의약품안전처",
      url: "https://www.mfds.go.kr/",
    },
  },
  ...augustCoreQuestions,
];

function distributeAnswerPositions<TQuestion extends Question>(
  questions: TQuestion[],
): TQuestion[] {
  return questions.map((question, index) => {
    const targetAnswerIndex = (index % 3) as 0 | 1 | 2;
    if (question.answerIndex === targetAnswerIndex) {
      return question;
    }

    const choices = [...question.choices];
    const [correctChoice] = choices.splice(question.answerIndex, 1);
    choices.splice(targetAnswerIndex, 0, correctChoice);

    return {
      ...question,
      choices: choices as [string, string, string],
      answerIndex: targetAnswerIndex,
    } as TQuestion;
  });
}

export const coreQuestions = distributeAnswerPositions(
  coreQuestionSeed.map((question) =>
    createCoreQuestion({ ...question, ...auditedLegacyReviewMetadata }),
  ),
);

interface LegacyBonusQuestionInput {
  id: string;
  lens: CoreLens;
  topic: BonusTopic;
  prompt: string;
  choices: [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  sourceName: string;
  sourceUrl: string;
}

function bonus(input: LegacyBonusQuestionInput): BonusQuestion {
  return createBonusQuestion({
    id: input.id,
    lens: input.lens,
    topic: input.topic,
    prompt: input.prompt,
    choices: input.choices,
    answerIndex: input.answerIndex,
    explanation: input.explanation,
    source: {
      name: input.sourceName,
      url: input.sourceUrl,
    },
    ...auditedLegacyReviewMetadata,
  });
}

const bonusQuestionSeed: BonusQuestion[] = [
  bonus({
    id: "bonus-nostalgia-1",
    lens: "then",
    topic: "nostalgia",
    prompt: "1988년 서울 올림픽 마스코트 이름은 무엇일까요?",
    choices: ["호돌이", "꿈돌이", "수호랑"],
    answerIndex: 0,
    explanation: "호돌이는 1988년 서울 올림픽을 대표한 호랑이 마스코트예요.",
    sourceName: "국가기록원",
    sourceUrl: "https://www.archives.go.kr/",
  }),
  bonus({
    id: "bonus-nostalgia-2",
    lens: "then",
    topic: "nostalgia",
    prompt: "카세트테이프의 음악을 다시 처음으로 돌리는 동작은 무엇일까요?",
    choices: ["되감기", "새로고침", "복사"],
    answerIndex: 0,
    explanation: "테이프를 앞부분으로 되돌릴 때 되감기 버튼을 눌렀어요.",
    sourceName: "국립민속박물관",
    sourceUrl: "https://www.nfm.go.kr/",
  }),
  bonus({
    id: "bonus-nostalgia-3",
    lens: "then",
    topic: "nostalgia",
    prompt: "예전 학교에서 도시락을 따뜻하게 데우던 곳은 어디였을까요?",
    choices: ["난로 위", "창가", "칠판 아래"],
    answerIndex: 0,
    explanation: "겨울에는 교실 난로 위에 양은 도시락을 올려 데우곤 했어요.",
    sourceName: "국립민속박물관",
    sourceUrl: "https://www.nfm.go.kr/",
  }),
  bonus({
    id: "bonus-korean-life-1",
    lens: "then",
    topic: "korean-life",
    prompt: "한글날은 몇 월 며칠일까요?",
    choices: ["8월 15일", "10월 3일", "10월 9일"],
    answerIndex: 2,
    explanation: "한글날은 훈민정음 반포를 기념하는 10월 9일이에요.",
    sourceName: "국가보훈부",
    sourceUrl: "https://www.mpva.go.kr/",
  }),
  bonus({
    id: "bonus-korean-life-2",
    lens: "then",
    topic: "korean-life",
    prompt: "설날에 한 살 더 먹는다는 뜻으로 먹던 음식은 무엇일까요?",
    choices: ["떡국", "냉면", "송편"],
    answerIndex: 0,
    explanation: "설날에는 새해를 맞아 떡국을 먹는 풍습이 있어요.",
    sourceName: "국립민속박물관",
    sourceUrl: "https://www.nfm.go.kr/",
  }),
  bonus({
    id: "bonus-korean-life-3",
    lens: "then",
    topic: "korean-life",
    prompt: "장독대의 장독에 주로 담아 두던 것은 무엇일까요?",
    choices: ["된장과 간장", "쌀과 보리", "옷과 이불"],
    answerIndex: 0,
    explanation: "장독은 된장, 간장, 고추장 같은 장류를 저장하는 데 썼어요.",
    sourceName: "국립민속박물관",
    sourceUrl: "https://www.nfm.go.kr/",
  }),
  bonus({
    id: "bonus-language-1",
    lens: "life",
    topic: "language",
    prompt: "'가는 말이 고와야' 다음에 이어지는 말은 무엇일까요?",
    choices: [
      "오는 말이 곱다",
      "발 없는 말이 간다",
      "말 한마디로 천 냥 빚을 갚는다",
    ],
    answerIndex: 0,
    explanation: "상대에게 좋게 말해야 상대도 좋게 답한다는 뜻이에요.",
    sourceName: "국립국어원",
    sourceUrl: "https://www.korean.go.kr/",
  }),
  bonus({
    id: "bonus-language-2",
    lens: "life",
    topic: "language",
    prompt: "뜻밖의 일을 나타내는 바른 표기는 무엇일까요?",
    choices: ["왠일", "웬일", "왠 일"],
    answerIndex: 1,
    explanation: "어찌 된 일이라는 뜻은 '웬일'이라고 적어요.",
    sourceName: "국립국어원",
    sourceUrl: "https://www.korean.go.kr/",
  }),
  bonus({
    id: "bonus-language-3",
    lens: "life",
    topic: "language",
    prompt: "'시간이 오래 ___'에 들어갈 바른 말은 무엇일까요?",
    choices: ["되다", "돼다", "됬다"],
    answerIndex: 0,
    explanation: "'되다'의 과거형은 '됐다'이고 기본형은 '되다'예요.",
    sourceName: "국립국어원",
    sourceUrl: "https://www.korean.go.kr/",
  }),
  bonus({
    id: "bonus-digital-1",
    lens: "now",
    topic: "digital",
    prompt: "와이파이 표시가 뜻하는 것은 무엇일까요?",
    choices: ["무선 인터넷 연결", "배터리 충전", "화면 밝기"],
    answerIndex: 0,
    explanation:
      "와이파이는 가까운 공유기를 통해 무선 인터넷에 연결하는 기능이에요.",
    sourceName: "디지털배움터",
    sourceUrl: "https://www.xn--2z1bw8k1pjz5ccumkb.kr/",
  }),
  bonus({
    id: "bonus-digital-2",
    lens: "now",
    topic: "digital",
    prompt: "문자 속 주소를 눌러 개인정보를 빼내는 사기는 무엇일까요?",
    choices: ["스미싱", "스트리밍", "로밍"],
    answerIndex: 0,
    explanation:
      "스미싱은 문자메시지의 악성 주소로 개인정보나 금전을 노리는 사기예요.",
    sourceName: "경찰청",
    sourceUrl: "https://www.police.go.kr/",
  }),
  bonus({
    id: "bonus-digital-3",
    lens: "now",
    topic: "digital",
    prompt: "스마트폰 화면을 사진처럼 저장하는 기능은 무엇일까요?",
    choices: ["화면 캡처", "비행기 모드", "자동 회전"],
    answerIndex: 0,
    explanation:
      "화면 캡처를 사용하면 현재 보이는 화면을 이미지로 저장할 수 있어요.",
    sourceName: "디지털배움터",
    sourceUrl: "https://www.xn--2z1bw8k1pjz5ccumkb.kr/",
  }),
  bonus({
    id: "bonus-safety-1",
    lens: "life",
    topic: "safety",
    prompt: "화재나 구조가 필요할 때 신고하는 번호는 무엇일까요?",
    choices: ["112", "119", "120"],
    answerIndex: 1,
    explanation: "화재, 구조, 구급이 필요하면 119에 신고해요.",
    sourceName: "소방청",
    sourceUrl: "https://www.nfa.go.kr/",
  }),
  bonus({
    id: "bonus-safety-2",
    lens: "life",
    topic: "safety",
    prompt: "횡단보도를 건널 때 가장 안전한 행동은 무엇일까요?",
    choices: ["좌우를 살피고 건너기", "휴대폰을 보며 걷기", "차 사이로 건너기"],
    answerIndex: 0,
    explanation: "신호를 확인하고 좌우 차량이 멈췄는지 살핀 뒤 건너요.",
    sourceName: "도로교통공단",
    sourceUrl: "https://www.koroad.or.kr/",
  }),
  bonus({
    id: "bonus-safety-3",
    lens: "life",
    topic: "safety",
    prompt: "젖은 손으로 전기 플러그를 만지면 안 되는 까닭은 무엇일까요?",
    choices: ["감전 위험", "소리가 커짐", "전기가 느려짐"],
    answerIndex: 0,
    explanation: "물기는 전기가 흐르기 쉽게 해 감전 위험을 높여요.",
    sourceName: "한국전기안전공사",
    sourceUrl: "https://www.kesco.or.kr/",
  }),
  bonus({
    id: "bonus-nature-1",
    lens: "life",
    topic: "nature-general",
    prompt: "지구의 자연 위성은 무엇일까요?",
    choices: ["달", "태양", "금성"],
    answerIndex: 0,
    explanation: "달은 지구 주위를 도는 지구의 자연 위성이에요.",
    sourceName: "한국천문연구원",
    sourceUrl: "https://www.kasi.re.kr/",
  }),
  bonus({
    id: "bonus-nature-2",
    lens: "life",
    topic: "nature-general",
    prompt: "표준 기압에서 물이 끓는 온도는 몇 도일까요?",
    choices: ["50도", "100도", "150도"],
    answerIndex: 1,
    explanation: "표준 기압에서 순수한 물은 섭씨 100도에서 끓어요.",
    sourceName: "국립중앙과학관",
    sourceUrl: "https://www.science.go.kr/",
  }),
  bonus({
    id: "bonus-nature-3",
    lens: "life",
    topic: "nature-general",
    prompt: "꽃가루받이를 도와주는 대표적인 곤충은 무엇일까요?",
    choices: ["꿀벌", "사마귀", "매미"],
    answerIndex: 0,
    explanation: "꿀벌은 꽃을 오가며 꽃가루를 옮겨 식물의 번식을 도와요.",
    sourceName: "농촌진흥청",
    sourceUrl: "https://www.rda.go.kr/",
  }),
  bonus({
    id: "bonus-nostalgia-4",
    lens: "then",
    topic: "nostalgia",
    prompt: "공중전화에서 동전 대신 넣어 쓰던 것은 무엇일까요?",
    choices: ["전화카드", "교통카드", "신분증"],
    answerIndex: 0,
    explanation: "전화카드를 넣어 정해진 금액만큼 공중전화를 쓸 수 있었어요.",
    sourceName: "국가기록원",
    sourceUrl: "https://www.archives.go.kr/",
  }),
  bonus({
    id: "bonus-nostalgia-5",
    lens: "then",
    topic: "nostalgia",
    prompt: "예전 흑백 텔레비전 화면에 없었던 것은 무엇일까요?",
    choices: ["여러 색", "소리", "채널"],
    answerIndex: 0,
    explanation: "흑백 텔레비전은 밝고 어두운 명암으로만 화면을 보여 줬어요.",
    sourceName: "대한민국역사박물관",
    sourceUrl: "https://www.much.go.kr/",
  }),
  bonus({
    id: "bonus-nostalgia-6",
    lens: "then",
    topic: "nostalgia",
    prompt: "필름 카메라로 사진을 찍은 뒤 사진을 보려면 무엇이 필요했을까요?",
    choices: ["필름 현상", "화면 캡처", "와이파이 연결"],
    answerIndex: 0,
    explanation:
      "필름 카메라는 촬영한 필름을 현상하고 인화해야 사진을 볼 수 있었어요.",
    sourceName: "대한민국역사박물관",
    sourceUrl: "https://www.much.go.kr/",
  }),
  bonus({
    id: "bonus-korean-life-4",
    lens: "then",
    topic: "korean-life",
    prompt: "태극기의 네 모서리에 있는 검은 무늬를 무엇이라고 할까요?",
    choices: ["괘", "띠", "별"],
    answerIndex: 0,
    explanation: "네 모서리에는 건·곤·감·리 네 괘가 있어요.",
    sourceName: "행정안전부",
    sourceUrl: "https://www.mois.go.kr/",
  }),
  bonus({
    id: "bonus-korean-life-5",
    lens: "then",
    topic: "korean-life",
    prompt: "추석에 빚어 먹는 대표적인 떡은 무엇일까요?",
    choices: ["송편", "가래떡", "백설기"],
    answerIndex: 0,
    explanation: "추석에는 햅쌀로 반달 모양의 송편을 빚어 먹어요.",
    sourceName: "국립민속박물관",
    sourceUrl: "https://www.nfm.go.kr/",
  }),
  bonus({
    id: "bonus-korean-life-6",
    lens: "then",
    topic: "korean-life",
    prompt: "김치를 많이 담가 겨울을 준비하는 풍습은 무엇일까요?",
    choices: ["김장", "모내기", "단오"],
    answerIndex: 0,
    explanation:
      "김장은 겨울 동안 먹을 김치를 이웃과 함께 담그는 생활 풍습이에요.",
    sourceName: "국립민속박물관",
    sourceUrl: "https://www.nfm.go.kr/",
  }),
  bonus({
    id: "bonus-language-4",
    lens: "life",
    topic: "language",
    prompt: "'뜻밖이라 기가 막히다'는 뜻으로 바르게 쓴 말은 무엇일까요?",
    choices: ["어이없다", "어의없다", "어이 업다"],
    answerIndex: 0,
    explanation: "'어이없다'가 표준어이며 '어의없다'는 잘못된 표기예요.",
    sourceName: "국립국어원",
    sourceUrl: "https://www.korean.go.kr/",
  }),
  bonus({
    id: "bonus-language-5",
    lens: "life",
    topic: "language",
    prompt: "'뜻밖의 일'을 보고 놀랄 때 쓰는 바른 말은 무엇일까요?",
    choices: ["웬일", "왠일", "왠닐"],
    answerIndex: 0,
    explanation: "'어찌 된 일'이라는 뜻일 때는 '웬일'이라고 써요.",
    sourceName: "국립국어원",
    sourceUrl: "https://www.korean.go.kr/",
  }),
  bonus({
    id: "bonus-language-6",
    lens: "life",
    topic: "language",
    prompt: "속담 '식은 죽 먹기'와 가장 가까운 뜻은 무엇일까요?",
    choices: ["아주 쉬운 일", "매우 급한 일", "오래 걸리는 일"],
    answerIndex: 0,
    explanation: "'식은 죽 먹기'는 힘들이지 않고 쉽게 할 수 있는 일을 뜻해요.",
    sourceName: "국립국어원",
    sourceUrl: "https://www.korean.go.kr/",
  }),
  bonus({
    id: "bonus-digital-4",
    lens: "now",
    topic: "digital",
    prompt: "블루투스는 가까운 기기끼리 무엇을 할 때 쓰일까요?",
    choices: ["무선 연결", "종이 인쇄만", "화면 끄기만"],
    answerIndex: 0,
    explanation: "블루투스는 이어폰 같은 가까운 기기를 무선으로 연결해요.",
    sourceName: "디지털배움터",
    sourceUrl: "https://www.xn--2z1bw8k1pjz5ccumkb.kr/",
  }),
  bonus({
    id: "bonus-digital-5",
    lens: "now",
    topic: "digital",
    prompt: "앱을 최신 버전으로 업데이트하는 중요한 까닭은 무엇일까요?",
    choices: ["보안과 기능 개선", "전화번호 변경", "화면 크기 변경"],
    answerIndex: 0,
    explanation: "업데이트에는 보안 문제 수정과 기능 개선이 포함될 수 있어요.",
    sourceName: "한국인터넷진흥원",
    sourceUrl: "https://www.kisa.or.kr/",
  }),
  bonus({
    id: "bonus-digital-6",
    lens: "now",
    topic: "digital",
    prompt: "중요한 사진을 휴대전화 밖에도 복사해 두는 일을 무엇이라고 할까요?",
    choices: ["백업", "삭제", "차단"],
    answerIndex: 0,
    explanation:
      "백업은 기기를 잃거나 고장 나도 자료를 되찾을 수 있게 사본을 보관하는 일이에요.",
    sourceName: "한국인터넷진흥원",
    sourceUrl: "https://www.kisa.or.kr/",
  }),
  bonus({
    id: "bonus-safety-4",
    lens: "life",
    topic: "safety",
    prompt: "심장이 멈춘 사람에게 전기 충격을 줄 수 있는 기기는 무엇일까요?",
    choices: ["자동심장충격기", "체온계", "혈압계"],
    answerIndex: 0,
    explanation:
      "자동심장충격기(AED)는 음성 안내에 따라 누구나 사용할 수 있어요.",
    sourceName: "질병관리청",
    sourceUrl: "https://www.kdca.go.kr/",
  }),
  bonus({
    id: "bonus-safety-5",
    lens: "life",
    topic: "safety",
    prompt: "불이 나서 연기가 찼을 때 이동하는 자세는 무엇일까요?",
    choices: ["몸을 낮추기", "두 팔을 높이 들기", "제자리에서 뛰기"],
    answerIndex: 0,
    explanation:
      "연기는 위로 올라가므로 젖은 수건 등으로 코와 입을 가리고 몸을 낮춰 이동해요.",
    sourceName: "소방청",
    sourceUrl: "https://www.nfa.go.kr/",
  }),
  bonus({
    id: "bonus-safety-6",
    lens: "life",
    topic: "safety",
    prompt: "건물에 불이 났을 때 피해야 하는 이동 수단은 무엇일까요?",
    choices: ["엘리베이터", "피난 계단", "비상구"],
    answerIndex: 0,
    explanation:
      "화재 때는 엘리베이터가 멈출 수 있으므로 피난 계단을 이용해요.",
    sourceName: "소방청",
    sourceUrl: "https://www.nfa.go.kr/",
  }),
  bonus({
    id: "bonus-nature-4",
    lens: "life",
    topic: "nature-general",
    prompt: "지구가 태양 주위를 한 바퀴 도는 데 걸리는 시간은 약 얼마일까요?",
    choices: ["1년", "1달", "1주일"],
    answerIndex: 0,
    explanation: "지구가 태양 주위를 한 바퀴 공전하는 데 약 1년이 걸려요.",
    sourceName: "한국천문연구원",
    sourceUrl: "https://www.kasi.re.kr/",
  }),
  bonus({
    id: "bonus-nature-5",
    lens: "life",
    topic: "nature-general",
    prompt: "식물이 햇빛을 이용해 양분을 만드는 작용은 무엇일까요?",
    choices: ["광합성", "증발", "발효"],
    answerIndex: 0,
    explanation: "식물은 광합성으로 빛에너지를 이용해 양분을 만들어요.",
    sourceName: "국립중앙과학관",
    sourceUrl: "https://www.science.go.kr/",
  }),
  bonus({
    id: "bonus-nature-6",
    lens: "life",
    topic: "nature-general",
    prompt: "낮과 밤이 생기는 가장 큰 까닭은 무엇일까요?",
    choices: ["지구의 자전", "달의 공전", "바람의 이동"],
    answerIndex: 0,
    explanation:
      "지구가 스스로 돌면서 태양을 향한 쪽과 반대쪽에 낮과 밤이 생겨요.",
    sourceName: "한국천문연구원",
    sourceUrl: "https://www.kasi.re.kr/",
  }),
  ...expandedBonusQuestions,
];

const legacyDifficultyOrder = ["gentle", "steady", "stretch"] as const;

function indexLegacyBonusSets(
  questions: BonusQuestion[],
): BonusQuestion[] {
  const nextPosition: Record<BonusTopic, number> = {
    nostalgia: 0,
    "korean-life": 0,
    language: 0,
    digital: 0,
    safety: 0,
    "nature-general": 0,
  };

  return questions.map((question) => {
    const position = nextPosition[question.topic];
    nextPosition[question.topic] += 1;
    return {
      ...question,
      setIndex: Math.floor(position / 3),
      internalDifficulty: legacyDifficultyOrder[position % 3],
    };
  });
}

export const bonusQuestions = distributeAnswerPositions(
  indexLegacyBonusSets(bonusQuestionSeed),
);
