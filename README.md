# unventautomations.com

One page. Static HTML, no build step, no dependencies beyond Google Fonts.

**Purpose: a credibility backstop for cold calls.** Every prospect who is even mildly
interested will Google the company before the discovery call. This exists so they find
something real instead of nothing. It is not a lead-gen asset and should not grow into one.

## Two placeholders to fill before it goes live

Both are in `index.html`, marked with `__DOUBLE_UNDERSCORES__`:

| Placeholder | Replace with |
|---|---|
| `__CALENDLY__` | Andre's Calendly link, once it exists |
| `__PHONE__` and `__PHONE_HREF__` | The business number. `__PHONE__` is display text, `__PHONE_HREF__` is digits only for the `tel:` link |

Until the Calendly link exists the primary button goes nowhere. **Do not publish before
filling it in** - a dead CTA is worse than no site.

## Rules this page follows, and must keep following

- **No client names, logos, testimonials, or case studies.** There are zero clients. The
  rule against claiming clients we do not have applies here exactly as it does on a call.
- **No pricing.** Pricing comes out of the audit. A number on the page anchors every
  negotiation before it starts.
- **No stack names.** No Claude, n8n, Retell, ElevenLabs.
- **No guarantees** of results, rankings, or revenue.
- **No LLC or Inc.** anywhere. The entity does not exist yet.
- The "what we don't do" section stays. It builds more trust than the feature list.

## The loss calculator

The interactive number is the point of the page. It runs the same math as the sales
docs: `missed calls/day x 30 x 5% close rate x average job value`.

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

## Hosting

Do not buy GoDaddy hosting for a static page. Point the domain at Cloudflare Pages,
GitHub Pages, or Netlify - all free. Setup instructions live with Brandon.
