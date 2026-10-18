import { defineConfig, devices } from "@playwright/test";

// Every page is checked at a desktop width, a phone, and the narrowest phone.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:8788" },
  webServer: {
    command: "npx wrangler dev --port 8788",
    url: "http://localhost:8788",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "small-phone", use: { ...devices["Pixel 7"], viewport: { width: 320, height: 640 } } },
  ],
});
