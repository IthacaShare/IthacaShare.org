# Contributing

ithacashare.org is one static page: `public/index.html` and `public/styles.css`. There is no build step.

## Run it locally

```sh
npm install
npm run dev
```

Then open http://localhost:8787.

## Content rules

- Every figure needs a published source. Link it where the figure appears and add it to the Sources list.
- State facts plainly. Skip adjectives, predictions, and claims about anyone's motives.
- If a figure changes, update it everywhere it appears, including the meta description and the dot size (`--pay-ratio` in `index.html` is the square root of endowment divided by voluntary payments).

## Making a change

1. Branch from `main`.
2. Edit files in `public/`.
3. Check the page locally, on a phone-width window too.
4. Open a pull request with a link to the source for any new or changed figure.

Commits must not include `Co-authored-by` trailers.

## Deploys

Merging to `main` deploys to Cloudflare Workers through `.github/workflows/deploy.yml`. The workflow needs two repository secrets: `CLOUDFLARE_API_TOKEN` (with Workers edit permission) and `CLOUDFLARE_ACCOUNT_ID`.

To deploy by hand, run `npm run deploy`.
