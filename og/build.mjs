// For each og/<page>.html, renders public/<page>/og.jpg and writes
// public/<page>/qr.svg for that page's canonical URL, and a qr.svg for each
// translation of the page. og/home.html renders public/og.jpg. Translations
// share the English image. Needs Google Chrome; macOS uses sips.
// Usage: npm run og   (set CHROME=/path/to/chrome on other systems)
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { translations, translated } from "../scripts/pages.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

for (const file of readdirSync(`${root}og`).filter((f) => f.endsWith(".html"))) {
  const page = file.replace(/\.html$/, "");
  const dir = page === "home" ? "public" : `public/${page}`;

  const html = readFileSync(`${root}${dir}/index.html`, "utf8");
  const url = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
  const qr = async (folder) => {
    const canonical = readFileSync(`${root}${folder}/index.html`, "utf8").match(/<link rel="canonical" href="([^"]+)"/)[1];
    writeFileSync(
      `${root}${folder}/qr.svg`,
      await QRCode.toString(canonical, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#1a1814", light: "#ffffff" } }),
    );
  };
  await qr(dir);
  for (const code of translations) {
    const folder = translated(`${dir}/`, code).replace(/\/$/, "");
    if (existsSync(`${root}${folder}/index.html`)) await qr(folder);
  }

  const png = `${root}og/${page}.png`;
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--window-size=1200,630", "--virtual-time-budget=3000", `--screenshot=${png}`, `file://${root}og/${file}`,
  ], { stdio: "ignore" });
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "88", png, "--out", `${root}${dir}/og.jpg`], { stdio: "ignore" });
  rmSync(png);
  console.log(`${dir}/og.jpg and qr.svg (${url})`);
}
