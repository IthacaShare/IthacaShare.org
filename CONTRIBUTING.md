# Contributing

ithacashare.org is static HTML with no build step. The only JavaScript in the browser is the Cloudflare Web Analytics beacon, which the Worker adds to every page. `public/privacy/index.html` describes what it measures; update that page whenever analytics, logging, or hosting change.

- `public/index.html` lists the proposals; each proposal is a folder, such as `public/wastewater/index.html`.
- `public/es/`, `public/ar/`, and `public/zh/` hold the Spanish, Arabic, and Chinese translation of every page, at the same path as the English page. See [Translations](#translations).
- `public/_partials/` holds the shared `<head>` tags, header, and footer; `public/_partials/es/` and the like hold each translation's header and footer. The Worker in `src/index.js` adds them to every page as it is served, along with Open Graph tags built from each page's title, description, and canonical link.
- `public/styles.css` is the one stylesheet. `public/_headers` sets caching, privacy, and security headers.
- `og/` holds the source for each page's share image. `npm run og` rebuilds the images and QR codes.
- `scripts/` holds the content checks. `npm run check` finds sources without an archived copy, lines past their review date, pages whose date differs from the sitemap, and translations that have fallen behind their English page. `npm run archive` saves unarchived sources to the Wayback Machine and writes the links.

## Run it locally

```sh
npm install
npm run dev
```

Then open http://localhost:8787. Use `npm run dev`, not a file browser: pages need the Worker to add their shared parts.

## Content rules

- Every figure needs a published source. Mark it with a footnote (`<sup class="fn">`) that links to its numbered entry in the page's Sources list, and give it an archived copy: put the source's link on its own line, then run `npm run archive`. Open the archived copy to confirm it shows the page.
- Quote sources exactly. Where a source page supports it, end the source link with a text fragment (`#:~:text=`) so it opens on the quoted words.
- State facts plainly. No adjectives, predictions, or claims about anyone's motives. Write headings as the point, not the topic.
- Name no individuals. Use roles or titles, and only general addresses such as council@cityofithaca.org.
- Give every date a year, and avoid words like "now", "this year", or "upcoming".
- When a line will go out of date, such as a vote or a deadline, add `data-review="YYYY-MM-DD"` to its element. `npm run check` fails from that day until the line is updated.
- Update the page's `<meta name="updated">` date with each content change.
- If a figure changes, update it everywhere it appears: the page's headline, tables, answers, and Calculation source; its meta description and `og:image:alt`; its card on the homepage; `styles.css` (`--pay-ratio`, the card's square under `.card-ww`, and the `--share` values under `.bars`); and the page's `og/<page>.html` (then run `npm run og` and bump the `?v=` on its `og:image`). Search the repo for the old figure before you finish. Update `lastmod` in `public/sitemap.xml` too.
- Pages must pass WCAG 2.2 AAA: 7:1 contrast for normal text, 44px tap targets, a visible focus outline, and line height of at least 1.5. `npm test` checks these.

## Translations

The English pages are the reference. Each translation is a copy of its English page with the same HTML, footnotes, sources, and links, and only the words changed.

- When you change an English page, make the same change in `public/es/`, `public/ar/`, and `public/zh/`. If you can't write one of the languages, say so in the pull request so someone else can.
- A translation keeps the English page's `<meta name="updated">` date, written in English. It records which version of the English page the translation matches, and the Worker shows it in the page's own language. `npm run check` fails while a translation's date, footnotes, source links, or review dates differ from its English page.
- Translate quotations as literally as reads naturally. Keep the titles of sources in English, with `lang="en"` on the link, and keep the English names of offices and organizations a reader would search for or call. Every figure must match the English page.
- Keep `<html lang>` and, for Arabic, `dir="rtl"`. In Arabic, put `dir="ltr"` on phone and email links and wrap addresses and dollar figures in `<bdi dir="ltr">`.
- `npm run archive` writes archived links into English pages only. Copy each new one into the translations.
- The footer of each translation says it is a machine translation. Remove that line from `public/_partials/<code>/footer.html` only after a fluent reader has reviewed every page in that language.

To add a language, add its code to `LANGUAGES` and, for a new month format, `localDate` in `src/index.js`, and to `translations` in `scripts/pages.mjs`; add `public/<code>/` and `public/_partials/<code>/`; add its pages to `public/sitemap.xml`; and give it a font stack at the end of `public/styles.css`.

## Making a change

1. Branch from `main`.
2. Edit files in `public/`.
3. Run `npm run check`, then `npm test`. The tests check every page for WCAG 2.2 AAA at desktop and phone widths: axe, 44px targets, focus outlines, link names, reflow, text spacing, and line length. Run `npx playwright install chromium` once first.
4. Check the page locally at desktop and phone widths, and in print preview.
5. Open a pull request with a link to the source for any new or changed figure.

Commits must not include `Co-authored-by` trailers.

## Adding a page

1. Create `public/<page>/index.html`, starting from an existing page. Set its title, description, `updated` date, canonical link, and `og:image`.
2. Add its link to `public/_partials/nav.html` and its card to `public/index.html`.
3. Translate it into `public/es/<page>/`, `public/ar/<page>/`, and `public/zh/<page>/`, and add its link and card to each translation's nav and homepage.
4. Add the page and its translations to `public/sitemap.xml`, and the page to the `english` list in `tests/accessibility.spec.mjs`.
5. Add `og/<page>.html`, then run `npm run og`. Translations share the English image and get their own QR code.
6. Run `npm run archive`, `npm run check`, and `npm test`.

## Deploys

Cloudflare Workers Builds is connected to this repo. A push to `main` deploys to ithacashare.org. Other branches get a preview build.

To deploy by hand, run `npm run deploy`.

## License

By contributing, you agree your contribution is licensed under [CC BY 4.0](LICENSE).
