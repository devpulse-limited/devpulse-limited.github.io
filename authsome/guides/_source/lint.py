#!/usr/bin/env python3
"""Punctuation and style lint for the guides' content files. Names in ALLOW keep their own punctuation.

`python3 lint.py` checks the content files. build.py also runs `issues()` over the visible text of every page it
renders, so the words build.py itself adds (the box about AuthSome, the list of sections, the shared definitions)
are held to the same rule.
"""
import html, json, pathlib, re, sys

ALLOW = ["Import &amp; Export", "Import & Export", "AutoFill &amp; Passwords", "AutoFill & Passwords",
         "Passwords &amp; Keychain", "Passwords & Keychain", "Wi-Fi", "otpauth://", "otpauth-migration://", "1Password",
         "Time-based One-time Password"]
HERE = pathlib.Path(__file__).parent
MARKS = re.compile(r"[:;—–\-'’‘\"“”&/()\[\]]")
SLOP = re.compile(r"\b(seamless|robust|leverage|delve|effortless|game changer|in today's|peace of mind|simply|unlock)\b", re.I)


def strip(text):
    """The words a reader sees: no tags, no link addresses, and each allowed name replaced by a plain word."""
    text = re.sub(r'href="[^"]*"', '', text)
    text = re.sub(r'\{\{[a-z-]+\}\}', ' ', text)  # a shared definition, which build.py writes out and checks
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    for name in ALLOW:
        text = text.replace(name, 'NAME')
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
