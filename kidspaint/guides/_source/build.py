#!/usr/bin/env python3
"""Renders the Kids Paint guides (content/*.json) into the static pages in the folder above this one.

Run `python3 lint.py && python3 build.py && python3 check.py` here after changing a content file. The pages it
writes are committed, so the site itself has no build step. GitHub Pages does not publish folders whose names begin
with an underscore.

Each content file:
{
  "slug": "...", "title": "H1 in title case", "meta_title": "... (<= 60 chars, no full stop at the end)",
  "description": "<= 155 chars", "lede": "plain text, the short answer", "published": "2026-11-19",
  "modified": "2026-11-19", "order": 1, "query": "the search the guide answers, for the README's list",
  "card": "one line for the guides list and llms.txt",
  "sections": [{"h2": "...", "nav": "short name for the list of sections", "id": "optional", "html": "<p>...</p>"}],
  "faq": [{"q": "...", "a": "plain text"}],
  "sources": ["a key from sources.json", ...],
  "related": ["slug", ...]
}

Where a reader stops. A guide puts {{app}} once, on its own, between paragraphs of the section where Kids Paint
honestly fits. It becomes a small card with the App Store link, so a reader who has their answer halfway down the
page has the next step in front of them. Every guide also ends on the larger Kids Paint card.

Cautions. One paragraph a guide at most may be <p class="caution">...</p>, for the step that could cost money or
lose a child's pictures. It is set on a plate with a visible label and role="note".

Tables. Write <div class="table-scroll"><table><caption>...</caption><thead>... with headings in sentence case.
This script adds the header scopes. Keep tables to three columns so they fit a 320px phone.

Facts. Everything said about Kids Paint must be true of the version on the App Store. It is on iPhone and iPad
only, Android is not out, and the copy names no template count and no price (see ../../README.md and the app's
store pack). Facts about anyone else come from the pages listed in sources.json, read on the guide's modified date.
"""
import html, json, pathlib, re, sys

sys.dont_write_bytecode = True  # so importing lint.py leaves no cache folder in the repo
import lint

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent
BASE = "https://devpulse.co.uk/kidspaint/"
APP_STORE = "https://apps.apple.com/app/kids-paint-colouring-art-book/id6810289526"
# Apple App Analytics provider token, the same for every app on the developer account. It comes from App Store
# Connect, App Analytics, Campaigns, where a generated campaign link shows it as `pt`. If it ever changes, paste the new
# value here, rebuild, and change `pt=` in the two App Store links in ../../index.html as well (check.py fails until
# every link carries the value set here). Clicks then show per campaign
# (the `ct` value) in App Analytics. APP_STORE itself stays the bare address, for JSON-LD and /llms.txt.
APP_STORE_PROVIDER_TOKEN = "127329907"
CAMPAIGN_LIMIT = 40  # Apple keeps at most 40 characters of a campaign name
# Words left out of a guide's slug to make its short campaign name, such as "no-ads" or "age-start".
CAMPAIGN_FILLER = {"a", "an", "the", "for", "to", "of", "with", "and", "can", "what", "how", "app", "kids", "colouring"}
LLMS = "https://devpulse.co.uk/llms.txt"
MONTHS = "January February March April May June July August September October November December".split()
IMAGE = BASE + "assets/images/social-preview.jpg"
IMAGE_ALT = "A coloured woodland deer and birds from Kids Paint."
TITLE_LIMIT, DESCRIPTION_LIMIT = 60, 155
ORG = {"@type": "Organization", "@id": "https://devpulse.co.uk/#organization", "name": "DevPulse", "url": "https://devpulse.co.uk/",
       "logo": {"@type": "ImageObject", "url": "https://devpulse.co.uk/apple-touch-icon.png", "width": 180, "height": 180}}
SITE = {"@type": "WebSite", "@id": BASE + "#website", "url": BASE, "name": "Kids Paint", "inLanguage": "en-GB",
        "publisher": {"@id": ORG["@id"]}}
