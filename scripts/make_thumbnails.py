"""
Generate branded blog-card thumbnails (600x300 PNG) for each post.

A single consistent template: the Piece Pavilion logo on a deep branded
background with a subtle brick-stud motif and a category label. No
post-specific photography — every card uses the same template so nothing
ever looks mismatched. Cards are differentiated only by the category label
and a per-category accent color.

Reuses the same headless-Chrome renderer pattern as make_og_images.py.

Usage:
  python make_thumbnails.py                # all posts, render + wire into blog/index.html
  python make_thumbnails.py how-to-clean-used-lego   # one slug, render only
  python make_thumbnails.py --no-patch     # render all, don't touch index.html

Output: thumb/<slug>.png  ->  served at https://piecepavilion.com/thumb/<slug>.png
"""

import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(REPO, "thumb")
INDEX = os.path.join(REPO, "blog", "index.html")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LOGO = "file:///" + os.path.join(REPO, "logo-white.png").replace("\\", "/")

VER = "4"  # bump to cache-bust the thumbnail URLs in blog/index.html

# Brand-derived accent palette (from the logo's quadrant colors + brand red/gold)
RED, GOLD, GREEN, BLUE = "#e3000b", "#ffce00", "#3c9e4f", "#1c8ad6"

# Per-accent text treatment — GOLD needs dark ink for contrast, others take white.
INK_ON = {RED: "#ffffff", GOLD: "#15151f", GREEN: "#ffffff", BLUE: "#ffffff"}
SUB_ON = {RED: "rgba(255,255,255,.82)", GOLD: "rgba(21,21,31,.72)",
          GREEN: "rgba(255,255,255,.82)", BLUE: "rgba(255,255,255,.82)"}

# slug -> (category label, accent color)
THUMBS = {
    "name-that-lego-piece":            ("Part Names",     GREEN),
    "lego-for-adults":                 ("For Grown-Ups",  BLUE),
    "most-valuable-lego-minifigures":  ("Minifig Values", GOLD),
    "lego-fourth-of-july-builds":      ("Fourth of July", BLUE),
    "spotting-valuable-lego-bulk-lots":("Buyer's Guide",  GOLD),
    "used-parts-sale-june-2026":       ("10% Off Sale",   RED),
    "lego-world-cup-2026":             ("World Cup",      GREEN),
    "lego-pokemon-sets-2026":          ("Pok&eacute;mon",       GOLD),
    "lego-olivia-rodrigo-2026":        ("Minifig News",   GOLD),
    "lego-et-2026":                    ("New Release",    BLUE),
    "lego-shrek-minifigures-2026":     ("Minifig News",   GREEN),
    "lego-super-mario-minifigures-2027":("Minifig Values", RED),
    "lego-sets-retiring-2026":         ("Retiring Soon",  RED),
    "lego-halloween-minifigures":      ("Halloween Guide",GOLD),
    "best-lego-gifts-for-dad":         ("Gift Guide",     RED),
    "how-much-is-your-lego-worth":     ("LEGO Values",    GOLD),
    "how-to-buy-lego-on-bricklink":    ("Buying Guide",   BLUE),
    "how-to-clean-used-lego":          ("Care & Cleaning",GREEN),
    "how-to-collect-lego-minifigures": ("Collecting",     GOLD),
    "how-to-reserve-lego":             ("Reservations",   BLUE),
    "how-to-shop-piece-pavilion":      ("Shopping Guide", RED),
    "how-to-use-product-finder":       ("Product Finder", GREEN),
    "is-used-lego-worth-buying":       ("Used LEGO",      GOLD),
    "lego-sorting-and-organizing-tips":("Organizing",     BLUE),
    "now-on-instagram":                ("News",           RED),
    "summer-lego-building-ideas":      ("Build Ideas",    GREEN),
    "where-to-buy-retired-lego-sets":  ("Retired Sets",   RED),
}

