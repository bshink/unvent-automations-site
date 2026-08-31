# unventautomations.com

Static HTML, no build step, no dependencies beyond Google Fonts. **Four pages plus a shared
stylesheet** as of 2026-08-31: `index.html`, `about/`, `notes/`, and one directory per note.
Styles live in `site.css` and every page links it with an absolute `/site.css`.

**Purpose: a credibility backstop for cold calls.** Every prospect who is even mildly
interested will Google the company before the discovery call. This exists so they find
something real instead of nothing. It is not a lead-gen asset and should not grow into one.

## 2026-08-31 rebuild - what changed and why. Read this before editing copy.

This came out of an advisor call with **Kelsey Moschetti** on 2026-08-31. Her verdict on the
old single page, verbatim: *"aesthetically pleasing, I like it. Problem is, it looks like the
same exact scam sites that all these people that are using AI to scam other people."*
**The design was never the problem. The absence of a person behind it was.** Full record:
`AI Shit/02_Ecosystem/03_Subsidiaries/Unvent_Automations/07_Advisor_Package/Advisor_Call_Kelsey_2026-08-31.md`.

Five changes, each traceable to something she said:

1. **Nav links are written as questions, not category nouns.** "What do we do?", not "Services".
   Her point: *"'Our services' - those are answers to questions. Make them links."* A prospect
   arrives with questions, not a taxonomy. **Do not rename these back to nouns.**
2. **`/about/` exists, with both founder origin stories.** Brandon noticed a gap and could not
   work out why nobody had filled it. Andrea likes people and hates watching work grind them
   down. These are the two stories she specifically asked for, and they are the single biggest
   thing separating this from a template.
3. **`/notes/` exists and ships with three real pieces.** *"People do read the About page and
   people do use the blog page. I use the blog page on sites before I do an interview."*
   ⚠️ **Never ship this as "coming soon" or with one post.** An empty blog is worse than no blog.
   If a post is added, add it to `notes/index.html` in the same commit.
4. **The hinge statement** on the home page (`#who`) and at the top of `/about/`:
   *"We want you to get to Friday and not be able to name the thing you dropped."*
   It implies the outcome and guarantees nothing, deliberately. Her framing: *"they wish that
   for you, but they never said it was guaranteed."* **Do not turn it into a promise and do not
   attach a metric to it.**
5. **Tone is unbothered, not a journey story.** *"Not 'here is our journey.' More: this makes me
   really excited, and if you think it's cool, give me a like, if not go about your day. That is
   very unbothered energy, and people are like, that's addictive."* The `/about/` page ends with
   "take it or leave it" on purpose. Do not soften it into agency-brochure voice.

### The word "AI" does not appear anywhere on this site, and that is a rule now.

Kelsey, and a live call that proves it: Andrea said "AI" to an HVAC owner, who replied *"I can
clean air conditioners"* and hung up. **The company name stays** - Brandon declined her
suggestion to shorten it to "Unvent" - but the word does not go in body copy, headlines, or
metadata. The replacement frame is **control, not capability**: *"you still have all the
control, you're just giving it certain jobs."* The Toyota andon-cord argument carries it on
`/about/` and in `notes/what-toyota-kept/`. Grep for `\bAI\b` before committing copy.

## Calendly - wired in 2026-08-10

Both CTAs (the nav button and the closing button) point at
`https://calendly.com/andre-unventautomations/30min`, verified live on 2026-08-10.
No placeholders remain, so the publish gate is cleared.

**The event is 30 minutes and the page copy says so in both places.** If Andre shortens
the Calendly event, change the copy in the same commit - a page that promises twenty
minutes and then books thirty is a small credibility hit on a cold prospect. Grep for
`30min`, `Book 30 minutes`, and `Thirty minutes`.

## The home page is six blocks, deliberately

Hero, the audit tool, the five deliverables, **who we are (`#who`)**, FAQ, close.
The `#who` block was added 2026-08-31 and sits immediately before the FAQ on purpose: by then
the prospect has seen the argument and the number, and the next question they actually have is
*who are these people.* Nothing else goes in.

**The "what we don't do" section was cut on purpose** (commit `32a4573`, confirmed by
Brandon 2026-08-10). It still belongs on the *call* - the no-social-media, no-guarantees,
no-lock-in framing is what builds trust in conversation - but the page is a credibility
backstop, not the pitch, and it is tighter without it. Do not re-add it on the grounds
that an older spec mentioned it.

## Rules this page follows, and must keep following

- **No client names, logos, testimonials, or case studies.** There are zero clients. The
  rule against claiming clients we do not have applies here exactly as it does on a call.
