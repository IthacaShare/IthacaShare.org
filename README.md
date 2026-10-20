# ithacashare.org

Sourced, one-page proposals for what Cornell could fund in Ithaca. The homepage (`public/index.html`) lists them; each proposal is its own page, such as `public/wastewater/index.html`.

```sh
npm install
npm run dev
```

Pushes to `main` deploy to Cloudflare Workers. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Use this as a template

This repo is a GitHub template for one-page, sourced sites on Cloudflare Workers. Click **Use this template**, then:

1. Edit `public/index.html` (the list of proposals) and add one folder per proposal under `public/`. In each page, set the canonical link, `og:url`, `og:image`, the issues link in the footer, and, if it has a scaled square, the two amounts in `--pay-ratio` in `public/styles.css`. Edit the shared header and footer in `public/_partials/`.
2. In `wrangler.jsonc`, set `name` and the two custom domains.
3. Add `og/<page>.html` for each page (`og/home.html` is the homepage), then run `npm run og` to build each page's `og.jpg` and `qr.svg`.
4. Copy the labels: `gh label clone ithacashare/IthacaShare.org -R owner/new-repo`.
5. In `src/index.js`, replace the Cloudflare Web Analytics token in `BEACON` with your own site's token, or remove the beacon. Then update `public/privacy/index.html` to match.

## Cloudflare setup

These live in dashboards, not in the repo:

1. Register or add the domain in Cloudflare. Turn on auto-renew and DNSSEC.
2. Run `npm run deploy` once to create the Worker and attach both custom domains.
3. In the Worker, go to Settings, then Build, and connect the GitHub repo with branch `main`, no build command, and deploy command `npx wrangler deploy`.
4. Leave Bot Fight Mode off so link previews can fetch the page.
5. In Web Analytics, add the site with manual setup (the Worker adds the beacon), and leave automatic setup off.
6. Add a second admin to the Cloudflare account and the GitHub org.

Licensed under [CC BY 4.0](LICENSE).
