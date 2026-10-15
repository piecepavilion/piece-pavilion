# Piece Pavilion — Modernization Spec
### Direction: Bold & Playful · "polished fast-growing brand"
*Spec only — nothing in this document is live until approved. Drafted June 1, 2026.*

---

## 0. Design intent

Lean INTO the toy energy instead of away from it. The site should feel like a
confident, well-funded LEGO brand — bold primary colors used with discipline,
big rounded display type, lively-but-tasteful motion, and trust signals
everywhere. Playful, not juvenile. The test for every choice: *"would a fast-
growing DTC brand ship this?"*

---

## 1. Design tokens

### Color
Keep the iconic LEGO primaries, add discipline + two supporting accents and
warmer neutrals for "playful warmth" and section rhythm.

| Token            | Hex       | Use                                            |
|------------------|-----------|------------------------------------------------|
| `--red`          | `#E3000B` | Primary brand, CTAs                            |
| `--red-dark`     | `#B8000A` | Hover/depth                                    |
| `--yellow`       | `#FFCE00` | Secondary accent — badges, highlights (sparing)|
| `--blue`         | `#0057A8` | Playful tertiary, accents on dark              |
| `--green`        | `#1A8A3C` | "In stock" / eco / success                     |
| `--ink`          | `#14161D` | Headings, dark sections                        |
| `--charcoal`     | `#1F2430` | Dark section alt                               |
| `--slate`        | `#3A4150` | Body text                                      |
| `--muted`        | `#6B7280` | Secondary text                                 |
| `--cloud`        | `#F7F8FA` | Light section bg                               |
| `--cream`        | `#FFF8EC` | Warm alt section bg (rhythm + warmth)          |
| `--white`        | `#FFFFFF` |                                                |

Signature gradient (energy): `linear-gradient(135deg,#E3000B 0%,#FF5A1F 100%)`
for select CTAs/banners. Keep the dark hero gradient.

### Typography
Introduce a display/body **pairing** (today everything is Nunito 900).

- **Display (headlines):** `Fredoka` 600/700 — rounded, confident, unmistakably
  toy-brand. Used for hero H1 + section H2s + big numbers.
  *Safer alternative if Fredoka feels too soft: `Poppins` 700/800.*
- **Body + UI:** `Nunito` 400/600/700/800 (already loaded) — keep for
  readability and to avoid extra font weight.

Scale (modular, bigger and more confident than current):

| Element        | Size                          | Font / weight        |
|----------------|-------------------------------|----------------------|
| Hero H1        | `clamp(2.8rem,6vw,4.5rem)`    | Fredoka 700, lh 1.05 |
| Section H2     | `clamp(2rem,4vw,2.8rem)`      | Fredoka 700          |
| H3             | `1.35rem`                     | Fredoka 600          |
| Card title H4  | `1.05rem`                     | Nunito 800           |
| Eyebrow/badge  | `0.8rem` upper, ls `0.1em`    | Nunito 700           |
| Body           | `1.0625rem` (17px), lh 1.7    | Nunito 400           |
| Small/meta     | `0.9rem`                      | Nunito 700           |

### Spacing / layout
- Container max-width: **1240px** (up from 1100).
- Section padding: **96px** desktop / 64px mobile (up from 80).
- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- Section background rhythm: white → cream → white → dark → cream (deliberate
  alternation; today 3 white sections stack with no separation).

### Radius / shadow
- `--radius` 12px (cards), `--radius-lg` 20px (hero/feature panels), pills 50px.
- Layered, softer shadows:
  - `--shadow-sm: 0 2px 8px rgba(20,22,29,.06)`
  - `--shadow: 0 8px 30px rgba(20,22,29,.08)`
  - `--shadow-lg: 0 20px 50px rgba(20,22,29,.14)`
  - `--shadow-red: 0 8px 24px rgba(227,0,11,.28)` (primary CTAs)

### Motion (all gated behind `prefers-reduced-motion`)
- Sticky header shrinks 72→60px + gains shadow after 40px scroll.
- Buttons: keep lift-on-hover; add active press (`translateY(0) scale(.98)`).
- Featured cards: subtle image zoom + "View" overlay on hover.
- Keep staggered scroll fade-ins.

---

## 2. PHASE 1 — "Look like a brand" (highest impact)

