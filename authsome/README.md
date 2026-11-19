# AuthSome landing page

`https://devpulse.co.uk/authsome/`: a self-contained static page in the app's own look (no build step, no CDN, no
web fonts, no trackers, cookies or analytics). GitHub Pages serves each folder's `index.html`, so `/authsome`,
`/authsome/privacy` and `/authsome/support` work without `.html`.

| Path | What |
|---|---|
| `index.html`, `styles.css`, `script.js`, `accounts.js` | The page, kept short on purpose: the app's main screen, a six-row list of what it does, three captures and a footer. "How the home page works" below has the detail. |
| `privacy/`, `support/` | The privacy policy and the support page, as the app's sub-screens look: the system's grouped background with plain plates. They load no script. |
| `assets/` | `favicon.png` (64px), `header-logo.png` (102px, the header's logo on all three pages, shown at 34px and sharp on a 3x screen), `apple-touch-icon.png` (180px), `app-icon.png` (512px, named in the JSON-LD) and `app-icon-256.jpg`, which the Apps page's card shows. The last two were made from the published icons with `sips`. |
| `assets/images/` | Captures of the app on iPhone (`shot-*.jpg`, 540 x 1173) and Mac, taken with its screenshot Accounts, and `social-preview.jpg`, the link preview. The page uses `shot-personal`, `shot-work-list` (`shot-work-list-dark` when the device is in dark mode, each inside a link to its own file, with `styles.css` showing one of the two), `shot-side-projects-dark` and `mac-personal`. Only files a page uses are kept here. Others can be captured again from the app. |

The Apps page (`../apps/index.html`) has AuthSome's card (`.as-feature`) and names it in its title and descriptions. Its JSON-LD entry for AuthSome carries the same `@id` as the home page's (`https://devpulse.co.uk/authsome/#app`), so the two describe one app. The card's turning colour and spheres rest while it is off screen. Its label and paragraph are full white with a soft shade behind the letters, because they can lie over the lightest sphere (`#9d6bff`), where white alone measures about 3.5 to 1. The shade is not counted in that figure.

## How the home page works

- **Header.** It sits outside `main`, laid over the top of the band (`.over-band`, with `--bar-height` keeping the
  band clear of it), so "Skip to content" passes it.
- **The screen.** The top of the page is a working copy of the Grid, following `docs/SPEC.md` in the AuthSome repo:
  the chosen Account and its 2FA code sit on a band in its Brand colour, the other Accounts are tiles below, and
  choosing a tile or a Profile recolours the whole screen. Violet is only the accent.
- **Colours.** They are worked out as the app works them out: `brandPalette` in `script.js` is a port of
  `BrandPalette.swift`, and the hero's shades, spheres, glow, faded logo and grain follow `HeroBackground.swift` and
  `GrainTexture.swift`, the icons `BrandIconView.swift` and the wash `AppBackground.swift`. If the app's numbers
  change, change them here too.
- **Changing colour.** The new colour fades in over the last, and a timer settles it as well as the end of the fade,
  so a browser that is not painting still ends on the chosen Account's colour and logo.
- **Screen readers.** The chosen Account's Issuer and Account name are a `role="status"`, written only when they
  change, so a screen reader hears the choice and not every new 2FA code.
- **2FA codes.** They are plain samples, one digit repeated (`111 111`, then `222 222`, round to `000 000`), that
  turn every 30 seconds with the countdown ring. The page does not work real codes out. The ring is run down by the
  browser's own animation, not redrawn each frame, and steps once a second with Reduce Motion.
- **The line above the tiles** says the screen can be tried and the 2FA codes are samples. It is in the HTML, and the
  no-script style hides it.
- **On a phone** (760px and under) the chosen Account sits above the App Store badge, by `order` in `styles.css`,
  so the 2FA code is on the first screen. At 375 by 812 the 2FA code ends 585px down and the line above the tiles
  791px down, so that line shows only when the browser's bars are out of the way. Tab still reaches the badge before
  the Profile button there, as in the HTML. At 359px and under the header's links take less padding on all three pages, and on
  the home page the header also takes a little of the page's margin and its links are 14px, so the wordmark, which
  never shrinks, and the two links fit side by side.
- **Folder names** are `h3` headings, as in the app, under a visually hidden `h2` ("Sample Accounts") in the HTML.
- **Resting.** The spheres stop drifting while the band is off screen (`script.js` sets `resting` on `.band`).
- **Room kept for the script.** `.account:empty` and `#tiles:empty` in `styles.css` hold the height of what
  `script.js` draws there, so the page below does not move down when it arrives. `#tiles` must stay empty in the
  HTML, with nothing between its tags. The tiles' heights (one for the phone layout, one for the wider one) were
  measured for the first Profile, so measure again if its Accounts or Folders change.
- **Without `accounts.js`**, if it fails to load, `script.js` sets `no-demo` on the page, which then stands as it
  does without scripts, and puts the Mac capture in itself. The App Store badge still opens its dialog.
- **Without scripts** the Mac capture (`mac-personal.jpg`) stands in for the tiles, the pitch stands in one column
  and the App Store badge is a label on glass, not the black button. Those styles are a `<noscript><style>` in the
  head of `index.html`, not in `styles.css`, so none of it shows for a moment before the scripts run.
- **Contrast on the band.** The Brand's own shades hold white text to 3 to 1 (black text to 4.5 to 1), which is
  enough for large text only, and the glow in the top corner lightens them further, at any width. So the line under the headline
  is 24px, which counts as large text, the headline has a soft shade behind white letters, and the header's
  wordmark and links sit on glass. The chosen Account's name and the Next line are small text with no glass, so
  they keep the whole text colour. In the dark the Next line is at .9 strength until its last five seconds, which
  still measured above 4.5 to 1 there. In the light .9 measured under it, so it is not used. Folder headings on the
  wash are the text colour at three quarters strength, because the muted grey measured under 4.5 to 1 in the light.
- **Captures.** The three sit three across at every width, in line with the list above them. On a phone they are a
  strip to glance at, which keeps the page short there, and each one is a link that opens it at full size. Under
  each is a one or two word caption (Grid, List, Dark Theme), since the `alt` text is not seen.
- Text is the system font, and light or dark follows the device.

## Guides

`guides/` holds the guides: one page per search query ("Do Authenticator Apps Transfer to a New iPhone?"), written
to be found on Google and quoted by AI assistants, with a box about AuthSome where the reader finishes. The search
data that says what to write next comes from Google Search Console (the `sc-domain:devpulse.co.uk` property).

- **Source.** `guides/_source/content/*.json` holds each guide's text, and `guides/_source/build.py` renders them
  into `guides/<slug>/index.html` and the index. Change a content file, never the rendered page, then run
  `python3 lint.py && python3 build.py` in `_source`. The rendered pages are committed, so the site still has no
  build step. GitHub Pages does not publish a folder whose name begins with an underscore.
- **Shared pieces.** `guides/_source/sources.json` holds each source's one name and URL, and a guide lists sources
  by key. In a guide's text, `{{secret-key}}` and `{{entry}}` expand to the sentence that defines that word, the
  same in every guide, and the build fails if a guide uses the word without defining it. Guides say "secret key" and
  "entry" for other apps. Secret and Account, with capitals, are only for AuthSome. The build also checks the
  punctuation of the rendered pages and the lengths of titles and descriptions.
- **Adding a guide.** Add a content file (copy an existing one for its shape, and give it the next `order`), run the
  two scripts, then add its URL to `/sitemap.xml` and a line under "AuthSome Guides" in `/llms.txt`. Link to it from
  two or three guides that already get visits, in their text or their `related` list.
- **Rules.** A guide answers one question, in its first two sentences, for someone who never installs AuthSome.
  A fact about another company's app comes from that company's own pages, read on the day, and is listed under
  Sources. Where a maker does not document something, the guide says so. Nothing claims testing that did not
  happen. A step that could lock a reader out has a warning before it. The Copy rules below apply, and a product or
  menu name keeps the punctuation its owner gives it. `lint.py` checks the punctuation.
- **Keeping them true.** Other companies change their apps. When a guide's facts are checked again, change its
  `modified` date, and its `lastmod` in the sitemap.
- **At launch.** Change "coming soon" in the About AuthSome box (`build.py`) and in each guide's own AuthSome
  section, and make the box's button the App Store link.

## Being found

- **Search engines.** Each page has its own title, description, canonical URL, Open Graph tags and JSON-LD: the home
  page describes the app (`SoftwareApplication`, with its features and screenshots), the support page lists its
  questions (`FAQPage`, made from the questions on the page, so change both together), and all three carry
  breadcrumbs. The `FAQPage` holds every question on the support page, with each answer's text exactly as shown.
  The site-wide `/sitemap.xml` lists these pages and `/robots.txt` points to it. Update a page's `lastmod` there,
  and `dateModified` in its JSON-LD (all three pages have one, on the `WebPage`), when its text changes.
- **AI agents.** `/llms.txt` at the site root is a plain summary of DevPulse's apps with AuthSome's facts in full
  (price, platforms, features, privacy, status). Keep it true: it is what an agent will quote. It follows the
  llms.txt layout: prose and plain bullets come before the first `##` heading, and each `##` section holds only
  links, so AuthSome's facts sit at the top and "## AuthSome" lists its three pages.

## At launch

- In `index.html`, replace the App Store badge (`<div class="store-button" data-coming-soon>`) with a link, so it
  works without JavaScript: `<a class="store-button" href="https://apps.apple.com/app/id…">`, with no country in the
  URL, and "Download on the" as its small line. Then delete the "coming soon" dialog from `index.html` and the
  lines that open and close it at the top of `script.js`. Take the badge's rule out of the `<noscript><style>` in the head too.
- Add the Smart App Banner to the three pages: `<meta name="apple-itunes-app" content="app-id=…">`.
- In `index.html`, the app's JSON-LD has no `offers` while there is nothing to get. Put it back
  (`"offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"}`), add `installUrl` and `sameAs` (the App
  Store URL), consider a `downloadUrl`, and take "Coming soon" out of the descriptions there and in the meta tags.
- Change "Status: coming soon" and the AuthSome line under Apps in `/llms.txt`.
- The "coming soon" dialog also states the system requirement. When the dialog goes, the footer still has it.
- In `support/index.html`, take "coming soon" out of the first paragraph and the descriptions, rewrite the answer
  to "When Can I Get AuthSome?" (and its copy in the `FAQPage`), and put "Make sure you have the latest version from
  the App Store." at the start of Need a Hand?, which is the last section.
- In `privacy/index.html`, take "and is coming soon to the App Store" out of Who We Are.
- In `../apps/index.html`, change the card's "Coming soon to iPhone, iPad and Mac", and in its JSON-LD entry for
  AuthSome take "Coming soon" out of the description and add `offers` as above.
- The app has no link to these pages yet. The App Store listing needs the privacy policy URL
  (`https://devpulse.co.uk/authsome/privacy/`) and the support URL (`https://devpulse.co.uk/authsome/support/`).

## Keep in step with the app

- **Privacy.** The policy and the home page's Free and Private row say what the in-app Privacy page says (SPEC §4.14 and §5):
  nothing is collected, and usage notes stay in the system log. If an analytics provider is ever chosen (ADR 0012),
  update `privacy/index.html` and its date, and the Free and Private row on the home page, before that version ships.
- **Facts quoted on the pages**: iOS, iPadOS and macOS 26 (the home page's footer and dialog, and the support page), 44
  languages and no Android or Apple Watch version (the support page), Face ID or Touch ID to
  confirm AutoFill, the lock with Face ID, Touch ID or the passcode (the login password on a Mac, which the support
  page and `/llms.txt` say), 30 days in Recently Deleted, the five seconds before the next 2FA code is copied, the
  import sources (Google Authenticator, 2FAS, Aegis, setup links, AuthSome backups), and, on the support page, how a
  2FA code is copied in the Grid, the List and the Mac menu bar, and recovery codes kept in the Account details.
- Only what v1 has is claimed. No Apple Watch, Android, widgets or scanning a QR code on a Mac's screen.

## Copy rules

- Use the app's vocabulary from `GLOSSARY.md` in the AuthSome repo, with its capitals: Account, Profile, Folder,
  Issuer, Secret, Brand, Website, Theme, Recently Deleted, Apple Account. Sentences say "2FA codes", not "Codes".
- As on the other DevPulse pages, copy uses only commas, full stops, question marks and exclamation marks (no colons,
  semicolons, dashes, hyphens, apostrophes or contractions), apart from email addresses and URLs. So it is "end to
  end encrypted" and "sign in page". Headings are in title case, on all three pages and including the support
  page's questions ("How Do I Add an Account?"). The one exception is the home page's headline, "Every 2FA code in
  its place.", which is the tagline as the social preview image writes it.
- Write for someone who has never used an authenticator. Say what a 2FA code is for (the short code a website asks
  for after your password) in the sentence that first names it. The home page says what the app does before it uses the app's words,
  so the line above the tiles says "service" and "Personal", not Account and Profile, and the Profiles row then
  explains Account, Profile and Folder. Each of the app's words is explained on the page that uses it, in the answer
  that is about it: an Account, a Profile and a Folder on the home and support pages, a Secret, an Issuer and a Website on
  the privacy and support pages, a Brand on the support page. The home page is kept short, so it explains 2FA codes in plain
  words and does not spell the term out in its visible text. Its title and descriptions say "2FA", its
  structured data spells out "two factor authentication" for search engines, and the support and privacy pages
  spell it out once, then say "2FA". A Folder is a "section" of a Profile, never a "group", as `GLOSSARY.md` asks.
- On the support page the `+` button is a `kbd`, so the symbol does not read as punctuation. The names of controls
  (Scan QR Code, Set Up Codes In, Move to) are plain text with their own capitals.
- A lower case "account" is never used for a sign up, since an Account is a service the user added. Say "sign up".
- The support page's headings are all questions, because each one is a `Question` in the `FAQPage`.
- The home page's rows began as the app's own sentences (onboarding, AutoFill setup and the Privacy page) and were
  rewritten for a visitor who has not installed it yet. They need not match the app's wording, but every fact in
  them must stay true to `docs/SPEC.md`.
- The live screen shows real services with their logos, the same Accounts as the app's screenshots (`accounts.js`,
  made from `ScreenshotAccounts.swift` and the app's Brand catalogue, whose logos are Simple Icons, CC0; no script
  that makes it is kept in either repo, so when the app's screenshot Accounts change, copy each Account's Issuer,
  Account name and Folder from that file, and its Brand's colour and logo path from the catalogue). CC0 covers
  the drawings, not the trademarks, so the footer says the services are examples and are not affiliated with
  AuthSome. Keep that line while any service is shown, and drop a service from `accounts.js` if its owner asks.
