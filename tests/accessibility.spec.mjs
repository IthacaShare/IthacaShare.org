// WCAG 2.2 AAA checks for every page, run at each viewport in playwright.config.mjs.
// axe covers what it can automate (including AAA contrast); the tests below cover
// AAA criteria axe does not: target size, focus appearance, link purpose, reflow,
// text spacing, and visual presentation.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = ["/", "/wastewater/", "/survivor-services/", "/no-such-page/"];

// Everything a keyboard or pointer user can act on.
const interactive = "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";

for (const path of pages) {
  test.describe(path, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test("axe: no WCAG A, AA, or AAA violations", async ({ page }) => {
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag2aaa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });

    // 2.5.5 Target Size (Enhanced): 44 by 44 CSS pixels, except links inside a sentence.
    test("targets are at least 44 by 44 pixels", async ({ page }) => {
      const small = await page.$$eval(interactive, (els) =>
        els
          .filter((el) => {
            const box = el.getBoundingClientRect();
            if (!box.width || !box.height) return false; // hidden
            if (el.closest(".skip-link")) return false; // off screen until focused
            // Inline exception: the link sits in a sentence with other text.
            const block = el.closest("p, li, dd, figcaption, td, h1");
            const inline = block && block.textContent.replace(/\s+/g, " ").trim() !== el.textContent.replace(/\s+/g, " ").trim();
            if (inline) return false;
            return box.width < 44 || box.height < 44;
          })
          .map((el) => {
            const box = el.getBoundingClientRect();
            return `${el.textContent.trim().slice(0, 40)} (${Math.round(box.width)}x${Math.round(box.height)})`;
          }),
      );
      expect(small).toEqual([]);
    });

    // 2.4.9 Link Purpose (Link Only): each link's name makes sense on its own,
    // and links that share a name go to the same place.
    test("link names stand alone", async ({ page }) => {
      const links = await page.$$eval("a[href]", (els) =>
        els.map((el) => ({
          name: (el.getAttribute("aria-label") || el.textContent).replace(/\s+/g, " ").trim(),
          href: el.getAttribute("href"),
        })),
      );
      for (const { name, href } of links) {
        expect(name, href).not.toBe("");
        if (href.startsWith("tel:")) expect(name, `phone link ${href} names who it calls`).toMatch(/[A-Za-z]/);
      }
      const byName = new Map();
      for (const { name, href } of links) {
        if (byName.has(name)) expect(href, `links named "${name}"`).toBe(byName.get(name));
        else byName.set(name, href);
      }
    });

    // 2.4.7 Focus Visible and 2.4.13 Focus Appearance: a solid outline at least 2px thick.
    test("every focusable element shows a solid focus outline", async ({ page }) => {
      const count = await page.locator(interactive).count();
      const missing = [];
      for (let i = 0; i < count + 1; i++) {
        await page.keyboard.press("Tab");
        const focus = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const style = getComputedStyle(el);
          return {
            name: (el.getAttribute("aria-label") || el.textContent).trim().slice(0, 40),
            ok: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2,
          };
        });
        if (focus && !focus.ok) missing.push(focus.name);
      }
      expect(missing).toEqual([]);
    });

    // 1.4.10 Reflow: no sideways scrolling, down to 320 pixels wide.
    test("no horizontal scrolling", async ({ page }) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    // 1.4.12 Text Spacing: content still fits with the spacing a reader may set.
    // The page's CSP blocks injected styles, so this test bypasses it, as a
    // reader's browser extension would.
    test("text spacing overrides do not cause overflow", async ({ browser }) => {
      const context = await browser.newContext({ bypassCSP: true, viewport: test.info().project.use.viewport });
      const page = await context.newPage();
      await page.goto(path);
      await page.addStyleTag({
        content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
                  p { margin-bottom: 2em !important; }`,
      });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await context.close();
    });

    // 1.4.8 Visual Presentation: lines of 80 characters or fewer, line height at
    // least 1.5, and no justified text.
    test("running text is readable", async ({ page }) => {
      const problems = await page.$$eval("main p, main li, main dd", (els) => {
        const out = [];
        for (const el of els) {
          if (!el.getClientRects().length) continue;
          if (el.querySelector("p, h2, h3, ul, ol, div")) continue; // a container, not a line of text
          const style = getComputedStyle(el);
          const size = parseFloat(style.fontSize);
          const probe = document.createElement("span");
          probe.style.font = style.font;
          probe.style.position = "absolute";
          probe.style.whiteSpace = "nowrap";
          probe.textContent = "the quick brown fox jumps over the lazy dog ";
          document.body.append(probe);
          const charWidth = probe.getBoundingClientRect().width / probe.textContent.length;
          probe.remove();
          const label = el.textContent.trim().slice(0, 40);
          if (el.clientWidth / charWidth > 80) out.push(`${label}: wider than 80 characters`);
          if (parseFloat(style.lineHeight) / size < 1.45) out.push(`${label}: line height ${style.lineHeight}`);
          if (style.textAlign === "justify") out.push(`${label}: justified`);
        }
        return out;
      });
      expect(problems).toEqual([]);
    });

    // 2.4.1 Bypass Blocks: a skip link that appears on focus and moves to main.
    test("skip link works", async ({ page }) => {
      const skip = page.locator(".skip-link");
      await skip.focus();
      await expect(skip).toBeInViewport();
      await skip.press("Enter");
      await expect(page).toHaveURL(/#main$/);
    });
  });
}

test.describe("survivor services", () => {
  test("quick exit is the first stop for keyboard users and leaves no referrer", async ({ page }) => {
    await page.goto("/survivor-services/");
    await page.keyboard.press("Tab");
    const exit = page.locator(".quick-exit");
    await expect(exit).toBeFocused();
    await expect(exit).toBeInViewport();
    await expect(exit).toHaveAttribute("rel", /noreferrer/);
  });

  test("quick exit stays on screen while scrolling", async ({ page }) => {
    await page.goto("/survivor-services/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator(".quick-exit")).toBeInViewport();
  });

  test("help numbers are tap-to-call links", async ({ page }) => {
    await page.goto("/survivor-services/");
    for (const number of ["tel:+16072775000", "tel:+18006564673"]) {
      await expect(page.locator(`.help a[href="${number}"]`)).toBeVisible();
    }
  });
});

test("no page uses JavaScript", async ({ page }) => {
  for (const path of pages) {
    await page.goto(path);
    expect(await page.locator("script").count(), path).toBe(0);
  }
});
