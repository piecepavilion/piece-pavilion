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

VER = "3"  # bump to cache-bust the thumbnail URLs in blog/index.html

# Brand-derived accent palette (from the logo's quadrant colors + brand red/gold)
RED, GOLD, GREEN, BLUE = "#e3000b", "#ffce00", "#3c9e4f", "#1c8ad6"

# slug -> (category label, accent color)
THUMBS = {
    "lego-sets-retiring-2026":         ("Retiring Soon",  RED),
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

# CSS uses {accent} placeholder, filled per card.
CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:600px;height:300px;overflow:hidden}
body{font-family:'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.t{width:600px;height:300px;position:relative;overflow:hidden;
   display:flex;flex-direction:column;align-items:center;justify-content:center;
   background:
     radial-gradient(circle at 1.6px 1.6px, rgba(255,255,255,.06) 1.6px, transparent 1.7px) 0 0/26px 26px,
     linear-gradient(135deg,#15151f 0%,#241016 55%,#2c0c0c 100%)}
.t::before{content:'';position:absolute;left:50%;top:-120px;transform:translateX(-50%);
   width:420px;height:420px;border-radius:50%;
   background:radial-gradient(circle,{accent}26 0%,transparent 65%)}
.t::after{content:'';position:absolute;left:0;right:0;bottom:0;height:7px;
   background:linear-gradient(90deg,#e3000b 0%,#ffce00 100%)}
.coin{position:relative;width:150px;height:150px;border-radius:50%;background:#fff;
   display:flex;align-items:center;justify-content:center;
   box-shadow:0 14px 30px rgba(0,0,0,.50)}
.coin img{height:140px;width:140px;border-radius:50%;object-fit:contain}
.label{position:relative;margin-top:26px;color:#fff;font-weight:800;font-size:26px;
   letter-spacing:.16em;text-transform:uppercase}
.rule{position:relative;margin-top:16px;width:64px;height:4px;border-radius:999px;
   background:{accent}}
"""

PAGE = ('<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900'
        '&display=swap" rel="stylesheet">'
        '<style>{css}</style></head><body>{body}</body></html>')


def card(label):
    return ('<div class="t">'
            '<div class="coin"><img src="' + LOGO + '" alt="" /></div>'
            '<div class="label">' + label + '</div>'
            '<div class="rule"></div>'
            '</div>')


def render(label, accent, out_png):
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    tmp = out_png.replace(".png", ".html")
    html = PAGE.replace("{css}", CSS.replace("{accent}", accent)).replace("{body}", card(label))
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
