// Checks the content rules that the accessibility tests can't see.
//
//   npm run check             every source has an archived copy, no review
//                             date has passed, the sitemap matches each page
//   npm run check -- --links  also requests every source link and reports
//                             the ones that are gone
//
// To have a line flagged for a second look, give its element a review date:
//   <span data-review="2026-11-18">Budget vote: November 17, 2026.</span>
// The check fails from that day on, until the line is updated and the
// attribute is moved or removed.
import { pages, read, sources, lineOf } from "./pages.mjs";

const problems = [];
const warnings = [];
const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
const sitemap = read("public/sitemap.xml");
const links = new Map(); // url -> where it is cited

for (const path of pages()) {
  const html = read(path);

  for (const source of sources(html)) {
    const where = `${path}:${lineOf(html, source.index)} source ${source.n}`;
    const cited = [...source.html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]).filter((url) => !url.includes("web.archive.org"));
    if (cited.length && !source.html.includes('class="archived"')) problems.push(`${where} has no archived copy. Run: npm run archive`);
    for (const url of cited) links.set(url.replace(/#.*/, ""), where);
  }

  for (const m of html.matchAll(/data-review="([^"]*)"/g)) {
    const where = `${path}:${lineOf(html, m.index)}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m[1])) problems.push(`${where} data-review="${m[1]}" is not a YYYY-MM-DD date.`);
    else if (m[1] <= today) problems.push(`${where} was due for review on ${m[1]}. Update the line, then move or remove data-review.`);
  }

  const updated = html.match(/<meta name="updated" content="([^"]+)">/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  if (updated && canonical) {
    const lastmod = sitemap.match(new RegExp(`<loc>${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc><lastmod>([^<]+)</lastmod>`))?.[1];
    const date = new Date(`${updated} 12:00`).toLocaleDateString("en-CA");
    if (!lastmod) problems.push(`${path} is not in public/sitemap.xml.`);
    else if (lastmod !== date) problems.push(`${path} says updated ${updated}, but public/sitemap.xml says ${lastmod}.`);
  }
}

if (process.argv.includes("--links")) {
  const agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
  await Promise.all([...links].map(async ([url, where]) => {
    try {
      const response = await fetch(url, { headers: { "user-agent": agent, accept: "text/html,*/*" }, signal: AbortSignal.timeout(30000) });
      await response.body?.cancel();
      if (response.status === 404 || response.status === 410) problems.push(`${where}: ${url} is gone (${response.status}).`);
      // Some sites refuse scripts but serve browsers; those need a look by hand.
      else if (!response.ok) warnings.push(`${where}: ${url} answered ${response.status}; open it in a browser.`);
    } catch (error) {
      warnings.push(`${where}: ${url} did not answer (${error.name}); open it in a browser.`);
    }
  }));
}

for (const line of warnings.sort()) console.log(`? ${line}`);
for (const line of problems.sort()) console.log(`✗ ${line}`);
if (problems.length) process.exit(1);
console.log(`Checked ${pages().length} pages and ${links.size} source links${process.argv.includes("--links") ? ", requesting each" : ""}: no problems.`);
