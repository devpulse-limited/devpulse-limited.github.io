#!/usr/bin/env python3
"""Renders the AuthSome guides (content/*.json) into the static pages in the folder above this one.

Run `python3 lint.py && python3 build.py` here after changing a content file. The pages it writes are committed,
so the site itself has no build step. GitHub Pages does not publish folders whose names begin with an underscore.

Each content file:
{
  "slug": "...", "title": "H1 in title case", "meta_title": "... (<= 60 chars, no full stop at the end)",
  "description": "<= 155 chars", "lede": "plain text", "published": "2026-11-19", "modified": "2026-11-19", "order": 1,
  "card": "one line for the guides list",
  "sections": [{"h2": "...", "nav": "short name for the list of sections", "id": "optional, see Ids", "html": "<p>...</p>"}],
  "faq": [{"q": "...", "a": "plain text"}],
  "sources": ["a key from sources.json", ...],
  "related": ["slug", ...]
}

Words. A guide says "secret key" and "entry" for the things AuthSome calls a Secret and an Account, because a
reader of another app has never met AuthSome's words. A guide that uses either word explains it in its own
sentence, where the word is first needed, and marks that first use <dfn>secret key</dfn> or <dfn>entry</dfn>. The
build fails if the word is used with no such mark or before it. Secret and Account, with capitals, are kept for
sentences about AuthSome itself.

Cautions. The one paragraph in a guide that warns before a step that could lock the reader out is written
<p class="caution">...</p>. This script sets it on a plate with a visible label and role="note". One a guide at
most, so it keeps its weight.

Ids. A section's id comes from its heading. Give a section an "id" when another page links to it, so rewording
the heading does not break the link.

Tables. A table is written as <div class="table-scroll"><table><caption>...</caption><thead>... and its headings
are in sentence case. This script adds the header scopes, and makes a table of five or more columns a named region
that the keyboard can reach and scroll. Tables of up to four columns of short cells wrap to fit a 320px phone
(measured), so they are not a stop for the keyboard. Measure again before writing a wider one.

Sources. sources.json holds one name and one address for each page a guide relies on, so the same page is never
listed under two names or two addresses.
"""
import html, json, pathlib, re, sys

sys.dont_write_bytecode = True  # so importing lint.py leaves no cache folder in the repo
import lint

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent
BASE = "https://devpulse.co.uk/authsome/"
MONTHS = "January February March April May June July August September October November December".split()
IMAGE = BASE + "assets/images/social-preview.jpg"
IMAGE_ALT = "AuthSome on five iPhones, showing the Personal, Work and Side Projects Profiles, each in the colour of its chosen Account."
TITLE_LIMIT, DESCRIPTION_LIMIT = 60, 155
ORG = {"@type": "Organization", "@id": "https://devpulse.co.uk/#organization", "name": "DevPulse", "url": "https://devpulse.co.uk/",
       "logo": {"@type": "ImageObject", "url": "https://devpulse.co.uk/apple-touch-icon.png", "width": 180, "height": 180}}
SITE = {"@type": "WebSite", "@id": BASE + "#website", "url": BASE, "name": "AuthSome", "inLanguage": "en-GB",
        "publisher": {"@id": ORG["@id"]}}
AUTHOR = {"@type": "Person", "@id": "https://devpulse.co.uk/#junaid-younus", "name": "Junaid Younus",
          "url": "https://devpulse.co.uk/", "worksFor": {"@id": ORG["@id"]}}
# The same app as the home page's JSON-LD describes in full. A page is read by itself, so each guide carries
# enough of it for the reference to mean something. These values are copied from ../../index.html.
APP = {"@type": "SoftwareApplication", "@id": BASE + "#app", "name": "AuthSome", "url": BASE,
       "applicationCategory": "UtilitiesApplication", "operatingSystem": "iOS 26, iPadOS 26, macOS 26"}
# A guide that uses one of these words must explain it where it first appears, inside <dfn>.
TERM_WORDS = {"secret key": r"\bsecret keys?\b", "entry": r"\bentr(?:y|ies)\b"}
CAUTION_LABEL = "Caution"
LLMS = "https://devpulse.co.uk/llms.txt"
ABOUT = "AuthSome is a free authenticator app for iPhone, iPad and Mac, made by DevPulse. It keeps personal and work Accounts apart in Profiles and backs up to your own iCloud. It is coming soon to the App Store."
ABOUT_SHORT = "A free authenticator app for iPhone, iPad and Mac, coming soon to the App Store."
INDEX_TITLE = "AuthSome Guides. Help With 2FA Codes and Authenticator Apps"
INDEX_DESCRIPTION = "Short, plain guides to 2FA codes and authenticator apps on iPhone, iPad and Mac. Moving to a new phone, using a Mac, free apps and AutoFill."


