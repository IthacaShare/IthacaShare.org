// Renders og/og.html to public/og.jpg and writes public/qr.svg for the
// canonical URL in public/index.html. Needs Google Chrome; macOS uses sips.
// Usage: npm run og   (set CHROME=/path/to/chrome on other systems)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const root = fileURLToPath(new URL("..", import.meta.url));
const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const html = readFileSync(`${root}public/index.html`, "utf8");
const url = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
writeFileSync(
  `${root}public/qr.svg`,
  await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#1a1814", light: "#ffffff" } }),
);

const png = `${root}og/og.png`;
execFileSync(chrome, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  "--window-size=1200,630", "--virtual-time-budget=3000", `--screenshot=${png}`, `file://${root}og/og.html`,
], { stdio: "ignore" });
execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "88", png, "--out", `${root}public/og.jpg`], { stdio: "ignore" });
rmSync(png);
console.log(`Wrote public/og.jpg and public/qr.svg (${url})`);
