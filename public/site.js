// Share: native share sheet where supported, otherwise copy the link.
const url = document.querySelector('link[rel="canonical"]').href;
for (const button of document.querySelectorAll(".share")) {
  if (!navigator.share && !navigator.clipboard) continue;
  button.hidden = false;
  button.addEventListener("click", async () => {
    if (navigator.share) {
      try { await navigator.share({ title: document.title, url }); } catch {}
      return;
    }
    await navigator.clipboard.writeText(url);
    button.textContent = "Link copied";
  });
}

for (const button of document.querySelectorAll(".print")) {
  button.addEventListener("click", () => print());
}

// Show every source when printing.
addEventListener("beforeprint", () => {
  for (const d of document.querySelectorAll(".sources-list")) d.open = true;
});

// Council email opens with this page's link already in it.
for (const link of document.querySelectorAll('a[href^="mailto:council@"]')) {
  const subject = encodeURIComponent(document.title.replace(/^Ithaca Share: ?/, "") || "Cornell and Ithaca");
  link.href = `mailto:council@cityofithaca.org?subject=${subject}&body=${encodeURIComponent(url)}`;
}