AUTHOR = {"@type": "Person", "@id": "https://devpulse.co.uk/#junaid-younus", "name": "Junaid Younus",
          "url": "https://devpulse.co.uk/", "worksFor": {"@id": ORG["@id"]}}
# The same app as the home page's JSON-LD describes in full. Copied from ../../index.html, so keep them together.
APP = {"@type": "MobileApplication", "@id": BASE + "#app", "name": "Kids Paint", "url": BASE,
       "applicationCategory": "EducationalApplication", "operatingSystem": "iOS 15.0 or later, iPadOS 15.0 or later",
       "installUrl": APP_STORE, "sameAs": [APP_STORE],
       "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"}}
CAUTION_LABEL = "Good to Know"
ABOUT = ("Kids Paint is a colouring and drawing app for children on iPhone and iPad, made by DevPulse in the UK. "
         "It has no ads. Free pictures and blank paper come with every painting tool, and an optional subscription "
         "adds the premium pictures.")
ABOUT_SHORT = "A colouring and drawing app for kids on iPhone and iPad, with no ads. Free on the App Store."
INDEX_TITLE = "Kids Paint Guides. Colouring Apps, Screen Time and More"
INDEX_DESCRIPTION = ("Plain, practical guides for parents about colouring and drawing apps for kids. Ads, toddlers, "
                     "iPad set up, offline play, and what free really means.")

SVG_LIBRARY = """  <svg class="svg-library" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
    <symbol id="spark" viewBox="0 0 40 40"><path d="M20 2c0 13-5 18-18 18 13 0 18 5 18 18 0-13 5-18 18-18C25 20 20 15 20 2Z" fill="currentColor"/></symbol>
    <symbol id="arrow" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="phone" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10 18h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></symbol>
  </defs></svg>"""


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
    taken = {"main", "common-questions", "about-kids-paint", "more-guides", "sources"} | {s["id"] for s in g["sections"] if s.get("id")}
    sections = [s.get("id") or anchor(s["h2"], taken) for s in g["sections"]]
    questions = [anchor(f["q"], taken) for f in g.get("faq", [])]
    return sections, questions


def crumbs(*extra):
    items = [("Kids Paint", BASE), ("Guides", BASE + "guides/"), *extra]
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": name, "item": url} for i, (name, url) in enumerate(items)]}


def trail(links):
    rows = "".join(f'<li><a href="{href}">{name}</a></li>' for name, href in links)
    return f'<nav class="trail" aria-label="Breadcrumb"><ol>{rows}</ol></nav>'


def store_link(campaign):
    """The App Store address for one placement, so App Analytics counts its clicks as campaign `campaign`."""
    if len(campaign) > CAMPAIGN_LIMIT:
        raise ValueError(f"campaign {campaign} is {len(campaign)} characters, Apple keeps {CAMPAIGN_LIMIT}")
    token = f"pt={APP_STORE_PROVIDER_TOKEN}&" if APP_STORE_PROVIDER_TOKEN else ""
    return f"{APP_STORE}?{token}ct={campaign}&mt=8"


def store_href(campaign):
    return esc(store_link(campaign))


def campaign_name(slug):
    """A guide's short name in campaign names, its slug without the filler words."""
    return "-".join(word for word in slug.split("-") if word not in CAMPAIGN_FILLER)[:24].strip("-")


def store_button(campaign, extra=""):
    return (f'<a class="store-button{extra}" href="{store_href(campaign)}"><svg aria-hidden="true"><use href="#phone"/></svg>'
            '<span><small>Download on the</small><strong>App Store</strong></span></a>')


