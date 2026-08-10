# unventautomations.com

One page. Static HTML, no build step, no dependencies beyond Google Fonts.

**Purpose: a credibility backstop for cold calls.** Every prospect who is even mildly
interested will Google the company before the discovery call. This exists so they find
something real instead of nothing. It is not a lead-gen asset and should not grow into one.

## Calendly - wired in 2026-08-10

Both CTAs (the nav button and the closing button) point at
`https://calendly.com/andre-unventautomations/30min`, verified live on 2026-08-10.
No placeholders remain, so the publish gate is cleared.

**The event is 30 minutes and the page copy says so in both places.** If Andre shortens
the Calendly event, change the copy in the same commit - a page that promises twenty
minutes and then books thirty is a small credibility hit on a cold prospect. Grep for
`30min`, `Book 30 minutes`, and `Thirty minutes`.

## The page is four blocks, deliberately

Hero, loss calculator, the five deliverables, close. Nothing else.

**The "what we don't do" section was cut on purpose** (commit `32a4573`, confirmed by
Brandon 2026-08-10). It still belongs on the *call* - the no-social-media, no-guarantees,
no-lock-in framing is what builds trust in conversation - but the page is a credibility
backstop, not the pitch, and it is tighter without it. Do not re-add it on the grounds
that an older spec mentioned it.

## Rules this page follows, and must keep following

- **No client names, logos, testimonials, or case studies.** There are zero clients. The
  rule against claiming clients we do not have applies here exactly as it does on a call.
- **No pricing.** Pricing comes out of the audit. A number on the page anchors every
  negotiation before it starts.
- **No stack names.** No Claude, n8n, Retell, ElevenLabs.
- **No guarantees** of results, rankings, or revenue.
- **No LLC or Inc.** anywhere. The entity does not exist yet.

## Vertical-neutral copy - changed 2026-08-10

The page originally named HVAC, roofing, and electrical and opened on "you are on a roof
in Van Nuys." **Brandon removed all of it on 2026-08-10.** Andre is dialing HVAC and
roofing today, but car dealerships are now a live second market, and a page that fences
itself to the trades reads wrong to anyone outside them.

The rule going forward: **the phone is the wedge, not the vertical.** Copy describes the
mechanism (calls nobody answers, quotes nobody chases, customers nobody calls back) and
never names an industry. The "what you get" section says outright that the phone is where
we start and not where we stop, which is what makes it read as an automations company
rather than a trades answering service.

Do not re-add industry names to win a specific cold call. Say that on the call instead.

## The loss calculator

The interactive number is the point of the page. It runs the same math as the sales
docs: `missed calls/day x 30 x 5% close rate x value of one customer`.

**The 5% is fixed and labelled as deliberately conservative.** Do not raise it to make the
number bigger. A figure they believe beats a figure that impresses, and the moment a
contractor thinks it is inflated the page becomes marketing and the room is gone.

## Brand

- Mark is the real Unvent arrow device, inlined as SVG from `Unvent_2.0-03.svg`
- Display: Bodoni Moda, standing in for Didot, which is not web-available
- Body: Archivo
- Ground `#1A1917`, paper `#F4F1EA`, ember `#D8542F`

Ember is the subsidiary accent. Electric blue is reserved for ecosystem-level branding
per the Unvent brand guide, so it is deliberately absent.

## Link previews

The page ships `og-image.png` (1200x630, brand card) plus `og:url`, `og:image:width/height`,
a canonical URL, and `twitter:summary_large_image`.

**Why it exists:** before this, the page had no `og:image` at all, so iMessage fell back to
a *cached GoDaddy Website Builder stock photo* - blurry office people - under the title
"Unvent Automations". That is what a prospect saw when the link got texted to them.

Regenerate the card with Chrome headless (no ImageMagick or rsvg on this machine):

```
chrome --headless=new --window-size=1200,630 --screenshot=og-image.png file://<card.html>
```

**Preview caches are sticky.** iMessage, Slack, and WhatsApp cache per URL and will keep
serving the old image for a long time. To force a fresh scrape, send the link once with a
throwaway query string (`https://unventautomations.com/?v=2`) - it renders identically and
the scrapers treat it as a new URL.

## Mobile

**Test method, because this is where it went wrong once.** Chrome headless floors its layout
viewport at 500px, so `--window-size=390,844` silently renders at 500 and then *crops* the
screenshot to 390. That looks exactly like broken layout and is not. Load the page in a
fixed-width `<iframe>` on a wide harness page instead - media queries key off the iframe's
own width - and assert `documentElement.scrollWidth === clientWidth` at 320/390/430. Measure,
do not eyeball a cropped screenshot.

Reworked 2026-08-10. What was fixed and must not regress:

- **No horizontal scroll.** The hero glow is positioned `right:-160px`; `overflow-x:hidden`
  on `body` alone did not contain it and the page panned sideways by exactly 160px. Fixed
  with `overflow-x:clip` on html and body, `max-width:100vw; overflow-x:clip` on every
  section-level element, and `overflow:hidden` on `.hero` (that last one is what actually
  does the work). Verified 0px overflow at all three widths.

- **Anchor targets clear the sticky nav.** `scroll-margin-top` on `#top/#math/#what/#book`.
  Without it every in-page link parks the section heading underneath the nav bar.
- **The sliders are a 44px-tall hit area.** The input is transparent and 44px tall; the
  visible hairline is drawn by `::-webkit-slider-runnable-track`. The old 2px-tall input
  was close to untappable on a phone, and the calculator is the whole point of the page.
- **Nav fits at 320px.** The CTA swaps to "Book a call" under 560px and the wordmark drops
  entirely under 340px.
- **Buttons go full width under 560px** in both the hero and the closing section.
- **Safe-area insets** on `.wrap` and the footer, plus `viewport-fit=cover`, so nothing
  sits under the notch or the home indicator.
- Headline floors dropped to 38px/28px and the big number to 44px so the largest possible
  readout (`$13,500,000`) still fits on a 320px screen.

## Hosting

Do not buy GoDaddy hosting for a static page. Point the domain at Cloudflare Pages,
GitHub Pages, or Netlify - all free.

**As of 2026-08-10 the domain still serves the GoDaddy Website Builder default page.**
Publishing is therefore two steps, and the second one is Brandon's: deploy this repo to a
host, then in GoDaddy disable the Website Builder site and repoint DNS. Until the DNS
change lands, a prospect who Googles the company gets a stock template.
