// Redirect www to the apex domain. Serve public/, completing each HTML page
// from public/_partials/: the shared <head> tags, Open Graph tags built from
// the page's own title, description, and canonical link, and the shared
// header and footer. Pages hold only what is unique to them.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    const response = await env.ASSETS.fetch(request);
    if (!response.headers.get("content-type")?.includes("text/html")) return response;

    const partial = (name) =>
      env.ASSETS.fetch(new URL(`/_partials/${name}`, url)).then((r) => r.text());
    const [head, nav, footer] = await Promise.all([partial("head"), partial("nav"), partial("footer")]);

    const page = { title: "", description: "", canonical: "", updated: "" };
    const attr = (value) => value.replace(/"/g, "&quot;");

    return new HTMLRewriter()
      .on("head", {
        element(el) {
          el.prepend('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n', { html: true });
          el.onEndTag((end) => {
            let tags = head;
            if (page.canonical) {
              tags += [
                '<meta property="og:type" content="website">',
                '<meta property="og:site_name" content="Ithaca Share">',
                `<meta property="og:url" content="${attr(page.canonical)}">`,
                `<meta property="og:title" content="${attr(page.title)}">`,
                `<meta property="og:description" content="${attr(page.description)}">`,
                '<meta property="og:image:type" content="image/jpeg">',
                '<meta property="og:image:width" content="1200">',
                '<meta property="og:image:height" content="630">',
                '<meta name="twitter:card" content="summary_large_image">',
              ].join("\n") + "\n";
            }
            end.before(tags, { html: true });
          });
        },
      })
      .on("title", {
        text(chunk) {
          page.title += chunk.text;
        },
      })
      .on('meta[name="description"]', {
        element(el) {
          page.description = el.getAttribute("content") ?? "";
        },
      })
      .on('meta[name="updated"]', {
        element(el) {
          page.updated = el.getAttribute("content") ?? "";
        },
      })
      .on('link[rel="canonical"]', {
        element(el) {
          page.canonical = el.getAttribute("href") ?? "";
        },
      })
      .on('[data-include="nav"]', {
        element(el) {
          el.replace(nav.replace(`href="${url.pathname}"`, `href="${url.pathname}" aria-current="page"`), { html: true });
        },
      })
      .on('[data-include="footer"]', {
        element(el) {
          const file = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
          const subject = encodeURIComponent(page.title.replace(/^Ithaca Share: ?/, "") || "Cornell and Ithaca");
          let html = footer
            .replace("{subject}", subject)
            .replace("{url}", encodeURIComponent(page.canonical || url.href))
            .replace("{edit}", `https://github.com/ithacashare/IthacaShare.org/edit/main/public${file}`);
          html = page.updated ? html.replace("{updated}", page.updated) : html.replace(/\s*<li>Updated \{updated\}\.<\/li>/, "");
          el.replace(html, { html: true });
        },
      })
      .transform(response);
  },
};