def tables(text, slug, problems):
    def one(match):
        body = match.group(1)
        if not re.match(r"<caption>(.*?)</caption>", body):
            problems.append(f"{slug}: a table has no caption")
        if len(re.findall(r"<th>", body)) > 3:
            problems.append(f"{slug}: a table has more than three columns")
        body = body.replace("<th>", '<th scope="col">')
        body = re.sub(r"<tr><td>(.*?)</td>", r'<tr><th scope="row">\1</th>', body)
        return f'<div class="table-scroll"><table>{body}</table></div>'
    return re.sub(r'<div class="table-scroll"><table>(.*?)</table></div>', one, text, flags=re.S)


def head(title, description, url, og_type, graph, depth, campaign, dates=None):
    up = "../" * depth
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    times = ""
    if dates:
        times = (f'\n  <meta property="article:published_time" content="{dates[0]}">'
                 f'\n  <meta property="article:modified_time" content="{dates[1]}">')
    current = ' aria-current="page"' if depth == 1 else ''
    return f"""<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#fcf9f2">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <link rel="canonical" href="{url}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="author" content="Junaid Younus">
  <meta name="apple-itunes-app" content="app-id=6810289526">
  <link rel="alternate" type="text/plain" href="{LLMS}" title="Summary for AI agents">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:type" content="{og_type}">
  <meta property="og:url" content="{url}">
  <meta property="og:site_name" content="Kids Paint">
  <meta property="og:locale" content="en_GB">
  <meta property="og:image" content="{IMAGE}">
  <meta property="og:image:width" content="900">
  <meta property="og:image:height" content="900">
  <meta property="og:image:alt" content="{esc(IMAGE_ALT)}">{times}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(title)}">
  <meta name="twitter:description" content="{esc(description)}">
  <meta name="twitter:image" content="{IMAGE}">
  <meta name="twitter:image:alt" content="{esc(IMAGE_ALT)}">
  <script type="application/ld+json">{ld}</script>
  <link rel="icon" type="image/png" href="{up}assets/favicon.png">
  <link rel="apple-touch-icon" href="{up}assets/apple-touch-icon.png">
  <link rel="preload" href="{up}assets/fonts/Chewy-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="{up}styles.css">
  <link rel="stylesheet" href="{up}guides/guides.css">
</head>
<body class="guides">
  <a class="skip-link" href="#main">Skip to content</a>
{SVG_LIBRARY}
  <header class="site-header info-header wrap"><a class="brand" href="{up}" aria-label="Kids Paint home"><img class="brand-icon" src="{up}assets/brand-icon.png" width="40" height="40" alt=""><span>Kids Paint</span></a><nav aria-label="Main navigation"><a href="{up}guides/"{current}>Guides</a><a href="{up}support/">Support</a><a class="button button-small" href="{store_href(campaign)}">Get the App <svg aria-hidden="true"><use href="#arrow"/></svg></a></nav></header>
"""


def foot(depth):
    up = "../" * depth
    return f"""  <footer class="site-footer info-footer wrap"><a class="brand" href="{up}" aria-label="Kids Paint home"><img class="brand-icon" src="{up}assets/brand-icon.png" width="40" height="40" alt=""><span>Kids Paint</span></a><p>A little space for big imaginations.</p><div><a href="{up}">Home</a><a href="{up}guides/">Guides</a><a href="{up}terms/">Terms</a><a href="{up}privacy/">Privacy</a><a href="{up}support/">Support</a><a href="https://devpulse.co.uk/">Made by DevPulse</a></div><p class="guide-note">Kids Paint is not affiliated with Apple, Google, or any other company named in these guides. Their names are trademarks of their owners.</p></footer>
</body>
</html>
"""


def inline_app(up, campaign):
    """The small card a guide places with {{app}}, where its answer honestly points to the app."""
    return (f'<aside class="guide-inline-app" aria-label="Kids Paint">'
            f'<img class="brand-icon" src="{up}assets/brand-icon.png" width="48" height="48" alt="" loading="lazy" decoding="async">'
            f'<p><strong>Kids Paint</strong> is our colouring app for iPhone and iPad. No ads, free pictures, and grown up checks before buying or sharing.</p>'
            f'<a class="button button-small" href="{store_href(campaign)}">See It on the App Store <svg aria-hidden="true"><use href="#arrow"/></svg></a></aside>')


