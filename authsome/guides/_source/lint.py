#!/usr/bin/env python3
"""Punctuation and style lint for the guides' content files. Names in ALLOW keep their own punctuation."""
import json, pathlib, re, sys, html
ALLOW = ["Import &amp; Export", "Import & Export", "AutoFill &amp; Passwords", "AutoFill & Passwords", "Wi-Fi", "otpauth://", "otpauth-migration://", "1Password", "Time-based One-time Password"]
HERE = pathlib.Path(__file__).parent
bad = 0
def strip(t):
    t = re.sub(r'href="[^"]*"', '', t)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = html.unescape(t)
    for a in ALLOW: t = t.replace(a, 'NAME')
    t = re.sub(r'https?://\S+', 'URL', t)
    return t
def check(slug, where, text):
    global bad
    t = strip(text)
    for m in re.finditer(r"[:;—–\-'’‘\"“”&/()\[\]]", t):
        bad += 1
        print(f"{slug} | {where} | {m.group()!r} | …{t[max(0,m.start()-40):m.end()+30].strip()}…")
    for w in re.finditer(r"\b(seamless|robust|leverage|delve|effortless|game changer|in today's|peace of mind|simply|unlock)\b", t, re.I):
        bad += 1
        print(f"{slug} | {where} | slop word {w.group()!r}")
for p in sorted((HERE/'content').glob('*.json')):
    g = json.loads(p.read_text())
    s = g['slug']
    for k in ('title','meta_title','description','lede','card'): check(s, k, g[k])
    for sec in g['sections']:
        check(s, 'h2', sec['h2']); check(s, 'section ' + sec['h2'][:24], sec['html'])
    for f in g.get('faq', []):
        check(s, 'faq q', f['q']); check(s, 'faq a', f['a'])
    for src in g.get('sources', []): check(s, 'source', src['name'])
print('issues', bad)
sys.exit(1 if bad else 0)
