import { defineConfig } from "@playwright/test";

const PORT = 3200;
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  retries: 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  webServer: {
    // Production build (stable, like Vercel) + a throwaway database so the smoke test never touches real data.
    command: `rm -f data/e2e.db* && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/studio/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { DATABASE_PATH: "./data/e2e.db", STUDIO_PASSWORD: "e2e-password", AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
  },
});
