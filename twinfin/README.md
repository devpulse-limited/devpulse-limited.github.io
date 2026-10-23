# TwinFin landing page

`https://devpulse.co.uk/twinfin/`: a self-contained static page in the game's own look (no build step, no CDN,
no trackers, cookies or analytics). GitHub Pages serves each folder's `index.html`, so `/twinfin`,
`/twinfin/privacy` and `/twinfin/support` work without `.html`.

| Path | What |
|---|---|
| `index.html`, `styles.css`, `script.js` | The page. The hero is the game's scenery, layer for layer, drifting at each layer's parallax speed; hold anywhere on it and the macaw climbs while the clownfish dives, as in the game. |
| `privacy/`, `support/` | The privacy policy (its text also lives in `docs/privacy/index.html` in the TwinFin repo; keep the two in step) and the support page, in the same design: a short scene, the text on glass. The app's Settings sheet opens `https://devpulse.co.uk/twinfin/privacy`. |
| `assets/scenery/` | The game's silhouette layers, tinted with each layer's colour from its sprite JSON. |
| `assets/images/` | The twins (their rest pose, composited from the game's cut-out sheets), the raw store captures and the social preview (the Play feature graphic). |
| `assets/fonts/`, `assets/licences/` | Grandstander and Outfit (SIL OFL 1.1), as in the game. |

## At launch

- The App Store link (`storeLinks` in `script.js`, and the two App Store buttons in `index.html`, so they work without JavaScript) is `https://apps.apple.com/app/id6824252556`, with no country in it: the App Store opens each player's own storefront. The pages also carry the Smart App Banner (`apple-itunes-app`). For Google Play, replace its `null` in `storeLinks` with the listing URL; until then its button opens the "coming soon" dialog.
- In `index.html`, the JSON-LD says `"gamePlatform": "iOS"`; add Android when it ships, and update the FAQ answer "An Android version is on the way".
- AdMob's `app-ads.txt` goes at the site root (`/app-ads.txt`), not in this folder.

## Scenery and copy rules

- Every scenery strip drifts by exactly one tile per loop, and each tile is a whole number of pixels (`script.js` sets `--tile` from the scene's scale; on the Apps page the scale is fixed at 0.5 so every tile is whole). The PNGs have an 8 px transparent margin above and below the art in the 3x sheets, drawn outside the strip's box (`--m`). Change neither, or the loop shows a jump.
- Strip images are passed as `--img:url(/twinfin/assets/scenery/...)`, root absolute: a relative `url()` inside a custom property resolves against the stylesheet in some browsers and against the page in others.
- TwinFin copy on the site uses only commas, full stops, question marks and exclamation marks (no colons, semicolons, dashes, hyphens, apostrophes, brackets, quotes or symbols), apart from email addresses and URLs. The site does not mention ads or the purchase outside the privacy policy, which has to describe them.
