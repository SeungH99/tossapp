import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  outputDir: "test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFileName}/{arg}{-projectName}{ext}",
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "on-first-retry",
    screenshot: { mode: "only-on-failure", fullPage: true },
    video: "off",
  },
  projects: [
    {
      name: "chromium-360",
      use: { browserName: "chromium", viewport: { width: 360, height: 800 } },
    },
    {
      name: "chromium-390",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
    {
      name: "webkit-360",
      use: { browserName: "webkit", viewport: { width: 360, height: 800 } },
    },
    {
      name: "webkit-390",
      use: { browserName: "webkit", viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "npm run dev:web",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120_000,
  },
});
