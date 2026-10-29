"""Rebuild blog/index.html's post cards and the "New on the Blog" banner
from every blog/<slug>/index.html on disk.

Triggered by .github/workflows/rebuild-blog-listing.yml on push to any
file under blog/ except the listing itself and the template. Also runs
on workflow_dispatch.

Each blog post's own index.html is the source of truth:
  - <title> tag                  -> card headline (bar after " | ")
  - <meta name="description">    -> card body paragraph
  - JSON-LD "datePublished"      -> card date
  - folder name                  -> slug + url
  - /thumb/<slug>.png if present -> thumb img, else an inline-SVG fallback
"""

import html
import json
import os
import re
import sys


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLOG_DIR = os.path.join(ROOT, "blog")
LISTING = os.path.join(BLOG_DIR, "index.html")
HOMEPAGE = os.path.join(ROOT, "index.html")

# Skip these — they are not real posts.
SKIP = {"index.html", "_template.html", "blog.css"}


def parse_post(slug_dir):
    """Return (date_iso, dict) for one blog/<slug>/index.html or None."""
    path = os.path.join(BLOG_DIR, slug_dir, "index.html")
    if not os.path.isfile(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        html_txt = f.read()

    def m(pat, flags=re.I | re.S):
        r = re.search(pat, html_txt, flags)
        return r.group(1).strip() if r else None

    full_title = m(r"<title>([^<]+)</title>")
    if full_title:
        title = full_title.split("|")[0].strip()
    else:
        title = slug_dir.replace("-", " ").title()
    desc = m(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']') or ""

    # datePublished from JSON-LD; fall back to today only as last resort.
    date_iso = None
    jsonld = re.findall(r'<script type="application/ld\+json">(.+?)</script>',
                        html_txt, re.S)
    for block in jsonld:
        try:
            d = json.loads(block)
        except json.JSONDecodeError:
            continue
        entries = d if isinstance(d, list) else [d]
        for e in entries:
            if isinstance(e, dict) and e.get("datePublished"):
                date_iso = e["datePublished"][:10]
                break
        if date_iso:
            break
    if not date_iso:
        return None  # drop posts with no date rather than guess

    thumb_png = os.path.join(ROOT, "thumb", slug_dir + ".png")
    has_thumb = os.path.isfile(thumb_png)
    return (date_iso, {
        "slug": slug_dir,
        "title": title,
        "desc": desc,
        "date_iso": date_iso,
        "date_display": format_date(date_iso),
        "has_thumb": has_thumb,
    })


def format_date(iso):
    """2026-10-29 -> October 29, 2026."""
    y, m, d = iso.split("-")
    months = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"]
    return "%s %d, %s" % (months[int(m) - 1], int(d), y)


STOPWORDS = {"a", "an", "the", "to", "of", "and", "or", "in", "on", "for",
             "by", "at", "is", "with", "from", "as", "how", "what", "which",
             "that", "than", "then", "but", "its", "it's"}


def thumb_phrase(title):
    """Pick a 1-3 word punchy phrase in Title Case for the SVG placeholder.
    Models the hand-made thumbs ('Advent 2026', 'Halloween Guide',
    'Minifig Values')."""
    if not title:
        return "New Post"
    words = re.sub(r"[:,.\!\?]", " ", title).split()
    picked = []
    for w in words:
        wl = w.lower()
        if wl in STOPWORDS: continue
        if wl == "lego" and not picked: continue
        picked.append(w)
        if len(picked) == 3: break
    if not picked:
        picked = words[:3]
    # Title Case so it matches the hand-made PNGs ('Advent 2026'
    # not 'ADVENT 2026').
    def cap(w):
        if w.isdigit() or (len(w) >= 2 and w[0].isdigit()):
            return w  # keep year/number as-is
        return w[:1].upper() + w[1:].lower() if w else w
    phrase = " ".join(cap(w) for w in picked)
    if len(phrase) > 18:
        phrase = " ".join(cap(w) for w in picked[:2])
    if len(phrase) > 18:
        phrase = cap(picked[0])
    return phrase


# The pavilion seal — 'PIECE PAVILION' curved at top of a 100-radius circle,
# 'WHERE EVERY PIECE FINDS ITS PLACE' curved at bottom, and a colorful LEGO
# pavilion in the center (red roof, yellow columns, blue+green base blocks).
# This is a vector approximation of logo-white.png so it works inside a
# data: URI SVG (external images are blocked in that context).
_SEAL_GROUP = (
    # Outer ring (circle border)
    '<circle cx="100" cy="100" r="95" fill="#ffffff" stroke="#15151f" stroke-width="3"/>'
    '<circle cx="100" cy="100" r="88" fill="none" stroke="#15151f" stroke-width="1.2"/>'
    # Curved text ring
    '<defs>'
    '<path id="seal-top" d="M 25 100 A 75 75 0 0 1 175 100" fill="none"/>'
    '<path id="seal-bot" d="M 25 100 A 75 75 0 0 0 175 100" fill="none"/>'
    '</defs>'
    '<text font-family="Fredoka,Nunito,sans-serif" font-weight="700" '
    'font-size="18" fill="#15151f" letter-spacing="2">'
    '<textPath href="#seal-top" startOffset="50%" text-anchor="middle">PIECE PAVILION</textPath>'
    '</text>'
    '<text font-family="Fredoka,Nunito,sans-serif" font-weight="600" '
    'font-size="9" fill="#15151f" letter-spacing="1.2">'
    '<textPath href="#seal-bot" startOffset="50%" text-anchor="middle">WHERE EVERY PIECE FINDS ITS PLACE</textPath>'
    '</text>'
    # Side dots
    '<circle cx="20" cy="100" r="2" fill="#15151f"/>'
    '<circle cx="180" cy="100" r="2" fill="#15151f"/>'
    # LEGO pavilion in the middle
    # Red tiled roof
    '<path d="M 60 76 L 100 48 L 140 76 Z" fill="#e3000b" stroke="#15151f" stroke-width="2.2"/>'
    '<line x1="76" y1="66" x2="76" y2="76" stroke="#15151f" stroke-width="1"/>'
    '<line x1="92" y1="55" x2="92" y2="76" stroke="#15151f" stroke-width="1"/>'
    '<line x1="108" y1="55" x2="108" y2="76" stroke="#15151f" stroke-width="1"/>'
    '<line x1="124" y1="66" x2="124" y2="76" stroke="#15151f" stroke-width="1"/>'
    # Yellow architrave + columns
    '<rect x="56" y="76" width="88" height="10" fill="#ffce00" stroke="#15151f" stroke-width="2"/>'
    '<rect x="64" y="86" width="12" height="40" fill="#ffce00" stroke="#15151f" stroke-width="2"/>'
    '<rect x="124" y="86" width="12" height="40" fill="#ffce00" stroke="#15151f" stroke-width="2"/>'
    # Yellow door in middle
    '<path d="M 88 94 L 112 94 L 112 126 L 100 134 L 88 126 Z" fill="#ffce00" stroke="#15151f" stroke-width="2"/>'
    # Base blocks: blue, red, green
    '<rect x="56" y="126" width="30" height="12" fill="#0057a8" stroke="#15151f" stroke-width="2"/>'
    '<rect x="86" y="126" width="28" height="12" fill="#e3000b" stroke="#15151f" stroke-width="2"/>'
    '<rect x="114" y="126" width="30" height="12" fill="#16a34a" stroke="#15151f" stroke-width="2"/>'
    # Base platform
    '<rect x="52" y="138" width="96" height="8" fill="#ffce00" stroke="#15151f" stroke-width="2"/>'
)


def thumb_svg(title, slug):
    """Match the hand-made thumbs: dark gradient background, big Title Case
    phrase centered in Fredoka, and a prominent Piece Pavilion seal badge
    in the top-right. No top-left label (matches hand-made PNGs)."""
    phrase = html.escape(thumb_phrase(title))
    big_size = 68 if len(phrase) <= 10 else (54 if len(phrase) <= 14 else 44)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">'
        '<defs><linearGradient id="g-{slug}" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#9b0008"/>'
        '<stop offset="0.6" stop-color="#e3000b"/>'
        '<stop offset="1" stop-color="#ff2222"/>'
        '</linearGradient></defs>'
        '<rect width="400" height="250" fill="url(#g-{slug})"/>'
        # Big phrase line in Title Case, centered horizontally in the frame
        '<text x="200" y="150" fill="#ffffff" text-anchor="middle" '
        'font-family="Fredoka,Nunito,cursive" font-weight="700" font-size="{sz}" '
        'letter-spacing="0.5">{phrase}</text>'
        # Seal badge in top-right, enlarged (0.55x of 200x200 = 110px)
        '<g transform="translate(275 10) scale(0.55)">{seal}</g>'
        '</svg>'
    ).format(slug=slug, phrase=phrase, sz=big_size, seal=_SEAL_GROUP)
    import urllib.parse
    return "data:image/svg+xml;utf8," + urllib.parse.quote(svg)