def about_box(up, campaign, short=False):
    text = ABOUT_SHORT if short else ABOUT
    return f"""    <section class="guide-app wrap" id="about-kids-paint" aria-labelledby="about-title">
      <div class="guide-app-card">
        <svg class="download-spark one" aria-hidden="true"><use href="#spark"/></svg>
        <img class="brand-icon" src="{up}assets/brand-icon.png" width="72" height="72" alt="" loading="lazy" decoding="async">
        <span class="eyebrow">Made by the people who wrote this guide</span>
        <h2 id="about-title">Meet Kids Paint</h2>
        <p>{text}</p>
        <div class="store-buttons">{store_button(campaign)}</div>
        <a class="text-link" href="{up}">See the pictures and tools <svg aria-hidden="true"><use href="#arrow"/></svg></a>
      </div>
    </section>
"""


def guide_list(guides, prefix, cards=True):
    rows = "\n".join(
        f'          <li><a href="{prefix}{g["slug"]}/">{esc(g["title"])}</a>' + (f'<span>{esc(g["card"])}</span>' if cards else '') + '</li>'
        for g in guides)
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
    jump_links = "".join(f'<a href="#{name}">{esc(label)}</a>' for label, name in jump)
    dates = f'Published {time_tag(g["published"])}. Facts last checked {time_tag(g["modified"])}.'

    short = campaign_name(g["slug"])
    out = [head(g["meta_title"], g["description"], url, "article", graph, 2, f"kp-guide-{short}-header", (g["published"], g["modified"]))]
    out.append(f"""  <main id="main">
    <div class="info-hero guide-hero wrap">
      {trail([("Kids Paint", "../../"), ("Guides", "../")])}
      <h1>{esc(g["title"])}</h1>
      <p class="guide-lede">{esc(g["lede"])}</p>
      <p class="byline">By Junaid Younus at <a href="https://devpulse.co.uk/">DevPulse</a>, makers of Kids Paint. {dates}</p>
    </div>
    <div class="info-layout guide-layout wrap">
      <aside class="info-contents" aria-label="On this page"><h2>On This Page</h2>{jump_links}</aside>
      <article class="info-card guide-article">
""")
    body = " ".join(s["html"] for s in g["sections"])
    if body.count("{{app}}") != 1:
        problems.append(f'{g["slug"]}: needs {{{{app}}}} exactly once, found {body.count("{{app}}")}')
    if body.count('<p class="caution">') > 1:
        problems.append(f'{g["slug"]}: more than one caution')
    for i, s in enumerate(g["sections"]):
        text = s["html"].strip().replace("{{app}}", inline_app("../../", f"kp-guide-{short}-inline"))
        if "{{" in text:
            problems.append(f'{g["slug"]}: unknown token in {s["h2"]}')
        text = re.sub(r'<p class="caution">(.*?)</p>',
                      rf'<div class="caution" role="note"><p class="caution-label">{CAUTION_LABEL}</p><p>\1</p></div>', text, flags=re.S)
        text = tables(text, g["slug"], problems)
        out.append(f'        <section id="{section_ids[i]}">\n          <h2>{esc(s["h2"])}</h2>\n          {text}\n        </section>\n')
    if g.get("faq"):
        out.append('        <section id="common-questions">\n          <h2>Common Questions</h2>\n')
        for i, f in enumerate(g["faq"]):
            out.append(f'          <h3 id="{question_ids[i]}">{esc(f["q"])}</h3>\n          <p>{esc(f["a"])}</p>\n')
        out.append('        </section>\n')
    out.append("      </article>\n    </div>\n")
    out.append(about_box("../../", f"kp-guide-{short}-end", short=any("Kids Paint" in s["h2"] for s in g["sections"])))
    by_slug = {other["slug"]: other for other in guides}
    related = [by_slug[s] for s in g.get("related", []) if s in by_slug]
    out.append('    <div class="guide-after wrap">\n      <section class="info-card" id="more-guides">\n        <h2>More Guides</h2>\n'
               + guide_list(related, "../", cards=False)
               + '\n        <p class="all-guides"><a href="../">See All Guides</a></p>\n      </section>\n')
    if listed:
        rows = "\n".join(f'          <li><a href="{esc(s["url"])}">{esc(s["name"])}</a></li>' for s in listed)
        out.append(f'      <section class="info-card sources" id="sources">\n        <h2>Sources</h2>\n        <ul>\n{rows}\n        </ul>\n      </section>\n')
    out.append("    </div>\n  </main>\n")
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
    out = [head(INDEX_TITLE, INDEX_DESCRIPTION, url, "website", [ORG, SITE, APP, page], 1, "kp-guides-index-header")]
    out.append(f"""  <main id="main">
    <div class="info-hero guide-hero wrap">
      {trail([("Kids Paint", "../")])}
      <span class="eyebrow">Kids Paint. For the grown ups</span>
      <h1>Guides for Grown Ups</h1>
      <p class="guide-lede">Plain answers about colouring and drawing apps for children. Each guide answers one question a parent asks, with sources, and most of the advice works whichever app you choose.</p>
    </div>
    <div class="guide-after guide-index wrap">
      <section class="info-card">
        <h2>All Guides</h2>
{guide_list(guides, "")}
      </section>
    </div>
{about_box("../", "kp-guides-index-end")}  </main>
""")
    out.append(foot(1))
    return check(OUT / "index.html", "".join(out), "index", problems)


