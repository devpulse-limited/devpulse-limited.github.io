# AuthSome landing page

`https://devpulse.co.uk/authsome/`: a self-contained static page in the app's own look (no build step, no CDN, no
web fonts, no trackers, cookies or analytics). GitHub Pages serves each folder's `index.html`, so `/authsome`,
`/authsome/privacy` and `/authsome/support` work without `.html`.

| Path | What |
|---|---|
| `index.html`, `styles.css`, `script.js`, `accounts.js` | The page, kept short on purpose: the app's main screen, a five-row list of what it does in the app's own words, three captures and a footer. The top of the page is a working copy of the Grid, following `docs/SPEC.md` in the AuthSome repo: the chosen Account and its 2FA code sit on a band in its Brand colour, the other Accounts are tiles below, and choosing a tile or a Profile recolours the whole screen. Violet is only the accent. The hero's colours are worked out as the app works them out: `brandPalette` in `script.js` is a port of `BrandPalette.swift`, and the hero's shades, spheres, glow and faded logo follow `HeroBackground.swift`, the icons `BrandIconView.swift` and the wash `AppBackground.swift`. If the app's numbers change, change them here too. The 2FA codes are plain samples, one digit repeated (`111 111`, then `222 222`, round to `000 000`), that turn every 30 seconds with the countdown ring. The page does not work real codes out. Without scripts the tiles give way to `mac-personal.jpg`. Text is the system font, and light or dark follows the device. |
| `privacy/`, `support/` | The privacy policy and the support page, as the app's sub-screens look: the system's grouped background with plain plates. They load no script. |
| `assets/images/` | Captures of the app on iPhone (`shot-*.jpg`, 540 x 1173), iPad and Mac, taken with its screenshot Accounts, and `social-preview.jpg`, the link preview. The page uses `shot-personal`, `shot-work-list`, `shot-side-projects-dark` and `mac-personal`; the Apps page also uses `shot-work-list-dark`. The rest are spare. |

The Apps page (`../apps/index.html`) has AuthSome's card (`.as-feature`) and names it in its title and descriptions.

## At launch

- Put the App Store URL in `storeLinks` in `script.js` (`https://apps.apple.com/app/id…`, with no country in it), and
  set the `href` of the App Store button in `index.html` to it with "Download on the" as its small line, so
  it works without JavaScript. Until then the button opens the "coming soon" dialog.
- Add the Smart App Banner to the three pages: `<meta name="apple-itunes-app" content="app-id=…">`.
- In `index.html`, add `installUrl` to the JSON-LD.
- In `../apps/index.html`, change the card's "Coming soon to iPhone, iPad and Mac".
- The app has no link to these pages yet. The App Store listing needs the privacy policy URL
  (`https://devpulse.co.uk/authsome/privacy`) and the support URL (`https://devpulse.co.uk/authsome/support`).

## Keep in step with the app

- **Privacy.** The policy and the home page's Privacy row say what the in-app Privacy page says (SPEC §4.14 and §5):
  nothing is collected, and usage notes stay in the system log. If an analytics provider is ever chosen (ADR 0012),
  update `privacy/index.html` and its date, and the Privacy row on the home page, before that version ships.
- **Facts quoted on the pages**: 30 days in Recently Deleted, iOS, iPadOS and macOS 26, and the import sources
  (Google Authenticator, 2FAS, Aegis, setup links, AuthSome backups).
- Only what v1 has is claimed. No Apple Watch, Android, widgets or scanning a QR code on a Mac's screen.

## Copy rules

- Use the app's vocabulary from `GLOSSARY.md` in the AuthSome repo, with its capitals: Account, Profile, Folder,
  Issuer, Secret, Brand, Website, Theme, Recently Deleted, Apple Account. Sentences say "2FA codes", not "Codes".
- As on the other DevPulse pages, copy uses only commas, full stops, question marks and exclamation marks (no colons,
  semicolons, dashes, hyphens, apostrophes or contractions), apart from email addresses and URLs. So it is "end to
  end encrypted" and "sign in page". Headings are in title case.
- The home page's Profiles, AutoFill, iCloud and Privacy rows are the app's own sentences (onboarding, AutoFill
  setup and the Privacy page). Change them there first. The Import row was written for the page.
- The live screen shows real services with their logos, the same Accounts as the app's screenshots (`accounts.js`,
  made from `ScreenshotAccounts.swift` and the app's Brand catalogue, whose logos are Simple Icons, CC0). CC0 covers
  the drawings, not the trademarks, so the footer says the services are examples and are not affiliated with
  AuthSome. Keep that line while any service is shown, and drop a service from `accounts.js` if its owner asks.