def esc(text):
    return html.escape(text, quote=True)


def long_date(iso):
    year, month, day = iso.split("-")
    return f"{int(day)} {MONTHS[int(month) - 1]} {year}"


def time_tag(iso):
    return f'<time datetime="{iso}">{long_date(iso)}</time>'


def anchor(text, taken):
    """An id for a heading, made from its words and not yet used on the page."""
    base = re.sub(r"[^a-z0-9]+", "-", html.unescape(text).lower()).strip("-")
    name, count = base, 2
    while name in taken:
        name, count = f"{base}-{count}", count + 1
    taken.add(name)
    return name


def anchors(g):
    """The ids of a guide's sections and questions, in page order. Other guides may link to them."""
    taken = {"main", "common-questions", "app-title", "more-guides", "sources"} | {s["id"] for s in g["sections"] if s.get("id")}
    sections = [s.get("id") or anchor(s["h2"], taken) for s in g["sections"]]
    questions = [anchor(f["q"], taken) for f in g.get("faq", [])]
    return sections, questions


def crumbs(*extra):
    """The trail a page shows above its heading, then the page itself."""
    items = [("AuthSome", BASE), ("Guides", BASE + "guides/"), *extra]
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": name, "item": url} for i, (name, url) in enumerate(items)]}


def trail(links):
    rows = "".join(f'<li><a href="{href}">{name}</a></li>' for name, href in links)
    return f'<nav class="trail" aria-label="Breadcrumb"><ol>{rows}</ol></nav>'


def tables(text, slug, problems):
    """Adds what a table needs to be read without seeing it, and lets a wide one scroll by keyboard."""
    def one(match):
        body = match.group(1)
        caption = re.match(r"<caption>(.*?)</caption>", body)
        if not caption:
            problems.append(f"{slug}: a table has no caption")
        columns = len(re.findall(r"<th>", body))
        body = body.replace("<th>", '<th scope="col">')
        body = re.sub(r"<tr><td>(.*?)</td>", r'<tr><th scope="row">\1</th>', body)
        if columns < 5:
            return f'<div class="table-scroll"><table>{body}</table></div>'
        label = esc(lint.strip(caption.group(1)).strip()) if caption else ""
        return f'<div class="table-scroll" role="region" aria-label="{label}" tabindex="0"><table>{body}</table></div>'
    return re.sub(r'<div class="table-scroll"><table>(.*?)</table></div>', one, text, flags=re.S)


def head(title, description, url, og_type, graph, depth, dates=None):
    up = "../" * depth
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    times = ""
    if dates:
        times = (f'\n  <meta property="article:published_time" content="{dates[0]}">'
                 f'\n  <meta property="article:modified_time" content="{dates[1]}">')
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
  <link rel="alternate" type="text/plain" href="{LLMS}" title="Summary for AI agents">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:type" content="{og_type}">
  <meta property="og:url" content="{url}">
  <meta property="og:site_name" content="AuthSome">
  <meta property="og:locale" content="en_GB">
  <meta property="og:image" content="{IMAGE}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{esc(IMAGE_ALT)}">{times}
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


def about_box(up, short=False):
    """Where a reader finishes. A guide with its own section about AuthSome gets the short box, so it is not said twice."""
    text = ABOUT_SHORT if short else ABOUT
    return f"""      <section class="plate app-plate" aria-labelledby="app-title">
        <img class="squircle" src="{up}assets/app-icon-112.png" width="56" height="56" alt="" loading="lazy" decoding="async">
        <h2 id="app-title">About AuthSome</h2>
        <p>{text}</p>
        <p class="app-links"><a class="button" href="{up}">See AuthSome</a> <a href="{up}support/">Read the Support Page</a></p>
      </section>
"""


def guide_list(guides, prefix, cards=True):
    """The index gives each guide its one line answer. Under a guide the titles alone keep the list short."""
    rows = "\n".join(
        f'          <li><a href="{prefix}{g["slug"]}/">{esc(g["title"])}</a>' + (f'<span>{esc(g["card"])}</span>' if cards else '') + '</li>' for g in guides)
    return f'        <ul class="guide-list">\n{rows}\n        </ul>'