def check(target, page, name, problems):
    """Holds the words build.py added to the same copy rules as the content files, and hands the page back unsaved."""
    body = re.sub(r"<script.*?</script>|<svg.*?</svg>", "", page[page.index("<body"):], flags=re.S)
    body = re.sub(r'(?:aria-label|alt)="([^"]*)"', lambda m: f'>{m.group(1)}<', body)
    for issue in lint.issues(body):
        problems.append(f"{name}: rendered page | {issue}")
    return target, page


def load():
    guides = sorted((json.loads(p.read_text()) for p in (HERE / "content").glob("*.json")), key=lambda g: g["order"])
    return guides, json.loads((HERE / "sources.json").read_text())


def main():
    guides, sources = load()
    ids = {g["slug"]: set(sum(anchors(g), [])) | {"common-questions", "sources"} for g in guides}
    problems, pages = [], []
    for title, description, name in [(g["meta_title"], g["description"], g["slug"]) for g in guides] + [(INDEX_TITLE, INDEX_DESCRIPTION, "index")]:
        if len(title) > TITLE_LIMIT:
            problems.append(f"{name}: title is {len(title)} characters")
        if title.endswith("."):
            problems.append(f"{name}: title ends with a full stop")
        if len(description) > DESCRIPTION_LIMIT:
            problems.append(f"{name}: description is {len(description)} characters")
    shorts = [campaign_name(g["slug"]) for g in guides]
    for g, short in zip(guides, shorts):
        if not short or shorts.count(short) > 1:
            problems.append(f'{g["slug"]}: its campaign name {short!r} is empty or shared with another guide')
        for campaign in (f"kp-guide-{short}-{placement}" for placement in ("header", "inline", "end")):
            if len(campaign) > CAMPAIGN_LIMIT:
                problems.append(f'{g["slug"]}: campaign {campaign} is over {CAMPAIGN_LIMIT} characters')
    if problems:
        for p in problems:
            print("PROBLEM", p)
        print("nothing written")
        return 1
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
    for target, page in pages:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page)
    print(f"rendered {len(guides)} guides")
    return 0


if __name__ == "__main__":
    sys.exit(main())
