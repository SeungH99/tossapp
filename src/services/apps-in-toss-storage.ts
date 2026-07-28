import { Storage as AppsInTossStorage } from "@apps-in-toss/web-framework";

import type { KeyValueStorage } from "./progress-repository";

export class AppsInTossKeyValueStorage implements KeyValueStorage {
  async getItem(key: string): Promise<string | null> {
    return AppsInTossStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AppsInTossStorage.setItem(key, value);
  }
}
