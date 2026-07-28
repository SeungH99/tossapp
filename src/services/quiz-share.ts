import {
  getTossShareLink,
  share,
} from "@apps-in-toss/web-framework";

export interface QuizShareGateway {
  shareScore(score: number): Promise<boolean>;
}

function createShareMessage(score: number, link: string): string {
  return [
    `오늘 그때요즘 퀴즈에서 ${score}/3점을 받았어요.`,
    "같은 세 문제에 도전해 보세요.",
    link,
  ].join("\n");
}

export class AppsInTossQuizShareGateway implements QuizShareGateway {
  async shareScore(score: number): Promise<boolean> {
    try {
      const link = await getTossShareLink(
        "intoss://geuttae-yojeum",
      );
      await share({ message: createShareMessage(score, link) });
      return true;
    } catch {
      return false;
    }
  }
}

export class BrowserQuizShareGateway implements QuizShareGateway {
  constructor(
    private readonly browserNavigator: Navigator,
    private readonly currentUrl: string,
  ) {}

  async shareScore(score: number): Promise<boolean> {
    const message = createShareMessage(score, this.currentUrl);

    try {
      if (this.browserNavigator.share != null) {
        await this.browserNavigator.share({
          text: message,
          title: "그때요즘",
        });
        return true;
      }

      if (this.browserNavigator.clipboard?.writeText != null) {
        await this.browserNavigator.clipboard.writeText(message);
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }
}
