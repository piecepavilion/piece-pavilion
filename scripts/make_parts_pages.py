"""
Programmatic SEO: generate /parts/<number>/ landing pages for LEGO parts.

Pulls part metadata (nickname, official name, description, image) from the
"Name That LEGO Piece" blog post, cross-references our live inventory
(finder-data.json) for in-stock pricing, and writes one indexable page per
part. Each page captures long-tail searches like "lego 3001", "lego cheese
slope part number", "jumper plate lego", and sends the click to our BrickLink
store (in-stock) or BrickLink's own catalog (not stocked).

Usage:
  python scripts/make_parts_pages.py                   # generate top 20 + index
  python scripts/make_parts_pages.py --all             # all 71 parts from the blog
  python scripts/make_parts_pages.py 54200 15573 4070  # specific numbers

Output:
  parts/<number>/index.html
  parts/index.html

To scale to full catalog: swap PART_SOURCE for a BrickLink catalog dump or
a bulk CSV. The template function builds one page from one metadata dict —
it does not care where the dicts come from.
"""

import json
import os
import re
import sys
import html as htmllib

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
BLOG_POST = os.path.join(REPO, "blog", "name-that-lego-piece", "index.html")
INVENTORY = os.path.join(REPO, "finder-data.json")
OUT_ROOT = os.path.join(REPO, "parts")
SITEMAP = os.path.join(REPO, "sitemap.xml")

# Top 20 for the prototype — common bricks/plates/tiles plus the
# nicknamed stand-outs people actually search by name.
TOP_20 = [
    "3001", "3005", "3004", "3024", "3023", "3070", "3069",   # basics
    "54200", "85984", "11477",                                 # cheese + curved slope
    "3040", "3039",                                            # 45 slopes
    "4070", "87087", "4733",                                   # SNOT headliners
    "15573", "2654", "98138",                                  # jumper, boat stud, dot
    "4081b", "2412b",                                          # lamp holder, grille
]


def parse_blog_parts():
    """Extract the pn-card dataset from the Name That LEGO Piece post.

    Returns {part_no: {nick, name, image_url, tip}} for every part on the page.
    """
    with open(BLOG_POST, encoding="utf-8") as f:
        html = f.read()
    cards = re.findall(
        r'<div class="pn-card" data-no="([^"]+)">\s*'
        r'<img src="([^"]+)"[^>]*alt="([^"]+)"[^>]*/>\s*'
        r'<div class="pn-nick">([^<]+)</div>\s*'
        r'<div class="pn-name">([^<]+)</div>\s*'
        r'<div class="pn-no">[^<]+</div>\s*'
        r'<p class="pn-tip">([^<]+)</p>',
        html, re.DOTALL,
    )
    out = {}
    for no, img, _alt, nick, name, tip in cards:
        out[no] = {
            "no": no,
            "nick": nick.strip(),
            "name": name.strip(),
            "image_url": img.strip(),
            "tip": tip.strip(),
        }
    return out


def load_inventory_index():
    """{part_no: [{color, cond, price, qty, lot}, ...]} — our live stock."""
    with open(INVENTORY, encoding="utf-8") as f:
        data = json.load(f)
    idx = {}
    for it in data.get("items", []):
        no = it.get("no", "").strip()
        if not no:
            continue
        idx.setdefault(no, []).append({
            "color": (it.get("color") or "").strip() or "Unspec",
            "cond": it.get("cond", ""),
            "price": float(it.get("price") or 0),
            "qty": int(it.get("qty") or 0),
            "lot": str(it.get("lot") or ""),
        })
    return idx


# ---- the template ------------------------------------------------------------

