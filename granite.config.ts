import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "geuttae-yojeum",
  brand: {
    displayName: "그때요즘",
    primaryColor: "#0064FF",
    icon: "",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
