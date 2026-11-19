#!/usr/bin/env python3
"""Checks what is kept in step by hand across the AuthSome pages. Run `python3 check.py` here, after build.py.

build.py keeps the guides right. This looks at the rest: the three hand written pages (home, privacy, support),
the AuthSome card on the Apps page, /sitemap.xml and /llms.txt. It reads the files, not a server, and changes
nothing. It exits with 1 if anything is out of step.

- The copy rules (lint.py) hold on the hand written pages and the card.
- Every JSON-LD block parses, and DevPulse is described the same way on every page.
- A page's title is the same in its title tag, its social tags and its JSON-LD, has no closing full stop and fits
  60 characters. Its description fits 155.
- The support page's FAQPage holds every question on the page, in order, with each answer exactly as shown.
- A guide's FAQPage matches its content file.
- Every page's canonical address is its og:url and is in the sitemap, whose lastmod is not older than the page's
  dateModified. The sitemap lists no AuthSome page that does not exist.
- /llms.txt lists every guide by its title and its one line card.
- The sentence that says what the app does is the same on the home page, in its social description and on the
  Apps card.
- Every link, image, stylesheet and script on an AuthSome page that points inside the site exists, with its fragment.
"""
import html, json, pathlib, re, sys
import xml.etree.ElementTree as ET

sys.dont_write_bytecode = True  # so importing lint.py leaves no cache folder in the repo
import lint

HERE = pathlib.Path(__file__).parent
AUTHSOME = HERE.parent.parent
SITE = AUTHSOME.parent
ORIGIN = "https://devpulse.co.uk/"
HAND_WRITTEN = ["index.html", "privacy/index.html", "support/index.html"]
MENU_NAMES = ["Date & Time"]   # names on the hand written pages that keep their owner's punctuation
problems = []


def copy_issues(text):
    for name in MENU_NAMES:
        text = text.replace(html.escape(name), "NAME").replace(name, "NAME")
    return lint.issues(text)


def graphs(page, name):
    found = []
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
        try:
            data = json.loads(block)
        except ValueError as error:
            problems.append(f"{name}: JSON-LD does not parse, {error}")
            continue
        found += data.get("@graph", [data])
    return found


def meta(page, key):
    match = re.search(rf'<meta (?:name|property)="{re.escape(key)}" content="(.*?)"', page)
    return html.unescape(match.group(1)) if match else None


def plain(fragment):
    """An answer as its FAQPage text should read: the words alone, with single spaces."""
    text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()
    return re.sub(r" ([,.])", r"\1", text)


def faq_on_page(page):
    body = page[page.index("<main"):page.index("</main>")]
    return [(html.unescape(q), plain(a)) for q, a in re.findall(r"<h3[^>]*>(.*?)</h3>(.*?)(?=<h3|</div>)", body, re.S)]


def check_page(path, sitemap):
    name = str(path.relative_to(SITE))
    page = path.read_text()
    nodes = graphs(page, name)
    title = html.unescape(re.search(r"<title>(.*?)</title>", page).group(1))
    description = meta(page, "description")
    web = next((n for n in nodes if n.get("@type") in ("WebPage", "CollectionPage")), {})
    for where, value in [("og:title", meta(page, "og:title")), ("twitter:title", meta(page, "twitter:title")), ("JSON-LD name", web.get("name"))]:
        if value != title:
            problems.append(f"{name}: {where} is not the title")
    if title.endswith(".") or len(title) > 60:
        problems.append(f"{name}: title ends with a full stop or is over 60 characters")
    if len(description) > 155:
        problems.append(f"{name}: description is {len(description)} characters")
    canonical = re.search(r'<link rel="canonical" href="(.*?)"', page).group(1)
    expected = ORIGIN + str(path.parent.relative_to(SITE)) + "/"
    if canonical != expected or meta(page, "og:url") != expected or web.get("url") != expected:
        problems.append(f"{name}: canonical, og:url and JSON-LD url should all be {expected}")
    if expected not in sitemap:
        problems.append(f"{name}: not in sitemap.xml")
    elif web.get("dateModified") and (sitemap[expected] or "") < web["dateModified"]:
        problems.append(f"{name}: sitemap lastmod {sitemap[expected]} is older than dateModified {web['dateModified']}")
    if "https://devpulse.co.uk/llms.txt" not in page:
        problems.append(f"{name}: no link to llms.txt")
    # Links and files inside the site.
    for target in re.findall(r'(?:href|src)="([^"]+)"', page[page.index("<head"):]):
        if re.match(r"[a-z]+:", target) and not target.startswith(ORIGIN):
            continue
        local = target[len(ORIGIN):] if target.startswith(ORIGIN) else None
        address, _, fragment = (local if local is not None else target).partition("#")
        file = (SITE / address) if local is not None else (path.parent / address)
        file = file / "index.html" if file.is_dir() else file
        if not file.exists():
            problems.append(f"{name}: {target} does not exist")
        elif fragment and f'id="{fragment}"' not in file.read_text():
            problems.append(f"{name}: {target} has no such id")
    return page, nodes