PAGE_TMPL = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{meta_desc}" />
  <link rel="canonical" href="https://piecepavilion.com/parts/{no}/" />

  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://piecepavilion.com/parts/{no}/" />
  <meta property="og:title" content="{og_title}" />
  <meta property="og:description" content="{meta_desc}" />
  <meta property="og:image" content="{image_url}" />

  <script type="application/ld+json">
{product_schema}
  </script>
  <script type="application/ld+json">
{breadcrumb_schema}
  </script>

  <script async src="https://www.googletagmanager.com/gtag/js?id=G-X3DK777DPM"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-X3DK777DPM');
  </script>

  <link rel="stylesheet" href="../../style.css?v=20261015a" />
  <link rel="stylesheet" href="../../blog/blog.css" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/logo-white.png" />
  <meta name="theme-color" content="#e3000b" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://img.bricklink.com" />
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

  <style>
    .part-hero {{ display: grid; grid-template-columns: minmax(220px, 320px) 1fr; gap: 36px; margin: 24px 0 28px; align-items: center; }}
    .part-hero-img {{ background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 28px; display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; }}
    .part-hero-img img {{ max-width: 100%; max-height: 240px; object-fit: contain; }}
    .part-labels {{ display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }}
    .part-tag {{ background: #fff5f5; color: var(--red); border: 1px solid rgba(227,0,11,0.25); font-weight: 800; font-size: 0.75rem; letter-spacing: .08em; text-transform: uppercase; padding: 3px 10px; border-radius: 999px; }}
    .part-tag.gold {{ background: #fff8ec; color: #8a5a00; border-color: rgba(217,152,0,0.3); }}
    .part-nick {{ font-family: 'Fredoka','Nunito',sans-serif; font-size: clamp(1.8rem, 3.8vw, 2.6rem); font-weight: 700; margin: 2px 0 6px; color: var(--ink); line-height: 1.1; }}
    .part-official {{ font-size: 1.05rem; color: var(--slate); margin: 0 0 10px; }}
    .part-no-big {{ display: inline-block; font-family: 'Nunito', monospace; font-size: 0.95rem; font-weight: 800; letter-spacing: .06em; color: var(--muted); background: #f6f3eb; padding: 4px 12px; border-radius: 8px; margin-bottom: 14px; }}
    .part-tip {{ font-size: 1.05rem; color: var(--ink); line-height: 1.55; margin: 10px 0 16px; }}
    .stock-box {{ background: #e8f7ed; border: 1px solid #b9e3c5; border-radius: 14px; padding: 18px 22px; margin: 20px 0; }}
    .stock-box.out {{ background: #f6f3eb; border-color: #e4ddc5; }}
    .stock-head {{ display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }}
    .stock-head h3 {{ font-family: 'Fredoka','Nunito',sans-serif; font-size: 1.2rem; margin: 0; color: #146a2e; }}
    .stock-box.out .stock-head h3 {{ color: #8a5a00; }}
    .stock-pill {{ background: #146a2e; color: #fff; font-weight: 800; font-size: 0.78rem; padding: 3px 10px; border-radius: 999px; letter-spacing: .04em; text-transform: uppercase; }}
    .stock-list {{ list-style: none; margin: 10px 0 14px; padding: 0; display: grid; gap: 6px; }}
    .stock-list li {{ display: flex; justify-content: space-between; align-items: center; gap: 12px; background: rgba(255,255,255,0.5); padding: 7px 12px; border-radius: 8px; font-size: 0.95rem; }}
    .stock-list .color-name {{ font-weight: 700; color: var(--ink); }}
    .stock-list .cond {{ color: var(--muted); font-size: 0.85rem; margin-left: 8px; }}
    .stock-list .price {{ font-weight: 800; color: var(--red); }}
    .btn-row {{ display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }}
    .fact-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 18px 0 24px; }}
    .fact {{ background: var(--cream); border-radius: 12px; padding: 14px 16px; }}
    .fact-label {{ font-size: 0.72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }}
    .fact-value {{ font-family: 'Fredoka','Nunito',sans-serif; font-size: 1.25rem; color: var(--ink); margin-top: 2px; }}
    /* .blog-article a sets all article links to red; override for buttons. */
    .blog-article .btn-primary, .blog-article a.btn-primary {{ color: #fff; }}
    .blog-article .btn-primary:hover, .blog-article a.btn-primary:hover {{ color: #fff; }}
    .blog-article .btn-ghost, .blog-article a.btn-ghost {{ color: var(--red); }}
    @media (max-width: 640px) {{ .part-hero {{ grid-template-columns: 1fr; }} .part-hero-img {{ max-width: 300px; margin: 0 auto; }} }}
  </style>
</head>
<body>

  <div class="sidebar-overlay" id="sidebar-overlay"></div>
  <nav class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <a href="/" class="sidebar-logo"><img src="/logo-white.png" alt="Piece Pavilion" class="logo-img" /></a>
      <button class="sidebar-close" id="sidebar-close" aria-label="Close menu">&times;</button>
    </div>
    <ul class="sidebar-links">
      <li><a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop" target="_blank" rel="noopener">Shop Now</a></li>
      <li><a href="/#shop">What We Carry</a></li>
      <li><a href="/parts/">Parts Database</a></li>
      <li><a href="/lego-minifigures/">LEGO Minifigures</a></li>
      <li><a href="/blog/">Blog</a></li>
      <li><a href="/#contact">Get in Touch</a></li>
    </ul>
  </nav>

  <div class="main-content">

  <div class="announcement-banner">
    <a class="announcement-text" href="/blog/">
      <strong>&#128276; New on the Blog</strong>
      <span>Read the latest &rarr;</span>
    </a>
    <button class="announcement-close" aria-label="Dismiss">&times;</button>
  </div>

  <header class="site-header" id="site-header">
    <div class="header-inner">
      <a href="/" class="header-brand" aria-label="Piece Pavilion home">
        <span class="brand-mark" aria-hidden="true"><img src="/logo-white.png" alt="Piece Pavilion" /></span>
        <span class="brand-word">Piece&#8203;Pavilion</span>
      </a>
      <nav class="header-nav">
        <a href="/#shop">Shop</a>
        <a href="/parts/">Parts</a>
        <a href="/#featured">Featured</a>
        <a href="/blog/">Blog</a>
      </nav>
      <div class="header-actions">
        <a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop"
           target="_blank" rel="noopener" class="btn-primary header-shop">Shop Now &rarr;</a>
        <button class="header-burger" id="header-burger" aria-label="Open menu">&#9776;</button>
      </div>
    </div>
  </header>

  <div class="breadcrumbs">
    <nav>
      <a href="/">Home</a>
      <span class="sep">&rsaquo;</span>
      <a href="/parts/">Parts</a>
      <span class="sep">&rsaquo;</span>
      {nick} (Part {no})
    </nav>
  </div>

  <article class="blog-article">
    <div class="part-hero">
      <div class="part-hero-img">
        <img src="{image_url}" alt="{nick} LEGO piece, part {no}" width="240" height="240" />
      </div>
      <div>
        <div class="part-labels">
          <span class="part-tag">LEGO Part</span>
          {stock_tag}
        </div>
        <h1 class="part-nick">{nick}</h1>
        <p class="part-official">Official name: <strong>{name}</strong></p>
        <span class="part-no-big">Part Number {no}</span>
        <p class="part-tip">{tip}</p>
        <div class="btn-row">
          <a href="{bricklink_cta_href}" target="_blank" rel="noopener" class="btn-primary">{bricklink_cta_label} &rarr;</a>
          <a href="/finder/?q={no}" class="btn-ghost">Search Inventory</a>
        </div>
      </div>
    </div>

    <div class="fact-grid">
      <div class="fact"><div class="fact-label">Also Called</div><div class="fact-value">{nick}</div></div>
      <div class="fact"><div class="fact-label">BrickLink ID</div><div class="fact-value">{no}</div></div>
      <div class="fact"><div class="fact-label">Catalog Name</div><div class="fact-value">{name_short}</div></div>
    </div>

    {stock_block}

    <h2>What makes part {no} worth knowing</h2>
    <p>{tip}</p>

    <p>If you&rsquo;re new to LEGO part names, the official catalog name reads like a recipe &mdash; family first (Brick, Plate, Slope), then footprint in studs, then what makes it special. Our <a href="/blog/name-that-lego-piece/">visual cheat sheet to 71 LEGO part names</a> walks through the whole pattern, including this one. If you&rsquo;re hunting a specific element for a build, our <a href="/finder/">Product Finder</a> searches our live BrickLink inventory in real time.</p>

    <h2>Where to buy part {no}</h2>
    <p>The simplest path: our BrickLink store carries this part in multiple colors and conditions. Click the buy button above to see current stock, prices, and available colors. If we&rsquo;re out of a specific color, the BrickLink catalog page shows every seller worldwide with current inventory.</p>

    <div class="blog-cta">
      <h3>Looking for more parts like this?</h3>
      <p>Browse our full catalog on BrickLink or search our live inventory for the exact color and condition you need.</p>
      <a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop"
         target="_blank" rel="noopener" class="btn-primary btn-large">
        Shop All Piece Pavilion Parts &rarr;
      </a>
    </div>
  </article>

  <footer class="footer">
    <div class="container footer-inner">
      <a href="/" class="logo logo-footer"><img src="/logo-white.png" alt="Piece Pavilion" class="logo-img logo-img-footer" /></a>
      <p class="footer-tagline">Where every piece finds its place.</p>
      <nav class="footer-links">
        <a href="/#shop">Shop</a>
        <a href="/parts/">Parts</a>
        <a href="/blog/">Blog</a>
        <a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop" target="_blank" rel="noopener">BrickLink Store</a>
      </nav>
      <p class="trademark-notice">LEGO&reg; is a trademark of the LEGO Group, which does not sponsor, authorize, or endorse this site. Piece Pavilion is an independent reseller.</p>
      <p class="copyright">&copy; 2026 Piece Pavilion. All rights reserved.</p>
    </div>
  </footer>

  </div><!-- end .main-content -->

  <script src="/script.js"></script>
</body>
</html>
"""


def build_stock_block(stock):
    """Render the live-stock section if we have inventory, else the 'not in stock' CTA."""
    if not stock:
        return ("", '<span class="part-tag gold">Catalog Page</span>',
                "https://www.bricklink.com/v2/catalog/catalogitem.page?P=" + "{no}",
                "View on BrickLink Catalog")
    rows = []
    stock_sorted = sorted(stock, key=lambda r: (r["cond"] != "New", r["price"]))
    cheapest = stock_sorted[0]
    for row in stock_sorted[:5]:
        rows.append(
            '      <li><span><span class="color-name">{color}</span>'
            '<span class="cond">{cond} &middot; qty {qty}</span></span>'
            '<span class="price">${price:.2f}</span></li>'.format(**row)
        )
    block = (
        '<div class="stock-box">\n'
        '  <div class="stock-head"><h3>In our BrickLink store now</h3>'
        '<span class="stock-pill">{} color{} in stock</span></div>\n'
        '  <ul class="stock-list">\n{}\n  </ul>\n'
        '  <p style="margin:4px 0 0;font-size:0.9rem;color:var(--muted)">'
        'Starting at <strong style="color:var(--red)">${:.2f}</strong>. '
        'Click through to BrickLink to see every color and condition.</p>\n'
        '</div>'
    ).format(
        len(stock), "" if len(stock) == 1 else "s",
        "\n".join(rows), cheapest["price"],
    )
    # Open BrickLink shop pre-filtered to this part. The {"q":"<no>"} JSON
    # has to be URL-encoded, otherwise its double quotes close the href attribute.
    cta_href = (
        "https://store.bricklink.com/PiecePavilion?utm_source=parts_page&amp;utm_medium=cta"
        "&amp;p=PiecePavilion#/shop?o=%7B%22q%22%3A%22" + "{no}" + "%22%7D"
    )
    return (block, '<span class="part-tag">In Stock</span>', cta_href,
            "Shop This Part on BrickLink")


def product_schema(part):
    return json.dumps({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "LEGO {} (Part {})".format(part["nick"], part["no"]),
        "alternateName": [part["nick"], part["name"]],
        "image": part["image_url"],
        "sku": part["no"],
        "mpn": part["no"],
        "brand": {"@type": "Brand", "name": "LEGO"},
        "description": part["tip"],
    }, indent=2)


def breadcrumb_schema(part):
    return json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home",
             "item": "https://piecepavilion.com/"},
            {"@type": "ListItem", "position": 2, "name": "Parts",
             "item": "https://piecepavilion.com/parts/"},
            {"@type": "ListItem", "position": 3,
             "name": "{} (Part {})".format(part["nick"], part["no"]),
             "item": "https://piecepavilion.com/parts/{}/".format(part["no"])},
        ],
    }, indent=2)


def render_page(part, stock):
    stock_block, stock_tag, cta_href, cta_label = build_stock_block(stock)
    name_short = part["name"].split(",")[0].strip() if "," in part["name"] else part["name"]
    nick_esc = htmllib.escape(part["nick"])
    name_esc = htmllib.escape(part["name"])
    tip_esc = part["tip"]  # may contain existing entities like &deg;
    title = "LEGO {} (Part {}) — {} | Piece Pavilion".format(nick_esc, part["no"], name_esc)
    meta_desc = (
        "Part {} is officially called \"{}\" — also known as the {}. {} "
        "In-stock prices from our BrickLink store."
    ).format(part["no"], part["name"], part["nick"],
             re.sub(r"<[^>]+>", "", part["tip"])[:160])
    og_title = "The LEGO {} (Part {})".format(nick_esc, part["no"])
    return PAGE_TMPL.format(
        no=part["no"],
        nick=nick_esc,
        name=name_esc,
        name_short=htmllib.escape(name_short),
        image_url=part["image_url"],
        tip=tip_esc,
        title=title,
        meta_desc=htmllib.escape(meta_desc, quote=True),
        og_title=og_title,
        stock_tag=stock_tag,
        stock_block=stock_block,
        bricklink_cta_href=cta_href.replace("{no}", part["no"]),
        bricklink_cta_label=cta_label,
        product_schema=product_schema(part),
        breadcrumb_schema=breadcrumb_schema(part),
    )


# ---- /parts/ index page ------------------------------------------------------

INDEX_TMPL = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LEGO Parts Database | Piece Pavilion</title>
  <meta name="description" content="A searchable database of common LEGO parts: cheese slopes, jumper plates, headlight bricks, and more — with nicknames, official names, part numbers, and live BrickLink inventory from Piece Pavilion." />
  <link rel="canonical" href="https://piecepavilion.com/parts/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://piecepavilion.com/parts/" />
  <meta property="og:title" content="LEGO Parts Database | Piece Pavilion" />
  <meta property="og:description" content="Common LEGO parts with nicknames, numbers, and live inventory." />
  <meta property="og:image" content="https://piecepavilion.com/og/_home.png" />

  <script async src="https://www.googletagmanager.com/gtag/js?id=G-X3DK777DPM"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-X3DK777DPM');</script>

  <link rel="stylesheet" href="../style.css?v=20261015a" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <meta name="theme-color" content="#e3000b" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://img.bricklink.com" />
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    .parts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin: 24px 0; }
    .part-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 16px 14px; display: flex; flex-direction: column; text-decoration: none; color: inherit; transition: transform .12s, box-shadow .12s; box-shadow: 0 1px 4px rgba(20,22,29,.04); }
    .part-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(20,22,29,.08); }
    .part-card img { width: 100%; height: 120px; object-fit: contain; background: #fff; margin-bottom: 10px; }
    .part-card .pc-nick { font-family: 'Fredoka','Nunito',sans-serif; font-weight: 700; font-size: 1.1rem; color: var(--ink); line-height: 1.15; }
    .part-card .pc-no { font-size: 0.78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
    .part-card .pc-name { font-size: 0.85rem; color: var(--slate); margin: 6px 0 0; line-height: 1.35; }
    .parts-hero { background: linear-gradient(135deg, #15151f 0%, #24101e 55%, #3a1217 100%); color: #fff; padding: 48px 24px; border-radius: 18px; margin: 24px 0 32px; text-align: center; position: relative; overflow: hidden; }
    .parts-hero::before { content:''; position:absolute; inset:0; background: radial-gradient(circle at 1.6px 1.6px, rgba(255,255,255,.07) 1.6px, transparent 1.7px) 0 0/26px 26px; pointer-events: none; }
    .parts-hero h1 { font-family: 'Fredoka','Nunito',sans-serif; font-size: clamp(2rem, 5vw, 3rem); margin: 0 0 10px; color: #fff; position: relative; }
    .parts-hero p { max-width: 640px; margin: 0 auto; color: rgba(255,255,255,.86); font-size: 1.05rem; position: relative; }
  </style>
</head>
<body>

  <div class="sidebar-overlay" id="sidebar-overlay"></div>
  <nav class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <a href="/" class="sidebar-logo"><img src="/logo-white.png" alt="Piece Pavilion" class="logo-img" /></a>
      <button class="sidebar-close" id="sidebar-close" aria-label="Close menu">&times;</button>
    </div>
    <ul class="sidebar-links">
      <li><a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop" target="_blank" rel="noopener">Shop Now</a></li>
      <li><a href="/#shop">What We Carry</a></li>
      <li><a href="/parts/">Parts Database</a></li>
      <li><a href="/lego-minifigures/">LEGO Minifigures</a></li>
      <li><a href="/blog/">Blog</a></li>
    </ul>
  </nav>

  <div class="main-content">
  <div class="announcement-banner">
    <a class="announcement-text" href="/blog/"><strong>&#128276; New on the Blog</strong><span>Read the latest &rarr;</span></a>
    <button class="announcement-close" aria-label="Dismiss">&times;</button>
  </div>

  <header class="site-header" id="site-header">
    <div class="header-inner">
      <a href="/" class="header-brand" aria-label="Piece Pavilion home">
        <span class="brand-mark" aria-hidden="true"><img src="/logo-white.png" alt="Piece Pavilion" /></span>
        <span class="brand-word">Piece&#8203;Pavilion</span>
      </a>
      <nav class="header-nav">
        <a href="/#shop">Shop</a>
        <a href="/parts/">Parts</a>
        <a href="/blog/">Blog</a>
      </nav>
      <div class="header-actions">
        <a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop" target="_blank" rel="noopener" class="btn-primary header-shop">Shop Now &rarr;</a>
        <button class="header-burger" id="header-burger" aria-label="Open menu">&#9776;</button>
      </div>
    </div>
  </header>

  <div class="breadcrumbs"><nav><a href="/">Home</a><span class="sep">&rsaquo;</span>Parts Database</nav></div>

  <article class="blog-article">
    <div class="parts-hero">
      <h1>LEGO Parts Database</h1>
      <p>Common LEGO parts you can actually search by name. Nicknames, official catalog names, part numbers, and what we have in stock &mdash; all in one place.</p>
    </div>

    <p>Every LEGO builder has done it: you hold up a piece, you know exactly what it does, and you have no idea what it&rsquo;s called. This database solves that. Each page shows the <strong>nickname</strong> builders use (cheese slope, jumper plate, headlight brick), the <strong>official BrickLink name</strong> (what the catalog actually files it under), the <strong>part number</strong> molded on the piece, and &mdash; the thing you really want &mdash; <strong>whether we have one in stock</strong>, in which color, at what price.</p>

    <p>Starting with {count} of the most-searched parts in our catalog. For the full visual guide including quiz, read our post on <a href="/blog/name-that-lego-piece/">naming every LEGO piece</a>.</p>

    <div class="parts-grid">
{cards}
    </div>

    <div class="blog-cta">
      <h3>Need a part not listed here?</h3>
      <p>Search our live inventory of {inv_count}+ listings &mdash; filter by color, type, and condition.</p>
      <a href="/finder/" class="btn-primary btn-large">Open the Product Finder &rarr;</a>
    </div>
  </article>

  <footer class="footer">
    <div class="container footer-inner">
      <a href="/" class="logo logo-footer"><img src="/logo-white.png" alt="Piece Pavilion" class="logo-img logo-img-footer" /></a>
      <p class="footer-tagline">Where every piece finds its place.</p>
      <p class="trademark-notice">LEGO&reg; is a trademark of the LEGO Group, which does not sponsor, authorize, or endorse this site. Piece Pavilion is an independent reseller.</p>
      <p class="copyright">&copy; 2026 Piece Pavilion. All rights reserved.</p>
    </div>
  </footer>
  </div>

  <script src="/script.js"></script>
</body>
</html>
"""


def render_index(parts, inv_count):
    cards = []
    for p in parts:
        cards.append(
            '      <a class="part-card" href="/parts/{no}/">\n'
            '        <img src="{img}" alt="{nick} LEGO piece, part {no}" loading="lazy" />\n'
            '        <div class="pc-nick">{nick}</div>\n'
            '        <div class="pc-no">Part {no}</div>\n'
            '        <div class="pc-name">{name}</div>\n'
            '      </a>'.format(
                no=p["no"], nick=htmllib.escape(p["nick"]),
                name=htmllib.escape(p["name"]), img=p["image_url"],
            )
        )
    return INDEX_TMPL.replace("{count}", str(len(parts))) \
                     .replace("{inv_count}", "{:,}".format(inv_count)) \
                     .replace("{cards}", "\n".join(cards))


# ---- sitemap update ----------------------------------------------------------

def update_sitemap(part_numbers):
    with open(SITEMAP, encoding="utf-8") as f:
        sm = f.read()
    today = __import__("datetime").date.today().isoformat()
    insert = []
    for no in part_numbers:
        insert.append(
            "  <url>\n"
            "    <loc>https://piecepavilion.com/parts/{}/</loc>\n"
            "    <lastmod>{}</lastmod>\n"
            "    <changefreq>monthly</changefreq>\n"
            "    <priority>0.6</priority>\n"
            "  </url>".format(no, today)
        )
    # also add /parts/ index
    insert.insert(0,
        "  <url>\n"
        "    <loc>https://piecepavilion.com/parts/</loc>\n"
        "    <lastmod>{}</lastmod>\n"
        "    <changefreq>weekly</changefreq>\n"
        "    <priority>0.7</priority>\n"
        "  </url>".format(today)
    )
    # strip any existing /parts/ entries so re-runs stay idempotent
    sm = re.sub(
        r"\s*<url>\s*<loc>https://piecepavilion\.com/parts/[^<]*</loc>.*?</url>",
        "", sm, flags=re.DOTALL,
    )
    sm = sm.replace("</urlset>", "\n".join(insert) + "\n</urlset>")
    with open(SITEMAP, "w", encoding="utf-8") as f:
        f.write(sm)


# ---- main --------------------------------------------------------------------

def main():
    argv = sys.argv[1:]
    parts = parse_blog_parts()
    inv = load_inventory_index()
    print("Loaded {} parts from blog post, {} parts with stock".format(len(parts), len(inv)))

    if "--all" in argv:
        wanted = list(parts.keys())
    elif argv:
        wanted = argv
    else:
        wanted = TOP_20

    rendered = []
    for no in wanted:
        if no not in parts:
            print("  skip {}: no metadata in blog post".format(no))
            continue
        p = parts[no]
        stock = inv.get(no, [])
        out_dir = os.path.join(OUT_ROOT, no)
        os.makedirs(out_dir, exist_ok=True)
        html = render_page(p, stock)
        with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)
        print("  wrote parts/{}/index.html  ({} stock rows)".format(no, len(stock)))
        rendered.append(p)

    # index page
    inv_total = sum(len(v) for v in inv.values())
    with open(os.path.join(OUT_ROOT, "index.html"), "w", encoding="utf-8") as f:
        f.write(render_index(rendered, inv_total))
    print("wrote parts/index.html  ({} cards)".format(len(rendered)))

    # sitemap
    update_sitemap([p["no"] for p in rendered])
    print("updated sitemap.xml  ({} /parts/ entries)".format(len(rendered) + 1))


if __name__ == "__main__":
    main()
