#!/usr/bin/env python3
"""Checks what is kept in step by hand across the Kids Paint pages. Run `python3 check.py` here, after build.py.

It reads the files, not a server, changes nothing, and exits with 1 if anything is out of step.

- Every JSON-LD block parses. DevPulse and the app are described the same way wherever they appear.
- A page's title is the same in its title tag and social tags, has no closing full stop and fits 60 characters.
  Its description fits 155.
- Every page's canonical address is its og:url and is listed in /sitemap.xml, whose lastmod is not older than the
  page's dateModified. The sitemap lists no Kids Paint page that does not exist.
- A guide's FAQPage matches its content file, and the home page's FAQPage matches its visible questions.
- /llms.txt lists every guide by its title and its one line card, and the home page links to every guide.
- No Kids Paint page offers the app as available on Android or calls it coming soon to the App Store.
- Every link, image and stylesheet on a Kids Paint page that points inside the site exists, with its fragment.
- Every App Store link in an href is build.APP_STORE with an escaped query of a campaign name (ct, at most 40
  characters, unique on its page) and mt=8, and with build.APP_STORE_PROVIDER_TOKEN as pt once that is set.
  JSON-LD and /llms.txt keep the bare address.
"""
import html, json, pathlib, re, sys
import urllib.parse
import xml.etree.ElementTree as ET

sys.dont_write_bytecode = True
import build

HERE = pathlib.Path(__file__).parent
KIDSPAINT = HERE.parent.parent
SITE = KIDSPAINT.parent
ORIGIN = "https://devpulse.co.uk/"
problems = []


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
    text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()
    return re.sub(r" ([,.?!])", r"\1", text)


def check_page(path, sitemap):
    name = str(path.relative_to(SITE))
    page = path.read_text()
    nodes = graphs(page, name)
    title = html.unescape(re.search(r"<title>(.*?)</title>", page).group(1))
    description = meta(page, "description") or ""
    for where in ("og:title", "twitter:title"):
        if meta(page, where) != title:
            problems.append(f"{name}: {where} is not the title")
    if title.endswith(".") or len(title) > 60:
        problems.append(f"{name}: title ends with a full stop or is over 60 characters ({len(title)})")
    if len(description) > 155:
        problems.append(f"{name}: description is {len(description)} characters")
    canonical = re.search(r'<link rel="canonical" href="(.*?)"', page).group(1)
    expected = ORIGIN + str(path.parent.relative_to(SITE)) + "/"
    if canonical != expected or meta(page, "og:url") != expected:
        problems.append(f"{name}: canonical and og:url should both be {expected}")
    web = next((n for n in nodes if n.get("@type") in ("WebPage", "CollectionPage", "ContactPage")), {})
    if expected not in sitemap:
        problems.append(f"{name}: not in sitemap.xml")
    elif web.get("dateModified") and (sitemap[expected] or "") < web["dateModified"]:
        problems.append(f"{name}: sitemap lastmod {sitemap[expected]} is older than dateModified {web['dateModified']}")
    visible = re.sub(r"<script.*?</script>", "", page, flags=re.S)
    if re.search(r"(?i)coming soon to the</small><strong>App Store|on iPhone, iPad,? and Android|Android phones, and Android tablets", visible) \
            or re.search(r'"operatingSystem": "[^"]*Android', page) or "coming to <span id=\"store-name\">iOS" in page or "No ads. Coming soon." in page:
        problems.append(f"{name}: offers the app on Android or as coming soon to the App Store")
    for target in re.findall(r'(?:href|src)="([^"]+)"', page[page.index("<head"):]):
        if re.match(r"[a-z]+:", target) and not target.startswith(ORIGIN):
            continue
        local = target[len(ORIGIN):] if target.startswith(ORIGIN) else None
        address, _, fragment = (local if local is not None else target).partition("#")
        if not address and not fragment:
            continue
        file = (SITE / address) if local is not None else (path.parent / address)
        file = file / "index.html" if file.is_dir() else file
        if not file.exists():
            problems.append(f"{name}: {target} does not exist")
        elif fragment and f'id="{fragment}"' not in file.read_text():
            problems.append(f"{name}: {target} has no such id")
    store_links(page, name)
    return page, nodes


