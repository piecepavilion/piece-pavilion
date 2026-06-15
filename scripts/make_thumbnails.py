"""
Generate branded blog-card thumbnails (600x300 PNG) for each post:
a real LEGO product photo on a clean branded background, with a category
tag and a logo coin. Image-forward (no big title) so it complements the
card's heading instead of repeating it.

Reuses the same headless-Chrome renderer pattern as make_og_images.py.
Product photos are pulled live from img.bricklink.com (Chrome sends a real
browser UA, so no 403 — unlike Python requests).

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
IMG = "https://img.bricklink.com/ItemImage/{path}.png"

# slug -> (category tag, BrickLink image path TYPE/colorId/itemNo)
# One unique in-stock item per post (verified to load).
THUMBS = {
    "best-lego-gifts-for-dad":         ("Gifts",      "SN/0/40758-1"),
    "how-much-is-your-lego-worth":     ("Value",      "SN/0/40779-1"),
    "how-to-buy-lego-on-bricklink":    ("Buying",     "MN/0/sw1085"),
    "how-to-clean-used-lego":          ("Care",       "PN/11/98283"),
    "how-to-collect-lego-minifigures": ("Collecting", "SN/0/71051-1"),
    "how-to-reserve-lego":             ("Reserve",    "MN/0/sh0898"),
    "how-to-shop-piece-pavilion":      ("Shopping",   "SN/0/71050-1"),
    "how-to-use-product-finder":       ("Finder",     "PN/85/14419"),
    "is-used-lego-worth-buying":       ("Used",       "SN/0/60482-1"),
    "lego-sorting-and-organizing-tips":("Organizing", "SN/0/40923-1"),
    "now-on-instagram":                ("News",       "MN/0/sh0896"),
    "summer-lego-building-ideas":      ("Ideas",      "SN/0/71052-1"),
    "where-to-buy-retired-lego-sets":  ("Retired",    "SN/0/60481-1"),
}

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:600px;height:300px;overflow:hidden}
body{font-family:'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.t{width:600px;height:300px;position:relative;overflow:hidden;
   background:linear-gradient(135deg,#ffffff 0%,#e9ecf1 100%)}
.t::before{content:'';position:absolute;right:-90px;top:-90px;width:320px;height:320px;
   background:radial-gradient(circle,rgba(227,0,11,.07) 0%,transparent 70%)}
.t::after{content:'';position:absolute;left:0;right:0;bottom:0;height:7px;
   background:linear-gradient(90deg,#e3000b 0%,#ffce00 100%)}
.photo{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.photo img{max-height:212px;max-width:66%;object-fit:contain;
   filter:drop-shadow(0 14px 26px rgba(0,0,0,.20))}
.tag{position:absolute;top:22px;left:24px;z-index:2;
   background:#e3000b;color:#fff;font-weight:800;font-size:19px;
   letter-spacing:.13em;text-transform:uppercase;padding:9px 18px;border-radius:999px;
   box-shadow:0 6px 16px rgba(227,0,11,.32)}
.badge{position:absolute;top:17px;right:22px;z-index:2;width:54px;height:54px;
   border-radius:50%;background:#e3000b;display:flex;align-items:center;
   justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,.18)}
.badge img{height:40px;width:40px;object-fit:contain}
"""

PAGE = ('<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900'
        '&display=swap" rel="stylesheet">'
        '<style>' + CSS + '</style></head><body>{body}</body></html>')


def card(tag, img_path):
    return ('<div class="t">'
            '<div class="photo"><img src="' + IMG.format(path=img_path) + '" alt="" /></div>'
            '<div class="tag">' + tag + '</div>'
            '<div class="badge"><img src="' + LOGO + '" alt="" /></div>'
            '</div>')


def render(tag, img_path, out_png):
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    tmp = out_png.replace(".png", ".html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(PAGE.replace("{body}", card(tag, img_path)))
    url = "file:///" + tmp.replace("\\", "/")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=2", "--window-size=600,300",
                    "--default-background-color=00000000", "--virtual-time-budget=12000",
                    "--screenshot=" + out_png, url], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tmp)


def patch_index(slug):
    """Swap the emoji-on-gradient thumb div for the rendered thumbnail image. Idempotent."""
    with open(INDEX, encoding="utf-8") as f:
        page = f.read()
    pat = (r'(<a href="/blog/' + re.escape(slug) +
           r'/" class="blog-card">\s*)<div class="blog-card-thumb".*?</div>')
    repl = (r'\1<div class="blog-card-thumb"><img src="/thumb/' + slug +
            r'.png?v=1" alt="" loading="lazy" /></div>')
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
        tag, img_path = THUMBS[slug]
        out = os.path.join(OUT, slug + ".png")
        render(tag, img_path, out)
        print("{}: rendered {}".format(slug, out))
        if not no_patch and not argv:
            patch_index(slug)


if __name__ == "__main__":
    main()
