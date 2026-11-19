#!/usr/bin/env python3
"""Copy rules for the Kids Paint guides, taken from ../../README.md ("Website copy style").

Visible copy uses full stops, commas, question marks and exclamation marks, with Oxford commas in lists of three
or more. No semicolons, colons, hyphens, dashes, brackets or contractions. Names in ALLOW are other companies' or
Apple's own menu labels and keep their own punctuation.

`python3 lint.py` checks the content files. build.py also runs `issues()` over the visible text of every page it
renders, so the words build.py adds itself are held to the same rules.
"""
import html, json, pathlib, re, sys

ALLOW = ["In-App Purchases", "In-app Purchases", "Wi-Fi"]
# A possessive keeps its apostrophe. A contraction does not, so these words are left for MARKS to find.
CONTRACTIONS = r"(?:it|that|what|there|here|let|he|she|who|where|how)"
HERE = pathlib.Path(__file__).parent
MARKS = re.compile(r"[:;—–\-'’‘\"“”&/()\[\]]")
SLOP = re.compile(r"\b(seamless|robust|leverage|delve|effortless|game changer|in today's|unlock the|elevate|"
                  r"ultimate|must have|look no further|whether you're)\b", re.I)


def strip(text):
    """The words a reader sees: no tags, no link addresses, and each allowed name replaced by a plain word."""
    text = re.sub(r'(?:href|src|class|id|role|aria-[a-z]+|width|height|loading|decoding|datetime)="[^"]*"', '', text)
    text = re.sub(r'\{\{[a-z-]+\}\}', ' ', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    for name in ALLOW:
        text = text.replace(html.unescape(name), 'NAME')
    text = re.sub(r"\b(?!" + CONTRACTIONS + r"[’']s\b)(\w+)[’']s\b", r"\1s", text, flags=re.I)
    return re.sub(r'https?://\S+', 'URL', text)


def issues(text):
    """Every mark or word the copy rules do not allow, each with the words around it."""
    plain = strip(text)
    found = [f"{m.group()!r} | …{plain[max(0, m.start() - 40):m.end() + 30].strip()}…" for m in MARKS.finditer(plain)]
    found += [f"slop word {w.group()!r}" for w in SLOP.finditer(plain)]
    return found


def main():
    bad = 0
    for path in sorted((HERE / 'content').glob('*.json')):
        guide = json.loads(path.read_text())
        parts = [(key, guide[key]) for key in ('title', 'meta_title', 'description', 'lede', 'card')]
        for section in guide['sections']:
            parts += [('h2', section['h2']), ('nav', section.get('nav', '')), ('section ' + section['h2'][:24], section['html'])]
        for question in guide.get('faq', []):
            parts += [('faq q', question['q']), ('faq a', question['a'])]
        for where, text in parts:
            for issue in issues(text):
                bad += 1
                print(f"{guide['slug']} | {where} | {issue}")
    for key, source in json.loads((HERE / 'sources.json').read_text()).items():
        for issue in issues(source['name']):
            bad += 1
            print(f"sources.json | {key} | {issue}")
    print('issues', bad)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
