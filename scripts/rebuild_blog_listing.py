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
  - /thumb/<slug>.png if present -> card thumb; otherwise one is generated
    with Pillow + the committed Fredoka TTF so the auto-published posts
    match the hand-made thumbnails pixel-for-pixel on brand.
"""

import html
import io
import json
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLOG_DIR = os.path.join(ROOT, "blog")
LISTING = os.path.join(BLOG_DIR, "index.html")
HOMEPAGE = os.path.join(ROOT, "index.html")
THUMB_DIR = os.path.join(ROOT, "thumb")
FONT_BOLD = os.path.join(ROOT, "scripts", "fonts", "Fredoka-Bold.ttf")
FONT_SEMI = os.path.join(ROOT, "scripts", "fonts", "Fredoka-SemiBold.ttf")
LOGO = os.path.join(ROOT, "logo-white.png")

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


def _fit_font(draw, text, path, max_width, target_size, min_size=24):
    """Pick the largest Fredoka Bold size that fits text within max_width."""
    size = target_size
    while size > min_size:
        f = ImageFont.truetype(path, size)
        w = draw.textbbox((0, 0), text, font=f)[2]
        if w <= max_width:
            return f
        size -= 2
    return ImageFont.truetype(path, min_size)


def generate_thumb_png(title, slug, out_path):
    """Render a 1200x600 PNG thumbnail matching the hand-made PNG style:
    red-wine gradient background, big Title Case phrase in Fredoka Bold,
    circular pavilion seal pasted from logo-white.png in the top-right."""
    W, H = 1200, 600
    img = Image.new("RGB", (W, H), (155, 0, 8))

    # Diagonal gradient from dark red (top-left) to bright red (bottom-right).
    base = Image.new("RGB", (W, H))
    px = base.load()
    for y in range(H):
        for x in range(W):
            t = (x + y) / (W + H)
            r = int(155 + (255 - 155) * t)
            g = int(0   + (34  - 0)   * t)
            b = int(8   + (34  - 8)   * t)
            px[x, y] = (r, g, b)
    img = base

    draw = ImageDraw.Draw(img)

    # Seal logo in top-right. Resize to 320x320 so it dominates the corner
    # the way the hand-made PNGs do.
    try:
        seal = Image.open(LOGO).convert("RGBA")
        seal_sz = 320
        seal = seal.resize((seal_sz, seal_sz), Image.LANCZOS)
        img.paste(seal, (W - seal_sz - 40, 40), seal)
    except Exception as e:
        print("  WARN: logo paste failed: %s" % e)

    # Big phrase in Fredoka Bold, centered horizontally in the LEFT area
    # (not the whole width — leave the seal space on the right).
    phrase = thumb_phrase(title)
    left_area_width = W - 320 - 100  # minus seal + padding
    font = _fit_font(draw, phrase, FONT_BOLD, left_area_width, 180, min_size=60)
    bbox = draw.textbbox((0, 0), phrase, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (left_area_width - text_w) // 2 + 40
    y = (H - text_h) // 2 - 30
    # Soft drop shadow for depth.
    draw.text((x + 3, y + 4), phrase, font=font, fill=(0, 0, 0, 120))
    draw.text((x, y), phrase, font=font, fill=(255, 255, 255))

    img.save(out_path, "PNG", optimize=True)


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




def render_cards(posts):
    """Build the inner HTML of <div class="blog-cards">. Every post has a
    real PNG thumb at /thumb/<slug>.png — either hand-made or auto-generated
    by generate_thumb_png() during main()."""
    lines = ["\n"]
    for p in posts:
        href = "/blog/%s/" % p["slug"]
        thumb = '<img src="/thumb/%s.png" alt="" loading="lazy" />' % p["slug"]
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

    # Generate thumbnails for any post without a hand-made /thumb/<slug>.png.
    os.makedirs(THUMB_DIR, exist_ok=True)
    generated = 0
    for p in posts:
        if p["has_thumb"]:
            continue
        out = os.path.join(THUMB_DIR, p["slug"] + ".png")
        try:
            generate_thumb_png(p["title"], p["slug"], out)
            p["has_thumb"] = True
            generated += 1
            print("  gen thumb for %s" % p["slug"])
        except Exception as e:
            print("  SKIP thumb for %s: %s" % (p["slug"], e))
    if generated:
        print("Generated %d thumbnails" % generated)

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