def render_cards(posts):
    """Build the inner HTML of <div class="blog-cards">."""
    lines = ["\n"]
    for p in posts:
        href = "/blog/%s/" % p["slug"]
        if p["has_thumb"]:
            thumb = '<img src="/thumb/%s.png" alt="" loading="lazy" />' % p["slug"]
        else:
            thumb = '<img src="%s" alt="" loading="lazy" />' % thumb_svg(p["title"], p["slug"])
        card = (
            '      <a href="{href}" class="blog-card">\n'
            '        <div class="blog-card-thumb">{thumb}</div>\n'
            '        <div class="blog-card-body">\n'
            '          <span class="blog-card-date">{date}</span>\n'
            '          <h2>{title}</h2>\n'
            '          <p>{desc}</p>\n'
            '          <span class="blog-card-link">Read More &rarr;</span>\n'
            '        </div>\n'
            '      </a>\n\n'
        ).format(
            href=href,
            thumb=thumb,
            date=html.escape(p["date_display"]),
            title=html.escape(p["title"]),
            desc=html.escape(p["desc"]),
        )
        lines.append(card)
    return "".join(lines)


def replace_cards_block(html_txt, new_inner):
    """Replace the inner HTML of <div class="blog-cards"> ... </div>."""
    pat = re.compile(
        r'(<div\s+class="blog-cards">)([\s\S]*?)(</div>\s*</section>)',
        re.I,
    )
    if not pat.search(html_txt):
        raise SystemExit("Could not find <div class=\"blog-cards\"> block in blog/index.html")
    return pat.sub(lambda m: m.group(1) + new_inner + m.group(3), html_txt, count=1)