- ~~**No pricing.**~~ **Superseded.** The FAQ and the closing block both state "builds start
  at $3,500" plus a retainer. That is deliberate and it stays. The rule that survives is
  narrower: **no full quote on the page**, because the real number comes out of the audit.
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

## Assets added 2026-08-31

- **`favicon.svg` + `apple-touch-icon.png`.** There was no favicon on this site at all until
  2026-08-31, so a prospect who opened it in a tab got the blank-page glyph. The SVG is the
  Unvent arrow in ember on the brand ground with a 30/160 corner radius. Regenerate the PNG by
  screenshotting the SVG headless at 180x180.
- **Three OG cards**: `og-image.png` (home), `og-about.png`, `og-notes.png`. Notes posts share
  the notes card. **The old card was wrong and had been wrong since 2026-08-10** - it read
  *"The call you just missed already called someone else"*, which is the answering-service
  positioning the copy abandoned in commit `8164b80`. The card people saw when the link got
  texted contradicted the page it opened. **If a headline changes, regenerate its card in the
  same commit.**

## The question nav on mobile - do not hide it again

Under 900px the four questions wrap to a second row inside the sticky bar and scroll
horizontally. **They were briefly `display:none` on mobile and that was a defect**, because the
question nav is the single structural thing the rebuild exists for and a prospect who Googles
you is on a phone.

⚠️ **The overflow probe reports one element past the viewport at 500px.** That is the last nav
question inside the scroll strip, and it is correct: `document.documentElement.scrollWidth`
still equals `clientWidth`, so the page does not pan. Check `.navlinks.scrollWidth >
.navlinks.clientWidth` before "fixing" it.

## /about/ is six alternating bands, not a prose column

**Rebuilt a second time on 2026-08-31.** The first version of the page was one dark column of
paragraphs end to end, and Brandon's verdict was blunt: too many words, not enough variety.
The diagnosis was structural, not editorial - the home page reads well because it alternates
dark and paper grounds and changes shape every block, and /about/ did neither.

**Word count went from roughly 1,100 to 291**, measured with `innerText` on the rendered page,
not estimated. Every point survived; the paragraphs around them did not. Brandon's note after
the first cut was that the whole page was still wordy, and he was right - the second pass
deleted the supporting paragraphs entirely and let the one line carry each block.

**The founder cards are a portrait, a name and one sentence. Nothing else.** They had four
paragraphs under each quote and the paragraphs said nothing the quote did not. Do not restore
them. Same rule for the Toyota cells and the will-not-do list: one line each, and only 04 and
05 carry a second line because those two carry terms a prospect needs in writing.

⚠️ **`.fcard p` used to exist and silently pinned `.fquote` to 16.5px** - `.fcard p` is
specificity (0,1,1) and `.fquote` is (0,1,0), so the element rule won no matter what order they
were in. It was removed. If you add a paragraph rule scoped to `.fcard`, scope the quote higher
too or you will re-break it, and it fails silently: the markup is right and the page just looks
timid.

The order, and each band is a different shape on an alternating ground:

| Band | Ground | Shape |
|---|---|---|
| Hero | dark | headline + one line |
| The hinge | paper | one huge display sentence + a rule-marked note |
| The two of us | dark | two portrait cards side by side |
| You keep the controls | paper | three-cell grid: the machine / the person / the cord |
| Five things we will not do | dark | numbered two-column list |
| One more thing, plainly | paper | three short paragraphs |
| Close | paper | centred CTA, hairline on top because it follows another paper band |

**Keep the alternation if you edit the copy.** Two dark bands in a row, or one band that grows
back into four paragraphs, is exactly how it regressed the first time. The Toyota argument in
particular must stay as three cells: it was four paragraphs and nobody was going to read them.

## Founder portraits - the only imagery this site is allowed

Added 2026-08-31. A real face was the one visual worth adding, and the reason is the same one
that drove the whole rebuild: two origin stories with no faces attached read as claims, not as
people. `team/brandon.jpg` is a real on-set frame, cropped to head and shoulders and lightly
warmed with a CSS filter, not baked into the file.

⚠️ **Never add stock photography, AI-generated imagery, 3D renders, isometric illustration or
gradient blobs to this site.** Those are the loudest tells of the exact genre Kelsey identified,
and adding one puts the page straight back in it. A generated founder photo is worse still: it
is a fake person on an About page.

**`.portrait.mark` is a stand-in, not a design element to keep.** Andrea has one because his
photo had not arrived on 2026-08-31. It renders the Unvent arrow instead of a face, which reads
as deliberate rather than broken. **Replace it with his real photo when it lands** - same crop
treatment, same 760x760, drop it at `team/andrea.jpg` - and delete the mark element from both
`index.html` and `about/index.html`. Grep for `portrait mark`.

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