def store_links(page, name):
    """Each App Store link carries its own campaign, so App Analytics can tell the placements apart."""
    campaigns = []
    for raw in re.findall(r'href="(https://apps\.apple\.com[^"]*)"', page):
        if re.search(r"&(?!amp;)", raw):
            problems.append(f"{name}: an App Store href has an unescaped &, {raw}")
        address, _, query = html.unescape(raw).partition("?")
        params = urllib.parse.parse_qs(query)
        ct, pt = params.get("ct", [""])[0], params.get("pt", [""])[0]
        if address != build.APP_STORE or params.get("mt") != ["8"] or not ct:
            problems.append(f"{name}: App Store link {raw} should be build.APP_STORE with ct and mt=8")
        if len(ct) > build.CAMPAIGN_LIMIT:
            problems.append(f"{name}: campaign {ct} is over {build.CAMPAIGN_LIMIT} characters")
        if build.APP_STORE_PROVIDER_TOKEN and pt != build.APP_STORE_PROVIDER_TOKEN:
            problems.append(f"{name}: App Store link {raw} does not carry the provider token from build.py")
        campaigns.append(ct)
    for ct in sorted({c for c in campaigns if c and campaigns.count(c) > 1}):
        problems.append(f"{name}: campaign {ct} is used by more than one App Store link")


def main():
    tree = ET.parse(SITE / "sitemap.xml")
    space = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap = {u.findtext("s:loc", namespaces=space): u.findtext("s:lastmod", namespaces=space) for u in tree.getroot().findall("s:url", space)}
    pages = sorted(p for p in KIDSPAINT.rglob("index.html") if "_source" not in p.parts)
    organisations, read = set(), {}
    for path in pages:
        page, nodes = check_page(path, sitemap)
        read[str(path.relative_to(KIDSPAINT))] = (page, nodes)
        organisations |= {json.dumps(n, sort_keys=True) for n in nodes if n.get("@type") == "Organization"}
    if len(organisations) != 1:
        problems.append(f"DevPulse is described {len(organisations)} different ways in JSON-LD")
    for address in sitemap:
        if address.startswith(ORIGIN + "kidspaint/") and not (SITE / address[len(ORIGIN):] / "index.html").exists():
            problems.append(f"sitemap.xml lists {address}, which does not exist")

    # The home page's questions, shown and declared.
    home, nodes = read["index.html"]
    shown = [(html.unescape(q).strip(), plain(a)) for q, a in re.findall(r"<summary>(.*?)<span.*?</summary><p>(.*?)</p>", home, re.S)]
    declared = [(q["name"], q["acceptedAnswer"]["text"]) for n in nodes if n.get("@type") == "FAQPage" for q in n["mainEntity"]]
    if shown != declared:
        problems.append(f"home: the FAQPage ({len(declared)}) and the visible questions ({len(shown)}) differ")
    apps = [n for n in nodes if n.get("@type") == "MobileApplication"]
    if not apps or any(apps[0].get(k) != v for k, v in build.APP.items() if k != "@type"):
        problems.append("home: the MobileApplication JSON-LD is not build.APP")

    guides, _ = build.load()
    llms = (SITE / "llms.txt").read_text()
    if f"App Store: {build.APP_STORE} " not in llms:
        problems.append("llms.txt: the App Store line is not the bare build.APP_STORE address")
    for guide in guides:
        _, gnodes = read.get(f'guides/{guide["slug"]}/index.html', ("", []))
        declared = [(q["name"], q["acceptedAnswer"]["text"]) for n in gnodes if n.get("@type") == "FAQPage" for q in n["mainEntity"]]
        if declared != [(f["q"], f["a"]) for f in guide.get("faq", [])]:
            problems.append(f'{guide["slug"]}: the built page is not the content file, run build.py')
        line = f'- [{guide["title"]}]({ORIGIN}kidspaint/guides/{guide["slug"]}/): {guide["card"]}'
        if line not in llms:
            problems.append(f'llms.txt: no line for {guide["slug"]} with its title and card')
        if f'href="guides/{guide["slug"]}/"' not in home:
            problems.append(f'home: no link to the guide {guide["slug"]}')

    for problem in problems:
        print("PROBLEM", problem)
    print(f"checked {len(pages)} pages, {len(problems)} problems")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