def main():
    tree = ET.parse(SITE / "sitemap.xml")   # fails loudly if the sitemap is not well formed
    space = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap = {u.findtext("s:loc", namespaces=space): u.findtext("s:lastmod", namespaces=space) for u in tree.getroot().findall("s:url", space)}
    pages = sorted(p for p in AUTHSOME.rglob("index.html") if "_source" not in p.parts)
    organisations, read = set(), {}
    for path in pages:
        page, nodes = check_page(path, sitemap)
        read[str(path.relative_to(AUTHSOME))] = (page, nodes)
        organisations |= {json.dumps(n, sort_keys=True) for n in nodes if n.get("@type") == "Organization"}
    if len(organisations) != 1:
        problems.append(f"DevPulse is described {len(organisations)} different ways in JSON-LD")
    for address in sitemap:
        if address.startswith(ORIGIN + "authsome/") and not (SITE / address[len(ORIGIN):] / "index.html").exists():
            problems.append(f"sitemap.xml lists {address}, which does not exist")

    # The copy rules on the hand written pages and the Apps card.
    apps = (SITE / "apps/index.html").read_text()
    graphs(apps, "apps/index.html")
    card = re.search(r'<article class="as-feature.*?</article>', apps, re.S).group()
    for name, text in [(n, read[n][0][read[n][0].index("<body"):]) for n in HAND_WRITTEN] + [("the Apps card", card)]:
        text = re.sub(r"<!--.*?-->|<script.*?</script>|<style.*?</style>|<svg.*?</svg>", " ", text, flags=re.S)
        text = re.sub(r'(?:aria-label|alt)="([^"]*)"', lambda m: f'>{m.group(1)}<', text)   # words a screen reader says
        for issue in copy_issues(text):
            problems.append(f"{name}: copy rules | {issue}")

    # The support page's questions, twice.
    page, nodes = read["support/index.html"]
    shown = faq_on_page(page)
    declared = [(q["name"], q["acceptedAnswer"]["text"]) for n in nodes if n.get("@type") == "FAQPage" for q in n["mainEntity"]]
    if shown != declared:
        for (q, a), (dq, da) in zip(shown, declared):
            if (q, a) != (dq, da):
                problems.append(f"support: the FAQPage and the page differ at {q!r}")
                break
        else:
            problems.append(f"support: the page has {len(shown)} questions and the FAQPage {len(declared)}")

    # Guides: the FAQPage against the content file, and the line in llms.txt.
    llms = (SITE / "llms.txt").read_text()
    for file in sorted((HERE / "content").glob("*.json")):
        guide = json.loads(file.read_text())
        _, nodes = read.get(f'guides/{guide["slug"]}/index.html', ("", []))
        declared = [(q["name"], q["acceptedAnswer"]["text"]) for n in nodes if n.get("@type") == "FAQPage" for q in n["mainEntity"]]
        if declared != [(f["q"], f["a"]) for f in guide.get("faq", [])]:
            problems.append(f'{guide["slug"]}: the built page is not the content file, run build.py')
        line = f'- [{guide["title"]}]({ORIGIN}authsome/guides/{guide["slug"]}/): {guide["card"]}'
        if line not in llms:
            problems.append(f'llms.txt: no line for {guide["slug"]} with its title and card')

    # One sentence says what the app does.
    home = read["index.html"][0]
    sentence = re.search(r'<div class="pitch">.*?<p>(.*?)</p>', home, re.S).group(1).split(". ", 1)[1]
    for where, text in [("og:description", meta(home, "og:description")), ("twitter:description", meta(home, "twitter:description")), ("the Apps card", plain(card))]:
        if sentence.rstrip(".") not in text:
            problems.append(f"{where} does not carry the home page's sentence, {sentence!r}")

    for problem in problems:
        print("PROBLEM", problem)
    print(f"checked {len(pages)} pages, {len(problems)} problems")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
