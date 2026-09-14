# Kids Paint landing page

Copy this **whole KidsPaint folder** into the destination website repository. It is a self-contained static site: no build, package installation, CDN or parent-folder dependencies. Serve this folder with any static server that supports directory index files. Files elsewhere in the app repository were not changed for this work. Nothing was committed.

## Publish checklist

- In `script.js`, replace the two `null` entries in `storeLinks` with the real App Store and Google Play listing URLs. The four buttons update their labels and destinations automatically. Until then they explicitly say “Coming soon” and open an accessible announcement dialog.
- Update the coming-soon language in the HTML description/Open Graph tags when launched.
- Publish at `https://devpulse.co.uk/kidspaint/`. Copy this folder as lowercase `kidspaint` in the destination repository. Canonicals, sitemap URLs, and social images use that confirmed URL.
- Terms, Privacy and Support are included as `terms/index.html`, `privacy/index.html`, and `support/index.html`, linked from every footer. Before publishing, confirm the policy details against the deployed hosting/email/billing providers, retention practices and legal business identity.
- Keep both `assets/licences/` files. Font credits link to them from the footer.

## Content and assets

- Chewy headings: Apache 2.0, commercially usable. Nunito Sans supporting text: SIL OFL 1.1, commercially usable. Both fonts are served locally, without a request to Google Fonts. The font files and original licence notices are bundled.
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

Each page has a unique descriptive title, meta description, absolute canonical URL, Open Graph metadata, Twitter card metadata, and JSON LD. The homepage describes the app without fabricated reviews, ratings, purchase offers, or download links. Crawlable HTML navigation, a single main heading per page, image dimensions, lazy loaded gallery images, local fonts, and responsive layouts remain in place.

`sitemap.xml` lists the four canonical public URLs. After publishing, submit `https://devpulse.co.uk/kidspaint/sitemap.xml` through the verified Google Search Console property. If the domain has a root robots file, add this line there without replacing its existing rules.

```text
Sitemap: https://devpulse.co.uk/kidspaint/sitemap.xml
```

A robots file inside this subdirectory would not control domain crawling. No parent website files have been modified. Configure permanent redirects from explicit index.html URLs to the corresponding directory URLs on the production host if desired. Canonical metadata already points to the clean URLs. Check the published HTTPS pages, social preview, and field performance after deployment. Local checks do not guarantee search indexing, rankings, or rich results. Guidance follows Google Search Central at https://developers.google.com/search/docs/fundamentals/seo-starter-guide.

Banner stars rotate and pulse with varied randomly selected speeds and phases. The duplicate scrolling group shares those values to keep its loop seamless. Reduced motion and background pausing still apply.

## DevPulse feature link

The parent `Website/apps/index.html` includes the Kids Paint feature card. The homepage has no Kids Paint card and links to the app listing at `apps/`. Copy the updated parent `index.html`, the new `apps` directory, and the lowercase `kidspaint` directory to the destination repository. Remove its old standalone `apps.html`. App listing assets and downloads use relative paths back to the website root. The Mac utility privacy claims are explicitly separate from Kids Paint.
