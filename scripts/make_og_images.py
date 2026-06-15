"""
Generate per-post Open Graph / Twitter share images (1200x630 PNG) and wire them
into each blog post's <head> + BlogPosting schema, so links shared to Facebook,
iMessage, X, etc. preview the actual post — not the bare logo.

Reuses the slug -> {kicker,title} metadata from make_carousels.py (single source
of truth) and the same headless-Chrome renderer.

Usage:
  python make_og_images.py                 # all posts + homepage, render + patch
  python make_og_images.py how-to-clean-used-lego   # one slug
  python make_og_images.py --no-patch      # render images only, don't touch HTML

Output: og/<slug>.png  (committed to the public repo, served at
        https://piecepavilion.com/og/<slug>.png)
"""

import os
import re
import subprocess
import sys

from make_carousels import CAROUSELS  # single source of truth for titles/kickers

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUTROOT = os.path.join(REPO, "og")
BLOG = os.path.join(REPO, "blog")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_URL = "https://piecepavilion.com"

LOGO_URL = "file:///" + os.path.join(REPO, "logo-white.png").replace("\\", "/")

# Posts not in CAROUSELS, plus the homepage + category-page cards.
# {slug: (kicker, title)}
EXTRA = {
    "now-on-instagram": ("We're on Instagram", "Follow @piecepavilion"),
    "_home": ("Family-Owned BrickLink Store", "Your Brick Destination"),
    "lego-minifigures": ("Authentic Minifigures", "LEGO Minifigures for Sale"),
    "lego-star-wars-minifigures": ("A Galaxy of Figures", "LEGO Star Wars Minifigures"),
    "retired-lego-sets": ("Discontinued & Hard to Find", "Retired LEGO Sets"),
}

# Slugs that are not blog posts — render the image, never patch a blog post head.
RENDER_ONLY = {"_home", "lego-minifigures", "lego-star-wars-minifigures", "retired-lego-sets"}

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.og{width:1200px;height:630px;position:relative;display:flex;flex-direction:column;
    justify-content:center;padding:84px 88px;
    background:linear-gradient(135deg,#e3000b 0%,#9b0008 100%);color:#fff}
.fred{font-family:'Fredoka','Nunito',sans-serif;font-weight:700;letter-spacing:-.01em}
.og .mark{height:104px;width:auto;align-self:flex-start;margin-bottom:40px;
          filter:drop-shadow(0 10px 28px rgba(0,0,0,.30))}
.og .kicker{font-weight:800;letter-spacing:.13em;text-transform:uppercase;
            font-size:26px;opacity:.92;margin-bottom:22px}
.og h1{font-size:74px;line-height:1.04;max-width:1010px}
.og .url{position:absolute;bottom:64px;left:88px;font-weight:800;font-size:30px;opacity:.92}
.og .star{position:absolute;bottom:64px;right:88px;font-weight:800;font-size:26px;opacity:.92}
"""

PAGE = ('<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700'
        '&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">'
        '<style>' + CSS + '</style></head><body>{body}</body></html>')


def slide(kicker, title):
    return ('<div class="og">'
            '<img class="mark" src="' + LOGO_URL + '" alt="Piece Pavilion" />'
            '<div class="kicker">' + kicker + '</div>'
            '<h1 class="fred">' + title + '</h1>'
            '<div class="url">piecepavilion.com</div>'
            '<div class="star">&#9733; 100% positive</div></div>')


def render(kicker, title, out_png):
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    tmp = out_png.replace(".png", ".html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(PAGE.replace("{body}", slide(kicker, title)))
    url = "file:///" + tmp.replace("\\", "/")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--window-size=1200,630",
                    "--default-background-color=00000000", "--virtual-time-budget=8000",
                    "--screenshot=" + out_png, url], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tmp)


def meta_for(slug):
    if slug in CAROUSELS:
        c = CAROUSELS[slug]["cover"]
        return c["kicker"], c["title"]
    return EXTRA[slug]


def patch_post(slug, img_url):
    """Point og:image/twitter:image + schema image at the new share image. Idempotent."""
    path = os.path.join(BLOG, slug, "index.html")
    if not os.path.exists(path):
        print("  (skip patch: {} not found)".format(path))
        return False
    with open(path, encoding="utf-8") as f:
        page = f.read()
    before = page

    # og:image -> new url (whatever it currently points at)
    page = re.sub(r'(<meta property="og:image" content=")[^"]*(")',
                  lambda m: m.group(1) + img_url + m.group(2), page)

    # og:image:width/height — add once, right after the og:image line
    if "og:image:width" not in page:
        page = re.sub(
            r'(<meta property="og:image" content="[^"]*" />)',
            r'\1\n  <meta property="og:image:width" content="1200" />'
            r'\n  <meta property="og:image:height" content="630" />',
            page, count=1)

    # twitter:image — add once, after the twitter:card line
    if "twitter:image" not in page:
        page = re.sub(
            r'(<meta name="twitter:card" content="[^"]*" />)',
            r'\1\n  <meta name="twitter:image" content="' + img_url + '" />',
            page, count=1)

    # BlogPosting schema image — add once, right after the @type line
    if '"@type": "BlogPosting"' in page and '"image":' not in page:
        page = re.sub(
            r'("@type": "BlogPosting",)',
            r'\1\n    "image": "' + img_url + '",',
            page, count=1)

    if page == before:
        print("  (already wired)")
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(page)
    print("  patched -> {}".format(path))
    return True


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith("--")]
    no_patch = "--no-patch" in sys.argv
    all_slugs = list(CAROUSELS.keys()) + list(EXTRA.keys())
    which = argv or all_slugs

    for slug in which:
        kicker, title = meta_for(slug)
        out = os.path.join(OUTROOT, slug + ".png")
        render(kicker, title, out)
        print("{}: rendered {}".format(slug, out))
        if no_patch or slug in RENDER_ONLY:
            continue
        patch_post(slug, "{}/og/{}.png".format(BASE_URL, slug))


if __name__ == "__main__":
    main()
