#!/usr/bin/env python3
"""Renders the AuthSome guides (content/*.json) into the static pages in the folder above this one.

Run `python3 lint.py && python3 build.py` here after changing a content file. The pages it writes are committed,
so the site itself has no build step. GitHub Pages does not publish folders whose names begin with an underscore.

Each content file:
{
  "slug": "...", "title": "H1 in title case", "meta_title": "... (<= 60 chars)", "description": "<= 155 chars",
  "lede": "plain text", "published": "2026-11-19", "modified": "2026-11-19", "order": 1,
  "card": "one line for the guides list",
  "sections": [{"h2": "...", "html": "<p>...</p>"}],
  "faq": [{"q": "...", "a": "plain text"}],
  "sources": [{"name": "...", "url": "https://..."}],
  "related": ["slug", ...]
}
"""
import html, json, pathlib, re, sys

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent
BASE = "https://devpulse.co.uk/authsome/"
MONTHS = "January February March April May June July August September October November December".split()
IMAGE = BASE + "assets/images/social-preview.jpg"
IMAGE_ALT = "AuthSome on five iPhones, showing the Personal, Work and Side Projects Profiles, each in the colour of its chosen Account."
ORG = {"@type": "Organization", "@id": "https://devpulse.co.uk/#organization", "name": "DevPulse", "url": "https://devpulse.co.uk/"}
SITE = {"@type": "WebSite", "@id": BASE + "#website", "url": BASE, "name": "AuthSome", "inLanguage": "en-GB",
        "publisher": {"@id": ORG["@id"]}}
AUTHOR = {"@type": "Person", "@id": "https://devpulse.co.uk/#junaid-younus", "name": "Junaid Younus",
          "worksFor": {"@id": ORG["@id"]}}


def esc(text):
    return html.escape(text, quote=True)


def long_date(iso):
    year, month, day = iso.split("-")
    return f"{int(day)} {MONTHS[int(month) - 1]} {year}"


def crumbs(*extra):
    items = [("DevPulse", "https://devpulse.co.uk/"), ("Apps", "https://devpulse.co.uk/apps/"), ("AuthSome", BASE),
             ("Guides", BASE + "guides/"), *extra]
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": name, "item": url} for i, (name, url) in enumerate(items)]}


def head(title, description, url, og_type, graph, depth):
    up = "../" * depth
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    return f"""<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#F2F2F7" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <link rel="canonical" href="{url}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="author" content="Junaid Younus">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:type" content="{og_type}">
  <meta property="og:url" content="{url}">
  <meta property="og:site_name" content="AuthSome">
  <meta property="og:locale" content="en_GB">
  <meta property="og:image" content="{IMAGE}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{esc(IMAGE_ALT)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(title)}">
  <meta name="twitter:description" content="{esc(description)}">
  <meta name="twitter:image" content="{IMAGE}">
  <meta name="twitter:image:alt" content="{esc(IMAGE_ALT)}">
  <script type="application/ld+json">{ld}</script>
  <link rel="icon" type="image/png" href="{up}assets/favicon.png">
  <link rel="apple-touch-icon" href="{up}assets/apple-touch-icon.png">
  <link rel="stylesheet" href="{up}styles.css">
  <link rel="stylesheet" href="{up}guides/guides.css">
</head>
<body class="sub guides">
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="col bar">
    <a class="brand" href="{up}"><img class="squircle" src="{up}assets/header-logo.png" width="34" height="34" alt="">AuthSome</a>
    <nav aria-label="Main">
      <a href="{up}guides/"{' aria-current="page"' if depth == 1 else ''}>Guides</a>
      <a class="wide-only" href="{up}privacy/">Privacy</a>
      <a href="{up}support/">Support</a>
    </nav>
  </header>
"""


def foot(depth):
    up = "../" * depth
    return f"""
  <footer class="col site-footer">
    <p>AuthSome is made by <a href="https://devpulse.co.uk/">DevPulse</a> in the UK.</p>
    <p><a href="{up}guides/">Guides</a><a href="{up}privacy/">Privacy</a><a href="{up}support/">Support</a></p>
    <p class="note">AuthSome is not affiliated with, sponsored by or endorsed by any of the apps and services named in these guides. Their names are trademarks of their owners.</p>
  </footer>
</body>
</html>
"""


def guide_list(guides, prefix):
    rows = "\n".join(
        f'          <li><a href="{prefix}{g["slug"]}/">{esc(g["title"])}</a><span>{esc(g["card"])}</span></li>' for g in guides)
    return f'        <ul class="guide-list">\n{rows}\n        </ul>'