def render_guide(g, guides, sources, problems):
    url = f'{BASE}guides/{g["slug"]}/'
    listed = [sources[key] for key in g.get("sources", []) if key in sources]
    page = {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": g["meta_title"],
            "description": g["description"], "inLanguage": "en-GB", "isPartOf": {"@id": SITE["@id"]},
            "datePublished": g["published"], "dateModified": g["modified"], "breadcrumb": crumbs((g["title"], url))}
    article = {"@type": "Article", "@id": url + "#article", "headline": g["title"], "description": g["description"],
               "inLanguage": "en-GB", "image": IMAGE, "datePublished": g["published"], "dateModified": g["modified"],
               "author": {"@id": AUTHOR["@id"]}, "publisher": {"@id": ORG["@id"]},
               "mainEntityOfPage": {"@id": page["@id"]}, "mentions": {"@id": APP["@id"]},
               "citation": [{"@type": "CreativeWork", "name": s["name"], "url": s["url"]} for s in listed]}
    graph = [ORG, SITE, AUTHOR, APP, page, article]
    if g.get("faq"):
        graph.append({"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [
            {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in g["faq"]]})

    section_ids, question_ids = anchors(g)
    jump = [(s.get("nav", s["h2"]), section_ids[i]) for i, s in enumerate(g["sections"])]
    if g.get("faq"):
        jump.append(("Common Questions", "common-questions"))
    jump_links = "".join(f'<li><a href="#{name}">{esc(label)}</a></li>' for label, name in jump)
    # A guide's modified date is the day its facts were last read on the makers' pages (README, "Keeping them true").
    dates = f'Published {time_tag(g["published"])}. Facts last checked {time_tag(g["modified"])}.'

    out = [head(g["meta_title"], g["description"], url, "article", graph, 2, (g["published"], g["modified"]))]
    out.append(f"""
  <main id="main">
    <article class="doc guide">
      {trail([("AuthSome", "../../"), ("Guides", "../")])}
      <h1>{esc(g["title"])}</h1>
      <p class="doc-lede">{esc(g["lede"])}</p>
      <p class="byline">By Junaid Younus at <a href="https://devpulse.co.uk/">DevPulse</a>. {dates}</p>
      <nav class="guide-jump" aria-labelledby="jump-title">
        <h2 id="jump-title">On This Page</h2>
        <ol>{jump_links}</ol>
      </nav>
""")
    # The word must be explained where it is first used: in <dfn>, once, with no use of it before that.
    body = " ".join(s["html"] for s in g["sections"])
    everything = lint.strip(g["lede"] + " " + body) + " " + " ".join(f["a"] for f in g.get("faq", []))
    for name, pattern in TERM_WORDS.items():
        marks = list(re.finditer(r"<dfn>\s*" + pattern.replace(r"\b", "") + r"\s*</dfn>", body, re.I))
        if len(marks) > 1:
            problems.append(f'{g["slug"]}: "{name}" is marked as defined {len(marks)} times, once is enough')
        if not marks and re.search(pattern, everything, re.I):
            problems.append(f'{g["slug"]}: uses "{name}" without explaining it in <dfn>')
        if marks and re.search(pattern, lint.strip(g["lede"] + " " + body[:marks[0].start()]), re.I):
            problems.append(f'{g["slug"]}: uses "{name}" before the sentence that explains it')
    if body.count('<p class="caution">') > 1:
        problems.append(f'{g["slug"]}: more than one caution, keep it for the one step that can lock a reader out')
    for i, s in enumerate(g["sections"]):
        text = s["html"].strip()
        if "{{" in text:
            problems.append(f'{g["slug"]}: unknown token in {s["h2"]}')
        text = re.sub(r'<p class="caution">(.*?)</p>',
                      rf'<div class="caution" role="note"><p class="caution-label">{CAUTION_LABEL}</p><p>\1</p></div>', text, flags=re.S)
        text = tables(text, g["slug"], problems)
        out.append(f'      <section class="prose" id="{section_ids[i]}">\n        <h2>{esc(s["h2"])}</h2>\n        {text}\n      </section>\n')
    if g.get("faq"):
        out.append('      <section class="prose" id="common-questions">\n        <h2>Common Questions</h2>\n')
        for i, f in enumerate(g["faq"]):
            out.append(f'        <h3 id="{question_ids[i]}">{esc(f["q"])}</h3>\n        <p>{esc(f["a"])}</p>\n')
        out.append('      </section>\n')
    out.append(about_box("../../", short=any("AuthSome" in s["h2"] for s in g["sections"])))
    by_slug = {other["slug"]: other for other in guides}
    # Only the guides this one names as related, then the way to the rest, so the list stays short as guides are added.
    related = [by_slug[s] for s in g.get("related", []) if s in by_slug]
    out.append('      <section class="plate" id="more-guides">\n        <h2>More Guides</h2>\n' + guide_list(related, "../", cards=False)
               + '\n        <p class="all-guides"><a href="../">See All Guides</a></p>\n      </section>\n')
    if listed:
        rows = "\n".join(f'          <li><a href="{esc(s["url"])}">{esc(s["name"])}</a></li>' for s in listed)
        out.append(f'      <section class="plate sources" id="sources">\n        <h2>Sources</h2>\n        <ul>\n{rows}\n        </ul>\n      </section>\n')
    out.append("    </article>\n  </main>\n")
    out.append(foot(2))
    return check(OUT / g["slug"] / "index.html", "".join(out), g["slug"], problems)


