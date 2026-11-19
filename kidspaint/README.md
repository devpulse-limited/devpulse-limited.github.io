# Kids Paint landing page

Copy this **whole KidsPaint folder** into the destination website repository. It is a self-contained static site: no build, package installation, CDN or parent-folder dependencies. Serve this folder with any static server that supports directory index files. Files elsewhere in the app repository were not changed for this work. Nothing was committed.

## Publish checklist

- The App Store link is live in `script.js` and in each App Store button's `href`. `script.js` keeps a button's `href` when it already starts with the `storeLinks` address, so each button's campaign link survives (see App Store campaign links below). When Kids Paint reaches Google Play, put its listing URL in `storeLinks` and in the Google Play buttons' `href`, change the Google Play button labels from “Coming soon”, and update `operatingSystem` in `guides/_source/build.py` and the home page JSON LD, the device note, the FAQ, and `/llms.txt`.
- Publish at `https://devpulse.co.uk/kidspaint/`. Copy this folder as lowercase `kidspaint` in the destination repository. Canonicals, sitemap URLs, and social images use that confirmed URL.
- Terms, Privacy and Support are included as `terms/index.html`, `privacy/index.html`, and `support/index.html`, linked from every footer. Before publishing, confirm the policy details against the deployed hosting/email/billing providers, retention practices and legal business identity.
- Keep both `assets/licences/` files. Font credits link to them from the footer.

## Content and assets

- Chewy headings: Apache 2.0, commercially usable. Nunito Sans supporting text: SIL OFL 1.1, commercially usable. Both fonts are served locally, without a request to Google Fonts. The font files and original licence notices are bundled.
- `assets/fonts/Chewy-Regular.woff2` and `assets/fonts/NunitoSans.woff2` are subsetted WOFF2 conversions of the bundled original TTFs (removed from the folder, recoverable from git history), under the same licences in `assets/licences/`. The subset keeps Basic Latin, Latin 1 Supplement, Latin Extended A, General Punctuation, €, ™ and the arrows block, with every OpenType layout feature. Nunito Sans stays a variable font with all its axes (weight 200 to 1000). The Apache licence and the OFL both permit modified versions. The OFL's Reserved Font Name rule does not apply here, because the Nunito Sans copyright line (`Copyright 2016 The Nunito Sans Project Authors`) names no Reserved Font Name. To regenerate, run `pyftsubset <original>.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+0100-017F,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2661,U+2726" --layout-features='*' --flavor=woff2` from fonttools and brotli installed outside the repository, after checking that new copy uses no characters outside that list.
- Images are optimised WebP marketing recolourings of six existing final app templates. The natural colour palettes were created with the built-in image-generation tool; see `IMAGE-PROMPTS.md`. They illustrate possible colours, not app screenshots. Original app/archive files were not modified. The gallery uses marketing captions, with the real categories alongside them.
- There are no trackers, analytics SDKs, cookies, signup forms, external embeds or network-loaded libraries in this website. The DevPulse footer link is an ordinary external link.
- The app description reflects current features: a collection of free templates, blank paper, paid premium collection, finger painting, fill, undo, zoom, local saving, parent-protected purchases/sharing.
- Typography, colours and layout tokens live in `styles.css`. Body text is semibold; Chewy is shipped in its native regular weight. Headings use English title case.

## Behaviour

- A keyboard/touch/mouse range slider compares the original outline with example colours.
- All six example pictures are shown without category filters. Each uses its original outline beneath a stationary colour layer; a soft diagonal CSS mask sweeps across it, briefly revealing colour. All six passes run in sync. The production sweep takes 4.5s, followed by a 1s pause. The band has an opaque centre wider than the card, so the entire image becomes fully coloured as it passes. Its soft edges travel beyond the image bounds; there is no whole-layer opacity fade. Reduced motion shows the outlines only.
- A seamless right-to-left ribbon and staggered star twinkles and rotations at different speeds add gentle motion. Reduced-motion preferences and background-tab pausing are respected automatically; there are no user-facing animation controls.
- Native FAQ disclosures and dialogs support keyboards. Focus indicators, a skip link, descriptive image text, reduced-motion support and responsive layouts are included.
- All preview assets, styling and scripts are local. Use an HTTP preview so that directory routes resolve correctly.

## Checks performed

Chromium browser checks passed at 1440, 768, 390 and 320 pixels wide: no horizontal overflow, no broken images, local fonts loaded, and no browser errors. Colour reveal, both store dialogs, Escape dismissal, FAQ expansion and font credits were exercised. The latest revision removes preview timing and pause controls, retaining automatic reduced-motion behaviour. Desktop and mobile captures were visually reviewed. The policy alignment also updates the app localisation and its policy views. App assets and existing website sibling files were not changed. Browser-check scripts and screenshots are temporary files outside this folder.

## Support contact

Support reveals the address on a button press, assembling it from character codes in `script.js`. This deters basic HTML scrapers, but is not protection against bots that execute JavaScript. A readable obfuscated fallback is available without JavaScript. No email is sent automatically; the revealed mail link opens the visitor’s email app. The website does not collect the visitor’s email address.

