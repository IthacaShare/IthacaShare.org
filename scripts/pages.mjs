// Shared by check.mjs and archive.mjs: finds every page under public/ and the
// entries in its Sources list.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("..", import.meta.url));

// Every public/**/index.html, as a path relative to the repo, except partials.
export function pages(dir = "public") {
  const found = [];
  for (const name of readdirSync(`${root}${dir}`)) {
    const path = `${dir}/${name}`;
    if (name.startsWith("_")) continue;
    if (statSync(`${root}${path}`).isDirectory()) found.push(...pages(path));
    else if (name === "index.html") found.push(path);
  }
  return found.sort();
}

export const read = (path) => readFileSync(`${root}${path}`, "utf8");

// Each <li id="sN"> in a page: its number, its HTML, and where it starts.
export function sources(html) {
  return [...html.matchAll(/<li id="s(\d+)">[\s\S]*?<\/li>/g)].map((m) => ({ n: Number(m[1]), html: m[0], index: m.index }));
}

// A source's main link sits on its own line after the summary. When nothing
// follows it on that line, the source has no archived copy yet.
export const UNARCHIVED = /^([ \t]*<a class="link" href="(https?:\/\/[^"]+)">(.*?)<\/a>)[ \t]*$/m;

export const lineOf = (html, index) => html.slice(0, index).split("\n").length;