def update_banner(html_txt, newest):
    """Rewrite the 'New on the Blog' <strong> + href across the sticky-head
    announcement banner. Looks for the strong line verbatim.
    Returns updated html, bool: changed."""
    if not newest:
        return html_txt, False
    new_href = "/blog/%s/" % newest["slug"]
    new_strong = ">&#127876; New on the Blog: %s<" % html.escape(newest["title"])

    # Replace the href on the announcement-text link.
    html2 = re.sub(
        r'(<a\s+class="announcement-text"[^>]+href=")[^"]+(")',
        r'\g<1>' + new_href + r'\g<2>',
        html_txt,
        count=1,
    )
    # Replace the strong line.
    html3 = re.sub(
        r'>\s*&#127876;\s*New on the Blog:[^<]*<',
        new_strong,
        html2,
        count=1,
    )
    return html3, (html3 != html_txt)


def main():
    if not os.path.isdir(BLOG_DIR):
        sys.exit("blog/ not found")

    posts = []
    for entry in os.listdir(BLOG_DIR):
        if entry in SKIP or entry.startswith(".") or entry.startswith("_"):
            continue
        if not os.path.isdir(os.path.join(BLOG_DIR, entry)):
            continue
        parsed = parse_post(entry)
        if parsed is None:
            print("  SKIP %s: unparseable" % entry)
            continue
        posts.append(parsed[1])

    posts.sort(key=lambda p: p["date_iso"], reverse=True)
    print("Found %d posts, newest = %s" % (len(posts), posts[0]["slug"] if posts else "(none)"))

    # Rebuild blog/index.html card section.
    with open(LISTING, "r", encoding="utf-8") as f:
        listing_html = f.read()
    new_inner = render_cards(posts)
    listing_html = replace_cards_block(listing_html, new_inner)
    with open(LISTING, "w", encoding="utf-8") as f:
        f.write(listing_html)
    print("Rewrote blog/index.html cards (%d posts)" % len(posts))

    # Refresh the "New on the Blog" banner on the blog listing itself AND
    # on the homepage (both files contain the sticky-head banner).
    newest = posts[0] if posts else None
    for target in (LISTING, HOMEPAGE):
        if not os.path.isfile(target):
            continue
        with open(target, "r", encoding="utf-8") as f:
            t = f.read()
        t2, changed = update_banner(t, newest)
        if changed:
            with open(target, "w", encoding="utf-8") as f:
                f.write(t2)
            print("Refreshed banner in %s" % os.path.relpath(target, ROOT))


if __name__ == "__main__":
    main()
