// Redirect www to the apex domain. Serve public/, filling each page's
// <nav data-include="nav"> and <footer data-include="footer"> from
// public/_partials/ so every page shares one header and one footer.
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
    const [nav, footer] = await Promise.all([partial("nav"), partial("footer")]);
    const current = nav.replace(`href="${url.pathname}"`, `href="${url.pathname}" aria-current="page"`);
    let updated = "";
    let title = "";
    let canonical = url.origin + url.pathname;

    return new HTMLRewriter()
      .on('meta[name="updated"]', {
        element(el) {
          updated = el.getAttribute("content") ?? "";
        },
      })
      .on("title", {
        text(chunk) {
          title += chunk.text;
        },
      })
      .on('link[rel="canonical"]', {
        element(el) {
          canonical = el.getAttribute("href") ?? canonical;
        },
      })
      .on('[data-include="nav"]', {
        element(el) {
          el.replace(current, { html: true });
        },
      })
      .on('[data-include="footer"]', {
        element(el) {
          const subject = encodeURIComponent(title.replace(/^Ithaca Share: ?/, "").replace(/&rsquo;|&#x27;/g, "’") || "Cornell and Ithaca");
          const file = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
          const edit = `https://github.com/ithacashare/IthacaShare.org/edit/main/public${file}`;
          let html = footer.replace("{subject}", subject).replace("{url}", encodeURIComponent(canonical)).replace("{edit}", edit);
          html = updated ? html.replace("{updated}", updated) : html.replace(/\s*<li>Updated \{updated\}\.<\/li>/, "");
          el.replace(html, { html: true });
        },
      })
      .transform(response);
  },
};
