# Coconut Rocket landing page

`https://devpulse.co.uk/coconut-rocket/`: a self-contained static page in the game's own look (no build step, no CDN,
no trackers, cookies or analytics). GitHub Pages serves each folder's `index.html`, so `/coconut-rocket`,
`/coconut-rocket/privacy` and `/coconut-rocket/support` work without `.html`.

| Path | What |
|---|---|
| `index.html`, `styles.css`, `script.js` | The page. The hero is the game's jungle shaft at game scale (390 x 844 game px, `--s` sets the scale): hold on it and Kiko climbs, slide to steer, drop too low and Scissorjaw bites. Phones get a full-bleed copy of the home screen, desktops a framed phone beside the copy. |
| `privacy/`, `support/` | The privacy policy and the support page, in the same design. The plain text draft of the policy lives in `docs/store/privacy-policy.md` in the CoconutRocket repo; keep the two in step. |
| `assets/images/` | Art drawn by the game itself: Kiko (still and four flame frames), eight crew pilots, Scissorjaw, the three zones, the coin sheet, store screenshots and the social preview. |
| `assets/fonts/`, `assets/licences/` | Lilita One and Nunito (SIL OFL 1.1), as in the game. |

## Regenerating the art

All images come from the game's own drawing code. In the CoconutRocket repo run
`flutter test tool/site/export_site_art_test.dart`; it writes straight into this folder's `assets/` (override the
target with `SITE_ASSETS`). The pilot canvas is 278 x 589 with the pilot's visual centre at (139.5, 174.5), which is
why `.pilot` uses `translate: -50% -29.6%`.

## At launch

- Put the App Store and Google Play URLs in `storeLinks` in `script.js`. Until then each button opens the "coming soon" dialog. The App Store link needs no country.
- In `index.html`, the JSON-LD says `"gamePlatform": "iOS"`; add Android when it ships.
- AdMob's `app-ads.txt` is at the site root and already lists the publisher ID.

## Copy rules

Copy uses only commas, full stops, question marks and exclamation marks (no colons, semicolons, dashes, apostrophes
or contractions), apart from email addresses and URLs. Headings are in title case. The site does not mention ads
outside the privacy policy, which has to describe them.