def render_guide(g, by_slug):
    url = f'{BASE}guides/{g["slug"]}/'
    page = {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": g["meta_title"],
            "description": g["description"], "inLanguage": "en-GB", "isPartOf": {"@id": SITE["@id"]},
            "datePublished": g["published"], "dateModified": g["modified"], "breadcrumb": crumbs((g["title"], url))}
    article = {"@type": "Article", "@id": url + "#article", "headline": g["title"], "description": g["description"],
               "inLanguage": "en-GB", "image": IMAGE, "datePublished": g["published"], "dateModified": g["modified"],
               "author": {"@id": AUTHOR["@id"]}, "publisher": {"@id": ORG["@id"]},
               "mainEntityOfPage": {"@id": page["@id"]}, "mentions": {"@id": BASE + "#app"}}
    graph = [ORG, SITE, AUTHOR, page, article]
    if g.get("faq"):
        graph.append({"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [
            {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in g["faq"]]})

    out = [head(g["meta_title"], g["description"], url, "article", graph, 2)]
    dates = f'Published {long_date(g["published"])}.'
    if g["modified"] != g["published"]:
        dates = f'Updated {long_date(g["modified"])}.'
    out.append(f"""
  <main id="main">
    <article class="doc guide">
      <p class="trail"><a href="../">Guides</a></p>
      <h1>{esc(g["title"])}</h1>
      <p class="doc-lede">{esc(g["lede"])}</p>
      <p class="byline">By Junaid Younus. {dates}</p>
""")
    for s in g["sections"]:
        out.append(f'      <section class="plate">\n        <h2>{esc(s["h2"])}</h2>\n        {s["html"].strip()}\n      </section>\n')
    if g.get("faq"):
        out.append('      <section class="plate">\n        <h2>Common Questions</h2>\n')
        for f in g["faq"]:
            out.append(f'        <h3>{esc(f["q"])}</h3>\n        <p>{esc(f["a"])}</p>\n')
        out.append('      </section>\n')
    out.append("""      <section class="plate app-plate" aria-labelledby="app-title">
        <img class="squircle" src="../../assets/apple-touch-icon.png" width="56" height="56" alt="">
        <h2 id="app-title">About AuthSome</h2>
        <p>AuthSome is a free authenticator app for iPhone, iPad and Mac, made by DevPulse. It keeps personal and work Accounts apart in Profiles and backs up to your own iCloud. It is coming soon to the App Store.</p>
        <a class="button" href="../../">See AuthSome</a>
      </section>
""")
    related = [by_slug[s] for s in g.get("related", []) if s in by_slug]
    if related:
        out.append('      <section class="plate">\n        <h2>More Guides</h2>\n' + guide_list(related, "../") + '\n      </section>\n')
    if g.get("sources"):
        rows = "\n".join(f'          <li><a href="{esc(s["url"])}" rel="noopener">{esc(s["name"])}</a></li>' for s in g["sources"])
        out.append(f'      <section class="plate sources">\n        <h2>Sources</h2>\n        <ul>\n{rows}\n        </ul>\n      </section>\n')
    out.append("    </article>\n  </main>\n")
    out.append(foot(2))
    target = OUT / g["slug"] / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("".join(out))


def render_index(guides):
    url = BASE + "guides/"
    title = "AuthSome Guides. Help With 2FA Codes and Authenticator Apps."
    description = "Short, plain guides to 2FA codes and authenticator apps on iPhone, iPad and Mac. Moving to a new phone, backing up, and what to do when you are locked out."
    page = {"@type": "CollectionPage", "@id": url + "#webpage", "url": url, "name": title, "description": description,
            "inLanguage": "en-GB", "isPartOf": {"@id": SITE["@id"]}, "about": {"@id": BASE + "#app"},
            "dateModified": max(g["modified"] for g in guides), "breadcrumb": crumbs(),
            "mainEntity": {"@type": "ItemList", "numberOfItems": len(guides), "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": g["title"], "url": f'{url}{g["slug"]}/'}
                for i, g in enumerate(guides)]}}
    out = [head(title, description, url, "website", [ORG, SITE, page], 1)]
    out.append(f"""
  <main id="main">
    <article class="doc guide">
      <h1>Guides</h1>
      <p class="doc-lede">Plain answers about 2FA codes and authenticator apps on iPhone, iPad and Mac. Each guide answers one question, and none of them needs AuthSome.</p>
      <section class="plate">
        <h2>All Guides</h2>
{guide_list(guides, "")}
      </section>
      <section class="plate app-plate" aria-labelledby="app-title">
        <img class="squircle" src="../assets/apple-touch-icon.png" width="56" height="56" alt="">
        <h2 id="app-title">About AuthSome</h2>
        <p>AuthSome is a free authenticator app for iPhone, iPad and Mac, made by DevPulse. It keeps personal and work Accounts apart in Profiles and backs up to your own iCloud. It is coming soon to the App Store.</p>
        <a class="button" href="../">See AuthSome</a>
      </section>
    </article>
  </main>
""")
    out.append(foot(1))
    (OUT / "index.html").write_text("".join(out))


def main():
    guides = sorted((json.loads(p.read_text()) for p in (HERE / "content").glob("*.json")), key=lambda g: g["order"])
    by_slug = {g["slug"]: g for g in guides}
    problems = []
    for g in guides:
        if len(g["meta_title"]) > 62:
            problems.append(f'{g["slug"]}: meta_title is {len(g["meta_title"])} characters')
        if len(g["description"]) > 158:
            problems.append(f'{g["slug"]}: description is {len(g["description"])} characters')
        for s in g.get("related", []):
            if s not in by_slug:
                problems.append(f'{g["slug"]}: related guide {s} does not exist')
        for link in re.findall(r'href="\.\./([a-z0-9-]+)/"', " ".join(s["html"] for s in g["sections"])):
            if link not in by_slug:
                problems.append(f'{g["slug"]}: links to missing guide {link}')
        render_guide(g, by_slug)
    render_index(guides)
    print(f"rendered {len(guides)} guides")
    for p in problems:
        print("PROBLEM", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