# CSS uses {accent}, {ink}, {sub} placeholders, filled per card.
# Design: full-bleed accent color drives the card identity, big label is the
# hero so each category reads differently at a glance, small logo coin anchors
# the brand in the corner, red->gold stripe at the bottom ties back to the site.
CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:600px;height:300px;overflow:hidden}
body{font-family:'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.t{width:600px;height:300px;position:relative;overflow:hidden;
   display:flex;flex-direction:column;align-items:center;justify-content:center;
   padding:28px 48px 36px;
   background:
     radial-gradient(circle at 1.6px 1.6px, rgba(255,255,255,.10) 1.6px, transparent 1.7px) 0 0/26px 26px,
     radial-gradient(ellipse at bottom right, rgba(0,0,0,.28) 0%, transparent 65%),
     linear-gradient(135deg,{accent} 0%,{accent} 60%,rgba(0,0,0,.18) 100%)}
.t::after{content:'';position:absolute;left:0;right:0;bottom:0;height:8px;
   background:linear-gradient(90deg,#e3000b 0%,#ffce00 100%)}
.coin{position:absolute;top:22px;right:26px;width:70px;height:70px;border-radius:50%;background:#fff;
   display:flex;align-items:center;justify-content:center;padding:4px;
   box-shadow:0 6px 18px rgba(0,0,0,.30)}
.coin img{width:100%;height:100%;border-radius:50%;object-fit:contain}
.kicker{position:relative;color:{sub};font-weight:800;font-size:14px;
   letter-spacing:.22em;text-transform:uppercase;margin-bottom:10px}
.label{position:relative;color:{ink};font-weight:900;font-size:54px;
   letter-spacing:.02em;line-height:1.02;text-align:center;max-width:460px;
   text-shadow:0 2px 14px rgba(0,0,0,.18)}
"""

PAGE = ('<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;600;700;800;900'
        '&display=swap" rel="stylesheet">'
        '<style>{css}</style></head><body>{body}</body></html>')


def card(label):
    return ('<div class="t">'
            '<div class="coin"><img src="' + LOGO + '" alt="" /></div>'
            '<div class="kicker">Piece Pavilion</div>'
            '<div class="label" style="font-family:\'Fredoka\',\'Nunito\',sans-serif">' + label + '</div>'
            '</div>')


def render(label, accent, out_png):
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    tmp = out_png.replace(".png", ".html")
    css = (CSS.replace("{accent}", accent)
              .replace("{ink}", INK_ON[accent])
              .replace("{sub}", SUB_ON[accent]))
    html = PAGE.replace("{css}", css).replace("{body}", card(label))
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(html)
    url = "file:///" + tmp.replace("\\", "/")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=2", "--window-size=600,300",
                    "--default-background-color=00000000", "--virtual-time-budget=8000",
                    "--screenshot=" + out_png, url], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tmp)


def patch_index(slug):
    """Swap whatever is in the thumb div for the rendered thumbnail image. Idempotent per VER."""
    with open(INDEX, encoding="utf-8") as f:
        page = f.read()
    pat = (r'(<a href="/blog/' + re.escape(slug) +
           r'/" class="blog-card">\s*)<div class="blog-card-thumb".*?</div>')
    repl = (r'\1<div class="blog-card-thumb"><img src="/thumb/' + slug +
            r'.png?v=' + VER + r'" alt="" loading="lazy" /></div>')
    new, n = re.subn(pat, repl, page, count=1, flags=re.DOTALL)
    if n and new != page:
        with open(INDEX, "w", encoding="utf-8") as f:
            f.write(new)
        print("  wired into blog/index.html")
        return True
    print("  (no change in index.html)")
    return False


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith("--")]
    no_patch = "--no-patch" in sys.argv
    which = argv or list(THUMBS.keys())
    for slug in which:
        label, accent = THUMBS[slug]
        out = os.path.join(OUT, slug + ".png")
        render(label, accent, out)
        print("{}: rendered {}".format(slug, out))
        if not no_patch and not argv:
            patch_index(slug)


if __name__ == "__main__":
    main()
