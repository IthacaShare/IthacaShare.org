# Contributing

ithacashare.org is static HTML: a homepage in `public/index.html`, one folder per proposal, and a shared `public/styles.css`. There is no build step.

## Run it locally

```sh
npm install
npm run dev
```

Then open http://localhost:8787.

## Content rules

- Every figure needs a published source. Link it where the figure appears and add it to the Sources list.
- State facts plainly. Skip adjectives, predictions, and claims about anyone's motives.
- Give every date a year, and avoid words like "now", "this year", or "upcoming" so the page stays accurate as time passes.
- Update the "Updated" date in the footer with each content change.
- If a figure changes, update it everywhere it appears, including the meta description, the two amounts in `--pay-ratio`, and the page's `og/<page>.html` (then run `npm run og`).

## Making a change

1. Branch from `main`.
2. Edit files in `public/`.
3. Check the page locally, on a phone-width window too.
4. Open a pull request with a link to the source for any new or changed figure.

Commits must not include `Co-authored-by` trailers.

## Deploys

Cloudflare Workers Builds is connected to this repo. A push to `main` deploys to ithacashare.org. Other branches get a preview build.

To deploy by hand, run `npm run deploy`.

## License

By contributing, you agree your contribution is licensed under [CC BY 4.0](LICENSE).
