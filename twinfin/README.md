# TwinFin landing page

`https://devpulse.co.uk/twinfin/`: a self-contained static page in the game's own look (no build step, no CDN,
no trackers, cookies or analytics). GitHub Pages serves each folder's `index.html`, so `/twinfin`,
`/twinfin/privacy` and `/twinfin/support` work without `.html`.

| Path | What |
|---|---|
| `index.html`, `styles.css`, `script.js` | The page. The hero is the game's scenery, layer for layer, drifting at each layer's parallax speed; hold anywhere on it and the macaw climbs while the clownfish dives, as in the game. |
| `privacy/` | The privacy policy (source: `docs/privacy/index.html` in the TwinFin repo; keep the two in step). The app's Settings sheet opens `https://devpulse.co.uk/twinfin/privacy`. |
| `support/` | Support page with the contact email, Remove Ads / Restore Purchases and leaderboard help. |
| `assets/scenery/` | The game's silhouette layers, tinted with each layer's colour from its sprite JSON. |
| `assets/images/` | The twins (their rest pose, composited from the game's cut-out sheets), the raw store captures and the social preview (the Play feature graphic). |
| `assets/fonts/`, `assets/licences/` | Grandstander and Outfit (SIL OFL 1.1), as in the game. |

## At launch

- In `script.js`, replace the two `null`s in `storeLinks` with the App Store and Google Play URLs. The buttons then say "Download on the App Store" / "Get it on Google Play" and link there; until then they open a "coming soon" dialog.
- In `index.html`, the JSON-LD says `"gamePlatform": "iOS"`; add Android when it ships, and update the FAQ answer "An Android version is on the way".
- AdMob's `app-ads.txt` goes at the site root (`/app-ads.txt`), not in this folder.