def render_index(guides, problems):
    url = BASE + "guides/"
    page = {"@type": "CollectionPage", "@id": url + "#webpage", "url": url, "name": INDEX_TITLE, "description": INDEX_DESCRIPTION,
            "inLanguage": "en-GB", "isPartOf": {"@id": SITE["@id"]}, "about": {"@id": APP["@id"]},
            "dateModified": max(g["modified"] for g in guides), "breadcrumb": crumbs(),
            "mainEntity": {"@type": "ItemList", "numberOfItems": len(guides), "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": g["title"], "url": f'{url}{g["slug"]}/'}
                for i, g in enumerate(guides)]}}
    out = [head(INDEX_TITLE, INDEX_DESCRIPTION, url, "website", [ORG, SITE, APP, page], 1)]
    out.append(f"""
  <main id="main">
    <div class="doc guide guide-index">
      {trail([("AuthSome", "../")])}
      <h1>Guides to 2FA Codes and Authenticator Apps</h1>
      <p class="doc-lede">Plain answers about 2FA codes and authenticator apps on iPhone, iPad and Mac. Each guide answers one question, and none of them needs AuthSome.</p>
      <section class="plate">
        <h2>All Guides</h2>
{guide_list(guides, "")}
      </section>
{about_box("../")}    </div>
  </main>
""")
    out.append(foot(1))
    return check(OUT / "index.html", "".join(out), "index", problems)


def check(target, page, name, problems):
    """Holds the words build.py added to the same copy rules as the content files, and hands the page back unsaved."""
    body = re.sub(r"<script.*?</script>", "", page[page.index("<body"):], flags=re.S)
    for issue in lint.issues(body):
        problems.append(f"{name}: rendered page | {issue}")
    return target, page


def main():
    guides = sorted((json.loads(p.read_text()) for p in (HERE / "content").glob("*.json")), key=lambda g: g["order"])
    sources = json.loads((HERE / "sources.json").read_text())
    ids = {g["slug"]: set(sum(anchors(g), [])) | {"common-questions", "sources"} for g in guides}
    problems, pages = [], []
    for title, description, name in [(g["meta_title"], g["description"], g["slug"]) for g in guides] + [(INDEX_TITLE, INDEX_DESCRIPTION, "index")]:
        if len(title) > TITLE_LIMIT:
            problems.append(f"{name}: title is {len(title)} characters")
        if title.endswith("."):
            problems.append(f"{name}: title ends with a full stop")
        if len(description) > DESCRIPTION_LIMIT:
            problems.append(f"{name}: description is {len(description)} characters")
    for g in guides:
        for s in g.get("related", []):
            if s not in ids:
                problems.append(f'{g["slug"]}: related guide {s} does not exist')
        for key in g.get("sources", []):
            if key not in sources:
                problems.append(f'{g["slug"]}: source {key} is not in sources.json')
        for link, fragment in re.findall(r'href="\.\./([a-z0-9-]+)/(?:#([a-z0-9-]+))?"', " ".join(s["html"] for s in g["sections"])):
            if link not in ids:
                problems.append(f'{g["slug"]}: links to missing guide {link}')
            elif fragment and fragment not in ids[link]:
                problems.append(f'{g["slug"]}: links to missing section {link}#{fragment}')
        pages.append(render_guide(g, guides, sources, problems))
    pages.append(render_index(guides, problems))
    for p in problems:
        print("PROBLEM", p)
    if problems:
        print("nothing written")
        return 1
    # Pages are saved only when every one of them is clean, so a failed build leaves the committed pages alone.
    for target, page in pages:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page)
    print(f"rendered {len(guides)} guides")
    return 0


if __name__ == "__main__":
    sys.exit(main())
