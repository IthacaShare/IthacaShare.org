// Checks the content rules that the accessibility tests can't see.
//
//   npm run check             every source has an archived copy, no review
//                             date has passed, the sitemap matches each page,
//                             every translation matches its English page,
//                             figure for figure
//   npm run check -- --links  also requests every source link and reports
//                             the ones that are gone
//
// To have a line flagged for a second look, give its element a review date:
//   <span data-review="2026-11-18">Budget vote: November 17, 2026.</span>
// The check fails from that day on, until the line is updated and the
// attribute is moved or removed.
import { pages, read, sources, lineOf, translations, translated, isTranslation, exists } from "./pages.mjs";

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

// A translation keeps the English page's "updated" date, in English. When the
// English page changes and its date moves, its translations are out of date
// until they are changed to match. They also keep its sources and review dates.
const updatedOf = (html) => html.match(/<meta name="updated" content="([^"]+)">/)?.[1];
const list = (html, pattern) => [...html.matchAll(pattern)].map((m) => m[1]).join(" ");
for (const path of pages().filter((path) => !isTranslation(path))) {
  const english = read(path);
  for (const code of translations) {
    const copy = translated(path, code);
    if (!exists(copy)) {
      problems.push(`${copy} is missing: ${path} has no ${code} translation.`);
      continue;
    }
    const html = read(copy);
    if (updatedOf(html) !== updatedOf(english)) problems.push(`${copy} translates the ${updatedOf(html)} version of ${path}, updated ${updatedOf(english)}. Bring the translation up to date, then copy the date.`);
    if (list(html, /<li id="(s\d+)">/g) !== list(english, /<li id="(s\d+)">/g)) problems.push(`${copy} does not list the same sources as ${path}.`);
    if (list(html, /href="#(s\d+)"/g) !== list(english, /href="#(s\d+)"/g)) problems.push(`${copy} does not have the same footnotes, in the same order, as ${path}.`);
    if (list(html, /href="(https?:\/\/(?!ithacashare\.org\/)[^"]+)"/g) !== list(english, /href="(https?:\/\/(?!ithacashare\.org\/)[^"]+)"/g)) problems.push(`${copy} does not link to the same sources and archived copies as ${path}.`);
    if (list(html, /data-review="([^"]*)"/g) !== list(english, /data-review="([^"]*)"/g)) problems.push(`${copy} does not have the same data-review dates as ${path}.`);
  }
}

// Every figure in an English page appears in each translation the same number
// of times. Amounts are compared by value, so $13.6 billion matches 13,600
// millones, 13.6 مليار, and 136亿. Chinese dates write the month as a number, and
// the week chart's hour labels follow each language's clock; both are left out.
const UNITS = { billion: 1e9, B: 1e9, مليار: 1e9, 亿: 1e8, 万: 1e4, million: 1e6, M: 1e6, millones: 1e6, "mill.": 1e6, مليون: 1e6, ملايين: 1e6 };
function figures(html) {
  const text = html
    .replace(/<meta (?:name="description"|property="og:image:alt") content="([^"]*)">/g, " $1 ")
    .replace(/<div class="week-hours"[\s\S]*?<\/div>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\d{1,2}月/g, " ")
    .replace(/(\d)多(?=[万亿])/g, "$1");
  const found = new Map();
  const unitAt = (rest) => rest.match(/^(?:[BM](?![\p{L}\d])|(?:&nbsp;|\s)*(?:billion\b|million\b|millones|mill\.|مليار|مليون|ملايين|亿|万))/u)?.[0].replace(/&nbsp;|\s/g, "");
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    // In a range such as "$15.5 to $32.5 million", the first amount takes the second's unit.
    const rest = text.slice(m.index + m[0].length);
    const range = rest.match(/^(?:&nbsp;|\s)+(?:to|a|y|إلى)(?:&nbsp;|\s)+\$?\d[\d,]*(?:\.\d+)?/)?.[0];
    const unit = unitAt(rest) ?? (range && unitAt(rest.slice(range.length)));
    const value = String(Math.round(Number(m[0].replace(/,/g, "")) * (UNITS[unit] ?? 1) * 1000) / 1000);
    found.set(value, (found.get(value) ?? 0) + 1);
  }
  return found;
}
for (const path of pages().filter((path) => !isTranslation(path))) {
  const english = figures(read(path));
  for (const code of translations.filter((code) => exists(translated(path, code)))) {
    const copy = figures(read(translated(path, code)));
    for (const value of new Set([...english.keys(), ...copy.keys()])) {
      const [here, there] = [english.get(value) ?? 0, copy.get(value) ?? 0];
      if (here !== there) problems.push(`${translated(path, code)} has the figure ${Number(value).toLocaleString("en-US")} ${there} time${there === 1 ? "" : "s"}; ${path} has it ${here}.`);
    }
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
