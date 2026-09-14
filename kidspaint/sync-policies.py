#!/usr/bin/env python3
"""Render policy sections from Flutter localisation, or check for copy drift.
Usage: python3 sync-policies.py /path/to/app_en.arb [--check]
Only terms/index.html and privacy/index.html in this folder are changed.
"""
import argparse
import html
import json
from pathlib import Path
import re


def render_body(value):
    text = html.escape(value)
    # The labels remain identical to the app's text. Only the web adds links.
    for label, target in [('Support', '../support/'), ('Privacy Policy', '../privacy/'),
                          ('ICO', 'https://ico.org.uk/make-a-complaint/')]:
        text = re.sub(r'\b' + re.escape(label) + r'\b',
                      f'<a href="{target}">{label}</a>', text)
    return ''.join(f'<p>{paragraph}</p>' for paragraph in text.split('\n\n'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('arb', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    copy = json.loads(args.arb.read_text())
    root = Path(__file__).resolve().parent
    for name in ('privacy', 'terms'):
        path = root / name / 'index.html'
        source = path.read_text()
        def section(match):
            start, key = match.group(1), match.group(2)
            return start + '<h2>' + html.escape(copy[key + 'Title']) + '</h2>' + render_body(copy[key + 'Body']) + '</section>'
        rendered, count = re.subn(r'(<section id="[^"]+" data-policy-key="([^"]+)">).*?</section>', section, source, flags=re.S)
        rendered = re.sub(r'(<span class="info-date">).*?(</span>)',
                          lambda match: match.group(1) + html.escape(copy['policyUpdated']) + match.group(2), rendered)
        if count != 8:
            raise SystemExit(f'Expected 8 policy sections in {path.name}, got {count}')
        if args.check:
            if rendered != source:
                raise SystemExit(f'{path.name} differs from the app copy. Run without --check to synchronise.')
        else:
            path.write_text(rendered)
    print('Privacy and Terms match the app localisation.')


if __name__ == '__main__':
    main()
