// Redirect www to the apex domain. Serve public/, completing each HTML page
// from public/_partials/: the shared <head> tags, Open Graph tags built from
// the page's own title, description, and canonical link, and the shared
// header and footer. Pages hold only what is unique to them.
//
// Every page but survivor services also gets Cloudflare Web Analytics: one
// cookieless beacon script, and a CSP that allows only that script and its
// report endpoint. Survivor services stays script-free (see public/_headers).
const BEACON =
  '<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token": "ffef846d4dc74dc19facdf14c75b9884"}\'></script>\n';
const BEACON_CSP =
  "default-src 'none'; script-src https://static.cloudflareinsights.com; connect-src https://cloudflareinsights.com; style-src 'self'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

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

    const analytics = !url.pathname.startsWith("/survivor-services");
    const page = { title: "", description: "", canonical: "", updated: "", write: "mailto:council@cityofithaca.org", label: "Write to Common Council" };
    const attr = (value) => value.replace(/"/g, "&quot;");

    const html = new HTMLRewriter()
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
            if (analytics) tags += BEACON;
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
      .on("a[data-write]", {
        element(el) {
          const href = el.getAttribute("href") ?? page.write;
          page.write = href;
          page.label = "";
          const subject = encodeURIComponent(page.title.replace(/^Ithaca Share: ?/, "") || "Cornell and Ithaca");
          const join = href.includes("?") ? "&" : "?";
          el.setAttribute("href", `${href}${join}subject=${subject}&body=${encodeURIComponent(page.canonical || url.href)}`);
          el.removeAttribute("data-write");
        },
        text(chunk) {
          page.label += chunk.text;
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
            .replace("{mailto}", page.write + (page.write.includes("?") ? "&amp;" : "?"))
            .replace("{label}", page.label.trim() || "Write to Common Council")
            .replace("{subject}", subject)
            .replace("{url}", encodeURIComponent(page.canonical || url.href))
            .replace("{edit}", `https://github.com/ithacashare/IthacaShare.org/edit/main/public${file}`);
          html = page.updated ? html.replace("{updated}", page.updated) : html.replace(/\s*<li>Updated \{updated\}\.<\/li>/, "");
          el.replace(html, { html: true });
        },
      })
      .transform(response);
    if (!analytics) return html;
    const headers = new Headers(html.headers);
    headers.set("Content-Security-Policy", BEACON_CSP);
    return new Response(html.body, { status: html.status, statusText: html.statusText, headers });
  },
};