### A. Sticky top header (replaces the hidden left sidebar)
The single biggest upgrade. Persistent branding + nav + Shop CTA.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🧱 Piece Pavilion   What We Carry  Featured  About  Blog  Sell   ★4.9 (500+)  [ Shop Now → ] │
└──────────────────────────────────────────────────────────────────────────────┘
```
- 72px tall, white, subtle bottom border; shadow + shrink to 60px on scroll.
- Logo left (40px). Nav links center/right (Nunito 700, animated underline on hover).
- Right cluster: small BrickLink rating chip + red pill **Shop Now →**.
- **Mobile (<900px):** logo left, hamburger right → opens the *existing* drawer.
  We reuse the current `.sidebar` markup + JS; just re-anchor the trigger into
  the header. Sticky sale banner stays above the header.

### B. Hero rebuild
```
┌──────────────────────────────── HERO (dark) ───────────────────────────────┐
│  ● NOW ON BRICKLINK                                                          │
│                                              ╭────────────────────────────╮  │
│  Your Brick                                  │                            │  │
│  Destination                                 │  looping build video /      │  │
│                                              │  animated brick-grid (fb)   │  │
│  Individual bricks, sets & bulk lots —       │                            │  │
│  quality-checked, ready to ship.             ╰────────────────────────────╯  │
│                                                                              │
│  [ Shop Now ]   [ See What We Carry ]                                        │
│  ★ 4.9 rating · 500+ orders shipped · Ships 1–2 days · Hand-checked          │
└──────────────────────────────────────────────────────────────────────────────┘
```
- **Kill the 7MB `.mov`** (mislabeled `video/mp4`; fails in Chrome/Firefox).
  Replace with re-encoded **MP4 (H.264) + WebM, <2MB, with a poster image**.
  If we don't re-encode, revive the orphaned `.brick-grid` floating-bricks CSS
  as the visual so there's never a blank box.
- Bigger Fredoka H1.
- **Trust strip** under the CTAs (rating · orders · handling time · hand-checked).

### C. Social-proof bar (new band under hero)
```
┌──────────────────────────────────────────────────────────────────────────┐
│   ★ 4.9 / 5          500+              100%               1–2 days          │
│   BrickLink rating   Orders shipped    Quality-checked    Handling time     │
└──────────────────────────────────────────────────────────────────────────┘
```
- Big Fredoka numbers, small labels. Cream or red-gradient band.
- **Needs real numbers from you** — your actual BrickLink feedback score + order
  count. Placeholders until supplied.

### D. Icon system — replace all emoji with SVG
Standardize on the same line-icon style already used in the Categories section.
Replace emoji in **About-values** (🧱👪🏠), **Why-Us** (✓🚀🔍👪), and **Sell**
(📦💰) with stroke-2 `currentColor` SVGs in colored rounded tiles. This kills the
biggest "unpolished" tell after the nav.

### E. Favicon + tab identity
- Generate `favicon.ico`, `favicon-32.png`, `apple-touch-icon-180.png`, a
  `site.webmanifest` (`theme-color: #E3000B`), and add the `<link>` tags to every
  page head.
- Recommend a simple bold **brick "PP" mark** (legible at 16px) rather than the
  full logo.

---

## 3. PHASE 2 — Merchandising & polish
- **Product cards:** add price line, image zoom on hover, "View on BrickLink"
  overlay, optional corner badge (New / Rare / Retired). Prices manual for now.
- **Testimonials section:** 3 cards — star rating, quote, buyer first name +
  "Verified BrickLink buyer." (Pull real quotes from your BrickLink feedback.)
- **Newsletter capture** in footer: "Get new-inventory drops + deals." Needs a
  provider (Formspree / Mailchimp / Beehiiv embed) — pick one.
- Apply the refined type scale, spacing, 1240px container, and section rhythm.
- Drop or restyle the greyed-out "Bulk Lots — Coming Soon" card.

## 4. PHASE 3 — Depth
- **Multi-column footer** (Shop / Learn / Company / Social) + payment & trust
  icons + newsletter band.
- **Asset optimization:** re-encode hero video; compress `logoPP1.jpg` (241KB) +
  `cool lego.jpg` (706KB); serve WebP; lazy-load below-the-fold images.
- **Blog refresh:** replace emoji thumbnails with illustrated/photo headers; add
  author, reading time, share buttons.
- Micro-interaction pass; full `prefers-reduced-motion` coverage.

---

## 5. What I need from you before/while building
1. **BrickLink stats** — real feedback rating + total order/feedback count (for
   the proof bar, hero strip, testimonials). Until then I'll use clearly-marked
   placeholders.
2. **Hero visual** — re-encode the existing video to MP4/WebM, OR switch to a
   product/photo hero, OR fall back to the animated brick grid? (I can do the
   brick-grid fallback with zero new assets.)
3. **Real customer quotes** (2–3) from BrickLink feedback for testimonials.
4. **Newsletter provider** (Phase 2) — Formspree, Mailchimp, Beehiiv, or skip.
5. **Display font** — confirm Fredoka, or prefer the Poppins alternative.

---

## 6. Effort / risk
- Phase 1 is mostly additive + reuses existing sidebar JS → low risk, fully
  reviewable locally before any push.
- No live changes until approved. All work on `main` locally; you review in the
  browser, then we commit + push together (same flow as the blog post).