## Policy source review

Copy was checked against the current app’s local storage, parent protection and generic billing wording. Policy drafting references: [ICO children’s information](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/) and [fair consumer terms](https://www.gov.uk/guidance/writing-a-fair-contract-for-customers). The pages preserve consumer rights and distinguish support emails and billing identifiers from anonymous app analytics. Hosting/provider-specific deployment details still need confirmation before publishing.

## Website copy style

Visible copy on all four pages uses full stops, commas, question marks and exclamation marks. Use Oxford commas in lists of three or more items. Avoid semicolons, hyphens, dashes, and contractions. Keep technical URLs, email addresses, asset paths, decorative icons and original licence notices intact.

## Keeping policies aligned

The app English localisation in `lib/l10n/app_en.arb` is the source for all eight sections of each policy and its update date. Edit that copy first, generate the Flutter localisations, then synchronise the website.

```sh
python3 Website/kidspaint/sync-policies.py lib/l10n/app_en.arb
python3 Website/kidspaint/sync-policies.py lib/l10n/app_en.arb --check
```

After copying this folder to another repository, pass the path to the app localisation file. The website has no runtime dependency on the app repository. The script preserves website styling and adds links without changing the policy wording.

Privacy rights and the short ICO complaint reference remain because support emails and billing identifiers can be personal information even without app accounts. See the [ICO privacy information requirements](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/).

## Clean page URLs

Internal links use `terms/`, `privacy/`, and `support/`. Each directory contains an index file, so public URLs have no `.html` suffix. Both `/privacy` and `/privacy/` work with standard static servers, which redirect the former to the latter. No rewrites or JavaScript routing are needed. Keep the directory structure when copying the site, including when hosting under a subdirectory. The old standalone HTML pages have been removed.

The slider handle uses a centred SVG rather than font glyphs. The painting illustration is also SVG, with a single continuous crayon silhouette. Website and app copy no longer claim that accounts or cloud backups are unavailable. Store account instructions for purchases are retained.

## Search and social sharing

Each page has a unique descriptive title, meta description, absolute canonical URL, Open Graph metadata, Twitter card metadata, and JSON LD. The app is on the App Store (iPhone and iPad, iOS 15 or later, free with an optional subscription) and not yet on Google Play. The App Store link is written into each button's `href`, so crawlers and readers without scripts get it too, and the page carries Apple's Smart App Banner tag. The home page's JSON LD describes the app (`MobileApplication`, with a free offer and the App Store install link) and its visible questions (`FAQPage`). It has no rating markup, because the app has no ratings yet. Never add reviews or ratings that are not real.

Every Kids Paint page is listed in the root `/sitemap.xml`, which `/robots.txt` names and Search Console reads. The old `kidspaint/sitemap.xml` was removed, so there is one list to keep current. `/llms.txt` carries a Kids Paint facts block and the list of guides. A robots file inside this subdirectory would not control domain crawling. Configure permanent redirects from explicit index.html URLs to the corresponding directory URLs on the production host if desired. Canonical metadata already points to the clean URLs. Check the published HTTPS pages, social preview, and field performance after deployment. Local checks do not guarantee search indexing, rankings, or rich results. Guidance follows Google Search Central at https://developers.google.com/search/docs/fundamentals/seo-starter-guide.

Banner stars rotate and pulse with varied randomly selected speeds and phases. The duplicate scrolling group shares those values to keep its loop seamless. Reduced motion and background pausing still apply.

## DevPulse feature link

The parent `Website/apps/index.html` includes the Kids Paint feature card. The homepage has no Kids Paint card and links to the app listing at `apps/`. Copy the updated parent `index.html`, the new `apps` directory, and the lowercase `kidspaint` directory to the destination repository. Remove its old standalone `apps.html`. App listing assets and downloads use relative paths back to the website root. The Mac utility privacy claims are explicitly separate from Kids Paint.

## Selected brand icon

Colour Crew is the approved icon. All website headers, footers, favicon links, Apple touch icons, and the parent Apps card use the new PNG derivatives in `assets/`. The app master and regeneration instructions are documented in `design/brand-icon.md` in the app repository. The former three stroke SVG logo has been removed.

## Guides

`guides/` holds one page per search a parent makes ("colouring app for kids no ads", "what age can kids start colouring"). Each guide answers its question first, cites the pages its facts come from, and ends with the Kids Paint card and the App Store button. It also places one small Kids Paint card (`{{app}}`) in the section where the app honestly fits, so a reader who stops halfway still sees the next step. The same idea, adapted from the AuthSome guides, keeps the content small and good rather than plentiful.

The pages are made from `guides/_source/content/*.json` by `guides/_source/build.py`. GitHub Pages does not publish `_source`. After changing a content file:

```sh
cd kidspaint/guides/_source
python3 lint.py && python3 build.py && python3 check.py
```

### App Store campaign links

Every App Store link in an `href` is an Apple App Analytics campaign link, `build.APP_STORE` plus `?pt=127329907&ct=<campaign>&mt=8` (written `&amp;` in HTML). `build.py` makes them with `store_link()`. The campaign names are:

- Home page, written by hand in `index.html`: `kp-home-hero` (hero button) and `kp-home-download` (download section button).
- Guides index: `kp-guides-index-header` (Get the App in the header) and `kp-guides-index-end` (the Meet Kids Paint card).
- Each guide: `kp-guide-<short>-header`, `kp-guide-<short>-inline` (the `{{app}}` card) and `kp-guide-<short>-end` (the Meet Kids Paint card). `<short>` is the slug without filler words (`CAMPAIGN_FILLER`), so `no-ads`, `toddlers`, `drawing-ipad`, `free-no-subscription`, `offline`, `age-start` and `screen-time-toddlers`.

Apple keeps 40 characters of a campaign name. `build.py` fails if a name is longer or two guides share a short name, and `check.py` fails if any App Store link has no `ct`, repeats a `ct` on its page, or has an unescaped `&`. JSON-LD (`installUrl`, `sameAs`) and `/llms.txt` keep the bare `APP_STORE` address.

The provider token is set to `127329907` in `APP_STORE_PROVIDER_TOKEN` at the top of `guides/_source/build.py`, and every link starts its query with `pt=127329907&amp;`. It comes from App Store Connect, App Analytics, Campaigns, where a generated campaign link shows it as `pt`. If it ever changes, update that constant and rebuild, then change `pt=` in the two App Store links in `index.html`. `check.py` fails until every App Store link carries the value set in `build.py`. Once the site is published, App Store page views and downloads from these links appear per campaign in App Store Connect App Analytics.

`lint.py` holds the copy style above. `build.py` writes nothing unless every page is clean. `check.py` keeps the home page, the sitemap, `/llms.txt`, canonicals, FAQ markup, and internal links in step, and fails if any page offers the app on Android or as coming soon.

### Facts

Say only what is true of the App Store version. iPhone and iPad, no Android yet, no template count and no prices in guide copy. Facts about Apple, Google, the WHO and anyone else come from the pages in `sources.json`, read on the guide's `modified` date. When a fact is checked again, update `modified`, the sitemap `lastmod`, and nothing else.

### Adding a guide each day, from Search Console

This is the loop that finds the next guide. It uses `gum` (https://gumcli.dev) against the verified domain property. Note the argument shape. The request body goes inside `body`.

```sh
# Queries and pages over the last 28 days, with impressions, clicks and position
gum read searchconsole.searchanalytics.query --output json --args '{
  "siteUrl": "sc-domain:devpulse.co.uk",
  "body": {"startDate": "2026-10-22", "endDate": "2026-11-18", "dimensions": ["query", "page"], "rowLimit": 1000,
           "dimensionFilterGroups": [{"filters": [{"dimension": "page", "operator": "contains", "expression": "/kidspaint/"}]}]}
}'

# Is a page indexed yet?
gum read searchconsole.urlInspection.index.inspect --output json --args '{
  "body": {"inspectionUrl": "https://devpulse.co.uk/kidspaint/guides/", "siteUrl": "sc-domain:devpulse.co.uk"}}'

# Sitemaps Google has read, and how many of their pages are indexed
gum read searchconsole.sitemaps.list --output json --args '{"siteUrl": "sc-domain:devpulse.co.uk"}'
```

1. Pull the query and page report. Look for queries with impressions and few or no clicks, at an average position of about 8 to 60. Those are searches Google already connects with the site.
2. If an existing guide is the page shown, improve that guide first. Answer the query in its lede or a heading, and add a common question.
3. If no page answers the query, write one new guide for it, only where the honest answer involves a colouring or drawing app. One good guide a day at most.
4. Link to the new guide from the pages that already get impressions. That means the home page's guide list, two or three related guides' `related` lists, and a sentence in a guide's text where it helps.
5. Run the three scripts, publish, and ask Search Console to index the new address (URL Inspection, Request Indexing). Google usually takes a few days.
6. Two to four weeks later, read the report again for that page and adjust its title and lede to the words people actually searched.

Keyword Planner volumes need a Google Ads account. After `gum config set googleads.customer_id=<10 digit id>` and a developer token, run `gum read googleads.keywordPlanIdeas.generateKeywordIdeas --args '{"keywords":["colouring app for kids"],"url":"https://devpulse.co.uk/kidspaint/"}' --output json`. Until then, Google's own search suggestions and App Store popularity (ASO Atlas) are the demand signals, and Search Console takes over once the site has impressions.

### The first guides

The first batch, published 19 November 2026, was chosen before Search Console had any Kids Paint data. Topics came from Google search suggestions and App Store keyword popularity for the UK (for example "drawing app for kids" 46 out of 100, "colouring app for kids" 23, "colouring for toddlers" 23). Revisit each one against real Search Console queries once it has a month of impressions.
