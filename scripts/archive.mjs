// Gives every source an archived copy. For each source whose link has none,
// uses the Wayback Machine's snapshot from the last 30 days, or asks it to
// save the page, then writes the "archived" link into the page.
//
//   npm run archive               archive and write the links
//   npm run archive -- --dry-run  list what would be archived
//
// Read the archived copy before committing: a site can serve the Wayback
// Machine an error page or a login form.
import { writeFileSync } from "node:fs";
import { pages, read, sources, root, UNARCHIVED } from "./pages.mjs";

const dry = process.argv.includes("--dry-run");
const stamp = (date) => date.toISOString().replace(/\D/g, "").slice(0, 14);
const recent = stamp(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

// The newest snapshot's timestamp, if the Wayback Machine has one.
async function snapshot(url) {
  const response = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}&timestamp=${stamp(new Date())}`);
  const closest = (await response.json()).archived_snapshots?.closest;
  return closest?.available && closest.status === "200" ? closest.timestamp : null;
}

async function save(url) {
  const response = await fetch(`https://web.archive.org/save/${url}`, { signal: AbortSignal.timeout(180000) });
  await response.body?.cancel();
  const saved = (response.headers.get("content-location") ?? response.url).match(/\/web\/(\d{14})\//)?.[1];
  if (saved) return saved;
  // A save can finish after the request returns; look for it.
  for (let tries = 0; tries < 6; tries++) {
    await new Promise((done) => setTimeout(done, 10000));
    const found = await snapshot(url);
    if (found && found >= recent) return found;
  }
  throw new Error(`the Wayback Machine did not save it (${response.status})`);
}

let failed = 0;
for (const path of pages()) {
  let html = read(path);
  let changed = false;
  for (const { n, html: source } of sources(html)) {
    const link = source.match(UNARCHIVED);
    if (!link) continue;
    const [, anchor, href, text] = link;
    const url = href.replace(/#.*/, "");
    if (dry) {
      console.log(`${path} source ${n}: ${url}`);
      continue;
    }
    try {
      const existing = await snapshot(url);
      const timestamp = existing && existing >= recent ? existing : await save(url);
      const label = text.replace(/<[^>]+>/g, "").replace(/\s*\(PDF\)$/, "");
      const archived = `${anchor}<span class="nowrap">&nbsp;· <a class="archived" href="https://web.archive.org/web/${timestamp}/${url}" aria-label="Archived copy: ${label}">archived</a></span>`;
      html = html.replace(source, source.replace(anchor, archived));
      changed = true;
      console.log(`✓ ${path} source ${n}: https://web.archive.org/web/${timestamp}/${url}`);
    } catch (error) {
      failed++;
      console.log(`✗ ${path} source ${n}: ${url}: ${error.message}`);
    }
  }
  if (changed) writeFileSync(`${root}${path}`, html);
}
if (failed) process.exit(1);
