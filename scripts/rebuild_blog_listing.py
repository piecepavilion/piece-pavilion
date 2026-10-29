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
             "by", "at", "is", "with", "from", "as"}


def thumb_phrase(title):
    """Pick a 1-3 word punchy phrase from the title, uppercase, for the
    SVG placeholder. Models the hand-made thumbs ('Advent 2026',
    'Halloween Guide', 'Minifig Values')."""
    if not title:
        return "NEW POST"
    words = re.sub(r"[:,.\!\?]", " ", title).split()
    # Prefer the first 2-3 content words (skip "LEGO" prefix + stopwords).
    picked = []
    for w in words:
        wl = w.lower()
        if wl in STOPWORDS: continue
        if wl == "lego" and not picked: continue
        picked.append(w)
        if len(picked) == 3: break
        # Stop at punctuation-looking word (number followed by comma was already
        # stripped above, so a stray short token means we have enough).
    if not picked:
        picked = words[:3]
    phrase = " ".join(picked).upper()
    # Keep it tight — 20 chars max for the big line.
    if len(phrase) > 20:
        phrase = " ".join(picked[:2]).upper()
    if len(phrase) > 20:
        phrase = picked[0].upper()
    return phrase


def thumb_svg(title, slug):
    """Yellow -> red gradient placeholder matching the hand-made thumbs:
    a 1-3 word punchy phrase, 'PIECE PAVILION' subtitle, LEGO colors."""
    phrase = html.escape(thumb_phrase(title))
    # Font sizes scale with phrase length so a 20-char phrase still fits.
    big_size = 52 if len(phrase) <= 10 else (42 if len(phrase) <= 15 else 32)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">'
        '<defs><linearGradient id="g-{slug}" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#ffce00"/>'
        '<stop offset="1" stop-color="#e3000b"/>'
        '</linearGradient></defs>'
        '<rect width="400" height="250" fill="url(#g-{slug})"/>'
        '<text x="200" y="90" fill="#15151f" text-anchor="middle" '
        'font-family="Fredoka,Nunito,sans-serif" font-weight="600" font-size="13" '
        'letter-spacing="3" opacity="0.75">PIECE PAVILION</text>'
        '<text x="200" y="160" fill="#15151f" text-anchor="middle" '
        'font-family="Fredoka,Nunito,sans-serif" font-weight="800" font-size="{sz}" '
        'letter-spacing="1">{phrase}</text>'
        '</svg>'
    ).format(slug=slug, phrase=phrase, sz=big_size)
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
