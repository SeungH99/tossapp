import { Analytics } from "@apps-in-toss/web-framework";

export type AnalyticsValue = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsValue>;

export interface AnalyticsGateway {
  track(name: string, params?: AnalyticsParams): void;
}

const screenEvents = new Set([
  "app_open",
  "result_view",
  "bonus_offer_view",
  "ad_offer_view",
]);

export class AppsInTossAnalyticsGateway implements AnalyticsGateway {
  track(name: string, params: AnalyticsParams = {}): void {
    const logger = screenEvents.has(name)
      ? Analytics.screen
      : Analytics.click;

    try {
      const request = logger({ log_name: name, ...params });
      if (request != null) {
        void request.catch(() => {
          // 분석 실패가 퀴즈 진행을 막지 않게 한다.
        });
      }
    } catch {
      // 토스 앱 밖이나 지원하지 않는 환경에서도 앱 흐름은 유지한다.
    }
  }
}

export class BrowserAnalyticsGateway implements AnalyticsGateway {
  track(name: string, params: AnalyticsParams = {}): void {
    console.info("[analytics]", name, params);
  }
}
