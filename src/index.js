// Redirect www to the apex domain. Serve public/, completing each HTML page
// from public/_partials/: the shared <head> tags, Open Graph tags built from
// the page's own title, description, and canonical link, and the shared
// header and footer. Pages hold only what is unique to them.
//
// Translations live under public/<code>/ with their own partials in
// public/_partials/<code>/. Every page gets links to itself in each language.
//
// Every page also gets Cloudflare Web Analytics: one cookieless beacon script.
// public/_headers allows only that script and its report endpoint.
const BEACON =
  '<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token": "ffef846d4dc74dc19facdf14c75b9884"}\'></script>\n';

// Each language's URL prefix, lang attribute, and name for itself.
const LANGUAGES = [
  { code: "en", tag: "en", name: "English" },
  { code: "es", tag: "es", name: "Español" },
  { code: "ar", tag: "ar", name: "العربية" },
  { code: "zh", tag: "zh-Hans", name: "中文" },
];
const ORIGIN = "https://ithacashare.org";

// Pages give their date as "November 10, 2026"; translations show it in their own language.
const MONTHS = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};
function localDate(english, code) {
  const date = new Date(`${english} 12:00`);
  if (code === "en" || isNaN(date)) return english;
  const [day, month, year] = [date.getDate(), date.getMonth(), date.getFullYear()];
  if (code === "zh") return `${year}年${month + 1}月${day}日`;
  return code === "es" ? `${day} de ${MONTHS.es[month]} de ${year}` : `${day} ${MONTHS.ar[month]} ${year}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    const response = await env.ASSETS.fetch(request);
    if (!response.headers.get("content-type")?.includes("text/html")) return response;

    // The page's language, and its path without the language prefix. A missing
    // page's language links go to each homepage.
    const lang = LANGUAGES.find(({ code }) => url.pathname.startsWith(`/${code}/`)) ?? LANGUAGES[0];
    const path = response.status === 404 ? "/" : lang.code === "en" ? url.pathname : url.pathname.slice(lang.code.length + 1);
    const prefix = (code) => (code === "en" ? "" : `/${code}`);

    const asset = (pathname) => env.ASSETS.fetch(new URL(pathname, url)).then((r) => (r.ok ? r.text() : ""));
    const partial = (name, code = "en") => asset(`/_partials${prefix(code)}/${name}`);
    // Emails go to English-speaking offices: a translated page's email carries the English page's title and address.
    const [head, nav, footer, english] = await Promise.all([
      partial("head"),
      partial("nav", lang.code),
      partial("footer", lang.code),
      lang.code === "en" ? "" : asset(path),
    ]);
    const englishTitle = english.match(/<title>([^<]*)<\/title>/)?.[1];

    const page = { title: "", description: "", canonical: "", updated: "", write: "mailto:council@cityofithaca.org", label: "" };
    const attr = (value) => value.replace(/"/g, "&quot;");
    const subject = () => encodeURIComponent((englishTitle ?? page.title).replace(/&amp;/g, "&").replace(/^Ithaca Share: ?/, "") || "Cornell and Ithaca");
    const link = () => encodeURIComponent(page.canonical ? `${ORIGIN}${path}` : url.href);
    const languages = LANGUAGES.map(({ code, tag, name }) =>
      `<a href="${prefix(code)}${path}" lang="${tag}" hreflang="${tag}"${code === lang.code ? ' aria-current="true"' : ""}>${name}</a>`,
    ).join("\n    ");

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
                ...LANGUAGES.map(({ code, tag }) => `<link rel="alternate" hreflang="${tag}" href="${ORIGIN}${prefix(code)}${path}">`),
                `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${path}">`,
              ].join("\n") + "\n";
            }
            end.before(tags + BEACON, { html: true });
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
          const join = href.includes("?") ? "&" : "?";
          el.setAttribute("href", `${href}${join}subject=${subject()}&body=${link()}`);
          el.removeAttribute("data-write");
        },
        text(chunk) {
          page.label += chunk.text;
        },
      })
      .on('[data-include="nav"]', {
        element(el) {
          el.replace(nav.replace(`href="${url.pathname}"`, `href="${url.pathname}" aria-current="page"`).replace("{languages}", languages), { html: true });
        },
      })
      .on('[data-include="footer"]', {
        element(el) {
          const file = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
          // {label|Write to Common Council}: the page's own button label, or the words after the bar.
          let html = footer
            .replace("{mailto}", page.write + (page.write.includes("?") ? "&amp;" : "?"))
            .replace(/\{label\|([^}]*)\}/, (_, fallback) => page.label.trim() || fallback)
            .replace("{subject}", subject())
            .replace("{url}", link())
            .replace("{english}", path)
            .replace("{edit}", `https://github.com/ithacashare/IthacaShare.org/edit/main/public${file}`);
          html = page.updated ? html.replace("{updated}", localDate(page.updated, lang.code)) : html.replace(/\s*<li>[^<]*\{updated\}[^<]*<\/li>/, "");
          el.replace(html, { html: true });
        },
      })
      .transform(response);
  },
};
