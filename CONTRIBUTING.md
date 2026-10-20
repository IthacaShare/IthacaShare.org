# Contributing

ithacashare.org is static HTML with no build step. The only JavaScript in the browser is the Cloudflare Web Analytics beacon, which the Worker adds to every page.

- `public/index.html` lists the proposals; each proposal is a folder, such as `public/wastewater/index.html`.
- `public/_partials/` holds the shared `<head>` tags, header, and footer. The Worker in `src/index.js` adds them to every page as it is served, along with Open Graph tags built from each page's title, description, and canonical link.
- `public/styles.css` is the one stylesheet. `public/_headers` sets caching, privacy, and security headers.
- `og/` holds the source for each page's share image. `npm run og` rebuilds the images and QR codes.

## Run it locally

```sh
npm install
npm run dev
```

Then open http://localhost:8787. Use `npm run dev`, not a file browser: pages need the Worker to add their shared parts.

## Content rules

- Every figure needs a published source. Mark it with a footnote (`<sup class="fn">`) that links to its numbered entry in the page's Sources list, and add an archived copy where you can.
- Quote sources exactly. Where a source page supports it, end the source link with a text fragment (`#:~:text=`) so it opens on the quoted words.
- State facts plainly. No adjectives, predictions, or claims about anyone's motives. Write headings as the point, not the topic.
- Name no individuals. Use roles or titles, and only general addresses such as council@cityofithaca.org.
- Give every date a year, and avoid words like "now", "this year", or "upcoming".
- Update the page's `<meta name="updated">` date with each content change.
- If a figure changes, update it everywhere it appears, including the meta description, `--pay-ratio` in `styles.css`, and the page's `og/<page>.html` (then run `npm run og` and bump the `?v=` on its `og:image`).
- Pages must pass WCAG 2.2 AAA: 7:1 contrast for normal text, 44px tap targets, a visible focus outline, and line height of at least 1.5. `npm test` checks these.

## Making a change

1. Branch from `main`.
2. Edit files in `public/`.
3. Run `npm test`. It checks every page for WCAG 2.2 AAA at desktop and phone widths: axe, 44px targets, focus outlines, link names, reflow, text spacing, and line length. Run `npx playwright install chromium` once first.
4. Check the page locally at desktop and phone widths, and in print preview.
5. Open a pull request with a link to the source for any new or changed figure.

Commits must not include `Co-authored-by` trailers.

## Deploys

Cloudflare Workers Builds is connected to this repo. A push to `main` deploys to ithacashare.org. Other branches get a preview build.

To deploy by hand, run `npm run deploy`.

## License

By contributing, you agree your contribution is licensed under [CC BY 4.0](LICENSE).
